"use client";

import { useMemo } from "react";
import Link from "next/link";
import { PencilIcon } from "lucide-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { useQuery } from "@tanstack/react-query";
import { DataTable, TableCard } from "@/common/components/table";
import { StatusBadge } from "@/common/components/data-display";
import { PageContainer, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { QK } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/errors";
import { listPayrollGroups } from "@/services";
import { rowIndexGetter } from "@/lib/utils";

type GroupRow = Record<string, unknown>;

function makeLopActionsRenderer() {
  return (p: ICellRendererParams<GroupRow>) => {
    const payrollGroupId = Number(p.data?.payrollGroupId ?? 0);
    const collegeId = Number(p.data?.collegeId ?? 0);
    if (!payrollGroupId) return null;
    const href = `/hr-payroll/payroll/payroll-group/employees-loss-of-pay?payrollGroupId=${payrollGroupId}&collegeId=${collegeId}`;
    return (
      <Button asChild size="icon" variant="ghost" title="Enter Loss Of Pay">
        <Link href={href} aria-label="Enter Loss Of Pay">
          <PencilIcon className="h-4 w-4" />
        </Link>
      </Button>
    );
  };
}

export function EnterLossOfPayPage() {
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
      { headerName: "SI.No", valueGetter: rowIndexGetter, width: 70, flex: 0 },
      { field: "payrollGroupName", headerName: "Payroll Group", minWidth: 160 },
      { field: "categories", headerName: "Payroll Categories", minWidth: 200 },
      { field: "empSalType", headerName: "Salary Preferences", minWidth: 140 },
      { field: "collegeCode", headerName: "College", minWidth: 100 },
      {
        field: "isActive",
        headerName: "Status",
        minWidth: 100,
        flex: 0,
        cellRenderer: (p: ICellRendererParams<GroupRow>) => (
          <StatusBadge status={p.data?.isActive === true} />
        ),
      },
      {
        headerName: "Actions",
        minWidth: 120,
        flex: 0,
        cellRenderer: makeLopActionsRenderer(),
      },
    ],
    [],
  );

  return (
    <PageContainer>
      {error ? (
        <p className="text-sm text-destructive px-1">
          {getErrorMessage(error)}
        </p>
      ) : null}
      <TableCard withHeaderBorder={false}>
        <DataTable
          subtitle=""
          rowData={rows}
          columnDefs={columnDefs}
          loading={isFetching}
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
    </PageContainer>
  );
}
