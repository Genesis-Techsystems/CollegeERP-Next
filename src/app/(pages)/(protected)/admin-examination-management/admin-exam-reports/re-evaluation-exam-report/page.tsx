"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef } from "ag-grid-community";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Select } from "@/common/components/select";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { rowIndexGetter } from "@/lib/utils";
import {
  getGeneralDetails,
  getGradeMemoIssueFilters,
  getGradeMemoIssueRestFilters,
  getReEvaluationExamReport,
} from "@/services";
import { GM_CODES } from "@/config/constants/ui";
import { toastError, toastInfo } from "@/lib/toast";
import { useCollegeLogo } from "@/hooks/useCollegeLogo";
import {
  CalendarDays,
  ClipboardList,
  FileSpreadsheet,
  GraduationCap,
  Layers,
  Printer,
  RotateCcw,
  Tags,
} from "lucide-react";
import { printReEvaluationExamReport } from "../_components/printReEvaluationExamReport";

type AnyRow = Record<string, any>;

const TOOLBAR = {
  search: true,
  searchPlaceholder: "Search…",
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

function exportHtmlTable(filename: string, title: string, bodyHtml: string) {
  const template = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Worksheet</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table>${title}${bodyHtml}</table></body></html>`;
  const link = document.createElement("a");
  link.download = filename;
  link.href = `data:application/vnd.ms-excel;base64,${window.btoa(unescape(encodeURIComponent(template)))}`;
  link.click();
}

function cell(keys: string[]): ColDef<AnyRow>["valueGetter"] {
  return (p) => strFrom(p.data ?? {}, keys);
}

const COL_DEFS = {
  sno: {
    headerName: "S.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<AnyRow>,
  hallTicket: {
    headerName: "Hall Ticket No.",
    colId: "hallticket_number",
    minWidth: 150,
    width: 150,
    valueGetter: cell(["hallticket_number", "hall_ticketno"]),
  } as ColDef<AnyRow>,
  courseYear: {
    headerName: "Course Year",
    colId: "course_year_code",
    minWidth: 120,
    width: 120,
    valueGetter: cell(["course_year_code", "courseYearCode"]),
  } as ColDef<AnyRow>,
  subject: {
    headerName: "Subject",
    colId: "subject_name",
    minWidth: 160,
    width: 160,
    valueGetter: cell(["subject_name", "subjectName"]),
  } as ColDef<AnyRow>,
  cie: {
    headerName: "CIE",
    field: "cie",
    minWidth: 70,
    width: 70,
    cellClass: "text-center",
    valueGetter: cell(["cie"]),
  } as ColDef<AnyRow>,
  see: {
    headerName: "SEE",
    field: "see",
    minWidth: 70,
    width: 70,
    cellClass: "text-center",
    valueGetter: cell(["see"]),
  } as ColDef<AnyRow>,
  rv1: {
    headerName: "RV1",
    field: "rv1",
    minWidth: 70,
    width: 70,
    cellClass: "text-center",
    valueGetter: cell(["rv1"]),
  } as ColDef<AnyRow>,
  rv2: {
    headerName: "RV2",
    field: "rv2",
    minWidth: 70,
    width: 70,
    cellClass: "text-center",
    valueGetter: cell(["rv2"]),
  } as ColDef<AnyRow>,
  rv3: {
    headerName: "RV3",
    field: "rv3",
    minWidth: 70,
    width: 70,
    cellClass: "text-center",
    valueGetter: cell(["rv3"]),
  } as ColDef<AnyRow>,
  avg: {
    headerName: "Average of RV1,RV2,RV3",
    field: "avg_marks",
    minWidth: 150,
    width: 150,
    cellClass: "text-center",
    valueGetter: cell(["avg_marks"]),
  } as ColDef<AnyRow>,
  moderation: {
    headerName: "Moderation Marks",
    field: "moderation_marks",
    minWidth: 130,
    width: 130,
    cellClass: "text-center",
    valueGetter: cell(["moderation_marks"]),
  } as ColDef<AnyRow>,
  finalMarks: {
    headerName: "Final Marks",
    field: "final_marks",
    minWidth: 110,
    width: 110,
    cellClass: "text-center",
    valueGetter: cell(["final_marks"]),
  } as ColDef<AnyRow>,
  totalMarks: {
    headerName: "Total Marks",
    field: "final_total_marks",
    minWidth: 110,
    width: 110,
    cellClass: "text-center",
    valueGetter: cell(["final_total_marks"]),
  } as ColDef<AnyRow>,
  originalGrade: {
    headerName: "Original Grade",
    field: "grade_old",
    minWidth: 120,
    width: 120,
    cellClass: "text-center",
    valueGetter: cell(["grade_old"]),
  } as ColDef<AnyRow>,
  finalGrade: {
    headerName: "Final Grade",
    field: "grade",
    minWidth: 110,
    width: 110,
    cellClass: "text-center",
    valueGetter: cell(["grade"]),
  } as ColDef<AnyRow>,
  marksResult: {
    headerName: "Marks Result",
    colId: "Result",
    minWidth: 120,
    width: 120,
    cellClass: "text-center",
    valueGetter: cell(["Result", "result"]),
  } as ColDef<AnyRow>,
  gradeResult: {
    headerName: "Grade Result",
    colId: "Grade_Result",
    minWidth: 120,
    width: 120,
    cellClass: "text-center",
    valueGetter: cell(["Grade_Result", "grade_result"]),
  } as ColDef<AnyRow>,
  branch: {
    headerName: "Branch",
    colId: "group_code",
    minWidth: 90,
    width: 90,
    cellClass: "text-center",
    valueGetter: cell(["group_code", "groupCode"]),
  } as ColDef<AnyRow>,
};

export default function ReEvaluationExamReportPage() {
  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );
  const sessionCollegeId = Number(
    globalThis?.localStorage?.getItem("collegeId") ?? 0,
  );
  const orgCode = String(globalThis?.localStorage?.getItem("orgCode") ?? "");

  const [loading, setLoading] = useState(false);
  const [baseRows, setBaseRows] = useState<AnyRow[]>([]);
  const [restRows, setRestRows] = useState<AnyRow[]>([]);
  const [examFeeTypes, setExamFeeTypes] = useState<AnyRow[]>([]);

  const [courseId, setCourseId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [examId, setExamId] = useState<number | null>(null);
  const [examTypeCatdetId, setExamTypeCatdetId] = useState<number>(0);
  const [courseYearId, setCourseYearId] = useState<number>(0);
  const [skipAutoSelect, setSkipAutoSelect] = useState(false);

  const [rows, setRows] = useState<AnyRow[]>([]);
  const [examLabel, setExamLabel] = useState("");
  const [showTable, setShowTable] = useState(false);
  const collegeLogo = useCollegeLogo(
    sessionCollegeId > 0 ? sessionCollegeId : null,
  );

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
  const courseYears = useMemo(
    () =>
      dedupeBy(restRows, ["fk_course_year_id", "courseYearId"]).sort(
        (a, b) =>
          Number(a.year_order ?? a.cy_sort_order ?? 0) -
          Number(b.year_order ?? b.cy_sort_order ?? 0),
      ),
    [restRows],
  );

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      COL_DEFS.sno,
      COL_DEFS.hallTicket,
      COL_DEFS.courseYear,
      COL_DEFS.subject,
      COL_DEFS.cie,
      COL_DEFS.see,
      COL_DEFS.rv1,
      COL_DEFS.rv2,
      COL_DEFS.rv3,
      COL_DEFS.avg,
      COL_DEFS.moderation,
      COL_DEFS.finalMarks,
      COL_DEFS.totalMarks,
      COL_DEFS.originalGrade,
      COL_DEFS.finalGrade,
      COL_DEFS.marksResult,
      COL_DEFS.gradeResult,
      COL_DEFS.branch,
    ],
    [],
  );

  const getRowId = useCallback((p: { data?: AnyRow }) => {
    const ht = strFrom(p.data ?? {}, ["hallticket_number", "hall_ticketno"]);
    const sub = strFrom(p.data ?? {}, ["subject_name", "subjectName"]);
    return ht && sub ? `${ht}-${sub}` : `row-${Math.random()}`;
  }, []);

  function clearResults() {
    setRows([]);
    setExamLabel("");
    setShowTable(false);
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
    async function loadRestAndTypes() {
      if (!courseId || !academicYearId || !examId) {
        setRestRows([]);
        setExamFeeTypes([]);
        setCourseYearId(0);
        setExamTypeCatdetId(0);
        return;
      }
      setLoading(true);
      try {
        const [rest, feeTypes] = await Promise.all([
          getGradeMemoIssueRestFilters({
            courseId,
            academicYearId,
            examId,
            employeeId,
          }),
          getGeneralDetails(GM_CODES.EXAM_FEE_TYPE).catch(() => []),
        ]);
        if (cancelled) return;
        setRestRows(rest);

        const examRow = exams.find(
          (r) => numFrom(r, ["fk_exam_id", "examId"]) === Number(examId),
        );
        const allowed: AnyRow[] = [];
        for (const ft of feeTypes) {
          const code = strFrom(ft, [
            "generalDetailCode",
            "general_detail_code",
          ]);
          if (examRow?.is_regular_exam && code === "Regular") allowed.push(ft);
          if (examRow?.is_supply_exam && code === "Supple") allowed.push(ft);
          if (examRow?.is_internal_exam && code === "Internal")
            allowed.push(ft);
        }
        setExamFeeTypes(allowed);

        if (skipAutoSelect) {
          setExamTypeCatdetId(0);
          setCourseYearId(0);
          return;
        }

        setExamTypeCatdetId(
          allowed[0]
            ? numFrom(allowed[0], ["generalDetailId", "general_detail_id"])
            : 0,
        );

        const years = dedupeBy(rest, [
          "fk_course_year_id",
          "courseYearId",
        ]).sort(
          (a, b) =>
            Number(a.year_order ?? a.cy_sort_order ?? 0) -
            Number(b.year_order ?? b.cy_sort_order ?? 0),
        );
        setCourseYearId(
          years[0]
            ? numFrom(years[0], ["fk_course_year_id", "courseYearId"])
            : 0,
        );
      } catch {
        if (!cancelled) toastError("Failed to load filters");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadRestAndTypes();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, academicYearId, examId, employeeId, skipAutoSelect]);

  async function handleGetReport() {
    if (!courseId || !examId) {
      toastError("Please select Course and Exam");
      return;
    }
    setLoading(true);
    setRows([]);
    setExamLabel("");
    setShowTable(false);
    try {
      const data = await getReEvaluationExamReport({
        examId,
        examTypeCatdetId: examTypeCatdetId || 0,
        courseId,
        courseYearId: courseYearId || 0,
      });
      if (data.length === 0) {
        toastInfo("No records found");
        return;
      }
      setExamLabel(
        strFrom(
          exams.find(
            (r) => numFrom(r, ["fk_exam_id", "examId"]) === Number(examId),
          ) ?? {},
          ["exam_name", "examName"],
        ),
      );
      setRows(data);
      setShowTable(true);
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Failed to load report");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setSkipAutoSelect(true);
    setCourseId(null);
    setAcademicYearId(null);
    setExamId(null);
    setExamTypeCatdetId(0);
    setCourseYearId(0);
    setRestRows([]);
    setExamFeeTypes([]);
    clearResults();
  }

  function handleExportExcel() {
    if (rows.length === 0) return;
    const head = `<tr>
      <th>S.No</th><th>Hall Ticket No.</th><th>Course Year</th><th>Subject</th>
      <th>CIE</th><th>SEE</th><th>RV1</th><th>RV2</th><th>RV3</th>
      <th>Average of RV1,RV2,RV3</th><th>Moderation Marks</th><th>Final Marks</th>
      <th>Total Marks</th><th>Original Grade</th><th>Final Grade</th>
      <th>Marks Result</th><th>Grade Result</th><th>Branch</th>
    </tr>`;
    const body = rows
      .map(
        (r, i) => `<tr>
        <td>${i + 1}</td>
        <td>${strFrom(r, ["hallticket_number", "hall_ticketno"])}</td>
        <td>${strFrom(r, ["course_year_code", "courseYearCode"])}</td>
        <td>${strFrom(r, ["subject_name", "subjectName"])}</td>
        <td>${strFrom(r, ["cie"])}</td>
        <td>${strFrom(r, ["see"])}</td>
        <td>${strFrom(r, ["rv1"])}</td>
        <td>${strFrom(r, ["rv2"])}</td>
        <td>${strFrom(r, ["rv3"])}</td>
        <td>${strFrom(r, ["avg_marks"])}</td>
        <td>${strFrom(r, ["moderation_marks"])}</td>
        <td>${strFrom(r, ["final_marks"])}</td>
        <td>${strFrom(r, ["final_total_marks"])}</td>
        <td>${strFrom(r, ["grade_old"])}</td>
        <td>${strFrom(r, ["grade"])}</td>
        <td>${strFrom(r, ["Result", "result"])}</td>
        <td>${strFrom(r, ["Grade_Result", "grade_result"])}</td>
        <td>${strFrom(r, ["group_code", "groupCode"])}</td>
      </tr>`,
      )
      .join("");
    const title = `<tr><th colspan="18" style="text-align:center;font-size:18px;font-weight:bold;background:#f2f2f2;">Re-Evaluation Exam Report</th></tr>`;
    exportHtmlTable("Re-Evaluation Exam Report.xls", title, `${head}${body}`);
  }

  function handlePrint() {
    if (rows.length === 0) return;
    const course = courses.find(
      (r) => numFrom(r, ["fk_course_id", "courseId"]) === Number(courseId),
    );
    const year = courseYears.find(
      (r) =>
        numFrom(r, ["fk_course_year_id", "courseYearId"]) ===
        Number(courseYearId),
    );
    const logoUrl =
      collegeLogo.startsWith("http") ||
      collegeLogo.startsWith("data:") ||
      collegeLogo.startsWith("blob:")
        ? collegeLogo
        : `${globalThis.location.origin}${collegeLogo.startsWith("/") ? "" : "/"}${collegeLogo}`;

    printReEvaluationExamReport(rows, {
      title: "Re-Evaluation Exam Report",
      examLabel,
      universityName: strFrom(course ?? {}, [
        "university_name",
        "universityName",
      ]),
      logoUrl,
      orgCode,
      courseCode: strFrom(course ?? {}, [
        "course_code",
        "courseCode",
        "course_name",
      ]),
      courseYearCode:
        courseYearId > 0
          ? strFrom(year ?? {}, [
              "course_year_code",
              "courseYearCode",
              "course_year_name",
            ])
          : "",
    });
  }

  return (
    <FilteredListPage
      title="Re-Evaluation Exam Report"
      filters={
        <div className="space-y-3">
          <GlobalFilterBarRow>
            <GlobalFilterField
              label="Course"
              icon={GraduationCap}
              className="!flex-[0_1_7.5rem] !max-w-[8.5rem] !min-w-[6.5rem]"
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
              className="!flex-[0_1_8.5rem] !max-w-[9.5rem] !min-w-[7rem]"
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
              label="Exam"
              icon={ClipboardList}
              className="!flex-[1_1_22rem] !min-w-[16rem]"
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
                  label: strFrom(r, ["exam_name", "examName"]),
                }))}
                placeholder="Exam"
                searchable
              />
            </GlobalFilterField>
          </GlobalFilterBarRow>

          <GlobalFilterBarRow>
            <GlobalFilterField
              label="Exam Type"
              icon={Tags}
              className="global-filter-field--fx15 !flex-[0_1_7.5rem] !max-w-[9rem] !min-w-[6.5rem]"
            >
              <Select
                value={String(examTypeCatdetId)}
                onChange={(v) => {
                  clearResults();
                  setExamTypeCatdetId(v ? Number(v) : 0);
                }}
                options={[
                  { value: "0", label: "All" },
                  ...examFeeTypes.map((r) => ({
                    value: String(
                      numFrom(r, ["generalDetailId", "general_detail_id"]),
                    ),
                    label: strFrom(r, [
                      "generalDetailCode",
                      "general_detail_code",
                    ]),
                  })),
                ]}
                placeholder="Exam Type"
              />
            </GlobalFilterField>
            <GlobalFilterField
              label="Course Year"
              icon={Layers}
              className="global-filter-field--fx15 !flex-[0_1_8rem] !max-w-[10rem] !min-w-[7rem]"
            >
              <Select
                value={String(courseYearId)}
                onChange={(v) => {
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
                      "course_year_name",
                    ]),
                  })),
                ]}
                placeholder="Course Year"
                searchable
                isLoading={Boolean(examId) && loading}
              />
            </GlobalFilterField>
            <div className="flex shrink-0 flex-wrap items-center gap-2 self-end pb-0.5">
              <Button
                type="button"
                className="h-8 text-[12px]"
                onClick={() => void handleGetReport()}
                disabled={loading}
              >
                {loading ? "Loading..." : "Get Report"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-8 gap-1.5 text-[12px]"
                onClick={handleReset}
                title="Reset"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </Button>
            </div>
          </GlobalFilterBarRow>
        </div>
      }
      showTable={showTable}
      rowData={showTable ? rows : []}
      columnDefs={columnDefs}
      loading={loading}
      pagination
      paginationPageSize={25}
      getRowId={getRowId}
      fitColumnsToWidth={false}
      toolbar={TOOLBAR}
      toolbarTrailing={
        showTable && rows.length > 0 ? (
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
    />
  );
}
