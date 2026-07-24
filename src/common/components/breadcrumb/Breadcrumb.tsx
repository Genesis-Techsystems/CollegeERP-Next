import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
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
  /** Additional CSS classes for the outer nav element. */
  className?: string;
}

function collapseItems(items: BreadcrumbItem[]): BreadcrumbItem[] {
  const head = items.slice(0, 1);
  const tail = items.slice(-2);
  return [...head, { label: "..." }, ...tail];
}

function isHomeItem(item: BreadcrumbItem, index: number): boolean {
  // Icon for the leading Home crumb — any home href (admin /dashboard or student home).
  return index === 0 && item.label === "Home" && Boolean(item.href);
}

export function Breadcrumb({ items, maxItems, className }: BreadcrumbProps) {
  const shouldCollapse = maxItems !== undefined && items.length > maxItems;

  const visibleItems: BreadcrumbItem[] = shouldCollapse
    ? collapseItems(items)
    : items;

  return (
    <nav aria-label="Breadcrumb" className={cn(className)}>
      <ol className="flex flex-wrap items-center gap-0 text-[13px] leading-5">
        {visibleItems.map((item, index) => {
          const isFirst = index === 0;
          const isEllipsis =
            item.label === "..." && item.href === undefined && shouldCollapse;
          const isLast = index === visibleItems.length - 1;
          const isHome = isHomeItem(item, index);

          return (
            <li key={`${item.label}-${index}`} className="flex items-center">
              {!isFirst && (
                <ChevronRight
                  className="mx-2 h-3.5 w-3.5 shrink-0 text-muted-foreground/70"
                  aria-hidden="true"
                />
              )}

              {isEllipsis ? (
                <span
                  className="select-none text-muted-foreground"
                  aria-label="more items"
                >
                  &hellip;
                </span>
              ) : isHome ? (
                <Link
                  href={item.href!}
                  className="inline-flex items-center text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Home"
                >
                  <Home className="h-4 w-4" aria-hidden="true" />
                </Link>
              ) : isLast || !item.href ? (
                <span
                  className={cn(
                    isLast
                      ? "font-semibold text-[hsl(var(--primary))]"
                      : "font-normal text-muted-foreground",
                  )}
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="font-normal text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
