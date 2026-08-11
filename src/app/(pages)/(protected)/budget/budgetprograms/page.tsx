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
import { listBudgetPrograms } from "@/services";
import type { BudgetProgram } from "@/types/budget";
import BudgetProgramsModal from "./BudgetProgramsModal";

function fmtDate(value: unknown): string {
  if (typeof value !== "string" || !value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return format(date, "dd MMM yyyy");
}

const COLS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<BudgetProgram>,
  title: {
    field: "budgetTitle",
    headerName: "Title",
    minWidth: 160,
    flex: 1,
  } as ColDef<BudgetProgram>,
  description: {
    field: "budgetDescription",
    headerName: "Description",
    minWidth: 160,
    flex: 1,
  } as ColDef<BudgetProgram>,
  outcome: {
    field: "budgetOutcome",
    headerName: "Outcome",
    minWidth: 140,
    flex: 0.8,
  } as ColDef<BudgetProgram>,
  startDate: {
    headerName: "Start Date",
    minWidth: 110,
    flex: 0.6,
  } as ColDef<BudgetProgram>,
  endDate: {
    headerName: "End Date",
    minWidth: 110,
    flex: 0.6,
  } as ColDef<BudgetProgram>,
  proposalAmount: {
    field: "proposalAmount",
    headerName: "Proposal Amt",
    minWidth: 120,
    flex: 0.6,
  } as ColDef<BudgetProgram>,
  allotedAmount: {
    field: "actualTotalAllotedAmount",
    headerName: "Alloted Amt",
    minWidth: 120,
    flex: 0.6,
  } as ColDef<BudgetProgram>,
  isActive: {
    field: "isActive",
    headerName: "Status",
    minWidth: 100,
    flex: 0.5,
  } as ColDef<BudgetProgram>,
  actions: {
    headerName: "Actions",
    minWidth: 86,
    width: 86,
    flex: 0,
  } as ColDef<BudgetProgram>,
};

function statusRenderer(p: ICellRendererParams<BudgetProgram>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

function makeActionsRenderer(
  setRow: (r: BudgetProgram | null) => void,
  setOpen: (b: boolean) => void,
) {
  return (p: ICellRendererParams<BudgetProgram>) => (
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

export default function BudgetProgramsPage() {
  const [open, setOpen] = useState(false);
  const [row, setRow] = useState<BudgetProgram | null>(null);
  const { data, isLoading, invalidate } = useCrudList({
    queryKey: QK.budgetPrograms.list(),
    queryFn: listBudgetPrograms,
  });

  const columnDefs = useMemo<ColDef<BudgetProgram>[]>(
    () => [
      COLS.siNo,
      COLS.title,
      COLS.description,
      COLS.outcome,
      { ...COLS.startDate, valueGetter: (p) => fmtDate(p.data?.startDate) },
      { ...COLS.endDate, valueGetter: (p) => fmtDate(p.data?.endDate) },
      COLS.proposalAmount,
      COLS.allotedAmount,
      { ...COLS.isActive, cellRenderer: statusRenderer },
      { ...COLS.actions, cellRenderer: makeActionsRenderer(setRow, setOpen) },
    ],
    [],
  );

  return (
    <ListPage
      title="Budget Courses"
      rowData={data}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search budget courses...",
        pdfDocumentTitle: "Budget Programs",
      }}
      toolbarTrailing={
        <Button
          size="sm"
          onClick={() => {
            setRow(null);
            setOpen(true);
          }}
        >
          <PlusIcon className="h-4 w-4 mr-1" />
          Add Program
        </Button>
      }
    >
      <BudgetProgramsModal
        key={getCrudModalKey(row, open, "budgetProgramId")}
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
