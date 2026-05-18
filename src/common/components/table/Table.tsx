'use client'

import { useState, type CSSProperties } from 'react'
import noImgLogo from '@/assets/images/no-img-logo.png'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ColumnType = 'default' | 'image' | 'status' | 'action' | 'id' | 'eval-status'

export interface TableColumn<T = any> {
  /** Key of the row object to read (matches Angular column.id) */
  id: keyof T | string
  /** Header label displayed in the column */
  label: string
  /** Column width as a percentage */
  width?: number
  /** Render variant for the cell */
  type?: ColumnType
  /** Custom cell renderer; overrides `type` when provided */
  render?: (row: T, index: number) => React.ReactNode
}

export interface TableProps<T = any> {
  /** Data rows to display */
  rows: T[]
  /** Column definitions — mirrors Angular tableColumns + displayedColumns */
  columns: TableColumn<T>[]
  /** Optional title rendered above the table */
  title?: string
  /** Show loading skeleton rows */
  loading?: boolean
  /** Message shown when rows is empty */
  emptyText?: string
  /** Fired when a row is clicked */
  onRowClick?: (row: T) => void
  /** Number of rows per page (0 = disable pagination) */
  pageSize?: number
  /** Tighter row/header padding (e.g. dense exam lists) */
  density?: 'default' | 'compact'
  /** Extra CSS class for the wrapping element */
  className?: string
  /** No outer border/radius — use inside `TableCard` / `app-card` (matches DataTable shell) */
  embedded?: boolean
  /** Optional class for the title element */
  titleClassName?: string
  /** Optional inline style for the title element */
  titleStyle?: CSSProperties
  /** Optional class for the empty-state cell (replaces default muted styling when set) */
  emptyTextClassName?: string
  /** Optional inline style for the empty-state cell */
  emptyTextStyle?: CSSProperties
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        active
          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      )}
    >
      {active ? 'Active' : 'Inactive'}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DATE_COLUMNS = ['answerSheetCheckDate']

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return ' - '
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (value instanceof Date) return value.toLocaleDateString()
  return String(value)
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * Lightweight reusable table that mirrors Angular's TableComponent.
 * Uses native HTML <table> with Tailwind styling — no heavy grid library.
 * Supports column types: default, image, status, action, id, eval-status.
 */
export default function Table<T = any>({
  rows,
  columns,
  title,
  loading = false,
  emptyText = 'No records found.',
  onRowClick,
  pageSize = 10,
  density = 'default',
  className,
  embedded = false,
  titleClassName,
  titleStyle,
  emptyTextClassName,
  emptyTextStyle,
}: TableProps<T>) {
  const [page, setPage] = useState(0)
  const cellPad = density === 'compact' ? 'px-2 py-0.5' : 'px-3 py-1.5'
  const headPad = density === 'compact' ? 'px-2 py-1' : 'px-3 py-2'
  const emptyPad = density === 'compact' ? 'px-2 py-6' : 'px-3 py-8'

  const paginate = pageSize > 0
  const totalPages = paginate ? Math.ceil(rows.length / pageSize) : 1
  const visibleRows = paginate ? rows.slice(page * pageSize, page * pageSize + pageSize) : rows
  const pageOffset = page * pageSize

  function renderCell(col: TableColumn<T>, row: T, localIndex: number): React.ReactNode {
    const globalIndex = pageOffset + localIndex

    // Custom renderer takes priority
    if (col.render) return col.render(row, globalIndex)

    const value = (row as any)[col.id as string]

    switch (col.type) {
      case 'image':
        return (
          <img
            src={(row as any).logoPath ?? value}
            alt="row image"
            className="h-10 w-10 rounded object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = noImgLogo.src
            }}
          />
        )

      case 'status':
        return <StatusBadge active={Boolean((row as any).isActive)} />

      case 'action':
        return (
          <button
            type="button"
            aria-label="Edit"
            onClick={(e) => {
              e.stopPropagation()
              onRowClick?.(row)
            }}
            className="rounded-full p-2 text-info hover:bg-info hover:text-white transition-colors"
            title="Edit"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        )

      case 'id':
        return globalIndex + 1

      case 'eval-status':
        return (
          <span
            className="cursor-pointer rounded-lg px-2 py-1 text-xs font-medium"
            style={{ backgroundColor: value ? '#e0f2fe' : '#fef9c3' }}
            onClick={(e) => {
              e.stopPropagation()
              onRowClick?.(row)
            }}
          >
            {formatValue(value)}
          </span>
        )

      default:
        return DATE_COLUMNS.includes(col.id as string) && value
          ? new Date(value).toLocaleDateString()
          : formatValue(value)
    }
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {title && (
        <h2 className={cn('text-base font-semibold text-foreground', titleClassName)} style={titleStyle}>
          {title}
        </h2>
      )}

      <div
        className={cn(
          'overflow-auto',
          embedded ? 'bg-white' : 'rounded-lg border border-border bg-card',
        )}
      >
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-[var(--color-table-header-bg)]">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.id as string}
                  scope="col"
                  style={col.width ? { width: `${col.width}%` } : undefined}
                  className={cn('app-table-head-cell text-left font-semibold text-foreground', headPad)}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-border">
            {loading ? (
              Array.from({ length: pageSize || 5 }).map((_, i) => (
                <tr key={i}>
                  {columns.map((col) => (
                    <td key={col.id as string} className={cellPad}>
                      <div className="h-3.5 w-3/4 animate-pulse rounded bg-muted" />
                    </td>
                  ))}
                </tr>
              ))
            ) : visibleRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className={cn(
                    'text-center',
                    emptyTextClassName ?? 'text-muted-foreground',
                    emptyTextClassName ? 'py-2' : emptyPad,
                  )}
                  style={emptyTextStyle}
                >
                  {emptyText}
                </td>
              </tr>
            ) : (
              visibleRows.map((row, localIndex) => (
                <tr
                  key={localIndex}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'transition-colors',
                    onRowClick ? 'cursor-pointer hover:bg-muted/30' : 'hover:bg-muted/30'
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.id as string}
                      style={col.width ? { width: `${col.width}%` } : undefined}
                      className={cn('app-table-value-cell text-foreground', cellPad)}
                    >
                      {renderCell(col, row, localIndex)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {paginate && totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
          <span>
            Showing {pageOffset + 1}–{Math.min(pageOffset + pageSize, rows.length)} of {rows.length}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 rounded border border-border text-[11px] hover:bg-muted disabled:opacity-40"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="px-2">
              {page + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 rounded border border-border text-[11px] hover:bg-muted disabled:opacity-40"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              aria-label="Next page"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
