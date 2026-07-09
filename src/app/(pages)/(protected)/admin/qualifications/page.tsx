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
import { getCrudModalKey, rowIndexGetter } from '@/lib/utils'
import { listQualifications } from '@/services'
import type { Qualification } from '@/types/qualification'
import QualificationModal from './QualificationModal'

const COLS = {
  siNo: { colId: 'siNo', headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<Qualification>,
  orgCode: { colId: 'orgCode', headerName: 'Organization', minWidth: 130, flex: 1 } as ColDef<Qualification>,
  qualificationCode: { colId: 'qualificationCode', field: 'qualificationCode', headerName: 'Qualification Code', minWidth: 150, flex: 1 } as ColDef<Qualification>,
  qualificationName: { colId: 'qualificationName', field: 'qualificationName', headerName: 'Qualification Name', minWidth: 180, flex: 1.2 } as ColDef<Qualification>,
  sortOrder: { colId: 'sortOrder', field: 'sortOrder', headerName: 'Sort Order', minWidth: 100, flex: 0.8 } as ColDef<Qualification>,
  isActive: { colId: 'isActive', field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.7 } as ColDef<Qualification>,
  actions: { colId: 'actions', headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<Qualification>,
}

function statusRenderer(p: ICellRendererParams<Qualification>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}
function actionRenderer(setRow: (r: Qualification | null) => void, setOpen: (b: boolean) => void) {
  return (p: ICellRendererParams<Qualification>) => (
    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setRow(p.data ?? null); setOpen(true) }}>
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

export default function QualificationsPage() {
  const [open, setOpen] = useState(false)
  const [row, setRow] = useState<Qualification | null>(null)
  const { data, isLoading, invalidate } = useCrudList({
    queryKey: QK.qualifications.list(),
    queryFn: listQualifications,
  })

  const columnDefs = useMemo<ColDef<Qualification>[]>(() => [
    COLS.siNo,
    { ...COLS.orgCode, valueGetter: (p) => p.data?.orgCode ?? p.data?.orgName ?? '-' },
    COLS.qualificationCode,
    COLS.qualificationName,
    COLS.sortOrder,
    { ...COLS.isActive, cellRenderer: statusRenderer },
    { ...COLS.actions, cellRenderer: actionRenderer(setRow, setOpen) },
  ], [])

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40">
          <h2 className="app-card-title">
            Qualifications
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
                Add Qualification
              </Button>
            )}
            toolbar={{ search: true, searchPlaceholder: 'Search qualifications…', pdfDocumentTitle: 'Qualifications' }}
          />
        </div>
      </div>
      <QualificationModal
        key={getCrudModalKey(row, open, 'qualificationId')}
        open={open}
        onClose={() => { setOpen(false); setRow(null) }}
        row={row}
        onSaved={invalidate}
      />
    </PageContainer>
  )
}
