"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { Select, type SelectOption } from "@/common/components/select";
import { FilteredPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { toastError } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import {
  fetchAssignResourceSchedules,
  fetchTimetableFilterRows,
} from "@/services";
import {
  academicYearsFromFilterRows,
  collegesFromFilterRows,
  courseGroupsFromFilterRows,
  coursesFromFilterRows,
  courseYearsFromFilterRows,
  formatClockAmPm,
  num,
  sectionsFromFilterRows,
  text,
  timetablesFromFilterRows,
} from "@/app/(pages)/(protected)/time-table-management/_lib/timetable-filters";

type AnyRow = Record<string, unknown>;

type ScheduleTiming = AnyRow & {
  weekdayId?: number;
  weekdayName?: string;
  startTime?: string;
  endTime?: string;
  classTimingName?: string;
  isBreak?: boolean;
  colorCode?: string;
  color?: string;
  colspan?: number;
  subjectResource?: Array<Record<string, unknown>>;
};

type WeekdayRow = {
  weekdayId: number;
  weekdayName: string;
  timings: ScheduleTiming[];
};

function toOpts(
  rows: AnyRow[],
  idKey: string,
  labelKeys: string[],
): SelectOption[] {
  return rows
    .map((r) => {
      const id = num(r[idKey]);
      if (!id) return null;
      return { value: String(id), label: text(r, labelKeys) || String(id) };
    })
    .filter(Boolean) as SelectOption[];
}

/** Angular employee-module-course-year-timetable schedule matrix builder. */
function buildStaffClassTimetable(scheduleTimings: ScheduleTiming[]): {
  weekdays: WeekdayRow[];
  headerTimings: ScheduleTiming[];
} {
  const weekdays: WeekdayRow[] = [];
  for (const row of scheduleTimings) {
    const resources = Array.isArray(row.subjectResource)
      ? row.subjectResource
      : [];
    // Angular: text white only when row.colorCode != null; then overwrite bg from subjectResource[0]
    const colored: ScheduleTiming = {
      ...row,
      subjectResource: resources,
      color: row.colorCode != null ? "#fff" : "#000",
      colorCode:
        resources.length > 0
          ? (resources[0]?.colorCode as string | undefined)
          : row.colorCode,
      colspan: 1,
    };
    const wid = Number(colored.weekdayId ?? 0);
    const wname = String(colored.weekdayName ?? "");
    // Angular: weekdayName[0]+[1]+[2] (e.g. MON)
    const short = wname.slice(0, 3).toUpperCase() || "DAY";
    let day = weekdays.find((d) => d.weekdayId === wid);
    if (!day) {
      day = { weekdayId: wid, weekdayName: short, timings: [] };
      weekdays.push(day);
    }
    day.timings.push(colored);
  }

  // Header periods from first weekday (Angular uses weekdays[0].classTimings)
  const headerTimings = weekdays[0]?.timings ?? [];
  return { weekdays, headerTimings };
}

/**
 * Angular `staff-classes/my-classes/course-year-timetable` —
 * day×period matrix (staff My Classes only — this page file).
 */
export function CourseYearTimetablePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

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
  const [weekdays, setWeekdays] = useState<WeekdayRow[]>([]);
  const [headerTimings, setHeaderTimings] = useState<ScheduleTiming[]>([]);
  const [selectedTtRow, setSelectedTtRow] = useState<AnyRow | null>(null);

  useEffect(() => {
    setFiltersLoading(true);
    void fetchTimetableFilterRows("cls_timtable_filters", 0)
      .then((rows) => {
        setFilterRows(rows);
        const urlCollege = num(searchParams.get("collegeId"));
        const urlAy = num(searchParams.get("academicYearId"));
        const urlCourse = num(searchParams.get("courseId"));
        const urlGroup = num(searchParams.get("courseGroupId"));
        const urlYear = num(searchParams.get("courseYearId"));
        const urlSection = num(searchParams.get("groupSectionId"));

        const colleges = collegesFromFilterRows(rows);
        const firstCollege = urlCollege || num(colleges[0]?.fk_college_id);
        if (!firstCollege) return;
        setCollegeId(firstCollege);

        const ays = academicYearsFromFilterRows(rows, firstCollege);
        const firstAy = urlAy || num(ays[0]?.fk_academic_year_id);
        if (!firstAy) return;
        setAcademicYearId(firstAy);

        const courses = coursesFromFilterRows(rows, firstCollege, firstAy);
        const firstCourse = urlCourse || num(courses[0]?.fk_course_id);
        if (!firstCourse) return;
        setCourseId(firstCourse);

        const groups = courseGroupsFromFilterRows(
          rows,
          firstCollege,
          firstAy,
          firstCourse,
        );
        const firstGroup = urlGroup || num(groups[0]?.fk_course_group_id);
        if (!firstGroup) return;
        setCourseGroupId(firstGroup);

        const years = courseYearsFromFilterRows(
          rows,
          firstCollege,
          firstAy,
          firstCourse,
          firstGroup,
        );
        const firstYear = urlYear || num(years[0]?.fk_course_year_id);
        if (!firstYear) return;
        setCourseYearId(firstYear);

        const secs = sectionsFromFilterRows(
          rows,
          firstCollege,
          firstAy,
          firstCourse,
          firstGroup,
          firstYear,
        );
        const firstSec = urlSection || num(secs[0]?.fk_group_section_id);
        if (firstSec) setGroupSectionId(firstSec);
      })
      .catch((e) => toastError(getErrorMessage(e)))
      .finally(() => setFiltersLoading(false));
  }, [searchParams]);

  const collegeOpts = useMemo(
    () =>
      toOpts(collegesFromFilterRows(filterRows), "fk_college_id", [
        "college_code",
      ]),
    [filterRows],
  );
  const ayOpts = useMemo(
    () =>
      collegeId
        ? toOpts(
            academicYearsFromFilterRows(filterRows, collegeId),
            "fk_academic_year_id",
            ["academic_year"],
          )
        : [],
    [filterRows, collegeId],
  );
  const courseOpts = useMemo(
    () =>
      collegeId && academicYearId
        ? toOpts(
            coursesFromFilterRows(filterRows, collegeId, academicYearId),
            "fk_course_id",
            ["course_code", "course_name"],
          )
        : [],
    [filterRows, collegeId, academicYearId],
  );
  const groupOpts = useMemo(
    () =>
      collegeId && academicYearId && courseId
        ? toOpts(
            courseGroupsFromFilterRows(
              filterRows,
              collegeId,
              academicYearId,
              courseId,
            ),
            "fk_course_group_id",
            ["group_code", "group_name"],
          )
        : [],
    [filterRows, collegeId, academicYearId, courseId],
  );
  const yearOpts = useMemo(
    () =>
      collegeId && academicYearId && courseId && courseGroupId
        ? toOpts(
            courseYearsFromFilterRows(
              filterRows,
              collegeId,
              academicYearId,
              courseId,
              courseGroupId,
            ),
            "fk_course_year_id",
            ["course_year_name"],
          )
        : [],
    [filterRows, collegeId, academicYearId, courseId, courseGroupId],
  );
  const sectionOpts = useMemo(
    () =>
      collegeId && academicYearId && courseId && courseGroupId && courseYearId
        ? toOpts(
            sectionsFromFilterRows(
              filterRows,
              collegeId,
              academicYearId,
              courseId,
              courseGroupId,
              courseYearId,
            ),
            "fk_group_section_id",
            ["section"],
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
  const timetableOpts = useMemo(() => {
    if (
      !collegeId ||
      !academicYearId ||
      !courseId ||
      !courseGroupId ||
      !groupSectionId
    ) {
      return [] as Array<{ value: string; label: string; raw: AnyRow }>;
    }
    const rows = timetablesFromFilterRows(
      filterRows,
      collegeId,
      academicYearId,
      courseId,
      courseGroupId,
      groupSectionId,
    );
    return rows.map((r) => {
      const id = num(r.pk_timetable_id);
      const name = text(r, ["timetable_name"]) || String(id);
      const start = r.timetable_startdate
        ? format(new Date(String(r.timetable_startdate)), "MMM d, y")
        : "";
      const end = r.timetable_enddate
        ? format(new Date(String(r.timetable_enddate)), "MMM d, y")
        : "";
      const range = start && end ? ` (${start} - ${end})` : "";
      return { value: String(id), label: `${name}${range}`, raw: r };
    });
  }, [
    filterRows,
    collegeId,
    academicYearId,
    courseId,
    courseGroupId,
    groupSectionId,
  ]);

  useEffect(() => {
    if (!collegeId || !academicYearId || !groupSectionId || !timetableId) {
      setWeekdays([]);
      setHeaderTimings([]);
      return;
    }
    setGridLoading(true);
    void fetchAssignResourceSchedules({
      collegeId,
      academicYearId,
      groupSectionId,
      timetableId,
    })
      .then((rows) => {
        const built = buildStaffClassTimetable(rows as ScheduleTiming[]);
        setWeekdays(built.weekdays);
        setHeaderTimings(built.headerTimings);
      })
      .catch((e) => {
        toastError(getErrorMessage(e));
        setWeekdays([]);
        setHeaderTimings([]);
      })
      .finally(() => setGridLoading(false));
  }, [collegeId, academicYearId, groupSectionId, timetableId]);

  const dateRange =
    selectedTtRow?.timetable_startdate && selectedTtRow?.timetable_enddate
      ? `${format(new Date(String(selectedTtRow.timetable_startdate)), "MMM d, y")} - ${format(new Date(String(selectedTtRow.timetable_enddate)), "MMM d, y")}`
      : "";

  const dataDetails = [
    collegeOpts.find((o) => o.value === String(collegeId))?.label,
    ayOpts.find((o) => o.value === String(academicYearId))?.label,
    courseOpts.find((o) => o.value === String(courseId))?.label,
    groupOpts.find((o) => o.value === String(courseGroupId))?.label,
    yearOpts.find((o) => o.value === String(courseYearId))?.label,
    sectionOpts.find((o) => o.value === String(groupSectionId))?.label,
    timetableOpts
      .find((o) => o.value === String(timetableId))
      ?.label?.split(" (")[0],
  ]
    .filter(Boolean)
    .join(" / ");

  const hasGrid = weekdays.length > 0 && headerTimings.length > 0;

  // Angular `.page-table-head` + `.table-heads` / `.icon-align` (#0c51a4, gold underline)
  const allocationHeader =
    hasGrid || gridLoading ? (
      <div className="table-context-header !justify-between gap-x-4 gap-y-2 [&_.material-icons]:!text-[#0c51a4] [&_strong]:!text-[#0c51a4]">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="material-icons shrink-0 text-[16px] leading-none"
            aria-hidden
          >
            timelapse
          </span>
          <strong className="text-medium font-medium leading-snug tracking-[-0.015em]">
            Timetable allocations
            {dateRange ? `  - (${dateRange})` : ""}
          </strong>
        </div>
        {dataDetails ? (
          <strong className="max-w-full text-right text-[16px] font-medium leading-snug tracking-[-0.015em] sm:max-w-[55%]">
            {dataDetails}
          </strong>
        ) : null}
      </div>
    ) : null;

  return (
    <FilteredPage
      title="View Course Year Timetable"
      filtersCollapsible={false}
      showFilterLabel={true}
      tableHeader={allocationHeader}
      filters={
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Select
              label="College *"
              value={collegeId ? String(collegeId) : null}
              onChange={(v) => {
                setCollegeId(v ? Number(v) : null);
                setAcademicYearId(null);
                setCourseId(null);
                setCourseGroupId(null);
                setCourseYearId(null);
                setGroupSectionId(null);
                setTimetableId(null);
                setSelectedTtRow(null);
              }}
              options={collegeOpts}
              isLoading={filtersLoading}
              searchable
            />
            <Select
              label="Academic Year *"
              value={academicYearId ? String(academicYearId) : null}
              onChange={(v) => {
                setAcademicYearId(v ? Number(v) : null);
                setCourseId(null);
                setCourseGroupId(null);
                setCourseYearId(null);
                setGroupSectionId(null);
                setTimetableId(null);
                setSelectedTtRow(null);
              }}
              options={ayOpts}
              searchable
            />
            <Select
              label="Course *"
              value={courseId ? String(courseId) : null}
              onChange={(v) => {
                setCourseId(v ? Number(v) : null);
                setCourseGroupId(null);
                setCourseYearId(null);
                setGroupSectionId(null);
                setTimetableId(null);
                setSelectedTtRow(null);
              }}
              options={courseOpts}
              searchable
            />
            <Select
              label="Course Group *"
              value={courseGroupId ? String(courseGroupId) : null}
              onChange={(v) => {
                setCourseGroupId(v ? Number(v) : null);
                setCourseYearId(null);
                setGroupSectionId(null);
                setTimetableId(null);
                setSelectedTtRow(null);
              }}
              options={groupOpts}
              searchable
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Select
              label="Course Year *"
              value={courseYearId ? String(courseYearId) : null}
              onChange={(v) => {
                setCourseYearId(v ? Number(v) : null);
                setGroupSectionId(null);
                setTimetableId(null);
                setSelectedTtRow(null);
              }}
              options={yearOpts}
              searchable
            />
            <Select
              label="Section *"
              value={groupSectionId ? String(groupSectionId) : null}
              onChange={(v) => {
                setGroupSectionId(v ? Number(v) : null);
                setTimetableId(null);
                setSelectedTtRow(null);
              }}
              options={sectionOpts}
              searchable
            />
            <Select
              label="Timetable *"
              value={timetableId ? String(timetableId) : null}
              onChange={(v) => {
                const id = v ? Number(v) : null;
                setTimetableId(id);
                const row =
                  timetableOpts.find((o) => o.value === v)?.raw ?? null;
                setSelectedTtRow(row);
              }}
              options={timetableOpts.map(({ value, label }) => ({
                value,
                label,
              }))}
              searchable
              placeholder="Timetable"
            />
          </div>
        </div>
      }
      body={
        hasGrid || gridLoading ? (
          gridLoading ? (
            <p className="text-sm text-muted-foreground">Loading timetable…</p>
          ) : (
            <div
              className="overflow-x-auto bg-white"
              style={{ margin: "15px 0" }}
            >
              {/* Angular employee-module-course-year-timetable.component.scss */}
              <table
                className="w-full min-w-[720px] text-sm"
                style={{ borderSpacing: "1px", borderCollapse: "separate" }}
              >
                <thead>
                  <tr>
                    <th
                      className="w-14 text-left font-medium"
                      style={{
                        padding: "5px",
                        background: "#C3D9FF",
                      }}
                    />
                    {headerTimings.map((t, i) => (
                      <th
                        key={`${String(t.startTime)}-${i}`}
                        className="whitespace-nowrap text-center font-medium"
                        style={{
                          padding: "5px",
                          background: "#C3D9FF",
                        }}
                      >
                        {`${formatClockAmPm(String(t.startTime ?? ""))} - ${formatClockAmPm(String(t.endTime ?? ""))}`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {weekdays.map((day) => (
                    <tr key={day.weekdayId}>
                      <th
                        className="whitespace-nowrap text-left font-medium uppercase"
                        style={{
                          padding: "5px",
                          background: "#C3D9FF",
                        }}
                      >
                        {day.weekdayName}
                      </th>
                      {day.timings.map((timing, ti) => {
                        const resources = Array.isArray(timing.subjectResource)
                          ? timing.subjectResource
                          : [];
                        const isBreak = Boolean(timing.isBreak);
                        const hasSubject = resources.length > 0;
                        // Angular: [ngStyle]={'background': timing.colorCode}, text timing.color
                        const apiColor =
                          typeof timing.colorCode === "string" &&
                          timing.colorCode.trim()
                            ? timing.colorCode
                            : undefined;
                        const fg = String(timing.color ?? "#000");
                        // .break → #efefef when no inline colorCode
                        const bg =
                          apiColor ?? (isBreak ? "#efefef" : undefined);
                        return (
                          <td
                            key={`${day.weekdayId}-${ti}`}
                            className="align-middle text-center"
                            colSpan={Number(timing.colspan ?? 1) || 1}
                            style={{
                              padding: "20px 8px",
                              background: bg,
                              cursor: "pointer",
                              margin: 0,
                            }}
                          >
                            {hasSubject ? (
                              <div>
                                {resources.slice(0, 2).map((r, ri) => (
                                  <div key={ri}>
                                    {/* Angular `.sub-jct` / `.stff` */}
                                    <p
                                      className="m-0 leading-tight"
                                      style={{
                                        color: fg,
                                        fontWeight: 500,
                                        fontSize: 15,
                                      }}
                                    >
                                      {r.studentBatchId != null
                                        ? `[${String(r.studentBatchName ?? "")}]`
                                        : ""}
                                      {String(r.subjectName ?? "")}
                                    </p>
                                    <p
                                      className="m-0 leading-tight"
                                      style={{ color: fg, fontSize: 10 }}
                                    >
                                      {String(r.staffName ?? "")}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="m-0">
                                {String(timing.classTimingName ?? "")}
                              </p>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : null
      }
    >
      <div className="flex justify-end">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Back
        </Button>
      </div>
    </FilteredPage>
  );
}
