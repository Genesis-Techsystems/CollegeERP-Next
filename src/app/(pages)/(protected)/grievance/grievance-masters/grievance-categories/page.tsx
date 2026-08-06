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
import { listAllGrievanceCategories, type GrievanceCategory } from "@/services";
import { GrievanceCategoryModal } from "./GrievanceCategoryModal";

const COLS = {
  siNo: {
    colId: "siNo",
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<GrievanceCategory>,
  grievanceCategoryCode: {
    colId: "grievanceCategoryCode",
    field: "grievanceCategoryCode",
    headerName: "Grievance Category Code",
    minWidth: 180,
  } as ColDef<GrievanceCategory>,
  grievanceCategory: {
    colId: "grievanceCategory",
    field: "grievanceCategory",
    headerName: "Grievance Category",
    minWidth: 180,
  } as ColDef<GrievanceCategory>,
  isActive: {
    colId: "isActive",
    field: "isActive",
    headerName: "Status",
    minWidth: 110,
  } as ColDef<GrievanceCategory>,
  actions: {
    colId: "actions",
    headerName: "Actions",
    minWidth: 90,
    width: 90,
    flex: 0,
  } as ColDef<GrievanceCategory>,
};

function statusRenderer(p: ICellRendererParams<GrievanceCategory>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

function makeActionsRenderer(
  setRow: (r: GrievanceCategory | null) => void,
  setOpen: (b: boolean) => void,
) {
  return (p: ICellRendererParams<GrievanceCategory>) => (
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

export default function GrievanceCategoriesPage() {
  const [open, setOpen] = useState(false);
  const [row, setRow] = useState<GrievanceCategory | null>(null);
  const { data, isLoading, invalidate } = useCrudList({
    queryKey: QK.grievanceMasters.categories(),
    queryFn: listAllGrievanceCategories,
  });

  const columnDefs = useMemo<ColDef<GrievanceCategory>[]>(
    () => [
      COLS.siNo,
      COLS.grievanceCategoryCode,
      COLS.grievanceCategory,
      { ...COLS.isActive, cellRenderer: statusRenderer },
      { ...COLS.actions, cellRenderer: makeActionsRenderer(setRow, setOpen) },
    ],
    [],
  );

  return (
    <ListPage
      title="Grievance Category"
      rowData={data}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{
        search: true,
        exportExcel: false,
        exportPdf: false,
        searchPlaceholder: "Search",
        pdfDocumentTitle: "Grievance Category",
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
          Add Grievance Category
        </Button>
      }
    >
      <GrievanceCategoryModal
        key={getCrudModalKey(row, open, "categoryId")}
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
