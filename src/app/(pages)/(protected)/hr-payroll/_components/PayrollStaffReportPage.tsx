"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileSpreadsheet, Printer } from "lucide-react";
import { FilterCard } from "@/common/components/feedback";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { MonthYearPicker } from "@/common/components/date-picker";
import { SearchInput } from "@/common/components/search";
import { Select, type SelectOption } from "@/common/components/select";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors";
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
  splitPivotCategoryColumns,
  type PayrollPivotAmountCell,
  type PayrollPivotRow,
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

type PayrollStaffReportPageProps = {
  title: string;
  reportFlag: StaffPayrollReportParams["reportFlag"];
  /** Pre-payroll audit passes month/year as 0 */
  usePeriod: boolean;
  exportFileName: string;
};

function amountForCell(
  row: PayrollPivotRow,
  catName: string,
  catType: string,
): string {
  const cell = row.subjectTimetable.find(
    (c: PayrollPivotAmountCell) =>
      c.payroll_category_name === catName &&
      c.payroll_category_type === catType,
  );
  if (!cell || cell.amt === "-") return "—";
  const n = Number(cell.amt);
  return Number.isFinite(n) ? n.toFixed(2) : String(cell.amt);
}

function amountForCode(
  row: PayrollPivotRow,
  categoryCode: string,
  categoryType: string,
): string {
  const cell = row.subjectTimetable.find(
    (entry) =>
      entry.payroll_category_code === categoryCode &&
      entry.payroll_category_type === categoryType,
  );
  if (!cell || cell.amt === "-") return "—";
  const value = Number(cell.amt);
  return Number.isFinite(value) ? value.toFixed(2) : String(cell.amt);
}

