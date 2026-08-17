"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Loader2 } from "lucide-react";
import { GlobalFilterField } from "@/common/components/forms";
import { DataTable } from "@/common/components/table";
import { Select, type SelectOption } from "@/common/components/select";
import { FilteredListPage } from "@/components/layout";
import { rowIndexGetter } from "@/lib/utils";
import { toastInfo } from "@/lib/toast";
import {
  fetchAssignResourceTimetableView,
  fetchTimetableFilterRows,
  listStaffProxiesForSection,
  TIMETABLE_CELL_BORDER,
  type AngularStudentTimetable,
  type TimetableDayColumn,
  type TimetableDayTiming,
} from "@/services";
import {
  academicYearsFromFilterRows,
  collegesFromFilterRows,
  courseGroupsFromFilterRows,
  coursesFromFilterRows,
  courseYearsFromFilterRows,
  defaultAcademicYearIdFromRows,
  formatDateHeader,
  num,
  sectionsFromFilterRows,
  text,
  timetablesFromFilterRows,
} from "../_lib/timetable-filters";
import {
  AddResourceDialog,
  type AssignResourceDialogContext,
} from "./AddResourceDialog";
import { TimetableWeeklyGrid } from "./TimetableWeeklyGrid";

type AnyRow = Record<string, unknown>;

const WORKLOAD_COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<AnyRow>,
  proxyFirstName: {
    field: "proxyFirstName",
    headerName: "Proxy Staff",
    minWidth: 130,
  } as ColDef<AnyRow>,
  assignedFirstName: {
    field: "assignedFirstName",
    headerName: "Assigned Staff",
    minWidth: 130,
  } as ColDef<AnyRow>,
  subjectName: { headerName: "Subject", minWidth: 180 } as ColDef<AnyRow>,
  proxyDate: {
    headerName: "Proxy Date",
    minWidth: 110,
    flex: 0,
  } as ColDef<AnyRow>,
  course: { headerName: "Course", minWidth: 220 } as ColDef<AnyRow>,
  startTime: { headerName: "Timing", minWidth: 120, flex: 0 } as ColDef<AnyRow>,
  status: { headerName: "Status", minWidth: 110, flex: 0 } as ColDef<AnyRow>,
};

function subjectRenderer(p: ICellRendererParams<AnyRow>) {
  const name = String(p.data?.subjectName ?? "");
  const type = String(p.data?.proxySubjecttypeDisplayName ?? "");
  return type ? `${name} (${type})` : name;
}

function proxyDateRenderer(p: ICellRendererParams<AnyRow>) {
  return formatDateHeader(p.data?.proxyDate) || "—";
}

function courseRenderer(p: ICellRendererParams<AnyRow>) {
  return [
    p.data?.collegeCode,
    p.data?.courseName,
    p.data?.groupName,
    p.data?.courseYearName,
    p.data?.groupSectionName ? `section ${p.data.groupSectionName}` : "",
  ]
    .filter(Boolean)
    .join("/");
}

function timingRenderer(p: ICellRendererParams<AnyRow>) {
  const start = String(p.data?.startTime ?? "");
  const end = String(p.data?.endTime ?? "");
  return start && end ? `${start} - ${end}` : start || end || "—";
}

function statusRenderer(p: ICellRendererParams<AnyRow>) {
  const status = String(p.data?.processStatusName ?? "").trim();
  if (status === "Accepted")
    return <span className="text-emerald-700">{status}</span>;
  if (status === "Rejected")
    return <span className="text-red-700">{status}</span>;
  return <span className="text-amber-700">{status || "—"}</span>;
}

