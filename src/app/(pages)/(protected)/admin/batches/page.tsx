'use client'
import { useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { PencilIcon, PlusIcon } from 'lucide-react'
import { DataTable } from '@/common/components/table'
import { StatusBadge } from '@/common/components/data-display'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { listBatchesAdmin } from '@/services'
import type { Batch } from '@/types/batch'
import BatchModal from './BatchModal'

const COLS = {
  siNo: { colId: 'siNo', headerName: 'Si.no', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<Batch>,
  courseCode: { colId: 'courseCode', headerName: 'Course code', minWidth: 140, flex: 1 } as ColDef<Batch>,
  regulationName: { colId: 'regulationName', headerName: 'Regulation name', minWidth: 170, flex: 1.1 } as ColDef<Batch>,
  name: { colId: 'batchName', field: 'batchName', headerName: 'Batch Name', minWidth: 170, flex: 1.2 } as ColDef<Batch>,
  batchFrom: { colId: 'batchFrom', headerName: 'Batch from', minWidth: 130, flex: 1 } as ColDef<Batch>,
  batchTo: { colId: 'batchTo', headerName: 'Batch to', minWidth: 130, flex: 1 } as ColDef<Batch>,
  isActive: { colId: 'isActive', field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.7 } as ColDef<Batch>,
  actions: { colId: 'actions', headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<Batch>,
}
function pick(r: Record<string, unknown>, keys: string[]) { for (const k of keys) { const v = r[k]; if (typeof v === 'string' && v.trim()) return v } return '' }
/** Same display approach as Academic Year from/to columns. */
function fmtDate(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString()
}
function statusRenderer(p: ICellRendererParams<Batch>) { return <StatusBadge status={p.data?.isActive ?? false} /> }
function actionRenderer(setRow: (r: Batch | null) => void, setOpen: (b: boolean) => void) { return (p: ICellRendererParams<Batch>) => <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setRow(p.data ?? null); setOpen(true) }}><PencilIcon className="h-3.5 w-3.5" /></Button> }

export default function BatchesPage() {
  const [open, setOpen] = useState(false)
  const [row, setRow] = useState<Batch | null>(null)
  const { data, isLoading, invalidate } = useCrudList({ queryKey: QK.batches.list(), queryFn: listBatchesAdmin })
  const columnDefs = useMemo<ColDef<Batch>[]>(() => [
    COLS.siNo,
    { ...COLS.courseCode, valueGetter: (p) => pick((p.data ?? {}) as Record<string, unknown>, ['courseCode', 'course_code', 'courseName']) },
    { ...COLS.regulationName, valueGetter: (p) => pick((p.data ?? {}) as Record<string, unknown>, ['regulationName', 'regulation_name', 'regulationCode']) },
    COLS.name,
    { ...COLS.batchFrom, valueGetter: (p) => fmtDate(pick((p.data ?? {}) as Record<string, unknown>, ['batchFrom', 'batch_from', 'fromDate'])) },
    { ...COLS.batchTo, valueGetter: (p) => fmtDate(pick((p.data ?? {}) as Record<string, unknown>, ['batchTo', 'batch_to', 'toDate'])) },
    { ...COLS.isActive, cellRenderer: statusRenderer },
    { ...COLS.actions, cellRenderer: actionRenderer(setRow, setOpen) },
  ], [])
  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40">
          <h2 className="app-card-title">Batches</h2>
        </div>
        <div className="px-3 pb-3 pt-2">
          <DataTable
            rowData={data}
            columnDefs={columnDefs}
            loading={isLoading}
            pagination
            toolbarTrailing={
              <Button size="sm" onClick={() => { setRow(null); setOpen(true) }}>
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Batch
              </Button>
            }
            toolbar={{ search: true, searchPlaceholder: 'Search batches…', pdfDocumentTitle: 'Batches' }}
          />
        </div>
      </div>
      <BatchModal open={open} onClose={() => { setOpen(false); setRow(null) }} row={row} onSaved={invalidate} />
    </PageContainer>
  )
}