function filterPivotRows(
  rows: PayrollPivotRow[],
  term: string,
): PayrollPivotRow[] {
  const q = term.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((r) => {
    const hay = [
      r.Faculty,
      r.Emp_Designation,
      r.Emp_Department,
      r.emp_number,
      r.gd_code,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

export function PayrollStaffReportPage({
  title,
  reportFlag,
  usePeriod,
  exportFileName,
}: PayrollStaffReportPageProps) {
  const tableRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
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
  const [pivotRows, setPivotRows] = useState<PayrollPivotRow[]>([]);
  const [earningsCols, setEarningsCols] = useState<
    ReturnType<typeof splitPivotCategoryColumns>["earnings"]
  >([]);
  const [deductionCols, setDeductionCols] = useState<
    ReturnType<typeof splitPivotCategoryColumns>["deductions"]
  >([]);
  const [mgmtCols, setMgmtCols] = useState<
    ReturnType<typeof splitPivotCategoryColumns>["management"]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRun, setHasRun] = useState(false);
  const [dataDetails, setDataDetails] = useState("");
  const [searchText, setSearchText] = useState("");

  const facultyLabel = usePeriod ? "College" : "Faculty";
  const clearReport = () => {
    setPivotRows([]);
    setHasRun(false);
    setDataDetails("");
    setSearchText("");
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
          const cid = Number(collegeList[0]!.collegeId);
          setCollegeId(cid);
        }
      } catch (e) {
        toastError(e, "Failed to load filters");
      }
    })();
  }, []);

  useEffect(() => {
    if (!collegeId) return;
    setDepartmentId(0);
    setPivotRows([]);
    setHasRun(false);
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
  }, [collegeId]);

  const runReport = useCallback(async () => {
    if (!collegeId) return;
    setLoading(true);
    setError(null);
    setHasRun(true);
    setSearchText("");
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
      setPivotRows(pivoted);

      const collegeLabel =
        colleges.find((c) => c.value === String(collegeId))?.label ?? "";
      const deptLabel =
        departments.find((d) => d.value === String(departmentId))?.label ??
        "All";
      const parts = [collegeLabel];
      if (deptLabel && deptLabel !== "All") parts.push(deptLabel);
      if (usePeriod) {
        parts.push(`${MONTHS[period.getMonth()]} ${period.getFullYear()}`);
      }
      setDataDetails(parts.join(" / "));
    } catch (e) {
      setError(getErrorMessage(e));
      toastError(e, "Report failed");
      setPivotRows([]);
      setDataDetails("");
    } finally {
      setLoading(false);
    }
  }, [
    collegeId,
    departmentId,
    empCategoryId,
    period,
    reportFlag,
    usePeriod,
    colleges,
    departments,
  ]);

  const filteredRows = useMemo(
    () => filterPivotRows(pivotRows, searchText),
    [pivotRows, searchText],
  );

  const reportGroups = useMemo(() => {
    if (reportFlag !== "monthly_payroll") {
      return [{ label: "", rows: filteredRows }];
    }
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
    return categoryDetails.map((category) => ({
      label: category.label,
      rows: filteredRows.filter(
        (row) => String(row.gd_code ?? "") === category.code,
      ),
    }));
  }, [categoryDetails, empCategoryId, filteredRows, reportFlag]);

  const handlePrint = () => {
    if (!printRef.current || typeof window === "undefined") return;
    const w = window.open("", "_blank");
    if (!w) return;
    const college = collegeDetails.find((entry) => entry.id === collegeId);
    const department =
      departments.find((entry) => entry.value === String(departmentId))
        ?.label ?? "All";
    const month = MONTHS[period.getMonth()];
    const orgCode = window.localStorage.getItem("orgCode");
    const logo = college?.logo;
    const logoMarkup =
      orgCode === "SUK"
        ? logo
          ? `<img class="suk-logo" src="${logo}" alt="">`
          : `<h2>${college?.name ?? ""}</h2>`
        : `<div class="header">${logo ? `<img src="${logo}" alt="">` : ""}<div><h2>${college?.name ?? ""}</h2><p>Monthly Payroll Report</p></div></div>`;
    w.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body{font-family:Arial,sans-serif;color:#111;padding:16px}
            .header{display:flex;align-items:center;gap:18px;margin-bottom:12px}
            .header img{width:80px;height:80px;object-fit:contain}
            .header h2,.header p{margin:3px 0}.suk-logo{width:100%;height:auto;max-height:130px;object-fit:contain}
            .paybill{width:100%;border-collapse:collapse;margin:10px 0 16px}
            .paybill td{border:1px solid #555;padding:7px}.paybill td:last-child{color:#c00;font-weight:700;text-align:center}
            table{width:100%;border-collapse:collapse;font-size:10px;margin-bottom:18px}
            th,td{border:1px solid #777;padding:4px;text-align:center}
            thead th{background:#e8eef7}h3{margin:10px 0 6px}
            @page{size:landscape;margin:8mm}
          </style>
        </head>
        <body>
          ${logoMarkup}
          <table class="paybill"><tr><td>Programme: ${college?.name ?? ""}</td><td>Department: ${department}</td><td>PAY BILL - ${month} ${period.getFullYear()}</td></tr></table>
          ${printRef.current.innerHTML}
          <script>window.onload=()=>{window.print();window.close()}</script>
        </body>
      </html>
    `);
    w.document.close();
  };

  const renderMonthlyTable = (rows: PayrollPivotRow[], groupLabel: string) => (
    <div key={groupLabel || "all"} className="mb-5">
      {groupLabel ? (
        <h3 className="mb-2 text-sm font-semibold uppercase">
          {groupLabel} Staff
        </h3>
      ) : null}
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr className="bg-[#e8eef7]">
            <th rowSpan={2} className="border p-1.5">
              SI.No
            </th>
            <th rowSpan={2} className="border p-1.5">
              Employee No
            </th>
            <th rowSpan={2} className="border p-1.5">
              Name
            </th>
            <th rowSpan={2} className="border p-1.5">
              Designation
            </th>
            <th rowSpan={2} className="border p-1.5">
              Department
            </th>
            <th rowSpan={2} className="border p-1.5">
              Basic
            </th>
            {earningsCols.length > 0 ? (
              <th colSpan={earningsCols.length} className="border p-1.5">
                Earnings
              </th>
            ) : null}
            <th rowSpan={2} className="border p-1.5">
              Gross Salary
            </th>
            {deductionCols.length > 0 ? (
              <th colSpan={deductionCols.length} className="border p-1.5">
                Deductions
              </th>
            ) : null}
            <th rowSpan={2} className="border p-1.5">
              Total Ded.
            </th>
            <th rowSpan={2} className="border p-1.5">
              Net Salary
            </th>
            {mgmtCols.length > 0 ? (
              <th colSpan={mgmtCols.length} className="border p-1.5">
                Management Deductions
              </th>
            ) : null}
            <th rowSpan={2} className="border p-1.5">
              Bank A/c No.
            </th>
          </tr>
          <tr className="bg-[#e8eef7]">
            {earningsCols.map((column) => (
              <th
                key={`eh-${column.payroll_category_code}`}
                className="border p-1.5"
              >
                {column.payroll_category_name}
              </th>
            ))}
            {deductionCols.map((column) => (
              <th
                key={`dh-${column.payroll_category_code}`}
                className="border p-1.5"
              >
                {column.payroll_category_name}
              </th>
            ))}
            {mgmtCols.map((column) => (
              <th
                key={`mh-${column.payroll_category_code}`}
                className="border p-1.5"
              >
                {column.payroll_category_name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${groupLabel}-${row.fk_emp_id}`}>
              <td className="border p-1.5 text-center">
                {String(row.SNo ?? index + 1)}
              </td>
              <td className="border p-1.5 text-center">
                {String(row.emp_number ?? "—")}
              </td>
              <td className="border p-1.5">{row.Faculty}</td>
              <td className="border p-1.5">{row.Emp_Designation}</td>
              <td className="border p-1.5">{row.Emp_Department}</td>
              <td className="border p-1.5 text-right">
                {amountForCode(row, "BASIC", "E")}
              </td>
              {earningsCols.map((column) => (
                <td
                  key={`e-${column.payroll_category_code}-${row.fk_emp_id}`}
                  className="border p-1.5 text-right"
                >
                  {amountForCell(row, column.payroll_category_name, "E")}
                </td>
              ))}
              <td className="border p-1.5 text-right">
                {Number(row.gross_pay ?? 0).toFixed(2)}
              </td>
              {deductionCols.map((column) => (
                <td
                  key={`d-${column.payroll_category_code}-${row.fk_emp_id}`}
                  className="border p-1.5 text-right"
                >
                  {amountForCell(row, column.payroll_category_name, "D")}
                </td>
              ))}
              <td className="border p-1.5 text-right">
                {(
                  Number(row.gross_pay ?? 0) - Number(row.net_pay ?? 0)
                ).toFixed(2)}
              </td>
              <td className="border p-1.5 text-right">
                {Number(row.net_pay ?? 0).toFixed(2)}
              </td>
              {mgmtCols.map((column) => (
                <td
                  key={`m-${column.payroll_category_code}-${row.fk_emp_id}`}
                  className="border p-1.5 text-right"
                >
                  {amountForCell(row, column.payroll_category_name, "M")}
                </td>
              ))}
              <td className="border p-1.5 text-center">
                {String(row.bank_acc_no ?? "—")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <PageContainer className="space-y-4">
      <FilterCard title={title}>
        <GlobalFilterBarRow>
          <GlobalFilterField label={`${facultyLabel} *`}>
            <Select
              value={collegeId != null ? String(collegeId) : ""}
              onChange={(v) => {
                clearReport();
                setCollegeId(v ? Number(v) : null);
              }}
              options={colleges}
              placeholder={facultyLabel}
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
      </FilterCard>

      {hasRun && pivotRows.length > 0 ? (
        <>
          <div className="app-card px-4 py-3 border-b border-slate-200">
            <h2 className="text-base font-semibold text-[hsl(var(--card-title))]">
              {title}
              {dataDetails ? (
                <span className="ml-2 font-medium text-blue-600">
                  — {dataDetails}
                </span>
              ) : null}
            </h2>
          </div>

          <div className="app-card p-4 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <SearchInput
                value={searchText}
                onChange={setSearchText}
                placeholder="Search"
                className="max-w-xs"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="default"
                  onClick={() =>
                    exportHtmlTableAsExcel(tableRef.current, exportFileName)
                  }
                >
                  <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
                  Export Excel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="default"
                  onClick={handlePrint}
                >
                  <Printer className="mr-1.5 h-3.5 w-3.5" />
                  Print Report
                </Button>
              </div>
            </div>

            <div ref={printRef}>
              <div ref={tableRef} className="overflow-x-auto">
                {reportFlag === "monthly_payroll" ? (
                  reportGroups.map((group) =>
                    renderMonthlyTable(group.rows, group.label),
                  )
                ) : (
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-2 text-left">SI.No</th>
                        <th className="p-2 text-left">Name</th>
                        <th className="p-2 text-left">Designation</th>
                        <th className="p-2 text-left">Dept.</th>
                        <th className="p-2 text-right">Gross Amt</th>
                        {earningsCols.map((c) => (
                          <th
                            key={`e-${c.payroll_category_code}`}
                            className="p-2 text-right"
                          >
                            {c.payroll_category_name}
                          </th>
                        ))}
                        {deductionCols.map((c) => (
                          <th
                            key={`d-${c.payroll_category_code}`}
                            className="p-2 text-right"
                          >
                            {c.payroll_category_name}
                          </th>
                        ))}
                        {mgmtCols.map((c) => (
                          <th
                            key={`m-${c.payroll_category_code}`}
                            className="p-2 text-right"
                          >
                            {c.payroll_category_name}
                          </th>
                        ))}
                        <th className="p-2 text-right">Net Amt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map((row, idx) => (
                        <tr
                          key={row.fk_emp_id}
                          className="border-b border-border/60"
                        >
                          <td className="p-2">{idx + 1}</td>
                          <td className="p-2">{row.Faculty}</td>
                          <td className="p-2">{row.Emp_Designation}</td>
                          <td className="p-2">{row.Emp_Department}</td>
                          <td className="p-2 text-right">
                            {row.gross_pay != null
                              ? Number(row.gross_pay).toFixed(2)
                              : "—"}
                          </td>
                          {earningsCols.map((c) => (
                            <td
                              key={`e-${c.payroll_category_code}-${row.fk_emp_id}`}
                              className="p-2 text-right"
                            >
                              {amountForCell(
                                row,
                                c.payroll_category_name,
                                c.payroll_category_type,
                              )}
                            </td>
                          ))}
                          {deductionCols.map((c) => (
                            <td
                              key={`d-${c.payroll_category_code}-${row.fk_emp_id}`}
                              className="p-2 text-right"
                            >
                              {amountForCell(
                                row,
                                c.payroll_category_name,
                                c.payroll_category_type,
                              )}
                            </td>
                          ))}
                          {mgmtCols.map((c) => (
                            <td
                              key={`m-${c.payroll_category_code}-${row.fk_emp_id}`}
                              className="p-2 text-right"
                            >
                              {amountForCell(
                                row,
                                c.payroll_category_name,
                                c.payroll_category_type,
                              )}
                            </td>
                          ))}
                          <td className="p-2 text-right">
                            {row.net_pay != null
                              ? Number(row.net_pay).toFixed(2)
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </>
      ) : null}

      {hasRun && !loading && pivotRows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground app-card">
          No records found for the selected filters.
        </p>
      ) : null}
    </PageContainer>
  );
}
