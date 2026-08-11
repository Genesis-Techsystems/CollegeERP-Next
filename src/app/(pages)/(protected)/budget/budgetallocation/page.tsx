"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { PencilIcon, PlusIcon } from "lucide-react";
import { StatusBadge } from "@/common/components/data-display";
import { ListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useCrudList } from "@/hooks/useCrudList";
import { QK } from "@/lib/query-keys";
import { getCrudModalKey, rowIndexGetter } from "@/lib/utils";
import { listBudgetAllocations } from "@/services";
import type { BudgetAllocation } from "@/types/budget";
import BudgetAllocationModal from "./BudgetAllocationModal";

function fmtDate(value: unknown): string {
  if (typeof value !== "string" || !value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return format(date, "dd MMM yyyy");
}

/** Angular `budget-allocation.component` column set / headers. */
const COLS = {
  siNo: {
    headerName: "Sl.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<BudgetAllocation>,
  title: {
    field: "budgetTitle",
    headerName: "Budget title",
    minWidth: 160,
    flex: 1,
  } as ColDef<BudgetAllocation>,
  proposedAmount: {
    field: "proposedAmount",
    headerName: "Proposed Amount",
    minWidth: 130,
    flex: 0.6,
  } as ColDef<BudgetAllocation>,
  allocationDate: {
    headerName: "Budget Allocationdate",
    minWidth: 150,
    flex: 0.7,
  } as ColDef<BudgetAllocation>,
  sanctionedAmount: {
    field: "sanctionedAmount",
    headerName: "Sanctioned Amount",
    minWidth: 140,
    flex: 0.6,
  } as ColDef<BudgetAllocation>,
  sanctionedDate: {
    headerName: "Sanctioned date",
    minWidth: 130,
    flex: 0.7,
  } as ColDef<BudgetAllocation>,
  referenceNo: {
    field: "referenceNo",
    headerName: "Reference No",
    minWidth: 130,
    flex: 0.7,
  } as ColDef<BudgetAllocation>,
  isActive: {
    field: "isActive",
    headerName: "Status",
    minWidth: 100,
    flex: 0.5,
  } as ColDef<BudgetAllocation>,
  actions: {
    headerName: "Actions",
    minWidth: 86,
    width: 86,
    flex: 0,
  } as ColDef<BudgetAllocation>,
};

function statusRenderer(p: ICellRendererParams<BudgetAllocation>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

function makeActionsRenderer(
  setRow: (r: BudgetAllocation | null) => void,
  setOpen: (b: boolean) => void,
) {
  return (p: ICellRendererParams<BudgetAllocation>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      onClick={() => {
        setRow(p.data ?? null);
        setOpen(true);
      }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  );
}

export default function BudgetAllocationPage() {
  const [open, setOpen] = useState(false);
  const [row, setRow] = useState<BudgetAllocation | null>(null);
  const { data, isLoading, invalidate } = useCrudList({
    queryKey: QK.budgetAllocation.list(),
    queryFn: listBudgetAllocations,
  });

  const columnDefs = useMemo<ColDef<BudgetAllocation>[]>(
    () => [
      COLS.siNo,
      COLS.title,
      COLS.proposedAmount,
      {
        ...COLS.allocationDate,
        // Angular cell: `row.budgetallocationDate | date`
        valueGetter: (p) => fmtDate(p.data?.budgetallocationDate),
      },
      COLS.sanctionedAmount,
      {
        ...COLS.sanctionedDate,
        valueGetter: (p) => fmtDate(p.data?.sanctionedDate),
      },
      COLS.referenceNo,
      { ...COLS.isActive, cellRenderer: statusRenderer },
      { ...COLS.actions, cellRenderer: makeActionsRenderer(setRow, setOpen) },
    ],
    [],
  );

  return (
    <ListPage
      title="Budget Allocations"
      rowData={data}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        pdfDocumentTitle: "Budget Allocations",
      }}
      toolbarTrailing={
        <Button
          size="sm"
          className="bg-[#001f3f] text-white hover:bg-[#002a54]"
          onClick={() => {
            setRow(null);
            setOpen(true);
          }}
        >
          <PlusIcon className="mr-1 h-4 w-4" />
          Add Allocations
        </Button>
      }
    >
      <BudgetAllocationModal
        key={getCrudModalKey(row, open, "budgetAllocationId")}
        open={open}
        onClose={() => {
          setOpen(false);
          setRow(null);
        }}
        row={row}
        onSaved={invalidate}
      />
    </ListPage>
  );
}
