"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Select } from "@/common/components/select";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { MINIO_URL } from "@/config/constants/api";
import { useSessionContext } from "@/context/SessionContext";
import { useLoginEmployeeId } from "@/hooks/useLoginEmployeeId";
import { DEFAULT_COLLEGE_LOGO } from "@/hooks/useCollegeLogo";
import { getErrorMessage } from "@/lib/errors";
import { printHtmlInIframe } from "@/lib/print";
import { QK } from "@/lib/query-keys";
import { toastError } from "@/lib/toast";
import {
  getActiveEmployeeDetailById,
  listActiveCollegesForGeneralSettings,
  listEmployeePayslipDetails,
  listEmployeePayslipHistory,
} from "@/services";

type AnyRow = Record<string, unknown>;

const PAGE_SIZE_OPTIONS = ["10", "25", "100"] as const;

function readOrgCode(sessionCode?: string): string {
  if (sessionCode?.trim()) return sessionCode.trim().toUpperCase();
  if (typeof globalThis.window === "undefined") return "";
  return (globalThis.localStorage.getItem("orgCode") ?? "")
    .trim()
    .toUpperCase();
}

function toLogoUrl(path: string): string {
  if (!path) return DEFAULT_COLLEGE_LOGO;
  if (/^(https?:\/\/|data:|\/)/i.test(path)) return path;
  return `${MINIO_URL}${path.replace(/^\/+/, "")}`;
}

function asDetails(value: unknown): AnyRow[] {
  return Array.isArray(value) ? (value as AnyRow[]) : [];
}

function amount(value: unknown): string {
  return Number(value ?? 0).toFixed(2);
}

/**
 * Angular `numToWords` — pads to 9 digits and maps crore/lakh/thousand/hundred.
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

  const raw = String(Math.trunc(Math.abs(num)));
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
  return str;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatPayPeriod(value: unknown): string {
  if (value == null || value === "") return "";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return format(d, "MMM d, yyyy");
}

/** Angular: `moment(payslipMonth).format('MMMM') + '-' + new Date().getFullYear()` */
function monthYearLabel(payslipMonth: unknown): string {
  const d = new Date(String(payslipMonth ?? ""));
  const month = Number.isNaN(d.getTime()) ? "" : format(d, "MMMM");
  return `${month}-${new Date().getFullYear()}`;
}

function splitPayslipDetails(details: AnyRow[]) {
  const earnings = details.filter((row) => row.payrollCategoryType === "E");
  const deductions = details.filter((row) => row.payrollCategoryType === "D");
  const management = details.filter((row) => row.payrollCategoryType === "M");
  const totalEarnings = earnings.reduce(
    (sum, row) => sum + Number(row.amount ?? 0),
    0,
  );
  const totalDeductions = deductions.reduce(
    (sum, row) => sum + Number(row.amount ?? 0),
    0,
  );
  return {
    earnings,
    deductions,
    management,
    totalEarnings,
    totalDeductions,
    netPay: totalEarnings - totalDeductions,
  };
}

