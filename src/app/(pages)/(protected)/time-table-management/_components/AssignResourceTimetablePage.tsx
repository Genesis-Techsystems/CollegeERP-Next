"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Filter,
  Loader2,
} from "lucide-react";
import { DataTable } from "@/common/components/table";
import { Select, type SelectOption } from "@/common/components/select";
import { PageContainer } from "@/components/layout";
import { Label } from "@/components/ui/label";
import { rowIndexGetter } from "@/lib/utils";
import { toastInfo } from "@/lib/toast";
import {
  fetchAssignResourceTimetableView,
  fetchTimetableFilterRows,
  listStaffProxiesForSection,
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
  const [filtersOpen, setFiltersOpen] = useState(true);

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
        const firstCollege = num(colleges[0].fk_college_id);
        setCollegeId(firstCollege);
        const ays = academicYearsFromFilterRows(rows, firstCollege);
        if (ays.length > 0) setAcademicYearId(num(ays[0].fk_academic_year_id));
      })
      .finally(() => setFiltersLoading(false));
  }, []);

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
      timetableOptions.find((o) => o.value === String(timetableId))?.label ??
        "",
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
    timetableOptions,
  ]);

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
    <PageContainer className="assign-resource-timetable space-y-4">
      <div className="app-card overflow-hidden" data-no-page-name>
        <button
          type="button"
          className="flex w-full items-center justify-between px-4 py-3 text-left"
          onClick={() => setFiltersOpen((o) => !o)}
        >
          <span className="inline-flex items-center gap-2 text-[15px] font-semibold text-[#5da394]">
            <BookOpen className="h-4 w-4" aria-hidden />
            Assign Resource To Timetable
          </span>
          <span className="inline-flex items-center gap-2 text-[12px] text-muted-foreground">
            Filter
            <Filter className="h-4 w-4" />
            {filtersOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </span>
        </button>

        {filtersOpen ? (
          <div className="grid gap-3 border-t border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <FilterField label="College *">
              <Select
                value={collegeId ? String(collegeId) : ""}
                onChange={(v) => {
                  setCollegeId(num(v));
                  setAcademicYearId(null);
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
            </FilterField>
            <FilterField label="Academic Year *">
              <Select
                value={academicYearId ? String(academicYearId) : ""}
                onChange={(v) => {
                  setAcademicYearId(num(v));
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
            </FilterField>
            <FilterField label="Course *">
              <Select
                value={courseId ? String(courseId) : ""}
                onChange={(v) => {
                  setCourseId(num(v));
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
            </FilterField>
            <FilterField label="Course Group *">
              <Select
                value={courseGroupId ? String(courseGroupId) : ""}
                onChange={(v) => {
                  setCourseGroupId(num(v));
                  setCourseYearId(null);
                  setGroupSectionId(null);
                  setTimetableId(null);
                }}
                options={groupOptions}
                placeholder="Course Group"
                searchable
                disabled={!courseId}
              />
            </FilterField>
            <FilterField label="Course Year *">
              <Select
                value={courseYearId ? String(courseYearId) : ""}
                onChange={(v) => {
                  setCourseYearId(num(v));
                  setGroupSectionId(null);
                  setTimetableId(null);
                }}
                options={yearOptions}
                placeholder="Course Year"
                searchable
                disabled={!courseGroupId}
              />
            </FilterField>
            <FilterField label="Section *">
              <Select
                value={groupSectionId ? String(groupSectionId) : ""}
                onChange={(v) => {
                  setGroupSectionId(num(v));
                  setTimetableId(null);
                }}
                options={sectionOptions}
                placeholder="Section"
                searchable
                disabled={!courseYearId}
              />
            </FilterField>
            <FilterField label="Timetable *" className="sm:col-span-2">
              <Select
                value={timetableId != null ? String(timetableId) : null}
                onChange={(v) => setTimetableId(v ? num(v) : null)}
                options={timetableOptions}
                placeholder="Timetable"
                searchable
                clearable
                disabled={!groupSectionId}
              />
            </FilterField>
          </div>
        ) : null}
      </div>

      {showGridCard ? (
        <div className="app-card space-y-3 p-4">
          <h2 className="whitespace-nowrap text-[13px] font-semibold text-[#002b5c]">
            Timetable allocations - {allocationHeader}
          </h2>

          {gridLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Loading timetable…
            </div>
          ) : timetable && timetable.weekdays.length > 0 ? (
            <TimetableWeeklyGrid
              timetable={timetable}
              variant="screen"
              onTimingClick={handleTimingClick}
            />
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No timetable slots found for this selection.
            </p>
          )}
        </div>
      ) : null}

      {workloads.length > 0 || workloadsLoading ? (
        <div className="app-card space-y-3 p-4">
          <h2 className="text-[13px] font-semibold text-[#002b5c]">
            Workloads
          </h2>
          {workloadsLoading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Loading workloads…
            </div>
          ) : (
            <DataTable
              columnDefs={workloadColumnDefs}
              rowData={workloads}
              toolbar={{
                search: true,
                exportExcel: true,
                exportPdf: false,
                columnPicker: false,
              }}
            />
          )}
        </div>
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
    </PageContainer>
  );
}

function FilterField({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1 ${className}`}>
      <Label className="text-[12px]">{label}</Label>
      {children}
    </div>
  );
}
