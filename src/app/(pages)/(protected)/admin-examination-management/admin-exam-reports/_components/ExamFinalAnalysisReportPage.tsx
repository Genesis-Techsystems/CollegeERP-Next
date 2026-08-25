"use client";

/**
 * Shared final analysis report UI — Angular exam result sheets, gradewise,
 * final result analysis, and group-subjectwise reports.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef, ColGroupDef } from "ag-grid-community";
import { format, parseISO } from "date-fns";
import { Printer, RefreshCw } from "lucide-react";
import { FilteredListPage } from "@/components/layout";
import { Select, type SelectOption } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { DEFAULT_COLLEGE_LOGO, useCollegeLogo } from "@/hooks/useCollegeLogo";
import {
  resolveAttendancePrintLogo as resolveReportPrintLogo,
  toPrintLogoUrl,
} from "@/app/(pages)/(protected)/reports/admin-attendance-reports/_lib/attendance-report-print";
import { rowIndexGetter } from "@/lib/utils";
import { toastError } from "@/lib/toast";
import { toast } from "sonner";
import {
  getCollegeById,
  getExamFinalAnalysisReport,
  getUnivExamFiltersRegSup,
  getUnivExamRestInRegExamStd,
  getGeneralDetails,
  listExamFeeTypes,
  type AnyRow,
} from "@/services";
import { GM_CODES } from "@/config/constants/ui";

type Row = AnyRow;
export type ExamFinalAnalysisKind =
  | "result-sheets"
  | "gradewise"
  | "final-analysis"
  | "group-subjectwise";

const TITLES: Record<ExamFinalAnalysisKind, string> = {
  "result-sheets": "Exam Result Sheets",
  gradewise: "Gradewise Result Report",
  "final-analysis": "Final Result Analysis Report",
  "group-subjectwise": "Group & Subject Wise Result Report",
};

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function txt(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

function dedupeBy<T>(rows: T[], keyFn: (r: T) => number): T[] {
  const seen = new Set<number>();
  const out: T[] = [];
  for (const r of rows) {
    const k = keyFn(r);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

function parseMaybeDate(v: unknown): string {
  const s = txt(v);
  if (!s) return "";
  try {
    if (/^\d{4}-\d{2}-\d{2}/.test(s))
      return format(parseISO(s.slice(0, 10)), "dd MMM, yyyy");
    return format(new Date(s), "dd MMM, yyyy");
  } catch {
    return s;
  }
}

/** Angular exam flag (`is_regular_exam` / `is_supply_exam` / `is_internal_exam`). */
function flagOn(v: unknown): boolean {
  if (v === true || v === 1) return true;
  const s = String(v ?? "")
    .trim()
    .toLowerCase();
  return s === "1" || s === "true" || s === "t" || s === "y" || s === "yes";
}

function examMasterLabel(r: Row): string {
  const name = txt(r.exam_name ?? r.examName) || "Exam";
  const from = parseMaybeDate(r.from_date ?? r.fromDate);
  const to = parseMaybeDate(r.to_date ?? r.toDate);
  const range = from && to ? ` (${from} - ${to})` : "";
  return `${name}${range}`;
}

function dash(v: unknown): string {
  const s = txt(v);
  return !s || s === "null" ? "—" : s;
}

