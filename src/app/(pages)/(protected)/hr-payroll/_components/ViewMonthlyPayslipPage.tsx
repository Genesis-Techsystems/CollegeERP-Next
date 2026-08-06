"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { Monitor, Printer } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors";
import { printHtmlInIframe } from "@/lib/print";
import { toastError } from "@/lib/toast";
import {
  getActiveEmployeeDetailById,
  getCollegeById,
  getEmployeePayrollGroupById,
  getPayrollGroupById,
  listActiveCollegesForGeneralSettings,
  listEmployeePayslipDetails,
  listPayslipStatuses,
} from "@/services";

type AnyRow = Record<string, unknown>;

function amount(value: unknown): string {
  return Number(value ?? 0).toFixed(2);
}

/**
 * Angular `numToWords` — pads to 9 digits and maps crore/lakh/thousand/hundred.
 * Negative / non-matching values return "" (Angular early-returns without updating amtWords).
 */
function numberToWords(num: number): string {
  const a = [
    "",
    "one ",
    "two ",
    "three ",
    "four ",
    "five ",
    "six ",
    "seven ",
    "eight ",
    "nine ",
    "ten ",
    "eleven ",
    "twelve ",
    "thirteen ",
    "fourteen ",
    "fifteen ",
    "sixteen ",
    "seventeen ",
    "eighteen ",
    "nineteen ",
  ];
  const b = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  const raw = String(num);
  if (raw.length > 9) return "overflow";
  const n = ("000000000" + raw)
    .slice(-9)
    .match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return "";

  let str = "";
  str +=
    Number(n[1]) !== 0
      ? (a[Number(n[1])] || `${b[Number(n[1][0])]} ${a[Number(n[1][1])]}`) +
        "crore "
      : "";
  str +=
    Number(n[2]) !== 0
      ? (a[Number(n[2])] || `${b[Number(n[2][0])]} ${a[Number(n[2][1])]}`) +
        "lakh "
      : "";
  str +=
    Number(n[3]) !== 0
      ? (a[Number(n[3])] || `${b[Number(n[3][0])]} ${a[Number(n[3][1])]}`) +
        "thousand "
      : "";
  str +=
    Number(n[4]) !== 0
      ? (a[Number(n[4])] || `${b[Number(n[4][0])]} ${a[Number(n[4][1])]}`) +
        "hundred "
      : "";
  str +=
    Number(n[5]) !== 0
      ? (str !== "" ? "and " : "") +
        (a[Number(n[5])] || `${b[Number(n[5][0])]} ${a[Number(n[5][1])]}`)
      : "";
  return str.trim();
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function PayslipTable({
  title,
  amountTitle,
  rows,
  totalLabel,
}: {
  title: string;
  amountTitle: string;
  rows: AnyRow[];
  totalLabel?: string;
}) {
  const total = rows.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  return (
    <table className="w-full border-collapse text-[12px]">
      <thead>
        <tr className="bg-[#dbe7f5] text-[hsl(var(--card-title))]">
          <th className="border border-slate-300 px-3 py-2 text-left">
            {title}
          </th>
          <th className="w-32 border border-slate-300 px-3 py-2 text-right">
            {amountTitle} (₹)
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr
            key={String(
              row.employeePayslipDetailId ?? row.payrollCategoryId ?? index,
            )}
          >
            <td className="border border-slate-300 px-3 py-2">
              {String(row.payrollCategoryName ?? "")}
            </td>
            <td className="border border-slate-300 px-3 py-2 text-right tabular-nums">
              {amount(row.amount)}
            </td>
          </tr>
        ))}
        {totalLabel ? (
          <tr className="font-semibold">
            <td className="border border-slate-300 px-3 py-2">{totalLabel}</td>
            <td className="border border-slate-300 px-3 py-2 text-right tabular-nums">
              {total.toFixed(2)}
            </td>
          </tr>
        ) : null}
      </tbody>
    </table>
  );
}

