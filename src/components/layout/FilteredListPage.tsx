'use client'

import type { ReactNode } from 'react'
import { PageContainer } from './PageContainer'
import { DataTable, type DataTableProps } from '@/common/components/table'
import { usePageNavLabel } from '@/common/components/breadcrumb'
import { cn } from '@/lib/utils'

export interface FilteredListPageProps<T> extends Omit<
  DataTableProps<T>,
  'subtitle' | 'bordered'
> {
  /** Title shown above filters — defaults to the sidebar menu label when omitted. */
  title?: string
  /** Filter fields / actions rendered inside the same card as the table. */
  filters: ReactNode
  /** Optional notice / alert above the card. */
  notice?: ReactNode
  /** Modals and other page-level content rendered after the table. */
  children?: ReactNode
  className?: string
}

/**
 * Header + filters + table in **one** card (Grade Setup / Room Details pattern).
 * Filters sit between the title and the search toolbar inside DataTable.
 */
export function FilteredListPage<T>({
  title,
  filters,
  notice,
  children,
  className,
  filtersCollapsible = true,
  filtersDefaultOpen = true,
  ...tableProps
}: FilteredListPageProps<T>) {
  const navLabel = usePageNavLabel()
  const displayTitle = navLabel ?? title ?? 'Page'

  return (
    <PageContainer className={cn('space-y-4', className)}>
      {notice}
      <DataTable
        title={displayTitle}
        subtitle=""
        bordered
        filters={filters}
        filtersCollapsible={filtersCollapsible}
        filtersDefaultOpen={filtersDefaultOpen}
        {...tableProps}
      />
      {children}
    </PageContainer>
  )
}
