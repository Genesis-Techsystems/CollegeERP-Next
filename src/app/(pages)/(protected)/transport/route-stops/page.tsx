"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon, PencilIcon, PlusIcon } from "lucide-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { EmptyState } from "@/common/components/feedback";
import { StatusBadge } from "@/common/components/data-display";
import { getErrorMessage } from "@/lib/errors";
import { ListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import { getRouteById, listRouteStopsByRoute } from "@/services";
import type { RouteStop } from "@/types/transport";
import { formatTransportTime } from "../_lib/format-transport-time";
import { RouteStopModal } from "./RouteStopModal";

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<RouteStop>,
  stopName: {
    field: "stopName",
    headerName: "Stop",
    minWidth: 140,
  } as ColDef<RouteStop>,
  distanceFromSchoolKm: {
    field: "distanceFromSchoolKm",
    headerName: "Distance (km)",
    minWidth: 110,
    flex: 0,
  } as ColDef<RouteStop>,
  pickTime: {
    field: "pickTime",
    headerName: "Pick",
    minWidth: 90,
    valueFormatter: (p) => formatTransportTime(p.value),
  } as ColDef<RouteStop>,
  dropTime: {
    field: "dropTime",
    headerName: "Drop",
    minWidth: 90,
    valueFormatter: (p) => formatTransportTime(p.value),
  } as ColDef<RouteStop>,
  feeFrequencyCode: {
    headerName: "Frequency",
    minWidth: 120,
    valueGetter: (p) =>
      p.data?.feeFrequencyDisplayName ?? p.data?.feeFrequencyCode ?? "",
  } as ColDef<RouteStop>,
  amount: {
    field: "amount",
    headerName: "Amount",
    minWidth: 90,
    flex: 0,
  } as ColDef<RouteStop>,
  isActive: {
    field: "isActive",
    headerName: "Status",
    minWidth: 100,
    flex: 0,
  } as ColDef<RouteStop>,
  actions: {
    headerName: "Actions",
    minWidth: 86,
    width: 86,
    flex: 0,
  } as ColDef<RouteStop>,
};

function statusRenderer(p: ICellRendererParams<RouteStop>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

function makeActionsRenderer(
  setEditing: (row: RouteStop | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<RouteStop>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      aria-label="Edit route stop"
      onClick={() => {
        setEditing(p.data ?? null);
        setModalOpen(true);
      }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  );
}

export default function RouteStopsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const routeId = Number(searchParams.get("routeId") ?? 0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RouteStop | null>(null);

  const {
    data: rows = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: QK.transport.routeStops(routeId),
    queryFn: () => listRouteStopsByRoute(routeId),
    enabled: routeId > 0,
  });

  const { data: parentRoute } = useQuery({
    queryKey: QK.transport.route(routeId),
    queryFn: () => getRouteById(routeId),
    enabled: routeId > 0,
  });

  const columnDefs = useMemo<ColDef<RouteStop>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.stopName,
      COL_DEFS.distanceFromSchoolKm,
      COL_DEFS.pickTime,
      COL_DEFS.dropTime,
      COL_DEFS.feeFrequencyCode,
      COL_DEFS.amount,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      {
        ...COL_DEFS.actions,
        cellRenderer: makeActionsRenderer(setEditing, setModalOpen),
      },
    ],
    [],
  );

  if (!routeId) {
    return (
      <ListPage
        title="Route Stops"
        rowData={[]}
        columnDefs={columnDefs}
        emptyState={
          <EmptyState
            title="No route selected"
            description="Open route stops from the Route list using the map icon."
            action={{
              label: "Go to Routes",
              onClick: () => router.push("/transport/route"),
            }}
          />
        }
      />
    );
  }

  return (
    <ListPage
      title="Route Stops"
      rowData={isError ? [] : rows}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search stops…",
        pdfDocumentTitle: "Route Stops",
      }}
      toolbarTrailing={
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => router.back()}>
            <ArrowLeftIcon className="h-3.5 w-3.5 mr-1" />
            Back
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            Add Stop
          </Button>
        </div>
      }
      emptyState={
        isError ? (
          <EmptyState
            title="Could not load route stops"
            description={getErrorMessage(error)}
            action={{ label: "Retry", onClick: () => void refetch() }}
          />
        ) : undefined
      }
    >
      <RouteStopModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        row={editing}
        routeId={routeId}
        parentRoute={parentRoute ?? null}
        onSaved={async () => {
          await refetch();
          await queryClient.invalidateQueries({
            queryKey: QK.transport.routes(),
          });
        }}
      />
    </ListPage>
  );
}
