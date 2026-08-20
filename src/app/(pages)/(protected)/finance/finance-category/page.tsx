"use client";

import { useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { PencilIcon, PlusIcon } from "lucide-react";
import { ListPage } from "@/components/layout";

import { StatusBadge } from "@/common/components/data-display";
import { Button } from "@/components/ui/button";
import { useCrudList } from "@/hooks/useCrudList";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import { listFinCategories } from "@/services";
import type { FinCategory } from "@/types/finance";
import FinanceCategoryModal from "./FinanceCategoryModal";
import FinanceSubCategoriesModal from "./FinanceSubCategoriesModal";

// Angular displayedColumns:
// id, categoryName, categoryCode, accounttypeCode, collegeCode, isActive, actions
const COL_DEFS = {
  siNo: {
    headerName: "SI.NO",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<FinCategory>,
  categoryName: {
    field: "categoryName",
    headerName: "Category",
    minWidth: 140,
    flex: 1,
  } as ColDef<FinCategory>,
  categoryCode: {
    field: "categoryCode",
    headerName: "Category Code",
    minWidth: 120,
    flex: 0.9,
  } as ColDef<FinCategory>,
  accounttypeCode: {
    field: "accounttypeCode",
    headerName: "Account Type",
    minWidth: 120,
    flex: 0.9,
  } as ColDef<FinCategory>,
  collegeCode: {
    field: "collegeCode",
    headerName: "College",
    minWidth: 100,
    flex: 0.7,
  } as ColDef<FinCategory>,
  isActive: {
    field: "isActive",
    headerName: "Status",
    minWidth: 90,
    flex: 0.7,
  } as ColDef<FinCategory>,
  actions: {
    headerName: "Actions",
    minWidth: 160,
    width: 160,
    flex: 0,
  } as ColDef<FinCategory>,
};

function statusRenderer(p: ICellRendererParams<FinCategory>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

function makeActionsRenderer(
  onSubCategory: (row: FinCategory) => void,
  onEdit: (row: FinCategory) => void,
) {
  return (p: ICellRendererParams<FinCategory>) => {
    const row = p.data;
    if (!row) return null;
    return (
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className="text-xs text-[hsl(var(--primary))] hover:underline whitespace-nowrap"
          onClick={() => onSubCategory(row)}
        >
          Sub Category
        </button>
        <span className="text-muted-foreground text-xs">|</span>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={() => onEdit(row)}
        >
          <PencilIcon className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  };
}

export default function FinanceCategoryPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<FinCategory | null>(null);
  const [subCatOpen, setSubCatOpen] = useState(false);
  const [subCatCategory, setSubCatCategory] = useState<FinCategory | null>(
    null,
  );

  const { data, isLoading, invalidate } = useCrudList<FinCategory>({
    queryKey: QK.finCategories.list(),
    queryFn: listFinCategories,
  });

  const columnDefs = useMemo<ColDef<FinCategory>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.categoryName,
      COL_DEFS.categoryCode,
      COL_DEFS.accounttypeCode,
      COL_DEFS.collegeCode,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      {
        ...COL_DEFS.actions,
        cellRenderer: makeActionsRenderer(
          (row) => {
            setSubCatCategory(row);
            setSubCatOpen(true);
          },
          (row) => {
            setEditData(row);
            setModalOpen(true);
          },
        ),
      },
    ],
    [],
  );

  return (
    <ListPage
      title="Category"
      rowData={data}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        pdfDocumentTitle: "Finance Category",
        exportExcel: false,
        exportPdf: false,
      }}
      toolbarTrailing={
        <Button
          size="sm"
          onClick={() => {
            setEditData(null);
            setModalOpen(true);
          }}
        >
          <PlusIcon className="h-4 w-4 mr-1" />
          Add Category
        </Button>
      }
    >
      <FinanceCategoryModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditData(null);
        }}
        editData={editData}
        onSaved={invalidate}
      />
      <FinanceSubCategoriesModal
        open={subCatOpen}
        category={subCatCategory}
        onClose={() => {
          setSubCatOpen(false);
          setSubCatCategory(null);
        }}
        onSaved={invalidate}
      />
    </ListPage>
  );
}
