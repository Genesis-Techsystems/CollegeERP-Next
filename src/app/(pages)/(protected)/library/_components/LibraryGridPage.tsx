"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColDef } from "ag-grid-community";
import { DataTable, TableCard } from "@/common/components/table";
import { EmptyState } from "@/common/components/feedback";
import { getErrorMessage } from "@/lib/errors";
import { rowIndexGetter } from "@/lib/utils";
import type { LibraryRow } from "@/services";
import { LibraryScreenShell } from "./LibraryScreenShell";

export type LibraryGridPageProps = {
  title: string;
  queryKey: readonly unknown[];
  queryFn: () => Promise<LibraryRow[]>;
  columns: ColDef<LibraryRow>[];
  enabled?: boolean;
  searchPlaceholder?: string;
  pdfDocumentTitle?: string;
  headerAction?: ReactNode;
  toolbarTrailing?: ReactNode;
  showHeaderCard?: boolean;
  emptyMessage?: string;
};

const SI_NO: ColDef<LibraryRow> = {
  headerName: "SI.No",
  valueGetter: rowIndexGetter,
  width: 70,
  flex: 0,
};

export function LibraryGridPage({
  title,
  queryKey,
  queryFn,
  columns,
  enabled = true,
  searchPlaceholder = "Search…",
  pdfDocumentTitle,
  headerAction,
  toolbarTrailing,
  showHeaderCard = true,
  emptyMessage = "No records found.",
}: Readonly<LibraryGridPageProps>) {
  const {
    data: rows = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn,
    enabled,
  });

  const columnDefs = useMemo(() => [SI_NO, ...columns], [columns]);

  return (
    <LibraryScreenShell
      title={title}
      action={headerAction}
      showHeader={showHeaderCard}
    >
      {isError ? (
        <EmptyState
          title={`Could not load ${title.toLowerCase()}`}
          description={getErrorMessage(error)}
          action={{ label: "Retry", onClick: () => void refetch() }}
        />
      ) : (
        <TableCard withHeaderBorder={false}>
          <DataTable
            title={showHeaderCard ? undefined : title}
            rowData={rows}
            columnDefs={columnDefs}
            loading={isLoading}
            pagination
            toolbar={{
              search: true,
              searchPlaceholder,
              pdfDocumentTitle: pdfDocumentTitle ?? title,
            }}
            toolbarTrailing={toolbarTrailing}
          />
          {!isLoading && rows.length === 0 ? (
            <p className="border-t px-4 py-6 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </p>
          ) : null}
        </TableCard>
      )}
    </LibraryScreenShell>
  );
}
