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
import {
  ViewAllocatedTimetableModal,
  type ViewTimetableModalContext,
} from "./ViewAllocatedTimetableModal";

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

  const [modalOpen, setModalOpen] = useState(false);
  const [viewContext, setViewContext] =
    useState<ViewTimetableModalContext | null>(null);

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

  useEffect(() => {
    if (!groupSectionId || filtersLoading) return;
    if (!timetableId && timetables.length > 0)
      setTimetableId(
        num(timetables[0].pk_timetable_id ?? timetables[0].timetableId),
      );
  }, [groupSectionId, timetables, timetableId, filtersLoading]);

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

  function openModalView() {
    if (
      !collegeId ||
      !academicYearId ||
      !courseGroupId ||
      !courseYearId ||
      !groupSectionId
    )
      return;
    const collegeCode = text(collegeLabel ?? {}, [
      "college_code",
      "collegeCode",
    ]);
    const ay = text(
      academicYears.find(
        (a) => num(a.fk_academic_year_id) === academicYearId,
      ) ?? {},
      ["academic_year", "academicYear"],
    );
    setViewContext({
      mode: "allocated",
      data: {
        collegeId,
        academicYearId,
        courseId: courseId ?? 0,
        courseGroupId,
        courseYearId,
        groupSectionId,
        timetableId: timetableId ?? undefined,
        collegeLabel: ay ? `${collegeCode} (${ay})` : collegeCode,
        timetableLabel: String(
          selectedTimetableRow?.timetable_name ??
            selectedTimetableRow?.timetableName ??
            timetableOptions.find((o) => o.value === String(timetableId))
              ?.label ??
            "",
        ),
        sectionLabel: headerLine,
      },
    });
    setModalOpen(true);
  }

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
            <FilterField label="College">
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
            <FilterField label="Academic Year">
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
            <FilterField label="Course">
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
            <FilterField label="Course Group">
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
            <FilterField label="Course Year">
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
            <FilterField label="Section">
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
            <FilterField label="Timetable" className="sm:col-span-2">
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
            <h2 className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#002b5c]">
              <CalendarRange className="h-4 w-4" aria-hidden />
              Timetable allocations - {headerLine}
              {dateRange ? (
                <span className="font-normal">- ({dateRange})</span>
              ) : null}
            </h2>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={openModalView}
              >
                Popup view
              </Button>
              <Button type="button" size="sm" onClick={handlePrint}>
                Print
              </Button>
            </div>
          </div>

          <TimetableWeeklyGrid timetable={timetable} variant="screen" />
        </div>
      ) : gridLoading ? (
        <p className="screen-only py-12 text-center text-sm text-muted-foreground">
          Loading timetable…
        </p>
      ) : timetableId ? (
        <p className="screen-only py-12 text-center text-sm text-muted-foreground">
          Select all filters and a timetable to view allocations.
        </p>
      ) : null}

      <ViewAllocatedTimetableModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setViewContext(null);
        }}
        context={viewContext}
      />
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
