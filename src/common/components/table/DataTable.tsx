'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
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
  type GridReadyEvent,
} from 'ag-grid-community'
import { Download, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataTableToolbar } from './DataTableToolbar'

ModuleRegistry.registerModules([AllCommunityModule])

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DataTableToolbarConfig {
  /** Client-side filter across row values. Default **false** — set `true` when this grid is the only search UI (avoids duplicating a page-level search). */
  search?: boolean
  columnPicker?: boolean
  exportPdf?: boolean
  searchPlaceholder?: string
  /** Sets `document.title` briefly while the print dialog is open */
  pdfDocumentTitle?: string
  /** Column `colId`s that cannot be hidden */
  lockColumnIds?: string[]
}

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
  /**
   * `false` — no toolbar.
   * Omitted or object — column picker + Export PDF; **toolbar search is off by default** (set `search: true` when the grid is the only filter UI).
   */
  toolbar?: boolean | DataTableToolbarConfig
  /** Content left of Columns / Export (e.g. record count); shows in toolbar row beside actions */
  toolbarLeading?: ReactNode
  /** Primary actions rendered after Export PDF (e.g. Add …) */
  toolbarTrailing?: ReactNode
  /** Show an "Export CSV" button in the toolbar */
  exportCsv?: boolean
  /** Optional callback to access grid API from parent for external controls */
  onGridApiReady?: (api: GridApi<T>) => void
}

// ─── Constants ────────────────────────────────────────────────────────────────

// minWidth: 70 (not 100) — allows narrow columns like SI.No, Status, Actions
// to fit without forcing excess table width. Callers can override per-column.
const DEFAULT_COL_DEF: ColDef = {
  sortable: true,
  filter: false,
  resizable: true,
  minWidth: 70,
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const
type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number]

// ─── Row search (toolbar) ─────────────────────────────────────────────────────

const MAX_SEARCH_DEPTH = 8

function collectStrings(value: unknown, depth: number, out: string[]): void {
  if (depth > MAX_SEARCH_DEPTH) return
  if (value == null) return
  const t = typeof value
  if (t === 'string' || t === 'number' || t === 'boolean' || t === 'bigint') {
    out.push(String(value))
    return
  }
  if (t !== 'object') return
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, depth + 1, out)
    return
  }
  for (const v of Object.values(value as Record<string, unknown>)) {
    collectStrings(v, depth + 1, out)
  }
}

function rowMatchesSearch<T>(row: T, q: string): boolean {
  const needle = q.trim().toLowerCase()
  if (!needle) return true
  const hay: string[] = []
  collectStrings(row, 0, hay)
  return hay.some((s) => s.toLowerCase().includes(needle))
}

