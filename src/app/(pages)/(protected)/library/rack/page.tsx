"use client";

import { useMemo, useState } from "react";
import { PencilIcon, PlusIcon } from "lucide-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { StatusBadge } from "@/common/components/data-display";
import { ListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useCrudList } from "@/hooks/useCrudList";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import { listLibraryRacks } from "@/services";
import type { LibraryRack } from "@/types/library";
import { RackModal } from "./RackModal";

const COL_DEFS = {
  siNo: {
    headerName: "No.",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<LibraryRack>,
  orgCode: {
    field: "orgCode",
    headerName: "Organization",
    minWidth: 120,
  } as ColDef<LibraryRack>,
  libraryCode: {
    field: "libraryCode",
    headerName: "Library",
    minWidth: 120,
    valueGetter: (p) => p.data?.libraryCode ?? p.data?.libraryName ?? "",
  } as ColDef<LibraryRack>,
  shelveName: {
    field: "shelveName",
    headerName: "Shelf Name",
    minWidth: 140,
  } as ColDef<LibraryRack>,
  blockCapacity: {
    field: "blockCapacity",
    headerName: "Block Capacity",
    minWidth: 120,
    flex: 0,
  } as ColDef<LibraryRack>,
  noOfColumns: {
    field: "noOfColumns",
    headerName: "No Of Columns",
    minWidth: 120,
    flex: 0,
  } as ColDef<LibraryRack>,
  noOfRows: {
    field: "noOfRows",
    headerName: "No Of Rows",
    minWidth: 100,
    flex: 0,
  } as ColDef<LibraryRack>,
  totalCapacity: {
    field: "totalCapacity",
    headerName: "Total Capacity",
    minWidth: 120,
    flex: 0,
  } as ColDef<LibraryRack>,
  isActive: {
    field: "isActive",
    headerName: "Status",
    minWidth: 100,
    flex: 0,
  } as ColDef<LibraryRack>,
  actions: {
    headerName: "Actions",
    minWidth: 86,
    width: 86,
    flex: 0,
  } as ColDef<LibraryRack>,
};

function statusRenderer(p: ICellRendererParams<LibraryRack>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

function makeActionsRenderer(
  setEditing: (row: LibraryRack | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<LibraryRack>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      aria-label="Edit rack"
      onClick={() => {
        setEditing(p.data ?? null);
        setModalOpen(true);
      }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  );
}

export default function RackPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LibraryRack | null>(null);

  const {
    data: rows,
    isLoading: loading,
    invalidate,
  } = useCrudList({
    queryKey: QK.library.racks(),
    queryFn: listLibraryRacks,
  });

  const columnDefs = useMemo<ColDef<LibraryRack>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.orgCode,
      COL_DEFS.libraryCode,
      COL_DEFS.shelveName,
      COL_DEFS.blockCapacity,
      COL_DEFS.noOfColumns,
      COL_DEFS.noOfRows,
      COL_DEFS.totalCapacity,
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
      title="Rack"
      rowData={rows}
      columnDefs={columnDefs}
      loading={loading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        pdfDocumentTitle: "Library Racks",
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
          Add Rack
        </Button>
      }
    >
      <RackModal
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
