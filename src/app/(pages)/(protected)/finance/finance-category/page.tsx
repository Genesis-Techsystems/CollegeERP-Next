'use client'

import { useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { PencilIcon, PlusIcon } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { DataTable } from '@/common/components/table'
import { StatusBadge } from '@/common/components/data-display'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { listFinCategories } from '@/services'
import type { FinCategory } from '@/types/finance'
import FinanceCategoryModal from './FinanceCategoryModal'

const COL_DEFS = {
  siNo: { headerName: 'SI No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<FinCategory>,
  categoryName: { field: 'categoryName', headerName: 'Category Name', minWidth: 140, flex: 1 } as ColDef<FinCategory>,
  categoryCode: { field: 'categoryCode', headerName: 'Code', minWidth: 100, flex: 0.8 } as ColDef<FinCategory>,
  accounttypeCode: { field: 'accounttypeCode', headerName: 'Account Type', minWidth: 110, flex: 0.9 } as ColDef<FinCategory>,
  collegeCode: { field: 'collegeCode', headerName: 'College', minWidth: 90, flex: 0.7 } as ColDef<FinCategory>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.7 } as ColDef<FinCategory>,
  actions: { headerName: 'Edit', minWidth: 86, width: 86, flex: 0 } as ColDef<FinCategory>,
}

function statusRenderer(p: ICellRendererParams<FinCategory>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  setEditing: (row: FinCategory | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<FinCategory>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      onClick={() => { setEditing(p.data ?? null); setModalOpen(true) }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

export default function FinanceCategoryPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editData, setEditData] = useState<FinCategory | null>(null)

  const { data, isLoading, invalidate } = useCrudList<FinCategory>({
    queryKey: QK.finCategories.list(),
    queryFn: listFinCategories,
  })

  const columnDefs = useMemo<ColDef<FinCategory>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.categoryName,
      COL_DEFS.categoryCode,
      COL_DEFS.accounttypeCode,
      COL_DEFS.collegeCode,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(setEditData, setModalOpen) },
    ],
    [],
  )

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="px-3 pb-3 pt-2">
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <DataTable
              rowData={data}
              columnDefs={columnDefs}
              loading={isLoading}
              pagination
              toolbar={{ search: true, searchPlaceholder: 'Search categories…', pdfDocumentTitle: 'Finance Category' }}
              toolbarLeading={<h2 className="app-card-title">Finance Category</h2>}
              toolbarTrailing={(
                <Button size="sm" onClick={() => { setEditData(null); setModalOpen(true) }}>
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Add Category
                </Button>
              )}
            />
          </div>
        </div>
      </div>
      <FinanceCategoryModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditData(null) }}
        editData={editData}
        onSaved={invalidate}
      />
    </PageContainer>
  )
}
