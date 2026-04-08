'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AgGridReact } from 'ag-grid-react'
import {
  ModuleRegistry,
  AllCommunityModule,
  type ColDef,
  type GridApi,
  type CellClickedEvent,
  type GetRowIdFunc,
  type RowClickedEvent,
  type FirstDataRenderedEvent,
  type GridSizeChangedEvent,
  type RowDataUpdatedEvent,
} from 'ag-grid-community'
import { Download, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

ModuleRegistry.registerModules([AllCommunityModule])

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DataTableProps<T> {
  /** Array of row data to display */
  rowData: T[]
  /** AG Grid column definitions */
  columnDefs: ColDef<T>[]
  /** When true the grid shows a loading overlay */
  loading?: boolean
  /**
   * Fixed height of the grid container (e.g. "500px").
   * Pass "auto" to use AG Grid's autoHeight dom layout.
   * When pagination or serverSide is true, height is always auto.
   */
  height?: string

  /** Stable row identity function — prevents scroll/selection loss on re-render */
  getRowId?: GetRowIdFunc<T>

  /** Fired when a cell is clicked */
  onCellClicked?: (event: CellClickedEvent<T>) => void
  /** Convenience row-click handler — receives the typed row data */
  onRowClick?: (row: T) => void

  // ── Client-side pagination ────────────────────────────────────────────────
  /** Enable client-side pagination. The DataTable slices rowData internally. */
  pagination?: boolean
  /** Rows per page (default: 10) */
  paginationPageSize?: number

  // ── Server-side pagination ────────────────────────────────────────────────
  /**
   * When true, the parent supplies the current page's rowData slice.
   * A custom pagination bar is rendered below the grid.
   */
  serverSide?: boolean
  /** Total number of rows on the server (required when serverSide=true) */
  totalCount?: number
  /** Current 0-based page index, controlled by parent (required when serverSide=true) */
  currentPage?: number
  /**
   * Called when the user navigates to a new page or changes page size.
   * @param page     0-based page index
   * @param pageSize number of rows per page
   */
  onPageChange?: (page: number, pageSize: number) => void

  // ── Toolbar ───────────────────────────────────────────────────────────────
  /** Show an "Export CSV" button above the grid */
  exportCsv?: boolean
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_COL_DEF: ColDef = {
  sortable: true,
  filter: false,
  resizable: true,
  minWidth: 70,
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const
type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number]

// ─── Component ────────────────────────────────────────────────────────────────

export function DataTable<T>({
  rowData,
  columnDefs,
  loading = false,
  height = 'auto',
  getRowId,
  onCellClicked,
  onRowClick,
  pagination = false,
  paginationPageSize = 10,
  serverSide = false,
  totalCount = 0,
  currentPage = 0,
  onPageChange,
  exportCsv = false,
}: DataTableProps<T>) {
  const gridRef = useRef<AgGridReact<T>>(null)

  // ── Client-side pagination state ─────────────────────────────────────────────
  // We manage pagination ourselves so the grid only ever receives the current
  // page's rows — this makes autoHeight size exactly to the visible rows.
  const [clientPage, setClientPage] = useState(0)
  const [clientPageSize, setClientPageSize] = useState<PageSizeOption>(
    (paginationPageSize as PageSizeOption) ?? 10,
  )

  // Reset to page 0 when the source data changes (e.g. search filter applied)
  useEffect(() => {
    setClientPage(0)
  }, [rowData])

  // ── Server-side pagination state ─────────────────────────────────────────────
  const [serverPageSize, setServerPageSize] = useState<PageSizeOption>(10)

  const defaultColDef = useMemo<ColDef>(() => DEFAULT_COL_DEF, [])

  // Paginated/serverSide tables always use autoHeight — no fixed-height scroll box.
  const isAutoHeight = height === 'auto' || pagination || serverSide

  // ── Client pagination derived values ─────────────────────────────────────────
  const clientTotalRows = rowData.length
  const clientTotalPages = Math.max(1, Math.ceil(clientTotalRows / clientPageSize))
  // Clamp current page in case rowData shrinks (e.g. search narrows results)
  const safePage = Math.min(clientPage, clientTotalPages - 1)

  const pagedRowData = useMemo(() => {
    if (!pagination) return rowData
    const start = safePage * clientPageSize
    return rowData.slice(start, start + clientPageSize)
  }, [rowData, pagination, safePage, clientPageSize])

  // ── Server pagination derived values ─────────────────────────────────────────
  const totalPages = serverSide ? Math.max(1, Math.ceil(totalCount / serverPageSize)) : 1
  const rangeStart = serverSide ? currentPage * serverPageSize + 1 : 0
  const rangeEnd = serverSide ? Math.min(rangeStart + serverPageSize - 1, totalCount) : 0

  // ── Column fit helpers ────────────────────────────────────────────────────────

  function fitColumns(api: GridApi<T>) {
    api.sizeColumnsToFit()
  }

  function handleFirstDataRendered(event: FirstDataRenderedEvent<T>) {
    fitColumns(event.api)
  }

  function handleRowDataUpdated(event: RowDataUpdatedEvent<T>) {
    fitColumns(event.api)
  }

  function handleGridSizeChanged(event: GridSizeChangedEvent<T>) {
    fitColumns(event.api)
  }

  // ── Client pagination handlers ────────────────────────────────────────────────

  function handleClientPrevPage() {
    setClientPage((p) => Math.max(0, p - 1))
  }

  function handleClientNextPage() {
    setClientPage((p) => Math.min(clientTotalPages - 1, p + 1))
  }

  function handleClientPageSizeChange(value: string) {
    setClientPageSize(Number(value) as PageSizeOption)
    setClientPage(0)
  }

  // ── Server pagination handlers ────────────────────────────────────────────────

  function handlePrevPage() {
    if (currentPage > 0) onPageChange?.(currentPage - 1, serverPageSize)
  }

  function handleNextPage() {
    if (currentPage < totalPages - 1) onPageChange?.(currentPage + 1, serverPageSize)
  }

  function handlePageSizeChange(value: string) {
    const newSize = Number(value) as PageSizeOption
    setServerPageSize(newSize)
    onPageChange?.(0, newSize)
  }

  // ── Misc ──────────────────────────────────────────────────────────────────────

  function handleExportCsv() {
    gridRef.current?.api.exportDataAsCsv()
  }

  function handleRowClicked(event: RowClickedEvent<T>) {
    if (onRowClick && event.data !== undefined) onRowClick(event.data)
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-2">
      {/* ── Toolbar ── */}
      {exportCsv && (
        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" size="sm" onClick={handleExportCsv} aria-label="Export to CSV">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      )}

      {/* ── Grid ── */}
      <div className="ag-theme-quartz" style={isAutoHeight ? undefined : { height }}>
        <AgGridReact<T>
          ref={gridRef}
          rowData={pagedRowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          domLayout="autoHeight"
          loading={loading}
          suppressHorizontalScroll
          onFirstDataRendered={handleFirstDataRendered}
          onRowDataUpdated={handleRowDataUpdated}
          onGridSizeChanged={handleGridSizeChanged}
          getRowId={getRowId}
          onCellClicked={onCellClicked}
          onRowClicked={onRowClick ? handleRowClicked : undefined}
          animateRows
        />
      </div>

      {/* ── Client-side pagination bar ── */}
      {pagination && (
        <div className="flex items-center justify-between gap-4 px-1 py-1 text-sm text-muted-foreground flex-wrap">
          <span className="whitespace-nowrap">
            {clientTotalRows === 0
              ? 'No results'
              : `Showing ${safePage * clientPageSize + 1}–${Math.min((safePage + 1) * clientPageSize, clientTotalRows)} of ${clientTotalRows}`}
          </span>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="whitespace-nowrap">Rows per page</span>
              <Select value={String(clientPageSize)} onValueChange={handleClientPageSizeChange}>
                <SelectTrigger className="h-8 w-20 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <span className="whitespace-nowrap">
              Page {safePage + 1} of {clientTotalPages}
            </span>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={handleClientPrevPage}
                disabled={safePage <= 0}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={handleClientNextPage}
                disabled={safePage >= clientTotalPages - 1}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Server-side pagination bar ── */}
      {serverSide && (
        <div className="flex items-center justify-between gap-4 px-1 py-1 text-sm text-muted-foreground flex-wrap">
          <span className="whitespace-nowrap">
            {totalCount === 0
              ? 'No results'
              : `Showing ${rangeStart}–${rangeEnd} of ${totalCount}`}
          </span>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="whitespace-nowrap">Rows per page</span>
              <Select value={String(serverPageSize)} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="h-8 w-20 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <span className="whitespace-nowrap">
              Page {currentPage + 1} of {totalPages}
            </span>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={handlePrevPage}
                disabled={currentPage <= 0}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={handleNextPage}
                disabled={currentPage >= totalPages - 1}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
