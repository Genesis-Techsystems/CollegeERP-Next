"use client";

import type { ReactNode } from "react";
import type { ColDef } from "ag-grid-community";
import { PageContainer } from "./PageContainer";
import { FilteredPage } from "./FilteredPage";
import { DataTable, type DataTableProps } from "@/common/components/table";
import { usePageNavLabel } from "@/common/components/breadcrumb";
import { cn } from "@/lib/utils";

export interface FilteredListPageProps<T> extends Omit<
  DataTableProps<T>,
  "subtitle" | "bordered" | "rowData" | "columnDefs"
> {
  /** Title shown above filters — defaults to the sidebar menu label when omitted. */
  title?: string;
  /** Filter fields / actions rendered inside the same card as the table. */
  filters: ReactNode;
  /** Optional notice / alert above the card. */
  notice?: ReactNode;
  /**
   * Custom content below filters in the same card (dual lists, editors).
   * When set without column defs, the AG Grid is omitted.
   */
  body?: ReactNode;
  /** Optional className for the body wrapper (e.g. `border-t-0` to hide the separator). */
  bodyClassName?: string;
  /** Modals and other page-level content rendered after the table / body card. */
  children?: ReactNode;
  className?: string;
  rowData?: T[];
  columnDefs?: ColDef<T>[];
}

/**
 * Header + filters + table in **one** card (Grade Setup / Room Details pattern).
 * Filters sit between the title and the search toolbar inside DataTable.
 * Pass `body` (without column defs) for custom non-grid content in the same shell.
 */
export function FilteredListPage<T>({
  title,
  filters,
  notice,
  body,
  bodyClassName,
  children,
  className,
  filtersCollapsible = true,
  filtersDefaultOpen = true,
  rowData,
  columnDefs,
  ...tableProps
}: FilteredListPageProps<T>) {
  const navLabel = usePageNavLabel();
  const displayTitle = navLabel ?? title ?? "Page";
  const hasTable = Array.isArray(columnDefs) && columnDefs.length > 0;

  // Custom-body pages (dual lists, etc.): same chrome, no empty AG Grid.
  if (!hasTable && body !== undefined) {
    return (
      <FilteredPage
        title={displayTitle}
        filters={filters}
        notice={notice}
        body={body}
        bodyClassName={bodyClassName}
        filtersCollapsible={filtersCollapsible}
        filtersDefaultOpen={filtersDefaultOpen}
        className={className}
      >
        {children}
      </FilteredPage>
    );
  }

  return (
    <PageContainer className={cn("space-y-4", className)}>
      {notice}
      <DataTable
        title={displayTitle}
        subtitle=""
        bordered
        filters={filters}
        filtersCollapsible={filtersCollapsible}
        filtersDefaultOpen={filtersDefaultOpen}
        rowData={rowData ?? []}
        columnDefs={columnDefs ?? []}
        {...tableProps}
      />
      {body}
      {children}
    </PageContainer>
  );
}
