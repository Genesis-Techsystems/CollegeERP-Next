"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormModal } from "@/common/components/feedback";
import { Select, type SelectOption } from "@/common/components/select";
import { Label } from "@/components/ui/label";
import { useSessionContext } from "@/context/SessionContext";
import type { SessionUser } from "@/types/user";
import { utcMidnightIso } from "@/common/generic-functions";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import {
  checkAttendanceTaken,
  createStaffProxy,
  getTakeProxyCollegeFilters,
  getTakeProxyWeekdayName,
  listGroupSectionsForTakeProxy,
  listLeaveHolidayEvents,
  listSchedulesForTakeProxy,
  listStaffSubjectsForProxy,
  listTimetablesForTakeProxy,
  tConvert,
  toLeaveSlashYmd,
  toLeaveYmd,
  type AnyRow,
} from "@/services";

const schema = z.object({
  collegeId: z.coerce.number().min(1, "College is required"),
  academicYearId: z.coerce.number().min(1, "Academic Year is required"),
  courseId: z.coerce.number().min(1, "Course is required"),
  courseGroupId: z.coerce.number().min(1, "Course Group is required"),
  courseYearId: z.coerce.number().min(1, "Course Year is required"),
  groupSectionId: z.coerce.number().min(1, "Section is required"),
  timetableId: z.coerce.number().min(1, "Timetable is required"),
  timetableScheduleId: z.coerce.number().min(1, "Proxy For is required"),
  staffCourseyrSubjectId: z.coerce.number().min(1, "Proxy Subject is required"),
});

type FormValues = z.infer<typeof schema>;

interface TakeProxyModalProps {
  open: boolean;
  employeeId: number;
  collegeId: number;
  onClose: () => void;
  onSaved: () => void;
}

function readStorage(key: string): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(key) ?? "";
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function text(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
}

