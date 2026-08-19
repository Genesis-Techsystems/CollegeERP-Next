"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format, isValid, parseISO } from "date-fns";
import { EyeIcon, PencilIcon, PlusIcon } from "lucide-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { useQuery } from "@tanstack/react-query";
import { ListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useSessionContext } from "@/context/SessionContext";
import { useLoginEmployeeId } from "@/hooks/useLoginEmployeeId";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import { listInternalIndents } from "@/services";
import type { InvInternalIndentRow } from "@/types/e-office";
import { ViewItemRequestDialog } from "./_components/ViewItemRequestDialog";

/** Angular list: `indentDate | date: 'dd MMM, y'` */
function formatListIndentDate(value?: string | null): string {
  if (!value) return "";
  const d = parseISO(value.includes("T") ? value : `${value}T00:00:00`);
  if (!isValid(d)) {
    const fallback = new Date(value);
    return isValid(fallback) ? format(fallback, "dd MMM, yyyy") : String(value);
  }
  return format(d, "dd MMM, yyyy");
}

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<InvInternalIndentRow>,
  indentNo: {
    field: "internalIndNo",
    headerName: "Indent No",
    minWidth: 120,
  } as ColDef<InvInternalIndentRow>,
  indentDate: {
    field: "indentDate",
    headerName: "Indent Date",
    minWidth: 120,
    valueFormatter: (p) => formatListIndentDate(p.value),
  } as ColDef<InvInternalIndentRow>,
  purpose: {
    field: "purpose",
    headerName: "Purpose",
    minWidth: 140,
    flex: 1,
  } as ColDef<InvInternalIndentRow>,
  status: {
    field: "internalIndWfStageName",
    headerName: "Status",
    minWidth: 120,
  } as ColDef<InvInternalIndentRow>,
  actions: {
    headerName: "Actions",
    minWidth: 100,
    flex: 0,
    width: 100,
  } as ColDef<InvInternalIndentRow>,
};

export default function ItemRequestPage() {
  const router = useRouter();
  const { user, isLoading: sessionLoading } = useSessionContext();
  const { employeeId } = useLoginEmployeeId(user, sessionLoading);
  const [viewRow, setViewRow] = useState<InvInternalIndentRow | null>(null);

  const isAdmin =
    user?.isAdmin ||
    user?.userRole === "ADMIN" ||
    user?.userRole === "SUPERADMIN";

  const { data: allRows = [], isLoading } = useQuery({
    queryKey: QK.eOffice.internalIndents(),
    queryFn: listInternalIndents,
  });

  const rows = useMemo(() => {
    if (isAdmin) return allRows;
    if (!employeeId) return [];
    return allRows.filter((r) => r.indentRaisedEmpId === employeeId);
  }, [allRows, isAdmin, employeeId]);

  const columnDefs = useMemo<ColDef<InvInternalIndentRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.indentNo,
      COL_DEFS.indentDate,
      COL_DEFS.purpose,
      COL_DEFS.status,
      {
        ...COL_DEFS.actions,
        cellRenderer: (p: ICellRendererParams<InvInternalIndentRow>) => {
          const row = p.data;
          if (!row) return null;
          return (
            <div className="flex items-center gap-0.5">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                aria-label="View indent"
                onClick={() => setViewRow(row)}
              >
                <EyeIcon className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                aria-label="Edit indent"
                onClick={() => {
                  const params = new URLSearchParams({
                    indentId: String(row.internalIndId ?? ""),
                  });
                  router.push(
                    `/e-office/item-request/item-request-edit?${params}`,
                  );
                }}
              >
                <PencilIcon className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        },
      },
    ],
    [router],
  );

  return (
    <ListPage
      title="Item Request"
      rowData={rows}
      columnDefs={columnDefs}
      loading={isLoading || sessionLoading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search indents…",
        pdfDocumentTitle: "Internal Requisitions",
        exportExcel: false,
        exportPdf: false,
      }}
      toolbarTrailing={
        <Button
          size="sm"
          className="h-[30px] px-3 text-[12px]"
          onClick={() => router.push("/e-office/item-request/add")}
        >
          <PlusIcon className="h-3.5 w-3.5 mr-1.5" />
          New Internal Indent
        </Button>
      }
    >
      <ViewItemRequestDialog
        open={Boolean(viewRow)}
        onClose={() => setViewRow(null)}
        row={viewRow}
      />
    </ListPage>
  );
}
