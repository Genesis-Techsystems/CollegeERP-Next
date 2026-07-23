"use client";

/**
 * Angular parity: achievements/placement-categories (Achievement Categories)
 * List: domain/list/Category?query=order(createdDt=desc)&size=99999
 * Columns: No, Code, Category, Organization (orgCode), Status, Edit
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
import { listAchievementCategories } from "@/services";
import type { AchievementCategory } from "@/types/placements";
import { AchievementCategoryModal } from "./AchievementCategoryModal";

const COL_DEFS = {
  siNo: {
    headerName: "No.",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<AchievementCategory>,
  achievementCategoryCode: {
    field: "achievementCategoryCode",
    headerName: "Achievement Category Code",
    minWidth: 180,
  } as ColDef<AchievementCategory>,
  achievementCategory: {
    field: "achievementCategory",
    headerName: "Achievement Category",
    minWidth: 180,
  } as ColDef<AchievementCategory>,
  organization: {
    headerName: "Organization",
    minWidth: 120,
    valueGetter: (p) => p.data?.orgCode ?? p.data?.organizationName ?? "",
  } as ColDef<AchievementCategory>,
  isActive: {
    field: "isActive",
    headerName: "Status",
    minWidth: 110,
  } as ColDef<AchievementCategory>,
  actions: {
    headerName: "Actions",
    minWidth: 90,
    flex: 0,
    width: 90,
    sortable: false,
    filter: false,
  } as ColDef<AchievementCategory>,
};

function statusRenderer(p: ICellRendererParams<AchievementCategory>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

function makeActionsRenderer(onEdit: (row: AchievementCategory) => void) {
  return (p: ICellRendererParams<AchievementCategory>) => {
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

export default function AchievementCategoriesPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<AchievementCategory | null>(null);

  const { data, isLoading, invalidate } = useCrudList<AchievementCategory>({
    queryKey: QK.achievementCategories.list(),
    queryFn: listAchievementCategories,
  });

  const columnDefs = useMemo<ColDef<AchievementCategory>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.achievementCategoryCode,
      COL_DEFS.achievementCategory,
      COL_DEFS.organization,
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
      title="Achievement Categories"
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
          + Add Category
        </Button>
      }
    >
      <AchievementCategoryModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editData={editData}
        onSaved={invalidate}
      />
    </ListPage>
  );
}
