"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef } from "ag-grid-community";
import { FilteredListPage } from "@/components/layout";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { Select } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { rowIndexGetter } from "@/lib/utils";
import { dedupeBy, num, txt } from "@/common/utils/data-helpers";
import { toastError, toastSuccess } from "@/lib/toast";
import { toast } from "sonner";
import { printHtmlInIframe } from "@/lib/print";
import { DEFAULT_COLLEGE_LOGO } from "@/hooks/useCollegeLogo";
import {
  logoToDataUrl,
  toPrintLogoUrl,
} from "@/app/(pages)/(protected)/reports/admin-attendance-reports/_lib/attendance-report-print";
import {
  buildHtmlTable,
  exportHtmlTableAsExcel,
} from "../../_lib/export-html-table";
import {
  getEvalUnassignedBaseFilters,
  getExamEvalUnassignedList,
  listCollegesActive,
} from "@/services";

type AnyRow = Record<string, unknown>;

const REPORT_TITLE = "Exam Evaluation UnAssigned Report";

const toastInfo = (msg: string) => toast.info(msg);

const TOOLBAR = {
  search: true,
  searchPlaceholder: "Search...",
  columnPicker: false,
  exportPdf: false,
  exportExcel: false,
  columnFilters: false,
} as const;

const EXPORT_COLS = [
  { key: "si", header: "SI.No" },
  { key: "courseYear", header: "Course Year" },
  { key: "regulation", header: "Regulation" },
  { key: "subject", header: "Subject" },
  { key: "omrCount", header: "Un Assigned Omr Count" },
] as const;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatExamLabel(exam: AnyRow): string {
  const name = txt(exam.exam_name);
  const from = txt(exam.from_date).slice(0, 10);
  const to = txt(exam.to_date).slice(0, 10);
  const bits: string[] = [];
  if (exam.is_internal_exam) bits.push("Internal");
  if (exam.is_regular_exam) bits.push("Regular");
  if (exam.is_supply_exam) bits.push("Supple");
  const range = from && to ? ` (${from} - ${to})` : "";
  const tags = bits.length ? bits.map((b) => `(${b})`).join("") : "";
  return `${name}${range}${tags}`;
}

function subjectLabel(row: AnyRow): string {
  const name = txt(row.subject_name);
  const code = txt(row.subject_code);
  if (name && code) return `${name}(${code})`;
  return name || code;
}

function toExportRows(rows: AnyRow[]): Record<string, unknown>[] {
  return rows.map((row, i) => ({
    si: i + 1,
    courseYear: txt(row.course_year_code),
    regulation: txt(row.regulation_code),
    subject: subjectLabel(row),
    omrCount: txt(row.omr_serial_count),
  }));
}

/** Angular getCollegeLogo → collegesLogoList[0].logo after Get List. */
async function resolveUnassignedPrintLogo(): Promise<string> {
  try {
    const colleges = await listCollegesActive();
    const logo = txt(colleges[0]?.logo);
    if (logo) return logoToDataUrl(toPrintLogoUrl(logo));
  } catch {
    /* fall through to default */
  }
  return logoToDataUrl(toPrintLogoUrl(DEFAULT_COLLEGE_LOGO));
}

function buildUnassignedPrintHtml(
  rows: AnyRow[],
  logoSrc: string,
  fallbackLogo: string,
  orgCode: string,
): string {
  const headerHtml =
    orgCode === "SUK"
      ? `<div class="suk-header">
      <img src="${escapeHtml(logoSrc)}" alt="" class="suk-logo"
        onerror="this.onerror=null;this.src='${escapeHtml(fallbackLogo)}'" />
      <p class="collegeName">${escapeHtml(REPORT_TITLE)}</p>
    </div>`
      : `<div class="banner-row">
      <div class="logo-col">
        <img src="${escapeHtml(logoSrc)}" alt="" class="portraitLogo"
          onerror="this.onerror=null;this.src='${escapeHtml(fallbackLogo)}'" />
      </div>
      <div class="banner-text">
        <p class="collegeName">${escapeHtml(REPORT_TITLE)}</p>
      </div>
    </div>`;

  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(REPORT_TITLE)}</title>
