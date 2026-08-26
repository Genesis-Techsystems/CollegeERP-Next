"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef } from "ag-grid-community";
import { FilteredListPage, TableContextHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Select } from "@/common/components/select";
import { escapeHtml, exportHtmlTableAsExcel } from "@/common/components/table";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { rowIndexGetter } from "@/lib/utils";
import {
  getGradeMemoIssueFilters,
  getGradeMemoIssueRestFilters,
  getCollegeById,
  getInvigilatorsRemunerationReport,
} from "@/services";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  Building2,
  CalendarDays,
  ClipboardList,
  FileSpreadsheet,
  GraduationCap,
  Printer,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { printInvigilatorsRemunerationReport } from "../_components/printInvigilatorsRemunerationReport";

type AnyRow = Record<string, any>;

const TOOLBAR = {
  search: true,
  searchPlaceholder: "Search...",
  columnPicker: true,
  exportPdf: false,
  exportExcel: false,
} as const;

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

export default function InvigilatorsRemunerationReportPage() {
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
  const [skipAutoSelect, setSkipAutoSelect] = useState(false);

  const [rows, setRows] = useState<AnyRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [filterSummary, setFilterSummary] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [collegeLogo, setCollegeLogo] = useState("");

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

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      {
        headerName: "S.No",
        valueGetter: rowIndexGetter,
        width: 80,
        flex: 0,
        suppressMovable: true,
      },
      ...columns.map(
        (col) =>
          ({
            headerName: col,
            field: col,
            minWidth: 140,
            flex: 1,
            suppressMovable: true,
            valueGetter: (p) => String(p.data?.[col] ?? ""),
          }) as ColDef<AnyRow>,
      ),
    ],
    [columns],
  );

  const getRowId = useCallback((p: { data?: AnyRow }) => {
    const emp = strFrom(p.data ?? {}, ["Employee_Number", "employee_number"]);
    return emp || `row-${Math.random()}`;
  }, []);

  function clearResults() {
    setRows([]);
    setColumns([]);
    setFilterSummary("");
    setCollegeName("");
    setCollegeLogo("");
  }

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      try {
        const list = await getGradeMemoIssueFilters(employeeId);
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
        return;
      }
      setLoading(true);
      try {
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

  async function handleGetReport() {
    if (!courseId || !academicYearId || !examId || !collegeId) {
      toastError("Please select Course, Exam Year, Exam, and College");
      return;
    }
    setLoading(true);
    clearResults();
    try {
      const [list, collegeDetails] = await Promise.all([
        getInvigilatorsRemunerationReport({ examId }),
        getCollegeById(collegeId).catch(() => null),
      ]);
      if (list.length === 0) {
        toastSuccess("No Records Found.");
        return;
      }
      const nextColumns = Object.keys(list[0] ?? {});
      setRows(list);
      setColumns(nextColumns);

      const college = colleges.find(
        (r) => numFrom(r, ["fk_college_id", "collegeId"]) === collegeId,
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
      const collegeCode = strFrom(college ?? {}, [
        "college_code",
        "collegeCode",
      ]);
      setCollegeName(
        collegeDetails?.collegeName ||
          strFrom(college ?? {}, ["college_name", "collegeName"]),
      );
      setCollegeLogo(collegeDetails?.logo ?? "");
      setFilterSummary(
        [collegeCode, courseCode, examName].filter(Boolean).join(" / "),
      );
      toastSuccess("Data retrieved successfully");
    } catch (error) {
      toastError(error, "Failed to load invigilator remuneration report");
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
    setRestRows([]);
  }

  const handlePrint = useCallback(() => {
    if (rows.length === 0) return;
    printInvigilatorsRemunerationReport(rows, {
      title: "Invigilator Remuneration Report",
      collegeName,
      collegeLogo,
      filterSummary,
      columns,
    });
  }, [rows, collegeName, collegeLogo, filterSummary, columns]);

  const handleExport = useCallback(() => {
    if (rows.length === 0 || columns.length === 0) return;
    const header = ["S.No", ...columns]
      .map((column) => `<th>${escapeHtml(column)}</th>`)
      .join("");
    const body = rows
      .map(
        (row, index) =>
          `<tr><td>${index + 1}</td>${columns
            .map(
              (column) => `<td>${escapeHtml(String(row[column] ?? ""))}</td>`,
            )
            .join("")}</tr>`,
      )
      .join("");
    exportHtmlTableAsExcel(
      "Invigilator Remuneration Report.xls",
      `<table border="1"><caption>Invigilator Remuneration Report</caption><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`,
    );
  }, [rows, columns]);

  return (
    <FilteredListPage
      title="Invigilator Remuneration Report"
      filters={
        <div className="inv-allot-report-filters space-y-2">
          <div className="inv-allot-report-filters__row">
            <div className="inv-allot-report-filters__fx20">
              <GlobalFilterField label="Course">
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
            </div>
            <div className="inv-allot-report-filters__fx20">
              <GlobalFilterField label="Exam Year">
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
            </div>
            <div className="inv-allot-report-filters__fx60">
              <GlobalFilterField label="Exam Master">
                <Select
                  value={examId ? String(examId) : null}
                  onChange={(v) => {
                    setSkipAutoSelect(false);
                    clearResults();
                    setExamId(v ? Number(v) : null);
                  }}
                  options={exams.map((r) => ({
                    value: String(numFrom(r, ["fk_exam_id", "examId"])),
                    label: strFrom(r, ["exam_name", "examName"]),
                  }))}
                  placeholder="Exam Master"
                  searchable
                />
              </GlobalFilterField>
            </div>
          </div>
          <div className="inv-allot-report-filters__row">
            <div className="inv-allot-report-filters__fx20">
              <GlobalFilterField label="College">
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
            </div>
            <div className=" flex shrink-0 items-center gap-3  pb-0.5 inv-allot-report-filters__fx20">
              <Button
                type="button"
                className="h-8 text-[12px] w-full"
                onClick={() => void handleGetReport()}
                disabled={loading}
              >
                {loading ? "Loading..." : "Get Report"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-[30px] w-[30px]"
                title="Reset"
                onClick={handleReset}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      }
      rowData={rows}
      columnDefs={columnDefs}
      resultsVisible={rows.length > 0}
      loading={loading}
      pagination
      paginationPageSize={25}
      getRowId={getRowId}
      onExportExcel={handleExport}
      onExportPdf={handlePrint}
      toolbarTrailing={
        <>
          <Button
            type="button"
            size="sm"
            className="h-9 px-3 text-[12px]"
            onClick={handleExport}
          >
            <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
            Export Excel
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-9 px-3 text-[12px]"
            onClick={handlePrint}
          >
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Print Report
          </Button>
        </>
      }
      toolbar={{
        ...TOOLBAR,
        excelDocumentTitle: "Invigilator Remuneration Report",
        excelFileName: "Invigilator Remuneration Report.xls",
        pdfDocumentTitle: "Invigilator Remuneration Report",
      }}
      tableHeader={
        filterSummary ? (
          <TableContextHeader
            title="Invigilator Remuneration Report"
            info={filterSummary}
          />
        ) : null
      }
    />
  );
}
