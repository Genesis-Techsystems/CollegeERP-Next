"use client";

/**
 * Internal Marks Report — Angular `internal-marks-entry-report`.
 * Two-row filters (Course/Exam Year/Exam Master + College/Group/Years + Get Report + Reset icon).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef } from "ag-grid-community";
import { format, parseISO } from "date-fns";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Select } from "@/common/components/select";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { exportHtmlTableAsExcel } from "@/common/export-html-table";
import { rowIndexGetter } from "@/lib/utils";
import {
  getGradeMemoIssueRestFilters,
  getInternalMarksEntryFilters,
  getInternalMarksReport,
} from "@/services";
import { toastError, toastInfo } from "@/lib/toast";
import {
  Building2,
  CalendarDays,
  ClipboardList,
  FileSpreadsheet,
  GraduationCap,
  Layers,
  Printer,
  RotateCcw,
  School,
} from "lucide-react";
import { useCollegeLogo } from "@/hooks/useCollegeLogo";
import {
  printInternalMarksReport,
  type SubjectCol,
} from "../_components/printInternalMarksReport";

type AnyRow = Record<string, any>;

const TOOLBAR = {
  search: true,
  searchPlaceholder: "Search...",
  columnPicker: true,
  exportPdf: false,
  exportExcel: false,
} as const;

function parseMaybeDate(v: unknown): string {
  const s = String(v ?? "").trim();
  if (!s) return "";
  try {
    if (/^\d{4}-\d{2}-\d{2}/.test(s))
      return format(parseISO(s.slice(0, 10)), "dd MMM, yyyy");
    return format(new Date(s), "dd MMM, yyyy");
  } catch {
    return s;
  }
}

/** Angular exam option: name (from - to) (Internal|Regular|Supple) */
function examMasterLabel(r: AnyRow): string {
  const name = strFrom(r, ["exam_name", "examName"]) || "Exam";
  const from = parseMaybeDate(r.from_date ?? r.fromDate);
  const to = parseMaybeDate(r.to_date ?? r.toDate);
  const range = from && to ? ` (${from} - ${to})` : "";
  const tags = [
    r.is_internal_exam || r.isInternalExam ? "Internal" : "",
    r.is_regular_exam || r.isRegularExam ? "Regular" : "",
    r.is_supply_exam || r.isSupplyExam ? "Supple" : "",
  ]
    .filter(Boolean)
    .join(", ");
  const suffix = tags ? ` (${tags})` : "";
  return `${name}${range}${suffix}`;
}

