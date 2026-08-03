"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { DatePicker } from "@/common/components/date-picker";
import { Select } from "@/common/components/select";
import { FilteredPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { rowIndexGetter } from "@/lib/utils";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import {
  formatClassDateYmdSlash,
  getStudentAttendanceLessonDetails,
  listPeriodsForClassAttendance,
  listStudentsForSubjectAttendance,
  listStudentsForViewAttendance,
  loadViewAttendanceForPeriod,
  periodOptionLabel,
  tConvert,
  type AttendanceAbsentRow,
  type PeriodRow,
} from "@/services";
import { DataTable } from "@/common/components/table";

type StudentRow = Record<string, unknown>;

/** Angular `isEmptyObject` — empty `{}` / `[]` means attendance not marked. */
function isLessonMarked(lesson: unknown): boolean {
  if (lesson == null || lesson === "") return false;
  if (Array.isArray(lesson)) return lesson.length > 0;
  if (typeof lesson === "object")
    return Object.keys(lesson as object).length > 0;
  return true;
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
      <span className="text-muted-foreground font-medium">{label} :</span>
      <span className="text-primary font-medium">{value || "—"}</span>
    </div>
  );
}

function statusRenderer(p: ICellRendererParams<AttendanceAbsentRow>) {
  const absent = Boolean(p.data?.isAbsent);
  return (
    <span
      className={
        absent
          ? "text-destructive font-semibold"
          : "text-emerald-600 font-semibold"
      }
    >
      {absent ? "A" : "P"}
    </span>
  );
}

/**
 * Angular `staff-classes/my-classes/View-attendance` —
 * info card + Date/Peroids, then absentees table after period select.
 */
