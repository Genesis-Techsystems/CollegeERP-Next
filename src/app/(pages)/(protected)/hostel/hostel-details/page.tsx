"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PencilIcon, PlusIcon } from "lucide-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { EmptyState } from "@/common/components/feedback";
import { StatusBadge } from "@/common/components/data-display";
import { getErrorMessage } from "@/lib/errors";
import { ListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useCrudList } from "@/hooks/useCrudList";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import { listHostelDetails } from "@/services";
import type { HostelDetail } from "@/types/hostel";
import { HostelDetailModal } from "./HostelDetailModal";

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<HostelDetail>,
  hostelCode: {
    field: "hostelCode",
    headerName: "Code",
    minWidth: 100,
  } as ColDef<HostelDetail>,
  hostelName: {
    field: "hostelName",
    headerName: "Name",
    minWidth: 140,
  } as ColDef<HostelDetail>,
  noOfFloors: {
    field: "noOfFloors",
    headerName: "Floors",
    width: 90,
    flex: 0,
  } as ColDef<HostelDetail>,
  phoneNumber: {
    field: "phoneNumber",
    headerName: "Phone",
    minWidth: 110,
  } as ColDef<HostelDetail>,
  hstlForCatdetCode: {
    field: "hstlForCatdetCode",
    headerName: "For",
    minWidth: 90,
  } as ColDef<HostelDetail>,
  hostelTypeCode: {
    field: "hostelTypeCode",
    headerName: "Type",
    minWidth: 90,
  } as ColDef<HostelDetail>,
  orgCode: {
    field: "orgCode",
    headerName: "Org",
    minWidth: 90,
  } as ColDef<HostelDetail>,
  isActive: {
    field: "isActive",
    headerName: "Status",
    minWidth: 100,
    flex: 0,
  } as ColDef<HostelDetail>,
  actions: {
    headerName: "Actions",
    minWidth: 140,
    width: 140,
    flex: 0,
  } as ColDef<HostelDetail>,
};

/** Angular `hostelRooms(data)` → `/hostel/rooms` with the same query params. */
function buildRoomsUrl(row: HostelDetail) {
  const params = new URLSearchParams();
  params.set("hostelId", String(row.hostelId));
  if (row.hostelName) params.set("hostelName", row.hostelName);
  if (row.hostelTypeName) params.set("hostelTypeName", row.hostelTypeName);
  if (row.hstlForCatdetDisplayName) {
    params.set("hstlForCatdetDisplayName", row.hstlForCatdetDisplayName);
  }
  if (row.phoneNumber) params.set("phoneNumber", row.phoneNumber);
  if (row.organizationId) {
    params.set("organizationId", String(row.organizationId));
  }
  return `/hostel/rooms?${params.toString()}`;
}

function statusRenderer(p: ICellRendererParams<HostelDetail>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

function makeActionsRenderer(
  router: ReturnType<typeof useRouter>,
  setEditing: (row: HostelDetail | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<HostelDetail>) => {
    const row = p.data;
    if (!row) return null;
    return (
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="link"
          className="h-8 px-1 text-primary"
          onClick={() => router.push(buildRoomsUrl(row))}
        >
          Rooms
        </Button>
        <span className="text-muted-foreground select-none" aria-hidden>
          |
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          aria-label="Edit hostel"
          title="Edit Hostel Details"
          onClick={() => {
            setEditing(row);
            setModalOpen(true);
          }}
        >
          <PencilIcon className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  };
}

export default function HostelDetailsPage() {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<HostelDetail | null>(null);

  const {
    data: rows,
    isLoading,
    isError,
    error,
    refetch,
    invalidate,
  } = useCrudList({
    queryKey: QK.hostel.details(),
    queryFn: listHostelDetails,
  });

  const columnDefs = useMemo<ColDef<HostelDetail>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.hostelCode,
      COL_DEFS.hostelName,
      COL_DEFS.noOfFloors,
      COL_DEFS.phoneNumber,
      COL_DEFS.hstlForCatdetCode,
      COL_DEFS.hostelTypeCode,
      COL_DEFS.orgCode,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      {
        ...COL_DEFS.actions,
        cellRenderer: makeActionsRenderer(router, setEditing, setModalOpen),
      },
    ],
    [router],
  );

  return (
    <ListPage
      title="Hostel"
      rowData={isError ? [] : rows}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      height="auto"
      toolbar={{
        search: true,
        searchPlaceholder: "Search hostels…",
        exportPdf: true,
        pdfDocumentTitle: "Hostel",
      }}
      toolbarTrailing={
        <Button
          type="button"
          size="sm"
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <PlusIcon className="mr-1.5 h-4 w-4" />
          Add Hostel
        </Button>
      }
      emptyState={
        isError ? (
          <EmptyState
            title="Could not load hostels"
            description={getErrorMessage(error)}
            action={{ label: "Retry", onClick: () => void refetch() }}
          />
        ) : undefined
      }
    >
      <HostelDetailModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        row={editing}
        onSaved={() => void invalidate()}
      />
    </ListPage>
  );
}
