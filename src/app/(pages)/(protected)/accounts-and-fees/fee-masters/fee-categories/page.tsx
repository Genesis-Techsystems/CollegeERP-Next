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
import { listFeeCategories } from "@/services";
import type { FeeCategory } from "@/types/fee-category";
import { FeeCategoryModal } from "./FeeCategoryModal";

const COLS = {
  siNo: {
    colId: "siNo",
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<FeeCategory>,
  feeCategoryCode: {
    colId: "feeCategoryCode",
    field: "feeCategoryCode",
    headerName: "Category Code",
    minWidth: 140,
    flex: 1,
  } as ColDef<FeeCategory>,
  categoryName: {
    colId: "categoryName",
    field: "categoryName",
    headerName: "Category Name",
    minWidth: 180,
    flex: 1.2,
  } as ColDef<FeeCategory>,
  collegeCode: {
    colId: "collegeCode",
    headerName: "College",
    minWidth: 120,
    flex: 0.8,
  } as ColDef<FeeCategory>,
  isActive: {
    colId: "isActive",
    field: "isActive",
    headerName: "Status",
    minWidth: 90,
    flex: 0.7,
  } as ColDef<FeeCategory>,
  actions: {
    colId: "actions",
    headerName: "Actions",
    minWidth: 86,
    width: 86,
    flex: 0,
  } as ColDef<FeeCategory>,
};

function statusRenderer(p: ICellRendererParams<FeeCategory>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

function actionRenderer(
  setRow: (row: FeeCategory | null) => void,
  setOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<FeeCategory>) => (
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

/** Angular `fee-masters/fee-categories` → `FeeCategoryComponent`. */
export default function FeeCategoriesPage() {
  const [open, setOpen] = useState(false);
  const [row, setRow] = useState<FeeCategory | null>(null);
  const { data, isLoading, invalidate } = useCrudList({
    queryKey: QK.feeMasters.feeCategories.list(),
    queryFn: listFeeCategories,
  });

  const columnDefs = useMemo<ColDef<FeeCategory>[]>(
    () => [
      COLS.siNo,
      COLS.feeCategoryCode,
      COLS.categoryName,
      {
        ...COLS.collegeCode,
        valueGetter: (p) => p.data?.collegeCode ?? p.data?.collegeName ?? "—",
      },
      { ...COLS.isActive, cellRenderer: statusRenderer },
      { ...COLS.actions, cellRenderer: actionRenderer(setRow, setOpen) },
    ],
    [],
  );

  return (
    <ListPage
      title="Fee Categories"
      rowData={data}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search fee categories…",
        pdfDocumentTitle: "Fee Categories",
      }}
      toolbarTrailing={
        <Button
          size="sm"
          onClick={() => {
            setRow(null);
            setOpen(true);
          }}
        >
          <PlusIcon className="mr-1 h-4 w-4" />
          Add Fee Category
        </Button>
      }
    >
      <FeeCategoryModal
        key={getCrudModalKey(row, open, "feeCategoryId")}
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
