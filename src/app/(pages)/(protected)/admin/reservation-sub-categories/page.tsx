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
import { listSubCastes } from '@/services'
import type { SubCaste } from '@/types/sub-caste'
import ReservationSubCategoryModal from './ReservationSubCategoryModal'

const COLS = {
  siNo: { colId: 'siNo', headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<SubCaste>,
  caste: { colId: 'caste', field: 'caste', headerName: 'Reservation Category', minWidth: 150, flex: 1.1 } as ColDef<SubCaste>,
  subCaste: { colId: 'subCaste', field: 'subCaste', headerName: 'Sub Reservation Category', minWidth: 170, flex: 1.2 } as ColDef<SubCaste>,
  isEligibleForReservation: { colId: 'isEligibleForReservation', field: 'isEligibleForReservation', headerName: 'Eligibility', minWidth: 130, flex: 1 } as ColDef<SubCaste>,
  sortOrder: { colId: 'sortOrder', field: 'sortOrder', headerName: 'Sort Order', minWidth: 100, flex: 0.8 } as ColDef<SubCaste>,
  isActive: { colId: 'isActive', field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.7 } as ColDef<SubCaste>,
  actions: { colId: 'actions', headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<SubCaste>,
}

function statusRenderer(p: ICellRendererParams<SubCaste>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}
function eligibilityRenderer(p: ICellRendererParams<SubCaste>) {
  return (
    <StatusBadge
      status={p.data?.isEligibleForReservation ? 'active' : 'inactive'}
      label={p.data?.isEligibleForReservation ? 'Eligible' : 'Not Eligible'}
    />
  )
}
function actionRenderer(setRow: (r: SubCaste | null) => void, setOpen: (b: boolean) => void) {
  return (p: ICellRendererParams<SubCaste>) => (
    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setRow(p.data ?? null); setOpen(true) }}>
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

export default function ReservationSubCategoriesPage() {
  const [open, setOpen] = useState(false)
  const [row, setRow] = useState<SubCaste | null>(null)
  const { data, isLoading, invalidate } = useCrudList({ queryKey: QK.subCastes.list(), queryFn: listSubCastes })

  const columnDefs = useMemo<ColDef<SubCaste>[]>(() => [
    COLS.siNo,
    COLS.caste,
    COLS.subCaste,
    { ...COLS.isEligibleForReservation, cellRenderer: eligibilityRenderer },
    COLS.sortOrder,
    { ...COLS.isActive, cellRenderer: statusRenderer },
    { ...COLS.actions, cellRenderer: actionRenderer(setRow, setOpen) },
  ], [])

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40">
          <h2 className="app-card-title">
            Reservation Sub Categories
          </h2>
        </div>
        <div className="px-3 pb-3 pt-2">
          <DataTable
            rowData={data}
            columnDefs={columnDefs}
            loading={isLoading}
            pagination
            toolbarTrailing={(
              <Button size="sm" onClick={() => { setRow(null); setOpen(true) }}>
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Sub Reservation Category
              </Button>
            )}
            toolbar={{ search: true, searchPlaceholder: 'Search reservation sub categories…', pdfDocumentTitle: 'Reservation Sub Categories' }}
          />
        </div>
      </div>
      <ReservationSubCategoryModal
        open={open}
        onClose={() => { setOpen(false); setRow(null) }}
        row={row}
        onSaved={invalidate}
      />
    </PageContainer>
  )
}