function exportHtmlTable(filename: string, title: string, bodyHtml: string) {
  const template = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Worksheet</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table>${title}${bodyHtml}</table></body></html>`;
  const link = document.createElement("a");
  link.download = filename;
  link.href = `data:application/vnd.ms-excel;base64,${window.btoa(unescape(encodeURIComponent(template)))}`;
  link.click();
}

function headerLabel(key: string): string {
  if (key === "Pass_percentage" || key === "Passed_percent") return "Pass %";
  return key.replace(/_/g, " ");
}

function flagForKind(
  kind: ExamFinalAnalysisKind,
  isReevaluation: boolean,
): Parameters<typeof getExamFinalAnalysisReport>[0]["flag"] {
  switch (kind) {
    case "result-sheets":
      return isReevaluation
        ? "final_reeval_results_list"
        : "final_results_list";
    case "gradewise":
      return "final_group_subject_grade_results";
    case "final-analysis":
      return "final_result_analysis";
    case "group-subjectwise":
      return "final_group_subject_wise_results";
  }
}

function buildGradewiseCols(firstRow: Row): ColDef<Row>[] {
  const keys = gradewiseDataKeys(firstRow);
  return [
    {
      headerName: "S.No",
      valueGetter: rowIndexGetter,
      width: 70,
      flex: 0,
    },
    ...keys.map(
      (key): ColDef<Row> => ({
        headerName: headerLabel(key),
        minWidth: 110,
        flex: 1,
        valueGetter: (p) => dash(p.data?.[key]),
      }),
    ),
  ];
}

/** Angular: Object.keys(row); splice(0,1); splice(1,1) → drop keys at index 0 and 2. */
function gradewiseDataKeys(firstRow: Row): string[] {
  const keys = Object.keys(firstRow);
  if (keys.length <= 2) return keys;
  return keys.filter((_, i) => i !== 0 && i !== 2);
}

const resultSheetsCols: ColDef<Row>[] = [
  {
    headerName: "S.No",
    valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
    width: 70,
    flex: 0,
  },
  {
    headerName: "Hall Ticket",
    minWidth: 120,
    flex: 0,
    valueGetter: (p) =>
      dash(p.data?.hallticket_number ?? p.data?.hallticket_no),
  },
  {
    headerName: "Result Status",
    minWidth: 120,
    flex: 0,
    valueGetter: (p) => dash(p.data?.ResultStatus ?? p.data?.result_status),
  },
  {
    headerName: "College",
    minWidth: 90,
    flex: 0,
    valueGetter: (p) => dash(p.data?.college_code),
  },
  {
    headerName: "Group Code",
    minWidth: 110,
    flex: 0,
    valueGetter: (p) => dash(p.data?.group_code ?? p.data?.course_group),
  },
  {
    headerName: "Course Year",
    minWidth: 130,
    flex: 0,
    valueGetter: (p) =>
      dash(p.data?.course_year_name ?? p.data?.course_year_code),
  },
  {
    headerName: "Student Name",
    minWidth: 180,
    flex: 1,
    valueGetter: (p) => dash(p.data?.student_name ?? p.data?.StudentName),
  },
  {
    headerName: "Exam",
    minWidth: 160,
    flex: 1,
    valueGetter: (p) => dash(p.data?.exam_label_name ?? p.data?.exam_name),
  },
];

const FINAL_ANALYSIS_GROUP_HEADER = "app-table-header-group";

const finalAnalysisColumnDefs: (ColDef<Row> | ColGroupDef<Row>)[] = [
  {
    headerName: "SL.No",
    valueGetter: rowIndexGetter,
    width: 80,
    minWidth: 80,
    maxWidth: 90,
    flex: 0,
    suppressSizeToFit: true,
    cellClass: "text-center",
  },
  {
    headerName: "Course",
    minWidth: 120,
    flex: 1.2,
    valueGetter: (p) => dash(p.data?.course_name),
  },
  {
    headerName: "Course Group",
    minWidth: 110,
    flex: 1,
    cellClass: "text-center",
    valueGetter: (p) => dash(p.data?.course_group),
  },
  {
    headerName: "Course Year",
    minWidth: 140,
    flex: 1.4,
    valueGetter: (p) => dash(p.data?.course_year),
  },
  {
    headerName: "Appeared",
    headerClass: FINAL_ANALYSIS_GROUP_HEADER,
    marryChildren: true,
    children: [
      {
        headerName: "Count",
        minWidth: 90,
        flex: 1,
        cellClass: "text-center",
        valueGetter: (p) => dash(p.data?.Appeared ?? p.data?.appeared),
      },
    ],
  },
  {
    headerName: "Passed",
    headerClass: FINAL_ANALYSIS_GROUP_HEADER,
    marryChildren: true,
    children: [
      {
        headerName: "Count",
        minWidth: 90,
        flex: 1,
        cellClass: "text-center",
        valueGetter: (p) => dash(p.data?.passed),
      },
      {
        headerName: "%",
        minWidth: 70,
        flex: 0.8,
        cellClass: "text-center",
        valueGetter: (p) =>
          dash(p.data?.Pass_percentage ?? p.data?.Passed_percent),
      },
    ],
  },
  {
    headerName: "Promoted",
    headerClass: FINAL_ANALYSIS_GROUP_HEADER,
    marryChildren: true,
    children: [
      {
        headerName: "Count",
        minWidth: 90,
        flex: 1,
        cellClass: "text-center",
        valueGetter: (p) => dash(p.data?.Promoted),
      },
      {
        headerName: "%",
        minWidth: 70,
        flex: 0.8,
        cellClass: "text-center",
        valueGetter: (p) => dash(p.data?.Promoted_Percentage),
      },
    ],
  },
  {
    headerName: "Detained",
    headerClass: FINAL_ANALYSIS_GROUP_HEADER,
    marryChildren: true,
    children: [
      {
        headerName: "Count",
        minWidth: 90,
        flex: 1,
        cellClass: "text-center",
        valueGetter: (p) => dash(p.data?.Detained),
      },
      {
        headerName: "%",
        minWidth: 70,
        flex: 0.8,
        cellClass: "text-center",
        valueGetter: (p) => dash(p.data?.Detained_Percentage),
      },
    ],
  },
];

const groupSubjectwiseCols: ColDef<Row>[] = [
  {
    headerName: "S.No",
    valueGetter: (p) => (p.node?.rowPinned ? "" : (p.node?.rowIndex ?? 0) + 1),
    width: 70,
    flex: 0,
  },
  {
    headerName: "Subject",
    minWidth: 200,
    flex: 1,
    valueGetter: (p) =>
      dash(p.data?.SUBJECT ?? p.data?.subject_name ?? p.data?.subject),
  },
  {
    headerName: "Registered",
    minWidth: 100,
    flex: 0,
    valueGetter: (p) => dash(p.data?.registered),
  },
  {
    headerName: "Appeared",
    minWidth: 90,
    flex: 0,
    valueGetter: (p) => dash(p.data?.Appeared ?? p.data?.appeared),
  },
  {
    headerName: "Passed",
    minWidth: 90,
    flex: 0,
    valueGetter: (p) => dash(p.data?.Passed ?? p.data?.passed),
  },
  {
    headerName: "Failed",
    minWidth: 90,
    flex: 0,
    valueGetter: (p) => dash(p.data?.failed),
  },
  {
    headerName: "Pass %",
    minWidth: 90,
    flex: 0,
    valueGetter: (p) => dash(p.data?.Pass_percentage ?? p.data?.Passed_percent),
  },
];

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Angular `getColleges()` — print header uses College.collegeName, not the filter college_code. */
async function resolvePrintCollegeName(
  collegeId: number,
  fallback?: Row | null,
): Promise<string> {
  const record = collegeId
    ? await getCollegeById(collegeId).catch(() => null)
    : null;
  return (
    txt(record?.collegeName) ||
    txt(fallback?.college_name) ||
    txt(fallback?.collegeName) ||
    ""
  );
}

function printHtmlInIframe(html: string): void {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!doc) {
    iframe.remove();
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const printFrame = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      setTimeout(() => iframe.remove(), 1000);
    }
  };

  if (iframe.contentWindow?.document.readyState === "complete") {
    setTimeout(printFrame, 250);
  } else {
    iframe.onload = () => setTimeout(printFrame, 250);
  }
}

function exportFinalAnalysisExcel(args: {
  title: string;
  subtitle: string;
  rows: Row[];
}): void {
  if (!args.rows.length) return;

  const head = `<thead>
    <tr>
      <th rowspan="2">SL.No</th>
      <th rowspan="2">Course</th>
      <th rowspan="2">Course Group</th>
      <th rowspan="2">Course Year</th>
      <th>Appeared</th>
      <th colspan="2">Passed</th>
      <th colspan="2">Promoted</th>
      <th colspan="2">Detained</th>
    </tr>
    <tr>
      <th>Count</th>
      <th>Count</th>
      <th>%</th>
      <th>Count</th>
      <th>%</th>
      <th>Count</th>
      <th>%</th>
    </tr>
  </thead>`;

  const body = args.rows
    .map(
      (r, i) => `<tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(dash(r.course_name))}</td>
        <td>${escapeHtml(dash(r.course_group))}</td>
        <td>${escapeHtml(dash(r.course_year))}</td>
        <td>${escapeHtml(dash(r.Appeared ?? r.appeared))}</td>
        <td>${escapeHtml(dash(r.passed))}</td>
        <td>${escapeHtml(dash(r.Pass_percentage ?? r.Passed_percent))}</td>
        <td>${escapeHtml(dash(r.Promoted))}</td>
        <td>${escapeHtml(dash(r.Promoted_Percentage))}</td>
        <td>${escapeHtml(dash(r.Detained))}</td>
        <td>${escapeHtml(dash(r.Detained_Percentage))}</td>
      </tr>`,
    )
    .join("");

  const titleRow = `<tr><th colspan="11" style="text-align:center;font-size:18px;font-weight:bold;background:#f2f2f2;">${escapeHtml(args.title)}${args.subtitle ? ` (${escapeHtml(args.subtitle)})` : ""}</th></tr>`;
  exportHtmlTable(
    "Final Result Analysis.xls",
    titleRow,
    `${head}<tbody>${body}</tbody>`,
  );
}

function exportGradewiseExcel(args: {
  title: string;
  subtitle: string;
  rows: Row[];
}): void {
  if (!args.rows.length) return;

  const keys = gradewiseDataKeys(args.rows[0]);
  const head = `<thead><tr><th>S.No</th>${keys
    .map((k) => `<th>${escapeHtml(headerLabel(k))}</th>`)
    .join("")}</tr></thead>`;
  const body = args.rows
    .map(
      (r, i) =>
        `<tr><td>${i + 1}</td>${keys.map((k) => `<td>${escapeHtml(dash(r[k]))}</td>`).join("")}</tr>`,
    )
    .join("");

  const titleRow = `<tr><th colspan="${keys.length + 1}" style="text-align:center;font-size:18px;font-weight:bold;background:#f2f2f2;">${escapeHtml(args.title)}${args.subtitle ? ` (${escapeHtml(args.subtitle)})` : ""}</th></tr>`;
  exportHtmlTable(
    "Subject & GradeWise Report.xls",
    titleRow,
    `${head}<tbody>${body}</tbody>`,
  );
}

function gradewisePrintCellAlign(key: string): string {
  return /^subject$/i.test(key) ? "left" : "center";
}

function printGradewiseReport(args: {
  collegeName: string;
  title: string;
  examLabel: string;
  courseGroup: string;
  courseYear: string;
  logoUrl: string;
  fallbackLogo: string;
  rows: Row[];
}): void {
  if (!args.rows.length) return;

  const keys = gradewiseDataKeys(args.rows[0]);
  const head = `<thead><tr>${keys
    .map(
      (k) =>
        `<th${/^subject$/i.test(k) ? ' style="text-align:left"' : ""}>${escapeHtml(k)}</th>`,
    )
    .join("")}</tr></thead>`;
  const body = args.rows
    .map(
      (r) =>
        `<tr>${keys
          .map(
            (k) =>
              `<td style="text-align:${gradewisePrintCellAlign(k)}">${escapeHtml(dash(r[k]))}</td>`,
          )
          .join("")}</tr>`,
    )
    .join("");

  const courseMeta = args.courseGroup
    ? `<p class="meta-left">Course : ${escapeHtml(args.courseGroup)}</p>`
    : "";
  const semesterMeta = args.courseYear
    ? `<p class="meta-right">Semester : ${escapeHtml(args.courseYear)}</p>`
    : "";

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(args.title)}</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #000;
      font-family: "Times New Roman", Times, serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body { font-size: 12px; line-height: 1.25; }
    .sheet { width: 98%; margin: 0 auto; }
    .header {
      display: grid;
      grid-template-columns: 20% 80%;
      align-items: center;
      margin-bottom: 8px;
    }
    .logo-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100px;
    }
    .logo {
      max-width: 120px;
      max-height: 120px;
      object-fit: contain;
    }
    .title-wrap { text-align: center; }
    .college-name {
      margin: 0;
      font-size: 22px;
      font-weight: 550;
      text-transform: capitalize;
    }
    .report-title {
      margin: 4px 0 0;
      font-size: 18px;
      font-weight: 550;
    }
    .exam-line {
      margin: 4px 0 0;
      font-size: 16px;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      width: 100%;
      margin: 6px 0 10px;
      font-size: 14px;
      font-weight: 500;
    }
    .meta-left { margin: 0; text-align: left; width: 50%; }
    .meta-right { margin: 0; text-align: right; width: 50%; }
    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      margin: 0 auto;
    }
    th, td {
      border: 1px solid #000;
      padding: 3px 4px;
      vertical-align: middle;
      word-break: break-word;
    }
    th {
      font-size: 10px;
      font-weight: 700;
      text-align: center;
    }
    td { font-size: 10px; }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div class="logo-wrap">
        <img class="logo" src="${escapeHtml(args.logoUrl)}" alt="College Logo"
          onerror="this.onerror=null;this.src='${escapeHtml(args.fallbackLogo)}'" />
      </div>
      <div class="title-wrap">
        ${args.collegeName ? `<p class="college-name">${escapeHtml(args.collegeName)}</p>` : ""}
        <p class="report-title">${escapeHtml(args.title)}</p>
        ${args.examLabel ? `<p class="exam-line">${escapeHtml(args.examLabel)}</p>` : ""}
      </div>
    </div>
    ${courseMeta || semesterMeta ? `<div class="meta-row">${courseMeta}${semesterMeta}</div>` : ""}
    <table>${head}<tbody>${body}</tbody></table>
  </div>
</body>
</html>`;

  printHtmlInIframe(html);
}

