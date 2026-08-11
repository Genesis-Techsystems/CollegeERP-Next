"use client";

import type { ReactNode } from "react";
import type { ColDef, ColGroupDef } from "ag-grid-community";
import { PageContainer } from "./PageContainer";
import { AngularFilterCard } from "./AngularFilterCard";
import { DataTable, type DataTableProps } from "@/common/components/table";
import { usePageNavLabel } from "@/common/components/breadcrumb";
import { cn } from "@/lib/utils";

export interface FilteredListPageProps<T> extends Omit<
  DataTableProps<T>,
  "subtitle" | "bordered" | "rowData" | "columnDefs"
> {
  /** Title shown on the filter card — defaults to the sidebar menu label when omitted. */
  title?: string;
  /** Optional subtitle below the title (e.g. selected committee / exam / subject heading). */
  subtitle?: string;
  /** Filter fields / actions (rendered in a separate card above the table). */
  filters: ReactNode;
  /**
   * Angular pattern: filter card and table card are separate.
   * Default `true`. Pass `false` only to force the old single-card layout.
   */
  filtersSeparated?: boolean;
  /**
   * Optional bar above the table toolbar (book icon + title + selected filter info).
   * When omitted, a default header with the page title is shown.
   * Pass `null` to hide it.
   */
  tableHeader?: ReactNode | null;
  /**
   * Hide the table card until true (Angular `*ngIf` on course/filters).
   * Default true.
   */
  showTable?: boolean;
  /** Optional content rendered below filters inside the filter card. */
  filtersFooter?: ReactNode;
  /** Optional notice / alert above the cards. */
  notice?: ReactNode;
  /**
   * Custom content in a separate card below filters (when there is no AG Grid).
   */
  body?: ReactNode;
  /** Optional className for the body card wrapper. */
  bodyClassName?: string;
  /** Modals and other page-level content rendered after the cards. */
  children?: ReactNode;
  className?: string;
  rowData?: T[];
  columnDefs?: (ColDef<T> | ColGroupDef<T>)[];
}

/**
 * Angular-style layout: filter card + separate table/body card (app-wide default).
 */
export function FilteredListPage<T>({
  title,
  subtitle,
  filters,
  filtersSeparated = true,
  tableHeader,
  showTable = true,
  filtersFooter,
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
  const displayTitle = title ?? navLabel ?? "Page";
  const hasTable = Array.isArray(columnDefs) && columnDefs.length > 0;

  const filterCard = (
    <AngularFilterCard
      title={displayTitle}
      collapsible={filtersCollapsible}
      defaultOpen={filtersDefaultOpen}
    >
      {filters}
      {filtersFooter}
    </AngularFilterCard>
  );

  // Separated layout (default) — Angular Subject Master pattern
  if (filtersSeparated) {
    const resolvedTableHeader =
      tableHeader === null
        ? null
        : (tableHeader ?? (
            // Default context bar: book + page title (pages can override via tableHeader)
            <DefaultTableHeader title={displayTitle} />
          ));

    return (
      <PageContainer className={cn("space-y-4", className)}>
        {notice}
        {filterCard}

        {showTable && hasTable ? (
          <DataTable
            title=""
            subtitle=""
            bordered
            filters={undefined}
            filtersFooter={resolvedTableHeader}
            rowData={rowData ?? []}
            columnDefs={columnDefs ?? []}
            {...tableProps}
          />
        ) : null}

        {!hasTable && body !== undefined ? (
          <div
            className={cn(
              "app-card app-data-table-card overflow-hidden p-4",
              bodyClassName,
            )}
          >
            {resolvedTableHeader}
            {body}
          </div>
        ) : (
          body
        )}

        {children}
      </PageContainer>
    );
  }

  // Legacy single-card layout (opt-in via filtersSeparated={false})
  if (!hasTable && body !== undefined) {
    return (
      <PageContainer className={cn("space-y-4", className)}>
        {notice}
        {filterCard}
        <div
          className={cn(
            "app-card app-data-table-card overflow-hidden p-4",
            bodyClassName,
          )}
        >
          {body}
        </div>
        {children}
      </PageContainer>
    );
  }

  return (
    <PageContainer className={cn("space-y-4", className)}>
      {notice}
      <DataTable
        title={displayTitle}
        subtitle={subtitle ?? ""}
        bordered
        filters={filters}
        filtersFooter={filtersFooter}
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

function DefaultTableHeader({ title }: { title: string }) {
  // Lazy import avoided — keep markup inline to match TableContextHeader styles
  return (
    <div className="table-context-header">
      <span className="material-icons table-context-header__icon" aria-hidden>
        book
      </span>
      <strong className="table-context-header__title">{title}</strong>
    </div>
  );
}
