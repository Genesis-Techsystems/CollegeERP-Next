"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format, isValid, parseISO } from "date-fns";
import { EyeIcon, PencilIcon, PlusIcon } from "lucide-react";
import type {
  ColDef,
  ICellRendererParams,
  ValueFormatterParams,
} from "ag-grid-community";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { ListPage } from "@/components/layout";
import { DataTable } from "@/common/components/table";
import { Button } from "@/components/ui/button";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import { listPurchaseOrders } from "@/services";
import type { InvPurchaseOrderRow } from "@/types/e-office";
import { ViewPaymentNoteDialog } from "./_components/ViewPaymentNoteDialog";
import { CompletePoDialog } from "./_components/CompletePoDialog";

/** Angular `{{ row.poDate | date:'MMM d, y' }}` */
function formatListPoDate(value?: string | null): string {
  if (!value) return "";
  const d = parseISO(value.includes("T") ? value : `${value}T00:00:00`);
  const date = isValid(d) ? d : new Date(value);
  return isValid(date) ? format(date, "MMM d, yyyy") : value;
}

/** Angular `{{ row.poNetCost | currency:'INR':'' }}` — amount only, 2 decimals. */
function formatInrPlain(value?: number | null): string {
  if (value == null || Number.isNaN(Number(value))) return "";
  return Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function poDateFormatter(p: ValueFormatterParams<InvPurchaseOrderRow>) {
  return formatListPoDate(p.value as string | undefined);
}

function poNetCostFormatter(p: ValueFormatterParams<InvPurchaseOrderRow>) {
  return formatInrPlain(p.value as number | undefined);
}

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<InvPurchaseOrderRow>,
  pono: {
    field: "pono",
    headerName: "P.O. Number",
    minWidth: 120,
  } as ColDef<InvPurchaseOrderRow>,
  poDate: {
    field: "poDate",
    headerName: "P.O. Date",
    minWidth: 120,
    valueFormatter: poDateFormatter,
  } as ColDef<InvPurchaseOrderRow>,
  poType: {
    field: "potypeCatdetDisplayName",
    headerName: "PO Type",
    minWidth: 130,
  } as ColDef<InvPurchaseOrderRow>,
  poNetCost: {
    field: "poNetCost",
    headerName: "PO Net Cost",
    minWidth: 120,
    valueFormatter: poNetCostFormatter,
  } as ColDef<InvPurchaseOrderRow>,
  status: {
    field: "poWorkFlowName",
    headerName: "Status",
    minWidth: 120,
  } as ColDef<InvPurchaseOrderRow>,
  poStatus: {
    field: "poStatusCatdetDisplayName",
    headerName: "PO Status",
    minWidth: 120,
  } as ColDef<InvPurchaseOrderRow>,
  actions: {
    headerName: "Actions",
    minWidth: 180,
    flex: 0,
    width: 180,
  } as ColDef<InvPurchaseOrderRow>,
};

export default function PaymentNoteRequestPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [viewRow, setViewRow] = useState<InvPurchaseOrderRow | null>(null);
  const [completeRow, setCompleteRow] = useState<InvPurchaseOrderRow | null>(
    null,
  );

  const { data: allOrders = [], isLoading } = useQuery({
    queryKey: QK.eOffice.purchaseOrders(),
    queryFn: listPurchaseOrders,
  });

  const pending = useMemo(
    () => allOrders.filter((x) => x.poStatusCatdetId == null),
    [allOrders],
  );
  const completed = useMemo(
    () => allOrders.filter((x) => x.poStatusCatdetId != null),
    [allOrders],
  );

  const makeActions =
    (includeComplete: boolean, includeEdit: boolean) =>
    (p: ICellRendererParams<InvPurchaseOrderRow>) => {
      const row = p.data;
      if (!row) return null;
      return (
        <div className="flex items-center gap-1 flex-wrap">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            aria-label="View PO"
            onClick={() => setViewRow(row)}
          >
            <EyeIcon className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />
          </Button>
          {includeEdit && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              aria-label="Edit PO"
              onClick={() => {
                const params = new URLSearchParams({
                  poId: String(row.poId ?? ""),
                });
                router.push(
                  `/e-office/payment-note-request/edit-payment-note-request?${params}`,
                );
              }}
            >
              <PencilIcon className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />
            </Button>
          )}
          {includeComplete && (
            <Button
              size="sm"
              className="h-7 px-2 text-[11px]"
              onClick={() => setCompleteRow(row)}
            >
              Complete
            </Button>
          )}
        </div>
      );
    };

  const columnDefs = useMemo<ColDef<InvPurchaseOrderRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.pono,
      COL_DEFS.poDate,
      COL_DEFS.poType,
      COL_DEFS.poNetCost,
      COL_DEFS.status,
      { ...COL_DEFS.actions, cellRenderer: makeActions(true, true) },
    ],
    [router],
  );

  const completedColumnDefs = useMemo<ColDef<InvPurchaseOrderRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.pono,
      COL_DEFS.poDate,
      COL_DEFS.poType,
      COL_DEFS.poNetCost,
      COL_DEFS.poStatus,
      {
        ...COL_DEFS.actions,
        width: 90,
        minWidth: 90,
        cellRenderer: makeActions(false, false),
      },
    ],
    [router],
  );

  return (
    <ListPage
      title="Purchase Order"
      rowData={pending}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        pdfDocumentTitle: "Payment Note Requests",
      }}
      toolbarTrailing={
        <Button
          size="sm"
          className="h-[30px] px-3 text-[12px]"
          onClick={() =>
            router.push(
              "/e-office/payment-note-request/add-payment-note-request",
            )
          }
        >
          <PlusIcon className="h-3.5 w-3.5 mr-1.5" />
          New Purchase Order
        </Button>
      }
    >
      {completed.length > 0 && (
        <DataTable
          title="Completed Purchase Orders"
          subtitle=""
          bordered
          rowData={completed}
          columnDefs={completedColumnDefs}
          loading={isLoading}
          pagination
          toolbar={{ search: true, searchPlaceholder: "Search" }}
        />
      )}

      <ViewPaymentNoteDialog
        open={Boolean(viewRow)}
        onClose={() => setViewRow(null)}
        row={viewRow}
      />

      <CompletePoDialog
        open={Boolean(completeRow)}
        onClose={() => setCompleteRow(null)}
        row={completeRow}
        onCompleted={() =>
          void qc.invalidateQueries({ queryKey: QK.eOffice.purchaseOrders() })
        }
      />
    </ListPage>
  );
}