function buildPayslipPrintHtml(opts: {
  isSuk: boolean;
  logo: string;
  collegeName: string;
  firstName: string;
  empNumber: string;
  deptName: string;
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

  const logoSrc = escapeHtml(opts.logo || DEFAULT_COLLEGE_LOGO);
  const header = opts.isSuk
    ? `<div class="suk-logo"><img src="${logoSrc}" alt="" /></div>
    <p class="collegeName">${escapeHtml(opts.collegeName)}</p>
    <p class="title">Employee Payslip</p>
    <p class="details">${escapeHtml(opts.firstName)}(${escapeHtml(opts.empNumber)})</p>
    <p class="info">${escapeHtml(opts.deptName)}</p>`
    : `<div class="header">
      <div class="logo"><img src="${logoSrc}" alt="" /></div>
      <div class="header-text">
        <p class="collegeName">${escapeHtml(opts.collegeName)}</p>
        <p class="title">Employee Payslip</p>
        <p class="details">${escapeHtml(opts.firstName)}(${escapeHtml(opts.empNumber)})</p>
      </div>
    </div>`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Employee Payslip</title>
<style>
  html, body { margin: 0; padding: 0; background: #fff; color: #000; font-family: Arial, sans-serif; }
  .wrap { width: 90%; margin: 0 auto; padding: 12px 0; }
  .header { display: flex; align-items: flex-start; gap: 16px; margin-bottom: 8px; }
  .logo img { max-height: 80px; max-width: 160px; object-fit: contain; }
  .suk-logo { text-align: center; }
  .suk-logo img { height: auto; width: 100%; max-width: 1200px; }
  .header-text { flex: 1; text-align: center; padding-top: 3%; }
  .collegeName { font-size: 20px; font-weight: 550; margin: 0 0 2px; text-align: center; }
  .title { font-size: 18px; font-weight: 550; margin: 0 0 2px; text-align: center; }
  .details { font-size: 16px; font-weight: 550; margin: 0; text-align: ${opts.isSuk ? "left" : "center"}; }
  .info { font-size: 15px; margin: 0 0 4px; text-align: left; }
  .meta { display: flex; justify-content: space-between; margin: 8px 0 12px; }
  .meta span { color: #000; }
  .meta .month { font-weight: 550; }
  .tables { display: flex; gap: 0; width: 100%; }
  table { border-collapse: collapse; width: 50%; }
  th.th { background: #f2f2f2; padding: 8px 5px; text-align: left; font-weight: 600; border: 1px solid #c5c5c5; }
  td.td { padding: 8px; text-align: left; font-weight: 500; border: 1px solid #c5c5c5; }
  td.right, th.right { text-align: right; }
  .net table { width: 100%; margin-top: 8px; }
  .net th { background: #f2f2f2; padding: 8px 5px; text-align: left; border: 1px solid #c5c5c5; font-weight: 600; }
  @page { margin: 1cm; }
  @media print {
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  }
</style>
</head>
<body>
  <div class="wrap">
    ${header}
    <div class="meta">
      <span>${escapeHtml(opts.designationName)}</span>
      <span class="month">${escapeHtml(opts.monthYear)}</span>
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

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-wrap">
      <p className="m-0 w-full p-2 font-medium sm:w-[15%]">{label} :</p>
      <p className="m-0 w-full p-2 font-medium sm:w-[85%]">{children}</p>
    </div>
  );
}

export function SalarySlipsPage() {
  const { user, isLoading: sessionLoading } = useSessionContext();
  const { employeeId, isResolving } = useLoginEmployeeId(user, sessionLoading);
  const orgCode = readOrgCode(user?.organizationCode);
  const [printing, setPrinting] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState("10");

  const { data, isLoading, error } = useQuery({
    queryKey: QK.hrPayroll.salarySlips(employeeId),
    queryFn: async () => {
      const employee = await getActiveEmployeeDetailById(employeeId);
      const payslips = await listEmployeePayslipHistory(employeeId);
      let logo = "";
      if (employee && payslips.length > 0) {
        const colleges = await listActiveCollegesForGeneralSettings();
        const collegeId = Number(
          employee.collegeId ??
            (employee.college as AnyRow | undefined)?.collegeId ??
            0,
        );
        const match = colleges.find(
          (row) => Number(row.collegeId) === collegeId,
        );
        logo = String(match?.logo ?? "");
      }
      return { employee, payslips, logo };
    },
    enabled: employeeId > 0 && !isResolving,
  });

  const employee = data?.employee ?? null;
  const payslips = data?.payslips ?? [];
  const logoUrl = toLogoUrl(data?.logo ?? "");
  const firstName = String(employee?.firstName ?? "").trim();
  const empNumber = String(employee?.empNumber ?? "").trim();
  const grade =
    employee?.empgrade != null
      ? String(employee.empGradeCode ?? employee.empgrade ?? "")
      : "-";

  const printSlip = useCallback(
    async (row: AnyRow) => {
      if (!employee) return;
      setPrinting(true);
      try {
        let details = asDetails(row.employeePayslipDetails);
        const generationId = Number(row.empPayslipGenerationId ?? 0);
        if (details.length === 0 && generationId) {
          details = await listEmployeePayslipDetails(generationId);
        }
        const split = splitPayslipDetails(details);
        printHtmlInIframe(
          buildPayslipPrintHtml({
            isSuk: orgCode === "SUK",
            logo: logoUrl,
            collegeName: String(employee.collegeName ?? ""),
            firstName: String(employee.firstName ?? ""),
            empNumber: String(employee.empNumber ?? ""),
            deptName: String(employee.deptName ?? ""),
            designationName: String(employee.designationName ?? ""),
            monthYear: monthYearLabel(row.payslipMonth),
            earnings: split.earnings,
            deductions: split.deductions,
            management: split.management,
            totalEarnings: split.totalEarnings,
            totalDeductions: split.totalDeductions,
            netPay: split.netPay,
            amtWords: numberToWords(split.netPay),
          }),
        );
      } catch (printError) {
        toastError(printError, "Failed to print payslip");
      } finally {
        setPrinting(false);
      }
    },
    [employee, logoUrl, orgCode],
  );

  const pageSizeNum = Number(pageSize) || 10;
  const totalPages = Math.max(1, Math.ceil(payslips.length / pageSizeNum));
  const safePage = Math.min(pageIndex, totalPages - 1);
  const pagedSlips = useMemo(() => {
    const start = safePage * pageSizeNum;
    return payslips.slice(start, start + pageSizeNum);
  }, [payslips, safePage, pageSizeNum]);
  const rangeLabel =
    payslips.length === 0
      ? "0 of 0"
      : `${safePage * pageSizeNum + 1} – ${Math.min((safePage + 1) * pageSizeNum, payslips.length)} of ${payslips.length}`;

  const loading = isResolving || (employeeId > 0 && isLoading);
  const loadError = error ? getErrorMessage(error) : null;
  const titleName = firstName ? `My Payslips - ${firstName}` : "My Payslips";

  return (
    <PageContainer className="space-y-4">
      <div className="app-card app-card--mixed-content overflow-hidden">
        <div className="border-b-2 border-[#ffcf46] px-6 py-[14px]">
          <h1 className="app-card-title">
            <span className="material-icons app-card-title__icon" aria-hidden>
              computer
            </span>
            <span className="app-card-title__text">{titleName}</span>
          </h1>
        </div>

        {loading ? (
          <p className="px-6 py-6 text-sm text-muted-foreground">
            Loading payslips…
          </p>
        ) : loadError ? (
          <p className="px-6 py-6 text-sm text-destructive">{loadError}</p>
        ) : employeeId <= 0 ? (
          <p className="px-6 py-6 text-sm text-muted-foreground">
            Employee details were not found for this login.
          </p>
        ) : (
          <div className="pb-4">
            {employee ? (
              <div className="mx-[22px] mt-2.5 rounded-[5px] border-2 border-[#B2EBF2]">
                <DetailRow label="Employee">
                  <span className="text-[#0d29ff]">
                    {firstName} (<span className="text-black">{empNumber}</span>
                    )
                  </span>
                </DetailRow>
                <DetailRow label="Department">
                  <span className="text-[#0d29ff]">
                    {String(employee.deptName ?? "")}
                  </span>
                </DetailRow>
                <DetailRow label="Position">
                  <span className="text-[#0d29ff]">
                    {String(employee.designationName ?? "")}
                  </span>
                </DetailRow>
                <DetailRow label="Grade">
                  <span className="text-[#0d29ff]">{grade}</span>
                </DetailRow>
                {payslips.length > 0 ? (
                  <DetailRow label="Payroll Group">
                    <span className="text-[#0d29ff]">
                      {String(payslips[0]?.payrollGroupName ?? "")}
                    </span>
                  </DetailRow>
                ) : null}
              </div>
            ) : (
              <p className="px-6 py-6 text-sm text-muted-foreground">
                No active employee record found.
              </p>
            )}

            <div className="mx-4 mt-2.5 overflow-hidden rounded-sm border border-[#e3edf8] bg-white">
              <div className="overflow-x-auto">
                <table className="mat-table min-w-full">
                  <thead>
                    <tr className="mat-header-row">
                      <th
                        className="mat-header-cell px-2.5 py-2 text-left"
                        style={{ width: "15%" }}
                      >
                        Pay Peroid
                      </th>
                      <th
                        className="mat-header-cell px-2.5 py-2 text-left"
                        style={{ width: "15%" }}
                      >
                        Salary
                      </th>
                      <th
                        className="mat-header-cell px-2.5 py-2 text-left"
                        style={{ width: "15%" }}
                      >
                        Status
                      </th>
                      <th className="mat-header-cell px-2.5 py-2 text-center">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedSlips.map((row, index) => (
                      <tr
                        key={String(
                          row.empPayslipGenerationId ??
                            `${row.payslipMonth ?? ""}-${index}`,
                        )}
                        className="mat-row"
                      >
                        <td className="mat-cell px-2.5 py-2">
                          {formatPayPeriod(row.payslipMonth)}
                        </td>
                        <td className="mat-cell px-2.5 py-2">
                          {amount(row.netPay)}
                        </td>
                        <td className="mat-cell px-2.5 py-2">Generated</td>
                        <td className="mat-cell px-2.5 py-2 text-center">
                          <button
                            type="button"
                            className="inline-flex items-center justify-center text-[#00b9f5] disabled:opacity-50"
                            title="Print Payslip"
                            aria-label="Print Payslip"
                            disabled={printing}
                            onClick={() => void printSlip(row)}
                          >
                            <span
                              className="material-icons text-[20px]"
                              aria-hidden
                            >
                              print
                            </span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3 px-4 py-2 text-[12px] text-[#6c757d]">
                <div className="flex items-center gap-2">
                  <span>Items per page:</span>
                  <Select
                    value={pageSize}
                    onChange={(v) => {
                      setPageSize(v ?? "10");
                      setPageIndex(0);
                    }}
                    options={PAGE_SIZE_OPTIONS.map((n) => ({
                      value: n,
                      label: n,
                    }))}
                    searchable={false}
                    className="w-[72px] [&_button[role='combobox']]:h-7 [&_button[role='combobox']]:text-[12px]"
                  />
                </div>
                <span className="tabular-nums">{rangeLabel}</span>
                <div className="flex items-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-[#6c757d] hover:text-foreground"
                    disabled={safePage <= 0}
                    onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-[#6c757d] hover:text-foreground"
                    disabled={
                      safePage >= totalPages - 1 || payslips.length === 0
                    }
                    onClick={() =>
                      setPageIndex((p) => Math.min(totalPages - 1, p + 1))
                    }
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
