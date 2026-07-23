"use client";

/**
 * Angular parity: placement-broadcast
 * Filters: Year → Post Type (PSTTYPE); list on post type select
 * Query: posttypeCatdetId.generalDetailId==X.and.yearName==Y.order(createdDt=desc)
 * No print. Edit only.
 */

import { useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { format, parseISO, isValid } from "date-fns";
import { Pencil } from "lucide-react";
import { StatusBadge } from "@/common/components/data-display";
import { Select } from "@/common/components/select";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { DATE_FORMATS } from "@/config/constants/app";
import { GM_CODES } from "@/config/constants/ui";
import { useCrudList } from "@/hooks/useCrudList";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import { listGeneralDetailsByCode, listPlacementBroadcasts } from "@/services";
import type { PlacementBroadcast } from "@/types/placements";
import { PlacementBroadcastModal } from "./PlacementBroadcastModal";

type AnyRow = Record<string, unknown>;

function buildYearOptions(): { value: string; label: string }[] {
  // Angular: current year down to current - 9
  const max = new Date().getFullYear();
  return Array.from({ length: 10 }, (_, i) => {
    const year = String(max - i);
    return { value: year, label: year };
  });
}

function formatDisplayDate(value: string | null | undefined): string {
  if (!value) return "";
  const d = value.includes("T") ? parseISO(value) : new Date(value);
  if (!isValid(d)) return String(value);
  return format(d, DATE_FORMATS.DISPLAY);
}

const COL_DEFS = {
  siNo: {
    headerName: "SI No.",
    valueGetter: rowIndexGetter,
    width: 80,
    flex: 0,
  } as ColDef<PlacementBroadcast>,
  postHeader: {
    field: "postHeader",
    headerName: "Post",
    minWidth: 180,
  } as ColDef<PlacementBroadcast>,
  companyName: {
    headerName: "Company Name",
    minWidth: 150,
    valueGetter: (p) => p.data?.companyName ?? p.data?.companyname ?? "",
  } as ColDef<PlacementBroadcast>,
  approvedOn: {
    field: "approvedOn",
    headerName: "Approve date",
    minWidth: 130,
    valueFormatter: (p) =>
      formatDisplayDate(p.value as string | null | undefined),
  } as ColDef<PlacementBroadcast>,
  isApproved: {
    field: "isApproved",
    headerName: "Approve Status",
    minWidth: 130,
  } as ColDef<PlacementBroadcast>,
  isActive: {
    field: "isActive",
    headerName: "Status",
    minWidth: 110,
  } as ColDef<PlacementBroadcast>,
  actions: {
    headerName: "Actions",
    minWidth: 90,
    flex: 0,
    width: 90,
    sortable: false,
    filter: false,
  } as ColDef<PlacementBroadcast>,
};

function approveStatusRenderer(p: ICellRendererParams<PlacementBroadcast>) {
  const approved = p.data?.isApproved ?? false;
  return (
    <StatusBadge
      status={approved ? "active" : "inactive"}
      label={approved ? "Approved" : "Not Approved"}
    />
  );
}

function statusRenderer(p: ICellRendererParams<PlacementBroadcast>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

function makeActionsRenderer(onEdit: (row: PlacementBroadcast) => void) {
  return (p: ICellRendererParams<PlacementBroadcast>) => {
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

export default function PlacementBroadcastPage() {
  const [yearName, setYearName] = useState<string | null>(null);
  const [posttypeCatdetId, setPosttypeCatdetId] = useState<string | null>(null);
  const [postTypes, setPostTypes] = useState<AnyRow[]>([]);
  const [postTypesLoading, setPostTypesLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<PlacementBroadcast | null>(null);

  const filtersReady = Boolean(yearName && posttypeCatdetId);

  async function handleYearChange(value: string | null) {
    // Angular selectedYear: clear post type, load PSTTYPE details
    setYearName(value);
    setPosttypeCatdetId(null);
    setPostTypes([]);

    if (!value) return;
    setPostTypesLoading(true);
    try {
      setPostTypes(await listGeneralDetailsByCode(GM_CODES.PLACEMENT_TYPE));
    } catch {
      setPostTypes([]);
    } finally {
      setPostTypesLoading(false);
    }
  }

  const { data, isLoading, invalidate } = useCrudList<PlacementBroadcast>({
    queryKey: QK.placementBroadcasts.byYearType(
      yearName ?? "",
      Number(posttypeCatdetId || 0),
    ),
    queryFn: () => listPlacementBroadcasts(yearName!, Number(posttypeCatdetId)),
    enabled: filtersReady,
  });

  const columnDefs = useMemo<ColDef<PlacementBroadcast>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.postHeader,
      COL_DEFS.companyName,
      COL_DEFS.approvedOn,
      { ...COL_DEFS.isApproved, cellRenderer: approveStatusRenderer },
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

  const postTypeOptions = useMemo(
    () =>
      postTypes
        .map((t) => ({
          value: String(t.generalDetailId ?? t.gd_id ?? ""),
          label: String(t.generalDetailDisplayName ?? t.gd_name ?? "Type"),
        }))
        .filter((o) => o.value),
    [postTypes],
  );

  return (
    <FilteredListPage
      title="Placement Broadcast"
      filters={
        <div className="grid max-w-2xl grid-cols-2 gap-3 md:grid-cols-[10rem_1fr]">
          <Select
            label="Year"
            required
            value={yearName}
            onChange={(v) => void handleYearChange(v)}
            options={buildYearOptions()}
            placeholder="Year"
            clearable
          />
          <Select
            label="Post Type"
            required
            value={posttypeCatdetId}
            onChange={setPosttypeCatdetId}
            options={postTypeOptions}
            placeholder="Post Type"
            disabled={!yearName}
            isLoading={postTypesLoading}
            clearable
          />
        </div>
      }
      rowData={filtersReady ? data : []}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        exportPdf: false,
      }}
      toolbarTrailing={
        filtersReady ? (
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setEditData(null);
              setModalOpen(true);
            }}
          >
            + Placement Broadcast
          </Button>
        ) : null
      }
    >
      <PlacementBroadcastModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editData={editData}
        filterContext={{
          yearName: yearName ?? "",
          posttypeCatdetId: posttypeCatdetId ?? "",
        }}
        onSaved={invalidate}
      />
    </FilteredListPage>
  );
}
