"use client";

import type { ReactNode } from "react";
import { PageContainer } from "./PageContainer";
import { DataTable, type DataTableProps } from "@/common/components/table";
import { usePageNavLabel } from "@/common/components/breadcrumb";
import { cn } from "@/lib/utils";

export interface ListPageProps<T> extends Omit<
  DataTableProps<T>,
  "title" | "subtitle" | "bordered"
> {
  /** Page / table card title — defaults to the sidebar menu label when omitted. */
  title?: string;
  /** Optional notice / alert above the table card. */
  notice?: ReactNode;
  /** Empty-state UI when there is no data and not loading (replaces the table). */
  emptyState?: ReactNode;
  /** Modals and other page-level content rendered after the table. */
  children?: ReactNode;
  className?: string;
}

/**
 * Header + table list layout (Organizations pattern).
 * Renders a bordered DataTable with title — no page subtitle, no filter card.
 */
export function ListPage<T>({
  title,
  notice,
  emptyState,
  children,
  className,
  loading,
  rowData,
  ...tableProps
}: ListPageProps<T>) {
  const navLabel = usePageNavLabel();
  const displayTitle = title ?? navLabel ?? "Page";
  const showEmpty =
    Boolean(emptyState) && !loading && (!rowData || rowData.length === 0);

  return (
    <PageContainer className={cn("space-y-4", className)}>
      {notice}
      {showEmpty ? (
        emptyState
      ) : (
        <DataTable
          title={displayTitle}
          subtitle=""
          bordered
          loading={loading}
          rowData={rowData}
          {...tableProps}
        />
      )}
      {children}
    </PageContainer>
  );
}
