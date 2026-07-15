'use client'

import { useState, type ReactNode } from 'react'
import { ChevronDown, Filter } from 'lucide-react'
import { PageContainer } from './PageContainer'
import { cn } from '@/lib/utils'

export interface FilteredPageProps {
  /** Single page title (shown in the filter card; no separate PageHeader). */
  title: string
  /** Filter fields rendered inside the card under the title. */
  filters: ReactNode
  /** Optional notice / alert above the card. */
  notice?: ReactNode
  /**
   * Optional content rendered inside the same card below the filters
   * (custom grids, dual lists, editors — when there is no AG Grid DataTable).
   */
  body?: ReactNode
  /** Secondary panels, modals, or extra cards rendered after the filter card. */
  children?: ReactNode
  filtersCollapsible?: boolean
  filtersDefaultOpen?: boolean
  className?: string
}

/**
 * Title + filters in one card (same chrome as FilteredListPage / DataTable),
 * for pages that use custom content instead of AG Grid.
 */
export function FilteredPage({
  title,
  filters,
  notice,
  body,
  children,
  filtersCollapsible = true,
  filtersDefaultOpen = true,
  className,
}: FilteredPageProps) {
  const [filtersOpen, setFiltersOpen] = useState(filtersDefaultOpen)

  return (
    <PageContainer className={cn('space-y-4', className)}>
      {notice}
      <div className="app-data-table app-data-table-card flex flex-col">
        <div
          className={cn(
            'app-data-table-heading px-5',
            filtersOpen ? 'pt-5 pb-0' : 'pt-5 pb-3',
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              {filtersCollapsible ? (
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 text-left"
                  onClick={() => setFiltersOpen(!filtersOpen)}
                  aria-expanded={filtersOpen}
                  aria-label="Toggle filters"
                >
                  <h2 className="text-lg font-semibold tracking-tight text-foreground">
                    {title}
                  </h2>
                  <span className="inline-flex shrink-0 items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
                    <Filter className="h-3.5 w-3.5" aria-hidden />
                    <ChevronDown
                      className={cn(
                        'h-3.5 w-3.5 transition-transform duration-300',
                        filtersOpen && 'rotate-180',
                      )}
                      aria-hidden
                    />
                  </span>
                </button>
              ) : (
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  {title}
                </h2>
              )}
            </div>
          </div>
        </div>

        <div
          className={cn(
            'grid transition-[grid-template-rows] duration-300 ease-in-out',
            filtersOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
          )}
        >
          <div
            className={cn(
              'min-h-0',
              filtersOpen ? 'overflow-visible' : 'overflow-hidden',
            )}
          >
            <div className="global-filter-bar__inner px-5 pb-3 [&_.global-filter-bar__inner]:!pt-0">
              {filters}
            </div>
          </div>
        </div>

        {body ? <div className="border-t border-border px-5 py-4">{body}</div> : null}
      </div>
      {children}
    </PageContainer>
  )
}
