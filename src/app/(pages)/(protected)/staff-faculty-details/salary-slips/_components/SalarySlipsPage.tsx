"use client";

import { useMemo } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Printer } from "lucide-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { useQuery } from "@tanstack/react-query";
import { ListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useSessionContext } from "@/context/SessionContext";
import { useLoginEmployeeId } from "@/hooks/useLoginEmployeeId";
import { getErrorMessage } from "@/lib/errors";
import {
  getActiveEmployeeDetailById,
  listEmployeePayslipHistory,
} from "@/services";

type AnyRow = Record<string, unknown>;

function readStorage(key: string): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(key) ?? "";
}

function employeeGradeLabel(employee: AnyRow | null | undefined): string {
  if (!employee) return "—";
  const grade =
    employee.empGradeCode ??
    employee.empgrade ??
    (employee.empgrade != null ? employee.empGradeCode : null);
  return grade != null && grade !== "" ? String(grade) : "—";
}

function formatPayPeriod(value: unknown): string {
  if (!value) return "—";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime())
    ? String(value)
    : format(date, "MMM d, yyyy");
}

function amount(value: unknown): string {
  return Number(value ?? 0).toFixed(2);
}

function EmployeeSummary({
  employee,
  payrollGroupName,
}: Readonly<{
  employee: AnyRow | null;
  payrollGroupName?: string;
}>) {
  if (!employee) return null;

  return (
    <div className="rounded border border-[#d6e0ea] bg-[#f8fbfd] px-3 py-2 text-sm">
      <div className="grid gap-y-2 md:grid-cols-2">
        <p>
          <span className="text-muted-foreground">Employee: </span>
          <strong>
            {String(employee.firstName ?? "—")}
            {employee.empNumber ? ` (${String(employee.empNumber)})` : ""}
          </strong>
        </p>

        <p>
          <span className="text-muted-foreground">Department: </span>
          <strong>
            {String(employee.deptName ?? employee.departmentName ?? "—")}
          </strong>
        </p>

        <p>
          <span className="text-muted-foreground">Position: </span>
          <strong>{String(employee.designationName ?? "—")}</strong>
        </p>

        <p>
          <span className="text-muted-foreground">Grade: </span>
          <strong>{employeeGradeLabel(employee)}</strong>
        </p>

        {payrollGroupName ? (
          <p className="md:col-span-2">
            <span className="text-muted-foreground">Payroll Group: </span>
            <strong>{payrollGroupName}</strong>
          </p>
        ) : null}
      </div>
    </div>
  );
}

function makePrintRenderer(employeeId: number, collegeId: number) {
  return (p: ICellRendererParams<AnyRow>) => {
    const row = p.data;
    if (!row) return null;
    const empPayslipGenerationId = Number(row.empPayslipGenerationId ?? 0);
    if (!empPayslipGenerationId) return null;

    const empPayrollGroupId = Number(
      row.empPayrollGroupId ??
        (row.employeePayrollGroup as AnyRow | undefined)?.empPayrollGroupId ??
        0,
    );
    const payrollGroupId = Number(
      row.payrollGroupId ??
        (row.payrollGroup as AnyRow | undefined)?.payrollGroupId ??
        0,
    );

    const query = new URLSearchParams({
      payslipMonth: String(row.payslipMonth ?? ""),
      status: "Generated",
      empPayrollGroupId: String(empPayrollGroupId),
      payrollGroupId: String(payrollGroupId),
      empPayslipGenerationId: String(empPayslipGenerationId),
      empId: String(employeeId),
      collegeId: String(collegeId),
    });

    return (
      <Button
        asChild
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0 text-[#1565C0]"
        title="Print Payslip"
      >
        <Link
          href={`/hr-payroll/payroll/payslip-for-employees/view-employee-payslip?${query}&Isprint=1`}
          aria-label="Print payslip"
        >
          <Printer className="h-4 w-4" />
        </Link>
      </Button>
    );
  };
}

export function SalarySlipsPage() {
  const { user, isLoading: sessionLoading } = useSessionContext();
  const { employeeId: hookEmployeeId, isResolving } = useLoginEmployeeId(
    user,
    sessionLoading,
  );
  const employeeId =
    hookEmployeeId > 0
      ? hookEmployeeId
      : Number(readStorage("employeeId") || user?.employeeId || 0);
  const collegeId = user?.collegeId ?? Number(readStorage("collegeId") || 0);

  const query = useQuery({
    queryKey: ["HrPayroll", "staffSalarySlips", employeeId] as const,
    queryFn: async () => {
      const [employee, payslips] = await Promise.all([
        getActiveEmployeeDetailById(employeeId),
        listEmployeePayslipHistory(employeeId),
      ]);
      return { employee, payslips };
    },
    enabled: !sessionLoading && !isResolving && employeeId > 0,
  });

  const employee = query.data?.employee ?? null;
  const payslips = query.data?.payslips ?? [];
  const payrollGroupName =
    payslips.length > 0 ? String(payslips[0]?.payrollGroupName ?? "") : "";

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      {
        headerName: "Pay Period",
        field: "payslipMonth",
        minWidth: 140,
        valueFormatter: (p) => formatPayPeriod(p.value),
      },
      {
        headerName: "Salary",
        field: "netPay",
        minWidth: 120,
        valueFormatter: (p) => amount(p.value),
      },
      {
        headerName: "Status",
        minWidth: 110,
        valueGetter: () => "Generated",
      },
      {
        headerName: "Actions",
        minWidth: 90,
        width: 90,
        flex: 0,
        sortable: false,
        filter: false,
        cellRenderer: makePrintRenderer(employeeId, collegeId),
      },
    ],
    [employeeId, collegeId],
  );

  const pageTitle = employee?.firstName
    ? `My Payslips - ${String(employee.firstName)}`
    : "My Payslips";

  return (
    <ListPage
      title={pageTitle}
      notice={
        query.error ? (
          <p className="px-1 pb-2 text-sm text-destructive">
            {getErrorMessage(query.error)}
          </p>
        ) : undefined
      }
      filtersFooter={
        <EmployeeSummary
          employee={employee}
          payrollGroupName={payrollGroupName}
        />
      }
      rowData={payslips}
      columnDefs={columnDefs}
      loading={sessionLoading || isResolving || query.isFetching}
      pagination
      paginationPageSize={25}
      getRowId={(p) =>
        String(
          p.data?.empPayslipGenerationId ??
            `${p.data?.payslipMonth ?? "row"}-${p.data?.netPay ?? ""}`,
        )
      }
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        exportPdf: false,
        exportExcel: false,
      }}
    />
  );
}
