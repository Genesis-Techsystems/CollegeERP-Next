"use client";

/**
 * Angular parity: achievements/achievements (Achievements)
 * List: domain/list/Achievement?query=order(createdDt=desc)&size=99999
 * Columns: No, Organization (orgCode), Achievement Title, Achievement Level,
 *          Prize, Status, Actions (Edit only)
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
import { listAchievements } from "@/services";
import type { Achievement } from "@/types/placements";
import { AchievementModal } from "./AchievementModal";

const COL_DEFS = {
  siNo: {
    headerName: "No.",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<Achievement>,
  orgCode: {
    field: "orgCode",
    headerName: "Organization",
    minWidth: 120,
    valueGetter: (p) => p.data?.orgCode ?? p.data?.organizationName ?? "",
  } as ColDef<Achievement>,
  achivementTitle: {
    field: "achivementTitle",
    headerName: "Achievement Title",
    minWidth: 180,
  } as ColDef<Achievement>,
  achievementLevel: {
    headerName: "Achievement Level",
    minWidth: 140,
    valueGetter: (p) =>
      p.data?.achievementLevelCatCode ?? p.data?.achievementLevelCatName ?? "",
  } as ColDef<Achievement>,
  prize: {
    headerName: "Prize",
    minWidth: 110,
    valueGetter: (p) => p.data?.prizeCatCode ?? p.data?.prizeCatName ?? "",
  } as ColDef<Achievement>,
  isActive: {
    field: "isActive",
    headerName: "Status",
    minWidth: 110,
  } as ColDef<Achievement>,
  actions: {
    headerName: "Actions",
    minWidth: 90,
    flex: 0,
    width: 90,
    sortable: false,
    filter: false,
  } as ColDef<Achievement>,
};

function statusRenderer(p: ICellRendererParams<Achievement>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

function makeActionsRenderer(onEdit: (row: Achievement) => void) {
  return (p: ICellRendererParams<Achievement>) => {
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

export default function AchievementsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<Achievement | null>(null);

  const { data, isLoading, invalidate } = useCrudList<Achievement>({
    queryKey: QK.achievements.list(),
    queryFn: listAchievements,
  });

  const columnDefs = useMemo<ColDef<Achievement>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.orgCode,
      COL_DEFS.achivementTitle,
      COL_DEFS.achievementLevel,
      COL_DEFS.prize,
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
      title="Achievements"
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
          + Add Achievement
        </Button>
      }
    >
      <AchievementModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editData={editData}
        onSaved={invalidate}
      />
    </ListPage>
  );
}
