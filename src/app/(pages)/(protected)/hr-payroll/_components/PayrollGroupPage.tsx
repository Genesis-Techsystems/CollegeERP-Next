"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ListChecks, PencilIcon, PlusIcon } from "lucide-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { useQuery } from "@tanstack/react-query";
import { DataTable, TableCard } from "@/common/components/table";
import { StatusBadge } from "@/common/components/data-display";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { QK } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/errors";
import { listPayrollGroups } from "@/services";
import { rowIndexGetter } from "@/lib/utils";

type GroupRow = Record<string, unknown>;

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<GroupRow>,
  name: {
    field: "payrollGroupName",
    headerName: "Payroll Group",
    minWidth: 160,
  } as ColDef<GroupRow>,
  categories: {
    field: "categories",
    headerName: "Payroll Categories",
    minWidth: 200,
  } as ColDef<GroupRow>,
  salType: {
    field: "empSalType",
    headerName: "Salary Preferences",
    minWidth: 130,
  } as ColDef<GroupRow>,
  college: {
    field: "collegeCode",
    headerName: "College",
    minWidth: 100,
  } as ColDef<GroupRow>,
  isActive: {
    field: "isActive",
    headerName: "Status",
    minWidth: 100,
    flex: 0,
  } as ColDef<GroupRow>,
  actions: {
    headerName: "Actions",
    minWidth: 150,
    flex: 0,
  } as ColDef<GroupRow>,
};

function statusRenderer(p: ICellRendererParams<GroupRow>) {
  return <StatusBadge status={p.data?.isActive === true} />;
}

function makeGroupActionsRenderer() {
  return (p: ICellRendererParams<GroupRow>) => {
    const payrollGroupId = Number(p.data?.payrollGroupId ?? 0);
    const collegeId = Number(p.data?.collegeId ?? 0);
    if (!payrollGroupId) return null;
    const q = new URLSearchParams({
      payrollGroupId: String(payrollGroupId),
      collegeId: String(collegeId),
    });
    return (
      <div className="flex items-center gap-1">
        <Button asChild size="sm" variant="ghost" className="h-7 px-2">
          <Link
            href={`/hr-payroll/payroll/payroll-group/edit-payroll-group?payrollGroupId=${payrollGroupId}`}
          >
            <PencilIcon className="h-3.5 w-3.5 mr-1" />
            Edit
          </Link>
        </Button>
        <span className="text-muted-foreground">|</span>
        <Button
          asChild
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-destructive font-medium"
        >
          <Link
            href={`/hr-payroll/payroll/payroll-group/assigned-employees?${q}`}
          >
            Employees
          </Link>
        </Button>
      </div>
    );
  };
}

const ADD_PAYROLL_GROUP_HREF =
  "/hr-payroll/payroll/payroll-group/add-payroll-group";

export function PayrollGroupPage() {
  const router = useRouter();
  const {
    data: rows = [],
    isFetching,
    error,
  } = useQuery({
    queryKey: QK.hrPayroll.payrollGroups(),
    queryFn: listPayrollGroups,
  });

  const columnDefs = useMemo<ColDef<GroupRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.name,
      COL_DEFS.categories,
      COL_DEFS.salType,
      COL_DEFS.college,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeGroupActionsRenderer() },
    ],
    [],
  );

  return (
    <PageContainer className="space-y-4">
      <div className="app-card border-b border-[#5b9bd5]/40 px-4 py-3">
        <h1 className="inline-flex items-center gap-2 text-[15px] font-semibold text-[hsl(var(--card-title))]">
          <ListChecks className="h-4 w-4 shrink-0" aria-hidden />
          Payroll Groups
        </h1>
      </div>

      <div className="app-card overflow-hidden">
        <TableCard
          withHeaderBorder={false}
          className="border-0 shadow-none rounded-none"
        >
          <DataTable
            subtitle=""
            rowData={rows}
            columnDefs={columnDefs}
            loading={isFetching}
            pagination
            paginationPageSize={10}
            toolbar={{
              search: true,
              searchPlaceholder: "Search",
              columnPicker: true,
              exportPdf: true,
              pdfDocumentTitle: "Payroll Groups",
            }}
            toolbarTrailing={
              <Button
                type="button"
                size="sm"
                className="h-[30px] gap-1 px-3 text-[12px]"
                onClick={() => router.push(ADD_PAYROLL_GROUP_HREF)}
              >
                <PlusIcon className="h-3.5 w-3.5" />
                Add Payroll Group
              </Button>
            }
          />
        </TableCard>
      </div>
    </PageContainer>
  );
}
