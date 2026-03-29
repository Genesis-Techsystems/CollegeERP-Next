'use client'

import { useMemo } from 'react'
import { AgGridReact } from 'ag-grid-react'
import {
  ModuleRegistry,
  AllCommunityModule,
  type ColDef,
  type CellClickedEvent,
} from 'ag-grid-community'

ModuleRegistry.registerModules([AllCommunityModule])

interface DataTableProps<T> {
  rowData: T[]
  columnDefs: ColDef<T>[]
  loading?: boolean
  height?: string
  quickFilterText?: string
  onCellClicked?: (event: CellClickedEvent<T>) => void
}

export default function DataTable<T>({
  rowData,
  columnDefs,
  loading = false,
  height = '500px',
  quickFilterText,
  onCellClicked,
}: DataTableProps<T>) {
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

  return (
    <div
      className="ag-theme-quartz"
      style={isAutoHeight ? undefined : { height }}
    >
      <AgGridReact<T>
        rowData={rowData}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        domLayout={isAutoHeight ? 'autoHeight' : undefined}
        loading={loading}
        quickFilterText={quickFilterText}
        onCellClicked={onCellClicked}
        animateRows
      />
    </div>
  )
}
