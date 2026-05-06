'use client'

import { useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { CalendarDays, PencilIcon, PlusIcon } from 'lucide-react'
import { DataTable } from '@/common/components/table'
import { StatusBadge } from '@/common/components/data-display'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { listWeekdays } from '@/services'
import type { Weekday } from '@/types/weekday'
import WeekdayModal from './WeekdayModal'

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<Weekday>,
  weekDay: { field: 'weekDay', headerName: 'Week Day', minWidth: 140, flex: 1 } as ColDef<Weekday>,
  name: { field: 'name', headerName: 'Name', minWidth: 140, flex: 1 } as ColDef<Weekday>,
  dayOfWeek: { field: 'dayOfWeek', headerName: 'Day Of Week', minWidth: 120, flex: 0.9 } as ColDef<Weekday>,
  sortOrder: { field: 'sortOrder', headerName: 'Sort Order', minWidth: 110, flex: 0.8 } as ColDef<Weekday>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 100, flex: 0.8 } as ColDef<Weekday>,
  actions: { headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<Weekday>,
}

function statusRenderer(p: ICellRendererParams<Weekday>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function actionsRenderer(setEditing: (row: Weekday | null) => void, setModalOpen: (open: boolean) => void) {
  return (p: ICellRendererParams<Weekday>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      aria-label="Edit weekday"
      onClick={() => { setEditing(p.data ?? null); setModalOpen(true) }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

export default function WeekdaysPage() {
  const [open, setOpen] = useState(false)
  const [row, setRow] = useState<Weekday | null>(null)

  const { data, isLoading, invalidate } = useCrudList({
    queryKey: QK.weekdays.list(),
    queryFn: listWeekdays,
  })

  const columnDefs = useMemo<ColDef<Weekday>[]>(() => [
    COL_DEFS.siNo,
    COL_DEFS.weekDay,
    COL_DEFS.name,
    COL_DEFS.dayOfWeek,
    COL_DEFS.sortOrder,
    { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
    { ...COL_DEFS.actions, cellRenderer: actionsRenderer(setRow, setOpen) },
  ], [])

  return (
    <PageContainer className="space-y-5">
      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60">
          <h2 className="text-[14px] font-semibold text-[hsl(var(--primary))]">Weekdays</h2>
        </div>
        <div className="px-3 pb-3 pt-2">
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            {!isLoading && data.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <CalendarDays className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">No weekdays found</p>
              </div>
            ) : (
              <DataTable
                rowData={data}
                columnDefs={columnDefs}
                loading={isLoading}
                pagination
                toolbar={{ search: true, searchPlaceholder: 'Search weekdays...', pdfDocumentTitle: 'Weekdays' }}
                toolbarTrailing={(
                  <Button size="sm" onClick={() => { setRow(null); setOpen(true) }}>
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Add Week Day
                  </Button>
                )}
              />
            )}
          </div>
        </div>
      </div>

      <WeekdayModal open={open} onClose={() => { setOpen(false); setRow(null) }} row={row} onSaved={invalidate} />
    </PageContainer>
  )
}

