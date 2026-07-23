"use client";

import { useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { format, parseISO } from "date-fns";
import { PencilIcon, PlusIcon } from "lucide-react";
import { ListPage } from "@/components/layout";
import { StatusBadge } from "@/common/components/data-display";
import { Button } from "@/components/ui/button";
import { useCrudList } from "@/hooks/useCrudList";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import { listInvSuppliersMaster } from "@/services";
import type { InvSupplier } from "@/types/inventory";
import SupplierMasterModal from "./SupplierMasterModal";

/** Angular displayedColumns + date pipe `MMM d, y` */
const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<InvSupplier>,
  supplierName: {
    field: "supplierName",
    headerName: "Supplier Name",
    minWidth: 150,
    flex: 1.1,
  } as ColDef<InvSupplier>,
  contact1Name: {
    field: "contact1Name",
    headerName: "Contact Name",
    minWidth: 130,
    flex: 1,
  } as ColDef<InvSupplier>,
  contact1Phone: {
    field: "contact1Phone",
    headerName: "Contact Phone",
    minWidth: 120,
    flex: 0.9,
  } as ColDef<InvSupplier>,
  contact1Email: {
    field: "contact1Email",
    headerName: "Contact Email",
    minWidth: 150,
    flex: 1,
  } as ColDef<InvSupplier>,
  cstno: {
    field: "cstno",
    headerName: "CST No",
    minWidth: 100,
    flex: 0.8,
  } as ColDef<InvSupplier>,
  gstno: {
    field: "gstno",
    headerName: "GST No",
    minWidth: 120,
    flex: 0.9,
  } as ColDef<InvSupplier>,
  startdate: {
    headerName: "Start Date",
    minWidth: 110,
    flex: 0.9,
  } as ColDef<InvSupplier>,
  enddate: {
    headerName: "End Date",
    minWidth: 110,
    flex: 0.9,
  } as ColDef<InvSupplier>,
  orgCode: {
    field: "orgCode",
    headerName: "Organization",
    minWidth: 110,
    flex: 0.9,
  } as ColDef<InvSupplier>,
  isActive: {
    field: "isActive",
    headerName: "Status",
    minWidth: 90,
    flex: 0.7,
  } as ColDef<InvSupplier>,
  actions: {
    headerName: "Actions",
    minWidth: 90,
    width: 90,
    flex: 0,
  } as ColDef<InvSupplier>,
};

/** Angular `{{ row.startdate | date:'MMM d, y' }}` */
function formatDisplayDate(value?: string | null): string {
  if (!value) return "";
  try {
    const d = /^\d{4}-\d{2}-\d{2}/.test(value)
      ? parseISO(value.slice(0, 10))
      : new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return format(d, "MMM d, y");
  } catch {
    return value;
  }
}

function statusRenderer(p: ICellRendererParams<InvSupplier>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

function startDateRenderer(p: ICellRendererParams<InvSupplier>) {
  return <span>{formatDisplayDate(p.data?.startdate)}</span>;
}

function endDateRenderer(p: ICellRendererParams<InvSupplier>) {
  return <span>{formatDisplayDate(p.data?.enddate)}</span>;
}

function makeActionsRenderer(
  setEditing: (row: InvSupplier | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<InvSupplier>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      title="Edit"
      onClick={() => {
        setEditing(p.data ?? null);
        setModalOpen(true);
      }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  );
}

export default function SupplierMasterPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<InvSupplier | null>(null);

  const { data, isLoading, invalidate } = useCrudList<InvSupplier>({
    queryKey: QK.invSuppliersMaster.list(),
    queryFn: listInvSuppliersMaster,
  });

  const columnDefs = useMemo<ColDef<InvSupplier>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.supplierName,
      COL_DEFS.contact1Name,
      COL_DEFS.contact1Phone,
      COL_DEFS.contact1Email,
      COL_DEFS.cstno,
      COL_DEFS.gstno,
      { ...COL_DEFS.startdate, cellRenderer: startDateRenderer },
      { ...COL_DEFS.enddate, cellRenderer: endDateRenderer },
      COL_DEFS.orgCode,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      {
        ...COL_DEFS.actions,
        cellRenderer: makeActionsRenderer(setEditData, setModalOpen),
      },
    ],
    [],
  );

  return (
    <ListPage
      title="Supplier Master"
      rowData={data}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        pdfDocumentTitle: "Supplier Master",
      }}
      toolbarTrailing={
        <Button
          size="sm"
          onClick={() => {
            setEditData(null);
            setModalOpen(true);
          }}
        >
          <PlusIcon className="h-4 w-4 mr-1" />
          Add Supplier Master
        </Button>
      }
    >
      <SupplierMasterModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditData(null);
        }}
        editData={editData}
        onSaved={invalidate}
      />
    </ListPage>
  );
}
