"use client";

import type { ReactNode } from "react";
import { PageContainer } from "./PageContainer";
import { AngularFilterCard } from "./AngularFilterCard";
import { usePageNavLabel } from "@/common/components/breadcrumb";
import { cn } from "@/lib/utils";

export interface FilteredPageProps {
  /** Single page title — defaults to the sidebar menu label when omitted. */
  title?: string;
  /** Filter fields rendered in a separate card under the title. */
  filters: ReactNode;
  /** Optional notice / alert above the cards. */
  notice?: ReactNode;
  /**
   * Content in a separate card below the filters
   * (custom grids, dual lists, editors — when there is no AG Grid DataTable).
   */
  body?: ReactNode;
  /** Optional className for the body card wrapper. */
  bodyClassName?: string;
  /**
   * Optional bar at the top of the body card (book icon + title + filter info).
   * Pass `null` to hide. Default: page title.
   */
  tableHeader?: ReactNode | null;
  /** Secondary panels, modals, or extra cards rendered after the cards. */
  children?: ReactNode;
  filtersCollapsible?: boolean;
  filtersDefaultOpen?: boolean;
  className?: string;
}

/**
 * Angular-style layout: filter card + separate body card (no AG Grid).
 */
export function FilteredPage({
  title,
  filters,
  notice,
  body,
  bodyClassName,
  tableHeader,
  children,
  filtersCollapsible = true,
  filtersDefaultOpen = true,
  className,
}: FilteredPageProps) {
  const navLabel = usePageNavLabel();
  const displayTitle = title === "" ? "" : (title ?? navLabel ?? "Page");

  const resolvedTableHeader =
    tableHeader === null
      ? null
      : (tableHeader ??
        (displayTitle ? (
          <div className="table-context-header">
            <span
              className="material-icons table-context-header__icon"
              aria-hidden
            >
              book
            </span>
            <strong className="table-context-header__title">
              {displayTitle}
            </strong>
          </div>
        ) : null));

  return (
    <PageContainer className={cn("space-y-4", className)}>
      {notice}
      {displayTitle ? (
        <AngularFilterCard
          title={displayTitle}
          collapsible={filtersCollapsible}
          defaultOpen={filtersDefaultOpen}
        >
          {filters}
        </AngularFilterCard>
      ) : (
        <div className="app-card angular-filter-card overflow-hidden p-4">
          {filters}
        </div>
      )}

      {body ? (
        <div
          className={cn(
            "app-card app-data-table-card overflow-hidden",
            bodyClassName,
          )}
        >
          {resolvedTableHeader ? (
            <div className="px-5 pt-2">{resolvedTableHeader}</div>
          ) : null}
          <div className={cn(resolvedTableHeader ? "px-5 pb-4" : "p-4")}>
            {body}
          </div>
        </div>
      ) : null}
      {children}
    </PageContainer>
  );
}