function numFrom(row: AnyRow, keys: string[]): number {
  for (const key of keys) {
    const n = Number(row?.[key]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function strFrom(row: AnyRow, keys: string[]): string {
  for (const key of keys) {
    const v = String(row?.[key] ?? "").trim();
    if (v) return v;
  }
  return "";
}

function dedupeBy(rows: AnyRow[], keys: string[]): AnyRow[] {
  const seen = new Set<number>();
  const out: AnyRow[] = [];
  for (const row of rows) {
    const id = numFrom(row, keys);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(row);
  }
  return out;
}

function findMarks(
  list: AnyRow[],
  subjectCode: string,
  markType: string,
): string | number {
  const subject = list.find(
    (item) => String(item.subject_code ?? "") === subjectCode,
  );
  if (!subject) return " ";
  const v = subject[markType];
  return v == null || String(v).trim() === "" ? " " : (v as string | number);
}

function rowTotal(list: AnyRow[], subjectCols: SubjectCol[]): number {
  return subjectCols.reduce((sum, col) => {
    const mark = Number(findMarks(list, col.subject_code, "marks"));
    return sum + (Number.isFinite(mark) ? mark : 0);
  }, 0);
}

function buildSubjectCols(flat: AnyRow[]): SubjectCol[] {
  const seen = new Set<string>();
  const out: SubjectCol[] = [];
  for (const row of flat) {
    const code = strFrom(row, ["subject_code"]);
    if (!code || seen.has(code)) continue;
    seen.add(code);
    out.push({
      subject_code: code,
      subject_name: strFrom(row, ["subject_name"]),
    });
  }
  return out;
}

function buildMainList(flat: AnyRow[]): AnyRow[][] {
  const seen = new Set<string>();
  const students: AnyRow[] = [];
  for (const row of flat) {
    const roll = strFrom(row, ["roll_number"]);
    if (!roll || seen.has(roll)) continue;
    seen.add(roll);
    students.push(row);
  }
  return students.map((stu) => {
    const roll = strFrom(stu, ["roll_number"]);
    return flat.filter((r) => strFrom(r, ["roll_number"]) === roll);
  });
}

function flattenInternalMarksRows(
  groups: AnyRow[][],
  subjectCols: SubjectCol[],
): AnyRow[] {
  return groups.map((list) => {
    const first = list[0] ?? {};
    const row: AnyRow = {
      roll_number: strFrom(first, ["roll_number"]),
      total_max_marks: strFrom(first, ["total_max_marks"]),
      total_percentage: strFrom(first, ["total_percentage"]),
      total_marks_scored: rowTotal(list, subjectCols),
    };
    for (const col of subjectCols) {
      row[col.subject_code] = findMarks(list, col.subject_code, "marks");
    }
    return row;
  });
}

export default function InternalMarksReportPage() {
  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );

  const [loading, setLoading] = useState(false);
  const [baseRows, setBaseRows] = useState<AnyRow[]>([]);
  const [restRows, setRestRows] = useState<AnyRow[]>([]);

  const [courseId, setCourseId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [examId, setExamId] = useState<number | null>(null);
  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [courseGroupId, setCourseGroupId] = useState<number>(0);
  const [courseYearId, setCourseYearId] = useState<number>(0);
  const [skipAutoSelect, setSkipAutoSelect] = useState(false);

  const [flatRows, setFlatRows] = useState<AnyRow[]>([]);
  const [filterSummary, setFilterSummary] = useState("");
  const [showTable, setShowTable] = useState(false);

  const collegeLogo = useCollegeLogo(collegeId);

  const courses = useMemo(
    () => dedupeBy(baseRows, ["fk_course_id", "courseId"]),
    [baseRows],
  );
  const academicYears = useMemo(
    () =>
      dedupeBy(
        baseRows.filter(
          (r) => numFrom(r, ["fk_course_id", "courseId"]) === Number(courseId),
        ),
        ["fk_academic_year_id", "academicYearId"],
      ).sort(
        (a, b) =>
          Number(strFrom(b, ["academic_year", "academicYear"])) -
          Number(strFrom(a, ["academic_year", "academicYear"])),
      ),
    [baseRows, courseId],
  );
  const exams = useMemo(
    () =>
      dedupeBy(
        baseRows.filter(
          (r) =>
            numFrom(r, ["fk_course_id", "courseId"]) === Number(courseId) &&
            numFrom(r, ["fk_academic_year_id", "academicYearId"]) ===
              Number(academicYearId),
        ),
        ["fk_exam_id", "examId"],
      ),
    [baseRows, courseId, academicYearId],
  );
  const colleges = useMemo(
    () =>
      dedupeBy(restRows, ["fk_college_id", "collegeId"]).sort(
        (a, b) =>
          Number(a.clg_sort_order ?? a.sort_order ?? 0) -
          Number(b.clg_sort_order ?? b.sort_order ?? 0),
      ),
    [restRows],
  );
  const courseGroups = useMemo(
    () =>
      dedupeBy(
        restRows.filter(
          (r) =>
            !collegeId ||
            numFrom(r, ["fk_college_id", "collegeId"]) === Number(collegeId),
        ),
        ["fk_course_group_id", "courseGroupId"],
      ),
    [restRows, collegeId],
  );
  const courseYears = useMemo(
    () =>
      dedupeBy(
        restRows.filter(
          (r) =>
            (!collegeId ||
              numFrom(r, ["fk_college_id", "collegeId"]) ===
                Number(collegeId)) &&
            (courseGroupId === 0 ||
              numFrom(r, ["fk_course_group_id", "courseGroupId"]) ===
                Number(courseGroupId)),
        ),
        ["fk_course_year_id", "courseYearId"],
      ).sort(
        (a, b) => Number(a.cy_sort_order ?? 0) - Number(b.cy_sort_order ?? 0),
      ),
    [restRows, collegeId, courseGroupId],
  );

  const subjectCols = useMemo(() => buildSubjectCols(flatRows), [flatRows]);
  const mainList = useMemo(() => buildMainList(flatRows), [flatRows]);
  const maxMarksBySubject = useMemo(() => {
    const map: Record<string, string | number> = {};
    for (const col of subjectCols) {
      map[col.subject_code] = findMarks(
        flatRows,
        col.subject_code,
        "max_marks",
      );
    }
    return map;
  }, [flatRows, subjectCols]);

  const tableRows = useMemo(
    () => flattenInternalMarksRows(mainList, subjectCols),
    [mainList, subjectCols],
  );

  const columnDefs = useMemo<ColDef<AnyRow>[]>(() => {
    const fixed: ColDef<AnyRow>[] = [
      {
        headerName: "S.No",
        valueGetter: rowIndexGetter,
        width: 80,
        flex: 0,
      },
      {
        headerName: "Hall Ticket No.",
        field: "roll_number",
        width: 160,
        minWidth: 160,
        flex: 0,
        pinned: "left",
      },
    ];
    const subjectColDefs: ColDef<AnyRow>[] = subjectCols.map((col) => {
      const max = maxMarksBySubject[col.subject_code] ?? " ";
      return {
        headerName: `${col.subject_code} (${col.subject_name}) Max(${max})`,
        colId: col.subject_code,
        minWidth: 150,
        width: 150,
        cellClass: "text-center",
        headerClass: "ag-center-header",
        valueGetter: (p) => String(p.data?.[col.subject_code] ?? " "),
      };
    });
    const tail: ColDef<AnyRow>[] = [
      {
        headerName: "Total Marks Scored",
        field: "total_marks_scored",
        minWidth: 130,
        width: 130,
        cellClass: "text-center",
      },
      {
        headerName: "Total Maximum Marks",
        field: "total_max_marks",
        minWidth: 140,
        width: 140,
        cellClass: "text-center",
      },
      {
        headerName: "Percentage (%)",
        field: "total_percentage",
        minWidth: 120,
        width: 120,
        cellClass: "text-center",
      },
    ];
    return [...fixed, ...subjectColDefs, ...tail];
  }, [subjectCols, maxMarksBySubject]);

  const getRowId = useCallback(
    (p: { data?: AnyRow }) =>
      strFrom(p.data ?? {}, ["roll_number"]) || `row-${Math.random()}`,
    [],
  );

  function clearResults() {
    setFlatRows([]);
    setFilterSummary("");
    setShowTable(false);
  }

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      try {
        const list = await getInternalMarksEntryFilters(employeeId);
        if (cancelled) return;
        setBaseRows(list);
        const firstCourse = dedupeBy(list, ["fk_course_id", "courseId"])[0];
        setSkipAutoSelect(false);
        setCourseId(
          firstCourse
            ? numFrom(firstCourse, ["fk_course_id", "courseId"])
            : null,
        );
      } catch {
        if (!cancelled) toastError("Failed to load filters");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void init();
    return () => {
      cancelled = true;
    };
  }, [employeeId]);

  useEffect(() => {
    if (!courseId) {
      setAcademicYearId(null);
      return;
    }
    if (skipAutoSelect) return;
    const years = dedupeBy(
      baseRows.filter(
        (r) => numFrom(r, ["fk_course_id", "courseId"]) === Number(courseId),
      ),
      ["fk_academic_year_id", "academicYearId"],
    ).sort(
      (a, b) =>
        Number(strFrom(b, ["academic_year", "academicYear"])) -
        Number(strFrom(a, ["academic_year", "academicYear"])),
    );
    setAcademicYearId(
      years[0]
        ? numFrom(years[0], ["fk_academic_year_id", "academicYearId"])
        : null,
    );
  }, [courseId, baseRows, skipAutoSelect]);

  useEffect(() => {
    if (!courseId || !academicYearId) {
      setExamId(null);
      return;
    }
    if (skipAutoSelect) return;
    const list = dedupeBy(
      baseRows.filter(
        (r) =>
          numFrom(r, ["fk_course_id", "courseId"]) === Number(courseId) &&
          numFrom(r, ["fk_academic_year_id", "academicYearId"]) ===
            Number(academicYearId),
      ),
      ["fk_exam_id", "examId"],
    );
    setExamId(list[0] ? numFrom(list[0], ["fk_exam_id", "examId"]) : null);
  }, [courseId, academicYearId, baseRows, skipAutoSelect]);

  useEffect(() => {
    let cancelled = false;
    async function loadRest() {
      if (!courseId || !academicYearId || !examId) {
        setRestRows([]);
        setCollegeId(null);
        setCourseGroupId(0);
        setCourseYearId(0);
        return;
      }
      setLoading(true);
      try {
        // Angular report selectedExam(): rest filters with in_flag_type ALL
        const rest = await getGradeMemoIssueRestFilters({
          courseId,
          academicYearId,
          examId,
          employeeId,
        });
        if (cancelled) return;
        setRestRows(rest);
        if (skipAutoSelect) {
          setCollegeId(null);
          setCourseGroupId(0);
          setCourseYearId(0);
          return;
        }
        const nextColleges = dedupeBy(rest, [
          "fk_college_id",
          "collegeId",
        ]).sort(
          (a, b) =>
            Number(a.clg_sort_order ?? a.sort_order ?? 0) -
            Number(b.clg_sort_order ?? b.sort_order ?? 0),
        );
        setCollegeId(
          nextColleges[0]
            ? numFrom(nextColleges[0], ["fk_college_id", "collegeId"])
            : null,
        );
      } catch {
        if (!cancelled) toastError("Failed to load college filters");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadRest();
    return () => {
      cancelled = true;
    };
  }, [courseId, academicYearId, examId, employeeId, skipAutoSelect]);

  useEffect(() => {
    if (skipAutoSelect) return;
    if (!collegeId) {
      setCourseGroupId(0);
      return;
    }
    const groups = dedupeBy(
      restRows.filter(
        (r) => numFrom(r, ["fk_college_id", "collegeId"]) === Number(collegeId),
      ),
      ["fk_course_group_id", "courseGroupId"],
    );
    setCourseGroupId(
      groups[0]
        ? numFrom(groups[0], ["fk_course_group_id", "courseGroupId"])
        : 0,
    );
  }, [collegeId, restRows, skipAutoSelect]);

  useEffect(() => {
    if (skipAutoSelect) return;
    const years = dedupeBy(
      restRows.filter(
        (r) =>
          (!collegeId ||
            numFrom(r, ["fk_college_id", "collegeId"]) === Number(collegeId)) &&
          (courseGroupId === 0 ||
            numFrom(r, ["fk_course_group_id", "courseGroupId"]) ===
              Number(courseGroupId)),
      ),
      ["fk_course_year_id", "courseYearId"],
    ).sort(
      (a, b) => Number(a.cy_sort_order ?? 0) - Number(b.cy_sort_order ?? 0),
    );
    setCourseYearId(
      years[0] ? numFrom(years[0], ["fk_course_year_id", "courseYearId"]) : 0,
    );
  }, [collegeId, courseGroupId, restRows, skipAutoSelect]);

  async function handleGetReport() {
    if (!courseId || !academicYearId || !examId || !collegeId) {
      toastError("Please select Course, Exam Year, Exam, and College");
      return;
    }
    setLoading(true);
    setFlatRows([]);
    setFilterSummary("");
    setShowTable(false);
    try {
      const rows = await getInternalMarksReport({
        examId,
        collegeId,
        courseGroupId,
        courseYearId,
      });
      if (rows.length === 0) {
        // Angular: snotifyService.success(result.message) when no data
        toastInfo("No Record(s) found");
        return;
      }
      setFlatRows(rows);
      setShowTable(true);

      const collegeCode = strFrom(
        colleges.find(
          (r) => numFrom(r, ["fk_college_id", "collegeId"]) === collegeId,
        ) ?? {},
        ["college_code", "collegeCode"],
      );
      const courseCode = strFrom(
        courses.find(
          (r) => numFrom(r, ["fk_course_id", "courseId"]) === courseId,
        ) ?? {},
        ["course_code", "courseCode"],
      );
      const examName = strFrom(
        exams.find((r) => numFrom(r, ["fk_exam_id", "examId"]) === examId) ??
          {},
        ["exam_name", "examName"],
      );
      const groupCode =
        courseGroupId === 0
          ? "All"
          : strFrom(
              courseGroups.find(
                (r) =>
                  numFrom(r, ["fk_course_group_id", "courseGroupId"]) ===
                  courseGroupId,
              ) ?? {},
              ["group_code", "groupCode"],
            );
      const yearCode =
        courseYearId === 0
          ? "All"
          : strFrom(
              courseYears.find(
                (r) =>
                  numFrom(r, ["fk_course_year_id", "courseYearId"]) ===
                  courseYearId,
              ) ?? {},
              ["course_year_code", "courseYearCode"],
            );
      setFilterSummary(
        [collegeCode, courseCode, groupCode, yearCode, examName]
          .filter(Boolean)
          .join(" / "),
      );
    } catch (e) {
      // Angular success toast for "No Record(s) found"; toastError maps that to info
      toastError(e, "Failed to load internal marks report");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setSkipAutoSelect(true);
    clearResults();
    setCourseId(null);
    setAcademicYearId(null);
    setExamId(null);
    setCollegeId(null);
    setCourseGroupId(0);
    setCourseYearId(0);
    setRestRows([]);
  }

  const handleExportExcel = useCallback(() => {
    if (mainList.length === 0) return;
    const headerCells = [
      "<th>S.No</th>",
      "<th>Hall Ticket No.</th>",
      ...subjectCols.map(
        (col) =>
          `<th>${col.subject_code}<br/>(${col.subject_name})<br/>Max Marks(${maxMarksBySubject[col.subject_code] ?? " "})</th>`,
      ),
      "<th>Total Marks Scored</th>",
      "<th>Total Maximum Marks</th>",
      "<th>Percentage (%)</th>",
    ].join("");
    const body = mainList
      .map((list, i) => {
        const first = list[0] ?? {};
        const subjectCells = subjectCols
          .map(
            (col) => `<td>${findMarks(list, col.subject_code, "marks")}</td>`,
          )
          .join("");
        return `<tr>
          <td>${i + 1}</td>
          <td>${strFrom(first, ["roll_number"])}</td>
          ${subjectCells}
          <td>${rowTotal(list, subjectCols)}</td>
          <td>${strFrom(first, ["total_max_marks"])}</td>
          <td>${strFrom(first, ["total_percentage"])}</td>
        </tr>`;
      })
      .join("");
    const caption = `<caption>Internal Marks Report${filterSummary ? ` (${filterSummary})` : ""}</caption>`;
    exportHtmlTableAsExcel(
      "Internal Marks Report.xls",
      `<table border="1" cellspacing="0" cellpadding="4">${caption}<thead><tr>${headerCells}</tr></thead><tbody>${body}</tbody></table>`,
    );
  }, [mainList, subjectCols, maxMarksBySubject, filterSummary]);

  const handlePrint = useCallback(() => {
    if (mainList.length === 0) return;
    const college = colleges.find(
      (r) => numFrom(r, ["fk_college_id", "collegeId"]) === collegeId,
    );
    const orgCode = String(
      globalThis?.localStorage?.getItem("orgCode") ?? "",
    ).trim();
    printInternalMarksReport(mainList, {
      title: "Internal Marks Report",
      filterSummary,
      collegeName: strFrom(college ?? {}, ["college_name", "collegeName"]),
      logoUrl: collegeLogo,
      orgCode,
      subjectCols,
      maxMarksBySubject,
    });
  }, [
    mainList,
    colleges,
    collegeId,
    filterSummary,
    collegeLogo,
    subjectCols,
    maxMarksBySubject,
  ]);

  return (
    <FilteredListPage
      title="Internal Marks Report"
      filters={
        <div className="space-y-3">
          {/* Angular fxFlex: Course 20 / Exam Year 20 / Exam Master 60 */}
          <GlobalFilterBarRow className="global-filter-bar__row--mbs-r1">
            <GlobalFilterField
              label="Course"
              icon={GraduationCap}
              className="global-filter-field--fx20"
            >
              <Select
                value={courseId ? String(courseId) : null}
                onChange={(v) => {
                  setSkipAutoSelect(false);
                  clearResults();
                  setCourseId(v ? Number(v) : null);
                }}
                options={courses.map((r) => ({
                  value: String(numFrom(r, ["fk_course_id", "courseId"])),
                  label: strFrom(r, [
                    "course_code",
                    "courseCode",
                    "course_name",
                  ]),
                }))}
                placeholder="Course"
                searchable
                isLoading={loading && baseRows.length === 0}
              />
            </GlobalFilterField>
            <GlobalFilterField
              label="Exam Year"
              icon={CalendarDays}
              className="global-filter-field--fx20"
            >
              <Select
                value={academicYearId ? String(academicYearId) : null}
                onChange={(v) => {
                  setSkipAutoSelect(false);
                  clearResults();
                  setAcademicYearId(v ? Number(v) : null);
                }}
                options={academicYears.map((r) => ({
                  value: String(
                    numFrom(r, ["fk_academic_year_id", "academicYearId"]),
                  ),
                  label: strFrom(r, ["academic_year", "academicYear"]),
                }))}
                placeholder="Exam Year"
                searchable
              />
            </GlobalFilterField>
            <GlobalFilterField
              label="Exam Master"
              icon={ClipboardList}
              className="global-filter-field--fx60"
            >
              <Select
                value={examId ? String(examId) : null}
                onChange={(v) => {
                  setSkipAutoSelect(false);
                  clearResults();
                  setExamId(v ? Number(v) : null);
                }}
                options={exams.map((r) => ({
                  value: String(numFrom(r, ["fk_exam_id", "examId"])),
                  label: examMasterLabel(r),
                }))}
                placeholder="Exam Master"
                searchable
              />
            </GlobalFilterField>
          </GlobalFilterBarRow>

          {/* Angular fxFlex: College 20 / Course Group 20 / Course Years 20 / Get Report 15 */}
          <GlobalFilterBarRow className="global-filter-bar__row--mbs-r2">
            <GlobalFilterField
              label="College"
              icon={Building2}
              className="global-filter-field--fx20"
            >
              <Select
                value={collegeId ? String(collegeId) : null}
                onChange={(v) => {
                  setSkipAutoSelect(false);
                  clearResults();
                  setCollegeId(v ? Number(v) : null);
                }}
                options={colleges.map((r) => ({
                  value: String(numFrom(r, ["fk_college_id", "collegeId"])),
                  label: strFrom(r, [
                    "college_code",
                    "collegeCode",
                    "college_name",
                  ]),
                }))}
                placeholder="College"
                searchable
                isLoading={Boolean(examId) && loading}
              />
            </GlobalFilterField>
            <GlobalFilterField
              label="Course Group"
              icon={Layers}
              className="global-filter-field--fx20"
            >
              <Select
                value={String(courseGroupId)}
                onChange={(v) => {
                  setSkipAutoSelect(false);
                  clearResults();
                  setCourseGroupId(v ? Number(v) : 0);
                }}
                options={[
                  { value: "0", label: "All" },
                  ...courseGroups.map((r) => ({
                    value: String(
                      numFrom(r, ["fk_course_group_id", "courseGroupId"]),
                    ),
                    label: strFrom(r, [
                      "group_code",
                      "groupCode",
                      "group_name",
                    ]),
                  })),
                ]}
                placeholder="Course Group"
                searchable
              />
            </GlobalFilterField>
            <GlobalFilterField
              label="Course Years"
              icon={School}
              className="global-filter-field--fx20"
            >
              <Select
                value={String(courseYearId)}
                onChange={(v) => {
                  setSkipAutoSelect(false);
                  clearResults();
                  setCourseYearId(v ? Number(v) : 0);
                }}
                options={[
                  { value: "0", label: "All" },
                  ...courseYears.map((r) => ({
                    value: String(
                      numFrom(r, ["fk_course_year_id", "courseYearId"]),
                    ),
                    label: strFrom(r, [
                      "course_year_code",
                      "courseYearCode",
                      "course_year",
                    ]),
                  })),
                ]}
                placeholder="Course Years"
                searchable
              />
            </GlobalFilterField>
            <div className="global-filter-field global-filter-field--action global-filter-field--fx15 flex items-center self-end pb-0.5">
              <Button
                type="button"
                className="h-8 text-[12px]"
                onClick={() => void handleGetReport()}
                disabled={loading}
              >
                {loading ? "Loading..." : "Get Report"}
              </Button>
            </div>
            <div className="global-filter-field global-filter-field--action global-filter-field--fx10 flex items-center self-end pb-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleReset}
                title="Reset"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </GlobalFilterBarRow>
        </div>
      }
      showTable={showTable}
      rowData={showTable ? tableRows : []}
      columnDefs={columnDefs}
      loading={loading}
      pagination
      paginationPageSize={25}
      getRowId={getRowId}
      fitColumnsToWidth={false}
      toolbar={TOOLBAR}
      toolbarTrailing={
        showTable && mainList.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              className="h-9 text-[12px]"
              onClick={handleExportExcel}
            >
              <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
              Export Excel
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-9 text-[12px]"
              onClick={handlePrint}
            >
              <Printer className="mr-1.5 h-3.5 w-3.5" />
              Print Report
            </Button>
          </div>
        ) : undefined
      }
      tableHeader={
        filterSummary ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-primary">{filterSummary}</p>
          </div>
        ) : null
      }
    />
  );
}
