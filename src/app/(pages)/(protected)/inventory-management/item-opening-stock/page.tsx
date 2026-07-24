"use client";

import { useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { PencilIcon, PlusIcon } from "lucide-react";
import { ListPage } from "@/components/layout";
import { StatusBadge } from "@/common/components/data-display";
import { Button } from "@/components/ui/button";
import { useCrudList } from "@/hooks/useCrudList";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import { listInvOpeningStocks } from "@/services";
import type { InvOpeningStock } from "@/types/inventory";
import OpeningStockModal from "./OpeningStockModal";

/**
 * Angular displayedColumns:
 * id, storeName, itemName, itemPrice, qty, totalPrice, academicYear, isActive, actions
 */
const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<InvOpeningStock>,
  storeName: {
    field: "storeName",
    headerName: "Store",
    minWidth: 140,
    flex: 1,
  } as ColDef<InvOpeningStock>,
  itemName: {
    field: "itemName",
    headerName: "Item",
    minWidth: 160,
    flex: 1.2,
  } as ColDef<InvOpeningStock>,
  itemPrice: {
    field: "itemPrice",
    headerName: "Item Price",
    minWidth: 100,
    flex: 0.8,
  } as ColDef<InvOpeningStock>,
  qty: {
    field: "qty",
    headerName: "Quantity",
    minWidth: 90,
    flex: 0.7,
  } as ColDef<InvOpeningStock>,
  totalPrice: {
    field: "totalPrice",
    headerName: "Total Price",
    minWidth: 100,
    flex: 0.8,
  } as ColDef<InvOpeningStock>,
  academicYear: {
    field: "academicYear",
    headerName: "Academic Year",
    minWidth: 120,
    flex: 0.9,
  } as ColDef<InvOpeningStock>,
  isActive: {
    field: "isActive",
    headerName: "Status",
    minWidth: 90,
    flex: 0.7,
  } as ColDef<InvOpeningStock>,
  actions: {
    headerName: "Actions",
    minWidth: 90,
    width: 90,
    flex: 0,
  } as ColDef<InvOpeningStock>,
};

function statusRenderer(p: ICellRendererParams<InvOpeningStock>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

function makeActionsRenderer(
  setEditing: (row: InvOpeningStock | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<InvOpeningStock>) => (
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

export default function OpeningStockPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<InvOpeningStock | null>(null);

  const { data, isLoading, invalidate } = useCrudList<InvOpeningStock>({
    queryKey: QK.invOpeningStocks.list(),
    queryFn: listInvOpeningStocks,
  });

  const columnDefs = useMemo<ColDef<InvOpeningStock>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.storeName,
      COL_DEFS.itemName,
      COL_DEFS.itemPrice,
      COL_DEFS.qty,
      COL_DEFS.totalPrice,
      COL_DEFS.academicYear,
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
      title="Opening Stock"
      rowData={data}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        pdfDocumentTitle: "Item Opening Stock",
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
          Add Item Opening Stock
        </Button>
      }
    >
      <OpeningStockModal
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
