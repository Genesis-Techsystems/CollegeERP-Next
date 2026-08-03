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

export type LibraryGridQueryResult =
  | LibraryRow[]
  | { rows: LibraryRow[]; totalCount?: number; page?: number };

export type LibraryGridPageProps = {
  title: string;
  queryKey: readonly unknown[];
  queryFn: () => Promise<LibraryGridQueryResult>;
  columns: ColDef<LibraryRow>[];
  enabled?: boolean;
  searchPlaceholder?: string;
  pdfDocumentTitle?: string;
  headerAction?: ReactNode;
  toolbarTrailing?: ReactNode;
  /** Rendered below the grid when rows are present (e.g. Angular footer actions). */
  tableFooter?: ReactNode;
  showHeaderCard?: boolean;
  /** Table card title; defaults to `title` when header card is hidden. */
  tableTitle?: string;
  /** Pass `""` to hide the default column-filter hint. */
  subtitle?: string;
  emptyMessage?: string;
  /** When true, always render the grid (even with 0 rows). Default false. */
  alwaysShowTable?: boolean;
  paginationPageSize?: number;
  /** Angular server-side page index (0-based). */
  serverSide?: boolean;
  totalCount?: number;
  currentPage?: number;
  onPageChange?: (page: number, pageSize: number) => void;
};

const SI_NO: ColDef<LibraryRow> = {
  headerName: "SI.No",
  valueGetter: rowIndexGetter,
  width: 70,
  flex: 0,
};

function normalizeQueryResult(data: LibraryGridQueryResult | undefined): {
  rows: LibraryRow[];
  totalCount: number;
} {
  if (!data) return { rows: [], totalCount: 0 };
  if (Array.isArray(data)) return { rows: data, totalCount: data.length };
  const rows = Array.isArray(data.rows) ? data.rows : [];
  return {
    rows,
    totalCount: Number(data.totalCount ?? rows.length) || 0,
  };
}

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
  tableFooter,
  showHeaderCard = true,
  tableTitle,
  subtitle,
  emptyMessage = "No records found.",
  alwaysShowTable = false,
  paginationPageSize = 25,
  serverSide = false,
  totalCount: totalCountProp,
  currentPage,
  onPageChange,
}: Readonly<LibraryGridPageProps>) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey,
    queryFn,
    enabled,
  });

  const { rows, totalCount: queryTotalCount } = normalizeQueryResult(data);
  const totalCount = totalCountProp ?? queryTotalCount;
  const columnDefs = useMemo(() => [SI_NO, ...columns], [columns]);
  const showEmpty =
    !alwaysShowTable &&
    !isLoading &&
    rows.length === 0 &&
    (!serverSide || totalCount === 0);

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
      ) : showEmpty ? (
        <div className="app-card overflow-hidden bg-card">
          {!showHeaderCard ? (
            <div className="px-5 pt-5 pb-3">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                {tableTitle ?? title}
              </h2>
            </div>
          ) : null}
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </p>
        </div>
      ) : (
        <TableCard withHeaderBorder={false}>
          <DataTable
            title={showHeaderCard ? undefined : (tableTitle ?? title)}
            subtitle={subtitle}
            rowData={rows}
            columnDefs={columnDefs}
            loading={isLoading}
            pagination
            paginationPageSize={paginationPageSize}
            serverSide={serverSide}
            totalCount={totalCount}
            currentPage={currentPage}
            onPageChange={onPageChange}
            toolbar={{
              search: true,
              searchPlaceholder,
              pdfDocumentTitle: pdfDocumentTitle ?? title,
            }}
            toolbarTrailing={toolbarTrailing}
          />
          {tableFooter && rows.length > 0 ? (
            <div className="flex justify-end border-t px-5 py-3">
              {tableFooter}
            </div>
          ) : null}
        </TableCard>
      )}
    </LibraryScreenShell>
  );
}
