"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef, ColGroupDef } from "ag-grid-community";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Select } from "@/common/components/select";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { rowIndexGetter } from "@/lib/utils";
import {
  getGradeMemoIssueFilters,
  getGradeMemoIssueRestFilters,
  getModerationColleges,
  getReEvaluationComparisionReport,
} from "@/services";
import { MINIO_URL } from "@/config/constants/api";
import { toastError, toastInfo } from "@/lib/toast";
import {
  DEFAULT_COLLEGE_LOGO,
  useCollegeLogo,
} from "@/hooks/useCollegeLogo";
import { FileSpreadsheet, Printer } from "lucide-react";
import { printReEvaluationComparisionReport } from "./printReEvaluationComparisionReport";

type AnyRow = Record<string, any>;

const TOOLBAR = {
  search: true,
  searchPlaceholder: "Search…",
  columnPicker: true,
  exportPdf: false,
  exportExcel: false,
} as const;

const GROUP_HEADER = "app-table-header-group";

function toLogoUrl(path: string): string {
  if (/^(https?:\/\/|data:|blob:|\/)/i.test(path)) return path;
  return `${MINIO_URL}${path.replace(/^\/+/, "")}`;
}

/** Angular getColleges(): logo from active college matching course.universityId. */
async function resolveUniversityLogo(universityId: number): Promise<string> {
  if (!universityId) return DEFAULT_COLLEGE_LOGO;
  try {
    const colleges = await getModerationColleges();
    const match = colleges.find(
      (c) => Number(c.universityId ?? c.university_id ?? 0) === universityId,
    );
    const logo = match?.logo;
    if (logo != null && String(logo).trim() !== "") {
      return toLogoUrl(String(logo).trim());
    }
  } catch {
    // fall through
  }
  return DEFAULT_COLLEGE_LOGO;
}

