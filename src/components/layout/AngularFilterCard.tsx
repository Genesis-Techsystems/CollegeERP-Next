"use client";

import { useState, type ReactNode } from "react";
import { Book, ChevronDown, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AngularFilterCardProps {
  title: string;
  children: ReactNode;
  /** Show Angular "Filter" label + funnel (default true). */
  showFilterLabel?: boolean;
  /** Collapsible filter body (default true). */
  collapsible?: boolean;
  defaultOpen?: boolean;
  /** Controlled open state. When set, `onOpenChange` is called on toggle. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Marks this as the page's first card (AppShell page-name CSS hook). */
  pageFirstCard?: boolean;
  className?: string;
}

/**
 * Angular mat-expansion-panel filter card:
 * book icon + title | Filter label, gold underline, then filter fields.
 */
export function AngularFilterCard({
  title,
  children,
  showFilterLabel = true,
  collapsible = true,
  defaultOpen = true,
  open: openProp,
  onOpenChange,
  pageFirstCard = false,
  className,
}: AngularFilterCardProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = openProp ?? internalOpen;
  function setOpen(next: boolean) {
    onOpenChange?.(next);
    if (openProp === undefined) setInternalOpen(next);
  }

  return (
    <div
      className={cn("app-card angular-filter-card overflow-hidden", className)}
      data-filters-collapsed={open ? "false" : "true"}
      {...(pageFirstCard ? { "data-page-first-card": "" } : {})}
      // AppShell may stamp data-page-first-card on streamed HTML before hydrate.
      suppressHydrationWarning
    >
      <div className="angular-filter-card__header">
        {collapsible ? (
          <button
            type="button"
            className="angular-filter-card__title-btn"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-label={`Toggle ${title} filters`}
          >
            <span className="app-card-title">
              <span className="material-icons app-card-title__icon" aria-hidden>
                book
              </span>
              <span className="app-card-title__text">{title}</span>
            </span>
            {showFilterLabel ? (
              <span className="angular-filter-card__filter-label">
                <span>Filter</span>
                <Filter className="h-4 w-4" aria-hidden />
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    open && "rotate-180",
                  )}
                  aria-hidden
                />
              </span>
            ) : (
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform duration-200",
                  open && "rotate-180",
                )}
                aria-hidden
              />
            )}
          </button>
        ) : (
          <div className="angular-filter-card__title-row">
            <span className="app-card-title">
              <Book
                className="app-card-title__icon h-[18px] w-[18px]"
                aria-hidden
              />
              <span className="app-card-title__text">{title}</span>
            </span>
            {showFilterLabel ? (
              <span className="angular-filter-card__filter-label">
                <span>Filter</span>
                <Filter className="h-4 w-4" aria-hidden />
              </span>
            ) : null}
          </div>
        )}
      </div>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-in-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="angular-filter-card__body">{children}</div>
        </div>
      </div>
    </div>
  );
}

export interface TableContextHeaderProps {
  /** Main label, e.g. "Subjects List". */
  title: string;
  /** Selected filter chips / summary text (university · course, etc.). */
  info?: ReactNode;
  className?: string;
}

/**
 * Angular-style bar above the table toolbar: book icon + title + selected filters.
 */
export function TableContextHeader({
  title,
  info,
  className,
}: TableContextHeaderProps) {
  return (
    <div className={cn("table-context-header", className)}>
      <span className="material-icons table-context-header__icon" aria-hidden>
        book
      </span>
      <strong className="table-context-header__title">{title}</strong>
      {info ? <span className="table-context-header__info">{info}</span> : null}
    </div>
  );
}