function printFinalAnalysisReport(args: {
  collegeName: string;
  courseLabel: string;
  title: string;
  logoUrl: string;
  rows: Row[];
}): void {
  if (!args.rows.length) return;

  const body = args.rows
    .map(
      (r, i) => `<tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(dash(r.course_name))}</td>
        <td>${escapeHtml(dash(r.course_group))}</td>
        <td>${escapeHtml(dash(r.course_year))}</td>
        <td>${escapeHtml(dash(r.Appeared ?? r.appeared))}</td>
        <td>${escapeHtml(dash(r.passed))}</td>
        <td>${escapeHtml(dash(r.Pass_percentage ?? r.Passed_percent))}</td>
        <td>${escapeHtml(dash(r.Promoted))}</td>
        <td>${escapeHtml(dash(r.Promoted_Percentage))}</td>
        <td>${escapeHtml(dash(r.Detained))}</td>
        <td>${escapeHtml(dash(r.Detained_Percentage))}</td>
      </tr>`,
    )
    .join("");

  const courseLine = args.courseLabel
    ? `<p class="meta">Course : ${escapeHtml(args.courseLabel)}</p>`
    : "";

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(args.title)}</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #000;
      font-family: "Times New Roman", Times, serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body { font-size: 12px; line-height: 1.25; }
    .sheet {
      width: 98%;
      margin: 0 auto;
    }
    .header {
      display: grid;
      grid-template-columns: 72px 1fr 72px;
      align-items: center;
      margin-bottom: 8px;
    }
    .logo-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 64px;
    }
    .logo {
      max-width: 60px;
      max-height: 60px;
      object-fit: contain;
    }
    .title-wrap {
      text-align: center;
    }
    .college-name {
      margin: 0;
      font-size: 18px;
      font-weight: 700;
    }
    .report-title {
      margin: 2px 0 0;
      font-size: 15px;
      font-weight: 700;
    }
    .meta {
      margin: 0 0 6px;
      font-size: 11px;
    }
    table {
      width: 99%;
      border-collapse: collapse;
      table-layout: fixed;
      margin: 0 auto;
    }
    th, td {
      border: 1px solid #000;
      padding: 3px;
      vertical-align: middle;
      text-align: center;
      word-break: break-word;
    }
    th {
      font-size: 9.5px;
      font-weight: 700;
    }
    td {
      font-size: 9.5px;
    }
    .left { text-align: left; }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div class="logo-wrap">
        <img class="logo" src="${escapeHtml(args.logoUrl)}" alt="College Logo" />
      </div>
      <div class="title-wrap">
        ${
          args.collegeName
            ? `<p class="college-name">${escapeHtml(args.collegeName)}</p>`
            : ""
        }
        <p class="report-title">${escapeHtml(args.title)}</p>
      </div>
      <div></div>
    </div>
    ${courseLine}
    <table>
      <thead>
        <tr>
          <th rowspan="2" style="width:5%">SI.No</th>
          <th rowspan="2" style="width:13%">Course</th>
          <th rowspan="2" style="width:10%">Course Group</th>
          <th rowspan="2" style="width:11%">Course Year</th>
          <th colspan="1" style="width:8%">Appeared</th>
          <th colspan="2" style="width:16%">Passed</th>
          <th colspan="2" style="width:16%">Promoted</th>
          <th colspan="2" style="width:18%">Detained</th>
        </tr>
        <tr>
          <th>Count</th>
          <th>Count</th>
          <th>%</th>
          <th>Count</th>
          <th>%</th>
          <th>Count</th>
          <th>%</th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
  </div>
