"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { PlusIcon, PencilIcon } from "lucide-react";
import { StatusBadge } from "@/common/components/data-display";
import { ListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { QK } from "@/lib/query-keys";
import { toastError } from "@/lib/toast";
import { rowIndexGetter } from "@/lib/utils";
import { listLibraryPeriodicals, type LibraryRow } from "@/services";

const COL_DEFS = {
  siNo: {
    headerName: "No.",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<LibraryRow>,
  libraryCode: {
    field: "libraryCode",
    headerName: "Library",
    minWidth: 120,
  } as ColDef<LibraryRow>,
  periodicalName: {
    field: "periodicalName",
    headerName: "Periodical",
    minWidth: 180,
    flex: 1,
  } as ColDef<LibraryRow>,
  periodicalCode: {
    field: "periodicalCode",
    headerName: "Periodical Code",
    minWidth: 140,
  } as ColDef<LibraryRow>,
  isActive: {
    field: "isActive",
    headerName: "Status",
    minWidth: 100,
    flex: 0,
  } as ColDef<LibraryRow>,
  actions: {
    headerName: "Actions",
    minWidth: 220,
    width: 220,
    flex: 0,
    autoHeight: true,
    wrapText: true,
    sortable: false,
  } as ColDef<LibraryRow>,
};

function statusRenderer(p: ICellRendererParams<LibraryRow>) {
  return <StatusBadge status={Boolean(p.data?.isActive)} />;
}

function actionsRenderer(p: ICellRendererParams<LibraryRow>) {
  const row = p.data;
  if (!row?.periodicalId) return null;
  const qs = new URLSearchParams({
    periodicalId: String(row.periodicalId),
  });
  return (
    <div className="flex min-h-[2.5rem] flex-wrap items-center gap-x-2 gap-y-1 py-1 text-[12px] leading-snug">
      <Link
        href={`/library/add-more-periodicals?${qs}`}
        className="shrink-0 whitespace-nowrap text-primary hover:underline"
      >
        Add More Periodicals
      </Link>
      <span className="shrink-0 text-muted-foreground" aria-hidden>
        |
      </span>
      <Button
        asChild
        size="sm"
        variant="ghost"
        className="h-7 w-7 shrink-0 p-0"
        aria-label="Periodical details"
      >
        <Link href={`/library/periodical-details?${qs}`}>
          <PencilIcon className="h-3.5 w-3.5" />
        </Link>
      </Button>
    </div>
  );
}

export default function PeriodicalsPage() {
  const {
    data: rows = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: QK.library.periodicals(),
    queryFn: listLibraryPeriodicals,
  });

  useEffect(() => {
    if (isError && error) {
      toastError(error, "Failed to load periodicals");
    }
  }, [isError, error]);

  const columnDefs = useMemo<ColDef<LibraryRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.libraryCode,
      COL_DEFS.periodicalName,
      COL_DEFS.periodicalCode,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: actionsRenderer },
    ],
    [],
  );

  return (
    <ListPage
      title="Periodicals"
      rowData={Array.isArray(rows) ? rows : []}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      height="auto"
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        pdfDocumentTitle: "Periodicals",
      }}
      toolbarTrailing={
        <Button asChild size="sm" className="h-[30px] px-3 text-[12px]">
          <Link href="/library/add-periodicals">
            <PlusIcon className="mr-1.5 h-3.5 w-3.5" />
            Add Periodicals
          </Link>
        </Button>
      }
    />
  );
}
