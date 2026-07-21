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
import { listLibrarySuppliers } from "@/services";
import type { LibrarySupplier } from "@/types/library";
import { SupplierModal } from "./SupplierModal";

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<LibrarySupplier>,
  orgCode: {
    field: "orgCode",
    headerName: "Organization",
    minWidth: 110,
  } as ColDef<LibrarySupplier>,
  suppliername: {
    field: "suppliername",
    headerName: "Supplier Name",
    minWidth: 140,
  } as ColDef<LibrarySupplier>,
  suppliercode: {
    field: "suppliercode",
    headerName: "Supplier Code",
    minWidth: 110,
  } as ColDef<LibrarySupplier>,
  contactPersonName: {
    field: "contactPersonName",
    headerName: "Contact Person Name",
    minWidth: 150,
  } as ColDef<LibrarySupplier>,
  phoneNo: {
    field: "phoneNo",
    headerName: "Phone No",
    minWidth: 110,
  } as ColDef<LibrarySupplier>,
  address: {
    field: "address",
    headerName: "Address",
    minWidth: 150,
  } as ColDef<LibrarySupplier>,
  isActive: {
    field: "isActive",
    headerName: "Status",
    minWidth: 100,
    flex: 0,
  } as ColDef<LibrarySupplier>,
  actions: {
    headerName: "Actions",
    minWidth: 86,
    width: 86,
    flex: 0,
  } as ColDef<LibrarySupplier>,
};

function statusRenderer(p: ICellRendererParams<LibrarySupplier>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

function makeActionsRenderer(
  setEditing: (row: LibrarySupplier | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<LibrarySupplier>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      aria-label="Edit supplier"
      onClick={() => {
        setEditing(p.data ?? null);
        setModalOpen(true);
      }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  );
}

export default function SupplierDetailsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LibrarySupplier | null>(null);

  const {
    data: rows,
    isLoading: loading,
    invalidate,
  } = useCrudList({
    queryKey: QK.library.suppliers(),
    queryFn: listLibrarySuppliers,
  });

  const columnDefs = useMemo<ColDef<LibrarySupplier>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.orgCode,
      COL_DEFS.suppliername,
      COL_DEFS.suppliercode,
      COL_DEFS.contactPersonName,
      COL_DEFS.phoneNo,
      COL_DEFS.address,
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
      title="Supplier Details"
      rowData={rows}
      columnDefs={columnDefs}
      loading={loading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search suppliers…",
        pdfDocumentTitle: "Library Suppliers",
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
          Add Supplier Details
        </Button>
      }
    >
      <SupplierModal
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