</body>
</html>`;

  printHtmlInIframe(html);
}

/** Angular print layout — Branch & Subject-Wise Result Analysis (table only). */
function printGroupSubjectwiseReport(args: {
  collegeName: string;
  academicYear: string;
  courseGroup: string;
  examLabel: string;
  logoUrl?: string | null;
  rows: Row[];
}): void {
  if (!args.rows.length) return;

  // Angular groups by course_group; print Course Group in header, not as a column
  const byGroup = new Map<string, Row[]>();
  for (const r of args.rows) {
    const g = txt(r.course_group) || args.courseGroup || "—";
    const list = byGroup.get(g) ?? [];
    list.push(r);
    byGroup.set(g, list);
  }

  const sections = [...byGroup.entries()]
    .map(([groupCode, subjects]) => {
      const body = subjects
        .map((r, i) => {
          const subject = dash(r.SUBJECT ?? r.subject_name ?? r.subject);
          return `<tr>
            <td style="text-align:center">${i + 1}</td>
            <td style="text-align:left">${escapeHtml(subject)}</td>
            <td style="text-align:left">${escapeHtml(dash(r.registered))}</td>
            <td style="text-align:left">${escapeHtml(dash(r.Appeared ?? r.appeared))}</td>
            <td style="text-align:center">${escapeHtml(dash(r.Passed ?? r.passed))}</td>
            <td style="text-align:center">${escapeHtml(dash(r.failed))}</td>
            <td style="text-align:center">${escapeHtml(dash(r.Pass_percentage ?? r.Passed_percent))}</td>
          </tr>`;
        })
        .join("");

      const first = subjects[0] ?? {};
      const totalsRow =
        first.total_registered != null || first.total_appeared != null
          ? `<tr>
              <td colspan="2" style="text-align:left;font-weight:600">Branch Wise Result</td>
              <td style="text-align:left;font-weight:600">${escapeHtml(dash(first.total_registered))}</td>
              <td style="text-align:left;font-weight:600">${escapeHtml(dash(first.total_appeared))}</td>
              <td style="text-align:center;font-weight:600">${escapeHtml(dash(first.total_passed))}</td>
              <td style="text-align:center;font-weight:600">${escapeHtml(dash(first.total_failed))}</td>
              <td style="text-align:center;font-weight:600">${escapeHtml(dash(first.total_pass_percentage))}</td>
            </tr>`
          : "";

      return `
        <p class="meta">Academic Year : ${escapeHtml(args.academicYear || "—")}</p>
        <p class="meta">Course Group : ${escapeHtml(groupCode)}</p>
        <table>
          <thead>
            <tr>
              <th>S.No</th>
              <th>Subject</th>
              <th>Registered</th>
              <th>Appeared</th>
              <th>Passed</th>
              <th>Failed</th>
              <th>Pass Percentage</th>
            </tr>
          </thead>
          <tbody>${body}${totalsRow}</tbody>
        </table>`;
    })
    .join('<div style="height:16px"></div>');

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Branch & Subject-Wise Result Analysis</title>
<style>
@page { size: A4 portrait; margin: 12mm; }
body { font: 12px/1.4 Arial, Helvetica, sans-serif; color: #000; margin: 0; }
.meta { font-weight: 600; margin: 0 0 8px; }
table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
th, td { border: 1px solid #94a3b8; padding: 4px 6px; text-align: left; vertical-align: top; word-break: break-word; }
th { background: #c3d9ff; font-weight: 600; text-align: center; }
tr { break-inside: avoid; }
.header-row { display: flex; align-items: flex-start; width: 100%; margin-bottom: 20px; }
.logo-col { width: 80px; flex: 0 0 80px; }
.logo-col img { max-width: 100%; height: auto; display: block; }
.title-col { flex: 1 1 auto; text-align: center; padding-right: 80px; }
</style></head><body>
  <div class="header-row">
    <div class="logo-col">
      <img src="${args.logoUrl || "/assets/images/logo.jpg"}" alt="College ERP" />
    </div>
    <div class="title-col">
      <h2 style="margin:0 0 5px; font-size:16px;">${escapeHtml(args.collegeName)}</h2>
      <h3 style="margin:0 0 5px; font-size:14px;">Branch & Subject-Wise Result Analysis</h3>
      <p style="margin:0; font-size:12px;">${escapeHtml(args.examLabel)}</p>
    </div>
  </div>
  ${sections}
</body></html>`;

  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(frame);
  const fdoc = frame.contentDocument;
  const win = frame.contentWindow;
  if (!fdoc || !win) {
    frame.remove();
    return;
  }
  fdoc.open();
  fdoc.write(html);
  fdoc.close();
  win.addEventListener("afterprint", () => frame.remove());
  setTimeout(() => {
    win.focus();
    win.print();
  }, 50);
}

