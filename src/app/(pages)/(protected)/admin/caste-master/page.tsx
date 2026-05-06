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
import { listCastes } from '@/services'
import type { Caste } from '@/types/caste'
import CasteModal from './CasteModal'

const COLS = {
  siNo: { colId: 'siNo', headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<Caste>,
  orgCode: { colId: 'orgCode', headerName: 'Organization', minWidth: 130, flex: 1 } as ColDef<Caste>,
  caste: { colId: 'caste', field: 'caste', headerName: 'Caste', minWidth: 160, flex: 1.2 } as ColDef<Caste>,
  isEligibleForReservation: { colId: 'isEligibleForReservation', field: 'isEligibleForReservation', headerName: 'Reservation Eligibility', minWidth: 170, flex: 1 } as ColDef<Caste>,
  sortOrder: { colId: 'sortOrder', field: 'sortOrder', headerName: 'Sort Order', minWidth: 100, flex: 0.8 } as ColDef<Caste>,
  isActive: { colId: 'isActive', field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.7 } as ColDef<Caste>,
  actions: { colId: 'actions', headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<Caste>,
}
function statusRenderer(p: ICellRendererParams<Caste>) { return <StatusBadge status={p.data?.isActive ?? false} /> }
function eligibilityRenderer(p: ICellRendererParams<Caste>) {
  return <StatusBadge status={p.data?.isEligibleForReservation ? 'active' : 'inactive'} label={p.data?.isEligibleForReservation ? 'Eligible' : 'Not Eligible'} />
}
function actionRenderer(setRow: (r: Caste | null) => void, setOpen: (b: boolean) => void) {
  return (p: ICellRendererParams<Caste>) => (
    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setRow(p.data ?? null); setOpen(true) }}>
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

export default function CasteMasterPage() {
  const [open, setOpen] = useState(false)
  const [row, setRow] = useState<Caste | null>(null)
  const { data, isLoading, invalidate } = useCrudList({ queryKey: QK.castes.list(), queryFn: listCastes })

  const columnDefs = useMemo<ColDef<Caste>[]>(() => [
    COLS.siNo,
    { ...COLS.orgCode, valueGetter: (p) => p.data?.orgCode ?? '-' },
    COLS.caste,
    { ...COLS.isEligibleForReservation, cellRenderer: eligibilityRenderer },
    COLS.sortOrder,
    { ...COLS.isActive, cellRenderer: statusRenderer },
    { ...COLS.actions, cellRenderer: actionRenderer(setRow, setOpen) },
  ], [])

  return (
    <PageContainer className="space-y-5">
      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60">
          <h2 className="text-[14px] font-semibold text-[hsl(var(--primary))]">Caste</h2>
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
                Add Caste
              </Button>
            }
            toolbar={{ search: true, searchPlaceholder: 'Search castes…', pdfDocumentTitle: 'Castes' }}
          />
        </div>
      </div>
      <CasteModal open={open} onClose={() => { setOpen(false); setRow(null) }} row={row} onSaved={invalidate} />
    </PageContainer>
  )
}
