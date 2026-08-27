"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { ChevronDown, Timer } from "lucide-react";
import { DatePicker } from "@/common/components/date-picker";
import { MultiSelect, Select } from "@/common/components/select";
import { FilteredPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { GM_CODES } from "@/config/constants/ui";
import { useSession } from "@/hooks/useSession";
import { cn } from "@/lib/utils";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import {
  buildLessonStatusPayloadFromTopicRow,
  buildMarkAttendanceSavePayload,
  formatScheduleDateYmd,
  getLessonStatusScheduleMeta,
  isAttendanceAlreadyMarked,
  LESSON_STATUS_COMPLETED_ID,
  LESSON_STATUS_IN_PROGRESS_ID,
  listGeneralDetailsByCode,
  listLessonStatusSubjectUnitTopics,
  listMarkAttendanceHolidayEvents,
  listPeriodsForClassAttendance,
  listStudentsForMarkAttendance,
  listStudentsForSubjectAttendance,
  periodOptionLabel,
  refreshAfterMarkAttendanceSave,
  saveLessonStatusList,
  saveStudentAttendanceDetails,
  tConvert,
  uploadClassNotesForAttendance,
  type LessonStatusPayloadItem,
  type MarkAttendanceHolidayEvent,
  type MarkAttendanceSaveItem,
  type PeriodRow,
  type SubjectUnitTopicLessonRow,
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

function UnitTopicsAccordion({
  title,
  children,
  defaultOpen = false,
}: Readonly<{
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}>) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="app-data-table app-data-table-card flex flex-col">
      <button
        type="button"
        className="flex w-full items-center justify-between px-5 py-3 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? (
        <div className="px-5 pb-4 overflow-x-auto">{children}</div>
      ) : null}
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
  const { user } = useSession();
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

  const organizationId = Number(
    user?.organizationId ??
      (typeof window !== "undefined"
        ? localStorage.getItem("organizationId")
        : 0) ??
      0,
  );
  const loginEmployeeId = Number(
    user?.employeeId ??
      (typeof window !== "undefined"
        ? localStorage.getItem("employeeId")
        : 0) ??
      employeeId ??
      0,
  );

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

  const [pendingTopics, setPendingTopics] = useState<
    SubjectUnitTopicLessonRow[]
  >([]);
  const [completedTopics, setCompletedTopics] = useState<
    SubjectUnitTopicLessonRow[]
  >([]);
  const [methodOptions, setMethodOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [lessonPayloadList, setLessonPayloadList] = useState<
    LessonStatusPayloadItem[]
  >([]);
  const [attendanceAlreadyMarked, setAttendanceAlreadyMarked] = useState(false);
  const [notesPath, setNotesPath] = useState("");
  const [actualClsScheduleId, setActualClsScheduleId] = useState<number | null>(
    null,
  );

  const [markAllChecked, setMarkAllChecked] = useState(true);
  const [studentFilter, setStudentFilter] = useState("");
  const [videoPath, setVideoPath] = useState("");
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<
    MarkAttendanceSaveItem[] | null
  >(null);
  /** Angular `#classNotesAvatar` — read files on Save, not only from React state. */
  const classNotesInputRef = useRef<HTMLInputElement>(null);

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
    setPendingTopics([]);
    setCompletedTopics([]);
    setLessonPayloadList([]);
    setAttendanceAlreadyMarked(false);
    setNotesPath("");
    setActualClsScheduleId(null);
    setVideoPath("");
    setStudentFilter("");
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

  useEffect(() => {
    void (async () => {
      try {
        const methods = await listGeneralDetailsByCode(
          GM_CODES.TEACHING_METHODOLOGY,
        );
        setMethodOptions(
          methods.map((m) => ({
            value: String(m.generalDetailId ?? ""),
            label: String(
              m.generalDetailDisplayName ?? m.generalDetailName ?? "",
            ),
          })),
        );
      } catch {
        setMethodOptions([]);
      }
    })();
  }, []);

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

  function upsertLessonPayload(row: SubjectUnitTopicLessonRow) {
    if (!day || selectedPeriodIds.length === 0) return;
    const pct = Number(row.Percentage);
    if (!Number.isFinite(pct) || pct === 0) return;
    if (pct > 100) {
      toastInfo("Percentage Should not be greater than 100");
      setPendingTopics((prev) =>
        prev.map((r) =>
          Number(r.subjectUnitTopicId) === Number(row.subjectUnitTopicId)
            ? { ...r, Percentage: 0 }
            : r,
        ),
      );
      return;
    }
    if (pct < 0) {
      toastInfo("Percentage Should not be in negative");
      setPendingTopics((prev) =>
        prev.map((r) =>
          Number(r.subjectUnitTopicId) === Number(row.subjectUnitTopicId)
            ? { ...r, Percentage: 0 }
            : r,
        ),
      );
      return;
    }

    const statusId =
      pct === 100 ? LESSON_STATUS_COMPLETED_ID : LESSON_STATUS_IN_PROGRESS_ID;
    const updatedRow: SubjectUnitTopicLessonRow = {
      ...row,
      Percentage: pct,
      fk_lessonstatus_catdet_id: statusId,
    };
    setPendingTopics((prev) =>
      prev.map((r) =>
        Number(r.subjectUnitTopicId) === Number(row.subjectUnitTopicId)
          ? updatedRow
          : r,
      ),
    );

    const resource = selectedPeriod?.subjectResource?.[0];
    const payload = buildLessonStatusPayloadFromTopicRow({
      row: updatedRow,
      day,
      collegeId,
      academicYearId,
      groupSectionId,
      actualClsScheduleId,
      subjectResourceId:
        resource?.subjectResourceId != null
          ? Number(resource.subjectResourceId)
          : null,
      timetableScheduleId: selectedPeriodIds[0]!,
    });
    if (!payload) return;
    setLessonPayloadList((prev) => [...prev, payload]);
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

      const topics = await listLessonStatusSubjectUnitTopics({
        organizationId,
        employeeId: loginEmployeeId || employeeId,
        timetableScheduleId,
      });
      setPendingTopics(topics.pending);
      setCompletedTopics(topics.completed);
      setLessonPayloadList([]);

      setRows(merged);
      setMarkAllChecked(merged.every((r) => r.checked !== false));
      setStudentFilter("");
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
      subjectUnitsId: null,
      subjectUnitTopicId: null,
      teachingMethodCatdetId: null,
      comments: "",
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

      try {
        await saveLessonStatusList(lessonPayloadList);
      } catch {
        // Angular continues even when lesson list fails
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

      const topics = await listLessonStatusSubjectUnitTopics({
        organizationId,
        employeeId: loginEmployeeId || employeeId,
        timetableScheduleId,
      });
      setPendingTopics(topics.pending);
      setCompletedTopics(topics.completed);
      setLessonPayloadList([]);
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

  const filteredRows = useMemo(() => {
    const q = studentFilter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const roll = String(
        r.rollNumber ?? r.admissionNumber ?? "",
      ).toLowerCase();
      const name = String(r.firstName ?? "").toLowerCase();
      return roll.includes(q) || name.includes(q);
    });
  }, [rows, studentFilter]);

  const canEditAttendance = mode === "mark";
  /** Angular: Save only when `isEmptyObject(lessonStatus)`. */
  const canSaveAttendance = mode === "mark" && !attendanceAlreadyMarked;

  function toggleMarkAll() {
    if (!canEditAttendance) return;
    // Angular markItems(): if check (all marked / UnMark All) → unmark all;
    // else Mark All → mark all present.
    const unmarkAll = markAllChecked;
    setMarkAllChecked(!unmarkAll);
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        checked: !unmarkAll,
        isPresent: !unmarkAll,
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
      {pendingTopics.length > 0 ? (
        <UnitTopicsAccordion title="Not Started / In Progress Unit Topics">
          <table className="w-full min-w-[720px] border-collapse text-sm text-black">
            <thead>
              <tr className="bg-[#ffcf46] text-center">
                <th className="border border-black px-2 py-1">Class Date</th>
                <th className="border border-black px-2 py-1">Subject</th>
                <th className="border border-black px-2 py-1">Unit</th>
                <th className="border border-black px-2 py-1">Topic Name</th>
                <th className="border border-black px-2 py-1">
                  Teaching Method
                </th>
                <th className="border border-black px-2 py-1">Lesson Status</th>
                <th className="border border-black px-2 py-1">Percentage</th>
              </tr>
            </thead>
            <tbody>
              {pendingTopics.map((row, idx) => {
                const statusId = Number(row.fk_lessonstatus_catdet_id);
                const statusLabel =
                  statusId === LESSON_STATUS_COMPLETED_ID
                    ? "Completed"
                    : "In Progress";
                return (
                  <tr
                    key={`${row.subjectUnitTopicId}-${idx}`}
                    className="text-center"
                  >
                    <td className="border border-black px-2 py-1">
                      {String(row.class_date ?? "")}
                    </td>
                    <td className="border border-black px-2 py-1">
                      {String(row.subject_name ?? "")} (
                      {String(row.subject_code ?? "")})
                    </td>
                    <td className="border border-black px-2 py-1">
                      {String(row.unit_code ?? "")}
                    </td>
                    <td className="border border-black px-2 py-1 text-left">
                      {String(row.topic_name ?? "")}
                    </td>
                    <td className="border border-black px-2 py-1">
                      <Select
                        value={
                          row.fk_teaching_method_catdet_id != null
                            ? String(row.fk_teaching_method_catdet_id)
                            : null
                        }
                        onChange={(v) => {
                          const next = {
                            ...row,
                            fk_teaching_method_catdet_id: v ? Number(v) : null,
                          };
                          setPendingTopics((prev) =>
                            prev.map((r, i) => (i === idx ? next : r)),
                          );
                          upsertLessonPayload(next);
                        }}
                        options={methodOptions}
                        searchable
                        placeholder="Select"
                        className="min-w-[120px]"
                      />
                    </td>
                    <td className="border border-black px-2 py-1">
                      {statusLabel}
                    </td>
                    <td className="border border-black px-2 py-1">
                      <input
                        type="number"
                        step="any"
                        min={1}
                        className="app-control h-8 w-20 rounded-md border bg-white px-2 text-sm text-center"
                        value={
                          row.Percentage === "" || row.Percentage == null
                            ? ""
                            : String(row.Percentage)
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          setPendingTopics((prev) =>
                            prev.map((r, i) =>
                              i === idx
                                ? {
                                    ...r,
                                    Percentage: val === "" ? "" : Number(val),
                                  }
                                : r,
                            ),
                          );
                        }}
                        onBlur={() => upsertLessonPayload(pendingTopics[idx]!)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </UnitTopicsAccordion>
      ) : null}

      {completedTopics.length > 0 ? (
        <UnitTopicsAccordion title="History Unit Topics" defaultOpen={false}>
          <table className="w-full min-w-[720px] border-collapse text-sm text-black">
            <thead>
              <tr className="bg-[#ffcf46] text-center">
                <th className="border border-black px-2 py-1">Class Date</th>
                <th className="border border-black px-2 py-1">Subject</th>
                <th className="border border-black px-2 py-1">Unit</th>
                <th className="border border-black px-2 py-1">Topic Name</th>
                <th className="border border-black px-2 py-1">
                  Teaching Method
                </th>
                <th className="border border-black px-2 py-1">Lesson Status</th>
                <th className="border border-black px-2 py-1">Percentage</th>
              </tr>
            </thead>
            <tbody>
              {completedTopics.map((row, idx) => (
                <tr
                  key={`hist-${row.subjectUnitTopicId}-${idx}`}
                  className="text-center"
                >
                  <td className="border border-black px-2 py-1">
                    {String(row.class_date ?? "")}
                  </td>
                  <td className="border border-black px-2 py-1">
                    {String(row.subject_name ?? "")}(
                    {String(row.subject_code ?? "")})
                  </td>
                  <td className="border border-black px-2 py-1">
                    {String(row.unit_code ?? "")}
                  </td>
                  <td className="border border-black px-2 py-1 text-left">
                    {String(row.topic_name ?? "")}
                  </td>
                  <td className="border border-black px-2 py-1">
                    {String(row.teaching_method_code ?? "")}
                  </td>
                  <td className="border border-black px-2 py-1">
                    {String(row.lesson_status_code ?? "")}
                  </td>
                  <td className="border border-black px-2 py-1">
                    {String(row.Percentage ?? "")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </UnitTopicsAccordion>
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
        <div className="space-y-3 bg-[#fff]">
          {/* Angular page-table-head + gold underline */}
          <div className="mx-3 border-b-2 border-[#ffcf46] pb-2">
            <div className="flex items-center gap-2">
              <Timer
                className="h-[18px] w-[18px] shrink-0 text-[hsl(var(--card-title))]"
                aria-hidden
              />
              <strong className="text-[15px] font-semibold leading-snug text-[hsl(var(--card-title))]">
                Attendance -{" "}
                <span className="font-medium">{attendanceHeader}</span>
              </strong>
            </div>
          </div>

          <div className="relative px-3 pt-1">
            <div className="mb-1 w-full max-w-[20%]">
              {/* Angular mat-form-field floatLabel="never" Search */}
              <input
                type="search"
                value={studentFilter}
                onChange={(e) => setStudentFilter(e.target.value)}
                placeholder="Search"
                className="h-9 w-full border-0 border-b border-[rgba(0,0,0,0.42)] bg-transparent px-0 text-sm text-black outline-none placeholder:text-muted-foreground focus:border-b-2 focus:border-primary"
              />
            </div>
            <span className="absolute right-3 top-[10px] text-[15px] font-normal text-black">
              Total Students: {rows.length}
            </span>
          </div>

          {/* Angular: fxFlex 70% table + 30% absentees */}
          <div className="flex flex-col gap-0 px-3 lg:flex-row">
            <div className="min-w-0 flex-1 lg:basis-[70%] lg:flex-none">
              <div
                className="mat-table-shell mat-elevation-z8 overflow-auto bg-white"
                style={{ height: 450 }}
              >
                <table className="mat-table">
                  <thead className="sticky top-0 z-10">
                    <tr className="mat-header-row">
                      <th className="mat-header-cell px-3 py-1.5 text-left whitespace-nowrap w-[70px] !bg-[#c3d9ff]">
                        SI.No
                      </th>
                      <th className="mat-header-cell px-3 py-1.5 text-left whitespace-nowrap w-[120px] !bg-[#c3d9ff]">
                        Roll No.
                      </th>
                      <th className="mat-header-cell px-3 py-1.5 text-left !bg-[#c3d9ff]">
                        Student Name
                      </th>
                      <th className="mat-header-cell px-3 py-1.5 text-left whitespace-nowrap w-[160px] !bg-[#c3d9ff]">
                        {canEditAttendance ? (
                          <label
                            className="inline-flex cursor-pointer items-center gap-2 text-[15px] font-medium text-black"
                            onClick={(e) => {
                              e.preventDefault();
                              toggleMarkAll();
                            }}
                          >
                            <Checkbox
                              checked={markAllChecked}
                              tabIndex={-1}
                              aria-label={
                                markAllChecked ? "UnMark All" : "Mark All"
                              }
                            />
                            <span>
                              {markAllChecked ? "UnMark All" : "Mark All"}
                            </span>
                          </label>
                        ) : (
                          "Status"
                        )}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row, index) => {
                      const present =
                        row.checked !== false && row.isPresent !== false;
                      const sid = Number(row.studentId ?? 0);
                      return (
                        <tr
                          key={String(row.studentId ?? index)}
                          className="mat-row"
                        >
                          <td className="mat-cell px-3 py-1.5 text-center whitespace-nowrap">
                            {rows.indexOf(row) + 1}
                          </td>
                          <td className="mat-cell px-3 py-1.5 whitespace-nowrap">
                            {String(
                              row.rollNumber ?? row.admissionNumber ?? "",
                            )}
                          </td>
                          <td className="mat-cell px-3 py-1.5 uppercase">
                            {String(row.firstName ?? "")}
                          </td>
                          <td className="mat-cell px-3 py-1.5">
                            {canEditAttendance ? (
                              <label className="inline-flex cursor-pointer items-center gap-2">
                                <Checkbox
                                  checked={present}
                                  onCheckedChange={(v) =>
                                    toggleStudentPresent(sid, v === true)
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
                            ) : (
                              <span
                                className={cn(
                                  "text-sm font-medium",
                                  present ? "text-[#00c300]" : "text-red-600",
                                )}
                              >
                                {present ? "Present" : "Absent"}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {filteredRows.length === 0 ? (
                      <tr className="mat-row">
                        <td
                          colSpan={4}
                          className="mat-cell px-3 py-8 text-center text-muted-foreground"
                        >
                          No students match the search.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-4 w-full lg:mt-0 lg:basis-[30%] lg:flex-none lg:pl-5">
              <div className="overflow-hidden border border-[#c3d9ff] bg-white shadow-sm">
                <h3 className="m-0 border border-[#c3d9ff] bg-[#ecf3ff] px-3 py-[11px] text-center text-sm font-medium uppercase tracking-wide text-black">
                  Absentees
                  <span className="float-right font-semibold">
                    {absentees.length}
                  </span>
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
            </div>
          </div>

          {/* Angular .pay-1 — 7px #c3d9ff border; file ~30% + video ~50% */}
          <div
            className="mx-3 mt-2.5 rounded-[3px] bg-white p-[5px]"
            style={{ border: "7px solid #c3d9ff" }}
          >
            <div className="flex flex-col flex-wrap sm:flex-row sm:items-center">
              <div className="w-full p-2 sm:w-[30%]">
                {/* Angular: <input type="file" accept=".png, .jpg, .jpeg, .pdf, .doc" #classNotesAvatar> */}
                <input
                  ref={classNotesInputRef}
                  type="file"
                  accept=".png, .jpg, .jpeg, .pdf, .doc"
                  className="block w-full cursor-pointer text-sm text-black"
                />
              </div>
              <div className="w-full p-2 sm:w-[50%]">
                {/* Angular matInput placeholder="Class Notes Video Link" */}
                <input
                  id="class-notes-video"
                  type="text"
                  value={videoPath}
                  onChange={(e) => setVideoPath(e.target.value)}
                  placeholder="Class Notes Video Link"
                  className="h-10 w-full border-0 border-b border-[rgba(0,0,0,0.42)] bg-transparent px-0 text-sm text-black outline-none placeholder:text-muted-foreground focus:border-b-2 focus:border-primary"
                />
              </div>
            </div>
            {notesPath ? (
              <p className="m-0 border-0 px-2 py-1">
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
