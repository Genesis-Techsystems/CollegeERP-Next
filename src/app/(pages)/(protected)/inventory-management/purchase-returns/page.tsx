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
import { listInvPurchaseReturns } from "@/services";
import type { InvPurchaseReturn } from "@/types/inventory";

/**
 * Angular displayedColumns:
 * id, purchaseReturnNo, storeName, supplierName, purchaseReturnDate,
 * returnActualAmount, returnDiscount, returnAmount, isActive, actions
 */
const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<InvPurchaseReturn>,
  purchaseReturnNo: {
    field: "purchaseReturnNo",
    headerName: "P.R. No",
    minWidth: 110,
    flex: 1,
  } as ColDef<InvPurchaseReturn>,
  storeName: {
    field: "storeName",
    headerName: "Store",
    minWidth: 120,
    flex: 1,
  } as ColDef<InvPurchaseReturn>,
  supplierName: {
    field: "supplierName",
    headerName: "Supplier",
    minWidth: 140,
    flex: 1.1,
  } as ColDef<InvPurchaseReturn>,
  purchaseReturnDate: {
    headerName: "P.R. Date",
    minWidth: 110,
    flex: 0.9,
  } as ColDef<InvPurchaseReturn>,
  returnActualAmount: {
    field: "returnActualAmount",
    headerName: "Actual Amount",
    minWidth: 120,
    flex: 0.9,
  } as ColDef<InvPurchaseReturn>,
  returnDiscount: {
    field: "returnDiscount",
    headerName: "Discount",
    minWidth: 100,
    flex: 0.8,
  } as ColDef<InvPurchaseReturn>,
  returnAmount: {
    field: "returnAmount",
    headerName: "Net Amount",
    minWidth: 110,
    flex: 0.9,
  } as ColDef<InvPurchaseReturn>,
  isActive: {
    field: "isActive",
    headerName: "Status",
    minWidth: 100,
    flex: 0.7,
  } as ColDef<InvPurchaseReturn>,
  actions: {
    headerName: "Actions",
    minWidth: 86,
    width: 86,
    flex: 0,
  } as ColDef<InvPurchaseReturn>,
};

function prId(row: InvPurchaseReturn): number | undefined {
  return row.purchasereturnId ?? row.purchaseReturnId;
}

/** Angular `{{ row.purchaseReturnDate | date:'MMM d, y' }}` */
function formatPrDate(value?: string): string {
  if (!value) return "";
  const d = parseISO(value.includes("T") ? value : `${value}T00:00:00`);
  if (!isValid(d)) {
    const fallback = new Date(value);
    return isValid(fallback) ? format(fallback, "MMM d, y") : value;
  }
  return format(d, "MMM d, y");
}

function dateRenderer(p: ICellRendererParams<InvPurchaseReturn>) {
  return <span>{formatPrDate(p.data?.purchaseReturnDate)}</span>;
}

function statusRenderer(p: ICellRendererParams<InvPurchaseReturn>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

function makeActionsRenderer(router: ReturnType<typeof useRouter>) {
  return (p: ICellRendererParams<InvPurchaseReturn>) => {
    const row = p.data;
    const id = row ? prId(row) : undefined;
    if (!id) return null;
    return (
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0"
        title="Edit"
        onClick={() =>
          router.push(`/inventory-management/purchase-returns/edit?id=${id}`)
        }
      >
        <PencilIcon className="h-3.5 w-3.5" />
      </Button>
    );
  };
}

export default function PurchaseReturnsPage() {
  const router = useRouter();

  const { data: rows, isLoading } = useCrudList<InvPurchaseReturn>({
    queryKey: QK.invPurchaseReturns.list(),
    queryFn: listInvPurchaseReturns,
  });

  const columnDefs = useMemo<ColDef<InvPurchaseReturn>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.purchaseReturnNo,
      COL_DEFS.storeName,
      COL_DEFS.supplierName,
      { ...COL_DEFS.purchaseReturnDate, cellRenderer: dateRenderer },
      COL_DEFS.returnActualAmount,
      COL_DEFS.returnDiscount,
      COL_DEFS.returnAmount,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(router) },
    ],
    [router],
  );

  return (
    <ListPage
      title="Purchase Returns"
      rowData={rows}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        pdfDocumentTitle: "Purchase Returns",
      }}
      toolbarTrailing={
        <Button
          size="sm"
          onClick={() =>
            router.push("/inventory-management/purchase-returns/add")
          }
        >
          <PlusIcon className="h-4 w-4 mr-1" />
          Add Purchase Return
        </Button>
      }
    />
  );
}
