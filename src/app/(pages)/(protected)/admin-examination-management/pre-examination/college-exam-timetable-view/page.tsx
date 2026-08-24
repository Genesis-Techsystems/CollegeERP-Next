"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColDef } from "ag-grid-community";
import { format, isValid, parseISO } from "date-fns";
import { Select } from "@/common/components/select";
import { DataTable } from "@/common/components/table";
import {
  getExamTimetableDetails,
  getExamTimetableDetailsByCollege,
  getUnivExamFiltersByType,
  getUnivExamRestInTtFilters,
} from "@/services";
import { FilteredPage } from "@/components/layout";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";

type AnyRow = Record<string, any>;

/** Placeholder so DataTable can hide AG Grid (`hideEmptyGrid`) while we render the matrix in `afterGrid`. */
const SHELL_COL_DEFS: ColDef[] = [{ field: "_", hide: true }];

const pickNum = (row: AnyRow | null | undefined, keys: string[]) => {
  if (!row) return 0;
  for (const k of keys) {
    const n = Number(row[k]);
    if (n > 0) return n;
  }
  return 0;
};
const pickText = (row: AnyRow | null | undefined, keys: string[]) => {
  if (!row) return "";
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return "";
};
const dedupeBy = <T,>(rows: T[], keyFn: (r: T) => string | number) => {
  const seen = new Set<string | number>();
  return rows.filter((r) => {
    const key = keyFn(r);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
const toYmd = (value: string | Date) => {
  if (typeof value === "string") {
    const raw = value.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
    const d = parseISO(raw.length >= 10 ? raw.slice(0, 10) : raw);
    if (isValid(d)) return format(d, "yyyy-MM-dd");
  }
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return format(d, "yyyy-MM-dd");
};
/** Angular table header day: `(MON)` */
const dayLabel = (ymd: string) => {
  const d = parseISO(ymd);
  if (!isValid(d)) return "";
  return format(d, "EEE").toUpperCase();
};
/** Angular `date:'dd MMM, y'` — e.g. `22 Dec, 2025` */
const longDate = (ymd: string) => {
  const d = parseISO(ymd);
  if (!isValid(d)) return ymd;
  return format(d, "dd MMM, yyyy");
};

function examTypeChar(row: AnyRow): string {
  const code = pickText(row, [
    "examTypeCatCode",
    "examtypeCatCode",
    "exam_type_cat_code",
  ]);
  if (/^sup/i.test(code) || code === "Supple") return "S";
  if (/^int/i.test(code) || code === "Internal") return "I";
  if (/^reg/i.test(code) || code === "Regular") return "R";
  return "R";
}

function isAfternoonSession(row: AnyRow): boolean {
  return (
    pickText(row, [
      "examsessioninCatCode",
      "examSessionName",
      "exam_session_name",
    ]).toUpperCase() === "AFTERNOON"
  );
}

function asBool(v: unknown): boolean {
  return v === true || v === 1 || v === "1" || v === "true";
}

function parseExamDate(value: unknown): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return isValid(value) ? value : null;
  const raw = String(value).trim();
  if (!raw) return null;
  const iso = parseISO(raw.length >= 10 ? raw.slice(0, 10) : raw);
  if (isValid(iso)) return iso;
  const d = new Date(raw);
  return isValid(d) ? d : null;
}

function formatExamDateLabel(value: unknown): string {
  const d = parseExamDate(value);
  return d ? format(d, "MMM d, yyyy") : "";
}

function examTypeTags(row: AnyRow): string[] {
  const tags: string[] = [];
  if (asBool(row.is_internal_exam ?? row.isInternalExam)) tags.push("Internal");
  if (asBool(row.is_regular_exam ?? row.isRegularExam)) tags.push("Regular");
  if (asBool(row.is_supply_exam ?? row.isSupplyExam)) tags.push("Supple");
  return tags;
}

function formatExamOptionLabel(row: AnyRow): string {
  const name = pickText(row, ["exam_name", "examName"]) || "Exam";
  const from = formatExamDateLabel(
    row.from_date ?? row.fromDate ?? row.examFromDate,
  );
  const to = formatExamDateLabel(row.to_date ?? row.toDate ?? row.examToDate);
  const range = from && to ? ` (${from} - ${to})` : "";
  const tags = examTypeTags(row)
    .map((t) => `(${t})`)
    .join("");
  return `${name}${range}${tags}`;
}

function examOptionLabelNode(row: AnyRow) {
  const name = pickText(row, ["exam_name", "examName"]) || "Exam";
  const from = formatExamDateLabel(
    row.from_date ?? row.fromDate ?? row.examFromDate,
  );
  const to = formatExamDateLabel(row.to_date ?? row.toDate ?? row.examToDate);
  const range = from && to ? ` (${from} - ${to})` : "";
  return (
    <span>
      {name}
      {range}
      {examTypeTags(row).map((t) => (
        <span key={t} className="font-medium text-[#0014ff]">
          ({t})
        </span>
      ))}
    </span>
  );
}

/** Angular `getBetweenDates` — one entry per day from exam from_date → to_date. */
function getBetweenDates(fromRaw: string, toRaw: string): string[] {
  const start = parseExamDate(fromRaw);
  const end = parseExamDate(toRaw);
  if (!start || !end) return [];
  const dates: string[] = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (cur <= last) {
    dates.push(format(cur, "yyyy-MM-dd"));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

/**
 * Scoped to `.college-exam-timetable-view-table` only —
 * does not affect other DataTables.
 */
const CETV_TABLE_STYLES = `
.college-exam-timetable-view-table .cetv-summary {
  font-size: 13px;
  font-weight: 600;
  color: #1976d2;
  padding: 4px 2px 10px;
  line-height: 1.45;
}
.college-exam-timetable-view-table .cetv-legend {
  margin: 0;
  color: #000;
  font-size: 13px;
  text-align: right;
}
.college-exam-timetable-view-table .cetv-legend-swatch {
  display: inline-block;
  padding: 0 3px;
  border: 1px solid #bbbbbb;
}
.college-exam-timetable-view-table .cetv-matrix-scroll {
  overflow-x: auto;
  width: 100%;
}
.college-exam-timetable-view-table table.cetv-table {
  width: max-content;
  min-width: 100%;
  border-spacing: 1px !important;
  border-collapse: separate;
  font-size: 12px;
  margin: 0;
  table-layout: fixed;
}
.college-exam-timetable-view-table .cetv-th {
  padding: 5px !important;
  background: #c3d9ff;
  font-weight: 500;
  border: 1px solid #a8bfe8;
  color: #0d47a1;
  vertical-align: middle;
  text-align: center;
}
.college-exam-timetable-view-table .cetv-td {
  padding: 8px !important;
  text-align: left;
  font-weight: 500;
  border: 1px solid #d0d0d0;
  background: #fff;
  vertical-align: top;
}
.college-exam-timetable-view-table .cetv-th.cetv-col-empty,
.college-exam-timetable-view-table .cetv-td.cetv-col-empty {
  width: 44px !important;
  min-width: 44px !important;
  max-width: 52px !important;
  padding: 4px 2px !important;
  font-size: 12px;
  overflow: hidden;
}
.college-exam-timetable-view-table .cetv-th.cetv-col-empty p {
  font-size: 9px;
}
.college-exam-timetable-view-table .cetv-th.cetv-col-filled,
.college-exam-timetable-view-table .cetv-td.cetv-col-filled {
  width: 150px;
  min-width: 140px;
}
.college-exam-timetable-view-table .cetv-box-ext {
  position: relative;
  text-align: left;
  border: 1px solid #c5c5c5;
  padding: 2px;
  margin: 2px;
  border-radius: 3px;
  background: #92dcffee;
  cursor: default;
}
.college-exam-timetable-view-table .cetv-afternoon {
  background: #ffee23c2 !important;
}
.college-exam-timetable-view-table .cetv-subject {
  margin-right: 30px;
  display: inline-block;
}
.college-exam-timetable-view-table .cetv-exam-type {
  position: absolute;
  right: 3px;
  bottom: 2px;
  background: #ff5968;
  color: #fff;
  padding: 0 4px;
  border-radius: 3px;
  font-weight: 600;
  line-height: 1.4;
}
`;

export default function CollegeExamTimetableViewPage() {
  const [loading, setLoading] = useState(false);
  const [baseRows, setBaseRows] = useState<AnyRow[]>([]);
  const [restRows, setRestRows] = useState<AnyRow[]>([]);
  const [timeRows, setTimeRows] = useState<AnyRow[]>([]);

  const [courseId, setCourseId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [examId, setExamId] = useState<number | null>(null);
  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [courseYearId, setCourseYearId] = useState<number | null>(null);

  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );

  const courses = useMemo(
    () => dedupeBy(baseRows, (r) => pickNum(r, ["fk_course_id", "courseId"])),
    [baseRows],
  );
  const academicYears = useMemo(
    () =>
      dedupeBy(
        baseRows.filter(
          (r) => pickNum(r, ["fk_course_id", "courseId"]) === Number(courseId),
        ),
        (r) => pickNum(r, ["fk_academic_year_id", "academicYearId"]),
      ),
    [baseRows, courseId],
  );
  const exams = useMemo(
    () =>
      dedupeBy(
        baseRows.filter(
          (r) =>
            pickNum(r, ["fk_course_id", "courseId"]) === Number(courseId) &&
            pickNum(r, ["fk_academic_year_id", "academicYearId"]) ===
              Number(academicYearId),
        ),
        (r) => pickNum(r, ["fk_exam_id", "examId"]),
      ),
    [baseRows, courseId, academicYearId],
  );
  const colleges = useMemo(
    () => dedupeBy(restRows, (r) => pickNum(r, ["fk_college_id", "collegeId"])),
    [restRows],
  );
  const courseYears = useMemo(() => {
    if (collegeId == null) return [];
    const list =
      Number(collegeId) === 0
        ? restRows
        : restRows.filter(
            (r) =>
              pickNum(r, ["fk_college_id", "collegeId"]) === Number(collegeId),
          );
    return dedupeBy(list, (r) =>
      pickNum(r, ["fk_course_year_id", "courseYearId"]),
    );
  }, [restRows, collegeId]);
  const courseGroups = useMemo(() => {
    if (collegeId == null || !courseYearId) return [];
    const byCollege =
      Number(collegeId) === 0
        ? restRows
        : restRows.filter(
            (r) =>
              pickNum(r, ["fk_college_id", "collegeId"]) === Number(collegeId),
          );
    return dedupeBy(
      byCollege.filter(
        (r) =>
          pickNum(r, ["fk_course_year_id", "courseYearId"]) ===
          Number(courseYearId),
      ),
      (r) => pickNum(r, ["fk_course_group_id", "courseGroupId"]),
    );
  }, [restRows, collegeId, courseYearId]);
  const selectedExam = useMemo(
    () =>
      exams.find(
        (e) => pickNum(e, ["fk_exam_id", "examId"]) === Number(examId),
      ) ?? null,
    [exams, examId],
  );

  const dateArray = useMemo(() => {
    const fromRaw = pickText(selectedExam, ["from_date", "fromDate"]);
    const toRaw = pickText(selectedExam, ["to_date", "toDate"]);
    if (!fromRaw || !toRaw) return [];
    return getBetweenDates(fromRaw, toRaw);
  }, [selectedExam]);

  const summaryLine = useMemo(() => {
    const courseCode = pickText(
      courses.find(
        (x) => pickNum(x, ["fk_course_id", "courseId"]) === Number(courseId),
      ),
      ["course_code", "courseCode"],
    );
    const ay = pickText(
      academicYears.find(
        (x) =>
          pickNum(x, ["fk_academic_year_id", "academicYearId"]) ===
          Number(academicYearId),
      ),
      ["academic_year", "academicYear"],
    );
    const cy = pickText(
      courseYears.find(
        (x) =>
          pickNum(x, ["fk_course_year_id", "courseYearId"]) ===
          Number(courseYearId),
      ),
      ["course_year_code", "courseYearCode"],
    );
    const examName = pickText(selectedExam, ["exam_name", "examName"]);
    const from = selectedExam
      ? formatExamDateLabel(selectedExam.from_date ?? selectedExam.fromDate)
      : "";
    const to = selectedExam
      ? formatExamDateLabel(selectedExam.to_date ?? selectedExam.toDate)
      : "";
    const range = from && to ? ` (${from} - ${to})` : "";
    const tags = selectedExam ? examTypeTags(selectedExam) : [];
    return { courseCode, ay, cy, examName, range, tags };
  }, [
    courses,
    academicYears,
    courseYears,
    courseId,
    academicYearId,
    courseYearId,
    selectedExam,
  ]);

  /** O(1) lookup: `${groupId}|${ymd}` → subjects (Angular nested filter, indexed). */
  const subjectsByGroupDate = useMemo(() => {
    const map = new Map<string, AnyRow[]>();
    for (const r of timeRows) {
      const gId = pickNum(r, ["courseGroupId", "fk_course_group_id"]);
      const ymd = toYmd(pickText(r, ["examDate", "exam_date"]));
      if (!gId || !ymd) continue;
      const key = `${gId}|${ymd}`;
      const list = map.get(key);
      if (list) list.push(r);
      else map.set(key, [r]);
    }
    return map;
  }, [timeRows]);

  /** Dates that have at least one subject in any branch — empty dates use a narrow column. */
  const datesWithContent = useMemo(() => {
    const filled = new Set<string>();
    for (const g of courseGroups) {
      const gId = pickNum(g, ["fk_course_group_id", "courseGroupId"]);
      if (!gId) continue;
      for (const d of dateArray) {
        if (filled.has(d)) continue;
        const rows = subjectsByGroupDate.get(`${gId}|${d}`);
        if (rows && rows.length > 0) filled.add(d);
      }
    }
    return filled;
  }, [courseGroups, dateArray, subjectsByGroupDate]);

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const rows = await getUnivExamFiltersByType(employeeId, "ALL").catch(
          () => [],
        );
        setBaseRows(Array.isArray(rows) ? rows : []);
        const firstCourse = dedupeBy(rows, (r) =>
          pickNum(r, ["fk_course_id", "courseId"]),
        )[0];
        if (firstCourse)
          setCourseId(pickNum(firstCourse, ["fk_course_id", "courseId"]));
      } finally {
        setLoading(false);
      }
    }
    void init();
  }, [employeeId]);

  useEffect(() => {
    const sortedYears = [...academicYears].sort(
      (a, b) => Number(b.is_curr_ay ?? 0) - Number(a.is_curr_ay ?? 0),
    );
    const first = sortedYears[0];
    if (first)
      setAcademicYearId(
        pickNum(first, ["fk_academic_year_id", "academicYearId"]),
      );
  }, [academicYears]);
  useEffect(() => {
    if (exams[0]) setExamId(pickNum(exams[0], ["fk_exam_id", "examId"]));
  }, [exams]);

  useEffect(() => {
    async function loadRest() {
      if (!courseId || !academicYearId || !examId) {
        setRestRows([]);
        setCollegeId(null);
        setCourseYearId(null);
        return;
      }
      setCollegeId(null);
      setCourseYearId(null);
      const rest = await getUnivExamRestInTtFilters({
        courseId,
        examId,
        academicYearId,
        employeeId,
      }).catch(() => []);
      const list = Array.isArray(rest) ? rest : [];
      setRestRows(list);
      const uniqueColleges = dedupeBy(list, (r) =>
        pickNum(r, ["fk_college_id", "collegeId"]),
      );
      if (uniqueColleges[0]) {
        setCollegeId(
          pickNum(uniqueColleges[0], ["fk_college_id", "collegeId"]),
        );
      }
    }
    void loadRest();
  }, [courseId, academicYearId, examId, employeeId]);

  useEffect(() => {
    setCourseYearId(null);
  }, [collegeId]);

  useEffect(() => {
    async function loadTimetable() {
      if (!courseId || !courseYearId || !examId || collegeId == null) {
        setTimeRows([]);
        return;
      }
      setLoading(true);
      try {
        // Angular: collegeId == 0 → listByThreeIds; else listByFourIds (+ collegeId)
        const rows =
          Number(collegeId) === 0
            ? await getExamTimetableDetails(
                courseYearId,
                courseId,
                examId,
              ).catch(() => [])
            : await getExamTimetableDetailsByCollege({
                courseYearId,
                courseId,
                examId,
                collegeId,
              }).catch(() => []);
        const list = Array.isArray(rows) ? rows : [];
        // Angular (collegeId==0 path): filter examLabBatchName === null
        const cleaned =
          Number(collegeId) === 0
            ? list.filter((r) => r.examLabBatchName == null)
            : list;
        for (const r of cleaned) {
          if (r.shortName == null || r.shortName === "") {
            r.shortName = r.subjectCode ?? r.subject_code ?? "";
          }
        }
        setTimeRows(cleaned);
      } finally {
        setLoading(false);
      }
    }
    void loadTimetable();
  }, [courseId, courseYearId, examId, collegeId]);

  const matrixTable = (
    <div className="cetv-matrix-scroll">
      <table className="cetv-table">
        <thead>
          <tr>
            <th
              className="cetv-th"
              style={{ width: "8%", textTransform: "uppercase" }}
            >
              Branch
            </th>
            {dateArray.map((d) => {
              const hasContent = datesWithContent.has(d);
              return (
                <th
                  key={d}
                  className={`cetv-th ${hasContent ? "cetv-col-filled" : "cetv-col-empty"}`}
                >
                  {longDate(d)}
                  <p className="m-0 text-blue-600 cetv-col-empty">
                    ({dayLabel(d)})
                  </p>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {courseGroups.map((g) => {
            const gId = pickNum(g, ["fk_course_group_id", "courseGroupId"]);
            return (
              <tr key={`g-${gId}`}>
                <td
                  className="cetv-td"
                  style={{
                    width: "8%",
                    textAlign: "center",
                    textTransform: "uppercase",
                  }}
                >
                  <p className="m-0 text-blue-600">
                    {pickText(g, ["group_code", "groupCode"])}
                  </p>
                </td>
                {dateArray.map((d) => {
                  const hasContent = datesWithContent.has(d);
                  const dayRows = subjectsByGroupDate.get(`${gId}|${d}`) ?? [];
                  return (
                    <td
                      key={`${gId}-${d}`}
                      className={`cetv-td ${hasContent ? "cetv-col-filled" : "cetv-col-empty"}`}
                      style={{ textAlign: "center", position: "relative" }}
                    >
                      {dayRows.length === 0 ? (
                        <span>-</span>
                      ) : (
                        dayRows.map((r, i) => {
                          const batch = pickText(r, ["examLabBatchName"]);
                          return (
                            <p
                              key={`${gId}-${d}-${i}-${pickNum(r, ["subjectId", "fk_subject_id"])}`}
                              className={`cetv-box-ext${isAfternoonSession(r) ? " cetv-afternoon" : ""}`}
                            >
                              <span className="cetv-subject">
                                {pickText(r, ["subjectCode", "subject_code"])}
                                {batch ? ` (${batch})` : ""}
                              </span>
                              <span className="cetv-exam-type">
                                {examTypeChar(r)}
                              </span>
                            </p>
                          );
                        })
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
          {courseGroups.length === 0 && (
            <tr>
              <td
                colSpan={Math.max(2, dateArray.length + 1)}
                className="cetv-td py-6 text-center text-muted-foreground"
              >
                {loading
                  ? "Loading timetable..."
                  : "No timetable data found for selected filters."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <FilteredPage
      title="College Exam Timetable View"
      filters={
        <GlobalFilterBarRow>
          <GlobalFilterField label="Course">
            <Select
              value={courseId ? String(courseId) : null}
              onChange={(v) => setCourseId(v ? Number(v) : null)}
              options={courses.map((c) => ({
                value: String(pickNum(c, ["fk_course_id", "courseId"])),
                label: pickText(c, ["course_code", "courseCode"]),
              }))}
            />
          </GlobalFilterField>
          <GlobalFilterField label="Exam Year">
            <Select
              value={academicYearId ? String(academicYearId) : null}
              onChange={(v) => setAcademicYearId(v ? Number(v) : null)}
              options={academicYears.map((a) => ({
                value: String(
                  pickNum(a, ["fk_academic_year_id", "academicYearId"]),
                ),
                label: pickText(a, ["academic_year", "academicYear"]),
              }))}
            />
          </GlobalFilterField>
          <GlobalFilterField label="Exam Master" style={{ minWidth: "35%" }}>
            <Select
              value={examId ? String(examId) : null}
              onChange={(v) => setExamId(v ? Number(v) : null)}
              searchable
              options={exams.map((e) => {
                const label = formatExamOptionLabel(e);
                return {
                  value: String(pickNum(e, ["fk_exam_id", "examId"])),
                  label,
                  labelNode: examOptionLabelNode(e),
                };
              })}
            />
          </GlobalFilterField>
          <GlobalFilterField label="College">
            <Select
              value={collegeId ? String(collegeId) : null}
              onChange={(v) => setCollegeId(v ? Number(v) : null)}
              options={colleges.map((c) => ({
                value: String(pickNum(c, ["fk_college_id", "collegeId"])),
                label: pickText(c, ["college_code", "collegeCode"]),
              }))}
            />
          </GlobalFilterField>
          <GlobalFilterField label="Course Year">
            <Select
              value={courseYearId ? String(courseYearId) : null}
              onChange={(v) => setCourseYearId(v ? Number(v) : null)}
              options={courseYears.map((y) => ({
                value: String(
                  pickNum(y, ["fk_course_year_id", "courseYearId"]),
                ),
                label: pickText(y, ["course_year_code", "courseYearCode"]),
              }))}
              placeholder="Select Course Year"
            />
          </GlobalFilterField>
        </GlobalFilterBarRow>
      }
    >
      {Boolean(courseYearId) && (
        <div className="college-exam-timetable-view-table">
          {/*
            DataTable = card + title + legend.
            AG Grid is suppressed (hideEmptyGrid) — a 100+ day matrix with React
            cell renderers is too slow; Angular uses a plain HTML table for the same reason.
          */}
          <DataTable
            title={`${summaryLine.courseCode} / ${summaryLine.ay} / ${summaryLine.cy} - (${summaryLine.examName}${summaryLine.range}${summaryLine.tags
              .map((t) => ` [${t}]`)
              .join("")})`}
            bordered
            toolbar={false}
            pagination={false}
            columnFilters={false}
            hideEmptyGrid
            loading={false}
            rowData={[]}
            columnDefs={SHELL_COL_DEFS}
            toolbarFooter={
              <p className="cetv-legend">
                <span className="cetv-legend-swatch bg-[#99deff]">M</span>{" "}
                MORNING
                <span className="cetv-legend-swatch ml-2 bg-[#fff258]">
                  A
                </span>{" "}
                AFTERNOON
              </p>
            }
            afterGrid={matrixTable}
          />

          <style>{CETV_TABLE_STYLES}</style>
        </div>
      )}
    </FilteredPage>
  );
}
