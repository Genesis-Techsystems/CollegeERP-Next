"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { DatePicker } from "@/common/components/date-picker";
import { Select } from "@/common/components/select";
import { DataTable } from "@/common/components/table";
import { FilteredPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { GM_CODES } from "@/config/constants/ui";
import { rowIndexGetter } from "@/lib/utils";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import {
  buildMarkAttendanceSavePayload,
  formatScheduleDateYmd,
  listGeneralDetailsByCode,
  listPeriodsForClassAttendance,
  listStudentsForMarkAttendance,
  listStudentsForSubjectAttendance,
  listSubjectUnitTopicsForMarkAttendance,
  listSubjectUnitsForMarkAttendance,
  periodOptionLabel,
  refreshAfterMarkAttendanceSave,
  saveLessonStatusList,
  saveStudentAttendanceDetails,
  tConvert,
  uploadClassNotesForAttendance,
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
      <span className="text-muted-foreground font-medium">{label} :</span>
      <span className="text-primary font-medium">{value || "—"}</span>
    </div>
  );
}

/**
 * Angular `staff-classes/my-classes/mark-attendance` —
 * info card + Day/Peroids/Search + Lesson Status, then students after Search.
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

  const [unitId, setUnitId] = useState<string | null>(null);
  const [topicId, setTopicId] = useState<string | null>(null);
  const [methodId, setMethodId] = useState<string | null>(null);
  const [comments, setComments] = useState("");
  const [unitOptions, setUnitOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [topicOptions, setTopicOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [methodOptions, setMethodOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [markAllChecked, setMarkAllChecked] = useState(true);
  const [videoPath, setVideoPath] = useState("");
  const [classNotesFile, setClassNotesFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<
    MarkAttendanceSaveItem[] | null
  >(null);

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

  const loadPeriods = useCallback(
    async (date: Date) => {
      if (
        !collegeId ||
        !academicYearId ||
        !employeeId ||
        !groupSectionId ||
        !subjectId
      ) {
        setPeriods([]);
        return;
      }
      setLoadingPeriods(true);
      setClassTimingId(null);
      setSelectedPeriodIds([]);
      setSelectedPeriod(null);
      setRows([]);
      setFlag(false);
      setIsAssignedProxy(false);
      try {
        const list = await listPeriodsForClassAttendance({
          collegeId,
          academicYearId,
          employeeId,
          groupSectionId,
          subjectId,
          date,
          subjectType,
          studentbatchId,
        });
        setPeriods(list);
      } catch (e) {
        toastError(getErrorMessage(e));
        setPeriods([]);
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
    ],
  );

  useEffect(() => {
    if (day) void loadPeriods(day);
  }, [day, loadPeriods]);

  useEffect(() => {
    void (async () => {
      try {
        const methods = await listGeneralDetailsByCode(
          GM_CODES.TEACHING_METHODOLOGY,
        );
        setMethodOptions([
          { value: "", label: "- None -" },
          ...methods.map((m) => ({
            value: String(m.generalDetailId ?? ""),
            label: String(
              m.generalDetailDisplayName ?? m.generalDetailName ?? "",
            ),
          })),
        ]);
      } catch {
        setMethodOptions([{ value: "", label: "- None -" }]);
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

  function onPeriodSelect(value: string | null) {
    const id = value && value !== "__none__" ? Number(value) : null;
    setFlag(false);
    setRows([]);
    if (isTheory) {
      setClassTimingId(id);
      const period =
        periods.find((p) => Number(p.classTimingId) === id) ?? null;
      setSelectedPeriod(period);
      const proxies = period?.staffProxies ?? [];
      setIsAssignedProxy(proxies.length > 0);
      if (proxies.length > 0) {
        toastInfo(
          `Note : This schedule is already assigned to ${String(proxies[0]?.proxyFirstName ?? "")} (${String(proxies[0]?.subjectName ?? "")} / ${String(proxies[0]?.proxySubjecttypeDisplayName ?? "")}).`,
        );
      }
    } else {
      setSelectedPeriodIds(id ? [id] : []);
      const period =
        periods.find((p) => Number(p.timetableScheduleId) === id) ?? null;
      setSelectedPeriod(period);
      setClassTimingId(
        period?.classTimingId != null ? Number(period.classTimingId) : null,
      );
      const proxies = period?.staffProxies ?? [];
      setIsAssignedProxy(proxies.length > 0);
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

    const period =
      selectedPeriod ??
      (isTheory
        ? periods.find((p) => Number(p.classTimingId) === classTimingId)
        : periods.find(
            (p) => Number(p.timetableScheduleId) === selectedPeriodIds[0],
          )) ??
      null;
    if (!period) {
      toastError("Period schedule incomplete");
      return;
    }
    setSelectedPeriod(period);

    setLoadingSearch(true);
    try {
      const resource = period.subjectResource?.[0];
      const typeCode = String(
        resource?.subjectTypeCode ?? subjectType,
      ).toUpperCase();
      const batchId =
        Number(resource?.studentBatchId ?? studentbatchId ?? 0) || null;

      // Angular LAB/ELECTIVE → studentsubjectsattendancelist; else studentsList
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

      // Angular selectedPeroid merges existing studentabsentlist marks
      const timetableScheduleId = Number(period.timetableScheduleId ?? 0);
      const periodSubjectId = Number(resource?.subjectId ?? subjectId);
      let merged = students;
      if (timetableScheduleId && periodSubjectId) {
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
        merged = refreshed.students as StudentRow[];
        setUnitOptions([
          { value: "", label: "- None -" },
          ...refreshed.units.map((u) => ({
            value: String(u.subjectUnitsId ?? ""),
            label: String(u.unitName ?? u.unitCode ?? ""),
          })),
        ]);
      } else {
        const sid = periodSubjectId;
        if (sid) {
          const units = await listSubjectUnitsForMarkAttendance(sid);
          setUnitOptions([
            { value: "", label: "- None -" },
            ...units.map((u) => ({
              value: String(u.subjectUnitsId ?? ""),
              label: String(u.unitName ?? u.unitCode ?? ""),
            })),
          ]);
        }
      }

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

  async function onUnitChange(value: string | null) {
    setUnitId(value);
    setTopicId(null);
    setTopicOptions([{ value: "", label: "- None -" }]);
    const id = value ? Number(value) : 0;
    if (!id) return;
    try {
      const topics = await listSubjectUnitTopicsForMarkAttendance(id);
      setTopicOptions([
        { value: "", label: "- None -" },
        ...topics.map((t) => ({
          value: String(t.subjectUnitTopicId ?? ""),
          label: String(t.topicName ?? ""),
        })),
      ]);
    } catch {
      setTopicOptions([{ value: "", label: "- None -" }]);
    }
  }

  function openAttendancePreview() {
    if (!day || !selectedPeriod || rows.length === 0) return;

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
      subjectUnitsId: unitId ? Number(unitId) : null,
      subjectUnitTopicId: topicId ? Number(topicId) : null,
      teachingMethodCatdetId: methodId ? Number(methodId) : null,
      comments,
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

    const timetableScheduleId = Number(selectedPeriod.timetableScheduleId ?? 0);
    const periodSubjectId = Number(
      selectedPeriod.subjectResource?.[0]?.subjectId ?? subjectId,
    );

    setSaving(true);
    try {
      // 1) Angular: POST studentattendancedetails
      const result = await saveStudentAttendanceDetails(pendingPayload);
      const scheduleIds = Array.isArray(result.data) ? result.data : [];
      const firstId = scheduleIds[0];

      // 2) Angular: POST uploadclassnotes (when file chosen)
      if (classNotesFile && firstId != null && firstId !== "") {
        await uploadClassNotesForAttendance({
          actualClassScheduleId: firstId as string | number,
          file: classNotesFile,
        });
      }

      // 3) Angular: saveDeatils() → POST addLessonstatusList
      try {
        await saveLessonStatusList([]);
      } catch {
        // Angular still continues even when lesson list is empty / fails
      }

      // 4) Angular: selectedPeroid() refresh APIs
      //    GET studentabsentlist + GET studentattendancedetails + SubjectUnit
      const refreshed = await refreshAfterMarkAttendanceSave({
        collegeId,
        groupSectionId,
        subjectId: periodSubjectId,
        day,
        timetableScheduleId,
        employeeId,
        students: rows,
        subjectType,
        studentbatchId,
      });

      setRows(refreshed.students as StudentRow[]);
      setMarkAllChecked(refreshed.students.every((r) => r.checked !== false));
      setFlag(true);
      setUnitOptions([
        { value: "", label: "- None -" },
        ...refreshed.units.map((u) => ({
          value: String(u.subjectUnitsId ?? ""),
          label: String(u.unitName ?? u.unitCode ?? ""),
        })),
      ]);

      // 5) Angular: clearAllLessonDetails()
      setUnitId(null);
      setTopicId(null);
      setMethodId(null);
      setComments("");
      setVideoPath("");
      setClassNotesFile(null);
      setTopicOptions([{ value: "", label: "- None -" }]);

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

  const columnDefs = useMemo<ColDef<StudentRow>[]>(() => {
    const markRenderer = (p: ICellRendererParams<StudentRow>) => {
      const checked = p.data?.checked !== false && p.data?.isPresent !== false;
      if (mode === "view") {
        return (
          <span
            className={
              checked
                ? "text-emerald-600 font-semibold"
                : "text-destructive font-semibold"
            }
          >
            {checked ? "Present" : "Absent"}
          </span>
        );
      }
      return (
        <label className="inline-flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={checked}
            aria-label="Present"
            onChange={(e) => {
              const present = e.target.checked;
              setRows((prev) => {
                const next = prev.map((r) =>
                  Number(r.studentId) === Number(p.data?.studentId)
                    ? { ...r, isPresent: present, checked: present }
                    : r,
                );
                setMarkAllChecked(next.every((r) => r.checked !== false));
                return next;
              });
            }}
          />
          <span
            className={
              checked
                ? "text-emerald-600 font-semibold"
                : "text-destructive font-semibold"
            }
          >
            {checked ? "Present" : "Absent"}
          </span>
        </label>
      );
    };
    return [
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
      { field: "firstName", headerName: "Student Name", minWidth: 160 },
      {
        headerName: "",
        minWidth: 150,
        flex: 0,
        width: 160,
        cellRenderer: markRenderer,
      },
    ];
  }, [mode]);

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

  const periodSelectValue = isTheory
    ? classTimingId
      ? String(classTimingId)
      : null
    : selectedPeriodIds[0]
      ? String(selectedPeriodIds[0])
      : null;

  return (
    <FilteredPage
      title="Mark Student Attendance"
      filtersCollapsible={false}
      filters={
        <div className="space-y-4">
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
            <Select
              label="Peroids *"
              value={periodSelectValue}
              onChange={onPeriodSelect}
              options={periodOptions}
              searchable
              isLoading={loadingPeriods}
              placeholder="Peroids"
              className="w-full max-w-[min(100%,22rem)] sm:w-[min(40%,22rem)]"
            />
            <Button
              type="button"
              className="shrink-0 mb-0.5"
              disabled={isAssignedProxy || loadingSearch}
              onClick={() => void onSearch()}
            >
              Search
            </Button>
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
      <div className="app-data-table app-data-table-card flex flex-col">
        <div className="app-data-table-heading px-5 pt-5 pb-0">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Lesson Status
          </h2>
        </div>
        <div className="global-filter-bar__inner px-5 pb-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <Select
              label="Unit"
              value={unitId}
              onChange={(v) => void onUnitChange(v)}
              options={
                unitOptions.length
                  ? unitOptions
                  : [{ value: "", label: "- None -" }]
              }
              searchable
              className="md:col-span-4"
            />
            <Select
              label="Topic"
              value={topicId}
              onChange={setTopicId}
              options={
                topicOptions.length
                  ? topicOptions
                  : [{ value: "", label: "- None -" }]
              }
              searchable
              className="md:col-span-4"
            />
            <Select
              label="Teaching Method"
              value={methodId}
              onChange={setMethodId}
              options={
                methodOptions.length
                  ? methodOptions
                  : [{ value: "", label: "- None -" }]
              }
              searchable
              className="md:col-span-4"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Comments</Label>
            <Textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
              placeholder="Comments"
              className="resize-y"
            />
          </div>
        </div>
      </div>

      {flag && rows.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-[hsl(var(--card-title))] px-1">
            Attendance -{" "}
            <span className="font-normal text-muted-foreground">
              {attendanceHeader}
            </span>
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            <div className="lg:col-span-8 xl:col-span-9">
              <DataTable
                title=""
                bordered
                rowData={rows}
                columnDefs={columnDefs}
                loading={loadingSearch}
                pagination={false}
                height="auto"
                toolbar={{
                  search: true,
                  searchPlaceholder: "Search",
                  exportExcel: false,
                  exportPdf: false,
                }}
                toolbarTrailing={
                  <div className="flex items-center gap-3">
                    <label className="inline-flex items-center gap-1.5 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={markAllChecked}
                        onChange={() => {
                          const next = !markAllChecked;
                          setMarkAllChecked(next);
                          setRows((prev) =>
                            prev.map((r) => ({
                              ...r,
                              checked: next,
                              isPresent: next,
                            })),
                          );
                        }}
                      />
                      <span className="font-medium">
                        {markAllChecked ? "UnMark All" : "Mark All"}
                      </span>
                    </label>
                    <span className="text-sm text-muted-foreground">
                      Total Students: {rows.length}
                    </span>
                  </div>
                }
              />
            </div>
            <div className="lg:col-span-4 xl:col-span-3">
              <div className="rounded-sm border bg-card h-full min-h-[200px]">
                <div className="flex items-center justify-between border-b px-3 py-2 bg-muted/40">
                  <h3 className="text-sm font-semibold uppercase tracking-wide">
                    Absentees
                  </h3>
                  <span className="text-sm font-semibold">
                    {absentees.length}
                  </span>
                </div>
                <div className="p-3 space-y-1 max-h-[420px] overflow-y-auto text-sm">
                  {absentees.length === 0 ? (
                    <p className="text-muted-foreground">No absents found.</p>
                  ) : (
                    absentees.map((a) => (
                      <p key={String(a.studentId)}>
                        {String(a.firstName ?? "")} -{" "}
                        {String(a.rollNumber ?? a.admissionNumber ?? "")}
                      </p>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-sm border border-primary/20 bg-primary/5 px-4 py-3 flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Class Notes</Label>
              <input
                type="file"
                accept=".png,.jpg,.jpeg,.pdf,.doc,.docx"
                className="block text-sm"
                onChange={(e) => setClassNotesFile(e.target.files?.[0] ?? null)}
              />
              {classNotesFile ? (
                <p className="text-xs text-muted-foreground">
                  {classNotesFile.name}
                </p>
              ) : null}
            </div>
            <div className="flex-1 min-w-[220px] space-y-1">
              <Label
                className="text-sm font-medium"
                htmlFor="class-notes-video"
              >
                Class Notes Video Link
              </Label>
              <input
                id="class-notes-video"
                type="text"
                value={videoPath}
                onChange={(e) => setVideoPath(e.target.value)}
                placeholder="Class Notes Video Link"
                className="app-control flex h-9 w-full rounded-md border bg-white px-3 text-sm shadow-sm"
              />
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            // Angular attendance-update goBack restores day/empName/employeeId
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
        {flag && rows.length > 0 ? (
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
