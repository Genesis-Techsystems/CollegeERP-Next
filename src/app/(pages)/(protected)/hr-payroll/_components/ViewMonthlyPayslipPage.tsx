"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { Monitor, Printer } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors";
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

function numberToWords(value: number): string {
  const ones = [
    "",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "eleven",
    "twelve",
    "thirteen",
    "fourteen",
    "fifteen",
    "sixteen",
    "seventeen",
    "eighteen",
    "nineteen",
  ];
  const tens = [
    "",
    "",
    "twenty",
    "thirty",
    "forty",
    "fifty",
    "sixty",
    "seventy",
    "eighty",
    "ninety",
  ];
  const underHundred = (n: number) =>
    n < 20
      ? ones[n]
      : `${tens[Math.floor(n / 10)]}${n % 10 ? ` ${ones[n % 10]}` : ""}`;
  const underThousand = (n: number) =>
    n < 100
      ? underHundred(n)
      : `${ones[Math.floor(n / 100)]} hundred${n % 100 ? ` and ${underHundred(n % 100)}` : ""}`;

  let n = Math.max(0, Math.floor(value));
  if (n === 0) return "zero";
  const parts: string[] = [];
  const crore = Math.floor(n / 10_000_000);
  if (crore) {
    parts.push(`${underHundred(crore)} crore`);
    n %= 10_000_000;
  }
  const lakh = Math.floor(n / 100_000);
  if (lakh) {
    parts.push(`${underHundred(lakh)} lakh`);
    n %= 100_000;
  }
  const thousand = Math.floor(n / 1_000);
  if (thousand) {
    parts.push(`${underHundred(thousand)} thousand`);
    n %= 1_000;
  }
  if (n) parts.push(underThousand(n));
  return parts.join(" ");
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

  const backHref = `/hr-payroll/payroll/monthly-playslip?collegeId=${collegeId}&departmentId=${departmentId}&date=${encodeURIComponent(selectedDate)}`;
  const monthLabel = (() => {
    const date = new Date(payslipMonth);
    return Number.isNaN(date.getTime())
      ? payslipMonth
      : format(date, "MMMM-yyyy");
  })();

  useEffect(() => {
    if (
      !printAction ||
      loading ||
      details.length === 0 ||
      hasAutoPrinted.current
    ) {
      return;
    }
    hasAutoPrinted.current = true;
    window.print();
    router.back();
  }, [details.length, loading, printAction, router]);

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="border-b border-[#e8c547] px-4 py-3 print:hidden">
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
          <div className="space-y-5 p-4 sm:p-5 print:p-0">
            <div className="hidden items-center gap-4 border-b pb-4 print:flex">
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt="" className="h-16 w-24 object-contain" />
              ) : null}
              <div className="flex-1 text-center">
                <h1 className="text-xl font-bold">
                  {String(employee?.collegeName ?? "")}
                </h1>
                <p className="font-semibold">Employee Payslip</p>
                <p className="text-sm">
                  {String(employee?.firstName ?? "")} (
                  {String(employee?.empNumber ?? "")})
                </p>
              </div>
            </div>

            <div className="rounded-sm border border-[#9fb8d9] bg-[#f4f8fc] p-4 text-sm print:border-0 print:bg-white print:p-0">
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
                  {String(employee?.empGradeCode ?? employee?.empgrade ?? "—")}
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
                  <span className="text-sm font-medium">{monthLabel}</span>
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
                  <p className="uppercase">
                    In words : {numberToWords(netPay)}
                  </p>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No payslip details are available.
              </p>
            )}

            <div className="flex justify-end gap-2 print:hidden">
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
                <Button type="button" size="sm" onClick={() => window.print()}>
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
