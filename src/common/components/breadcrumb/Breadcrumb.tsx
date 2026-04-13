import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BreadcrumbItem {
  /** Display text for this breadcrumb segment. */
  label: string
  /**
   * Navigation target. When omitted (always the case for the last item) the
   * segment is rendered as non-interactive current-page text.
   */
  href?: string
}

export interface BreadcrumbProps {
  /** Ordered list of breadcrumb segments; the last item is the current page. */
  items: BreadcrumbItem[]
  /**
   * When set and `items.length > maxItems`, collapses the middle items into
   * an ellipsis "..." placeholder, always preserving the first item and the
   * last 2 items.
   */
  maxItems?: number
  /** Additional CSS classes for the outer nav element. */
  className?: string
}

/**
 * Returns the subset of items to render when collapsing is active.
 *
 * Strategy: keep index 0 (first item), inject a sentinel, then keep the last
 * two items.  A sentinel object with `label: '...'` and no `href` is inserted
 * at position 1 so the render loop can identify it via the absence of `href`
 * combined with the special label value.
 */
function collapseItems(items: BreadcrumbItem[]): BreadcrumbItem[] {
  const head = items.slice(0, 1)
  const tail = items.slice(-2)
  return [...head, { label: '...' }, ...tail]
}

/**
 * Breadcrumb navigation bar — canonical kit replacement.
 *
 * Improvements over src/common/components/breadcrumb/Breadcrumb.tsx:
 *   - `maxItems` prop collapses long paths into first + … + last-2
 *   - Separator lives inside each `<li>` so focus order is clean
 *   - Proper `aria-current="page"` on the active segment only
 *   - `aria-label="more items"` on the ellipsis span
 */
export function Breadcrumb({ items, maxItems, className }: BreadcrumbProps) {
  const shouldCollapse =
    maxItems !== undefined && items.length > maxItems

  const visibleItems: BreadcrumbItem[] = shouldCollapse
    ? collapseItems(items)
    : items

  return (
    <nav aria-label="Breadcrumb" className={cn(className)}>
      <ol className="flex items-center flex-wrap gap-0.5 text-[10px] leading-5">
        {visibleItems.map((item, index) => {
          const isFirst = index === 0
          const isEllipsis = item.label === '...' && item.href === undefined && shouldCollapse
          const isLast = index === visibleItems.length - 1

          return (
            <li key={index} className="flex items-center">
              {/* Separator — omit before the very first item */}
              {!isFirst && (
                <ChevronRight
                  className="h-3.5 w-3.5 mx-1 text-muted-foreground shrink-0"
                  aria-hidden="true"
                />
              )}

              {isEllipsis ? (
                <span
                  className="text-muted-foreground select-none"
                  aria-label="more items"
                >
                  &hellip;
                </span>
              ) : isLast || !item.href ? (
                <span
                  className={cn(
                    'font-medium',
                    isLast ? 'text-foreground' : 'text-muted-foreground',
                  )}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
