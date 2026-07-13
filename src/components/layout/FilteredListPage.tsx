'use client'

import type { ReactNode } from 'react'
import { PageContainer } from './PageContainer'
import { DataTable, type DataTableProps } from '@/common/components/table'
import { cn } from '@/lib/utils'

export interface FilteredListPageProps<T> extends Omit<
  DataTableProps<T>,
  'subtitle' | 'bordered'
> {
  /** Title shown above filters inside the table card. */
  title: string
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
  return (
    <PageContainer className={cn('space-y-4', className)}>
      {notice}
      <DataTable
        title={title}
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
