"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import type {
  ColDef,
  ICellRendererParams,
  IHeaderParams,
} from "ag-grid-community";
import { DatePicker } from "@/common/components/date-picker";
import { MultiSelect, Select } from "@/common/components/select";
import { DataTable } from "@/common/components/table";
import { AngularFilterCard, FilteredPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn, rowIndexGetter } from "@/lib/utils";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import {
  buildMarkAttendanceSavePayload,
  formatScheduleDateYmd,
  getLessonStatusFormFromDetails,
  getLessonStatusScheduleMeta,
  isAttendanceAlreadyMarked,
  listPeriodsForClassAttendance,
  listMarkAttendanceHolidayEvents,
  listStudentsForMarkAttendance,
  listStudentsForSubjectAttendance,
  listSubjectUnitsForMarkAttendance,
  listSubjectUnitTopicsForMarkAttendance,
  listTeachingMethodsForMarkAttendance,
  periodOptionLabel,
  refreshAfterMarkAttendanceSave,
  saveStudentAttendanceDetails,
  tConvert,
  uploadClassNotesForAttendance,
  type MarkAttendanceHolidayEvent,
  type MarkAttendanceSaveItem,
  type PeriodRow,
} from "@/services";
import { AttendancePreviewModal } from "./AttendancePreviewModal";

type StudentRow = Record<string, unknown> & {
  admissionNumber?: string;
  rollNumber?: string;
  firstName?: string;
  isPresent?: boolean;
  checked?: boolean;
  studentId?: number;
};

type MarkAllHeaderParams = IHeaderParams & {
  checked: boolean;
  onToggle: (checked: boolean) => void;
  canEdit: boolean;
};

function MarkAllHeader(props: MarkAllHeaderParams) {
  if (!props.canEdit) {
    return (
      <span className="flex h-full items-center px-1 text-[12px] font-medium">
        Status
      </span>
    );
  }
  return (
    <label className="flex h-full w-full cursor-pointer items-center gap-1.5 px-1 text-[12px] font-medium leading-none">
      <Checkbox
        checked={props.checked}
        onCheckedChange={(v) => props.onToggle(v === true)}
        aria-label={props.checked ? "UnMark All" : "Mark All"}
      />
      <span>{props.checked ? "UnMark All" : "Mark All"}</span>
    </label>
  );
}

function parseDayParam(raw: string | null): Date {
  if (!raw) return new Date();
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function DetailRow({
  label,
  value,
}: Readonly<{ label: string; value: string }>) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-2 text-sm py-0.5 sm:grid-cols-[130px_1fr]">
      <span className="text-foreground font-medium">{label} :</span>
      <span className="text-primary font-medium">{value || "—"}</span>
    </div>
  );
}

/**
 * Angular `staff-classes/my-classes/mark-attendance` —
 * EmployeeModuleMarkAttendanceComponent full parity.
 */
