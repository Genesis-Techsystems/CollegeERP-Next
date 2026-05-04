'use client'

import { useCallback, useMemo, useState, type ReactNode } from 'react'
import type { Column } from 'ag-grid-community'
import { Columns3, FileText } from 'lucide-react'
import { SearchInput } from '@/common/components/search'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export interface DataTableToolbarProps {
  /** Shown left of toolbar search (e.g. row count); wrapped with search when both set */
  leading?: ReactNode
  searchEnabled: boolean
  searchQuery: string
  onSearchChange: (q: string) => void
  searchPlaceholder: string
  columnPickerEnabled: boolean
  exportPdfEnabled: boolean
  onExportPdf: () => void
  /** Columns that cannot be hidden (still listed, checkbox disabled) */
  lockColumnIds: string[]
  getColumns: () => Column[] | null
  applyColumnVisible: (colId: string, visible: boolean) => void
  /** e.g. Export CSV + primary “Add” — rendered after Export PDF */
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
  columnPickerEnabled,
  exportPdfEnabled,
  onExportPdf,
  lockColumnIds,
  getColumns,
  applyColumnVisible,
  endActions,
}: DataTableToolbarProps) {
  const [, setColumnMenuTick] = useState(0)
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
  }, [getColumns, lockColumnIds, bump])

  const visibleCount = columnItems.filter((c) => c.visible).length

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2">
        {leading}
        {searchEnabled ? (
          <SearchInput
            className="w-full max-w-sm"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={onSearchChange}
          />
        ) : null}
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
        {columnPickerEnabled ? (
          <DropdownMenu
            onOpenChange={(open) => {
              if (open) bump()
            }}
          >
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-[30px] px-3 text-[12px]">
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

        {exportPdfEnabled ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-[30px] px-3 text-[12px]"
            onClick={onExportPdf}
          >
            <FileText className="mr-1.5 h-3.5 w-3.5" />
            Export PDF
          </Button>
        ) : null}

        {endActions}
      </div>
    </div>
  )
}