export function ExamFinalAnalysisReportPage({
  kind,
}: {
  kind: ExamFinalAnalysisKind;
}) {
  const title = TITLES[kind];
  const [loading, setLoading] = useState(false);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [employeeId, setEmployeeId] = useState(0);
  const [baseRows, setBaseRows] = useState<Row[]>([]);
  const [restRows, setRestRows] = useState<Row[]>([]);
  const [examFeeTypesList, setExamFeeTypesList] = useState<Row[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [courseId, setCourseId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [examId, setExamId] = useState("");
  const [examTypeId, setExamTypeId] = useState("0");
  const [collegeId, setCollegeId] = useState("");
  const [courseGroupId, setCourseGroupId] = useState("");
  const [courseYearId, setCourseYearId] = useState("");
  const [isReevaluation, setIsReevaluation] = useState(false);
  const [examFeeTypes, setExamFeeTypes] = useState<Row[]>([]);
  const collegeLogo = useCollegeLogo(Number(collegeId) || null);

  useEffect(() => {
    setEmployeeId(Number(globalThis?.localStorage?.getItem("employeeId") ?? 0));
  }, []);

  useEffect(() => {
    async function init() {
      if (!employeeId) return;
      setLoadingFilters(true);
      try {
        const [filters, feeTypes] = await Promise.all([
          getUnivExamFiltersRegSup(employeeId),
          listExamFeeTypes().catch(() => []),
        ]);
        const list = Array.isArray(filters) ? filters : [];
        setBaseRows(list);
        setExamFeeTypesList(Array.isArray(feeTypes) ? feeTypes : []);
        const courses = dedupeBy(list, (r) => num(r.fk_course_id));
        if (courses[0]) setCourseId(String(num(courses[0].fk_course_id)));
      } catch (e) {
        toastError(e, "Failed to load filters");
      } finally {
        setLoadingFilters(false);
      }
    }
    void init();
  }, [employeeId]);

  const courses = useMemo(
    () => dedupeBy(baseRows, (r) => num(r.fk_course_id)),
    [baseRows],
  );
  const academicYears = useMemo(
    () =>
      dedupeBy(
        baseRows.filter((r) => num(r.fk_course_id) === Number(courseId)),
        (r) => num(r.fk_academic_year_id),
      ),
    [baseRows, courseId],
  );
  const exams = useMemo(
    () =>
      dedupeBy(
        baseRows.filter(
          (r) =>
            num(r.fk_course_id) === Number(courseId) &&
            num(r.fk_academic_year_id) === Number(academicYearId),
        ),
        (r) => num(r.fk_exam_id),
      ),
    [baseRows, courseId, academicYearId],
  );
  const colleges = useMemo(
    () => dedupeBy(restRows, (r) => num(r.fk_college_id)),
    [restRows],
  );
  const courseGroups = useMemo(() => {
    const source = restRows.filter(
      (r) => !collegeId || num(r.fk_college_id) === Number(collegeId),
    );
    return dedupeBy(source, (r) => num(r.fk_course_group_id));
  }, [restRows, collegeId]);
  const courseYears = useMemo(() => {
    const source = restRows.filter(
      (r) =>
        (!collegeId || num(r.fk_college_id) === Number(collegeId)) &&
        (!courseGroupId || num(r.fk_course_group_id) === Number(courseGroupId)),
    );
    return dedupeBy(source, (r) => num(r.fk_course_year_id));
  }, [restRows, collegeId, courseGroupId]);

  const examTypeOptions: SelectOption[] = useMemo(
    () => [
      { value: "0", label: "All" },
      ...examFeeTypes.map((r) => ({
        value: String(num(r.generalDetailId ?? r.general_detail_id)),
        label:
          txt(r.generalDetailCode ?? r.general_detail_code) ||
          String(num(r.generalDetailId)),
      })),
    ],
    [examFeeTypes],
  );

  const selectedCollegeCode = txt(
    colleges.find((r) => num(r.fk_college_id) === Number(collegeId))
      ?.college_code,
  );
  const selectedCourseCode = txt(
    courses.find((r) => num(r.fk_course_id) === Number(courseId))?.course_code,
  );
  const selectedCourseGroupCode = txt(
    courseGroups.find(
      (r) => num(r.fk_course_group_id) === Number(courseGroupId),
    )?.group_code,
  );
  const selectedExamName = txt(
    exams.find((r) => num(r.fk_exam_id) === Number(examId))?.exam_name,
  );
  /** Table card: page name plus selected filters, e.g. `Report - (college / course / group)`. */
  const tableCardTitle = useMemo(() => {
    if (rows.length === 0) return title;
    if (kind === "final-analysis") {
      const parts = [
        selectedCollegeCode,
        selectedCourseCode,
        selectedCourseGroupCode,
      ].filter(Boolean);
      return parts.length ? `${title} - (${parts.join(" / ")})` : title;
    }
    if (kind === "gradewise") {
      const parts = [selectedCollegeCode, selectedExamName].filter(Boolean);
      return parts.length ? `${title} - (${parts.join(" / ")})` : title;
    }
    return title;
  }, [
    kind,
    rows.length,
    title,
    selectedCollegeCode,
    selectedCourseCode,
    selectedCourseGroupCode,
    selectedExamName,
  ]);

  useEffect(() => {
    if (!courseId || !academicYears.length) return;
    if (
      !academicYears.some(
        (r) => num(r.fk_academic_year_id) === Number(academicYearId),
      )
    ) {
      setAcademicYearId(String(num(academicYears[0].fk_academic_year_id)));
    }
  }, [courseId, academicYears, academicYearId]);

  useEffect(() => {
    if (!academicYearId || !exams.length) return;
    if (!exams.some((r) => num(r.fk_exam_id) === Number(examId))) {
      setExamId(String(num(exams[0].fk_exam_id)));
    }
  }, [academicYearId, exams, examId]);

  // Angular getExamTypes: default to first Regular/Supple/Internal id (user can still pick All).
  useEffect(() => {
    const typed = examTypeOptions.filter((o) => o.value !== "0");
    if (typed.length === 0) {
      setExamTypeId("0");
      return;
    }
    setExamTypeId(typed[0].value);
  }, [examId, examTypeOptions]);

  useEffect(() => {
    async function loadRest() {
      if (!courseId || !academicYearId || !examId || !employeeId) {
        setRestRows([]);
        setExamFeeTypes([]);
        return;
      }
      setLoadingFilters(true);
      try {
        const [bundle, feeTypes] = await Promise.all([
          getUnivExamRestInRegExamStd({
            courseId: Number(courseId),
            examId: Number(examId),
            academicYearId: Number(academicYearId),
            employeeId,
            flagType: "REGSUP",
          }),
          getGeneralDetails(GM_CODES.EXAM_FEE_TYPE).catch(() => []),
        ]);
        setRestRows(
          Array.isArray(bundle.restFilters) ? bundle.restFilters : [],
        );
        const examRow =
          baseRows.find(
            (r) =>
              num(r.fk_course_id) === Number(courseId) &&
              num(r.fk_academic_year_id) === Number(academicYearId) &&
              num(r.fk_exam_id) === Number(examId),
          ) ?? null;

        setExamFeeTypes(feeTypes);
        setExamTypeId(
          feeTypes[0]
            ? String(
                num(
                  feeTypes[0].generalDetailId ?? feeTypes[0].general_detail_id,
                ),
              )
            : "0",
        );
        setCollegeId("");
        setCourseGroupId("");
        setCourseYearId("");
        setRows([]);
        setHasFetched(false);
      } catch (e) {
        toastError(e, "Failed to load filters");
        setRestRows([]);
        setExamFeeTypes([]);
      } finally {
        setLoadingFilters(false);
      }
    }
    void loadRest();
  }, [courseId, academicYearId, examId, employeeId]);

  useEffect(() => {
    if (!colleges.length) return;
    if (!colleges.some((r) => num(r.fk_college_id) === Number(collegeId))) {
      setCollegeId(String(num(colleges[0].fk_college_id)));
    }
  }, [colleges, collegeId]);

  useEffect(() => {
    if (!courseGroups.length) return;
    if (
      !courseGroups.some(
        (r) => num(r.fk_course_group_id) === Number(courseGroupId),
      )
    ) {
      setCourseGroupId(String(num(courseGroups[0].fk_course_group_id)));
      setCourseYearId("");
    }
  }, [courseGroups, courseGroupId]);

  useEffect(() => {
    if (!courseYears.length) return;
    if (
      !courseYears.some(
        (r) => num(r.fk_course_year_id) === Number(courseYearId),
      )
    ) {
      setCourseYearId(String(num(courseYears[0].fk_course_year_id)));
    }
  }, [courseYears, courseYearId]);

  async function onGetList() {
    if (!courseId || !examId || !collegeId || !courseGroupId || !courseYearId) {
      toast.info("Please Select Valid Filters");
      return;
    }
    setLoading(true);
    setHasFetched(true);
    try {
      const list = await getExamFinalAnalysisReport({
        flag: flagForKind(kind, isReevaluation),
        examId: Number(examId),
        examTypeCatDetId: Number(examTypeId || 0),
        collegeId: Number(collegeId),
        courseId: Number(courseId),
        courseGroupId: Number(courseGroupId),
        courseYearId: Number(courseYearId),
      });
      setRows(Array.isArray(list) ? list : []);
      if (!list?.length) toast.info("No Records Found.");
    } catch (e) {
      toastError(e, "Failed to load report");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  const columnDefs = useMemo<(ColDef<Row> | ColGroupDef<Row>)[]>(() => {
    if (kind === "final-analysis") return finalAnalysisColumnDefs;
    if (kind === "gradewise" && rows.length > 0)
      return buildGradewiseCols(rows[0]);
    if (kind === "result-sheets") return resultSheetsCols;
    return groupSubjectwiseCols;
  }, [kind, rows]);

  const getRowId = useCallback(
    (p: { data?: Row }) => {
      if (kind === "final-analysis") {
        return `${txt(p.data?.course_group)}-${txt(p.data?.course_year)}-${txt(p.data?.course_name)}`;
      }
      if (kind === "gradewise") {
        const keys = gradewiseDataKeys(p.data ?? {});
        return `gradewise-${keys.map((k) => txt(p.data?.[k])).join("-")}`;
      }
      return `${txt(p.data?.hallticket_number)}-${txt(p.data?.SUBJECT)}-${txt(p.data?.course_group)}`;
    },
    [kind],
  );

  const handleExportExcel = useCallback(() => {
    if (rows.length === 0) return;

    const college =
      colleges.find((r) => num(r.fk_college_id) === Number(collegeId)) ?? null;
    const collegeCode =
      txt(college?.college_code) || txt(rows[0]?.college_code) || "";
    const exam =
      txt(rows[0]?.exam_label_name) ||
      txt(exams.find((r) => num(r.fk_exam_id) === Number(examId))?.exam_name) ||
      "";

    if (kind === "final-analysis") {
      exportFinalAnalysisExcel({
        title: "Result Analysis Report",
        subtitle: [collegeCode, exam].filter(Boolean).join(" / "),
        rows,
      });
      return;
    }

    if (kind === "gradewise") {
      exportGradewiseExcel({
        title: "Subject & GradeWise Result Analysis",
        subtitle: [collegeCode, exam].filter(Boolean).join(" / "),
        rows,
      });
    }
  }, [kind, rows, colleges, collegeId, exams, examId]);

  const filterFields = (
    <div className="inv-allot-report-filters space-y-2">
      <div className="inv-allot-report-filters__row">
        <div className="inv-allot-report-filters__fx15">
          <Label>Course *</Label>
          <Select
            value={courseId || null}
            onChange={(v) => {
              setCourseId(v ?? "");
              setAcademicYearId("");
              setExamId("");
            }}
            options={courses.map((r) => ({
              value: String(num(r.fk_course_id)),
              label: txt(r.course_code) || String(num(r.fk_course_id)),
            }))}
            isLoading={loadingFilters}
          />
        </div>
        <div className="inv-allot-report-filters__fx15">
          <Label>Exam Year *</Label>
          <Select
            value={academicYearId || null}
            onChange={(v) => {
              setAcademicYearId(v ?? "");
              setExamId("");
            }}
            options={academicYears.map((r) => ({
              value: String(num(r.fk_academic_year_id)),
              label: txt(r.academic_year) || String(num(r.fk_academic_year_id)),
            }))}
            disabled={!courseId}
          />
        </div>
        <div className="inv-allot-report-filters__fx52">
          <Label>Exam Master *</Label>
          <Select
            value={examId || null}
            onChange={(v) => setExamId(v ?? "")}
            options={exams.map((r) => ({
              value: String(num(r.fk_exam_id)),
              label: examMasterLabel(r),
            }))}
            searchable
            wrapOptionLabels
            disabled={!academicYearId}
          />
        </div>
        <div className="inv-allot-report-filters__fx15">
          <Label>Exam Type *</Label>
          <Select
            value={examTypeId}
            onChange={(v) => setExamTypeId(v ?? "0")}
            options={examTypeOptions}
          />
        </div>
      </div>
      <div className="inv-allot-report-filters__row">
        <div className="inv-allot-report-filters__fx15">
          <Label>College *</Label>
          <Select
            value={collegeId || null}
            onChange={(v) => {
              setCollegeId(v ?? "");
              setCourseGroupId("");
              setCourseYearId("");
            }}
            options={colleges.map((r) => ({
              value: String(num(r.fk_college_id)),
              label: txt(r.college_code) || String(num(r.fk_college_id)),
            }))}
            disabled={!examId}
          />
        </div>
        <div className="inv-allot-report-filters__fx15">
          <Label>Course Group *</Label>
          <Select
            value={courseGroupId || null}
            onChange={(v) => {
              setCourseGroupId(v ?? "");
              setCourseYearId("");
            }}
            options={courseGroups.map((r) => ({
              value: String(num(r.fk_course_group_id)),
              label: txt(r.group_code) || String(num(r.fk_course_group_id)),
            }))}
            disabled={!collegeId}
          />
        </div>
        <div className="inv-allot-report-filters__fx15">
          <Label>Course Year *</Label>
          <Select
            value={courseYearId || null}
            onChange={(v) => setCourseYearId(v ?? "")}
            options={courseYears.map((r) => ({
              value: String(num(r.fk_course_year_id)),
              label:
                txt(r.course_year_code) || String(num(r.fk_course_year_id)),
            }))}
            disabled={!courseGroupId}
          />
        </div>
        {kind === "result-sheets" ? (
          <div className="flex items-center gap-2 pb-1 inv-allot-report-filters__fx15">
            <Checkbox
              id="is-reevaluation"
              checked={isReevaluation}
              onCheckedChange={(v) => setIsReevaluation(v === true)}
            />
            <Label
              htmlFor="is-reevaluation"
              className="cursor-pointer font-normal"
            >
              Is Re-Evaluation
            </Label>
          </div>
        ) : null}
        <div className="flex items-end gap-2 inv-allot-report-filters__fx15">
          <Button
            type="button"
            className="h-8 text-[12px] w-full"
            onClick={() => void onGetList()}
            disabled={loading}
          >
            {kind === "final-analysis" || kind === "group-subjectwise"
              ? "Get Report"
              : "Get Report"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Reset"
            onClick={() => {
              setRows([]);
              setHasFetched(false);
              setIsReevaluation(false);
              const c = courses[0];
              if (c) setCourseId(String(num(c.fk_course_id)));
            }}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <FilteredListPage
      title={title}
      tableTitle={tableCardTitle}
      filters={filterFields}
      showTable={rows.length > 0}
      resultsVisible={rows.length > 0}
      fitColumnsToWidth={
        kind === "final-analysis" || kind === "group-subjectwise"
      }
      rowData={rows}
      columnDefs={columnDefs}
      loading={loading}
      pagination
      paginationPageSize={kind === "final-analysis" ? 10 : 25}
      getRowId={getRowId}
      pinnedBottomRowData={
        kind === "group-subjectwise" &&
        hasFetched &&
        rows.length > 0 &&
        (rows[0].total_registered != null || rows[0].total_appeared != null)
          ? [
              {
                SUBJECT: "Branch Wise Result",
                registered: rows[0].total_registered,
                Appeared: rows[0].total_appeared,
                Passed: rows[0].total_passed,
                failed: rows[0].total_failed,
                Pass_percentage: rows[0].total_pass_percentage,
              },
            ]
          : undefined
      }
      toolbarFooter={
        kind === "group-subjectwise" && hasFetched ? (
          <div className="px-3 pb-3">
            <p className="text-[13px] font-medium text-foreground">
              Course Group :{" "}
              {txt(
                courseGroups.find(
                  (c) => String(num(c.fk_course_group_id)) === courseGroupId,
                )?.group_code,
              )}
            </p>
          </div>
        ) : undefined
      }
      toolbar={{
        search: true,
        searchPlaceholder: "Search…",
        exportPdf: false,
        exportExcel:
          kind === "final-analysis" || kind === "gradewise" ? true : undefined,
      }}
      onExportExcel={
        kind === "final-analysis" || kind === "gradewise"
          ? handleExportExcel
          : undefined
      }
      toolbarTrailing={
        hasFetched && rows.length > 0 ? (
          <Button
            type="button"
            size="sm"
            className="h-9 text-[12px]"
            onClick={() => {
              void (async () => {
                if (kind === "final-analysis") {
                  const college =
                    colleges.find(
                      (r) => num(r.fk_college_id) === Number(collegeId),
                    ) ?? null;
                  const course =
                    courses.find(
                      (r) => num(r.fk_course_id) === Number(courseId),
                    ) ?? null;
                  const collegeName = await resolvePrintCollegeName(
                    Number(collegeId || 0),
                    college ?? rows[0] ?? null,
                  );

                  printFinalAnalysisReport({
                    collegeName,
                    courseLabel:
                      txt(course?.course_code) ||
                      txt(rows[0]?.course_name) ||
                      "",
                    title,
                    logoUrl: collegeLogo,
                    rows,
                  });
                  return;
                }
                if (kind === "gradewise") {
                  const college =
                    colleges.find(
                      (r) => num(r.fk_college_id) === Number(collegeId),
                    ) ?? null;
                  const group =
                    courseGroups.find(
                      (r) =>
                        num(r.fk_course_group_id) === Number(courseGroupId),
                    ) ?? null;
                  const year =
                    courseYears.find(
                      (r) => num(r.fk_course_year_id) === Number(courseYearId),
                    ) ?? null;
                  const examRow =
                    exams.find((r) => num(r.fk_exam_id) === Number(examId)) ??
                    null;
                  const logoSrc = await resolveReportPrintLogo(
                    null,
                    Number(collegeId || 0),
                    collegeLogo || DEFAULT_COLLEGE_LOGO,
                  );
                  const collegeName = await resolvePrintCollegeName(
                    Number(collegeId || 0),
                    college ?? rows[0] ?? null,
                  );
                  printGradewiseReport({
                    collegeName,
                    title: "Subject & GradeWise Result Analysis",
                    examLabel:
                      txt(examRow?.exam_name) ||
                      txt(rows[0]?.exam_label_name) ||
                      (examRow ? examMasterLabel(examRow) : "") ||
                      "",
                    courseGroup:
                      txt(group?.group_code) ||
                      txt(rows[0]?.course_group) ||
                      txt(rows[0]?.group_code) ||
                      "",
                    courseYear:
                      txt(year?.course_year_code) ||
                      txt(rows[0]?.course_year) ||
                      txt(rows[0]?.Course_Year) ||
                      "",
                    logoUrl: logoSrc,
                    fallbackLogo: toPrintLogoUrl(DEFAULT_COLLEGE_LOGO),
                    rows,
                  });
                  return;
                }
                if (kind === "group-subjectwise") {
                  const college =
                    colleges.find(
                      (r) => num(r.fk_college_id) === Number(collegeId),
                    ) ?? null;
                  const year =
                    academicYears.find(
                      (r) =>
                        num(r.fk_academic_year_id) === Number(academicYearId),
                    ) ?? null;
                  const group =
                    courseGroups.find(
                      (r) =>
                        num(r.fk_course_group_id) === Number(courseGroupId),
                    ) ?? null;
                  const exam =
                    exams.find((r) => num(r.fk_exam_id) === Number(examId)) ??
                    null;
                  const collegeName = await resolvePrintCollegeName(
                    Number(collegeId || 0),
                    college ?? rows[0] ?? null,
                  );
                  printGroupSubjectwiseReport({
                    collegeName,
                    academicYear: txt(year?.academic_year) || "",
                    courseGroup:
                      txt(group?.group_code) ||
                      txt(rows[0]?.course_group) ||
                      "",
                    examLabel:
                      txt(rows[0]?.exam_label_name) ||
                      (exam ? examMasterLabel(exam) : "") ||
                      "",
                    logoUrl: collegeLogo,
                    rows,
                  });
                  return;
                }
                window.print();
              })();
            }}
          >
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Print Report
          </Button>
        ) : undefined
      }
    />
  );
}
