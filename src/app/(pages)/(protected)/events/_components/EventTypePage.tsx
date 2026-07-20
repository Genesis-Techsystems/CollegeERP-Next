"use client";

import { useMemo, useState } from "react";
import { PencilIcon, PlusIcon } from "lucide-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { useCrudList } from "@/hooks/useCrudList";
import { StatusBadge } from "@/common/components/data-display";
import { ListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import { listEventTypes, type EventTypeRow } from "@/services";
import { EventTypeModal } from "./EventTypeModal";

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<EventTypeRow>,
  college: {
    field: "collegeCode",
    headerName: "College",
    minWidth: 110,
  } as ColDef<EventTypeRow>,
  name: {
    field: "eventTypeName",
    headerName: "Event Type Name",
    minWidth: 200,
  } as ColDef<EventTypeRow>,
  isActive: {
    field: "isActive",
    headerName: "Status",
    minWidth: 100,
    flex: 0,
  } as ColDef<EventTypeRow>,
  actions: {
    headerName: "Actions",
    minWidth: 86,
    width: 86,
    flex: 0,
  } as ColDef<EventTypeRow>,
};

function statusRenderer(p: ICellRendererParams<EventTypeRow>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

function makeActionsRenderer(
  setEditing: (row: EventTypeRow | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<EventTypeRow>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      aria-label="Edit event type"
      onClick={() => {
        setEditing(p.data ?? null);
        setModalOpen(true);
      }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  );
}

export function EventTypePage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EventTypeRow | null>(null);

  const {
    data: rows,
    isLoading,
    invalidate,
  } = useCrudList({
    queryKey: QK.events.eventTypes(),
    queryFn: listEventTypes,
  });

  const columnDefs = useMemo<ColDef<EventTypeRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.college,
      COL_DEFS.name,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      {
        ...COL_DEFS.actions,
        cellRenderer: makeActionsRenderer(setEditing, setModalOpen),
      },
    ],
    [],
  );

  return (
    <ListPage
      title="Event Type"
      rowData={rows}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search event types…",
        pdfDocumentTitle: "Event Types",
      }}
      toolbarTrailing={
        <Button
          size="sm"
          className="h-[30px] px-3 text-[12px]"
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <PlusIcon className="h-3.5 w-3.5 mr-1.5" />
          Add Event Type
        </Button>
      }
    >
      <EventTypeModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        row={editing}
        existingRows={rows}
        onSaved={invalidate}
      />
    </ListPage>
  );
}
