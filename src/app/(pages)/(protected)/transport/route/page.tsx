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
import { listRoutes } from "@/services";
import type { TransportRoute } from "@/types/transport";
import { formatTransportTime } from "../_lib/format-transport-time";
import { RouteModal } from "./RouteModal";

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<TransportRoute>,
  serviceNumber: {
    field: "serviceNumber",
    headerName: "Service Number",
    minWidth: 130,
  } as ColDef<TransportRoute>,
  routeCode: {
    field: "routeCode",
    headerName: "Route Code",
    minWidth: 130,
  } as ColDef<TransportRoute>,
  route: {
    colId: "route",
    headerName: "Route",
    minWidth: 160,
    valueGetter: (p) => {
      const pickup = p.data?.routePickupPlace ?? "";
      const drop = p.data?.routeDropPlace ?? "";
      if (!pickup && !drop) return "";
      return `${pickup} - ${drop}`;
    },
  } as ColDef<TransportRoute>,
  routeStops: {
    colId: "routeStops",
    headerName: "Route Stops",
    minWidth: 280,
    flex: 1,
    wrapText: true,
    autoHeight: true,
    sortable: false,
  } as ColDef<TransportRoute>,
  isActive: {
    field: "isActive",
    headerName: "Status",
    minWidth: 100,
    flex: 0,
  } as ColDef<TransportRoute>,
  actions: {
    headerName: "Actions",
    minWidth: 160,
    width: 160,
    flex: 0,
  } as ColDef<TransportRoute>,
};

function statusRenderer(p: ICellRendererParams<TransportRoute>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

function routeStopsRenderer(p: ICellRendererParams<TransportRoute>) {
  const stops = p.data?.routeStops ?? [];
  if (stops.length === 0) return null;
  return (
    <div className="space-y-1 py-1">
      {stops.map((stop, index) => (
        <p
          key={stop.routeStopId ?? `${stop.stopName}-${index}`}
          className="m-0 text-sm leading-snug"
        >
          {stop.stopName}{" "}
          <span className="font-medium text-primary">
            ({formatTransportTime(stop.pickTime)} -{" "}
            {formatTransportTime(stop.dropTime)})
          </span>
        </p>
      ))}
    </div>
  );
}

function makeActionsRenderer(
  router: ReturnType<typeof useRouter>,
  setEditing: (row: TransportRoute | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<TransportRoute>) => (
    <div className="flex items-center gap-1">
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0"
        aria-label="Edit route"
        title="Edit Route"
        onClick={() => {
          setEditing(p.data ?? null);
          setModalOpen(true);
        }}
      >
        <PencilIcon className="h-3.5 w-3.5" />
      </Button>
      <span className="text-muted-foreground select-none" aria-hidden>
        |
      </span>
      <Button
        size="sm"
        variant="link"
        className="h-8 px-1 text-primary"
        onClick={() => {
          const id = p.data?.routeId;
          if (id) router.push(`/transport/route-stops?routeId=${id}`);
        }}
      >
        Route Stops
      </Button>
    </div>
  );
}

export default function RoutePage() {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TransportRoute | null>(null);

  const {
    data: rows,
    isLoading,
    isError,
    error,
    refetch,
    invalidate,
  } = useCrudList({
    queryKey: QK.transport.routes(),
    queryFn: listRoutes,
  });

  const columnDefs = useMemo<ColDef<TransportRoute>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.serviceNumber,
      COL_DEFS.routeCode,
      COL_DEFS.route,
      { ...COL_DEFS.routeStops, cellRenderer: routeStopsRenderer },
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
      title="Route"
      rowData={isError ? [] : rows}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search routes…",
        pdfDocumentTitle: "Routes",
      }}
      getRowId={(p) =>
        p.data.routeId != null
          ? String(p.data.routeId)
          : [
              p.data.serviceNumber,
              p.data.routeCode,
              p.data.routePickupPlace,
              p.data.routeDropPlace,
            ].join("|")
      }
      toolbarTrailing={
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <PlusIcon className="h-4 w-4 mr-1" />
          Add Route
        </Button>
      }
      emptyState={
        isError ? (
          <EmptyState
            title="Could not load routes"
            description={getErrorMessage(error)}
            action={{ label: "Retry", onClick: () => void refetch() }}
          />
        ) : undefined
      }
    >
      <RouteModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        row={editing}
        onSaved={async () => {
          await invalidate();
        }}
      />
    </ListPage>
  );
}
