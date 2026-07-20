"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { ConfirmDialog } from "@/common/components/feedback";
import { DataTable, TableCard } from "@/common/components/table";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  enrichEmployeesWithPayslipMonths,
  listEmployeePayrollGroupByPayrollGroup,
  listEmployeePayslipGenerations,
  saveEmployeePayrollGroup,
} from "@/services";
import { formatDate } from "@/common/generic-functions";
import { rowIndexGetter } from "@/lib/utils";

type EmpRow = Record<string, unknown>;

export function AssignedEmployeesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const payrollGroupId = Number(searchParams.get("payrollGroupId") ?? 0);
  const collegeId = Number(searchParams.get("collegeId") ?? 0);
  const [rows, setRows] = useState<EmpRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<EmpRow | null>(null);
  const [removing, setRemoving] = useState(false);

  const load = useCallback(async () => {
    if (!payrollGroupId) return;
    setLoading(true);
    setError(null);
    try {
      const [employees, payslips] = await Promise.all([
        listEmployeePayrollGroupByPayrollGroup(payrollGroupId),
        listEmployeePayslipGenerations(),
      ]);
      setRows(enrichEmployeesWithPayslipMonths(employees, payslips));
    } catch (e) {
      setError(getErrorMessage(e));
      toastError(e, "Failed to load assigned employees");
    } finally {
      setLoading(false);
    }
  }, [payrollGroupId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRemove = useCallback(async () => {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      await saveEmployeePayrollGroup({ ...removeTarget, isActive: false });
      toastSuccess("Employee removed from payroll group");
      setRemoveTarget(null);
      await load();
    } catch (e) {
      toastError(e, "Failed to remove employee");
    } finally {
      setRemoving(false);
    }
  }, [removeTarget, load]);

  const columnDefs = useMemo<ColDef<EmpRow>[]>(
    () => [
      { headerName: "SI.No", valueGetter: rowIndexGetter, width: 70, flex: 0 },
      {
        field: "firstName",
        headerName: "Employee",
        minWidth: 160,
        valueFormatter: (p) => {
          const name = String(p.data?.firstName ?? "");
          const num = String(p.data?.empNumber ?? "");
          return num ? `${name} (${num})` : name;
        },
      },
      { field: "departmentCode", headerName: "Department", minWidth: 100 },
      { field: "empCatName", headerName: "Employee Category", minWidth: 130 },
      {
        field: "generatedDate",
        headerName: "Recent Payslip",
        minWidth: 120,
        valueFormatter: (p) => (p.value ? formatDate(String(p.value)) : "—"),
      },
      {
        field: "grossPay",
        headerName: "Gross",
        minWidth: 90,
        valueFormatter: (p) =>
          p.value != null ? Number(p.value).toFixed(2) : "—",
      },
      {
        field: "netAmount",
        headerName: "Net",
        minWidth: 90,
        valueFormatter: (p) =>
          p.value != null ? Number(p.value).toFixed(2) : "—",
      },
      {
        headerName: "Actions",
        minWidth: 140,
        flex: 0,
        cellRenderer: (p: ICellRendererParams<EmpRow>) => {
          const empPayrollGroupId = Number(p.data?.empPayrollGroupId ?? 0);
          const employeeId = Number(p.data?.employeeId ?? 0);
          if (!empPayrollGroupId || !employeeId) return null;
          const editHref = `/hr-payroll/payroll/payroll-group/assigned-employees/edit-employee?payrollGroupId=${payrollGroupId}&collegeId=${collegeId}&empPayrollGroupId=${empPayrollGroupId}&empId=${employeeId}`;
          return (
            <div className="flex items-center gap-1">
              <Button asChild size="sm" variant="ghost" className="h-7 px-2">
                <Link href={editHref}>Edit</Link>
              </Button>
              <span className="text-muted-foreground">|</span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-destructive"
                onClick={() => setRemoveTarget(p.data ?? null)}
              >
                Remove
              </Button>
            </div>
          );
        },
      },
    ],
    [payrollGroupId, collegeId],
  );

  if (!payrollGroupId) {
    return (
      <PageContainer className="space-y-4">
        <div className="app-card border-b border-[#5b9bd5]/40 px-4 py-3">
          <h1 className="text-[15px] font-semibold text-[hsl(var(--card-title))]">
            Payroll Group Employees
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">Missing payroll group.</p>
        <Button asChild variant="outline" size="sm">
          <Link href="/hr-payroll/payroll/payroll-group">
            Back to Payroll Groups
          </Link>
        </Button>
      </PageContainer>
    );
  }

  const addHref = `/hr-payroll/payroll/payroll-group/assigned-employees/add-employee?payrollGroupId=${payrollGroupId}&collegeId=${collegeId}`;

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <TableCard
          withHeaderBorder={false}
          className="border-0 shadow-none rounded-none"
        >
          <DataTable
            title="Payroll Group Employees"
            subtitle=""
            rowData={rows}
            columnDefs={columnDefs}
            loading={loading}
            pagination
            paginationPageSize={10}
            toolbar={{
              search: true,
              searchPlaceholder: "Search",
              columnPicker: true,
              exportPdf: true,
              pdfDocumentTitle: "Payroll Group Employees",
            }}
            toolbarTrailing={
              <Button
                asChild
                size="sm"
                className="h-[30px] gap-1 px-3 text-[12px]"
              >
                <Link href={addHref}>Assign Employee</Link>
              </Button>
            }
          />
        </TableCard>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push("/hr-payroll/payroll/payroll-group")}
      >
        Back
      </Button>

      <ConfirmDialog
        open={removeTarget != null}
        title="Confirmation"
        description="Sure, you want to Remove ?"
        confirmLabel="Ok"
        cancelLabel="Close"
        confirmVariant="destructive"
        confirmFirst
        isLoading={removing}
        onCancel={() => setRemoveTarget(null)}
        onConfirm={() => void handleRemove()}
      />
    </PageContainer>
  );
}
