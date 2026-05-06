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
import { listDesignations } from '@/services'
import type { Designation } from '@/types/designation'
import DesignationModal from './DesignationModal'

const COLS = {
  siNo: { colId: 'siNo', headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<Designation>,
  orgName: { colId: 'orgName', headerName: 'Organization', minWidth: 130, flex: 1 } as ColDef<Designation>,
  designationName: { colId: 'designationName', field: 'designationName', headerName: 'Designation Name', minWidth: 180, flex: 1.2 } as ColDef<Designation>,
  isActive: { colId: 'isActive', field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.7 } as ColDef<Designation>,
  actions: { colId: 'actions', headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<Designation>,
}

function statusRenderer(p: ICellRendererParams<Designation>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}
function actionRenderer(setRow: (r: Designation | null) => void, setOpen: (b: boolean) => void) {
  return (p: ICellRendererParams<Designation>) => (
    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setRow(p.data ?? null); setOpen(true) }}>
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

export default function DesignationsPage() {
  const [open, setOpen] = useState(false)
  const [row, setRow] = useState<Designation | null>(null)
  const { data, isLoading, invalidate } = useCrudList({
    queryKey: QK.designations.list(),
    queryFn: listDesignations,
  })

  const columnDefs = useMemo<ColDef<Designation>[]>(() => [
    COLS.siNo,
    { ...COLS.orgName, valueGetter: (p) => p.data?.orgName ?? p.data?.orgCode ?? '-' },
    COLS.designationName,
    { ...COLS.isActive, cellRenderer: statusRenderer },
    { ...COLS.actions, cellRenderer: actionRenderer(setRow, setOpen) },
  ], [])

  return (
    <PageContainer className="space-y-5">
      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60">
          <h2 className="text-[14px] font-semibold text-[hsl(var(--primary))]">
            Designations
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
                Add Designation
              </Button>
            )}
            toolbar={{ search: true, searchPlaceholder: 'Search designations…', pdfDocumentTitle: 'Designations' }}
          />
        </div>
      </div>
      <DesignationModal
        open={open}
        onClose={() => { setOpen(false); setRow(null) }}
        row={row}
        onSaved={invalidate}
      />
    </PageContainer>
  )
}
