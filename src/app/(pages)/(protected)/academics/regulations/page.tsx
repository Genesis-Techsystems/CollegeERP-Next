'use client'

import { useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { PencilIcon, PlusIcon } from 'lucide-react'
import { DataTable } from '@/common/components/table'
import { StatusBadge } from '@/common/components/data-display'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { rowIndexGetter } from '@/lib/utils'
import { listRegulationsAdmin } from '@/services'
import RegulationModal from './RegulationModal'

type AnyRow = Record<string, any>

const COLS = {
  siNo: { colId: 'siNo', headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<AnyRow>,
  university: { colId: 'university', headerName: 'University', minWidth: 95, flex: 1 } as ColDef<AnyRow>,
  course: { colId: 'courseCode', headerName: 'Course', minWidth: 85, flex: 0.9 } as ColDef<AnyRow>,
  regCode: { colId: 'regulationCode', field: 'regulationCode', headerName: 'Regulation Code', minWidth: 105, flex: 1 } as ColDef<AnyRow>,
  regName: { colId: 'regulationName', field: 'regulationName', headerName: 'Regulation Name', minWidth: 115, flex: 1.1 } as ColDef<AnyRow>,
  markType: { colId: 'examIntMarkTypeName', headerName: 'Internal Marks Type', minWidth: 110, flex: 1 } as ColDef<AnyRow>,
  effectiveFrom: { colId: 'effectiveFrom', headerName: 'Effective From', minWidth: 95, flex: 0.9 } as ColDef<AnyRow>,
  sortOrder: { colId: 'sortOrder', field: 'sortOrder', headerName: 'Sort Order', minWidth: 80, flex: 0.7 } as ColDef<AnyRow>,
  isActive: { colId: 'isActive', field: 'isActive', headerName: 'Status', minWidth: 75, flex: 0.7 } as ColDef<AnyRow>,
  actions: { colId: 'actions', headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<AnyRow>,
}

function pick(row: AnyRow, keys: string[]): string {
  for (const key of keys) {
    const value = row?.[key]
    if (value === null || value === undefined) continue
    const out = String(value).trim()
    if (out) return out
  }
  return ''
}

function toDisplayDate(raw: unknown): string {
  if (!raw) return ''
  let d: Date
  if (raw instanceof Date) d = raw
  else if (typeof raw === 'string' || typeof raw === 'number') d = new Date(raw)
  else d = new Date('')
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function statusRenderer(p: ICellRendererParams<AnyRow>) {
  return <StatusBadge status={Boolean(p.data?.isActive)} />
}

function actionRenderer(setRow: (r: AnyRow | null) => void, setOpen: (b: boolean) => void) {
  return (p: ICellRendererParams<AnyRow>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      onClick={() => { setRow(p.data ?? null); setOpen(true) }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

export default function RegulationsPage() {
  const [open, setOpen] = useState(false)
  const [row, setRow] = useState<AnyRow | null>(null)
  const { data, isLoading, invalidate } = useCrudList({ queryKey: ['academics', 'regulations'], queryFn: listRegulationsAdmin })

  const columnDefs = useMemo<ColDef<AnyRow>[]>(() => [
    COLS.siNo,
    { ...COLS.university, valueGetter: (p) => pick(p.data ?? {}, ['universityCode', 'universityName']) },
    { ...COLS.course, valueGetter: (p) => pick(p.data ?? {}, ['courseCode', 'courseName']) },
    COLS.regCode,
    COLS.regName,
    { ...COLS.markType, valueGetter: (p) => pick(p.data ?? {}, ['examIntMarkTypeName', 'examIntMarkTypeCode']) },
    { ...COLS.effectiveFrom, valueGetter: (p) => toDisplayDate(p.data?.effectiveFrom) },
    COLS.sortOrder,
    { ...COLS.isActive, cellRenderer: statusRenderer },
    { ...COLS.actions, cellRenderer: actionRenderer(setRow, setOpen) },
  ], [])

  return (
    <PageContainer className="space-y-5">
      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60">
          <h2 className="text-[14px] font-semibold text-[hsl(var(--primary))]">Regulations</h2>
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
                Add Regulation
              </Button>
            }
            toolbar={{ search: true, searchPlaceholder: 'Search regulations…', pdfDocumentTitle: 'Regulations' }}
          />
        </div>
      </div>

      <RegulationModal
        open={open}
        onClose={() => { setOpen(false); setRow(null) }}
        row={row}
        existingRows={data}
        onSaved={invalidate}
      />
    </PageContainer>
  )
}

