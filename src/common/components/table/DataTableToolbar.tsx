'use client'

import { useCallback, useMemo, useState, type ReactNode } from 'react'

import type { Column } from 'ag-grid-community'
import { Columns3, FileSpreadsheet, FileText } from 'lucide-react'
import { SearchInput } from '@/common/components/search'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export interface DataTableToolbarProps {
  leading?: ReactNode
  searchEnabled: boolean
  searchQuery: string
  onSearchChange: (q: string) => void
  searchPlaceholder: string
  rowCount?: number
  showInactiveToggle?: boolean
  showInactive?: boolean
  onShowInactiveChange?: (checked: boolean) => void
  columnPickerEnabled: boolean
  exportExcelEnabled: boolean
  onExportExcel: () => void
  exportPdfEnabled: boolean
  onExportPdf: () => void
  lockColumnIds: string[]
  getColumns: () => Column[] | null
  applyColumnVisible: (colId: string, visible: boolean) => void
  endActions?: ReactNode
}

function headerLabel(col: Column): string {
  const def = col.getColDef()
  return String(def.headerName ?? def.field ?? col.getId())
}

export function DataTableToolbar({
  leading,
  searchEnabled,
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  rowCount,
  showInactiveToggle = false,
  showInactive = false,
  onShowInactiveChange,
  columnPickerEnabled,
  exportExcelEnabled,
  onExportExcel,
  exportPdfEnabled,
  onExportPdf,
  lockColumnIds,
  getColumns,
  applyColumnVisible,
  endActions,
}: DataTableToolbarProps) {
  const [columnMenuTick, setColumnMenuTick] = useState(0)
  const bump = useCallback(() => setColumnMenuTick((n) => n + 1), [])

  const columnItems = useMemo(() => {
    const cols = getColumns()
    if (!cols?.length) return []

    return cols
      .filter((c) => !c.getColDef().suppressColumnsToolPanel)
      .map((c) => ({
        id: c.getId(),
        label: headerLabel(c),
        visible: c.isVisible(),
        locked: lockColumnIds.includes(c.getId()),
      }))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- columnMenuTick invalidates AG Grid-held state
  }, [getColumns, lockColumnIds, columnMenuTick])

  const visibleCount = columnItems.filter((c) => c.visible).length

  return (
    <div className="app-data-table-toolbar flex flex-row flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-x-3">
        {leading}
        {searchEnabled ? (
          <>
            <SearchInput
              className="min-w-0 w-full max-w-md"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={onSearchChange}
            />
            {typeof rowCount === 'number' ? (
              <span className="inline-flex shrink-0 items-center rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground tabular-nums">
                {rowCount} {rowCount === 1 ? 'row' : 'rows'}
              </span>
            ) : null}
          </>
        ) : null}
        {showInactiveToggle ? (
          <div className="flex items-center gap-2">
            <Checkbox
              id="data-table-show-inactive"
              checked={showInactive}
              onCheckedChange={(checked) => onShowInactiveChange?.(checked === true)}
            />
            <Label
              htmlFor="data-table-show-inactive"
              className="cursor-pointer text-[12px] font-normal text-muted-foreground"
            >
              Show inactive
            </Label>
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-nowrap items-center justify-end gap-2">
        {columnPickerEnabled ? (
          <DropdownMenu onOpenChange={(open) => { if (open) bump() }}>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="app-data-table-toolbar-btn h-9 px-3 text-[12px]">
                <Columns3 className="mr-1.5 h-3.5 w-3.5" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="text-[12px]">Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {columnItems.length === 0 ? (
                <div className="text-muted-foreground px-2 py-1.5 text-[11px]">Load the table first</div>
              ) : (
                columnItems.map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.id}
                    className="text-[12px]"
                    checked={col.visible}
                    disabled={col.locked || (!col.visible && visibleCount <= 1)}
                    onCheckedChange={(checked) => {
                      if (col.locked) return
                      if (!checked && visibleCount <= 1) return
                      applyColumnVisible(col.id, checked === true)
                      bump()
                    }}
                  >
                    {col.label}
                  </DropdownMenuCheckboxItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}

        {exportExcelEnabled ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="app-data-table-toolbar-btn h-9 px-3 text-[12px]"
            onClick={onExportExcel}
          >
            <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
            Excel
          </Button>
        ) : null}

        {exportPdfEnabled ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="app-data-table-toolbar-btn h-9 px-3 text-[12px]"
            onClick={onExportPdf}
          >
            <FileText className="mr-1.5 h-3.5 w-3.5" />
            PDF
          </Button>
        ) : null}

        {endActions}
      </div>
    </div>
  )
}