/** Angular `.marPnt` print document — printed via iframe to avoid AppShell blank PDFs. */
function buildPayslipPrintHtml(opts: {
  logo: string;
  collegeName: string;
  firstName: string;
  empNumber: string;
  designationName: string;
  monthYear: string;
  earnings: AnyRow[];
  deductions: AnyRow[];
  management: AnyRow[];
  totalEarnings: number;
  totalDeductions: number;
  netPay: number;
  amtWords: string;
}): string {
  const earnRows = opts.earnings
    .map(
      (row) =>
        `<tr><td class="td">${escapeHtml(row.payrollCategoryName)}</td><td class="td right">${amount(row.amount)}</td></tr>`,
    )
    .join("");
  const dedRows = opts.deductions
    .map(
      (row) =>
        `<tr><td class="td">${escapeHtml(row.payrollCategoryName)}</td><td class="td right">${amount(row.amount)}</td></tr>`,
    )
    .join("");
  const mgmtRows = opts.management
    .map(
      (row) =>
        `<tr><td class="td">${escapeHtml(row.payrollCategoryName)}</td><td class="td right">${amount(row.amount)}</td></tr>`,
    )
    .join("");
  const logoBlock = opts.logo
    ? `<img src="${escapeHtml(opts.logo)}" alt="" style="max-height:80px;max-width:160px;object-fit:contain" />`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Employee Payslip</title>
<style>
  html, body { margin: 0; padding: 0; background: #fff; color: #000; font-family: Arial, sans-serif; }
  .wrap { width: 90%; margin: 0 auto; padding: 12px 0; }
  .header { display: flex; align-items: flex-start; gap: 16px; margin-bottom: 8px; }
  .header-text { flex: 1; text-align: center; }
  .collegeName { font-size: 20px; font-weight: 550; margin: 0 0 2px; }
  .title { font-size: 18px; font-weight: 550; margin: 0 0 2px; }
  .details { font-size: 16px; font-weight: 550; margin: 0; }
  .meta { display: flex; justify-content: space-between; margin: 8px 0 12px; font-weight: 550; }
  .tables { display: flex; gap: 0; width: 100%; }
  table { border-collapse: collapse; width: 50%; }
  th.th { background: #C3D9FF; padding: 8px 5px; text-align: left; font-weight: 600; border: 1px solid #9bb6e0; }
  td.td { padding: 8px; text-align: left; font-weight: 500; border: 1px solid #c5c5c5; }
  td.right, th.right { text-align: right; }
  .net table { width: 100%; margin-top: 8px; }
  .net th { background: #C3D9FF; padding: 8px 5px; text-align: left; border: 1px solid #9bb6e0; font-weight: 600; }
  @page { margin: 1cm; }
  @media print {
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  }
</style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <div>${logoBlock}</div>
      <div class="header-text">
        <p class="collegeName">${escapeHtml(opts.collegeName)}</p>
        <p class="title">Employee Payslip</p>
        <p class="details">${escapeHtml(opts.firstName)}(${escapeHtml(opts.empNumber)})</p>
      </div>
    </div>
    <div class="meta">
      <span>${escapeHtml(opts.designationName)}</span>
      <span>${escapeHtml(opts.monthYear)}</span>
    </div>
    <div class="tables">
      <table>
        <thead><tr><th class="th">Earnings</th><th class="th right" style="width:35%">Credited (₹)</th></tr></thead>
        <tbody>
          ${earnRows}
          <tr><td class="td" style="font-weight:500">Total Earnings</td><td class="td right" style="font-weight:500">${opts.totalEarnings.toFixed(2)}/-</td></tr>
        </tbody>
      </table>
      <table>
        <thead><tr><th class="th">Deductions</th><th class="th right">Deducted (₹)</th></tr></thead>
        <tbody>
          ${dedRows}
          <tr><td class="td" style="font-weight:500">Total Deductions</td><td class="td right" style="font-weight:500">${opts.totalDeductions.toFixed(2)}/-</td></tr>
        </tbody>
      </table>
    </div>
    ${
      opts.management.length > 0
        ? `<table style="width:100%;margin-top:8px">
        <thead><tr><th class="th">Management Deductions</th><th class="th right">Deducted (₹)</th></tr></thead>
        <tbody>${mgmtRows}</tbody>
      </table>`
        : ""
    }
    <div class="net">
      <table>
        <tbody>
          <tr><th>Net Pay &nbsp;:&nbsp; ${opts.netPay.toFixed(2)}₹</th></tr>
          <tr><th>IN WORDS &nbsp;: &nbsp;${escapeHtml(opts.amtWords)}</th></tr>
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;
}

export function ViewMonthlyPayslipPage({
  backMode = "monthly",
}: {
  backMode?: "monthly" | "history";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasAutoPrinted = useRef(false);
  const empId = Number(searchParams.get("empId") ?? 0);
  const payrollGroupId = Number(searchParams.get("payrollGroupId") ?? 0);
  const empPayrollGroupId = Number(searchParams.get("empPayrollGroupId") ?? 0);
  const empPayslipGenerationId = Number(
    searchParams.get("empPayslipGenerationId") ?? 0,
  );
  const collegeId = Number(searchParams.get("collegeId") ?? 0);
  const departmentId = Number(searchParams.get("departmentId") ?? 0);
  const selectedDate = searchParams.get("date") ?? "";
  const payslipMonth = searchParams.get("payslipMonth") ?? selectedDate;
  const printAction = searchParams.get("Isprint") === "1";

  const [employee, setEmployee] = useState<AnyRow | null>(null);
  const [group, setGroup] = useState<AnyRow | null>(null);
  const [details, setDetails] = useState<AnyRow[]>([]);
  const [logo, setLogo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!empId || !payrollGroupId) return;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const [
          employeeRow,
          groupRow,
          collegeResult,
          payrollAssignment,
          payslipStatuses,
        ] = await Promise.all([
          getActiveEmployeeDetailById(empId),
          getPayrollGroupById(payrollGroupId),
          collegeId
            ? backMode === "history"
              ? listActiveCollegesForGeneralSettings()
              : getCollegeById(collegeId)
            : Promise.resolve(null),
          empPayrollGroupId
            ? getEmployeePayrollGroupById(empPayrollGroupId)
            : Promise.resolve(null),
          backMode === "history" ? listPayslipStatuses() : Promise.resolve([]),
        ]);
        const college = Array.isArray(collegeResult)
          ? collegeResult.find(
              (row) => Number(row.collegeId) === Number(collegeId),
            )
          : collegeResult;
        setEmployee(employeeRow);
        setGroup(groupRow);
        setLogo(String(college?.logo ?? ""));
        // Angular loads PAYSLIPSTATUS on this detail screen and renders Pending.
        void payslipStatuses;

        if (empPayslipGenerationId) {
          setDetails(await listEmployeePayslipDetails(empPayslipGenerationId));
        } else {
          setDetails(
            Array.isArray(payrollAssignment?.employeeSalaryStructure)
              ? (payrollAssignment.employeeSalaryStructure as AnyRow[])
              : [],
          );
        }
      } catch (loadError) {
        setError(getErrorMessage(loadError));
        toastError(loadError, "Failed to load employee payslip");
      } finally {
        setLoading(false);
      }
    })();
  }, [
    collegeId,
    backMode,
    empId,
    empPayrollGroupId,
    empPayslipGenerationId,
    payrollGroupId,
  ]);

  const earnings = useMemo(
    () => details.filter((row) => row.payrollCategoryType === "E"),
    [details],
  );
  const deductions = useMemo(
    () => details.filter((row) => row.payrollCategoryType === "D"),
    [details],
  );
  const management = useMemo(
    () => details.filter((row) => row.payrollCategoryType === "M"),
    [details],
  );
  const totalEarnings = earnings.reduce(
    (sum, row) => sum + Number(row.amount ?? 0),
    0,
  );
  const totalDeductions = deductions.reduce(
    (sum, row) => sum + Number(row.amount ?? 0),
    0,
  );
  const netPay = totalEarnings - totalDeductions;
  const amtWords = numberToWords(netPay);

  const backHref = `/hr-payroll/payroll/monthly-playslip?collegeId=${collegeId}&departmentId=${departmentId}&date=${encodeURIComponent(selectedDate)}`;

  /** Angular: `moment(payslipMonth).format('MMMM') + '-' + new Date().getFullYear()` */
  const monthYearLabel = (() => {
    const date = new Date(payslipMonth || selectedDate || Date.now());
    const month = Number.isNaN(date.getTime()) ? "" : format(date, "MMMM");
    return `${month}-${new Date().getFullYear()}`;
  })();

  const printDocument = () => {
    if (details.length === 0 || !employee) return;
    printHtmlInIframe(
      buildPayslipPrintHtml({
        logo,
        collegeName: String(employee.collegeName ?? ""),
        firstName: String(employee.firstName ?? ""),
        empNumber: String(employee.empNumber ?? ""),
        designationName: String(employee.designationName ?? ""),
        monthYear: monthYearLabel,
        earnings,
        deductions,
        management,
        totalEarnings,
        totalDeductions,
        netPay,
        amtWords,
      }),
    );
  };

  useEffect(() => {
    if (
      !printAction ||
      loading ||
      details.length === 0 ||
      hasAutoPrinted.current ||
      !employee
    ) {
      return;
    }
    hasAutoPrinted.current = true;
    printDocument();
    // Angular view-employee payslip navigates back after Isprint=1.
    if (backMode === "history") {
      const t = window.setTimeout(() => router.back(), 800);
      return () => window.clearTimeout(t);
    }
    // Print once when auto-print query and payslip data are ready.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [details.length, loading, printAction, employee, backMode, router]);

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="border-b border-[#e8c547] px-4 py-3">
          <h1 className="inline-flex items-center gap-2 text-[15px] font-semibold text-[hsl(var(--card-title))]">
            <Monitor className="h-4 w-4" aria-hidden />
            Employee Payslip
          </h1>
        </div>

        {loading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading payslip…</p>
        ) : error ? (
          <p className="p-6 text-sm text-destructive">{error}</p>
        ) : (
          <div className="space-y-5 p-4 sm:p-5">
            <div className="rounded-sm border border-[#9fb8d9] bg-[#f4f8fc] p-4 text-sm">
              <div className="grid gap-2 sm:grid-cols-[150px_1fr]">
                <span>Employee :</span>
                <span className="font-medium text-blue-700">
                  {String(employee?.firstName ?? "")} (
                  <span className="text-foreground">
                    {String(employee?.empNumber ?? "")}
                  </span>
                  )
                </span>
                <span>Department :</span>
                <span className="text-blue-700">
                  {String(employee?.deptName ?? "—")}
                </span>
                <span>Position :</span>
                <span className="text-blue-700">
                  {String(employee?.designationName ?? "—")}
                </span>
                <span>Grade :</span>
                <span className="text-blue-700">
                  {employee?.empgrade != null
                    ? String(employee?.empGradeCode ?? employee?.empgrade)
                    : "—"}
                </span>
                <span>Payroll Group :</span>
                <span className="text-blue-700">
                  {String(group?.payrollGroupName ?? "—")}
                </span>
                <span>Status :</span>
                <span className="text-blue-700">Pending</span>
              </div>
            </div>

            {details.length > 0 ? (
              <>
                <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                  <h2 className="text-[16px] font-semibold text-[#2b6cb0]">
                    Payslip Details
                  </h2>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <PayslipTable
                    title="Earnings"
                    amountTitle="Credited"
                    rows={earnings}
                    totalLabel="Total Earnings"
                  />
                  <PayslipTable
                    title="Deductions"
                    amountTitle="Deducted"
                    rows={deductions}
                    totalLabel="Total Deductions"
                  />
                </div>
                {management.length > 0 ? (
                  <PayslipTable
                    title="Management Deductions"
                    amountTitle="Deducted"
                    rows={management}
                  />
                ) : null}
                <div className="space-y-1 rounded-sm border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold">
                  <p>Net Pay : {netPay.toFixed(2)} ₹</p>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No payslip details are available.
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                size="sm"
                className="bg-[#f0ad4e] text-black hover:bg-[#ec9c2c]"
                onClick={() =>
                  backMode === "history" ? router.back() : router.push(backHref)
                }
              >
                Back
              </Button>
              {details.length > 0 ? (
                <Button type="button" size="sm" onClick={printDocument}>
                  <Printer className="mr-1.5 h-4 w-4" />
                  Print
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
