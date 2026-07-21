"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { format } from "date-fns";
import { DataTable, TableCard } from "@/common/components/table";
import { PageContainer, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/lib/errors";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  enrichEmployeesWithLop,
  enrichEmployeesWithPayslipMonths,
  listActivePayslipsForLossOfPay,
  listEmployeePayrollGroupForLossOfPay,
  updateEmployeeLossOfPay,
} from "@/services";
import { rowIndexGetter } from "@/lib/utils";

type EmpRow = Record<string, unknown> & {
  Lopamount?: string | number;
  empSalaryStructureId?: number;
};

function employeeRenderer(params: ICellRendererParams<EmpRow>) {
  return (
    <span>
      {String(params.data?.firstName ?? "")}
      {params.data?.empNumber ? (
        <strong className="ml-1 text-blue-700">
          ({String(params.data.empNumber)})
        </strong>
      ) : null}
    </span>
  );
}

export function EmployeesLossOfPayPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const payrollGroupId = Number(searchParams.get("payrollGroupId") ?? 0);
  const [rows, setRows] = useState<EmpRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!payrollGroupId) return;
    setLoading(true);
    setError(null);
    try {
      // Angular loads payslips only after a successful, non-empty employee response.
      const employees =
        await listEmployeePayrollGroupForLossOfPay(payrollGroupId);
      const payslips =
        employees.length > 0 ? await listActivePayslipsForLossOfPay() : [];
      const merged = enrichEmployeesWithLop(
        enrichEmployeesWithPayslipMonths(employees, payslips),
      );
      setRows(merged as EmpRow[]);
    } catch (e) {
      setError(getErrorMessage(e));
      toastError(e, "Failed to load employees");
    } finally {
      setLoading(false);
    }
  }, [payrollGroupId]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateLop = useCallback((rowKey: string, amount: string) => {
    setRows((prev) =>
      prev.map((row) => {
        const key = String(row.empPayrollGroupId ?? row.employeeId ?? "");
        return key === rowKey ? { ...row, Lopamount: amount } : row;
      }),
    );
  }, []);

  const handleSave = async () => {
    // Angular submits one item for every displayed employee. Undefined properties
    // are naturally omitted by JSON.stringify.
    const payload = rows.map((row) => ({
      empSalaryStructureId:
        row.empSalaryStructureId != null
          ? Number(row.empSalaryStructureId)
          : undefined,
      amount: row.Lopamount,
    }));
    setSaving(true);
    try {
      const result = await updateEmployeeLossOfPay(payload);
      toastSuccess(result.message || "Loss of pay updated");
      if (result.success) await load();
    } catch (e) {
      toastError(e, "Failed to save loss of pay");
    } finally {
      setSaving(false);
    }
  };

  const columnDefs = useMemo<ColDef<EmpRow>[]>(
    () => [
      { headerName: "SI.No", valueGetter: rowIndexGetter, width: 70, flex: 0 },
      {
        field: "firstName",
        headerName: "Employee",
        minWidth: 180,
        cellRenderer: employeeRenderer,
      },
      { field: "departmentCode", headerName: "Department", minWidth: 110 },
      { field: "empCatName", headerName: "Employee Category", minWidth: 140 },
      {
        field: "generatedDate",
        headerName: "Recent Payslip",
        minWidth: 120,
        valueFormatter: (p) => {
          if (!p.value) return "-";
          const date = new Date(String(p.value));
          return Number.isNaN(date.getTime())
            ? "-"
            : format(date, "MMM d, yyyy");
        },
      },
      {
        headerName: "Enter Loss Of Pay",
        minWidth: 140,
        flex: 0,
        cellRenderer: (p: ICellRendererParams<EmpRow>) => (
          <Input
            type="text"
            className="h-8"
            value={String(p.data?.Lopamount ?? "")}
            onChange={(e) =>
              updateLop(
                String(p.data?.empPayrollGroupId ?? p.data?.employeeId ?? ""),
                e.target.value,
              )
            }
          />
        ),
      },
    ],
    [updateLop],
  );

  if (!payrollGroupId) {
    return (
      <PageContainer className="space-y-4">
        <PageHeader title="Employees Loss Of Pay" />
        <p className="text-sm text-muted-foreground">
          Missing payroll group. Open from Enter Loss Of Pay.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href="/hr-payroll/payroll/enter-loss-of-pay">Back</Link>
        </Button>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-4">
      <TableCard withHeaderBorder={false}>
        <DataTable
          subtitle=""
          rowData={rows}
          columnDefs={columnDefs}
          loading={loading}
          paginationPageSize={10}
          toolbar={{
            search: true,
            searchPlaceholder: "Search",
            columnPicker: false,
            exportExcel: false,
            exportPdf: false,
          }}
        />
      </TableCard>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/hr-payroll/payroll/enter-loss-of-pay")}
        >
          Back
        </Button>
        <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </PageContainer>
  );
}
