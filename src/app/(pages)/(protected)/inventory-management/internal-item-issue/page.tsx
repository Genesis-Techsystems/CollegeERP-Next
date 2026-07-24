"use client";

/**
 * Angular `InternalIssueComponent` parity — Internal Issue list.
 */

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
import { listInvInternalIssues } from "@/services";
import type { InvInternalIssue } from "@/types/inventory";

/**
 * Angular displayedColumns:
 * id, internalIssueNo, issueDate, storeCode, toEmpName, Quantity, isActive, actions
 */
const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<InvInternalIssue>,
  internalIssueNo: {
    field: "internalIssueNo",
    headerName: "Issue No",
    minWidth: 120,
    flex: 1,
  } as ColDef<InvInternalIssue>,
  issueDate: {
    headerName: "Issue Date",
    minWidth: 120,
    flex: 0.9,
  } as ColDef<InvInternalIssue>,
  storeCode: {
    field: "storeCode",
    headerName: "Store",
    minWidth: 100,
    flex: 0.8,
  } as ColDef<InvInternalIssue>,
  toEmpName: {
    field: "toEmpName",
    headerName: "Employee",
    minWidth: 140,
    flex: 1.1,
  } as ColDef<InvInternalIssue>,
  quantity: {
    headerName: "Quantity",
    minWidth: 100,
    flex: 0.8,
  } as ColDef<InvInternalIssue>,
  isActive: {
    field: "isActive",
    headerName: "Status",
    minWidth: 100,
    flex: 0.7,
  } as ColDef<InvInternalIssue>,
  actions: {
    headerName: "Actions",
    minWidth: 86,
    width: 86,
    flex: 0,
  } as ColDef<InvInternalIssue>,
};

/** Angular `{{ row.issueDate | date:'dd MMM, y' }}` */
function formatIssueDate(value?: string): string {
  if (!value) return "";
  const d = parseISO(value.includes("T") ? value : `${value}T00:00:00`);
  if (!isValid(d)) {
    const fallback = new Date(value);
    return isValid(fallback) ? format(fallback, "dd MMM, y") : value;
  }
  return format(d, "dd MMM, y");
}

function dateRenderer(p: ICellRendererParams<InvInternalIssue>) {
  return <span>{formatIssueDate(p.data?.issueDate)}</span>;
}

/** Angular: `row?.invInternalIssueItemDTOs[0]?.indentQuantity` */
function quantityRenderer(p: ICellRendererParams<InvInternalIssue>) {
  const qty =
    p.data?.invInternalIssueItemDTOs?.[0]?.indentQuantity ?? p.data?.Quantity;
  return <span>{qty ?? ""}</span>;
}

function statusRenderer(p: ICellRendererParams<InvInternalIssue>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

function makeActionsRenderer(router: ReturnType<typeof useRouter>) {
  return (p: ICellRendererParams<InvInternalIssue>) => {
    const row = p.data;
    if (!row?.interIssueId) return null;
    return (
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0"
        title="Edit"
        onClick={() =>
          router.push(
            `/inventory-management/internal-item-issue/edit?id=${row.interIssueId}`,
          )
        }
      >
        <PencilIcon className="h-3.5 w-3.5" />
      </Button>
    );
  };
}

export default function InternalItemIssuePage() {
  const router = useRouter();

  const { data: rows, isLoading } = useCrudList<InvInternalIssue>({
    queryKey: QK.invInternalIssues.list(),
    queryFn: listInvInternalIssues,
  });

  const columnDefs = useMemo<ColDef<InvInternalIssue>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.internalIssueNo,
      { ...COL_DEFS.issueDate, cellRenderer: dateRenderer },
      COL_DEFS.storeCode,
      COL_DEFS.toEmpName,
      { ...COL_DEFS.quantity, cellRenderer: quantityRenderer },
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(router) },
    ],
    [router],
  );

  return (
    <ListPage
      title="Internal Issue"
      rowData={rows}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        pdfDocumentTitle: "Internal Issue",
      }}
      toolbarTrailing={
        <Button
          size="sm"
          onClick={() =>
            router.push("/inventory-management/internal-item-issue/add")
          }
        >
          <PlusIcon className="h-4 w-4 mr-1" />
          Add Internal Issue
        </Button>
      }
    />
  );
}