function uniqueBy(rows: AnyRow[], key: (row: AnyRow) => number): AnyRow[] {
  const seen = new Set<number>();
  return rows.filter((row) => {
    const k = key(row);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Angular `dataSecurityLevelPrincipal()` — college locked for non-admin. */
function isCollegeLocked(user: SessionUser | null): boolean {
  if (user?.isAdmin || readStorage("isAdmin") === "true") return false;
  return true;
}

function formatTimetableRange(row: AnyRow): string {
  const name = String(row.timetableName ?? "");
  const start = row.startDate
    ? new Date(String(row.startDate)).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";
  const end = row.endDate
    ? new Date(String(row.endDate)).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";
  if (start && end) return `${name}(${start} - ${end})`;
  return name;
}

function formatProxyForLabel(row: AnyRow): string {
  const resources = Array.isArray(row.subjectResource)
    ? (row.subjectResource as AnyRow[])
    : [];
  const res = resources[0] ?? {};
  return `${String(row.classTimingName ?? "")}(${tConvert(row.startTime)} - ${tConvert(row.endTime)})${String(res.subjectName ?? "")} - ${String(res.staffName ?? "")} (${String(res.subjectTypeCode ?? "")})`;
}

function formatProxySubjectLabel(row: AnyRow): string {
  const type = String(row.subjectType ?? "");
  const batch = row.batchName ? ` - ${String(row.batchName)}` : "";
  return `${String(row.subjectName ?? "")} (${type}${batch})`;
}

export function TakeProxyModal({
  open,
  employeeId,
  collegeId: sessionCollegeId,
  onClose,
  onSaved,
}: TakeProxyModalProps) {
  const { user } = useSessionContext();
  const collegeLocked = isCollegeLocked(user);

  const [filtersData, setFiltersData] = useState<AnyRow[]>([]);
  const [academicData, setAcademicData] = useState<AnyRow[]>([]);
  const [sections, setSections] = useState<AnyRow[]>([]);
  const [timetables, setTimetables] = useState<AnyRow[]>([]);
  const [schedules, setSchedules] = useState<AnyRow[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<AnyRow | null>(null);
  const [subjects, setSubjects] = useState<AnyRow[]>([]);
  const [filteredSubjects, setFilteredSubjects] = useState<AnyRow[]>([]);
  const [events, setEvents] = useState<AnyRow[]>([]);
  const [isTakenAttendance, setIsTakenAttendance] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      collegeId: 0,
      academicYearId: 0,
      courseId: 0,
      courseGroupId: 0,
      courseYearId: 0,
      groupSectionId: 0,
      timetableId: 0,
      timetableScheduleId: 0,
      staffCourseyrSubjectId: 0,
    },
  });

  const collegeId = watch("collegeId");
  const courseId = watch("courseId");
  const courseGroupId = watch("courseGroupId");

  const colleges = useMemo(
    () =>
      uniqueBy(filtersData, (r) => num(r.fk_college_id)).sort(
        (a, b) => num(a.clg_sort_order) - num(b.clg_sort_order),
      ),
    [filtersData],
  );

  const universityId = useMemo(
    () =>
      num(
        filtersData.find((r) => num(r.fk_college_id) === collegeId)
          ?.fk_university_id,
      ),
    [filtersData, collegeId],
  );

  const academicYears = useMemo(() => {
    if (!universityId) return [];
    return uniqueBy(
      academicData.filter((r) => num(r.fk_university_id) === universityId),
      (r) => num(r.fk_academic_year_id),
    ).sort(
      (a, b) =>
        parseInt(text(b.academic_year), 10) -
        parseInt(text(a.academic_year), 10),
    );
  }, [academicData, universityId]);

  const courses = useMemo(() => {
    if (!collegeId) return [];
    return uniqueBy(
      filtersData.filter((r) => num(r.fk_college_id) === collegeId),
      (r) => num(r.fk_course_id),
    );
  }, [filtersData, collegeId]);

  const courseGroups = useMemo(() => {
    if (!collegeId || !courseId) return [];
    return uniqueBy(
      filtersData.filter(
        (r) =>
          num(r.fk_college_id) === collegeId &&
          num(r.fk_course_id) === courseId,
      ),
      (r) => num(r.fk_course_group_id),
    );
  }, [filtersData, collegeId, courseId]);

  const courseYears = useMemo(() => {
    if (!collegeId || !courseId || !courseGroupId) return [];
    return uniqueBy(
      filtersData.filter(
        (r) =>
          num(r.fk_college_id) === collegeId &&
          num(r.fk_course_id) === courseId &&
          num(r.fk_course_group_id) === courseGroupId,
      ),
      (r) => num(r.fk_course_year_id),
    ).sort((a, b) => num(a.year_order) - num(b.year_order));
  }, [filtersData, collegeId, courseId, courseGroupId]);

  const collegeOptions: SelectOption[] = useMemo(
    () =>
      colleges.map((c) => ({
        value: String(c.fk_college_id),
        label: text(c.college_code),
      })),
    [colleges],
  );

  const academicYearOptions: SelectOption[] = useMemo(
    () =>
      academicYears.map((y) => ({
        value: String(y.fk_academic_year_id),
        label: text(y.academic_year),
      })),
    [academicYears],
  );

  const courseOptions: SelectOption[] = useMemo(
    () =>
      courses.map((c) => ({
        value: String(c.fk_course_id),
        label: text(c.course_code) || text(c.course_name),
      })),
    [courses],
  );

  const courseGroupOptions: SelectOption[] = useMemo(
    () =>
      courseGroups.map((g) => ({
        value: String(g.fk_course_group_id),
        label: text(g.group_code) || text(g.group_name),
      })),
    [courseGroups],
  );

  const courseYearOptions: SelectOption[] = useMemo(
    () =>
      courseYears.map((y) => ({
        value: String(y.fk_course_year_id),
        label: text(y.course_year_name),
      })),
    [courseYears],
  );

  const sectionOptions: SelectOption[] = useMemo(
    () =>
      sections.map((s) => ({
        value: String(s.groupSectionId),
        label: String(s.section ?? s.groupSectionName ?? ""),
      })),
    [sections],
  );

  const timetableOptions: SelectOption[] = useMemo(
    () =>
      timetables.map((t) => ({
        value: String(t.timetableId),
        label: formatTimetableRange(t),
      })),
    [timetables],
  );

  const proxyForOptions: SelectOption[] = useMemo(
    () =>
      schedules.map((s) => ({
        value: String(s.timetableScheduleId),
        label: formatProxyForLabel(s),
      })),
    [schedules],
  );

  const proxySubjectOptions: SelectOption[] = useMemo(
    () =>
      filteredSubjects.map((s) => ({
        value: String(s.staffCourseyrSubjectId),
        label: formatProxySubjectLabel(s),
      })),
    [filteredSubjects],
  );

  async function checkEvents(nextCollegeId: number) {
    setEvents([]);
    if (!nextCollegeId) return;
    const today = toLeaveSlashYmd(new Date());
    if (!today) return;
    try {
      const rows = await listLeaveHolidayEvents({
        collegeId: nextCollegeId,
        startDate: today,
        endDate: today,
      });
      setEvents(rows);
    } catch {
      setEvents([]);
    }
  }

  function clearBelowCollege() {
    setValue("academicYearId", 0);
    setValue("courseId", 0);
    setValue("courseGroupId", 0);
    setValue("courseYearId", 0);
    setValue("groupSectionId", 0);
    setValue("timetableId", 0);
    setValue("timetableScheduleId", 0);
    setValue("staffCourseyrSubjectId", 0);
    setSections([]);
    setTimetables([]);
    setSchedules([]);
    setSelectedSchedule(null);
    setFilteredSubjects([]);
    setIsTakenAttendance(false);
  }

  async function onCollegeChange(nextCollegeId: number) {
    setValue("collegeId", nextCollegeId);
    clearBelowCollege();
    await checkEvents(nextCollegeId);
    if (!nextCollegeId) return;

    const uni = num(
      filtersData.find((r) => num(r.fk_college_id) === nextCollegeId)
        ?.fk_university_id,
    );
    const years = uniqueBy(
      academicData.filter((r) => num(r.fk_university_id) === uni),
      (r) => num(r.fk_academic_year_id),
    );
    const preferredAy =
      Number(readStorage("academicYearId") || user?.academicYearId || 0) ||
      Number(years[0]?.fk_academic_year_id ?? 0);
    if (preferredAy) setValue("academicYearId", preferredAy);
  }

  function onAcademicYearChange(academicYearId: number) {
    setValue("academicYearId", academicYearId);
    setValue("courseId", 0);
    setValue("courseGroupId", 0);
    setValue("courseYearId", 0);
    setValue("groupSectionId", 0);
    setValue("timetableId", 0);
    setValue("timetableScheduleId", 0);
    setValue("staffCourseyrSubjectId", 0);
    setSections([]);
    setTimetables([]);
    setSchedules([]);
    setSelectedSchedule(null);
    setFilteredSubjects([]);
    setIsTakenAttendance(false);
  }

  function onCourseChange(nextCourseId: number) {
    setValue("courseId", nextCourseId);
    setValue("courseGroupId", 0);
    setValue("courseYearId", 0);
    setValue("groupSectionId", 0);
    setValue("timetableId", 0);
    setValue("timetableScheduleId", 0);
    setValue("staffCourseyrSubjectId", 0);
    setSections([]);
    setTimetables([]);
    setSchedules([]);
    setSelectedSchedule(null);
    setFilteredSubjects([]);
    setIsTakenAttendance(false);
  }

  function onCourseGroupChange(nextGroupId: number) {
    setValue("courseGroupId", nextGroupId);
    setValue("courseYearId", 0);
    setValue("groupSectionId", 0);
    setValue("timetableId", 0);
    setValue("timetableScheduleId", 0);
    setValue("staffCourseyrSubjectId", 0);
    setSections([]);
    setTimetables([]);
    setSchedules([]);
    setSelectedSchedule(null);
    setFilteredSubjects([]);
    setIsTakenAttendance(false);
  }

  async function onCourseYearChange(courseYearId: number) {
    setValue("courseYearId", courseYearId);
    setValue("groupSectionId", 0);
    setValue("timetableId", 0);
    setValue("timetableScheduleId", 0);
    setValue("staffCourseyrSubjectId", 0);
    setSections([]);
    setTimetables([]);
    setSchedules([]);
    setSelectedSchedule(null);
    setFilteredSubjects([]);
    setIsTakenAttendance(false);
    const { academicYearId, courseGroupId: groupId } = getValues();
    if (!courseYearId || !academicYearId || !groupId) return;
    try {
      const rows = await listGroupSectionsForTakeProxy({
        courseYearId,
        academicYearId,
        courseGroupId: groupId,
      });
      setSections(rows);
    } catch (e) {
      toastError(e, "Failed to load sections");
    }
  }

  async function onSectionChange(groupSectionId: number) {
    setValue("groupSectionId", groupSectionId);
    setValue("timetableId", 0);
    setValue("timetableScheduleId", 0);
    setValue("staffCourseyrSubjectId", 0);
    setTimetables([]);
    setSchedules([]);
    setSelectedSchedule(null);
    setFilteredSubjects([]);
    setIsTakenAttendance(false);
    const { collegeId: clgId, academicYearId } = getValues();
    if (!groupSectionId || !clgId || !academicYearId) return;
    try {
      const rows = await listTimetablesForTakeProxy({
        collegeId: clgId,
        academicYearId,
        groupSectionId,
      });
      setTimetables(rows);
    } catch (e) {
      toastError(e, "Failed to load timetables");
    }
  }

  async function onTimetableChange(timetableId: number) {
    setValue("timetableId", timetableId);
    setValue("timetableScheduleId", 0);
    setValue("staffCourseyrSubjectId", 0);
    setSchedules([]);
    setSelectedSchedule(null);
    setFilteredSubjects([]);
    setIsTakenAttendance(false);
    const { collegeId: clgId, academicYearId, groupSectionId } = getValues();
    if (!timetableId || !clgId || !academicYearId || !groupSectionId) return;
    setLoading(true);
    try {
      const rows = await listSchedulesForTakeProxy({
        collegeId: clgId,
        academicYearId,
        groupSectionId,
        timetableId,
      });
      const weekdayName = getTakeProxyWeekdayName();
      const filtered = rows.filter((row) => {
        if (String(row.weekdayName) !== weekdayName) return false;
        if (row.isBreak) return false;
        const resources = Array.isArray(row.subjectResource)
          ? (row.subjectResource as AnyRow[])
          : [];
        if (resources.length === 0) return false;
        const res = resources[0]!;
        if (Number(res.staffId) === employeeId) return false;
        const type = String(res.subjectTypeCode ?? "");
        return type === "THEORY" || type === "ELECTIVE";
      });
      setSchedules(filtered);
    } catch (e) {
      toastError(e, "Failed to load schedules");
    } finally {
      setLoading(false);
    }
  }

  async function onProxyForChange(timetableScheduleId: number) {
    setValue("timetableScheduleId", timetableScheduleId);
    setValue("staffCourseyrSubjectId", 0);
    const match =
      schedules.find(
        (s) => Number(s.timetableScheduleId) === timetableScheduleId,
      ) ?? null;
    setSelectedSchedule(match);
    setIsTakenAttendance(false);
    setFilteredSubjects([]);

    const { collegeId: clgId, academicYearId, groupSectionId } = getValues();
    if (employeeId) {
      try {
        const rows = await listStaffSubjectsForProxy({
          collegeId: clgId,
          academicYearId,
          employeeId,
          groupSectionId,
          withStatus: false,
        });
        setSubjects(rows);
        setFilteredSubjects(
          rows.filter((s) => {
            const type = String(s.subjectType ?? "");
            return type === "THEORY" || type === "ELECTIVE";
          }),
        );
      } catch (e) {
        toastError(e, "Failed to load proxy subjects");
      }
    }

    if (timetableScheduleId) {
      const today = toLeaveYmd(new Date());
      if (today) {
        try {
          const taken = await checkAttendanceTaken(timetableScheduleId, today);
          setIsTakenAttendance(taken);
        } catch {
          setIsTakenAttendance(false);
        }
      }
    }
  }

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    reset({
      collegeId: 0,
      academicYearId: 0,
      courseId: 0,
      courseGroupId: 0,
      courseYearId: 0,
      groupSectionId: 0,
      timetableId: 0,
      timetableScheduleId: 0,
      staffCourseyrSubjectId: 0,
    });
    setFiltersData([]);
    setAcademicData([]);
    setSections([]);
    setTimetables([]);
    setSchedules([]);
    setSelectedSchedule(null);
    setSubjects([]);
    setFilteredSubjects([]);
    setEvents([]);
    setIsTakenAttendance(false);

    (async () => {
      setLoading(true);
      try {
        const orgId = Number(
          user?.organizationId || readStorage("organizationId") || 0,
        );
        const { filtersData: filters, academicData: years } =
          await getTakeProxyCollegeFilters(orgId, employeeId);
        if (cancelled) return;
        setFiltersData(filters);
        setAcademicData(years);

        const preferredCollege =
          Number(
            sessionCollegeId ||
              user?.collegeId ||
              readStorage("collegeId") ||
              0,
          ) || num(filters[0]?.fk_college_id);
        if (preferredCollege) {
          setValue("collegeId", preferredCollege);
          await checkEvents(preferredCollege);
          const uni = num(
            filters.find((r) => num(r.fk_college_id) === preferredCollege)
              ?.fk_university_id,
          );
          const ayRows = uniqueBy(
            years.filter((r) => num(r.fk_university_id) === uni),
            (r) => num(r.fk_academic_year_id),
          );
          const preferredAy =
            Number(
              readStorage("academicYearId") || user?.academicYearId || 0,
            ) || num(ayRows[0]?.fk_academic_year_id);
          if (preferredAy) setValue("academicYearId", preferredAy);
        }
      } catch (e) {
        toastError(e, "Failed to load college filters");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once per open
  }, [open]);

  async function onSubmit(values: FormValues) {
    if (isTakenAttendance || events.length > 0) return;
    if (!selectedSchedule) {
      toastInfo("Please select Proxy For.");
      return;
    }
    const resources = Array.isArray(selectedSchedule.subjectResource)
      ? (selectedSchedule.subjectResource as AnyRow[])
      : [];
    const res = resources[0] ?? {};
    const subject = subjects.find(
      (s) => Number(s.staffCourseyrSubjectId) === values.staffCourseyrSubjectId,
    );
    const subjectTypeId = Number(subject?.subjectTypeId ?? 0);

    const payload: AnyRow = {
      collegeId: values.collegeId,
      academicYearId: values.academicYearId,
      courseId: values.courseId,
      courseGroupId: values.courseGroupId,
      courseYearId: values.courseYearId,
      groupSectionId: values.groupSectionId,
      timetableId: values.timetableId,
      timetableScheduleId: Number(selectedSchedule.timetableScheduleId),
      staffCourseyrSubjectId: values.staffCourseyrSubjectId,
      isActive: true,
      reason: "active",
      proxyDate: toLeaveYmd(new Date()),
      createdDt: utcMidnightIso(),
      proxyEmpId: employeeId,
      isApproved: true,
      processStatusCatdetId: 230,
      assignedbyEmployeeId: Number(res.staffId ?? 0),
      studentBatchId: res.studentBatchId ?? null,
      subjectCourseyearId: res.subjectCourseYearId ?? null,
      subjectId: Number(subject?.subjectId ?? 0),
      subjectTypeId,
      proxySubjecttypeId: subjectTypeId,
    };

    setSaving(true);
    try {
      const result = await createStaffProxy(payload);
      if (result.success) {
        toastSuccess(result.message ?? "Proxy saved");
        onSaved();
      } else {
        toastInfo(result.message ?? "Unable to save proxy");
      }
    } catch (e) {
      toastError(e, "Failed to save proxy");
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Take Proxy"
      cancelLabel="Close"
      isSubmitting={saving || loading}
      showSubmitButton={!isTakenAttendance && events.length === 0}
      onSubmit={(e) => {
        e.preventDefault();
        if (events.length > 0) return;
        void handleSubmit(onSubmit)();
      }}
      size="lg"
      showHeaderDivider
    >
      <p className="text-sm font-medium text-destructive">
        Note : Take proxy for today subjects only
      </p>

      {events.length > 0 ? (
        <ul className="space-y-1 rounded-sm border border-yellow-400 bg-[#ffffbf] px-3 py-2 text-sm font-medium">
          {events.map((ev, i) => (
            <li key={`${String(ev.eventName)}-${i}`}>
              {String(ev.eventName ?? "")}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>
            College <span className="text-destructive">*</span>
          </Label>
          <Controller
            name="collegeId"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : null}
                onChange={(v) => void onCollegeChange(v ? Number(v) : 0)}
                options={collegeOptions}
                placeholder="College"
                disabled={collegeLocked}
              />
            )}
          />
          {errors.collegeId ? (
            <p className="text-xs text-destructive">
              {errors.collegeId.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label>
            Academic Year <span className="text-destructive">*</span>
          </Label>
          <Controller
            name="academicYearId"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : null}
                onChange={(v) => onAcademicYearChange(v ? Number(v) : 0)}
                options={academicYearOptions}
                placeholder="Academic Year"
              />
            )}
          />
          {errors.academicYearId ? (
            <p className="text-xs text-destructive">
              {errors.academicYearId.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label>
            Course <span className="text-destructive">*</span>
          </Label>
          <Controller
            name="courseId"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : null}
                onChange={(v) => onCourseChange(v ? Number(v) : 0)}
                options={courseOptions}
                placeholder="Course"
              />
            )}
          />
          {errors.courseId ? (
            <p className="text-xs text-destructive">
              {errors.courseId.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label>
            Course Group <span className="text-destructive">*</span>
          </Label>
          <Controller
            name="courseGroupId"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : null}
                onChange={(v) => onCourseGroupChange(v ? Number(v) : 0)}
                options={courseGroupOptions}
                placeholder="Course Group"
              />
            )}
          />
          {errors.courseGroupId ? (
            <p className="text-xs text-destructive">
              {errors.courseGroupId.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label>
            Course Year <span className="text-destructive">*</span>
          </Label>
          <Controller
            name="courseYearId"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : null}
                onChange={(v) => void onCourseYearChange(v ? Number(v) : 0)}
                options={courseYearOptions}
                placeholder="Course Year"
              />
            )}
          />
          {errors.courseYearId ? (
            <p className="text-xs text-destructive">
              {errors.courseYearId.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label>
            Section <span className="text-destructive">*</span>
          </Label>
          <Controller
            name="groupSectionId"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : null}
                onChange={(v) => void onSectionChange(v ? Number(v) : 0)}
                options={sectionOptions}
                placeholder="Section"
              />
            )}
          />
          {errors.groupSectionId ? (
            <p className="text-xs text-destructive">
              {errors.groupSectionId.message}
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>
          Timetable <span className="text-destructive">*</span>
        </Label>
        <Controller
          name="timetableId"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value ? String(field.value) : null}
              onChange={(v) => void onTimetableChange(v ? Number(v) : 0)}
              options={timetableOptions}
              placeholder="Timetable"
            />
          )}
        />
        {errors.timetableId ? (
          <p className="text-xs text-destructive">
            {errors.timetableId.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label>
          Proxy For <span className="text-destructive">*</span>
        </Label>
        <Controller
          name="timetableScheduleId"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value ? String(field.value) : null}
              onChange={(v) => void onProxyForChange(v ? Number(v) : 0)}
              options={proxyForOptions}
              placeholder="Proxy For"
            />
          )}
        />
        {errors.timetableScheduleId ? (
          <p className="text-xs text-destructive">
            {errors.timetableScheduleId.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5 sm:max-w-[50%]">
        <Label>
          Proxy Subject <span className="text-destructive">*</span>
        </Label>
        <Controller
          name="staffCourseyrSubjectId"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value ? String(field.value) : null}
              onChange={(v) => field.onChange(v ? Number(v) : 0)}
              options={proxySubjectOptions}
              placeholder="Proxy Subject"
            />
          )}
        />
        {errors.staffCourseyrSubjectId ? (
          <p className="text-xs text-destructive">
            {errors.staffCourseyrSubjectId.message}
          </p>
        ) : null}
      </div>

      {isTakenAttendance ? (
        <p className="text-sm font-medium text-destructive">
          Not possible to adjust as attendance is already marked.
        </p>
      ) : null}
    </FormModal>
  );
}
