"use client";

/**
 * Angular `InternalIndentComponent` parity — Internal Requisitions list.
 */

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
import { listInvInternalIndents } from "@/services";
import type { InvInternalIndentListRow } from "@/types/inventory";
import ViewInternalIndentItemsModal from "./ViewInternalIndentItemsModal";

/**
 * Angular displayedColumns:
 * id, internalIndNo, indentDate, purpose, isActive, actions
 * (Status cell shows internalIndWfStageName)
 */
const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<InvInternalIndentListRow>,
  internalIndNo: {
    field: "internalIndNo",
    headerName: "Indent No",
    minWidth: 120,
    flex: 1,
  } as ColDef<InvInternalIndentListRow>,
  indentDate: {
    headerName: "Indent Date",
    minWidth: 120,
    flex: 0.9,
  } as ColDef<InvInternalIndentListRow>,
  purpose: {
    field: "purpose",
    headerName: "Purpose",
    minWidth: 160,
    flex: 1.2,
  } as ColDef<InvInternalIndentListRow>,
  status: {
    headerName: "Status",
    minWidth: 120,
    flex: 1,
  } as ColDef<InvInternalIndentListRow>,
  actions: {
    headerName: "Actions",
    minWidth: 100,
    width: 100,
    flex: 0,
  } as ColDef<InvInternalIndentListRow>,
};

/** Angular `{{ row.indentDate | date:'dd MMM, y' }}` */
function formatIndentDate(value?: string): string {
  if (!value) return "";
  const d = parseISO(value.includes("T") ? value : `${value}T00:00:00`);
  if (!isValid(d)) {
    const fallback = new Date(value);
    return isValid(fallback) ? format(fallback, "dd MMM, y") : value;
  }
  return format(d, "dd MMM, y");
}

function dateRenderer(p: ICellRendererParams<InvInternalIndentListRow>) {
  return <span>{formatIndentDate(p.data?.indentDate)}</span>;
}

/** Angular Status: `{{ row?.internalIndWfStageName }}` (not Active/Inactive badge) */
function workflowStatusRenderer(
  p: ICellRendererParams<InvInternalIndentListRow>,
) {
  return <span>{p.data?.internalIndWfStageName ?? ""}</span>;
}

function makeActionsRenderer(
  router: ReturnType<typeof useRouter>,
  onView: (row: InvInternalIndentListRow) => void,
) {
  return (p: ICellRendererParams<InvInternalIndentListRow>) => {
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
              `/inventory-management/internal-indent/edit?id=${row.internalIndId}`,
            );
          }}
        >
          <PencilIcon className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  };
}

export default function InternalIndentPage() {
  const router = useRouter();
  const [viewRow, setViewRow] = useState<InvInternalIndentListRow | null>(null);

  const { data: rows, isLoading } = useCrudList<InvInternalIndentListRow>({
    queryKey: QK.invInternalIndents.list(),
    queryFn: listInvInternalIndents,
  });

  const columnDefs = useMemo<ColDef<InvInternalIndentListRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.internalIndNo,
      { ...COL_DEFS.indentDate, cellRenderer: dateRenderer },
      COL_DEFS.purpose,
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
      title="Internal Requisitions"
      rowData={rows}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        pdfDocumentTitle: "Internal Requisitions",
      }}
      toolbarTrailing={
        <Button
          size="sm"
          onClick={() =>
            router.push("/inventory-management/internal-indent/add")
          }
        >
          <PlusIcon className="h-4 w-4 mr-1" />
          New Internal Indent
        </Button>
      }
    >
      <ViewInternalIndentItemsModal
        open={viewRow != null}
        onClose={() => setViewRow(null)}
        data={viewRow}
      />
    </ListPage>
  );
}
