"use client";

import { useState, useMemo } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { PlusIcon, MapPin, PencilIcon } from "lucide-react";
import { ListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/common/components/data-display";
import CampusModal from "./CampusModal";
import { listCampuses } from "@/services/admin/campus";
import type { Campus } from "@/types/campus";
import { useCrudList } from "@/hooks/useCrudList";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";

// ─── Column shape (pure data, no renderers) ────────────────────────────────

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<Campus>,
  campusName: {
    field: "campusName",
    headerName: "Campus Name",
    minWidth: 150,
    flex: 1.2,
  } as ColDef<Campus>,
  campusCode: {
    field: "campusCode",
    headerName: "Campus Code",
    minWidth: 110,
    flex: 0.9,
  } as ColDef<Campus>,
  orgCode: {
    field: "orgCode",
    headerName: "Organization",
    minWidth: 120,
    flex: 1,
  } as ColDef<Campus>,
  districtName: {
    field: "districtName",
    headerName: "District",
    minWidth: 110,
    flex: 0.9,
  } as ColDef<Campus>,
  isActive: {
    field: "isActive",
    headerName: "Status",
    minWidth: 90,
    flex: 0.7,
  } as ColDef<Campus>,
  actions: {
    headerName: "Actions",
    minWidth: 90,
    flex: 0,
    width: 90,
  } as ColDef<Campus>,
};

// ─── Cell renderers ────────────────────────────────────────────────────────

function statusRenderer(p: ICellRendererParams<Campus>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

function makeActionsRenderer(
  setEditing: (campus: Campus | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<Campus>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      aria-label="Edit campus"
      onClick={() => {
        setEditing(p.data ?? null);
        setModalOpen(true);
      }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function CampusPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCampus, setEditingCampus] = useState<Campus | null>(null);

  // ── Fetch campuses ──────────────────────────────────────────────────────
  const {
    data: campuses,
    isLoading: loading,
    invalidate,
  } = useCrudList({
    queryKey: QK.campuses.list(),
    queryFn: listCampuses,
  });

  // Angular table order: No. → Organization → Campus Code → Campus Name → District → Status → Actions
  const columnDefs = useMemo<ColDef<Campus>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.orgCode,
      COL_DEFS.campusCode,
      COL_DEFS.campusName,
      COL_DEFS.districtName,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      {
        ...COL_DEFS.actions,
        cellRenderer: makeActionsRenderer(setEditingCampus, setModalOpen),
      },
    ],
    [setEditingCampus, setModalOpen],
  );

  return (
    <ListPage
      title="Campus"
      rowData={campuses}
      columnDefs={columnDefs}
      loading={loading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search campuses…",
        pdfDocumentTitle: "Campus",
      }}
      toolbarTrailing={
        <Button
          size="sm"
          onClick={() => {
            setEditingCampus(null);
            setModalOpen(true);
          }}
        >
          <PlusIcon className="h-4 w-4 mr-1" />
          Add Campus
        </Button>
      }
      emptyState={
        <div className="app-card flex flex-col items-center justify-center py-16 text-muted-foreground">
          <MapPin className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm">No campuses found</p>
          <Button
            size="sm"
            className="mt-4"
            onClick={() => {
              setEditingCampus(null);
              setModalOpen(true);
            }}
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            Add Campus
          </Button>
        </div>
      }
    >
      <CampusModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingCampus(null);
        }}
        campus={editingCampus}
        onSaved={invalidate}
      />
    </ListPage>
  );
}
