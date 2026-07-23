"use client";

/**
 * Angular parity: placements/placements
 * List: domain/list/Placement?query=order(createdDt=desc)&size=99999
 * Columns: No, Placement (+On/Off Campus), Date range, Campus-org, Contact, Placement Status, Status, Edit
 * No print / no companies eye-link in Angular list.
 */

import { useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { format, parseISO, isValid } from "date-fns";
import { Pencil } from "lucide-react";
import { StatusBadge } from "@/common/components/data-display";
import { ListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { DATE_FORMATS } from "@/config/constants/app";
import { useCrudList } from "@/hooks/useCrudList";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import { listPlacements } from "@/services";
import type { Placement } from "@/types/placements";
import { PlacementModal } from "./PlacementModal";

function formatDisplayDate(value: string | null | undefined): string {
  if (!value) return "";
  const d = value.includes("T") ? parseISO(value) : new Date(value);
  if (!isValid(d)) return String(value);
  return format(d, DATE_FORMATS.DISPLAY);
}

function placementStatusClass(code: string | null | undefined): string {
  switch (code) {
    case "COMPLETED":
      return "text-emerald-700 bg-emerald-50";
    case "SCHEDULED":
      return "text-amber-800 bg-amber-50";
    case "CANCELLED":
      return "text-red-700 bg-red-50";
    default:
      return "text-muted-foreground bg-muted/40";
  }
}

const COL_DEFS = {
  siNo: {
    headerName: "No.",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<Placement>,
  plaecmentTitle: {
    headerName: "Placement",
    minWidth: 200,
    valueGetter: (p) => p.data?.plaecmentTitle ?? "",
  } as ColDef<Placement>,
  date: {
    headerName: "Date",
    minWidth: 200,
    valueGetter: (p) => {
      const start = formatDisplayDate(p.data?.placementStartDate);
      const end = formatDisplayDate(p.data?.placementEndDate);
      if (!start && !end) return "";
      return `${start} - ${end}`;
    },
  } as ColDef<Placement>,
  campus: {
    headerName: "Campus",
    minWidth: 140,
    valueGetter: (p) => {
      const code = p.data?.campusCode ?? "";
      const org = p.data?.orgCode ?? "";
      if (code && org) return `${code} - ${org}`;
      return code || org;
    },
  } as ColDef<Placement>,
  contactPerson: {
    field: "contactPerson",
    headerName: "Contact Person",
    minWidth: 130,
  } as ColDef<Placement>,
  placementCatCode: {
    field: "placementCatCode",
    headerName: "Placement Status",
    minWidth: 140,
  } as ColDef<Placement>,
  isActive: {
    field: "isActive",
    headerName: "Status",
    minWidth: 110,
  } as ColDef<Placement>,
  actions: {
    headerName: "Actions",
    minWidth: 90,
    flex: 0,
    width: 90,
    sortable: false,
    filter: false,
  } as ColDef<Placement>,
};

function titleRenderer(p: ICellRendererParams<Placement>) {
  const row = p.data;
  if (!row) return null;
  return (
    <span>
      {row.plaecmentTitle}
      <small className="ml-1 text-muted-foreground">
        {row.isOffcampus ? "(Off Campus)" : "(On Campus)"}
      </small>
    </span>
  );
}

function placementStatusRenderer(p: ICellRendererParams<Placement>) {
  const code = p.data?.placementCatCode;
  if (!code) return null;
  return (
    <span
      className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${placementStatusClass(code)}`}
    >
      {code}
    </span>
  );
}

function statusRenderer(p: ICellRendererParams<Placement>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

function makeActionsRenderer(onEdit: (row: Placement) => void) {
  return (p: ICellRendererParams<Placement>) => {
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

export default function PlacementsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<Placement | null>(null);

  const { data, isLoading, invalidate } = useCrudList<Placement>({
    queryKey: QK.placements.list(),
    queryFn: listPlacements,
  });

  const columnDefs = useMemo<ColDef<Placement>[]>(
    () => [
      COL_DEFS.siNo,
      { ...COL_DEFS.plaecmentTitle, cellRenderer: titleRenderer },
      COL_DEFS.date,
      COL_DEFS.campus,
      COL_DEFS.contactPerson,
      { ...COL_DEFS.placementCatCode, cellRenderer: placementStatusRenderer },
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
      title="Placements"
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
          + Add Placement
        </Button>
      }
    >
      <PlacementModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editData={editData}
        onSaved={invalidate}
      />
    </ListPage>
  );
}