export function MarkClassAttendancePage({
  mode,
}: Readonly<{ mode: "mark" | "view" }>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fromAttendanceUpdate = pathname.includes("/attendance-management/");

  const collegeId = Number(searchParams.get("collegeId") || 0);
  const courseGroupId = Number(searchParams.get("courseGroupId") || 0);
  const groupSectionId = Number(searchParams.get("groupSectionId") || 0);
  const academicYearId = Number(searchParams.get("academicYearId") || 0);
  const courseYearId = Number(searchParams.get("courseYearId") || 0);
  const regulationId = Number(searchParams.get("regulationId") || 0);
  const employeeId = Number(searchParams.get("employeeId") || 0);
  const subjectId = Number(searchParams.get("subjectId") || 0);
  const studentbatchId =
    Number(searchParams.get("studentbatchId") || 0) || null;
  const subjectType = searchParams.get("subjectType") ?? "";
  const isLab = subjectType.toUpperCase() === "LAB";
  const isTheory = subjectType.toUpperCase() === "THEORY";
  const isElective = subjectType.toUpperCase() === "ELECTIVE";

  const [day, setDay] = useState<Date | null>(() =>
    parseDayParam(searchParams.get("day")),
  );
  const [periods, setPeriods] = useState<PeriodRow[]>([]);
  const [classTimingId, setClassTimingId] = useState<number | null>(null);
  const [selectedPeriodIds, setSelectedPeriodIds] = useState<number[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodRow | null>(null);
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [flag, setFlag] = useState(false);
  const [isAssignedProxy, setIsAssignedProxy] = useState(false);
  const [loadingPeriods, setLoadingPeriods] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [events, setEvents] = useState<MarkAttendanceHolidayEvent[]>([]);

  /** Angular Lesson Status card form (Unit / Topic / Teaching Method / Comments). */
  const [subjectUnits, setSubjectUnits] = useState<
    { value: string; label: string }[]
  >([]);
  const [subjectUnitTopics, setSubjectUnitTopics] = useState<
    { value: string; label: string }[]
  >([]);
  const [methodOptions, setMethodOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [subjectUnitsId, setSubjectUnitsId] = useState<string | null>(null);
  const [subjectUnitTopicId, setSubjectUnitTopicId] = useState<string | null>(
    null,
  );
  const [teachingMethodCatdetId, setTeachingMethodCatdetId] = useState<
    string | null
  >(null);
  const [comments, setComments] = useState("");
  const [percentage, setPercentage] = useState("");
  const [attendanceAlreadyMarked, setAttendanceAlreadyMarked] = useState(false);
  const [notesPath, setNotesPath] = useState("");
  const [actualClsScheduleId, setActualClsScheduleId] = useState<number | null>(
    null,
  );

  const [markAllChecked, setMarkAllChecked] = useState(true);
  const [videoPath, setVideoPath] = useState("");
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<
    MarkAttendanceSaveItem[] | null
  >(null);
  /** Angular `#classNotesAvatar` — read files on Save, not only from React state. */
  const classNotesInputRef = useRef<HTMLInputElement>(null);
  const setMarkAllRef = useRef<(checked: boolean) => void>(() => {});
  const toggleStudentPresentRef = useRef<
    (studentId: number, present: boolean) => void
  >(() => {});

  const collegeLine =
    `${searchParams.get("collegeCode") ?? ""} / ${searchParams.get("academicYear") ?? ""}`.trim();
  const courseLine = [
    searchParams.get("groupName"),
    searchParams.get("groupCode"),
    searchParams.get("courseYearName"),
    searchParams.get("section"),
  ]
    .filter(Boolean)
    .join(" / ");
  const subjectLine = `${searchParams.get("subjectName") ?? ""}${
    subjectType
      ? ` (${isLab && searchParams.get("batchName") ? `${searchParams.get("batchName")} - ` : ""}${subjectType})`
      : ""
  }`;

  const resetSearchState = useCallback(() => {
    setRows([]);
    setFlag(false);
    setSubjectUnits([]);
    setSubjectUnitTopics([]);
    setMethodOptions([]);
    setSubjectUnitsId(null);
    setSubjectUnitTopicId(null);
    setTeachingMethodCatdetId(null);
    setComments("");
    setPercentage("");
    setAttendanceAlreadyMarked(false);
    setNotesPath("");
    setActualClsScheduleId(null);
    setVideoPath("");
    if (classNotesInputRef.current) classNotesInputRef.current.value = "";
  }, []);

  const loadPeriodsAndEvents = useCallback(
    async (date: Date) => {
      if (
        !collegeId ||
        !academicYearId ||
        !employeeId ||
        !groupSectionId ||
        !subjectId
      ) {
        setPeriods([]);
        setEvents([]);
        return;
      }
      setLoadingPeriods(true);
      setClassTimingId(null);
      setSelectedPeriodIds([]);
      setSelectedPeriod(null);
      setIsAssignedProxy(false);
      resetSearchState();
      try {
        const [list, holidayEvents] = await Promise.all([
          listPeriodsForClassAttendance({
            collegeId,
            academicYearId,
            employeeId,
            groupSectionId,
            subjectId,
            date,
            subjectType,
            studentbatchId,
          }),
          listMarkAttendanceHolidayEvents({ collegeId, date }),
        ]);
        setPeriods(list);
        setEvents(holidayEvents);
      } catch (e) {
        toastError(getErrorMessage(e));
        setPeriods([]);
        setEvents([]);
      } finally {
        setLoadingPeriods(false);
      }
    },
    [
      collegeId,
      academicYearId,
      employeeId,
      groupSectionId,
      subjectId,
      subjectType,
      studentbatchId,
      resetSearchState,
    ],
  );

  useEffect(() => {
    if (day) void loadPeriodsAndEvents(day);
  }, [day, loadPeriodsAndEvents]);

  const periodOptions = useMemo(() => {
    if (periods.length === 0) {
      return [
        {
          value: "__none__",
          label: "No periods assigned for today.",
          disabled: true,
        },
      ];
    }
    const batchName = searchParams.get("batchName") ?? undefined;
    return periods.map((p) => ({
      value: isTheory ? String(p.classTimingId) : String(p.timetableScheduleId),
      label: periodOptionLabel(p, isLab ? (batchName ?? undefined) : undefined),
    }));
  }, [periods, searchParams, isLab, isTheory]);

  function resolvePeriodFromSelection(
    theoryTimingId: number | null,
    scheduleIds: number[],
  ): PeriodRow | null {
    if (isTheory && theoryTimingId != null) {
      return (
        periods.find((p) => Number(p.classTimingId) === theoryTimingId) ?? null
      );
    }
    if (scheduleIds.length > 0) {
      return (
        periods.find((p) => Number(p.timetableScheduleId) === scheduleIds[0]) ??
        null
      );
    }
    return null;
  }

  function onTheoryPeriodSelect(value: string | null) {
    const id = value && value !== "__none__" ? Number(value) : null;
    resetSearchState();
    setClassTimingId(id);
    const period = resolvePeriodFromSelection(id, []);
    setSelectedPeriod(period);
    if (period?.timetableScheduleId != null) {
      setSelectedPeriodIds([Number(period.timetableScheduleId)]);
    } else {
      setSelectedPeriodIds([]);
    }
    const proxies = period?.staffProxies ?? [];
    setIsAssignedProxy(proxies.length > 0);
    if (proxies.length > 0) {
      toastInfo(
        `Note : This schedule is already assigned to ${String(proxies[0]?.proxyFirstName ?? "")} (${String(proxies[0]?.subjectName ?? "")} / ${String(proxies[0]?.proxySubjecttypeDisplayName ?? "")}).`,
      );
    }
  }

  function onLabPeriodsSelect(values: string[]) {
    resetSearchState();
    const ids = values
      .filter((v) => v && v !== "__none__")
      .map((v) => Number(v))
      .filter((n) => Number.isFinite(n) && n > 0);
    setSelectedPeriodIds(ids);
    const period = resolvePeriodFromSelection(null, ids);
    setSelectedPeriod(period);
    setClassTimingId(
      period?.classTimingId != null ? Number(period.classTimingId) : null,
    );
    const proxies = period?.staffProxies ?? [];
    setIsAssignedProxy(proxies.length > 0);
  }

  async function loadTopicsForUnit(unitId: number) {
    if (!unitId) {
      setSubjectUnitTopics([]);
      return;
    }
    const topics = await listSubjectUnitTopicsForMarkAttendance(unitId);
    setSubjectUnitTopics(
      topics
        .map((t) => {
          const id = Number(t.subjectUnitTopicId ?? 0);
          if (!id) return null;
          return {
            value: String(id),
            label: String(t.topicName ?? id),
          };
        })
        .filter((x): x is { value: string; label: string } => x != null),
    );
  }

  async function onUnitChange(value: string | null) {
    setSubjectUnitsId(value);
    setSubjectUnitTopicId(null);
    const unitId = Number(value) || 0;
    if (!unitId) {
      setSubjectUnitTopics([]);
      return;
    }
    try {
      const [topics, methods] = await Promise.all([
        listSubjectUnitTopicsForMarkAttendance(unitId),
        methodOptions.length > 0
          ? Promise.resolve(methodOptions)
          : listTeachingMethodsForMarkAttendance(),
      ]);
      setSubjectUnitTopics(
        topics
          .map((t) => {
            const id = Number(t.subjectUnitTopicId ?? 0);
            if (!id) return null;
            return {
              value: String(id),
              label: String(t.topicName ?? id),
            };
          })
          .filter((x): x is { value: string; label: string } => x != null),
      );
      if (methodOptions.length === 0) setMethodOptions(methods);
    } catch (e) {
      toastError(getErrorMessage(e));
      setSubjectUnitTopics([]);
    }
  }

  async function applyLessonStatusFromSearch(params: {
    subjectId: number;
    lessonDetails: unknown;
    units?: Record<string, unknown>[];
  }) {
    const [unitsRows, methods] = await Promise.all([
      params.units
        ? Promise.resolve(params.units)
        : listSubjectUnitsForMarkAttendance(params.subjectId),
      listTeachingMethodsForMarkAttendance(),
    ]);
    setSubjectUnits(
      unitsRows
        .map((u) => {
          const id = Number(u.subjectUnitsId ?? 0);
          if (!id) return null;
          return {
            value: String(id),
            label: String(u.unitName ?? id),
          };
        })
        .filter((x): x is { value: string; label: string } => x != null),
    );
    setMethodOptions(methods);

    const form = getLessonStatusFormFromDetails(params.lessonDetails);
    setComments(form.comments);
    setPercentage(form.percentage);
    setTeachingMethodCatdetId(
      form.teachingMethodCatdetId != null
        ? String(form.teachingMethodCatdetId)
        : null,
    );
    setSubjectUnitsId(
      form.subjectUnitsId != null ? String(form.subjectUnitsId) : null,
    );
    setSubjectUnitTopicId(
      form.subjectUnitTopicId != null ? String(form.subjectUnitTopicId) : null,
    );
    if (form.subjectUnitsId) {
      await loadTopicsForUnit(form.subjectUnitsId);
    } else {
      setSubjectUnitTopics([]);
    }
  }

  async function onSearch() {
    if (!day) {
      toastError("Please select Date");
      return;
    }
    if (isTheory && !classTimingId) {
      toastError("Please select Peroids");
      return;
    }
    if (!isTheory && selectedPeriodIds.length === 0) {
      toastError("Please select Peroids");
      return;
    }
    if (isAssignedProxy) return;
    if (events.length > 0) return;

    const period =
      selectedPeriod ??
      resolvePeriodFromSelection(classTimingId, selectedPeriodIds);
    if (!period) {
      toastError("Period schedule incomplete");
      return;
    }
    setSelectedPeriod(period);

    const scheduleIds = isTheory
      ? [Number(period.timetableScheduleId)].filter(Boolean)
      : selectedPeriodIds.filter(Boolean);
    if (scheduleIds.length === 0) {
      toastError("Please select Peroids");
      return;
    }
    setSelectedPeriodIds(scheduleIds);

    setLoadingSearch(true);
    try {
      const resource = period.subjectResource?.[0];
      const typeCode = String(
        resource?.subjectTypeCode ?? subjectType,
      ).toUpperCase();
      const batchId =
        Number(resource?.studentBatchId ?? studentbatchId ?? 0) || null;

      let list: Record<string, unknown>[];
      if (
        (typeCode === "LAB" && batchId) ||
        typeCode === "ELECTIVE" ||
        isLab ||
        isElective
      ) {
        list = await listStudentsForSubjectAttendance({
          collegeId,
          academicYearId,
          courseGroupId,
          courseYearId,
          groupSectionId,
          regulationId,
          subjectId: Number(resource?.subjectId ?? subjectId),
          studentbatchId: typeCode === "LAB" || isLab ? batchId : null,
        });
      } else {
        list = await listStudentsForMarkAttendance({
          collegeId,
          courseGroupId,
          groupSectionId,
          academicYearId,
        });
      }

      const attendanceDate = formatScheduleDateYmd(day);
      const staffId = resource?.staffId ?? employeeId;
      const students = list.map((s) => ({
        ...s,
        isPresent: true,
        checked: true,
        attendanceDate,
        verifiedbyEmployeeId: null,
        takenbyEmployeeId: staffId,
        attendanceTakenByEmployeeId: staffId,
        classTakenByEmployeeId: staffId,
        subjectResourceId: resource?.subjectResourceId ?? null,
        subjectId: resource?.subjectId ?? subjectId,
        timetableScheduleId: period.timetableScheduleId,
      })) as StudentRow[];

      const timetableScheduleId = scheduleIds[0]!;
      const periodSubjectId = Number(resource?.subjectId ?? subjectId);

      // Search APIs: studentabsentlist + studentattendancedetails + SubjectUnit
      // (+ SubjectUnitTopic / TECHMETHD via applyLessonStatusFromSearch)
      const refreshed = await refreshAfterMarkAttendanceSave({
        collegeId,
        groupSectionId,
        subjectId: periodSubjectId,
        day,
        timetableScheduleId,
        employeeId,
        students,
        subjectType,
        studentbatchId: batchId,
      });

      const merged = refreshed.students as StudentRow[];
      const alreadyMarked = isAttendanceAlreadyMarked(refreshed.lessonDetails);
      const meta = getLessonStatusScheduleMeta(refreshed.lessonDetails);
      setAttendanceAlreadyMarked(alreadyMarked);
      setNotesPath(meta.notesPath);
      setActualClsScheduleId(meta.actualClsScheduleId);
      if (meta.videoPath) setVideoPath(meta.videoPath);

      await applyLessonStatusFromSearch({
        subjectId: periodSubjectId,
        lessonDetails: refreshed.lessonDetails,
        units: refreshed.units,
      });

      setRows(merged);
      setMarkAllChecked(merged.every((r) => r.checked !== false));
      setFlag(true);
      if (merged.length === 0) toastSuccess("No Record(s) found.");
    } catch (e) {
      toastError(getErrorMessage(e));
      setRows([]);
      setFlag(false);
    } finally {
      setLoadingSearch(false);
    }
  }

  function openAttendancePreview() {
    if (!day || !selectedPeriod || rows.length === 0) return;
    if (!canSaveAttendance) return;

    const periodIds = isTheory
      ? [Number(selectedPeriod.timetableScheduleId)].filter(Boolean)
      : selectedPeriodIds.filter(Boolean);

    if (periodIds.length === 0) {
      toastError("Please select Peroids");
      return;
    }

    const payload = buildMarkAttendanceSavePayload({
      students: rows,
      periods,
      selectedPeriodIds: periodIds,
      day,
      employeeId,
      academicYearId,
      subjectType,
      studentbatchId,
      videoPath,
      subjectUnitsId: subjectUnitsId ? Number(subjectUnitsId) : null,
      subjectUnitTopicId: subjectUnitTopicId
        ? Number(subjectUnitTopicId)
        : null,
      teachingMethodCatdetId: teachingMethodCatdetId
        ? Number(teachingMethodCatdetId)
        : null,
      comments,
      percentage,
    });

    if (payload.length === 0) {
      toastError("Unable to build attendance payload for selected period");
      return;
    }

    setPendingPayload(payload);
    setPreviewOpen(true);
  }

  async function confirmSaveAttendance() {
    if (
      !pendingPayload ||
      pendingPayload.length === 0 ||
      !day ||
      !selectedPeriod
    ) {
      return;
    }

    const timetableScheduleId = Number(
      selectedPeriodIds[0] ?? selectedPeriod.timetableScheduleId ?? 0,
    );
    const periodSubjectId = Number(
      selectedPeriod.subjectResource?.[0]?.subjectId ?? subjectId,
    );
    const batchId =
      Number(
        selectedPeriod.subjectResource?.[0]?.studentBatchId ??
          studentbatchId ??
          0,
      ) || null;

    setSaving(true);
    try {
      const result = await saveStudentAttendanceDetails(pendingPayload);
      const scheduleIds = Array.isArray(result.data) ? result.data : [];
      const firstId = scheduleIds[0];

      // Angular: FormData actualClassScheduleId + notesDoc from #classNotesAvatar
      const notesFile = classNotesInputRef.current?.files?.[0] ?? null;
      if (notesFile && firstId != null && firstId !== "") {
        try {
          await uploadClassNotesForAttendance({
            actualClassScheduleId: firstId as string | number,
            file: notesFile,
          });
          toastSuccess("Class notes uploaded successfully");
        } catch (uploadErr) {
          toastError(getErrorMessage(uploadErr));
        }
      }

      const refreshed = await refreshAfterMarkAttendanceSave({
        collegeId,
        groupSectionId,
        subjectId: periodSubjectId,
        day,
        timetableScheduleId,
        employeeId,
        students: rows,
        subjectType,
        studentbatchId: batchId,
      });

      setRows(refreshed.students as StudentRow[]);
      setMarkAllChecked(refreshed.students.every((r) => r.checked !== false));
      setFlag(true);
      setAttendanceAlreadyMarked(
        isAttendanceAlreadyMarked(refreshed.lessonDetails),
      );
      const meta = getLessonStatusScheduleMeta(refreshed.lessonDetails);
      setNotesPath(meta.notesPath);
      setActualClsScheduleId(meta.actualClsScheduleId);
      if (meta.videoPath) setVideoPath(meta.videoPath);

      await applyLessonStatusFromSearch({
        subjectId: periodSubjectId,
        lessonDetails: refreshed.lessonDetails,
        units: refreshed.units,
      });
      if (classNotesInputRef.current) classNotesInputRef.current.value = "";

      setPreviewOpen(false);
      setPendingPayload(null);
      toastSuccess(result.message || "Attendance saved successfully");
    } catch (e) {
      toastError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  const absentees = useMemo(
    () => rows.filter((r) => r.checked === false || r.isPresent === false),
    [rows],
  );

  const canEditAttendance = mode === "mark";
  /** Angular: Save only when `isEmptyObject(lessonStatus)`. */
  const canSaveAttendance = mode === "mark" && !attendanceAlreadyMarked;

  function setMarkAll(checked: boolean) {
    if (!canEditAttendance) return;
    setMarkAllChecked(checked);
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        checked,
        isPresent: checked,
      })),
    );
  }

  function toggleStudentPresent(studentId: number, present: boolean) {
    if (!canEditAttendance) return;
    // Angular checkedItems: set isPresent, rebuild absents, getMarkStatus()
    setRows((prev) => {
      const next = prev.map((r) =>
        Number(r.studentId) === studentId
          ? { ...r, isPresent: present, checked: present }
          : r,
      );
      setMarkAllChecked(next.every((r) => r.isPresent !== false));
      return next;
    });
  }

  setMarkAllRef.current = setMarkAll;
  toggleStudentPresentRef.current = toggleStudentPresent;

  const attendanceColumnDefs = useMemo<ColDef<StudentRow>[]>(
    () => [
      {
        headerName: "SI.No",
        valueGetter: rowIndexGetter,
        width: 70,
        flex: 0,
      },
      {
        headerName: "Roll No.",
        minWidth: 120,
        valueGetter: (p) =>
          String(p.data?.rollNumber ?? p.data?.admissionNumber ?? ""),
      },
      {
        headerName: "Student Name",
        minWidth: 180,
        flex: 1,
        valueGetter: (p) => String(p.data?.firstName ?? "").toUpperCase(),
      },
      {
        headerName: "Status",
        minWidth: 160,
        width: 160,
        flex: 0,
        sortable: false,
        filter: false,
        headerComponent: MarkAllHeader,
        headerComponentParams: {
          checked: markAllChecked,
          canEdit: canEditAttendance,
          onToggle: (checked: boolean) => setMarkAllRef.current(checked),
        },
        cellRenderer: (p: ICellRendererParams<StudentRow>) => {
          const present =
            p.data?.checked !== false && p.data?.isPresent !== false;
          const sid = Number(p.data?.studentId ?? 0);
          if (!canEditAttendance) {
            return (
              <span
                className={cn(
                  "text-sm font-medium",
                  present ? "text-[#00c300]" : "text-red-600",
                )}
              >
                {present ? "Present" : "Absent"}
              </span>
            );
          }
          return (
            <label className="inline-flex h-full cursor-pointer items-center gap-2">
              <Checkbox
                checked={present}
                onCheckedChange={(v) =>
                  toggleStudentPresentRef.current(sid, v === true)
                }
                aria-label={present ? "Present" : "Absent"}
              />
              <span
                className={cn(
                  "text-sm font-medium",
                  present ? "text-[#00c300]" : "text-red-600",
                )}
              >
                {present ? "Present" : "Absent"}
              </span>
            </label>
          );
        },
      },
    ],
    [markAllChecked, canEditAttendance],
  );

  const absenteesRail = (
    <div className="overflow-hidden border border-[#c3d9ff] bg-white shadow-sm">
      <h3 className="m-0 border border-[#c3d9ff] bg-[#ecf3ff] px-3 py-[11px] text-center text-sm font-medium uppercase tracking-wide text-black">
        Absentees
        <span className="float-right font-semibold">{absentees.length}</span>
      </h3>
      <div
        className="overflow-y-auto text-sm text-black"
        style={{ maxHeight: 403 }}
      >
        {absentees.length === 0 ? (
          <p className="m-0 border-b border-[#dedede] px-[10px] py-[10px]">
            No absents found.
          </p>
        ) : (
          absentees.map((a) => (
            <p
              key={String(a.studentId)}
              className="m-0 border-b border-[#dedede] px-[10px] py-[10px]"
            >
              {String(a.firstName ?? "")} -{" "}
              {String(a.rollNumber ?? a.admissionNumber ?? "")}
            </p>
          ))
        )}
      </div>
    </div>
  );

  const previewPeriods = useMemo(() => {
    if (!selectedPeriod) return [];
    if (isTheory) {
      return [
        {
          classTimingName: String(selectedPeriod.classTimingName ?? ""),
          startTime: String(selectedPeriod.startTime ?? ""),
          endTime: String(selectedPeriod.endTime ?? ""),
        },
      ];
    }
    return selectedPeriodIds
      .map((id) => periods.find((p) => Number(p.timetableScheduleId) === id))
      .filter(Boolean)
      .map((p) => ({
        classTimingName: String(p!.classTimingName ?? ""),
        startTime: String(p!.startTime ?? ""),
        endTime: String(p!.endTime ?? ""),
      }));
  }, [isTheory, selectedPeriod, selectedPeriodIds, periods]);

  const previewSubjectName = useMemo(() => {
    const fromPeriod = String(
      selectedPeriod?.subjectResource?.[0]?.subjectName ?? "",
    );
    return fromPeriod || searchParams.get("subjectName") || "";
  }, [selectedPeriod, searchParams]);

  const previewCourseLine = useMemo(() => {
    const group =
      searchParams.get("groupCode") || searchParams.get("groupName") || "";
    const year = searchParams.get("courseYearName") || "";
    const section = searchParams.get("section") || "";
    return [group, year, section].filter(Boolean).join(" / ");
  }, [searchParams]);

  const attendanceHeader = useMemo(() => {
    const parts = [
      searchParams.get("collegeCode"),
      searchParams.get("academicYear"),
      searchParams.get("groupName"),
      searchParams.get("groupCode"),
      searchParams.get("courseYearName"),
      searchParams.get("section"),
    ].filter(Boolean);
    let periodPart = "";
    if (selectedPeriod?.classTimingName) {
      const range = `${tConvert(selectedPeriod.startTime)}-${tConvert(selectedPeriod.endTime)}`;
      const subj = selectedPeriod.subjectResource?.[0]?.subjectName;
      periodPart = ` ${selectedPeriod.classTimingName}[${range}]${subj ? ` ${subj}` : ""}`;
    }
    const datePart = day ? ` - (${format(day, "MMM d, y")})` : "";
    return `${parts.join("/")}${periodPart}${datePart}`;
  }, [searchParams, selectedPeriod, day]);

  const periodSelectValue = classTimingId ? String(classTimingId) : null;
  const multiPeriodValues = selectedPeriodIds.map(String);

  return (
    <FilteredPage
      title="Mark Student Attendance"
      filtersCollapsible={false}
      filters={
        <div className="space-y-4">
          {events.length > 0 ? (
            <div className="rounded-sm border border-amber-300 bg-amber-50 px-4 py-2 space-y-1">
              {events.map((ev, i) => (
                <p key={`${ev.eventName}-${i}`} className="text-sm font-medium">
                  {String(ev.eventName ?? "Holiday")}
                  {ev.startDate || ev.endDate
                    ? ` (${ev.startDate ?? ""}${ev.endDate ? ` - ${ev.endDate}` : ""})`
                    : ""}
                </p>
              ))}
            </div>
          ) : null}

          <div className="rounded-sm border border-primary/30 bg-primary/5 px-4 py-3 space-y-1">
            <DetailRow label="College" value={collegeLine} />
            <DetailRow label="Course" value={courseLine} />
            <DetailRow
              label="Employee"
              value={searchParams.get("empName") ?? ""}
            />
            <DetailRow label="Subject" value={subjectLine} />
            <DetailRow
              label="Subject Code"
              value={searchParams.get("subjectCode") ?? ""}
            />
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <DatePicker
              label="Day *"
              value={day}
              onChange={setDay}
              clearable={false}
              maxDate={new Date()}
              className="w-[180px] shrink-0"
            />
            {isTheory ? (
              <Select
                label="Peroids *"
                value={periodSelectValue}
                onChange={onTheoryPeriodSelect}
                options={periodOptions}
                searchable
                isLoading={loadingPeriods}
                placeholder="Peroids"
                className="w-full max-w-[min(100%,28rem)] sm:w-[min(50%,28rem)]"
              />
            ) : (
              <MultiSelect
                label="Peroids *"
                value={multiPeriodValues}
                onChange={onLabPeriodsSelect}
                options={periodOptions.filter((o) => o.value !== "__none__")}
                searchable
                isLoading={loadingPeriods}
                placeholder="Peroids"
                showSelectAll={false}
                className="w-full max-w-[min(100%,36rem)] sm:w-[min(65%,36rem)]"
              />
            )}
            {events.length === 0 ? (
              <Button
                type="button"
                className="shrink-0 mb-0.5"
                disabled={isAssignedProxy || loadingSearch}
                onClick={() => void onSearch()}
              >
                Search
              </Button>
            ) : null}
          </div>

          {isAssignedProxy && selectedPeriod?.staffProxies?.[0] ? (
            <p className="text-sm text-destructive">
              Note : This schedule is already assigned to{" "}
              <span className="font-medium">
                {String(selectedPeriod.staffProxies[0].proxyFirstName ?? "")} (
                {String(selectedPeriod.staffProxies[0].subjectName ?? "")} /{" "}
                {String(
                  selectedPeriod.staffProxies[0].proxySubjecttypeDisplayName ??
                    "",
                )}
                )
              </span>
              .
            </p>
          ) : null}
        </div>
      }
    >
      {flag ? (
        <AngularFilterCard title="Lesson Status" icon="book" defaultOpen>
          <div className="space-y-5">
            {/* Image 2: Unit ~35% / Topic ~35% / Teaching Method ~30% underline fields */}
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:gap-6">
              <div className="min-w-0 flex-1 md:basis-[35%] md:flex-none">
                <Select
                  label="Unit"
                  variant="standard"
                  value={subjectUnitsId}
                  onChange={(v) => void onUnitChange(v)}
                  options={subjectUnits}
                  searchable
                  clearable
                  placeholder="Unit"
                  disabled={attendanceAlreadyMarked || mode === "view"}
                />
              </div>
              <div className="min-w-0 flex-1 md:basis-[30%] md:flex-none">
                <Select
                  label="Topic"
                  variant="standard"
                  value={subjectUnitTopicId}
                  onChange={(v) => setSubjectUnitTopicId(v)}
                  options={subjectUnitTopics}
                  searchable
                  clearable
                  placeholder="Topic"
                  disabled={
                    attendanceAlreadyMarked ||
                    mode === "view" ||
                    !subjectUnitsId
                  }
                />
              </div>
              <div className="min-w-0 flex-1 md:basis-[18%] md:flex-none">
                <Select
                  label="Teaching Method"
                  variant="standard"
                  value={teachingMethodCatdetId}
                  onChange={(v) => setTeachingMethodCatdetId(v)}
                  options={methodOptions}
                  searchable
                  clearable
                  placeholder="Teaching Method"
                  disabled={attendanceAlreadyMarked || mode === "view"}
                />
              </div>
              {/* Percentage — Material underline number input */}
              <div className="flex min-w-0 flex-col gap-1 md:basis-[12%] md:flex-none">
                <label
                  htmlFor="lesson-percentage"
                  className="text-[14px] font-medium leading-none text-[hsl(var(--foreground))]"
                >
                  Percentage
                </label>
                <input
                  id="lesson-percentage"
                  type="number"
                  step="any"
                  min={0}
                  max={100}
                  value={percentage}
                  onChange={(e) => setPercentage(e.target.value)}
                  disabled={attendanceAlreadyMarked || mode === "view"}
                  placeholder=" "
                  className="h-9 w-full border-0 border-b border-[rgba(0,0,0,0.42)] bg-transparent px-0 text-sm text-black outline-none placeholder:text-transparent focus:border-b-2 focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
            </div>

            {/* Image 2: Comments — outlined Material field */}
            <div className="relative pt-2">
              <label
                htmlFor="lesson-comments"
                className="absolute left-3 top-0 z-[1] bg-card px-1 text-[14px] font-medium text-[hsl(var(--foreground))]"
              >
                Comments
              </label>
              <textarea
                id="lesson-comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                disabled={attendanceAlreadyMarked || mode === "view"}
                rows={3}
                className="min-h-[88px] w-full resize-y rounded-[4px] border border-[rgba(0,0,0,0.38)] bg-transparent px-3 pb-2 pt-3 text-sm text-black outline-none focus:border-2 focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
            {/* Image 1: Choose file + Class Notes Video Link — light-blue box */}
            <div className="mx-3 mt-0 rounded-[2px] bg-white px-0 py-0">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-10">
                <div className="shrink-0">
                  {/* Native browser Choose file button (Angular #classNotesAvatar) */}
                  <input
                    ref={classNotesInputRef}
                    type="file"
                    accept=".png, .jpg, .jpeg, .pdf, .doc"
                    className="h-auto w-auto max-w-full cursor-pointer border-0 bg-transparent p-0 text-[13px] font-normal text-black shadow-none [appearance:auto] file:me-2 file:inline-block file:h-auto file:cursor-pointer file:rounded-[2px] file:border file:border-solid file:border-[#767676] file:bg-[#efefef] file:px-2.5 file:py-[3px] file:text-[13px] file:font-normal file:text-black file:shadow-none"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <input
                    id="class-notes-video"
                    type="text"
                    value={videoPath}
                    onChange={(e) => setVideoPath(e.target.value)}
                    placeholder="Class Notes Video Link"
                    className="h-10 w-full border-0 border-b border-[rgba(0,0,0,0.42)] bg-transparent px-0 text-sm text-black outline-none placeholder:text-[rgba(0,0,0,0.54)] focus:border-b-2 focus:border-primary"
                  />
                </div>
              </div>
              {notesPath ? (
                <p className="m-0 mt-3 border-0 p-0">
                  <a
                    href={notesPath}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm underline"
                    style={{ color: "blue" }}
                  >
                    View Class Notes
                  </a>
                </p>
              ) : null}
            </div>
          </div>
        </AngularFilterCard>
      ) : null}

      {flag ? (
        <div
          className="px-1 text-sm font-semibold text-destructive"
          role="status"
        >
          {attendanceAlreadyMarked
            ? "Already attendance is marked, To update the attendance please contact HOD."
            : "Attendance Not Marked."}
        </div>
      ) : null}

      {flag && rows.length > 0 ? (
        <DataTable<StudentRow>
          title={`Attendance - ${attendanceHeader}`}
          titleIcon="book"
          bordered
          contentCollapsible={false}
          rowData={rows}
          columnDefs={attendanceColumnDefs}
          autoHeight={true}
          pagination={true}
          getRowId={(p) => String(p.data?.studentId ?? "")}
          toolbar={{
            search: true,
            searchPlaceholder: "Search",
            searchFields: ["rollNumber", "admissionNumber", "firstName"],
            columnPicker: false,
            exportExcel: false,
            exportPdf: false,
            columnFilters: false,
          }}
          toolbarTrailing={
            <span className="text-[15px] font-normal text-black">
              Total Students: {rows.length}
            </span>
          }
          rightRailCols={3}
          rightRail={absenteesRail}
        />
      ) : null}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (fromAttendanceUpdate) {
              const empId = searchParams.get("employeeId");
              if (empId) {
                const qs = new URLSearchParams();
                const dayParam = searchParams.get("day");
                const empName = searchParams.get("empName");
                if (dayParam) qs.set("day", dayParam);
                else if (day) qs.set("day", format(day, "yyyy-MM-dd"));
                if (empName) qs.set("empName", empName);
                qs.set("employeeId", empId);
                router.push(`/attendance-management/mark-attendance?${qs}`);
                return;
              }
            }
            router.back();
          }}
        >
          Back
        </Button>
        {flag && rows.length > 0 && canSaveAttendance ? (
          <Button type="button" onClick={openAttendancePreview}>
            Save Attendance
          </Button>
        ) : null}
      </div>

      <AttendancePreviewModal
        open={previewOpen}
        onClose={() => {
          if (saving) return;
          setPreviewOpen(false);
          setPendingPayload(null);
        }}
        onSave={() => void confirmSaveAttendance()}
        isSaving={saving}
        date={day}
        collegeLine={collegeLine}
        courseLine={previewCourseLine}
        subjectName={previewSubjectName}
        periods={previewPeriods}
        absentees={absentees}
      />
    </FilteredPage>
  );
}
