'use client'

import { useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { CalendarDays, PencilIcon, PlusIcon } from 'lucide-react'
import { StatusBadge } from '@/common/components/data-display'
import { ListPage } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { listFinancialYears } from '@/services'
import type { FinancialYear } from '@/types/financial-year'
import FinancialYearModal from './FinancialYearModal'

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<FinancialYear>,
  orgCode: { headerName: 'Organization', minWidth: 120, flex: 0.8 } as ColDef<FinancialYear>,
  universityCode: { headerName: 'University', minWidth: 120, flex: 0.8 } as ColDef<FinancialYear>,
  financialYear: { headerName: 'Financial Year', minWidth: 130, flex: 0.9 } as ColDef<FinancialYear>,
  fromDate: { headerName: 'From Date', minWidth: 120, flex: 0.8 } as ColDef<FinancialYear>,
  toDate: { headerName: 'To Date', minWidth: 120, flex: 0.8 } as ColDef<FinancialYear>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.7 } as ColDef<FinancialYear>,
  actions: { headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<FinancialYear>,
}

function pickText(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = row[key]
    if (typeof value === 'string' && value.trim()) return value
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return ''
}

function fmtDate(value: unknown): string {
  if (typeof value !== 'string') return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString()
}

function toSearchText(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return ''
}

function statusRenderer(p: ICellRendererParams<FinancialYear>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  setEditing: (row: FinancialYear | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<FinancialYear>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      aria-label="Edit financial year"
      onClick={() => { setEditing(p.data ?? null); setModalOpen(true) }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

export default function FinancialYearsPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingFinancialYear, setEditingFinancialYear] = useState<FinancialYear | null>(null)

  const { data: financialYears, isLoading: loading, invalidate } = useCrudList({
    queryKey: QK.financialYears.list(),
    queryFn: listFinancialYears,
  })

  const columnDefs = useMemo<ColDef<FinancialYear>[]>(
    () => [
      COL_DEFS.siNo,
      { ...COL_DEFS.orgCode, valueGetter: (p) => pickText((p.data ?? {}) as Record<string, unknown>, ['orgCode', 'orgcode']) },
      {
        ...COL_DEFS.universityCode,
        valueGetter: (p) => pickText((p.data ?? {}) as Record<string, unknown>, ['universityCode', 'universitycode']),
      },
      { ...COL_DEFS.financialYear, valueGetter: (p) => pickText((p.data ?? {}) as Record<string, unknown>, ['financialYear', 'financialyear']) },
      { ...COL_DEFS.fromDate, valueGetter: (p) => fmtDate((p.data as FinancialYear | undefined)?.fromDate) },
      { ...COL_DEFS.toDate, valueGetter: (p) => fmtDate((p.data as FinancialYear | undefined)?.toDate) },
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(setEditingFinancialYear, setModalOpen) },
    ],
    [setEditingFinancialYear, setModalOpen],
  )

  return (
    <ListPage
      title="Financial Years"
      rowData={financialYears}
      columnDefs={columnDefs}
      loading={loading}
      pagination
      toolbar={{ search: true, searchPlaceholder: 'Search financial years…', pdfDocumentTitle: 'Financial Years' }}
      toolbarTrailing={
        <Button size="sm" onClick={() => { setEditingFinancialYear(null); setModalOpen(true) }}>
          <PlusIcon className="h-4 w-4 mr-1" />
          Add Financial Year
        </Button>
      }
      emptyState={
        <div className="app-card flex flex-col items-center justify-center py-16 text-muted-foreground">
          <CalendarDays className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm">No financial years found</p>
          <Button size="sm" className="mt-4" onClick={() => { setEditingFinancialYear(null); setModalOpen(true) }}>
            <PlusIcon className="h-4 w-4 mr-1" />
            Add Financial Year
          </Button>
        </div>
      }
    >
      <FinancialYearModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingFinancialYear(null) }}
        financialYear={editingFinancialYear}
        existingRows={financialYears}
        onSaved={invalidate}
      />
    </ListPage>
  )
}
