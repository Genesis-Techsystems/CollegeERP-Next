"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
import { CalendarRange, ChevronDown, ChevronUp, Filter } from "lucide-react";
import { Select, type SelectOption } from "@/common/components/select";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toastInfo } from "@/lib/toast";
import { printClassTimetable } from "../_print/timetable-print";
import {
  fetchTimetableFilterRows,
  fetchViewClassTimetable,
  type AngularStudentTimetable,
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
import { TimetableWeeklyGrid } from "./TimetableWeeklyGrid";

type AnyRow = Record<string, unknown>;

export function ViewTimetablePage() {
  const searchParams = useSearchParams();

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
  const [selectedTimetableRow, setSelectedTimetableRow] =
    useState<AnyRow | null>(null);

  useEffect(() => {
    setFiltersLoading(true);
    void fetchTimetableFilterRows("cls_timtable_filters", 0)
      .then((rows) => {
        setFilterRows(rows);
        const colleges = collegesFromFilterRows(rows);
        if (colleges.length === 0) return;

        const urlCollege = num(searchParams.get("collegeId"));
        const urlAy = num(searchParams.get("academicYearId"));
        const urlTt = num(searchParams.get("timetableId"));

        const firstCollege = urlCollege || num(colleges[0].fk_college_id);
        setCollegeId(firstCollege);

        const ays = academicYearsFromFilterRows(rows, firstCollege);
        const firstAy = urlAy || num(ays[0]?.fk_academic_year_id);
        if (firstAy) setAcademicYearId(firstAy);

        if (urlAy && urlCollege) {
          const courses = coursesFromFilterRows(rows, firstCollege, firstAy);
          if (courses.length > 0) {
            const cid = num(courses[0].fk_course_id);
            setCourseId(cid);
            const groups = courseGroupsFromFilterRows(
              rows,
              firstCollege,
              firstAy,
              cid,
            );
            if (groups.length > 0) {
              const gid = num(groups[0].fk_course_group_id);
              setCourseGroupId(gid);
              const years = courseYearsFromFilterRows(
                rows,
                firstCollege,
                firstAy,
                cid,
                gid,
              );
              if (years.length > 0) {
                const yid = num(years[0].fk_course_year_id);
                setCourseYearId(yid);
                const secs = sectionsFromFilterRows(
                  rows,
                  firstCollege,
                  firstAy,
                  cid,
                  gid,
                  yid,
                );
                if (secs.length > 0) {
                  const sid = num(secs[0].fk_group_section_id);
                  setGroupSectionId(sid);
                  if (urlTt) setTimetableId(urlTt);
                }
              }
            }
          }
        }
      })
      .finally(() => setFiltersLoading(false));
  }, [searchParams]);

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

  const loadGrid = useCallback(async () => {
    if (!collegeId || !academicYearId || !groupSectionId || !timetableId) {
      setTimetable(null);
      return;
    }
    const ttRow =
      timetables.find(
        (t) => num(t.pk_timetable_id ?? t.timetableId) === timetableId,
      ) ?? null;
    setSelectedTimetableRow(ttRow);
    setGridLoading(true);
    setTimetable(null);
    try {
      const result = await fetchViewClassTimetable({
        collegeId,
        academicYearId,
        groupSectionId,
        timetableId,
        timetableMeta: ttRow
          ? {
              startDate: ttRow.timetable_startdate ?? ttRow.startDate,
              endDate: ttRow.timetable_enddate ?? ttRow.endDate,
              timetableName: ttRow.timetable_name ?? ttRow.timetableName,
            }
          : null,
      });
      if (!result || result.weekdays.length === 0) {
        toastInfo("No timetable entries found for the selected filters.");
      }
      setTimetable(result);
    } finally {
      setGridLoading(false);
    }
  }, [collegeId, academicYearId, groupSectionId, timetableId, timetables]);

  useEffect(() => {
    void loadGrid();
  }, [loadGrid]);

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

  // Angular selectedSection clears timetableId and does NOT auto-select a timetable.
  // URL ?timetableId= is applied during filter init only.

  const collegeLabel = colleges.find((c) => num(c.fk_college_id) === collegeId);
  const courseCode = courses.find((c) => num(c.fk_course_id) === courseId);
  const groupCode = courseGroups.find(
    (g) => num(g.fk_course_group_id) === courseGroupId,
  );
  const yearName = courseYears.find(
    (y) => num(y.fk_course_year_id) === courseYearId,
  );
  const sectionName = sections.find(
    (s) => num(s.fk_group_section_id) === groupSectionId,
  );

  const headerLine = [
    text(courseCode ?? {}, ["course_code", "courseCode"]),
    text(groupCode ?? {}, ["group_code", "groupCode"]),
    text(yearName ?? {}, ["course_year_name", "courseYearName"]),
    text(sectionName ?? {}, ["section", "groupSectionName"]),
  ]
    .filter(Boolean)
    .join(" / ");

  const academicYearLabel = text(
    academicYears.find((a) => num(a.fk_academic_year_id) === academicYearId) ??
      {},
    ["academic_year", "academicYear"],
  );

  /** Angular print header: collegeCode / academicYear / course / group / year / section - (dates) */
  const printHeaderLine = [
    text(collegeLabel ?? {}, ["college_code", "collegeCode"]),
    academicYearLabel,
    text(courseCode ?? {}, ["course_code", "courseCode"]),
    text(groupCode ?? {}, ["group_code", "groupCode"]),
    text(yearName ?? {}, ["course_year_name", "courseYearName"]),
    text(sectionName ?? {}, ["section", "groupSectionName"]),
  ]
    .filter(Boolean)
    .join(" / ");

  const dateRange =
    selectedTimetableRow?.timetable_startdate ||
    selectedTimetableRow?.timetable_enddate
      ? `${formatDateHeader(selectedTimetableRow.timetable_startdate ?? selectedTimetableRow.startDate)} - ${formatDateHeader(selectedTimetableRow.timetable_enddate ?? selectedTimetableRow.endDate)}`
      : (timetable?.dateRangeLabel ?? "");

  function handlePrint() {
    if (!timetable) return;
    printClassTimetable(
      timetable,
      printHeaderLine + (dateRange ? ` - (${dateRange})` : ""),
    );
  }

  return (
    <PageContainer className="view-timetable-page space-y-4">
      <div className="screen-only app-card overflow-hidden" data-no-page-name>
        <button
          type="button"
          className="flex w-full items-center justify-between px-4 py-3 text-left"
          onClick={() => setFiltersOpen((o) => !o)}
        >
          <span className="inline-flex items-center gap-2 text-[15px] font-semibold text-[#5da394]">
            <CalendarRange className="h-4 w-4" aria-hidden />
            View Class Timetable
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
            <FilterField label="College" required>
              <Select
                value={collegeId ? String(collegeId) : ""}
                onChange={(v) => {
                  const id = num(v);
                  setCollegeId(id);
                  setAcademicYearId(null);
                  setCourseId(null);
                  setCourseGroupId(null);
                  setCourseYearId(null);
                  setGroupSectionId(null);
                  setTimetableId(null);
                  setTimetable(null);
                  const ays = academicYearsFromFilterRows(filterRows, id);
                  if (ays[0])
                    setAcademicYearId(num(ays[0].fk_academic_year_id));
                }}
                options={collegeOptions}
                placeholder="College"
                searchable
                disabled={filtersLoading}
              />
            </FilterField>
            <FilterField label="Academic Year" required>
              <Select
                value={academicYearId ? String(academicYearId) : ""}
                onChange={(v) => {
                  const id = num(v);
                  setAcademicYearId(id);
                  setCourseId(null);
                  setCourseGroupId(null);
                  setCourseYearId(null);
                  setGroupSectionId(null);
                  setTimetableId(null);
                  setTimetable(null);
                  if (collegeId && id) {
                    const nextCourses = coursesFromFilterRows(
                      filterRows,
                      collegeId,
                      id,
                    );
                    if (nextCourses[0])
                      setCourseId(num(nextCourses[0].fk_course_id));
                  }
                }}
                options={ayOptions}
                placeholder="Academic Year"
                searchable
                disabled={!collegeId}
              />
            </FilterField>
            <FilterField label="Course" required>
              <Select
                value={courseId ? String(courseId) : ""}
                onChange={(v) => {
                  const id = num(v);
                  setCourseId(id);
                  setCourseGroupId(null);
                  setCourseYearId(null);
                  setGroupSectionId(null);
                  setTimetableId(null);
                  setTimetable(null);
                  if (collegeId && academicYearId && id) {
                    const groups = courseGroupsFromFilterRows(
                      filterRows,
                      collegeId,
                      academicYearId,
                      id,
                    );
                    if (groups[0])
                      setCourseGroupId(num(groups[0].fk_course_group_id));
                  }
                }}
                options={courseOptions}
                placeholder="Course"
                searchable
                disabled={!academicYearId}
              />
            </FilterField>
            <FilterField label="Course Group" required>
              <Select
                value={courseGroupId ? String(courseGroupId) : ""}
                onChange={(v) => {
                  const id = num(v);
                  setCourseGroupId(id);
                  setCourseYearId(null);
                  setGroupSectionId(null);
                  setTimetableId(null);
                  setTimetable(null);
                  if (collegeId && academicYearId && courseId && id) {
                    const years = courseYearsFromFilterRows(
                      filterRows,
                      collegeId,
                      academicYearId,
                      courseId,
                      id,
                    );
                    if (years[0])
                      setCourseYearId(num(years[0].fk_course_year_id));
                  }
                }}
                options={groupOptions}
                placeholder="Course Group"
                searchable
                disabled={!courseId}
              />
            </FilterField>
            <FilterField label="Course Year" required>
              <Select
                value={courseYearId ? String(courseYearId) : ""}
                onChange={(v) => {
                  const id = num(v);
                  setCourseYearId(id);
                  setGroupSectionId(null);
                  setTimetableId(null);
                  setTimetable(null);
                  if (
                    collegeId &&
                    academicYearId &&
                    courseId &&
                    courseGroupId &&
                    id
                  ) {
                    const secs = sectionsFromFilterRows(
                      filterRows,
                      collegeId,
                      academicYearId,
                      courseId,
                      courseGroupId,
                      id,
                    );
                    if (secs[0])
                      setGroupSectionId(num(secs[0].fk_group_section_id));
                  }
                }}
                options={yearOptions}
                placeholder="Course Year"
                searchable
                disabled={!courseGroupId}
              />
            </FilterField>
            <FilterField label="Section" required>
              <Select
                value={groupSectionId ? String(groupSectionId) : ""}
                onChange={(v) => {
                  setGroupSectionId(num(v));
                  setTimetableId(null);
                  setTimetable(null);
                }}
                options={sectionOptions}
                placeholder="Section"
                searchable
                disabled={!courseYearId}
              />
            </FilterField>
            <FilterField label="Timetable" required className="sm:col-span-2">
              <Select
                value={timetableId ? String(timetableId) : ""}
                onChange={(v) => setTimetableId(num(v))}
                options={timetableOptions}
                placeholder="Timetable"
                searchable
                disabled={!groupSectionId}
              />
            </FilterField>
          </div>
        ) : null}
      </div>

      {timetable && timetable.weekdays.length > 0 ? (
        <div className="screen-only app-card space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="inline-flex flex-wrap items-center gap-2 text-[13px] font-semibold text-[#002b5c]">
              <CalendarRange className="h-4 w-4 shrink-0" aria-hidden />
              <span>
                Timetable allocations - {headerLine}
                {dateRange ? ` - (${dateRange})` : ""}
              </span>
            </h2>
            <Button type="button" size="sm" onClick={handlePrint}>
              Print
            </Button>
          </div>

          <TimetableWeeklyGrid timetable={timetable} variant="screen" />
        </div>
      ) : gridLoading ? (
        <p className="screen-only py-12 text-center text-sm text-muted-foreground">
          Loading timetable…
        </p>
      ) : !timetableId ? (
        <p className="screen-only py-12 text-center text-sm text-muted-foreground">
          Select College through Section, then choose a Timetable to view
          allocations.
        </p>
      ) : (
        <p className="screen-only py-12 text-center text-sm text-muted-foreground">
          No timetable entries found for the selected filters.
        </p>
      )}
    </PageContainer>
  );
}

function FilterField({
  label,
  children,
  className = "",
  required = false,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  required?: boolean;
}) {
  return (
    <div className={`space-y-1 ${className}`}>
      <Label className="text-[12px]">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
    </div>
  );
}