<style>
@page { size: A4 portrait; margin: 10mm; }
* { box-sizing: border-box; }
body {
  margin: 0;
  padding: 0;
  color: #000;
  font-family: Arial, sans-serif;
  font-size: 11px;
  line-height: 1.35;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.banner-row { display: flex; align-items: flex-start; width: 100%; margin-bottom: 10px; }
.logo-col { width: 15%; min-width: 80px; text-align: center; }
.portraitLogo { width: 80%; max-width: 96px; height: auto; object-fit: contain; }
.banner-text { width: 85%; text-align: center; }
.suk-header { text-align: center; margin-bottom: 12px; }
.suk-logo { max-width: 100%; height: auto; object-fit: contain; margin-bottom: 8px; }
.collegeName {
  margin: 0;
  font-size: 20px;
  font-weight: 550;
  color: #000;
  text-align: center;
}
table { width: 100%; border-collapse: collapse; margin-top: 8px; }
th, td { border: 1px solid #000; padding: 8px; text-align: left; vertical-align: top; word-break: break-word; }
th { background: #f2f2f2; font-weight: 700; }
thead { display: table-header-group; }
tr { page-break-inside: avoid; }
</style></head>
<body>
${headerHtml}
${buildHtmlTable([...EXPORT_COLS], toExportRows(rows))}
</body></html>`;
}

async function printReport(rows: AnyRow[], orgCode: string) {
  if (!rows.length) return;
  const logoSrc = await resolveUnassignedPrintLogo();
  const fallbackLogo = await logoToDataUrl(
    toPrintLogoUrl(DEFAULT_COLLEGE_LOGO),
  );
  printHtmlInIframe(
    buildUnassignedPrintHtml(rows, logoSrc, fallbackLogo, orgCode),
  );
}

/**
 * Angular Exam Evaluation UnAssigned Report
 * (`exam-evaluation-un-assigned-report`).
 */
export default function ExamEvaluationUnAssignedReportPage() {
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [loadingList, setLoadingList] = useState(false);

  const [baseRows, setBaseRows] = useState<AnyRow[]>([]);
  const [rows, setRows] = useState<AnyRow[]>([]);

  const [courseId, setCourseId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [examId, setExamId] = useState("");
  const [isReevaluation, setIsReevaluation] = useState(false);

  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );
  const orgCode =
    typeof globalThis.localStorage !== "undefined"
      ? String(globalThis.localStorage.getItem("orgCode") ?? "")
      : "";

  const courses = useMemo(
    () => dedupeBy(baseRows, (r) => num(r.fk_course_id)),
    [baseRows],
  );
  const academicYears = useMemo(() => {
    if (!courseId) return [];
    const list = dedupeBy(
      baseRows.filter((r) => num(r.fk_course_id) === Number(courseId)),
      (r) => num(r.fk_academic_year_id),
    );
    return [...list].sort(
      (a, b) =>
        parseInt(txt(b.academic_year), 10) - parseInt(txt(a.academic_year), 10),
    );
  }, [baseRows, courseId]);
  const exams = useMemo(() => {
    if (!courseId || !academicYearId) return [];
    return dedupeBy(
      baseRows.filter(
        (r) =>
          num(r.fk_course_id) === Number(courseId) &&
          num(r.fk_academic_year_id) === Number(academicYearId),
      ),
      (r) => num(r.fk_exam_id),
    );
  }, [baseRows, courseId, academicYearId]);

  function clearResults() {
    setRows([]);
  }

  useEffect(() => {
    async function loadBase() {
      setLoadingFilters(true);
      try {
        const list = await getEvalUnassignedBaseFilters(employeeId);
        setBaseRows(list);
        // Angular getFiltersList → auto-select first course
        const firstCourses = dedupeBy(list, (r) => num(r.fk_course_id));
        if (firstCourses.length) {
          setCourseId(String(num(firstCourses[0].fk_course_id)));
        }
      } catch (e) {
        toastError(e, "Failed to load filters");
        setBaseRows([]);
      } finally {
        setLoadingFilters(false);
      }
    }
    void loadBase();
  }, [employeeId]);

  // Angular selectedCourse → first academic year
  useEffect(() => {
    setExamId("");
    clearResults();
    if (!courseId) {
      setAcademicYearId("");
      return;
    }
    const years = dedupeBy(
      baseRows.filter((r) => num(r.fk_course_id) === Number(courseId)),
      (r) => num(r.fk_academic_year_id),
    ).sort(
      (a, b) =>
        parseInt(txt(b.academic_year), 10) - parseInt(txt(a.academic_year), 10),
    );
    setAcademicYearId(
      years.length ? String(num(years[0].fk_academic_year_id)) : "",
    );
  }, [courseId, baseRows]);

  // Angular selectedAcademicYear → first exam
  useEffect(() => {
    clearResults();
    if (!courseId || !academicYearId) {
      setExamId("");
      return;
    }
    const list = dedupeBy(
      baseRows.filter(
        (r) =>
          num(r.fk_course_id) === Number(courseId) &&
          num(r.fk_academic_year_id) === Number(academicYearId),
      ),
      (r) => num(r.fk_exam_id),
    );
    setExamId(list.length ? String(num(list[0].fk_exam_id)) : "");
  }, [academicYearId, courseId, baseRows]);

  useEffect(() => {
    clearResults();
  }, [examId]);

  async function onGetList() {
    if (!courseId || !academicYearId || !examId) {
      toastInfo("Please Select Valid Filters");
      return;
    }
    setLoadingList(true);
    try {
      const list = await getExamEvalUnassignedList({
        courseId: Number(courseId),
        examId: Number(examId),
        isReevaluation,
        courseYearId: "",
      });
      setRows(list.map((row, i) => ({ ...row, __rid: i })));
      if (list.length) {
        toastSuccess("Data retrieved successfully!");
      } else {
        toastSuccess("No Records Found");
      }
    } catch (e) {
      toastError(e, "Failed to load report");
      setRows([]);
    } finally {
      setLoadingList(false);
    }
  }

  function handleExportExcel() {
    if (!rows.length) {
      toastInfo("No data to export");
      return;
    }
    exportHtmlTableAsExcel(
      REPORT_TITLE,
      buildHtmlTable([...EXPORT_COLS], toExportRows(rows)),
      `<strong>${escapeHtml(REPORT_TITLE)}</strong>`,
    );
  }

  const handlePrintReport = useCallback(async () => {
    if (!rows.length) {
      toastInfo("No data to print");
      return;
    }
    await printReport(rows, orgCode);
  }, [rows, orgCode]);

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      {
        headerName: "SI.No",
        valueGetter: rowIndexGetter,
        width: 70,
        flex: 0,
      },
      {
        headerName: "Course Year",
        minWidth: 120,
        valueGetter: (p) => txt(p.data?.course_year_code),
      },
      {
        headerName: "Regulation",
        minWidth: 180,
        valueGetter: (p) => txt(p.data?.regulation_code),
      },
      {
        headerName: "Subject",
        minWidth: 260,
        valueGetter: (p) => (p.data ? subjectLabel(p.data) : ""),
      },
      {
        headerName: "Un Assigned Omr Count",
        minWidth: 160,
        valueGetter: (p) => txt(p.data?.omr_serial_count),
      },
    ],
    [],
  );

  const filters = (
    <>
      <div className="inv-allot-report-filters space-y-2">
        <div className="inv-allot-report-filters__row">
          <div className="inv-allot-report-filters__fx20">
            <GlobalFilterField label="Course">
              <Select
                value={courseId || null}
                onChange={(v) => setCourseId(v ?? "")}
                isLoading={loadingFilters}
                options={courses.map((c) => ({
                  value: String(num(c.fk_course_id)),
                  label: txt(c.course_code),
                }))}
                placeholder="Course"
                searchable
              />
            </GlobalFilterField>
          </div>
          <div className="inv-allot-report-filters__fx20">
            <GlobalFilterField label="Exam Year">
              <Select
                value={academicYearId || null}
                onChange={(v) => setAcademicYearId(v ?? "")}
                isLoading={loadingFilters}
                options={academicYears.map((y) => ({
                  value: String(num(y.fk_academic_year_id)),
                  label: txt(y.academic_year),
                }))}
                placeholder="Exam Year"
                searchable
              />
            </GlobalFilterField>
          </div>
          <div className="inv-allot-report-filters__fx60">
            <GlobalFilterField label="Exam" className="min-w-[280px] flex-[2]">
              <Select
                value={examId || null}
                onChange={(v) => setExamId(v ?? "")}
                isLoading={loadingFilters}
                options={exams.map((e) => ({
                  value: String(num(e.fk_exam_id)),
                  label: formatExamLabel(e),
                }))}
                placeholder="Exam"
                searchable
              />
            </GlobalFilterField>
          </div>
        </div>
        <div className="inv-allot-report-filters__row">
          <div className="inv-allot-report-filters__fx13">
            <GlobalFilterField label="">
              <div className="flex h-[30px] items-center gap-2">
                <Checkbox
                  id="unassigned-is-reevaluation"
                  checked={isReevaluation}
                  onCheckedChange={(v) => {
                    setIsReevaluation(v === true);
                    clearResults();
                  }}
                />
                <Label
                  htmlFor="unassigned-is-reevaluation"
                  className="text-[15px] font-normal"
                >
                  Is Re-Evaluation
                </Label>
              </div>
            </GlobalFilterField>
          </div>
          <div className="inv-allot-report-filters__fx13">
            <GlobalFilterField
              label=""
              className="global-filter-field--shrink global-filter-field--action"
            >
              <Button
                type="button"
                onClick={() => void onGetList()}
                disabled={loadingList}
                className="h-[30px] px-3 text-[12px] w-full"
              >
                Get List
              </Button>
            </GlobalFilterField>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <FilteredListPage
      title={REPORT_TITLE}
      filters={filters}
      rowData={rows}
      columnDefs={columnDefs}
      loading={loadingList}
      showTable={rows.length > 0}
      pagination
      toolbar={TOOLBAR}
      toolbarTrailing={
        rows.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              className="h-[30px] px-3 text-[12px]"
              onClick={handleExportExcel}
            >
              Export Excel
            </Button>
            <Button
              type="button"
              className="h-[30px] px-3 text-[12px]"
              onClick={() => void handlePrintReport()}
            >
              Print Report
            </Button>
          </div>
        ) : null
      }
      getRowId={(p) => String(p.data?.__rid ?? "")}
    />
  );
}
