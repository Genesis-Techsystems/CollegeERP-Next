"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format, isValid, parseISO } from "date-fns";
import { EyeIcon, PencilIcon, PlusIcon } from "lucide-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { ListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useCrudList } from "@/hooks/useCrudList";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import { listInvPurchaseOrders } from "@/services";
import type { InvPurchaseOrderListRow } from "@/types/inventory";
import ViewPurchaseOrderItemsModal from "./ViewPurchaseOrderItemsModal";

/**
 * Angular displayedColumns:
 * id, pono, poDate, poType, poActualAmount, isActive, actions
 * (Status cell shows poWorkFlowName; amount column uses poNetCost)
 */
const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<InvPurchaseOrderListRow>,
  pono: {
    field: "pono",
    headerName: "P.O. Number",
    minWidth: 120,
    flex: 1,
  } as ColDef<InvPurchaseOrderListRow>,
  poDate: {
    headerName: "P.O. Date",
    minWidth: 120,
    flex: 0.9,
  } as ColDef<InvPurchaseOrderListRow>,
  poType: {
    field: "potypeCatdetDisplayName",
    headerName: "PO Type",
    minWidth: 120,
    flex: 1,
  } as ColDef<InvPurchaseOrderListRow>,
  poNetCost: {
    headerName: "PO Net Cost",
    minWidth: 120,
    flex: 0.9,
  } as ColDef<InvPurchaseOrderListRow>,
  status: {
    headerName: "Status",
    minWidth: 120,
    flex: 1,
  } as ColDef<InvPurchaseOrderListRow>,
  actions: {
    headerName: "Actions",
    minWidth: 100,
    width: 100,
    flex: 0,
  } as ColDef<InvPurchaseOrderListRow>,
};

/** Angular `{{ row.poDate | date:'MMM d, y' }}` */
function formatPoDate(value?: string): string {
  if (!value) return "";
  const d = parseISO(value.includes("T") ? value : `${value}T00:00:00`);
  if (!isValid(d)) {
    const fallback = new Date(value);
    return isValid(fallback) ? format(fallback, "MMM d, y") : value;
  }
  return format(d, "MMM d, y");
}

/** Angular `{{ row.poNetCost | currency:'INR':'' }}` */
function formatInr(value?: number | null): string {
  if (value == null || Number.isNaN(Number(value))) return "";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    currencyDisplay: "symbol",
  }).format(Number(value));
}

function poDateRenderer(p: ICellRendererParams<InvPurchaseOrderListRow>) {
  return <span>{formatPoDate(p.data?.poDate)}</span>;
}

function poNetCostRenderer(p: ICellRendererParams<InvPurchaseOrderListRow>) {
  return <span>{formatInr(p.data?.poNetCost)}</span>;
}

/** Angular Status column: `{{ row.poWorkFlowName }}` (not Active/Inactive badge) */
function workflowStatusRenderer(
  p: ICellRendererParams<InvPurchaseOrderListRow>,
) {
  return <span>{p.data?.poWorkFlowName ?? ""}</span>;
}

function makeActionsRenderer(
  router: ReturnType<typeof useRouter>,
  onView: (row: InvPurchaseOrderListRow) => void,
) {
  return (p: ICellRendererParams<InvPurchaseOrderListRow>) => {
    const row = p.data;
    if (!row) return null;
    return (
      <div className="flex items-center gap-0.5">
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          title="view"
          onClick={() => onView(row)}
        >
          <EyeIcon className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          title="Edit"
          onClick={() => {
            router.push(
              `/inventory-management/purchase-order/edit?id=${row.poId}`,
            );
          }}
        >
          <PencilIcon className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  };
}

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const [viewRow, setViewRow] = useState<InvPurchaseOrderListRow | null>(null);

  const { data: rows, isLoading } = useCrudList<InvPurchaseOrderListRow>({
    queryKey: QK.invPurchaseOrders.list(),
    queryFn: listInvPurchaseOrders,
  });

  const columnDefs = useMemo<ColDef<InvPurchaseOrderListRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.pono,
      { ...COL_DEFS.poDate, cellRenderer: poDateRenderer },
      COL_DEFS.poType,
      { ...COL_DEFS.poNetCost, cellRenderer: poNetCostRenderer },
      { ...COL_DEFS.status, cellRenderer: workflowStatusRenderer },
      {
        ...COL_DEFS.actions,
        cellRenderer: makeActionsRenderer(router, setViewRow),
      },
    ],
    [router],
  );

  return (
    <ListPage
      title="Purchase Order"
      rowData={rows}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        pdfDocumentTitle: "Purchase Order",
      }}
      toolbarTrailing={
        <Button
          size="sm"
          onClick={() =>
            router.push("/inventory-management/purchase-order/add")
          }
        >
          <PlusIcon className="h-4 w-4 mr-1" />
          New Purchase Order
        </Button>
      }
    >
      <ViewPurchaseOrderItemsModal
        open={viewRow != null}
        onClose={() => setViewRow(null)}
        data={viewRow}
      />
    </ListPage>
  );
}
