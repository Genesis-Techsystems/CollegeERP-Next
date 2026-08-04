"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, Printer } from "lucide-react";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { MonthYearPicker } from "@/common/components/date-picker";
import { SearchInput } from "@/common/components/search";
import { Select, type SelectOption } from "@/common/components/select";
import { FilteredPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { MINIO_URL } from "@/config/constants/api";
import { DEFAULT_COLLEGE_LOGO } from "@/hooks/useCollegeLogo";
import { getErrorMessage } from "@/lib/errors";
import { printHtmlInIframe } from "@/lib/print";
import { toastError } from "@/lib/toast";
import {
  getStaffPayrollReportRows,
  listActiveCollegesForGeneralSettings,
  listDepartmentsByCollege,
  listEmployeeCategoriesForPayroll,
  type StaffPayrollReportParams,
} from "@/services";
import {
  buildPayrollPivotRows,
  flattenPayrollPivotRows,
  payrollCategoryField,
  splitPivotCategoryColumns,
  type PayrollPivotCategory,
} from "../_lib/payroll-pivot";
import { exportHtmlTableAsExcel } from "../_lib/export-html-table";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

type AnyRow = Record<string, unknown>;

type PayrollStaffReportPageProps = {
  title: string;
  reportFlag: StaffPayrollReportParams["reportFlag"];
  /** Pre-payroll audit passes month/year as 0 */
  usePeriod: boolean;
  exportFileName: string;
};

/** Angular print header hardcodes this label (pre-payroll-audit print block). */
const ANGULAR_PRINT_REPORT_TITLE = "Student Admission Report";

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function resolvePrintLogoUrl(logo: string | undefined | null): string {
  const path = String(logo ?? "").trim();
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const fallback = `${origin}${DEFAULT_COLLEGE_LOGO}`;
  if (!path) return fallback;
  if (/^https?:\/\//i.test(path) || path.startsWith("data:")) return path;
  if (path.startsWith("/")) return `${origin}${path}`;
  const base = String(MINIO_URL ?? "").replace(/\/$/, "");
  return base ? `${base}/${path.replace(/^\/+/, "")}` : fallback;
}

/**
 * Angular `#excelTable` / `#table-print` — exact header colspans + body cells.
 * Matches Teaching Staff screen alignment (incl. colspan=0 / missing Basic td quirk).
 */
function buildAngularPayrollTableHtml(
  groups: { label: string; rows: AnyRow[] }[],
  earnings: PayrollPivotCategory[],
  deductions: PayrollPivotCategory[],
  management: PayrollPivotCategory[],
  hasBasicCategory: boolean,
  options?: {
    reportTitle?: string;
    dataDetails?: string;
    categoryBanner?: string;
    /** `mar` = on-screen / Excel (blue headers); `second-table` = print */
    tableClass?: "mar" | "second-table";
  },
): string {
  const tableClass = options?.tableClass ?? "mar";
  const titleBlock =
    options?.reportTitle != null
      ? `<div style="display:none;text-align:center">
          <table><tr><td colspan="19" style="text-align:center">
            <h3>${escapeHtml(options.reportTitle)}${
              options.dataDetails ? ` - ${escapeHtml(options.dataDetails)}` : ""
            }</h3>
            ${
              options.categoryBanner
                ? `<h3>${escapeHtml(options.categoryBanner)} staff</h3>`
                : ""
            }
          </td></tr></table>
        </div>`
      : "";

  // Angular: colspan = count (may be 0). Row-2 heads: E ≠ BASIC, D, M, then Bank.
  const earnHeads = earnings
    .map(
      (c) => `<th class="table-th">${escapeHtml(c.payroll_category_name)}</th>`,
    )
    .join("");
  const dedHeads = deductions
    .map(
      (c) => `<th class="table-th">${escapeHtml(c.payroll_category_name)}</th>`,
    )
    .join("");
  const mgmtHeads = management
    .map(
      (c) => `<th class="table-th">${escapeHtml(c.payroll_category_name)}</th>`,
    )
    .join("");

  const tables = groups
    .map((group) => {
      const rowsHtml = group.rows
        .map((row) => {
          // Angular only emits Basic <td> when a BASIC earning exists on the pivot.
          const basicCell = hasBasicCategory
            ? `<td class="table-td">${escapeHtml(row.basic)}</td>`
            : "";
          const earnCells = earnings
            .map(
              (c) =>
                `<td class="table-td">${escapeHtml(
                  row[
                    payrollCategoryField(
                      "E",
                      c.payroll_category_code,
                      c.payroll_category_name,
                    )
                  ],
                )}</td>`,
            )
            .join("");
          const dedCells = deductions
            .map(
              (c) =>
                `<td class="table-td">${escapeHtml(
                  row[
                    payrollCategoryField(
                      "D",
                      c.payroll_category_code,
                      c.payroll_category_name,
                    )
                  ],
                )}</td>`,
            )
            .join("");
          const mgmtCells = management
            .map(
              (c) =>
                `<td class="table-td">${escapeHtml(
                  row[
                    payrollCategoryField(
                      "M",
                      c.payroll_category_code,
                      c.payroll_category_name,
                    )
                  ],
                )}</td>`,
            )
            .join("");

          return `<tr>
            <th class="table-td" style="color:blue">${escapeHtml(row.SNo)}</th>
            <th class="table-td">${escapeHtml(row.emp_number)}</th>
            <td class="table-td name-cell" style="color:blue">${escapeHtml(row.Faculty)}</td>
            <td class="table-td" style="color:blue">${escapeHtml(row.Emp_Designation)}</td>
            <td class="table-td" style="color:blue">${escapeHtml(row.Emp_Department)}</td>
            ${basicCell}
            ${earnCells}
            <td class="table-td" style="color:blue">${escapeHtml(row.gross_pay)}</td>
            ${dedCells}
            <td class="table-td" style="color:blue">${escapeHtml(row.total_ded)}</td>
            <td class="table-td" style="color:blue">${escapeHtml(row.net_pay)}</td>
            ${mgmtCells}
            <td class="table-td" style="color:blue">${escapeHtml(row.bank_acc_no)}</td>
          </tr>`;
        })
        .join("");

      return `
        ${group.label ? `<h3>${escapeHtml(group.label)} STAFF</h3>` : ""}
        <div class="payroll-report-scroll">
        <table class="${tableClass}">
          <thead>
            <tr>
              <th class="table-th1" rowspan="2">SI.No</th>
              <th class="table-th" rowspan="2">Employee No</th>
              <th class="table-th" rowspan="2">Name</th>
              <th class="table-th" rowspan="2">Designation</th>
              <th class="table-th" rowspan="2">Deptartment</th>
              <th class="table-th" rowspan="2">Basic</th>
              <th class="table-th" colspan="${earnings.length}">Earnings</th>
              <th class="table-th" rowspan="2">Gross Salary</th>
              <th class="table-th" colspan="${deductions.length}">Deductions</th>
              <th class="table-th" rowspan="2">Total Ded.</th>
              <th class="table-th" rowspan="2">Net Salary</th>
              <th class="table-th" colspan="${management.length}">Management Deductions</th>
              <th class="table-th" colspan="1"></th>
            </tr>
            <tr>
              ${earnHeads}
              ${dedHeads}
              ${mgmtHeads}
              <th class="table-th">Bank A/c No.</th>
            </tr>
          </thead>
          <tbody>${
            rowsHtml ||
            `<tr><td class="table-td" colspan="20" style="text-align:center">No employees in this category</td></tr>`
          }</tbody>
        </table>
        </div>`;
    })
    .join("");

  return `${titleBlock}${tables}`;
}

/** On-screen / Excel — Angular `.mar` light-blue headers. */
const REPORT_SCREEN_STYLES = `
.payroll-report-scroll{overflow-x:auto;width:100%;-webkit-overflow-scrolling:touch}
table.mar{width:max-content;min-width:100%;border-collapse:separate;border-spacing:1px;font-size:12px;margin:0 0 8px}
table.mar .table-th,table.mar .table-th1{
  padding:8px 10px;background:#C3D9FF;font-weight:600;text-align:center;
  white-space:nowrap;border:1px solid #c5d4e8;color:#111;
  font-size:12px;vertical-align:middle
}
table.mar .table-td{
  padding:8px 10px;text-align:center;font-weight:500;border:1px solid #ddd;
  background:#fff;vertical-align:middle
}
table.mar .table-td.name-cell{max-width:120px;word-break:break-word}
.payroll-staff-report-table h3{
  margin:12px 0 8px;text-align:center;text-transform:uppercase;
  font-size:14px;font-weight:700
}
`;

/** Angular `@media print` styles for pre-payroll-audit-report. */
const REPORT_PRINT_STYLES = `
body{font-family:Arial,Helvetica,sans-serif;color:#000;padding:12px;margin:0;background:#fff}
.portraitLogo{height:90px;width:auto;max-width:140px;object-fit:contain}
.print-header{display:flex;align-items:flex-start;gap:16px;margin-bottom:8px}
.print-header-text{flex:1;min-width:0}
.collegeName{text-align:center!important;font-size:28px!important;margin:-5px 0!important;font-weight:550!important;color:#000!important}
.title-2{text-align:center!important;font-size:18px!important;font-weight:550!important;margin:4px 0!important;color:#000!important}
.title{text-align:center!important;font-size:24px!important;font-weight:550!important;margin:4px 0 12px!important;color:#000!important}
#first-table{width:100%;border:1px solid #000;border-collapse:collapse;margin:0 0 14px}
#first-table td{border:none!important;font-size:15px!important;font-weight:700!important;text-align:center!important;padding:8px}
#first-table td .paybill-red{color:red!important}
.payroll-report-scroll{overflow:visible}
.second-table{width:100%;border:1px solid #000!important;border-collapse:collapse;margin-bottom:16px;font-size:10px}
.second-table th,.second-table .table-th,.second-table .table-th1{
  border:1px solid #000!important;text-align:center!important;padding:8px!important;
  font-weight:500!important;font-size:10px!important;background:#fff;white-space:nowrap
}
.second-table td,.second-table .table-td{
  border:1px solid #000!important;text-align:center!important;padding:8px!important;
  font-weight:500!important;font-size:10px!important;white-space:nowrap
}
h3{font-weight:bold!important;text-align:center!important;text-transform:uppercase!important;margin:10px 0 6px}
@page{size:portrait;margin:10mm}
@media print{*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}
`;

export function PayrollStaffReportPage({
  title,
  reportFlag,
  usePeriod,
  exportFileName,
}: PayrollStaffReportPageProps) {
  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [departmentId, setDepartmentId] = useState<number>(0);
  const [empCategoryId, setEmpCategoryId] = useState<number>(0);
  const [period, setPeriod] = useState<Date>(new Date());
  const [colleges, setColleges] = useState<SelectOption[]>([]);
  const [collegeDetails, setCollegeDetails] = useState<
    Array<{ id: number; code: string; name: string; logo: string }>
  >([]);
  const [departments, setDepartments] = useState<SelectOption[]>([
    { value: "0", label: "All" },
  ]);
  const [categories, setCategories] = useState<SelectOption[]>([
    { value: "0", label: "All" },
  ]);
  const [categoryDetails, setCategoryDetails] = useState<
    Array<{ id: number; code: string; label: string }>
  >([]);
  const [flatRows, setFlatRows] = useState<AnyRow[]>([]);
  const [earningsCols, setEarningsCols] = useState<PayrollPivotCategory[]>([]);
  const [deductionCols, setDeductionCols] = useState<PayrollPivotCategory[]>(
    [],
  );
  const [mgmtCols, setMgmtCols] = useState<PayrollPivotCategory[]>([]);
  const [hasBasicCategory, setHasBasicCategory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRun, setHasRun] = useState(false);
  const [dataDetails, setDataDetails] = useState("");
  const [searchText, setSearchText] = useState("");

  const facultyLabel = usePeriod ? "College" : "Faculty";

  const clearReport = () => {
    setFlatRows([]);
    setHasRun(false);
    setDataDetails("");
    setError(null);
    setSearchText("");
    setHasBasicCategory(false);
  };

  useEffect(() => {
    void (async () => {
      try {
        const collegeList = await listActiveCollegesForGeneralSettings();
        setColleges(
          collegeList.map((c) => ({
            value: String(c.collegeId),
            label: String(c.collegeCode ?? c.collegeName ?? c.collegeId),
          })),
        );
        setCollegeDetails(
          collegeList.map((college) => ({
            id: Number(college.collegeId),
            code: String(college.collegeCode ?? ""),
            name: String(college.collegeName ?? college.collegeCode ?? ""),
            logo: String(college.logo ?? ""),
          })),
        );
        if (collegeList.length > 0) {
          setCollegeId(Number(collegeList[0]!.collegeId));
        }
      } catch (e) {
        toastError(e, "Failed to load filters");
      }
    })();
  }, []);

  useEffect(() => {
    if (!collegeId) return;
    setDepartmentId(0);
    clearReport();
    void (async () => {
      try {
        const depts = await listDepartmentsByCollege(collegeId);
        setDepartments([
          { value: "0", label: "All" },
          ...depts.map((d) => ({
            value: String(d.departmentId),
            label: String(d.deptCode ?? d.deptName ?? d.departmentId),
          })),
        ]);
        if (depts.length > 0) {
          setDepartmentId(Number(depts[0]!.departmentId));
        }
      } catch (e) {
        setDepartments([{ value: "0", label: "All" }]);
        toastError(e, "Failed to load departments");
      }

      try {
        const categoryRows = await listEmployeeCategoriesForPayroll();
        const normalizedCategories = categoryRows.map((category) => ({
          id: Number(category.generalDetailId ?? category.generalDetailID),
          code: String(category.generalDetailCode ?? ""),
          label: String(
            category.generalDetailDisplayName ??
              category.generalDetailCode ??
              "",
          ),
        }));
        setCategoryDetails(normalizedCategories);
        setCategories([
          { value: "0", label: "All" },
          ...normalizedCategories.map((category) => ({
            value: String(category.id),
            label: category.label,
          })),
        ]);
      } catch (e) {
        setCategoryDetails([]);
        setCategories([{ value: "0", label: "All" }]);
        toastError(e, "Failed to load employee categories");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collegeId]);

  const runReport = useCallback(async () => {
    if (!collegeId) return;
    setLoading(true);
    setError(null);
    setHasRun(true);
    try {
      const month = usePeriod ? period.getMonth() + 1 : 0;
      const year = usePeriod ? period.getFullYear() : 0;
      const raw = await getStaffPayrollReportRows({
        reportFlag,
        month,
        year,
        collegeId,
        departmentId,
        empCategoryId,
      });
      const { keys, pivotRows: pivoted } = buildPayrollPivotRows(raw);
      const split = splitPivotCategoryColumns(keys);
      setEarningsCols(split.earnings);
      setDeductionCols(split.deductions);
      setMgmtCols(split.management);
      setHasBasicCategory(
        keys.some(
          (k) =>
            String(k.payroll_category_type).toUpperCase() === "E" &&
            String(k.payroll_category_code).toUpperCase() === "BASIC",
        ),
      );
      setFlatRows(flattenPayrollPivotRows(pivoted));

      const collegeCode =
        collegeDetails.find((c) => c.id === collegeId)?.code ??
        colleges.find((c) => c.value === String(collegeId))?.label ??
        "";
      const parts: string[] = [collegeCode].filter(Boolean);
      if (departmentId !== 0) {
        const deptCode =
          departments.find((d) => d.value === String(departmentId))?.label ??
          "";
        if (deptCode) parts.push(deptCode);
      }
      if (usePeriod) {
        parts.push(MONTHS[period.getMonth()]!);
      }
      setDataDetails(parts.join("/"));
    } catch (e) {
      setError(getErrorMessage(e));
      toastError(e, "Report failed");
      setFlatRows([]);
      setDataDetails("");
    } finally {
      setLoading(false);
    }
  }, [
    collegeId,
    collegeDetails,
    departmentId,
    empCategoryId,
    period,
    reportFlag,
    usePeriod,
    colleges,
    departments,
  ]);

  // Report search — match visible identity fields (name + employee no., etc.).
  // Angular facultyFilter only checks Faculty; searching emp prefix like "unigug"
  // then incorrectly emptied the grid.
  const filteredRows = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return flatRows;
    return flatRows.filter((row) => {
      const haystack = [
        row.Faculty,
        row.emp_number,
        row.Emp_Designation,
        row.Emp_Department,
        row.SNo,
      ]
        .map((v) => String(v ?? "").toLowerCase())
        .join(" ");
      return haystack.includes(q);
    });
  }, [flatRows, searchText]);

  const reportGroups = useMemo(() => {
    if (empCategoryId !== 0) {
      return [
        {
          label:
            categoryDetails.find((category) => category.id === empCategoryId)
              ?.label ?? "Employee",
          rows: filteredRows,
        },
      ];
    }
    if (categoryDetails.length === 0) {
      return [{ label: "", rows: filteredRows }];
    }
    return categoryDetails.map((category) => ({
      label: category.label,
      rows: filteredRows.filter(
        (row) => String(row.gd_code ?? "") === category.code,
      ),
    }));
  }, [categoryDetails, empCategoryId, filteredRows]);

  const categoryBanner = useMemo(() => {
    if (empCategoryId !== 0) {
      return (
        categoryDetails.find((category) => category.id === empCategoryId)
          ?.label ?? "Employee"
      );
    }
    return "TEACHING AND NON-TEACHING";
  }, [categoryDetails, empCategoryId]);

  const tablesHtml = useMemo(
    () =>
      buildAngularPayrollTableHtml(
        reportGroups,
        earningsCols,
        deductionCols,
        mgmtCols,
        hasBasicCategory,
        { tableClass: "mar" },
      ),
    [reportGroups, earningsCols, deductionCols, mgmtCols, hasBasicCategory],
  );

  const handleExportExcel = () => {
    if (flatRows.length === 0) return;
    const html = buildAngularPayrollTableHtml(
      reportGroups,
      earningsCols,
      deductionCols,
      mgmtCols,
      hasBasicCategory,
      {
        reportTitle: title,
        dataDetails,
        categoryBanner,
        tableClass: "mar",
      },
    );
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    exportHtmlTableAsExcel(wrapper, exportFileName);
  };

  const handlePrint = () => {
    if (flatRows.length === 0) return;
    const college = collegeDetails.find((entry) => entry.id === collegeId);
    const departmentLabel =
      departmentId === 0
        ? "All"
        : (departments.find((entry) => entry.value === String(departmentId))
            ?.label ?? "All");
    const monthName = MONTHS[period.getMonth()] ?? "";
    const year = period.getFullYear();
    const logoSrc = resolvePrintLogoUrl(college?.logo);
    const orgCode =
      typeof window !== "undefined"
        ? window.localStorage.getItem("orgCode")
        : null;
    const collegeName = college?.name ?? "";
    const fallbackLogo = resolvePrintLogoUrl("");

    const logoBlock =
      orgCode === "SUK"
        ? `<div style="text-align:center;margin-bottom:8px">
            <img src="${escapeHtml(logoSrc)}" alt="" style="width:100%;max-height:130px;object-fit:contain"
              onerror="this.onerror=null;this.src='${escapeHtml(fallbackLogo)}'" />
          </div>`
        : `<div class="print-header">
            <img src="${escapeHtml(logoSrc)}" alt="" class="portraitLogo"
              onerror="this.onerror=null;this.src='${escapeHtml(fallbackLogo)}'" />
            <div class="print-header-text">
              <p class="collegeName">${escapeHtml(collegeName)}</p>
              ${dataDetails ? `<p class="title-2">${escapeHtml(dataDetails)}</p>` : ""}
              <p class="title">${ANGULAR_PRINT_REPORT_TITLE}</p>
            </div>
          </div>`;

    const tables = buildAngularPayrollTableHtml(
      reportGroups,
      earningsCols,
      deductionCols,
      mgmtCols,
      hasBasicCategory,
      { tableClass: "second-table" },
    );

    printHtmlInIframe(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(ANGULAR_PRINT_REPORT_TITLE)}</title>
<style>${REPORT_PRINT_STYLES}</style>
</head>
<body>
  ${logoBlock}
  <table id="first-table"><tr>
    <td>Programme : ${escapeHtml(collegeName)}</td>
    <td>Department : ${escapeHtml(departmentLabel)}</td>
    <td><span class="paybill-red">PAY BILL - ${escapeHtml(monthName)} ${year}</span></td>
  </tr></table>
  ${tables}
</body>
</html>`);
  };

  const headingTitle =
    hasRun && dataDetails ? `${title} — ${dataDetails}` : title;

  return (
    <FilteredPage
      title={headingTitle}
      filtersCollapsible
      filtersDefaultOpen
      filters={
        <GlobalFilterBarRow>
          <GlobalFilterField label={`${facultyLabel} *`}>
            <Select
              value={collegeId != null ? String(collegeId) : null}
              onChange={(v) => {
                clearReport();
                setCollegeId(v ? Number(v) : null);
              }}
              options={colleges}
              placeholder={facultyLabel}
              clearable={false}
            />
          </GlobalFilterField>
          <GlobalFilterField label="Department">
            <Select
              value={String(departmentId)}
              onChange={(v) => {
                clearReport();
                setDepartmentId(Number(v ?? 0));
              }}
              options={departments}
              placeholder="Department"
              clearable={false}
            />
          </GlobalFilterField>
          <GlobalFilterField label="Employee Category *">
            <Select
              value={String(empCategoryId)}
              onChange={(v) => {
                clearReport();
                setEmpCategoryId(Number(v ?? 0));
              }}
              options={categories}
              placeholder="Employee Category"
              clearable={false}
            />
          </GlobalFilterField>
          {usePeriod ? (
            <GlobalFilterField label="Month and Year">
              <MonthYearPicker
                value={period}
                onChange={(d) => {
                  if (d) {
                    clearReport();
                    setPeriod(d);
                  }
                }}
              />
            </GlobalFilterField>
          ) : null}
          <GlobalFilterField label={"\u00a0"}>
            <Button
              type="button"
              size="sm"
              className="h-9"
              onClick={() => void runReport()}
              disabled={loading || !collegeId}
            >
              {loading ? "Loading…" : "Get List"}
            </Button>
          </GlobalFilterField>
        </GlobalFilterBarRow>
      }
      bodyClassName="space-y-4 border-t border-border px-5 py-4"
      body={
        !hasRun ? (
          <p className="text-sm text-muted-foreground">
            Select filters and click Get List to load the report.
          </p>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <div className="payroll-staff-report-table space-y-4">
            <style dangerouslySetInnerHTML={{ __html: REPORT_SCREEN_STYLES }} />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="w-full max-w-xs min-w-[200px]">
                <SearchInput
                  value={searchText}
                  onChange={setSearchText}
                  placeholder="Search"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={flatRows.length === 0 || loading}
                  onClick={handleExportExcel}
                >
                  <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
                  Export Excel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={flatRows.length === 0 || loading}
                  onClick={handlePrint}
                >
                  <Printer className="mr-1.5 h-3.5 w-3.5" />
                  Print Report
                </Button>
              </div>
            </div>

            {loading ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Loading…
              </p>
            ) : flatRows.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No records found for the selected filters.
              </p>
            ) : (
              <div dangerouslySetInnerHTML={{ __html: tablesHtml }} />
            )}
          </div>
        )
      }
    />
  );
}
