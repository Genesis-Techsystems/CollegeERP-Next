"use client";

import { useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { PencilIcon, PlusIcon } from "lucide-react";
import { StatusBadge } from "@/common/components/data-display";
import { ListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useCrudList } from "@/hooks/useCrudList";
import { QK } from "@/lib/query-keys";
import { getCrudModalKey, rowIndexGetter } from "@/lib/utils";
import { listBudgetCategories } from "@/services";
import type { BudgetCategory } from "@/types/budget";
import BudgetCategoryModal from "./BudgetCategoryModal";

const COLS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<BudgetCategory>,
  organization: {
    headerName: "Organization",
    minWidth: 120,
    flex: 0.8,
  } as ColDef<BudgetCategory>,
  name: {
    field: "budgetCategoryName",
    headerName: "Category Name",
    minWidth: 200,
    flex: 1,
  } as ColDef<BudgetCategory>,
  isActive: {
    field: "isActive",
    headerName: "Status",
    minWidth: 100,
    flex: 0.6,
  } as ColDef<BudgetCategory>,
  actions: {
    headerName: "Actions",
    minWidth: 86,
    width: 86,
    flex: 0,
  } as ColDef<BudgetCategory>,
};

function statusRenderer(p: ICellRendererParams<BudgetCategory>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

function makeActionsRenderer(
  setRow: (r: BudgetCategory | null) => void,
  setOpen: (b: boolean) => void,
) {
  return (p: ICellRendererParams<BudgetCategory>) => (
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

export default function BudgetCategoryPage() {
  const [open, setOpen] = useState(false);
  const [row, setRow] = useState<BudgetCategory | null>(null);
  const { data, isLoading, invalidate } = useCrudList({
    queryKey: QK.budgetCategory.list(),
    queryFn: listBudgetCategories,
  });

  const columnDefs = useMemo<ColDef<BudgetCategory>[]>(
    () => [
      COLS.siNo,
      COLS.name,
      { ...COLS.isActive, cellRenderer: statusRenderer },
      { ...COLS.actions, cellRenderer: makeActionsRenderer(setRow, setOpen) },
    ],
    [],
  );

  return (
    <ListPage
      title="Budget Category"
      rowData={data}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search budget categories…",
        pdfDocumentTitle: "Budget Category",
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
          Add Category
        </Button>
      }
    >
      <BudgetCategoryModal
        key={getCrudModalKey(row, open, "budgetCategoryId")}
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
