"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { PencilIcon } from "lucide-react";
import { StatusBadge } from "@/common/components/data-display";
import { ListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { QK } from "@/lib/query-keys";
import { toastError } from "@/lib/toast";
import { rowIndexGetter } from "@/lib/utils";
import {
  listPeriodicalDetailsByPeriodicalId,
  type LibraryRow,
} from "@/services";
import { EditPeriodicalDetailModal } from "./_components/EditPeriodicalDetailModal";

const COL_DEFS = {
  siNo: {
    headerName: "No.",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<LibraryRow>,
  volume: {
    field: "volume",
    headerName: "Volume",
    minWidth: 110,
  } as ColDef<LibraryRow>,
  srNo: {
    field: "srNo",
    headerName: "Serial Number",
    minWidth: 130,
  } as ColDef<LibraryRow>,
  shelveCode: {
    field: "shelveCode",
    headerName: "Rack",
    minWidth: 120,
  } as ColDef<LibraryRow>,
  isActive: {
    field: "isActive",
    headerName: "Status",
    minWidth: 100,
    flex: 0,
  } as ColDef<LibraryRow>,
  actions: {
    headerName: "Actions",
    minWidth: 90,
    width: 90,
    flex: 0,
    sortable: false,
  } as ColDef<LibraryRow>,
};

function statusRenderer(p: ICellRendererParams<LibraryRow>) {
  return <StatusBadge status={Boolean(p.data?.isActive)} />;
}

function makeActionsRenderer(onEdit: (row: LibraryRow) => void) {
  return (p: ICellRendererParams<LibraryRow>) => {
    const row = p.data;
    if (!row) return null;
    return (
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0"
        type="button"
        aria-label="Edit periodical detail"
        onClick={() => onEdit(row)}
      >
        <PencilIcon className="h-3.5 w-3.5" />
      </Button>
    );
  };
}

export default function PeriodicalDetailsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const periodicalId = Number(searchParams.get("periodicalId") ?? 0);

  const [editRow, setEditRow] = useState<LibraryRow | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const {
    data: rows = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: QK.library.periodicalDetails(periodicalId),
    queryFn: () => listPeriodicalDetailsByPeriodicalId(periodicalId),
    enabled: periodicalId > 0,
  });

  useEffect(() => {
    if (isError && error) {
      toastError(error, "Failed to load periodical details");
    }
  }, [isError, error]);

  const columnDefs = useMemo<ColDef<LibraryRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.volume,
      COL_DEFS.srNo,
      COL_DEFS.shelveCode,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      {
        ...COL_DEFS.actions,
        cellRenderer: makeActionsRenderer((row) => {
          setEditRow(row);
          setEditOpen(true);
        }),
      },
    ],
    [],
  );

  return (
    <ListPage
      title="Periodical Details"
      rowData={Array.isArray(rows) ? rows : []}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      height="auto"
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        pdfDocumentTitle: "Periodical Details",
      }}
    >
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-[30px] px-3 text-[12px]"
          onClick={() => router.back()}
        >
          Back
        </Button>
      </div>
      <EditPeriodicalDetailModal
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setEditRow(null);
        }}
        row={editRow}
        onSaved={() => {
          void queryClient.invalidateQueries({
            queryKey: QK.library.periodicalDetails(periodicalId),
          });
        }}
      />
    </ListPage>
  );
}
