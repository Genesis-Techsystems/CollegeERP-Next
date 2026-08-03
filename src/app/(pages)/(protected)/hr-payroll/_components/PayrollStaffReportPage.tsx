"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, Printer } from "lucide-react";
import type { ColDef, ColGroupDef } from "ag-grid-community";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { MonthYearPicker } from "@/common/components/date-picker";
import { Select, type SelectOption } from "@/common/components/select";
import { DataTable } from "@/common/components/table";
import { FilteredPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors";
import { printHtmlInIframe } from "@/lib/print";
import { toastError } from "@/lib/toast";
import { rowIndexGetter } from "@/lib/utils";
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

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function amountCol(
  field: string,
  headerName: string,
  minWidth = 100,
): ColDef<AnyRow> {
  return {
    field,
    headerName,
    minWidth,
    flex: 0,
    cellClass: "text-center",
    headerClass: "text-center",
    tooltipField: field,
  };
}

/** Placeholder leaf so empty Earnings / Deductions groups still render. */
function spacerCol(colId: string): ColDef<AnyRow> {
  return {
    colId,
    headerName: "",
    field: colId,
    width: 90,
    flex: 0,
    valueGetter: () => "",
    sortable: false,
    filter: false,
    suppressHeaderMenuButton: true,
    cellClass: "text-center",
    headerClass: "text-center",
  };
}

function bankCol(): ColDef<AnyRow> {
  return {
    field: "bank_acc_no",
    headerName: "Bank A/c No.",
    minWidth: 130,
    flex: 0,
    tooltipField: "bank_acc_no",
    cellClass: "text-center text-blue-700",
    headerClass: "text-center",
  };
}

/**
 * Angular monthly-payroll-report header (matches Angular screenshot):
 * Rowspan-2: SI.No | Employee No | Name | Designation | Deptartment | Basic |
 *            Gross Salary | Total Ded. | Net Salary | Management Deductions*
 * Groups:    Earnings → [E cats] | Deductions → [D cats] or Bank when no D cats
 *
 * When Earnings is empty and Deductions has cats, Angular's colspan=0 on Earnings
 * visually places D cats under the "Earnings" label and Bank under "Deductions".
 * We mirror that visual so React matches the Angular screenshot.
 */
function buildMonthlyColumnDefs(
  earnings: PayrollPivotCategory[],
  deductions: PayrollPivotCategory[],
  management: PayrollPivotCategory[],
): (ColDef<AnyRow> | ColGroupDef<AnyRow>)[] {
  // Angular colspan=0 quirk: empty Earnings + non-empty D → D cats appear under Earnings
  const deductUnderEarnings = earnings.length === 0 && deductions.length > 0;

  const earningsChildren: ColDef<AnyRow>[] = deductUnderEarnings
    ? deductions.map((c) =>
        amountCol(
          payrollCategoryField(
            "D",
            c.payroll_category_code,
            c.payroll_category_name,
          ),
          c.payroll_category_name,
        ),
      )
    : earnings.length > 0
      ? earnings.map((c) =>
          amountCol(
            payrollCategoryField(
              "E",
              c.payroll_category_code,
              c.payroll_category_name,
            ),
            c.payroll_category_name,
          ),
        )
      : [spacerCol("_earn_spacer")];

  const deductionChildren: ColDef<AnyRow>[] = deductUnderEarnings
    ? [bankCol()]
    : deductions.length > 0
      ? deductions.map((c) =>
          amountCol(
            payrollCategoryField(
              "D",
              c.payroll_category_code,
              c.payroll_category_name,
            ),
            c.payroll_category_name,
          ),
        )
      : [bankCol()];

  const managementCol: ColDef<AnyRow> | ColGroupDef<AnyRow> =
    management.length > 0
      ? {
          headerName: "Management Deductions",
          headerClass: "text-center",
          marryChildren: true,
          children: management.map((c) =>
            amountCol(
              payrollCategoryField(
                "M",
                c.payroll_category_code,
                c.payroll_category_name,
              ),
              c.payroll_category_name,
            ),
          ),
        }
      : {
          colId: "_mgmt",
          headerName: "Management Deductions",
          field: "_mgmt",
          minWidth: 160,
          flex: 0,
          valueGetter: () => "",
          sortable: false,
          filter: false,
          cellClass: "text-center",
          headerClass: "text-center",
        };

  const cols: (ColDef<AnyRow> | ColGroupDef<AnyRow>)[] = [
    {
      headerName: "SI.No",
      colId: "sno",
      valueGetter: (p) => String(p.data?.SNo ?? rowIndexGetter(p)),
      width: 70,
      flex: 0,
      cellClass: "text-center text-blue-700",
      headerClass: "text-center",
    },
    {
      field: "emp_number",
      headerName: "Employee No",
      minWidth: 140,
      tooltipField: "emp_number",
      cellClass: "text-center",
      headerClass: "text-center",
    },
    {
      field: "Faculty",
      headerName: "Name",
      minWidth: 150,
      tooltipField: "Faculty",
      cellClass: "text-center text-blue-700",
      headerClass: "text-center",
    },
    {
      field: "Emp_Designation",
      headerName: "Designation",
      minWidth: 120,
      tooltipField: "Emp_Designation",
      cellClass: "text-center text-blue-700",
      headerClass: "text-center",
    },
    {
      field: "Emp_Department",
      // Angular header typo preserved for parity
      headerName: "Deptartment",
      minWidth: 110,
      tooltipField: "Emp_Department",
      cellClass: "text-center text-blue-700",
      headerClass: "text-center",
    },
    amountCol("basic", "Basic", 90),
    {
      headerName: "Earnings",
      headerClass: "text-center",
      marryChildren: true,
      children: earningsChildren,
    },
    amountCol("gross_pay", "Gross Salary", 110),
    {
      headerName: "Deductions",
      headerClass: "text-center",
      marryChildren: true,
      children: deductionChildren,
    },
    amountCol("total_ded", "Total Ded.", 100),
    amountCol("net_pay", "Net Salary", 100),
    managementCol,
  ];

  // Trailing Bank only when D cats are shown under Deductions (not already under Deduct as Bank)
  if (deductions.length > 0 && !deductUnderEarnings) {
    cols.push({
      headerName: "\u00a0",
      headerClass: "text-center",
      marryChildren: true,
      children: [bankCol()],
    });
  }

  return cols;
}

function buildAuditColumnDefs(
  earnings: PayrollPivotCategory[],
  deductions: PayrollPivotCategory[],
  management: PayrollPivotCategory[],
): (ColDef<AnyRow> | ColGroupDef<AnyRow>)[] {
  const cols: (ColDef<AnyRow> | ColGroupDef<AnyRow>)[] = [
    {
      headerName: "SI.No",
      valueGetter: rowIndexGetter,
      width: 70,
      flex: 0,
    },
    {
      field: "Faculty",
      headerName: "Name",
      minWidth: 150,
      tooltipField: "Faculty",
    },
    {
      field: "Emp_Designation",
      headerName: "Designation",
      minWidth: 120,
      tooltipField: "Emp_Designation",
    },
    {
      field: "Emp_Department",
      headerName: "Dept.",
      minWidth: 100,
      tooltipField: "Emp_Department",
    },
    amountCol("gross_pay", "Gross Amt", 100),
  ];

  for (const c of earnings) {
    cols.push(
      amountCol(
        payrollCategoryField(
          "E",
          c.payroll_category_code,
          c.payroll_category_name,
        ),
        c.payroll_category_name,
      ),
    );
  }
  for (const c of deductions) {
    cols.push(
      amountCol(
        payrollCategoryField(
          "D",
          c.payroll_category_code,
          c.payroll_category_name,
        ),
        c.payroll_category_name,
      ),
    );
  }
  for (const c of management) {
    cols.push(
      amountCol(
        payrollCategoryField(
          "M",
          c.payroll_category_code,
          c.payroll_category_name,
        ),
        c.payroll_category_name,
      ),
    );
  }

  cols.push(amountCol("net_pay", "Net Amt", 100));
  return cols;
}

function buildExportTableHtml(
  groups: { label: string; rows: AnyRow[] }[],
  earnings: PayrollPivotCategory[],
  deductions: PayrollPivotCategory[],
  management: PayrollPivotCategory[],
  monthly: boolean,
): string {
  if (!monthly) {
    const head = [
      "SI.No",
      "Name",
      "Designation",
      "Dept.",
      "Gross Amt",
      ...earnings.map((c) => c.payroll_category_name),
      ...deductions.map((c) => c.payroll_category_name),
      ...management.map((c) => c.payroll_category_name),
      "Net Amt",
    ];
    const body =
      groups[0]?.rows
        .map(
          (row, idx) =>
            `<tr>
            <td>${idx + 1}</td>
            <td>${escapeHtml(row.Faculty)}</td>
            <td>${escapeHtml(row.Emp_Designation)}</td>
            <td>${escapeHtml(row.Emp_Department)}</td>
            <td>${escapeHtml(row.gross_pay)}</td>
            ${earnings
              .map(
                (c) =>
                  `<td>${escapeHtml(row[payrollCategoryField("E", c.payroll_category_code, c.payroll_category_name)])}</td>`,
              )
              .join("")}
            ${deductions
              .map(
                (c) =>
                  `<td>${escapeHtml(row[payrollCategoryField("D", c.payroll_category_code, c.payroll_category_name)])}</td>`,
              )
              .join("")}
            ${management
              .map(
                (c) =>
                  `<td>${escapeHtml(row[payrollCategoryField("M", c.payroll_category_code, c.payroll_category_name)])}</td>`,
              )
              .join("")}
            <td>${escapeHtml(row.net_pay)}</td>
          </tr>`,
        )
        .join("") ?? "";
    return `<table><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table>`;
  }

  return groups
    .map((group) => {
      const deductUnderEarnings =
        earnings.length === 0 && deductions.length > 0;
      const earnCats = deductUnderEarnings ? deductions : earnings;
      const earnType = deductUnderEarnings ? "D" : "E";
      const earnHeads =
        earnCats.length > 0
          ? earnCats
              .map((c) => `<th>${escapeHtml(c.payroll_category_name)}</th>`)
              .join("")
          : "<th></th>";
      const dedHeads = deductUnderEarnings
        ? `<th>Bank A/c No.</th>`
        : deductions.length > 0
          ? deductions
              .map((c) => `<th>${escapeHtml(c.payroll_category_name)}</th>`)
              .join("")
          : `<th>Bank A/c No.</th>`;
      const mgmtHeads =
        management.length > 0
          ? management
              .map((c) => `<th>${escapeHtml(c.payroll_category_name)}</th>`)
              .join("")
          : "";
      const bankLeaf =
        deductions.length > 0 && !deductUnderEarnings
          ? `<th>Bank A/c No.</th>`
          : "";
      const earnSpan = Math.max(earnCats.length, 1);
      const dedSpan = deductUnderEarnings
        ? 1
        : deductions.length > 0
          ? deductions.length
          : 1;
      const rowsHtml = group.rows
        .map(
          (row) => `<tr>
            <td style="text-align:center;color:blue">${escapeHtml(row.SNo)}</td>
            <td style="text-align:center">${escapeHtml(row.emp_number)}</td>
            <td style="text-align:center;color:blue">${escapeHtml(row.Faculty)}</td>
            <td style="text-align:center;color:blue">${escapeHtml(row.Emp_Designation)}</td>
            <td style="text-align:center;color:blue">${escapeHtml(row.Emp_Department)}</td>
            <td style="text-align:center">${escapeHtml(row.basic)}</td>
            ${
              earnCats.length > 0
                ? earnCats
                    .map(
                      (c) =>
                        `<td style="text-align:center">${escapeHtml(row[payrollCategoryField(earnType, c.payroll_category_code, c.payroll_category_name)])}</td>`,
                    )
                    .join("")
                : `<td></td>`
            }
            <td style="text-align:center;color:blue">${escapeHtml(row.gross_pay)}</td>
            ${
              deductUnderEarnings || deductions.length === 0
                ? `<td style="text-align:center;color:blue">${escapeHtml(row.bank_acc_no)}</td>`
                : deductions
                    .map(
                      (c) =>
                        `<td style="text-align:center">${escapeHtml(row[payrollCategoryField("D", c.payroll_category_code, c.payroll_category_name)])}</td>`,
                    )
                    .join("")
            }
            <td style="text-align:center;color:blue">${escapeHtml(row.total_ded)}</td>
            <td style="text-align:center;color:blue">${escapeHtml(row.net_pay)}</td>
            ${
              management.length > 0
                ? management
                    .map(
                      (c) =>
                        `<td style="text-align:center">${escapeHtml(row[payrollCategoryField("M", c.payroll_category_code, c.payroll_category_name)])}</td>`,
                    )
                    .join("")
                : `<td></td>`
            }
            ${
              deductions.length > 0 && !deductUnderEarnings
                ? `<td style="text-align:center;color:blue">${escapeHtml(row.bank_acc_no)}</td>`
                : ""
            }
          </tr>`,
        )
        .join("");

      const managementHeader =
        management.length > 0
          ? `<th colspan="${management.length}">Management Deductions</th>`
          : `<th rowspan="2">Management Deductions</th>`;

      const trailingBankParent =
        deductions.length > 0 && !deductUnderEarnings
          ? `<th colspan="1"></th>`
          : "";

      return `
        ${group.label ? `<h3 style="text-align:center;text-transform:uppercase">${escapeHtml(group.label)} STAFF</h3>` : ""}
        <table>
          <thead>
            <tr>
              <th rowspan="2">SI.No</th>
              <th rowspan="2">Employee No</th>
              <th rowspan="2">Name</th>
              <th rowspan="2">Designation</th>
              <th rowspan="2">Deptartment</th>
              <th rowspan="2">Basic</th>
              <th colspan="${earnSpan}">Earnings</th>
              <th rowspan="2">Gross Salary</th>
              <th colspan="${dedSpan}">Deductions</th>
              <th rowspan="2">Total Ded.</th>
              <th rowspan="2">Net Salary</th>
              ${managementHeader}
              ${trailingBankParent}
            </tr>
            <tr>${earnHeads}${dedHeads}${mgmtHeads}${bankLeaf}</tr>
          </thead>
          <tbody>${rowsHtml || `<tr><td colspan="20">No employees in this category</td></tr>`}</tbody>
        </table>`;
    })
    .join("");
}

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRun, setHasRun] = useState(false);
  const [dataDetails, setDataDetails] = useState("");

  const facultyLabel = usePeriod ? "College" : "Faculty";
  const isMonthly = reportFlag === "monthly_payroll";

  const clearReport = () => {
    setFlatRows([]);
    setHasRun(false);
    setDataDetails("");
    setError(null);
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

  const reportGroups = useMemo(() => {
    if (!isMonthly) {
      return [{ label: "", rows: flatRows }];
    }
    if (empCategoryId !== 0) {
      return [
        {
          label:
            categoryDetails.find((category) => category.id === empCategoryId)
              ?.label ?? "Employee",
          rows: flatRows,
        },
      ];
    }
    return categoryDetails.map((category) => ({
      label: category.label,
      rows: flatRows.filter(
        (row) => String(row.gd_code ?? "") === category.code,
      ),
    }));
  }, [categoryDetails, empCategoryId, flatRows, isMonthly]);

  const monthlyColumnDefs = useMemo(
    () => buildMonthlyColumnDefs(earningsCols, deductionCols, mgmtCols),
    [earningsCols, deductionCols, mgmtCols],
  );

  const auditColumnDefs = useMemo(
    () => buildAuditColumnDefs(earningsCols, deductionCols, mgmtCols),
    [earningsCols, deductionCols, mgmtCols],
  );

  const handleExportExcel = () => {
    if (flatRows.length === 0) return;
    const html = buildExportTableHtml(
      reportGroups,
      earningsCols,
      deductionCols,
      mgmtCols,
      isMonthly,
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
    const logo = college?.logo ?? "";
    const orgCode =
      typeof window !== "undefined"
        ? window.localStorage.getItem("orgCode")
        : null;

    const logoBlock =
      orgCode === "SUK"
        ? logo
          ? `<img src="${escapeHtml(logo)}" alt="" style="width:100%;max-height:130px;object-fit:contain" />`
          : `<h2>${escapeHtml(college?.name ?? "")}</h2>`
        : `<div style="display:flex;align-items:center;gap:18px;margin-bottom:12px">
            ${logo ? `<img src="${escapeHtml(logo)}" alt="" style="width:80px;height:80px;object-fit:contain" />` : ""}
            <div>
              <h2 style="margin:3px 0">${escapeHtml(college?.name ?? "")}</h2>
              <p style="margin:3px 0">${escapeHtml(title)}</p>
            </div>
          </div>`;

    const tables = buildExportTableHtml(
      reportGroups,
      earningsCols,
      deductionCols,
      mgmtCols,
      isMonthly,
    );

    printHtmlInIframe(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  body{font-family:Arial,sans-serif;color:#111;padding:16px;margin:0;background:#fff}
  .paybill{width:100%;border-collapse:collapse;margin:10px 0 16px}
  .paybill td{border:1px solid #555;padding:7px}
  .paybill td:last-child{color:#c00;font-weight:700;text-align:center}
  table{width:100%;border-collapse:collapse;font-size:10px;margin-bottom:18px}
  th,td{border:1px solid #777;padding:4px;text-align:center}
  thead th{background:#e8eef7}
  h3{margin:10px 0 6px;text-transform:uppercase}
  @page{size:landscape;margin:8mm}
  @media print{*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}
</style>
</head>
<body>
  ${logoBlock}
  ${
    usePeriod
      ? `<table class="paybill"><tr>
          <td>Programme : ${escapeHtml(college?.name ?? "")}</td>
          <td>Department : ${escapeHtml(departmentLabel)}</td>
          <td>PAY BILL - ${escapeHtml(monthName)} ${year}</td>
        </tr></table>`
      : ""
  }
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
          <div className="space-y-4">
            <div className="flex flex-wrap justify-end gap-2">
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

            {isMonthly ? (
              reportGroups.map((group) => (
                <div key={group.label || "all"} className="space-y-2">
                  {group.label ? (
                    <h3 className="text-center text-sm font-bold uppercase tracking-wide text-foreground">
                      {group.label} STAFF
                    </h3>
                  ) : null}
                  <DataTable
                    bordered={false}
                    rowData={group.rows}
                    columnDefs={monthlyColumnDefs as ColDef<AnyRow>[]}
                    loading={loading}
                    pagination
                    paginationPageSize={10}
                    fitColumnsToWidth={false}
                    getRowId={(p) => String(p.data?.fk_emp_id ?? "")}
                    toolbar={{
                      search: true,
                      searchPlaceholder: "Search",
                      columnPicker: true,
                      exportExcel: false,
                      exportPdf: false,
                    }}
                    columnFilters={false}
                  />
                </div>
              ))
            ) : (
              <DataTable
                bordered={false}
                rowData={flatRows}
                columnDefs={auditColumnDefs as ColDef<AnyRow>[]}
                loading={loading}
                pagination
                paginationPageSize={25}
                fitColumnsToWidth={false}
                height="520px"
                getRowId={(p) => String(p.data?.fk_emp_id ?? "")}
                toolbar={{
                  search: true,
                  searchPlaceholder: "Search",
                  columnPicker: true,
                  exportExcel: false,
                  exportPdf: false,
                }}
                columnFilters={false}
              />
            )}

            {!loading && flatRows.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No records found for the selected filters.
              </p>
            ) : null}
          </div>
        )
      }
    />
  );
}