export function AssignResourceTimetablePage() {
  const [filterRows, setFilterRows] = useState<AnyRow[]>([]);
  const [filtersLoading, setFiltersLoading] = useState(true);

  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null);
  const [courseYearId, setCourseYearId] = useState<number | null>(null);
  const [groupSectionId, setGroupSectionId] = useState<number | null>(null);
  const [timetableId, setTimetableId] = useState<number | null>(null);

  const [gridLoading, setGridLoading] = useState(false);
  const [timetable, setTimetable] = useState<AngularStudentTimetable | null>(
    null,
  );
  const [scheduleTimings, setScheduleTimings] = useState<AnyRow[]>([]);
  const [workloads, setWorkloads] = useState<AnyRow[]>([]);
  const [workloadsLoading, setWorkloadsLoading] = useState(false);

  const [resourceDialogOpen, setResourceDialogOpen] = useState(false);
  const [selectedTiming, setSelectedTiming] =
    useState<TimetableDayTiming | null>(null);
  const [selectedWeekday, setSelectedWeekday] =
    useState<TimetableDayColumn | null>(null);

  useEffect(() => {
    setFiltersLoading(true);
    void fetchTimetableFilterRows("cls_timtable_filters", 0)
      .then((rows) => {
        setFilterRows(rows);
        const colleges = collegesFromFilterRows(rows);
        if (colleges.length === 0) return;
        setCollegeId(num(colleges[0].fk_college_id));
      })
      .finally(() => setFiltersLoading(false));
  }, []);

  useEffect(() => {
    if (!collegeId || filtersLoading) return;
    const ays = academicYearsFromFilterRows(filterRows, collegeId);
    setAcademicYearId(defaultAcademicYearIdFromRows(ays));
  }, [collegeId, filterRows, filtersLoading]);

  const colleges = useMemo(
    () => collegesFromFilterRows(filterRows),
    [filterRows],
  );
  const academicYears = useMemo(
    () => (collegeId ? academicYearsFromFilterRows(filterRows, collegeId) : []),
    [filterRows, collegeId],
  );
  const courses = useMemo(
    () =>
      collegeId && academicYearId
        ? coursesFromFilterRows(filterRows, collegeId, academicYearId)
        : [],
    [filterRows, collegeId, academicYearId],
  );
  const courseGroups = useMemo(
    () =>
      collegeId && academicYearId && courseId
        ? courseGroupsFromFilterRows(
            filterRows,
            collegeId,
            academicYearId,
            courseId,
          )
        : [],
    [filterRows, collegeId, academicYearId, courseId],
  );
  const courseYears = useMemo(
    () =>
      collegeId && academicYearId && courseId && courseGroupId
        ? courseYearsFromFilterRows(
            filterRows,
            collegeId,
            academicYearId,
            courseId,
            courseGroupId,
          )
        : [],
    [filterRows, collegeId, academicYearId, courseId, courseGroupId],
  );
  const sections = useMemo(
    () =>
      collegeId && academicYearId && courseId && courseGroupId && courseYearId
        ? sectionsFromFilterRows(
            filterRows,
            collegeId,
            academicYearId,
            courseId,
            courseGroupId,
            courseYearId,
          )
        : [],
    [
      filterRows,
      collegeId,
      academicYearId,
      courseId,
      courseGroupId,
      courseYearId,
    ],
  );
  const timetables = useMemo(
    () =>
      collegeId && academicYearId && courseId && courseGroupId && groupSectionId
        ? timetablesFromFilterRows(
            filterRows,
            collegeId,
            academicYearId,
            courseId,
            courseGroupId,
            groupSectionId,
          )
        : [],
    [
      filterRows,
      collegeId,
      academicYearId,
      courseId,
      courseGroupId,
      groupSectionId,
    ],
  );

  const toOptions = (
    rows: AnyRow[],
    valueKey: string,
    labelKeys: string[],
  ): SelectOption[] =>
    rows.map((r) => ({
      value: String(r[valueKey]),
      label: text(r, labelKeys) || String(r[valueKey]),
    }));

  const collegeOptions = toOptions(colleges, "fk_college_id", [
    "college_code",
    "collegeCode",
  ]);
  const ayOptions = toOptions(academicYears, "fk_academic_year_id", [
    "academic_year",
    "academicYear",
  ]);
  const courseOptions = toOptions(courses, "fk_course_id", [
    "course_code",
    "courseCode",
  ]);
  const groupOptions = toOptions(courseGroups, "fk_course_group_id", [
    "group_code",
    "groupCode",
  ]);
  const yearOptions = toOptions(courseYears, "fk_course_year_id", [
    "course_year_name",
    "courseYearName",
  ]);
  const sectionOptions = toOptions(sections, "fk_group_section_id", [
    "section",
    "groupSectionName",
  ]);
  const timetableOptions = timetables.map((t) => ({
    value: String(t.pk_timetable_id ?? t.timetableId),
    label: String(t.timetable_name ?? t.timetableName ?? t.pk_timetable_id),
  }));

  const selectedTimetableRow = useMemo(
    () =>
      timetables.find(
        (t) => num(t.pk_timetable_id ?? t.timetableId) === timetableId,
      ) ?? null,
    [timetables, timetableId],
  );

  const clearGrid = useCallback(() => {
    setTimetable(null);
    setScheduleTimings([]);
    setWorkloads([]);
    setGridLoading(false);
    setWorkloadsLoading(false);
  }, []);

  const loadProxies = useCallback(async () => {
    if (!collegeId || !groupSectionId) {
      setWorkloads([]);
      return;
    }
    setWorkloadsLoading(true);
    try {
      const rows = await listStaffProxiesForSection(collegeId, groupSectionId);
      setWorkloads(rows);
    } finally {
      setWorkloadsLoading(false);
    }
  }, [collegeId, groupSectionId]);

  const loadGrid = useCallback(async () => {
    if (!collegeId || !academicYearId || !groupSectionId || !timetableId) {
      clearGrid();
      return;
    }
    setGridLoading(true);
    setTimetable(null);
    setScheduleTimings([]);
    try {
      void loadProxies();
      const result = await fetchAssignResourceTimetableView({
        collegeId,
        academicYearId,
        groupSectionId,
        timetableId,
        timetableMeta: selectedTimetableRow
          ? {
              startDate:
                selectedTimetableRow.timetable_startdate ??
                selectedTimetableRow.startDate,
              endDate:
                selectedTimetableRow.timetable_enddate ??
                selectedTimetableRow.endDate,
              timetableName:
                selectedTimetableRow.timetable_name ??
                selectedTimetableRow.timetableName,
            }
          : null,
      });
      if (!result.grid || result.grid.weekdays.length === 0) {
        toastInfo("No timetable entries found for the selected timetable.");
      }
      setTimetable(result.grid);
      setScheduleTimings(result.scheduleTimings);
    } finally {
      setGridLoading(false);
    }
  }, [
    collegeId,
    academicYearId,
    groupSectionId,
    timetableId,
    selectedTimetableRow,
    clearGrid,
    loadProxies,
  ]);

  useEffect(() => {
    if (!timetableId) {
      clearGrid();
      return;
    }
    void loadGrid();
  }, [timetableId, loadGrid, clearGrid]);

  useEffect(() => {
    if (!collegeId || !academicYearId || filtersLoading) return;
    if (!courseId && courses.length > 0)
      setCourseId(num(courses[0].fk_course_id));
  }, [collegeId, academicYearId, courses, courseId, filtersLoading]);

  useEffect(() => {
    if (!courseId || filtersLoading) return;
    if (!courseGroupId && courseGroups.length > 0)
      setCourseGroupId(num(courseGroups[0].fk_course_group_id));
  }, [courseId, courseGroups, courseGroupId, filtersLoading]);

  useEffect(() => {
    if (!courseGroupId || filtersLoading) return;
    if (!courseYearId && courseYears.length > 0)
      setCourseYearId(num(courseYears[0].fk_course_year_id));
  }, [courseGroupId, courseYears, courseYearId, filtersLoading]);

  useEffect(() => {
    if (!courseYearId || filtersLoading) return;
    if (!groupSectionId && sections.length > 0)
      setGroupSectionId(num(sections[0].fk_group_section_id));
  }, [courseYearId, sections, groupSectionId, filtersLoading]);

  // Angular selectedData(): college / ay / course / group / year / section (+ date range beside)
  const allocationHeader = useMemo(() => {
    if (!timetableId) return "";
    const parts = [
      text(colleges.find((c) => num(c.fk_college_id) === collegeId) ?? {}, [
        "college_code",
        "collegeCode",
      ]),
      text(
        academicYears.find(
          (a) => num(a.fk_academic_year_id) === academicYearId,
        ) ?? {},
        ["academic_year", "academicYear"],
      ),
      text(courses.find((c) => num(c.fk_course_id) === courseId) ?? {}, [
        "course_code",
        "courseCode",
      ]),
      text(
        courseGroups.find((g) => num(g.fk_course_group_id) === courseGroupId) ??
          {},
        ["group_code", "groupCode"],
      ),
      text(
        courseYears.find((y) => num(y.fk_course_year_id) === courseYearId) ??
          {},
        ["course_year_name", "courseYearName"],
      ),
      text(
        sections.find((s) => num(s.fk_group_section_id) === groupSectionId) ??
          {},
        ["section", "groupSectionName"],
      ),
    ].filter(Boolean);
    return parts.join(" / ");
  }, [
    timetableId,
    colleges,
    collegeId,
    academicYears,
    academicYearId,
    courses,
    courseId,
    courseGroups,
    courseGroupId,
    courseYears,
    courseYearId,
    sections,
    groupSectionId,
  ]);

  const allocationDateRange = useMemo(() => {
    if (!selectedTimetableRow) return "";
    const start = formatDateHeader(
      selectedTimetableRow.timetable_startdate ??
        selectedTimetableRow.startDate,
    );
    const end = formatDateHeader(
      selectedTimetableRow.timetable_enddate ?? selectedTimetableRow.endDate,
    );
    if (start && end) return `${start} - ${end}`;
    return timetable?.dateRangeLabel ?? "";
  }, [selectedTimetableRow, timetable?.dateRangeLabel]);

  const allocationTableTitle = useMemo(() => {
    if (!allocationHeader) return "";
    return `Timetable Allocations - ${allocationHeader}${allocationDateRange ? ` (${allocationDateRange})` : ""}`;
  }, [allocationHeader, allocationDateRange]);

  const resourceDialogContext =
    useMemo<AssignResourceDialogContext | null>(() => {
      if (
        !collegeId ||
        !academicYearId ||
        !courseId ||
        !courseGroupId ||
        !courseYearId ||
        !groupSectionId ||
        !selectedTimetableRow
      ) {
        return null;
      }
      return {
        collegeId,
        academicYearId,
        courseId,
        courseGroupId,
        courseYearId,
        groupSectionId,
        collegeCode: text(
          colleges.find((c) => num(c.fk_college_id) === collegeId) ?? {},
          ["college_code", "collegeCode"],
        ),
        academicYearName: text(
          academicYears.find(
            (a) => num(a.fk_academic_year_id) === academicYearId,
          ) ?? {},
          ["academic_year", "academicYear"],
        ),
        courseName: text(
          courses.find((c) => num(c.fk_course_id) === courseId) ?? {},
          ["courseName", "course_code", "courseCode"],
        ),
        groupName: text(
          courseGroups.find(
            (g) => num(g.fk_course_group_id) === courseGroupId,
          ) ?? {},
          ["group_code", "groupCode", "groupName"],
        ),
        courseYearName: text(
          courseYears.find((y) => num(y.fk_course_year_id) === courseYearId) ??
            {},
          ["course_year_name", "courseYearName"],
        ),
        groupSectionName: text(
          sections.find((s) => num(s.fk_group_section_id) === groupSectionId) ??
            {},
          ["section", "groupSectionName"],
        ),
        timetable: selectedTimetableRow,
        scheduleTimings,
      };
    }, [
      collegeId,
      academicYearId,
      courseId,
      courseGroupId,
      courseYearId,
      groupSectionId,
      selectedTimetableRow,
      colleges,
      academicYears,
      courses,
      courseGroups,
      courseYears,
      sections,
      scheduleTimings,
    ]);

  const workloadColumnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      WORKLOAD_COL_DEFS.siNo,
      WORKLOAD_COL_DEFS.proxyFirstName,
      WORKLOAD_COL_DEFS.assignedFirstName,
      { ...WORKLOAD_COL_DEFS.subjectName, cellRenderer: subjectRenderer },
      { ...WORKLOAD_COL_DEFS.proxyDate, cellRenderer: proxyDateRenderer },
      { ...WORKLOAD_COL_DEFS.course, cellRenderer: courseRenderer },
      { ...WORKLOAD_COL_DEFS.startTime, cellRenderer: timingRenderer },
      { ...WORKLOAD_COL_DEFS.status, cellRenderer: statusRenderer },
    ],
    [],
  );

  const showGridCard = timetableId != null && timetableId > 0;

  const handleTimingClick = (
    timing: TimetableDayTiming,
    weekday: TimetableDayColumn,
  ) => {
    setSelectedTiming(timing);
    setSelectedWeekday(weekday);
    setResourceDialogOpen(true);
  };

  return (
    <FilteredListPage
      title="Assign Resource To Timetable"
      tableTitle={showGridCard ? allocationTableTitle : undefined}
      className="assign-resource-timetable [&_.global-filter-bar__inner]:gap-2 [&_.global-filter-bar__inner]:px-0 [&_.global-filter-bar__inner]:pb-2 [&_.global-filter-field]:min-w-0 [&_.global-filter-field]:max-w-none [&_.global-filter-field]:flex-none"
      filters={
        <div className="space-y-2">
          {/* Angular: fxFlex.gt-md="25" × 4 */}
          <div className="grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
            <GlobalFilterField label="College *">
              <Select
                value={collegeId ? String(collegeId) : null}
                onChange={(v) => {
                  setCollegeId(v ? num(v) : null);
                  setCourseId(null);
                  setCourseGroupId(null);
                  setCourseYearId(null);
                  setGroupSectionId(null);
                  setTimetableId(null);
                }}
                options={collegeOptions}
                placeholder="College"
                searchable
                isLoading={filtersLoading}
              />
            </GlobalFilterField>
            <GlobalFilterField label="Academic Year *">
              <Select
                value={academicYearId ? String(academicYearId) : null}
                onChange={(v) => {
                  setAcademicYearId(v ? num(v) : null);
                  setCourseId(null);
                  setCourseGroupId(null);
                  setCourseYearId(null);
                  setGroupSectionId(null);
                  setTimetableId(null);
                }}
                options={ayOptions}
                placeholder="Academic Year"
                searchable
                disabled={!collegeId}
              />
            </GlobalFilterField>
            <GlobalFilterField label="Course *">
              <Select
                value={courseId ? String(courseId) : null}
                onChange={(v) => {
                  setCourseId(v ? num(v) : null);
                  setCourseGroupId(null);
                  setCourseYearId(null);
                  setGroupSectionId(null);
                  setTimetableId(null);
                }}
                options={courseOptions}
                placeholder="Course"
                searchable
                disabled={!academicYearId}
              />
            </GlobalFilterField>
            <GlobalFilterField label="Course Group *">
              <Select
                value={courseGroupId ? String(courseGroupId) : null}
                onChange={(v) => {
                  setCourseGroupId(v ? num(v) : null);
                  setCourseYearId(null);
                  setGroupSectionId(null);
                  setTimetableId(null);
                }}
                options={groupOptions}
                placeholder="Course Group"
                searchable
                disabled={!courseId}
              />
            </GlobalFilterField>
          </div>
          {/* Angular: year 25%, section 25%, timetable 50% */}
          <div className="grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
            <GlobalFilterField label="Course Year *">
              <Select
                value={courseYearId ? String(courseYearId) : null}
                onChange={(v) => {
                  setCourseYearId(v ? num(v) : null);
                  setGroupSectionId(null);
                  setTimetableId(null);
                }}
                options={yearOptions}
                placeholder="Course Year"
                searchable
                disabled={!courseGroupId}
              />
            </GlobalFilterField>
            <GlobalFilterField label="Section *">
              <Select
                value={groupSectionId ? String(groupSectionId) : null}
                onChange={(v) => {
                  setGroupSectionId(v ? num(v) : null);
                  setTimetableId(null);
                }}
                options={sectionOptions}
                placeholder="Section"
                searchable
                disabled={!courseYearId}
              />
            </GlobalFilterField>
            <GlobalFilterField
              label="Timetable *"
              className="sm:col-span-2 lg:col-span-2"
            >
              <Select
                value={timetableId != null ? String(timetableId) : null}
                onChange={(v) => setTimetableId(v ? num(v) : null)}
                options={timetableOptions}
                placeholder="Timetable"
                searchable
                clearable
                disabled={!groupSectionId}
              />
            </GlobalFilterField>
          </div>
        </div>
      }
      body={
        showGridCard ? (
          gridLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Loading timetable…
            </div>
          ) : timetable && timetable.weekdays.length > 0 ? (
            <div
              className="overflow-hidden rounded-sm border bg-white shadow-sm"
              style={{ borderColor: TIMETABLE_CELL_BORDER }}
            >
              <TimetableWeeklyGrid
                timetable={timetable}
                variant="screen"
                cellColorMode="assign-resource"
                onTimingClick={handleTimingClick}
              />
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No timetable slots found for this selection.
            </p>
          )
        ) : null
      }
    >
      {workloads.length > 0 || workloadsLoading ? (
        <DataTable
          title="Workloads"
          bordered
          columnDefs={workloadColumnDefs}
          rowData={workloads}
          loading={workloadsLoading}
          toolbar={{
            search: true,
            exportExcel: false,
            exportPdf: false,
            columnPicker: false,
          }}
        />
      ) : null}

      {resourceDialogOpen &&
      selectedTiming &&
      selectedWeekday &&
      resourceDialogContext ? (
        <AddResourceDialog
          open={resourceDialogOpen}
          onClose={() => setResourceDialogOpen(false)}
          onSaved={() => void loadGrid()}
          timing={selectedTiming}
          weekday={selectedWeekday}
          context={resourceDialogContext}
        />
      ) : null}
    </FilteredListPage>
  );
}
