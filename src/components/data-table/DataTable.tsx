'use client'

import { useMemo, useRef, useState } from 'react'
import { AgGridReact } from 'ag-grid-react'
import {
  ModuleRegistry,
  AllCommunityModule,
  type ColDef,
  type CellClickedEvent,
  type RowSelectedEvent,
} from 'ag-grid-community'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SearchInput } from '@/components/forms/SearchInput'

ModuleRegistry.registerModules([AllCommunityModule])

/**
 * Generic AG Grid data table with built-in sort, filter, resize, and optional
 * pagination, CSV export, and quick search toolbar.
 */
interface DataTableProps<T> {
  /** Array of row data to display */
  rowData: T[]
  /** AG Grid column definitions */
  columnDefs: ColDef<T>[]
  /** When true the grid shows a loading overlay */
  loading?: boolean
  /** Fixed height of the grid container (e.g. "500px"). Use "auto" for autoHeight */
  height?: string
  /** Externally controlled quick-filter text wired to AG Grid quickFilterText */
  quickFilterText?: string
  /** Fired when a cell is clicked */
  onCellClicked?: (event: CellClickedEvent<T>) => void
  /** Enable AG Grid built-in pagination */
  pagination?: boolean
  /** Rows per page when pagination is enabled */
  paginationPageSize?: number
  /** Show CSV export button above the grid */
  exportCsv?: boolean
  /** Show search input above the grid (uses quickFilterText internally) */
  showSearch?: boolean
  /** Called when a row is selected — passes the row data or null on deselect */
  onRowSelected?: (row: T | null) => void
}

export default function DataTable<T>({
  rowData,
  columnDefs,
  loading = false,
  height = '500px',
  quickFilterText,
  onCellClicked,
  pagination = false,
  paginationPageSize = 20,
  exportCsv = false,
  showSearch = false,
  onRowSelected,
}: DataTableProps<T>) {
  const gridRef = useRef<AgGridReact<T>>(null)
  const [internalSearch, setInternalSearch] = useState('')

  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
      flex: 1,
      minWidth: 100,
    }),
    []
  )

  const isAutoHeight = height === 'auto'

  // Merge internal search with externally supplied quickFilterText
  const effectiveQuickFilter = showSearch ? internalSearch : quickFilterText

  function handleExportCsv() {
    gridRef.current?.api.exportDataAsCsv()
  }

  function handleRowSelected(event: RowSelectedEvent<T>) {
    if (!onRowSelected) return
    if (event.node.isSelected()) {
      onRowSelected(event.data ?? null)
    } else {
      onRowSelected(null)
    }
  }

  const hasToolbar = exportCsv || showSearch

  return (
    <div className="flex flex-col gap-2">
      {hasToolbar && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {showSearch && (
            <SearchInput
              value={internalSearch}
              onChange={setInternalSearch}
              placeholder="Search..."
              className="w-64"
            />
          )}
          {exportCsv && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="ml-auto"
              aria-label="Export to CSV"
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          )}
        </div>
      )}

      <div
        className="ag-theme-quartz"
        style={isAutoHeight ? undefined : { height }}
      >
        <AgGridReact<T>
          ref={gridRef}
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          domLayout={isAutoHeight ? 'autoHeight' : undefined}
          loading={loading}
          quickFilterText={effectiveQuickFilter}
          onCellClicked={onCellClicked}
          pagination={pagination}
          paginationPageSize={pagination ? paginationPageSize : undefined}
          rowSelection={onRowSelected ? 'single' : undefined}
          onRowSelected={onRowSelected ? handleRowSelected : undefined}
          animateRows
        />
      </div>
    </div>
  )
}