export function ViewStudentAttendancePage() {
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
  const isElective = subjectType.toUpperCase() === "ELECTIVE";

  const [day, setDay] = useState<Date | null>(() =>
    parseDayParam(searchParams.get("day")),
  );
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [periods, setPeriods] = useState<PeriodRow[]>([]);
  const [classTimingId, setClassTimingId] = useState<number | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodRow | null>(null);
  const [absentees, setAbsentees] = useState<AttendanceAbsentRow[]>([]);
  const [flag, setFlag] = useState(false);
  const [lessonLoaded, setLessonLoaded] = useState(false);
  const [hasLesson, setHasLesson] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingPeriods, setLoadingPeriods] = useState(false);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [isAssignedProxy, setIsAssignedProxy] = useState(false);

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

  const loadStudents = useCallback(async () => {
    if (!collegeId || !courseGroupId || !groupSectionId) return;
    setLoadingStudents(true);
    try {
      const list = await listStudentsForViewAttendance({
        collegeId,
        courseGroupId,
        groupSectionId,
      });
      setStudents(list);
      if (list.length === 0) toastSuccess("No Record(s) found.");
    } catch (e) {
      toastError(getErrorMessage(e));
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  }, [collegeId, courseGroupId, groupSectionId]);

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
      setSelectedPeriod(null);
      setAbsentees([]);
      setFlag(false);
      setLessonLoaded(false);
      setHasLesson(false);
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
    void loadStudents();
  }, [loadStudents]);

  useEffect(() => {
    if (day) void loadPeriods(day);
  }, [day, loadPeriods]);

  const periodOptions = useMemo(() => {
    if (periods.length === 0) {
      return [
        {
          value: "__none__",
          label: "No periods are assigned for today.",
          disabled: true,
        },
      ];
    }
    const batchName = searchParams.get("batchName") ?? undefined;
    return periods.map((p) => ({
      value: String(p.classTimingId),
      label: periodOptionLabel(p, isLab ? (batchName ?? undefined) : undefined),
    }));
  }, [periods, searchParams, isLab]);

  async function onPeriodChange(value: string | null) {
    const id = value && value !== "__none__" ? Number(value) : null;
    setClassTimingId(id);
    setAbsentees([]);
    setFlag(false);
    setLessonLoaded(false);
    setHasLesson(false);

    if (!id || !day) {
      setSelectedPeriod(null);
      setIsAssignedProxy(false);
      return;
    }

    const period = periods.find((p) => Number(p.classTimingId) === id) ?? null;
    setSelectedPeriod(period);
    if (!period) return;

    const proxies = period.staffProxies ?? [];
    if (proxies.length > 0) {
      setIsAssignedProxy(true);
      toastInfo(
        `Note : This schedule is already assigned to ${String(proxies[0]?.proxyFirstName ?? "")} (${String(proxies[0]?.subjectName ?? "")} / ${String(proxies[0]?.proxySubjecttypeDisplayName ?? "")}).`,
      );
      return;
    }
    setIsAssignedProxy(false);

    const subjectFromPeriod = Number(
      period.subjectResource?.[0]?.subjectId ?? subjectId,
    );
    const timetableScheduleId = Number(period.timetableScheduleId ?? 0);
    if (!subjectFromPeriod || !timetableScheduleId) {
      toastError("Period schedule incomplete");
      return;
    }

    setLoadingAttendance(true);
    try {
      const resource = period.subjectResource?.[0];
      const typeCode = String(
        resource?.subjectTypeCode ?? subjectType,
      ).toUpperCase();
      const batchId =
        Number(resource?.studentBatchId ?? studentbatchId ?? 0) || null;

      // Angular LAB/ELECTIVE replaces section students via studentsubjectsattendancelist
      let periodStudents = students;
      if (
        (typeCode === "LAB" && batchId) ||
        typeCode === "ELECTIVE" ||
        isLab ||
        isElective
      ) {
        periodStudents = await listStudentsForSubjectAttendance({
          collegeId,
          academicYearId,
          courseGroupId,
          courseYearId,
          groupSectionId,
          regulationId,
          subjectId: subjectFromPeriod,
          studentbatchId: typeCode === "LAB" || isLab ? batchId : null,
        });
        setStudents(periodStudents);
      }

      const attendanceDate = formatClassDateYmdSlash(day);
      const [result, lesson] = await Promise.all([
        loadViewAttendanceForPeriod({
          collegeId,
          groupSectionId,
          subjectId: subjectFromPeriod,
          attendanceDate,
          timetableScheduleId,
          students: periodStudents,
          studentbatchId: batchId,
          isLab: typeCode === "LAB" || isLab,
        }),
        getStudentAttendanceLessonDetails({
          timetableScheduleId,
          attendanceDate,
          employeeId,
        }),
      ]);
      setAbsentees(result.absentees);
      setFlag(true);
      setLessonLoaded(true);
      setHasLesson(isLessonMarked(lesson));
    } catch (e) {
      toastError(getErrorMessage(e));
    } finally {
      setLoadingAttendance(false);
    }
  }

  const columnDefs = useMemo<ColDef<AttendanceAbsentRow>[]>(
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
      { field: "firstName", headerName: "Student Name", minWidth: 160 },
      {
        headerName: "Status",
        width: 90,
        flex: 0,
        cellRenderer: statusRenderer,
      },
      {
        field: "ettlDevicesName",
        headerName: "Device Name",
        minWidth: 120,
      },
      {
        field: "devicelogTime",
        headerName: "Device Log Time",
        minWidth: 130,
      },
      {
        field: "devicelogStatusCatDetCode",
        headerName: "Device Status",
        minWidth: 120,
      },
    ],
    [],
  );

  const showTable = flag && absentees.length > 0 && !isAssignedProxy;
  // Angular: isEmptyObject(lessonStatus) && flag
  const showNotMarked =
    flag &&
    lessonLoaded &&
    !hasLesson &&
    Boolean(classTimingId) &&
    !isAssignedProxy;
  // Angular: abs.length === 0 && classTimingId && !isAssignedProxy && !isEmptyObject(lessonStatus)
  const showNoAbsentees =
    flag &&
    absentees.length === 0 &&
    Boolean(classTimingId) &&
    !isAssignedProxy &&
    hasLesson;

  const attendanceHeader = useMemo(() => {
    const parts = [
      searchParams.get("collegeCode"),
      searchParams.get("academicYear"),
      searchParams.get("groupName"),
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

  return (
    <FilteredPage
      title="View Student Attendance"
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
              label="Date *"
              value={day}
              onChange={setDay}
              clearable={false}
              maxDate={new Date()}
              className="w-[180px] shrink-0"
            />
            <Select
              label="Peroids *"
              value={classTimingId ? String(classTimingId) : null}
              onChange={(v) => void onPeriodChange(v)}
              options={periodOptions}
              searchable
              isLoading={loadingPeriods || loadingStudents}
              placeholder="Peroids"
              className="w-full max-w-[min(100%,22rem)] sm:w-[min(40%,22rem)]"
            />
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

          {showNotMarked ? (
            <p className="text-sm font-semibold text-destructive text-center py-1">
              Attendance Not Marked.
            </p>
          ) : null}
          {showNoAbsentees ? (
            <p className="text-sm font-semibold text-destructive text-center py-1">
              No Absentees Found For This Date.
            </p>
          ) : null}
        </div>
      }
      body={
        showTable ? (
          <div className="space-y-2 pt-2">
            <p className="text-sm font-semibold text-[hsl(var(--card-title))]">
              Attendance -{" "}
              <span className="font-normal text-muted-foreground">
                {attendanceHeader}
              </span>
            </p>
            <DataTable
              title=""
              rowData={absentees}
              columnDefs={columnDefs}
              loading={loadingAttendance}
              pagination
              height="auto"
              toolbar={{
                search: true,
                searchPlaceholder: "Search",
                exportExcel: true,
                exportPdf: true,
              }}
              toolbarTrailing={
                <span className="text-sm text-muted-foreground">
                  Total Students: {absentees.length}
                </span>
              }
            />
          </div>
        ) : loadingAttendance ? (
          <p className="text-sm text-muted-foreground py-4">
            Loading attendance…
          </p>
        ) : null
      }
      bodyClassName="border-t-0"
    >
      <div className="flex justify-end">
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
      </div>
    </FilteredPage>
  );
}
