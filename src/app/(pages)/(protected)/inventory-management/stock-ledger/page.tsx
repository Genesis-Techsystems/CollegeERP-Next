"use client";

/**
 * Angular `StockLedgerComponent` parity — Stock Ledger list + add/edit modal.
 */

import { useMemo, useState } from "react";
import { format, isValid, parseISO } from "date-fns";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { PencilIcon, PlusIcon } from "lucide-react";
import { ListPage } from "@/components/layout";
import { StatusBadge } from "@/common/components/data-display";
import { Button } from "@/components/ui/button";
import { useCrudList } from "@/hooks/useCrudList";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import { listInvStockLedgers } from "@/services";
import type { InvStockLedger } from "@/types/inventory";
import StockLedgerModal from "./StockLedgerModal";

/**
 * Angular displayedColumns:
 * id, storeName, itemName, transactionDate, transactionno, totalPrice, transactiontype, isActive, actions
 */
const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<InvStockLedger>,
  storeName: {
    field: "storeName",
    headerName: "Store",
    minWidth: 110,
    flex: 0.9,
  } as ColDef<InvStockLedger>,
  itemName: {
    field: "itemName",
    headerName: "Item",
    minWidth: 140,
    flex: 1.1,
  } as ColDef<InvStockLedger>,
  transactionDate: {
    headerName: "Trans. Date",
    minWidth: 120,
    flex: 0.9,
  } as ColDef<InvStockLedger>,
  transactionno: {
    field: "transactionno",
    headerName: "Trans. Number",
    minWidth: 120,
    flex: 0.9,
  } as ColDef<InvStockLedger>,
  totalprice: {
    field: "totalprice",
    headerName: "Total Price",
    minWidth: 110,
    flex: 0.8,
  } as ColDef<InvStockLedger>,
  transactionType: {
    field: "invTranstypeCatdetCode",
    headerName: "Transaction Type",
    minWidth: 140,
    flex: 1,
  } as ColDef<InvStockLedger>,
  isActive: {
    field: "isActive",
    headerName: "Status",
    minWidth: 100,
    flex: 0.7,
  } as ColDef<InvStockLedger>,
  actions: {
    headerName: "Actions",
    minWidth: 86,
    width: 86,
    flex: 0,
  } as ColDef<InvStockLedger>,
};

/** Angular `dateFormate: 'd MMM, y'` */
function formatTransDate(value?: string): string {
  if (!value) return "";
  const d = parseISO(value.includes("T") ? value : `${value}T00:00:00`);
  if (!isValid(d)) {
    const fallback = new Date(value);
    return isValid(fallback) ? format(fallback, "d MMM, y") : value;
  }
  return format(d, "d MMM, y");
}

function dateRenderer(p: ICellRendererParams<InvStockLedger>) {
  return <span>{formatTransDate(p.data?.transactionDate)}</span>;
}

function statusRenderer(p: ICellRendererParams<InvStockLedger>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

function makeActionsRenderer(
  setEditing: (row: InvStockLedger | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<InvStockLedger>) => (
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

export default function StockLedgerPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<InvStockLedger | null>(null);

  const {
    data: rows,
    isLoading,
    invalidate,
  } = useCrudList<InvStockLedger>({
    queryKey: QK.invStockLedgers.list(),
    queryFn: listInvStockLedgers,
  });

  const columnDefs = useMemo<ColDef<InvStockLedger>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.storeName,
      COL_DEFS.itemName,
      { ...COL_DEFS.transactionDate, cellRenderer: dateRenderer },
      COL_DEFS.transactionno,
      COL_DEFS.totalprice,
      COL_DEFS.transactionType,
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
      title="Stock Ledger"
      rowData={rows}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        pdfDocumentTitle: "Stock Ledger",
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
          Add Stock Ledger
        </Button>
      }
    >
      <StockLedgerModal
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
