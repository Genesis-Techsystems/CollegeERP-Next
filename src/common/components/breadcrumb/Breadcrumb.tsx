import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  /** Display text for this breadcrumb segment. */
  label: string;
  /**
   * Navigation target. When omitted (always the case for the last item) the
   * segment is rendered as non-interactive current-page text.
   */
  href?: string;
}

export interface BreadcrumbProps {
  /** Ordered list of breadcrumb segments; the last item is the current page. */
  items: BreadcrumbItem[];
  /**
   * When set and `items.length > maxItems`, collapses the middle items into
   * an ellipsis "..." placeholder, always preserving the first item and the
   * last 2 items.
   */
  maxItems?: number;
  /** Extra content on the right of the breadcrumb bar (e.g. Angular apps grid). */
  endAction?: ReactNode;
  /** Additional CSS classes for the outer nav element. */
  className?: string;
}

function collapseItems(items: BreadcrumbItem[]): BreadcrumbItem[] {
  const head = items.slice(0, 1);
  const tail = items.slice(-2);
  return [...head, { label: "..." }, ...tail];
}

function isHomeItem(item: BreadcrumbItem, index: number): boolean {
  return index === 0 && item.label === "Home" && Boolean(item.href);
}

/**
 * Angular `.link-header` breadcrumb — Material home + chevron_right separators,
 * navy `#042956` labels, icon color `#1f5fab`.
 */
export function Breadcrumb({
  items,
  maxItems,
  endAction,
  className,
}: BreadcrumbProps) {
  const shouldCollapse = maxItems !== undefined && items.length > maxItems;

  const visibleItems: BreadcrumbItem[] = shouldCollapse
    ? collapseItems(items)
    : items;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("link-header w-full", className)}
    >
      <div className="flex w-full items-center justify-between gap-2">
        <ol className="flex min-w-0 flex-wrap items-center gap-0 text-[13px] leading-5">
          {visibleItems.map((item, index) => {
            const isFirst = index === 0;
            const isEllipsis =
              item.label === "..." && item.href === undefined && shouldCollapse;
            const isLast = index === visibleItems.length - 1;
            const isHome = isHomeItem(item, index);

            return (
              <li key={`${item.label}-${index}`} className="flex items-center">
                {!isFirst && (
                  <span
                    className="material-icons link-header__sep"
                    aria-hidden="true"
                  >
                    chevron_right
                  </span>
                )}

                {isEllipsis ? (
                  <span
                    className="select-none text-[#042956]/60"
                    aria-label="more items"
                  >
                    &hellip;
                  </span>
                ) : isHome ? (
                  <Link
                    href={item.href!}
                    className="inline-flex items-center"
                    aria-label="Home"
                  >
                    <span
                      className="material-icons link-header__home"
                      aria-hidden="true"
                    >
                      home
                    </span>
                  </Link>
                ) : isLast || !item.href ? (
                  <span
                    className={cn(
                      "link-header__label",
                      isLast && "link-header__label--current",
                    )}
                    aria-current={isLast ? "page" : undefined}
                  >
                    {item.label}
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    className="link-header__label hover:underline"
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
        {endAction ? (
          <div className="flex shrink-0 items-center">{endAction}</div>
        ) : null}
      </div>
    </nav>
  );
}
