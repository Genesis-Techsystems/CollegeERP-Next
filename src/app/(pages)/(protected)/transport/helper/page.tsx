"use client";

import { useMemo, useState } from "react";
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
import { listHelpers } from "@/services";
import type { Helper } from "@/types/transport";
import { HelperModal } from "./HelperModal";
import {
  DEFAULT_TRANSPORT_PASSPORT_PHOTO,
  resolveTransportPhotoSrc,
} from "../_lib/transport-photo";

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<Helper>,
  photo: {
    field: "photoPath",
    headerName: "Photo",
    width: 80,
    flex: 0,
    sortable: false,
    filter: false,
  } as ColDef<Helper>,
  helperName: {
    field: "helperName",
    headerName: "Helper Name",
    minWidth: 150,
  } as ColDef<Helper>,
  mobileNumber: {
    field: "mobileNumber",
    headerName: "Mobile",
    minWidth: 120,
  } as ColDef<Helper>,
  isActive: {
    field: "isActive",
    headerName: "Status",
    minWidth: 100,
    flex: 0,
  } as ColDef<Helper>,
  actions: {
    headerName: "Actions",
    minWidth: 86,
    width: 86,
    flex: 0,
  } as ColDef<Helper>,
};

function statusRenderer(p: ICellRendererParams<Helper>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

function photoRenderer(p: ICellRendererParams<Helper>) {
  return (
    <div className="flex h-full items-center justify-center py-1">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolveTransportPhotoSrc(p.data?.photoPath)}
        alt=""
        className="h-9 w-9 rounded-full border object-cover"
        onError={(e) => {
          const img = e.currentTarget;
          if (!img.src.includes("default_Student.png")) {
            img.src = DEFAULT_TRANSPORT_PASSPORT_PHOTO;
          }
        }}
      />
    </div>
  );
}

function makeActionsRenderer(
  setEditing: (row: Helper | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<Helper>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      aria-label="Edit helper"
      onClick={() => {
        setEditing(p.data ?? null);
        setModalOpen(true);
      }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  );
}

export default function HelperPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Helper | null>(null);

  const {
    data: rows,
    isLoading,
    isError,
    error,
    refetch,
    invalidate,
  } = useCrudList({
    queryKey: QK.transport.helpers(),
    queryFn: listHelpers,
  });

  const columnDefs = useMemo<ColDef<Helper>[]>(
    () => [
      COL_DEFS.siNo,
      { ...COL_DEFS.photo, cellRenderer: photoRenderer },
      COL_DEFS.helperName,
      COL_DEFS.mobileNumber,
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
      title="Helper"
      rowData={isError ? [] : rows}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search helpers…",
        pdfDocumentTitle: "Helpers",
      }}
      toolbarTrailing={
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <PlusIcon className="h-4 w-4 mr-1" />
          Add Helper
        </Button>
      }
      emptyState={
        isError ? (
          <EmptyState
            title="Could not load helpers"
            description={getErrorMessage(error)}
            action={{ label: "Retry", onClick: () => void refetch() }}
          />
        ) : undefined
      }
    >
      <HelperModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        row={editing}
        onSaved={invalidate}
      />
    </ListPage>
  );
}
