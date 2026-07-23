"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { format, isValid, parseISO } from "date-fns";
import { PencilIcon, PlusIcon } from "lucide-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { ListPage } from "@/components/layout";
import { StatusBadge } from "@/common/components/data-display";
import { Button } from "@/components/ui/button";
import { useCrudList } from "@/hooks/useCrudList";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import { listInvStockReceiptVouchers } from "@/services";
import type { InvStockReceiptVoucher } from "@/types/inventory";

/**
 * Angular displayedColumns:
 * id, srvNo, storeName, supplierName, srvDate, deliverychallanno,
 * deliverychallandate, srvActualAmount, isActive, actions
 */
const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<InvStockReceiptVoucher>,
  srvNo: {
    field: "srvNo",
    headerName: "Srv No",
    minWidth: 110,
    flex: 1,
  } as ColDef<InvStockReceiptVoucher>,
  storeName: {
    field: "storeName",
    headerName: "Store",
    minWidth: 120,
    flex: 1,
  } as ColDef<InvStockReceiptVoucher>,
  supplierName: {
    field: "supplierName",
    headerName: "Supplier",
    minWidth: 140,
    flex: 1.1,
  } as ColDef<InvStockReceiptVoucher>,
  srvDate: {
    headerName: "Srv Date",
    minWidth: 110,
    flex: 0.9,
  } as ColDef<InvStockReceiptVoucher>,
  deliverychallanno: {
    field: "deliverychallanno",
    headerName: "Challan No.",
    minWidth: 120,
    flex: 1,
  } as ColDef<InvStockReceiptVoucher>,
  deliverychallandate: {
    headerName: "Challan Date",
    minWidth: 110,
    flex: 0.9,
  } as ColDef<InvStockReceiptVoucher>,
  srvActualAmount: {
    field: "srvActualAmount",
    headerName: "Actual Amount",
    minWidth: 120,
    flex: 0.9,
  } as ColDef<InvStockReceiptVoucher>,
  isActive: {
    field: "isActive",
    headerName: "Status",
    minWidth: 100,
    flex: 0.7,
  } as ColDef<InvStockReceiptVoucher>,
  actions: {
    headerName: "Actions",
    minWidth: 86,
    width: 86,
    flex: 0,
  } as ColDef<InvStockReceiptVoucher>,
};

/** Angular `{{ row.srvDate | date:'MMM d, y' }}` */
function formatSrvDate(value?: string): string {
  if (!value) return "";
  const d = parseISO(value.includes("T") ? value : `${value}T00:00:00`);
  if (!isValid(d)) {
    const fallback = new Date(value);
    return isValid(fallback) ? format(fallback, "MMM d, y") : value;
  }
  return format(d, "MMM d, y");
}

function dateRenderer(field: "srvDate" | "deliverychallandate") {
  return (p: ICellRendererParams<InvStockReceiptVoucher>) => (
    <span>{formatSrvDate(p.data?.[field])}</span>
  );
}

function statusRenderer(p: ICellRendererParams<InvStockReceiptVoucher>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

function makeActionsRenderer(router: ReturnType<typeof useRouter>) {
  return (p: ICellRendererParams<InvStockReceiptVoucher>) => {
    const row = p.data;
    if (!row?.srvId) return null;
    return (
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0"
        title="Edit"
        onClick={() =>
          router.push(
            `/inventory-management/stock-receipt-voucher/edit?id=${row.srvId}`,
          )
        }
      >
        <PencilIcon className="h-3.5 w-3.5" />
      </Button>
    );
  };
}

export default function StockReceiptVoucherPage() {
  const router = useRouter();

  const { data: rows, isLoading } = useCrudList<InvStockReceiptVoucher>({
    queryKey: QK.invStockReceiptVouchers.list(),
    queryFn: listInvStockReceiptVouchers,
  });

  const columnDefs = useMemo<ColDef<InvStockReceiptVoucher>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.srvNo,
      COL_DEFS.storeName,
      COL_DEFS.supplierName,
      { ...COL_DEFS.srvDate, cellRenderer: dateRenderer("srvDate") },
      COL_DEFS.deliverychallanno,
      {
        ...COL_DEFS.deliverychallandate,
        cellRenderer: dateRenderer("deliverychallandate"),
      },
      COL_DEFS.srvActualAmount,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(router) },
    ],
    [router],
  );

  return (
    <ListPage
      title="Stock Receipt Voucher"
      rowData={rows}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        pdfDocumentTitle: "Stock Receipt Voucher",
      }}
      toolbarTrailing={
        <Button
          size="sm"
          onClick={() =>
            router.push("/inventory-management/stock-receipt-voucher/add")
          }
        >
          <PlusIcon className="h-4 w-4 mr-1" />
          Add Stock Receipt
        </Button>
      }
    />
  );
}