function resolveToolbar(
  toolbar: boolean | DataTableToolbarConfig | undefined,
  serverSide: boolean,
): {
  show: boolean
  search: boolean
  columnPicker: boolean
  exportPdf: boolean
  searchPlaceholder: string
  pdfDocumentTitle?: string
  lockColumnIds: string[]
} {
  if (toolbar === false) {
    return {
      show: false,
      search: false,
      columnPicker: false,
      exportPdf: false,
      searchPlaceholder: '',
      lockColumnIds: [],
    }
  }
  const t: DataTableToolbarConfig =
    toolbar === true || toolbar === undefined ? {} : toolbar
  return {
    show: true,
    /** Default off so pages can keep a single external search/input without duplicating the toolbar search. */
    search: t.search === true,
    columnPicker: t.columnPicker !== false,
    exportPdf: t.exportPdf !== false,
    searchPlaceholder: t.searchPlaceholder ?? 'Search…',
    pdfDocumentTitle: t.pdfDocumentTitle,
    lockColumnIds: t.lockColumnIds ?? [],
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DataTable<T>({
  rowData,
  columnDefs,
  loading = false,
  height = 'auto',
  getRowId,
  onCellClicked,
  onRowClick,
  pagination = true,
  paginationPageSize = 10,
  serverSide = false,
  totalCount = 0,
  currentPage = 0,
  onPageChange,
  toolbar: toolbarProp,
  toolbarLeading,
  toolbarTrailing,
  exportCsv = false,
  onGridApiReady,
}: DataTableProps<T>) {
  const tb = useMemo(
    () => resolveToolbar(toolbarProp, serverSide),
    [toolbarProp, serverSide],
  )

  const [searchQuery, setSearchQuery] = useState('')
  const [gridApi, setGridApi] = useState<GridApi<T> | null>(null)

  const clientPaginationEnabled = pagination && !serverSide

  const gridRef = useRef<AgGridReact<T>>(null)

  const filteredRowData = useMemo(() => {
    if (!tb.show || !tb.search || !searchQuery.trim()) return rowData
    return rowData.filter((r) => rowMatchesSearch(r, searchQuery))
  }, [rowData, tb.show, tb.search, searchQuery])

  // ── Client-side pagination state ─────────────────────────────────────────────
  const [clientPage, setClientPage] = useState(0)
  const [clientPageSize, setClientPageSize] = useState<PageSizeOption>(
    (paginationPageSize as PageSizeOption) ?? 10,
  )

  useEffect(() => {
    setClientPage(0)
  }, [rowData, searchQuery])

  // ── Server-side pagination state ─────────────────────────────────────────────
  const [serverPageSize, setServerPageSize] = useState<PageSizeOption>(() => {
    const n = Number(paginationPageSize)
    return (PAGE_SIZE_OPTIONS as readonly number[]).includes(n) ? (n as PageSizeOption) : 10
  })

  const defaultColDef = useMemo<ColDef>(() => DEFAULT_COL_DEF, [])

  const isAutoHeight = height === 'auto' || pagination || serverSide

  // ── Client pagination derived values ─────────────────────────────────────────
  const dataForPaging = clientPaginationEnabled ? filteredRowData : rowData
  const clientTotalRows = dataForPaging.length
  const clientTotalPages = Math.max(1, Math.ceil(clientTotalRows / clientPageSize))
  const safePage = Math.min(clientPage, clientTotalPages - 1)

  const pagedRowData = useMemo(() => {
    if (serverSide) return rowData
    if (!clientPaginationEnabled) return filteredRowData
    const start = safePage * clientPageSize
    return filteredRowData.slice(start, start + clientPageSize)
  }, [
    rowData,
    filteredRowData,
    clientPaginationEnabled,
    serverSide,
    safePage,
    clientPageSize,
  ])

  // ── Server pagination derived values ─────────────────────────────────────────
  const totalPages = serverSide ? Math.max(1, Math.ceil(totalCount / serverPageSize)) : 1
  const rangeStart = serverSide ? currentPage * serverPageSize + 1 : 0
  const rangeEnd = serverSide ? Math.min(rangeStart + serverPageSize - 1, totalCount) : 0

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

  function handleGridReady(event: GridReadyEvent<T>) {
    setGridApi(event.api)
    onGridApiReady?.(event.api)
  }

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

  function handleExportCsv() {
    gridRef.current?.api.exportDataAsCsv()
  }

  const handleExportPdf = useCallback(() => {
    const title = tb.pdfDocumentTitle
    const prev = document.title
    if (title) document.title = title
    globalThis.print()
    if (title) document.title = prev
  }, [tb.pdfDocumentTitle])

  const getColumns = useCallback(() => {
    const api = gridRef.current?.api ?? gridApi
    if (!api) return null
    return api.getAllGridColumns() ?? null
  }, [gridApi])

  const applyColumnVisible = useCallback((colId: string, visible: boolean) => {
    const api = gridRef.current?.api ?? gridApi
    api?.applyColumnState({ state: [{ colId, hide: !visible }] })
  }, [gridApi])

  function handleRowClicked(event: RowClickedEvent<T>) {
    if (onRowClick && event.data !== undefined) onRowClick(event.data)
  }

  const showMainToolbar =
    tb.show &&
    (tb.search ||
      tb.columnPicker ||
      tb.exportPdf ||
      Boolean(toolbarTrailing) ||
      Boolean(toolbarLeading) ||
      exportCsv)

  return (
    <div className="app-data-table flex flex-col">
      {(showMainToolbar || (!showMainToolbar && exportCsv)) && (
        <div className="border-b border-slate-200 bg-slate-50/60 px-3 py-2">
          {showMainToolbar ? (
            <DataTableToolbar
              leading={toolbarLeading}
              searchEnabled={tb.search}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder={tb.searchPlaceholder}
              columnPickerEnabled={tb.columnPicker}
              exportPdfEnabled={tb.exportPdf}
              onExportPdf={handleExportPdf}
              lockColumnIds={tb.lockColumnIds}
              getColumns={getColumns}
              applyColumnVisible={applyColumnVisible}
              endActions={
                <>
                  {exportCsv ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-[30px] px-3 text-[12px]"
                      onClick={handleExportCsv}
                      aria-label="Export to CSV"
                    >
                      <Download className="mr-1.5 h-3.5 w-3.5" />
                      Export CSV
                    </Button>
                  ) : null}
                  {toolbarTrailing}
                </>
              }
            />
          ) : (
            <div className="flex items-center justify-end gap-3">
              <Button variant="outline" size="sm" onClick={handleExportCsv} aria-label="Export to CSV">
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="ag-theme-quartz" style={isAutoHeight ? undefined : { height }}>
        <AgGridReact<T>
          ref={gridRef}
          rowData={pagedRowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          domLayout={isAutoHeight ? 'autoHeight' : undefined}
          loading={loading}
          onGridReady={handleGridReady}
          onFirstDataRendered={handleFirstDataRendered}
          onRowDataUpdated={handleRowDataUpdated}
          onGridSizeChanged={handleGridSizeChanged}
          getRowId={getRowId}
          onCellClicked={onCellClicked}
          onRowClicked={onRowClick ? handleRowClicked : undefined}
          animateRows
        />
      </div>

      {clientPaginationEnabled && (
        <div className="flex items-center justify-between gap-4 px-1 py-1 text-[11px] text-muted-foreground flex-wrap">
          <span className="whitespace-nowrap">
            {clientTotalRows === 0
              ? 'No results'
              : `Showing ${safePage * clientPageSize + 1}–${Math.min((safePage + 1) * clientPageSize, clientTotalRows)} of ${clientTotalRows}`}
          </span>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="whitespace-nowrap">Rows per page</span>
              <select
                aria-label="Rows per page"
                className="h-7 w-20 rounded-md border border-input bg-background px-2 text-[11px]"
                value={String(clientPageSize)}
                onChange={(e) => handleClientPageSizeChange(e.target.value)}
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={String(size)}>
                    {size}
                  </option>
                ))}
              </select>
            </div>

            <span className="whitespace-nowrap">
              Page {safePage + 1} of {clientTotalPages}
            </span>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={handleClientPrevPage}
                disabled={safePage <= 0}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
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

      {serverSide && (
        <div className="flex items-center justify-between gap-4 px-1 py-1 text-[11px] text-muted-foreground flex-wrap">
          <span className="whitespace-nowrap">
            {totalCount === 0
              ? 'No results'
              : `Showing ${rangeStart}–${rangeEnd} of ${totalCount}`}
          </span>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="whitespace-nowrap">Rows per page</span>
              <select
                aria-label="Rows per page"
                className="h-7 w-20 rounded-md border border-input bg-background px-2 text-[11px]"
                value={String(serverPageSize)}
                onChange={(e) => handlePageSizeChange(e.target.value)}
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={String(size)}>
                    {size}
                  </option>
                ))}
              </select>
            </div>

            <span className="whitespace-nowrap">
              Page {currentPage + 1} of {totalPages}
            </span>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={handlePrevPage}
                disabled={currentPage <= 0}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
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
