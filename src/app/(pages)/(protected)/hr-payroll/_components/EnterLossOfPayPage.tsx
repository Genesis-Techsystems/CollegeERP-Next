"use client";

import { useMemo } from "react";
import Link from "next/link";
import { PencilIcon } from "lucide-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { useQuery } from "@tanstack/react-query";
import { StatusBadge } from "@/common/components/data-display";
import { ListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useApiQueryToasts } from "@/hooks";
import { QK } from "@/lib/query-keys";
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
    minWidth: 140,
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
    minWidth: 90,
    flex: 0,
    width: 90,
  } as ColDef<GroupRow>,
};

function statusRenderer(p: ICellRendererParams<GroupRow>) {
  return <StatusBadge status={p.data?.isActive === true} />;
}

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
    isSuccess,
    isError,
    error,
  } = useQuery({
    queryKey: QK.hrPayroll.payrollGroups(),
    queryFn: listPayrollGroups,
  });

  useApiQueryToasts({
    requestKey: "enter-loss-of-pay",
    isFetching,
    isSuccess,
    isError,
    error,
    rowCount: rows.length,
    emptyMessage: "No Records(s) found.",
  });

  const columnDefs = useMemo<ColDef<GroupRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.name,
      COL_DEFS.categories,
      COL_DEFS.salType,
      COL_DEFS.college,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeLopActionsRenderer() },
    ],
    [],
  );

  return (
    <ListPage
      title="Loss Of Pay"
      titleIcon="ballot"
      rowData={rows}
      columnDefs={columnDefs}
      loading={isFetching}
      pagination
      paginationPageSize={10}
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        columnPicker: true,
        exportExcel: false,
        exportPdf: false,
      }}
    />
  );
}
