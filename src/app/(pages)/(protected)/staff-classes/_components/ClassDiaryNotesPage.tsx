"use client";

/**
 * Angular `class-dairy/add-notes` + `class-dairy/edit-notes`.
 * Reuses listPeriodsForClassAttendance, SubjectUnit helpers, uploadClassNotesForAttendance,
 * domainUpdate(Lessonstatus), listLeaveHolidayEvents — no new services.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { ChevronDown, Upload } from "lucide-react";
import { DatePicker } from "@/common/components/date-picker";
import {
  Select,
  MultiSelect,
  type SelectOption,
} from "@/common/components/select";
import { FormField } from "@/common/components/forms";
import { FilteredPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ASSESSMENT_API, ATTENDANCE_API } from "@/config/constants";
import { GM_CODES } from "@/config/constants/ui";
import { useSessionContext } from "@/context/SessionContext";
import { useStaffLoginContext } from "@/hooks/useStaffLoginContext";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  domainUpdate,
  fetchDetails,
  formatClassDateYmdSlash,
  getStaffSubjectsForToday,
  listGeneralDetailsByCode,
  listLeaveHolidayEvents,
  listPeriodsForClassAttendance,
  listSubjectUnitTopicsForMarkAttendance,
  listSubjectUnitsForMarkAttendance,
  periodOptionLabel,
  uploadClassNotesForAttendance,
  type PeriodRow,
  type StaffSubjectClass,
} from "@/services";

type AnyRow = Record<string, unknown>;
type FieldErrors = Partial<Record<"semester" | "day" | "periods", string>>;

function readStorage(key: string): string {
  if (typeof globalThis.window === "undefined") return "";
  return globalThis.localStorage.getItem(key) ?? "";
}

function positiveId(...candidates: unknown[]): number {
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function txt(row: AnyRow | null | undefined, keys: string[]): string {
  if (!row) return "";
  for (const key of keys) {
    const v = row[key];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function num(row: AnyRow | null | undefined, keys: string[]): number {
  if (!row) return 0;
  for (const key of keys) {
    const v = row[key];
    if (v != null && v !== "" && Number.isFinite(Number(v))) return Number(v);
  }
  return 0;
}

function asRows(data: unknown): AnyRow[] {
  if (data == null || data === "") return [];
  if (Array.isArray(data)) return data as AnyRow[];
  if (typeof data === "object") return [data as AnyRow];
  return [];
}

function isEmptyObject(obj: unknown): boolean {
  return (
    !!obj && typeof obj === "object" && Object.keys(obj as object).length === 0
  );
}

function courseOptionLabel(c: StaffSubjectClass): string {
  const groupName = txt(c, ["groupName"]);
  const groupCode = txt(c, ["groupCode"]);
  const year = txt(c, ["courseYearName"]);
  const section = txt(c, ["section"]);
  const subject = txt(c, ["subjectName"]);
  return `${groupName} / ${groupCode} / ${year} / ${section} - ( ${subject} )`;
}

function DetailRow({
  label,
  value,
}: Readonly<{ label: string; value: string }>) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-2 py-0.5 text-sm sm:grid-cols-[130px_1fr]">
      <span className="font-medium text-muted-foreground">{label} :</span>
      <span className="font-medium text-primary">{value || "—"}</span>
    </div>
  );
}

type ClassDiaryNotesPageProps = {
  mode: "add" | "edit";
};

export function ClassDiaryNotesPage({ mode }: ClassDiaryNotesPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: sessionLoading } = useSessionContext();
  const { employeeId, loginCtx, isResolving } = useStaffLoginContext(
    user,
    sessionLoading,
  );

  const [courses, setCourses] = useState<StaffSubjectClass[]>([]);
  const [semesterKey, setSemesterKey] = useState<string | null>(null);
  const [day, setDay] = useState<Date | null>(() => new Date());
  const [periods, setPeriods] = useState<PeriodRow[]>([]);
  const [classTimingId, setClassTimingId] = useState<string | null>(null);
  const [selectedPeriodIds, setSelectedPeriodIds] = useState<string[]>([]);
  const [period, setPeriod] = useState<PeriodRow | null>(null);
  const [isAssignedProxy, setIsAssignedProxy] = useState(false);
  const [events, setEvents] = useState<AnyRow[]>([]);
  const [showLesson, setShowLesson] = useState(false);
  const [lessonStatus, setLessonStatus] = useState<AnyRow[]>([]);
  const [subjectUnits, setSubjectUnits] = useState<SelectOption[]>([]);
  const [subjectUnitTopics, setSubjectUnitTopics] = useState<SelectOption[]>(
    [],
  );
  const [teachingMethods, setTeachingMethods] = useState<SelectOption[]>([]);
  const [subjectUnitsId, setSubjectUnitsId] = useState<string | null>(null);
  const [subjectUnitTopicId, setSubjectUnitTopicId] = useState<string | null>(
    null,
  );
  const [teachingMethodCatdetId, setTeachingMethodCatdetId] = useState<
    string | null
  >(null);
  const [comments, setComments] = useState("");
  const [notesFile, setNotesFile] = useState<File | null>(null);
  const [existingNotesPath, setExistingNotesPath] = useState("");
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingPeriods, setLoadingPeriods] = useState(false);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [editBootstrapped, setEditBootstrapped] = useState(false);
  const editAutoSearchRef = useRef(false);
  const [lessonStatusOpen, setLessonStatusOpen] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const userRow = (user ?? {}) as unknown as AnyRow;
  const collegeCode =
    readStorage("collegeCode") || txt(userRow, ["collegeCode"]);
  const academicYear =
    readStorage("academicYear") || txt(userRow, ["academicYear"]);
  const userName =
    loginCtx?.uName ||
    readStorage("userName") ||
    txt(userRow, ["userName", "firstName"]);
  const empNumber =
    loginCtx?.empNumber ||
    readStorage("empNumber") ||
    txt(userRow, ["empNumber"]);

  const selectedCourse = useMemo(() => {
    if (!semesterKey) return null;
    const idx = Number(semesterKey);
    return courses[idx] ?? null;
  }, [courses, semesterKey]);

  const isTheory =
    String(selectedCourse?.subjectType ?? "").toUpperCase() === "THEORY";

  const semesterOptions = useMemo<SelectOption[]>(
    () =>
      courses.map((c, i) => ({
        value: String(i),
        label: courseOptionLabel(c),
      })),
    [courses],
  );

  const periodOptions = useMemo<SelectOption[]>(
    () =>
      periods.length === 0
        ? [
            {
              value: "__none__",
              label: "No periods assigned for today.",
              disabled: true,
            },
          ]
        : periods.map((p) => ({
            value: isTheory
              ? String(p.classTimingId ?? "")
              : String(p.timetableScheduleId ?? ""),
            label: periodOptionLabel(
              p,
              txt(selectedCourse as AnyRow, ["batchName"]),
            ),
          })),
    [periods, isTheory, selectedCourse],
  );

  const loadCourses = useCallback(async () => {
    if (!employeeId) {
      setCourses([]);
      setLoadingCourses(false);
      return;
    }
    setLoadingCourses(true);
    try {
      const list = await getStaffSubjectsForToday({ employeeId });
      setCourses(Array.isArray(list) ? list : []);
    } catch (e) {
      toastError(e, "Failed to load staff classes");
      setCourses([]);
    } finally {
      setLoadingCourses(false);
    }
  }, [employeeId]);

  const clearLessonFields = useCallback(() => {
    setSubjectUnitsId(null);
    setSubjectUnitTopicId(null);
    setTeachingMethodCatdetId(null);
    setComments("");
    setExistingNotesPath("");
    setSubjectUnitTopics([]);
    setLessonStatus([]);
  }, []);

  const loadEvents = useCallback(
    async (course: StaffSubjectClass, date: Date) => {
      const collegeId = num(course as AnyRow, ["collegeId"]);
      if (!collegeId) {
        setEvents([]);
        return;
      }
      const ymd = format(date, "yyyy/MM/dd");
      try {
        const rows = await listLeaveHolidayEvents({
          collegeId,
          startDate: ymd,
          endDate: ymd,
        });
        setEvents(rows);
      } catch {
        setEvents([]);
      }
    },
    [],
  );

  const loadPeriods = useCallback(
    async (course: StaffSubjectClass, date: Date) => {
      setLoadingPeriods(true);
      setPeriods([]);
      setClassTimingId(null);
      setSelectedPeriodIds([]);
      setPeriod(null);
      setIsAssignedProxy(false);
      setShowLesson(false);
      clearLessonFields();
      try {
        await loadEvents(course, date);
        const list = await listPeriodsForClassAttendance({
          collegeId: num(course as AnyRow, ["collegeId"]),
          academicYearId: num(course as AnyRow, ["academicYearId"]),
          employeeId: num(course as AnyRow, ["employeeId"]) || employeeId,
          groupSectionId: num(course as AnyRow, ["groupSectionId"]),
          subjectId: num(course as AnyRow, ["subjectId"]),
          date,
          subjectType: txt(course as AnyRow, ["subjectType"]),
          studentbatchId: num(course as AnyRow, ["studentbatchId"]) || null,
        });
        setPeriods(list);
      } catch (e) {
        toastError(e, "Failed to load periods");
        setPeriods([]);
      } finally {
        setLoadingPeriods(false);
      }
    },
    [clearLessonFields, employeeId, loadEvents],
  );

  const resolvePeriodFromSelection = useCallback(() => {
    let next: PeriodRow | null = null;
    if (!isTheory && selectedPeriodIds.length > 0) {
      next =
        periods.find(
          (p) => String(p.timetableScheduleId) === selectedPeriodIds[0],
        ) ?? null;
    } else if (isTheory && classTimingId) {
      next =
        periods.find((p) => String(p.classTimingId) === classTimingId) ?? null;
    }
    setPeriod(next);
    const proxies = Array.isArray(next?.staffProxies) ? next!.staffProxies : [];
    setIsAssignedProxy(proxies.length > 0);
    return next;
  }, [isTheory, selectedPeriodIds, classTimingId, periods]);

  useEffect(() => {
    resolvePeriodFromSelection();
  }, [resolvePeriodFromSelection]);

  const loadUnitTopics = useCallback(async (unitId: number) => {
    if (!unitId) {
      setSubjectUnitTopics([]);
      return;
    }
    try {
      const topics = await listSubjectUnitTopicsForMarkAttendance(unitId);
      setSubjectUnitTopics(
        topics.map((t) => ({
          value: String(t.subjectUnitTopicId ?? ""),
          label: String(t.topicName ?? t.subjectUnitTopicId ?? ""),
        })),
      );
      const methods = await listGeneralDetailsByCode(
        GM_CODES.TEACHING_METHODOLOGY,
      );
      setTeachingMethods(
        methods.map((m) => ({
          value: String(m.generalDetailId ?? ""),
          label: String(
            m.generalDetailDisplayName ??
              m.generalDetailName ??
              m.generalDetailId ??
              "",
          ),
        })),
      );
    } catch (e) {
      toastError(e, "Failed to load topics");
    }
  }, []);

  const loadLessonDetails = useCallback(
    async (course: StaffSubjectClass, selected: PeriodRow, date: Date) => {
      const scheduleIds =
        !isTheory && selectedPeriodIds.length > 0
          ? selectedPeriodIds.map(Number)
          : [Number(selected.timetableScheduleId)];
      const attendanceDate = formatClassDateYmdSlash(date);
      const isLab = String(course.subjectType ?? "").toUpperCase() === "LAB";
      const params: Record<string, string | number> = {
        timetableScheduleId: scheduleIds.join(","),
        attendanceDate,
      };
      if (isLab) {
        params.studentbatchId = num(course as AnyRow, ["studentbatchId"]);
      } else {
        params.clsempId = employeeId;
      }

      try {
        const data = await fetchDetails<unknown>(
          ATTENDANCE_API.STUDENT_STTENDANCE_DETAILS,
          params,
        );
        const list = asRows(data);
        setLessonStatus(list);
        if (list.length === 0) {
          toastInfo(
            "Please take the attendance before adding class notes for the seleted date and period",
          );
          return;
        }
        const first = list[0] ?? {};
        const actual = (first.actualClassesScheduleDTO ?? {}) as AnyRow;
        const dtoList = asRows(first.lessonstatusDTOs);
        const dto = (dtoList[0] ?? {}) as AnyRow;
        if (!isEmptyObject(actual)) {
          setExistingNotesPath(txt(actual, ["notesPath"]));
        }
        if (dtoList.length > 0) {
          const unitId = num(dto, ["subjectUnitsId"]);
          const topicId = num(dto, ["subjectUnitTopicId"]);
          const methodId = num(dto, ["teachingMethodCatdetId"]);
          setComments(txt(dto, ["comments"]));
          if (methodId) setTeachingMethodCatdetId(String(methodId));
          if (unitId) {
            setSubjectUnitsId(String(unitId));
            await loadUnitTopics(unitId);
            if (topicId) setSubjectUnitTopicId(String(topicId));
          }
        }
      } catch (e) {
        toastError(e, "Failed to load lesson details");
        setLessonStatus([]);
      }
    },
    [employeeId, isTheory, loadUnitTopics, selectedPeriodIds],
  );

  const handleSearch = useCallback(async () => {
    const nextErrors: FieldErrors = {};
    if (!selectedCourse) nextErrors.semester = "Semester is required";
    if (!day) nextErrors.day = "Day is required";
    if (isTheory) {
      if (!classTimingId) nextErrors.periods = "Period is required";
    } else if (selectedPeriodIds.length === 0) {
      nextErrors.periods = "Period is required";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    if (!selectedCourse || !day) return;
    if (isAssignedProxy) return;

    const selected = resolvePeriodFromSelection();
    if (!selected?.subjectId && !selected?.subjectResource?.[0]?.subjectId) {
      toastInfo("No period selected");
      return;
    }

    setSearching(true);
    setShowLesson(true);
    setLessonStatusOpen(true);
    try {
      const sid =
        Number(selected.subjectId) ||
        Number(selected.subjectResource?.[0]?.subjectId) ||
        num(selectedCourse as AnyRow, ["subjectId"]);
      const units = await listSubjectUnitsForMarkAttendance(sid);
      setSubjectUnits(
        units.map((u) => ({
          value: String(u.subjectUnitsId ?? ""),
          label: String(u.unitName ?? u.subjectUnitsId ?? ""),
        })),
      );
      await loadLessonDetails(selectedCourse, selected, day);
    } catch (e) {
      toastError(e, "Failed to search lesson status");
    } finally {
      setSearching(false);
    }
  }, [
    selectedCourse,
    day,
    isTheory,
    classTimingId,
    selectedPeriodIds,
    isAssignedProxy,
    resolvePeriodFromSelection,
    loadLessonDetails,
  ]);

  const handleSave = useCallback(async () => {
    if (!selectedCourse || !day || !period) return;
    if (!lessonStatus.length) {
      toastInfo(
        "Please take the attendance before adding class notes for the seleted date and period",
      );
      return;
    }
    const first = lessonStatus[0] ?? {};
    const actual = (first.actualClassesScheduleDTO ?? {}) as AnyRow;
    const dto = asRows(first.lessonstatusDTOs)[0] as AnyRow | undefined;
    const leassonstatusId = num(dto, ["leassonstatusId", "lessonstatusId"]);
    const actualClsScheduleId = num(actual, ["actualClsScheduleId"]);
    if (!leassonstatusId || !actualClsScheduleId) {
      toastInfo(
        "Please take the attendance before adding class notes for the seleted date and period",
      );
      return;
    }

    const payload = {
      collegeId: num(period as AnyRow, ["collegeId"]),
      academicYearId: num(period as AnyRow, ["academicYearId"]),
      groupSectionId: num(period as AnyRow, ["groupSectionId"]),
      subjectUnitsId: subjectUnitsId ? Number(subjectUnitsId) : null,
      subjectUnitTopicId: subjectUnitTopicId
        ? Number(subjectUnitTopicId)
        : null,
      comments,
      teachingMethodCatdetId: teachingMethodCatdetId
        ? Number(teachingMethodCatdetId)
        : null,
      timetableScheduleId: num(period as AnyRow, ["timetableScheduleId"]),
      subjectResourceId: period.subjectResource?.[0]?.subjectResourceId ?? null,
      isActive: true,
      actualClsScheduleId,
      leassonstatusId,
      classDate: format(day, "yyyy-MM-dd"),
    };

    setSaving(true);
    try {
      await domainUpdate(
        ASSESSMENT_API.LESSONSTATUS,
        "leassonstatusId",
        leassonstatusId,
        payload,
      );
      if (notesFile) {
        await uploadClassNotesForAttendance({
          actualClassScheduleId: actualClsScheduleId,
          file: notesFile,
        });
      }
      toastSuccess("Class notes saved successfully");
      router.push("/staff-classes/class-dairy");
    } catch (e) {
      toastError(e, "Failed to save class notes");
    } finally {
      setSaving(false);
    }
  }, [
    selectedCourse,
    day,
    period,
    lessonStatus,
    subjectUnitsId,
    subjectUnitTopicId,
    comments,
    teachingMethodCatdetId,
    notesFile,
    router,
  ]);

  useEffect(() => {
    if (sessionLoading || isResolving) return;
    void loadCourses();
  }, [sessionLoading, isResolving, loadCourses]);

  // Edit mode: preselect course + date from query params (Angular edit-notes).
  useEffect(() => {
    if (
      mode !== "edit" ||
      editBootstrapped ||
      loadingCourses ||
      courses.length === 0
    ) {
      return;
    }
    const courseYearId = Number(searchParams.get("courseYearId") ?? 0);
    const groupSectionId = Number(searchParams.get("groupSectionId") ?? 0);
    const subjectCode = searchParams.get("subjectCode") ?? "";
    const classDate = searchParams.get("classDate") ?? "";
    const idx = courses.findIndex(
      (c) =>
        num(c as AnyRow, ["courseYearId"]) === courseYearId &&
        num(c as AnyRow, ["groupSectionId"]) === groupSectionId &&
        txt(c as AnyRow, ["subjectCode"]) === subjectCode,
    );
    if (idx >= 0) {
      setSemesterKey(String(idx));
      if (classDate) {
        const d = new Date(classDate);
        if (!Number.isNaN(d.getTime())) setDay(d);
      }
    }
    setEditBootstrapped(true);
  }, [mode, editBootstrapped, loadingCourses, courses, searchParams]);

  useEffect(() => {
    if (!selectedCourse || !day) return;
    void loadPeriods(selectedCourse, day);
  }, [selectedCourse, day, loadPeriods]);

  // Edit: after periods load, select timetableScheduleId and auto-search.
  useEffect(() => {
    if (mode !== "edit" || !editBootstrapped || periods.length === 0) return;
    const ttId = searchParams.get("timetableScheduleId") ?? "";
    if (!ttId) return;
    const match = periods.find(
      (p) => String(p.timetableScheduleId) === String(ttId),
    );
    if (!match) return;
    if (isTheory) {
      if (classTimingId !== String(match.classTimingId)) {
        setClassTimingId(String(match.classTimingId ?? ""));
      }
    } else if (!selectedPeriodIds.includes(String(ttId))) {
      setSelectedPeriodIds([String(ttId)]);
    }
  }, [
    mode,
    editBootstrapped,
    periods,
    searchParams,
    isTheory,
    classTimingId,
    selectedPeriodIds,
  ]);

  useEffect(() => {
    if (mode !== "edit" || editAutoSearchRef.current) return;
    if (!selectedCourse || !day || !period || isAssignedProxy) return;
    if (isTheory && !classTimingId) return;
    if (!isTheory && selectedPeriodIds.length === 0) return;
    editAutoSearchRef.current = true;
    void handleSearch();
  }, [
    mode,
    selectedCourse,
    day,
    period,
    isAssignedProxy,
    isTheory,
    classTimingId,
    selectedPeriodIds,
    handleSearch,
  ]);

  const proxyNote =
    isAssignedProxy && period?.staffProxies?.[0]
      ? `Note : This schedule is already assigned to ${String(period.staffProxies[0].proxyFirstName ?? "")} (${String(period.staffProxies[0].subjectName ?? "")} / ${String(period.staffProxies[0].proxySubjecttypeDisplayName ?? "")}).`
      : "";

  const busy = sessionLoading || isResolving || loadingCourses;

  return (
    <FilteredPage
      title={mode === "edit" ? "Edit Class Notes" : "Add Class Notes"}
      filters={
        <div className="space-y-4">
          {events.length > 0 ? (
            <ul className="rounded-md bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
              {events.map((ev) => (
                <li key={`${txt(ev, ["eventName"])}-${txt(ev, ["startDate"])}`}>
                  {txt(ev, ["eventName"])} ({txt(ev, ["startDate"])} -{" "}
                  {txt(ev, ["endDate"])})
                </li>
              ))}
            </ul>
          ) : null}
          <div className="space-y-1 rounded-md border border-border bg-muted/20 p-3">
            <DetailRow
              label="College"
              value={`${collegeCode} / ${academicYear}`}
            />
            <DetailRow
              label="Faculty"
              value={`${userName} - ( ${empNumber} )`}
            />
          </div>
          <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <Select
                label="Semester"
                required
                value={semesterKey}
                onChange={(v) => {
                  setSemesterKey(v);
                  setErrors((e) => ({ ...e, semester: undefined }));
                }}
                options={semesterOptions}
                placeholder="Select semester"
                searchable
                isLoading={loadingCourses}
                error={errors.semester}
              />
            </div>
            <div className="lg:col-span-2">
              <DatePicker
                label="Day"
                required
                value={day}
                onChange={(d) => {
                  setDay(d);
                  setErrors((e) => ({ ...e, day: undefined }));
                }}
                maxDate={new Date()}
                clearable={false}
                displayFormat="dd/MM/yyyy"
                error={errors.day}
              />
            </div>
            <div className="lg:col-span-4">
              {isTheory ? (
                <Select
                  label="Periods"
                  required
                  value={classTimingId}
                  onChange={(v) => {
                    setClassTimingId(v);
                    setErrors((e) => ({ ...e, periods: undefined }));
                  }}
                  options={periodOptions.filter((o) => o.value !== "__none__")}
                  placeholder={
                    periods.length === 0
                      ? "No periods assigned for today."
                      : "Select period"
                  }
                  searchable
                  isLoading={loadingPeriods}
                  error={errors.periods}
                />
              ) : (
                <MultiSelect
                  label="Periods"
                  required
                  value={selectedPeriodIds}
                  onChange={(v) => {
                    setSelectedPeriodIds(v);
                    setErrors((e) => ({ ...e, periods: undefined }));
                  }}
                  options={periodOptions.filter((o) => o.value !== "__none__")}
                  placeholder={
                    periods.length === 0
                      ? "No periods assigned for today."
                      : "Select period(s)"
                  }
                  searchable
                  error={errors.periods}
                />
              )}
            </div>
            <div className="flex flex-col gap-1 lg:col-span-2">
              {/* Spacer matches Select label so Search stays aligned with inputs */}
              <span className="invisible text-sm font-medium" aria-hidden>
                Search
              </span>
              <Button
                className="h-9 w-auto min-w-[96px] self-start px-5"
                disabled={searching || busy}
                onClick={() => void handleSearch()}
              >
                Search
              </Button>
            </div>
          </div>
          {proxyNote ? (
            <p className="text-sm text-destructive">{proxyNote}</p>
          ) : null}
        </div>
      }
    >
      {showLesson ? (
        <div className="app-data-table app-data-table-card mt-4 flex flex-col">
          <div
            className={cn(
              "app-data-table-heading flex items-center justify-between gap-3 px-5",
              lessonStatusOpen ? "pt-5 pb-0" : "pt-5 pb-3",
            )}
          >
            <h3 className="text-sm font-semibold text-foreground">
              Lesson Status
            </h3>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              aria-expanded={lessonStatusOpen}
              aria-label={
                lessonStatusOpen
                  ? "Collapse Lesson Status"
                  : "Expand Lesson Status"
              }
              onClick={() => setLessonStatusOpen((o) => !o)}
            >
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  lessonStatusOpen ? "rotate-180" : "rotate-0",
                )}
              />
            </Button>
          </div>
          {lessonStatusOpen ? (
            <div className="space-y-4 border-t border-border px-5 py-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Select
                  label="Unit"
                  value={subjectUnitsId}
                  onChange={(v) => {
                    setSubjectUnitsId(v);
                    setSubjectUnitTopicId(null);
                    if (v) void loadUnitTopics(Number(v));
                    else setSubjectUnitTopics([]);
                  }}
                  options={[{ value: "", label: "- None -" }, ...subjectUnits]}
                  placeholder="- None -"
                  searchable
                  clearable
                />
                <Select
                  label="Topic"
                  value={subjectUnitTopicId}
                  onChange={setSubjectUnitTopicId}
                  options={[
                    { value: "", label: "- None -" },
                    ...subjectUnitTopics,
                  ]}
                  placeholder="- None -"
                  searchable
                  clearable
                  disabled={!subjectUnitsId}
                />
                <Select
                  label="Teaching Method"
                  value={teachingMethodCatdetId}
                  onChange={setTeachingMethodCatdetId}
                  options={[
                    { value: "", label: "- none -" },
                    ...teachingMethods,
                  ]}
                  placeholder="- none -"
                  searchable
                  clearable
                />
              </div>
              <FormField label="Comments" htmlFor="class-diary-comments">
                <Textarea
                  id="class-diary-comments"
                  value={comments}
                  maxLength={256}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Enter comments"
                  rows={4}
                  className="min-h-[96px] resize-y"
                />
                <p className="text-xs text-muted-foreground">
                  {comments.length} / 1000
                </p>
              </FormField>
              <div className="max-w-sm space-y-2 rounded-md border border-border bg-card p-3">
                <Label className="text-sm font-medium">Class Notes File</Label>
                <Input
                  id="class-diary-file"
                  ref={fileInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.pdf,.doc"
                  className="sr-only"
                  onChange={(e) => setNotesFile(e.target.files?.[0] ?? null)}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mr-1.5 h-3.5 w-3.5" />
                    {notesFile ? "Change file" : "Choose file"}
                  </Button>
                  <span className="truncate text-xs text-muted-foreground">
                    {notesFile?.name ?? "No file chosen"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG, PDF, or DOC
                </p>
                {existingNotesPath ? (
                  <a
                    href={existingNotesPath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-sm font-medium text-blue-600 underline"
                  >
                    View Class Notes
                  </a>
                ) : null}
              </div>
              <div className="flex flex-wrap justify-end gap-2 pt-1">
                <Button
                  variant="outline"
                  onClick={() => router.push("/staff-classes/class-dairy")}
                >
                  Back
                </Button>
                <Button disabled={saving} onClick={() => void handleSave()}>
                  Save
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 flex justify-end">
          <Button
            variant="outline"
            onClick={() => router.push("/staff-classes/class-dairy")}
          >
            Back
          </Button>
        </div>
      )}
    </FilteredPage>
  );
}