function toAbsoluteLogoUrl(url: string): string {
  if (/^(https?:\/\/|data:|blob:)/i.test(url)) return url;
  if (typeof globalThis.location?.origin === "string") {
    return `${globalThis.location.origin}${url.startsWith("/") ? "" : "/"}${url}`;
  }
  return url;
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

export function ReEvaluationComparisionReportPage() {
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

  const [courseId, setCourseId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [examId, setExamId] = useState<number | null>(null);
  const [courseYearId, setCourseYearId] = useState<number>(0);
  const [skipAutoSelect, setSkipAutoSelect] = useState(false);

  const [rows, setRows] = useState<AnyRow[]>([]);
  const [reportSummary, setReportSummary] = useState<AnyRow[]>([]);
  const [examLabel, setExamLabel] = useState("");
  const [dataDetails, setDataDetails] = useState("");
  const [printLogoUrl, setPrintLogoUrl] = useState("");
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

  const columnDefs = useMemo<(ColDef<AnyRow> | ColGroupDef<AnyRow>)[]>(
    () => [
      {
        headerName: "S.No",
        valueGetter: rowIndexGetter,
        width: 70,
        flex: 0,
      },
      {
        headerName: "Subject Code",
        colId: "Subject_Code",
        minWidth: 130,
        flex: 0.9,
        valueGetter: cell(["Subject_Code", "subject_code"]),
      },
      {
        headerName: "Subject Name",
        colId: "Subject_Name",
        minWidth: 180,
        flex: 1.4,
        valueGetter: cell(["Subject_Name", "subject_name"]),
      },
      {
        headerName: "Registered",
        colId: "Total_Registered",
        minWidth: 110,
        flex: 0.8,
        cellClass: "text-center",
        valueGetter: cell(["Total_Registered", "total_registered"]),
      },
      {
        headerName: "Appeared",
        colId: "Total_Appeared",
        minWidth: 100,
        flex: 0.7,
        cellClass: "text-center",
        valueGetter: cell(["Total_Appeared", "total_appeared"]),
      },
      {
        headerName: "Result Before RV",
        headerClass: GROUP_HEADER,
        marryChildren: true,
        children: [
          {
            headerName: "Passed",
            colId: "Pass_Before_RV",
            minWidth: 90,
            flex: 0.7,
            cellClass: "text-center",
            valueGetter: cell(["Pass_Before_RV", "pass_before_rv"]),
          },
          {
            headerName: "Pass %",
            colId: "Before_RV",
            minWidth: 90,
            flex: 0.7,
            cellClass: "text-center",
            valueGetter: cell(["Before_RV", "before_rv"]),
          },
        ],
      },
      {
        headerName: "No.of Students Applied RV",
        colId: "Students_Applied_RV",
        minWidth: 160,
        flex: 1,
        cellClass: "text-center",
        valueGetter: cell(["Students_Applied_RV", "students_applied_rv"]),
      },
      {
        headerName: "No.of Students Benefited",
        colId: "Students_Benefitted",
        minWidth: 160,
        flex: 1,
        cellClass: "text-center",
        valueGetter: cell(["Students_Benefitted", "students_benefitted"]),
      },
      {
        headerName: "After RV",
        headerClass: GROUP_HEADER,
        marryChildren: true,
        children: [
          {
            headerName: "Passed",
            colId: "Pass_After_RV",
            minWidth: 90,
            flex: 0.7,
            cellClass: "text-center",
            valueGetter: cell(["Pass_After_RV", "pass_after_rv"]),
          },
          {
            headerName: "Pass %",
            colId: "Final_Pass",
            minWidth: 90,
            flex: 0.7,
            cellClass: "text-center",
            valueGetter: cell(["Final_Pass", "final_pass"]),
          },
        ],
      },
    ],
    [],
  );

  const getRowId = useCallback(
    (p: { data?: AnyRow }) =>
      strFrom(p.data ?? {}, ["Subject_Code", "subject_code"]) ||
      `row-${Math.random()}`,
    [],
  );

  function clearResults() {
    setRows([]);
    setReportSummary([]);
    setExamLabel("");
    setDataDetails("");
    setPrintLogoUrl("");
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
    async function loadRest() {
      if (!courseId || !academicYearId || !examId) {
        setRestRows([]);
        setCourseYearId(0);
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
          setCourseYearId(0);
          return;
        }
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
        if (!cancelled) toastError("Failed to load course year filters");
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
    if (!courseId || !examId) {
      toastError("Please select Course and Exam");
      return;
    }
    setLoading(true);
    setRows([]);
    setReportSummary([]);
    setExamLabel("");
    setDataDetails("");
    setPrintLogoUrl("");
    setShowTable(false);
    try {
      const { rows: data, reportSummary: summary } =
        await getReEvaluationComparisionReport({
          examId,
          courseYearId: courseYearId || 0,
        });
      if (data.length === 0) {
        toastInfo("No records found");
        return;
      }
      const course = courses.find(
        (r) => numFrom(r, ["fk_course_id", "courseId"]) === Number(courseId),
      );
      const year = courseYears.find(
        (r) =>
          numFrom(r, ["fk_course_year_id", "courseYearId"]) ===
          Number(courseYearId),
      );
      const examName = strFrom(
        exams.find(
          (r) => numFrom(r, ["fk_exam_id", "examId"]) === Number(examId),
        ) ?? {},
        ["exam_name", "examName"],
      );
      const courseCode = strFrom(course ?? {}, [
        "course_code",
        "courseCode",
        "course_name",
      ]);
      const courseYearCode =
        courseYearId > 0
          ? strFrom(year ?? {}, [
              "course_year_code",
              "courseYearCode",
              "course_year_name",
            ])
          : "";
      // Angular selectedData(): courseCode / courseYearCode / exam
      const parts = [courseCode, courseYearCode, examName].filter(Boolean);
      setDataDetails(parts.join(" / "));
      setExamLabel(examName);
      setRows(data);
      setReportSummary(summary);
      setShowTable(true);

      const universityId = numFrom(course ?? {}, [
        "fk_university_id",
        "universityId",
      ]);
      const logo = await resolveUniversityLogo(universityId);
      setPrintLogoUrl(logo || collegeLogo || DEFAULT_COLLEGE_LOGO);
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
    setCourseYearId(0);
    setRestRows([]);
    clearResults();
  }

  function handleExportExcel() {
    if (rows.length === 0) return;
    const head = `<tr>
      <th colspan="5"></th>
      <th colspan="2">Result Before RV</th>
      <th colspan="2"></th>
      <th colspan="2">After RV</th>
    </tr>
    <tr>
      <th>S.No</th><th>Subject Code</th><th>Subject Name</th><th>Registered</th><th>Appeared</th>
      <th>Passed</th><th>Pass %</th>
      <th>No.of Students Applied RV</th><th>No.of Students Benefited</th>
      <th>Passed</th><th>Pass %</th>
    </tr>`;
    const body = rows
      .map(
        (r, i) => `<tr>
        <td>${i + 1}</td>
        <td>${strFrom(r, ["Subject_Code", "subject_code"])}</td>
        <td>${strFrom(r, ["Subject_Name", "subject_name"])}</td>
        <td>${strFrom(r, ["Total_Registered", "total_registered"])}</td>
        <td>${strFrom(r, ["Total_Appeared", "total_appeared"])}</td>
        <td>${strFrom(r, ["Pass_Before_RV", "pass_before_rv"])}</td>
        <td>${strFrom(r, ["Before_RV", "before_rv"])}</td>
        <td>${strFrom(r, ["Students_Applied_RV", "students_applied_rv"])}</td>
        <td>${strFrom(r, ["Students_Benefitted", "students_benefitted"])}</td>
        <td>${strFrom(r, ["Pass_After_RV", "pass_after_rv"])}</td>
        <td>${strFrom(r, ["Final_Pass", "final_pass"])}</td>
      </tr>`,
      )
      .join("");
    const title = `<tr><th colspan="11" style="text-align:center;font-size:18px;font-weight:bold;background:#f2f2f2;">Re-Evaluation Comparision Result Report${dataDetails ? ` (${dataDetails})` : ""}</th></tr>`;
    exportHtmlTable(
      "Re-Evaluation Comparision Result Report.xls",
      title,
      `${head}${body}`,
    );
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
    const rawLogo = printLogoUrl || collegeLogo || DEFAULT_COLLEGE_LOGO;
    const logoUrl = toAbsoluteLogoUrl(rawLogo);

    printReEvaluationComparisionReport(rows, {
      title: "Re-Evaluation Comparision Result Report",
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
      reportSummary,
    });
  }

  return (
    <FilteredListPage
      title="Re-Evaluation Comparision Result Report"
      filters={
        <div className="space-y-3">
          {/* Angular fxFlex: Course 15 / Exam Year 15 / Exam 69 */}
          <GlobalFilterBarRow className="global-filter-bar__row--eval-mod-r1">
            <GlobalFilterField label="Course" className="global-filter-field--fx15">
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
              className="global-filter-field--fx15"
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
            <GlobalFilterField label="Exam" className="global-filter-field--fx69">
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

          {/* Angular fxFlex: Course Year 15 / Get Report / cached reset */}
          <GlobalFilterBarRow className="global-filter-bar__row--eval-mod-r2">
            <GlobalFilterField
              label="Course Year"
              className="global-filter-field--fx15"
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
            <div className="global-filter-field global-filter-field--action global-filter-field--fx10 flex items-center gap-2 self-end pb-0.5">
              <Button
                type="button"
                className="h-8 shrink-0 px-3 text-[12px]"
                onClick={() => void handleGetReport()}
                disabled={loading}
              >
                {loading ? "Loading..." : "Get Report"}
              </Button>
              <span
                className="material-icons cursor-pointer select-none text-[22px] leading-none text-foreground/80 hover:text-foreground"
                onClick={handleReset}
                title="Reset"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleReset();
                  }
                }}
                aria-label="Reset"
              >
                cached
              </span>
            </div>
          </GlobalFilterBarRow>
        </div>
      }
      showTable={showTable}
      tableHeader={
        showTable ? (
          <div className="table-context-header flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <div className="flex items-center gap-2">
              <span
                className="material-icons table-context-header__icon"
                aria-hidden
              >
                book
              </span>
              <strong className="table-context-header__title">
                Re-Evaluation Comparision Result Report
              </strong>
            </div>
            {dataDetails ? (
              <span className="text-[13px] font-medium text-blue-700">
                {dataDetails}
              </span>
            ) : null}
          </div>
        ) : null
      }
      rowData={showTable ? rows : []}
      columnDefs={columnDefs as ColDef<AnyRow>[]}
      loading={loading}
      pagination
      paginationPageSize={10}
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
