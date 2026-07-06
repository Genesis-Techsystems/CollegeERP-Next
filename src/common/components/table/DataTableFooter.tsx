'use client'

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const
export type DataTablePageSize = (typeof PAGE_SIZE_OPTIONS)[number]

export interface DataTableFooterProps {
  totalRows: number
  page: number
  pageSize: DataTablePageSize
  totalPages: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: DataTablePageSize) => void
}

export function DataTableFooter({
  totalRows,
  page,
  pageSize,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: DataTableFooterProps) {
  const rangeStart = totalRows === 0 ? 0 : page * pageSize + 1
  const rangeEnd = Math.min((page + 1) * pageSize, totalRows)

  return (
    <div className="app-data-table-footer flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-2.5 text-[12px] text-muted-foreground">
      <div className="flex items-center gap-2">
        <span className="whitespace-nowrap">Rows per page:</span>
        <select
          aria-label="Rows per page"
          className="app-data-table-page-size h-8 min-w-[4.5rem] rounded-md border border-input bg-background px-2 text-[12px] text-foreground"
          value={String(pageSize)}
          onChange={(e) => onPageSizeChange(Number(e.target.value) as DataTablePageSize)}
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={String(size)}>
              {size}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="whitespace-nowrap tabular-nums">
          {totalRows === 0 ? '0-0 of 0' : `${rangeStart}-${rangeEnd} of ${totalRows}`}
        </span>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 w-8 rounded-md p-0"
            onClick={() => onPageChange(0)}
            disabled={page <= 0}
            aria-label="First page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 w-8 rounded-md p-0"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 0}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[5.5rem] whitespace-nowrap px-1 text-center tabular-nums text-foreground">
            Page {totalRows === 0 ? 0 : page + 1} / {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 w-8 rounded-md p-0"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages - 1}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 w-8 rounded-md p-0"
            onClick={() => onPageChange(totalPages - 1)}
            disabled={page >= totalPages - 1}
            aria-label="Last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
