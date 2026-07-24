"use client";

/**
 * Angular parity: achievements/placement-sub-categories (Achievement Sub Categories)
 * List: domain/list/SubCategory?query=order(createdDt=desc)&size=99999
 * Columns: No, Code, Sub Category, Category (code - orgCode), Status, Edit
 * No print.
 */

import { useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Pencil } from "lucide-react";
import { StatusBadge } from "@/common/components/data-display";
import { ListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useCrudList } from "@/hooks/useCrudList";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import { listAchievementSubCategories } from "@/services";
import type { AchievementSubCategory } from "@/types/placements";
import { AchievementSubCategoryModal } from "./AchievementSubCategoryModal";

const COL_DEFS = {
  siNo: {
    headerName: "No.",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<AchievementSubCategory>,
  achievementSubcategoryCode: {
    field: "achievementSubcategoryCode",
    headerName: "Achievement Sub Category Code",
    minWidth: 200,
  } as ColDef<AchievementSubCategory>,
  achievementSubcategory: {
    field: "achievementSubcategory",
    headerName: "Achievement Sub Category",
    minWidth: 180,
  } as ColDef<AchievementSubCategory>,
  achievementCategory: {
    headerName: "Achievement Category",
    minWidth: 180,
    valueGetter: (p) => {
      const code = p.data?.achievementCategoryCode ?? "";
      const org = p.data?.orgCode ?? "";
      if (code && org) return `${code} - ${org}`;
      return code || org || p.data?.achievementCategoryName || "";
    },
  } as ColDef<AchievementSubCategory>,
  isActive: {
    field: "isActive",
    headerName: "Status",
    minWidth: 110,
  } as ColDef<AchievementSubCategory>,
  actions: {
    headerName: "Actions",
    minWidth: 90,
    flex: 0,
    width: 90,
    sortable: false,
    filter: false,
  } as ColDef<AchievementSubCategory>,
};

function statusRenderer(p: ICellRendererParams<AchievementSubCategory>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

function makeActionsRenderer(onEdit: (row: AchievementSubCategory) => void) {
  return (p: ICellRendererParams<AchievementSubCategory>) => {
    const row = p.data;
    if (!row) return null;
    return (
      <button
        type="button"
        title="Edit"
        aria-label="Edit"
        className="inline-flex items-center text-muted-foreground hover:text-foreground"
        onClick={() => onEdit(row)}
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    );
  };
}

export default function AchievementSubCategoriesPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<AchievementSubCategory | null>(null);

  const { data, isLoading, invalidate } = useCrudList<AchievementSubCategory>({
    queryKey: QK.achievementSubCategories.list(),
    queryFn: listAchievementSubCategories,
  });

  const columnDefs = useMemo<ColDef<AchievementSubCategory>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.achievementSubcategoryCode,
      COL_DEFS.achievementSubcategory,
      COL_DEFS.achievementCategory,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      {
        ...COL_DEFS.actions,
        cellRenderer: makeActionsRenderer((row) => {
          setEditData(row);
          setModalOpen(true);
        }),
      },
    ],
    [],
  );

  return (
    <ListPage
      title="Achievement Sub Categories"
      rowData={data}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        exportPdf: false,
      }}
      toolbarTrailing={
        <Button
          type="button"
          size="sm"
          onClick={() => {
            setEditData(null);
            setModalOpen(true);
          }}
        >
          + Add Sub Category
        </Button>
      }
    >
      <AchievementSubCategoryModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editData={editData}
        onSaved={invalidate}
      />
    </ListPage>
  );
}
