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
import { listInvItemSubCategories } from '@/services'
import type { InvItemSubCategory } from '@/types/inventory'
import ItemSubCategoryModal from './ItemSubCategoryModal'

const COL_DEFS = {
  siNo: { headerName: 'SI No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<InvItemSubCategory>,
  orgCode: { field: 'orgCode', headerName: 'Organisation', minWidth: 120, flex: 1 } as ColDef<InvItemSubCategory>,
  categoryName: { field: 'categoryName', headerName: 'Category', minWidth: 140, flex: 1 } as ColDef<InvItemSubCategory>,
  subcategoryCode: { field: 'subcategoryCode', headerName: 'Subcategory Code', minWidth: 120, flex: 0.9 } as ColDef<InvItemSubCategory>,
  subcategoryName: { field: 'subcategoryName', headerName: 'Subcategory Name', minWidth: 160, flex: 1.2 } as ColDef<InvItemSubCategory>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.7 } as ColDef<InvItemSubCategory>,
  actions: { headerName: 'Edit', minWidth: 86, width: 86, flex: 0 } as ColDef<InvItemSubCategory>,
}

function statusRenderer(p: ICellRendererParams<InvItemSubCategory>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  setEditing: (row: InvItemSubCategory | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<InvItemSubCategory>) => (
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

export default function ItemSubCategoryPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editData, setEditData] = useState<InvItemSubCategory | null>(null)

  const { data, isLoading, invalidate } = useCrudList<InvItemSubCategory>({
    queryKey: QK.invItemSubCategories.list(),
    queryFn: listInvItemSubCategories,
  })

  const columnDefs = useMemo<ColDef<InvItemSubCategory>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.orgCode,
      COL_DEFS.categoryName,
      COL_DEFS.subcategoryCode,
      COL_DEFS.subcategoryName,
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
              toolbar={{ search: true, searchPlaceholder: 'Search sub-categories…', pdfDocumentTitle: 'Item Sub Category' }}
              toolbarLeading={<h2 className="app-card-title">Item Sub Category</h2>}
              toolbarTrailing={(
                <Button size="sm" onClick={() => { setEditData(null); setModalOpen(true) }}>
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Add Sub Category
                </Button>
              )}
            />
          </div>
        </div>
      </div>
      <ItemSubCategoryModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditData(null) }}
        editData={editData}
        onSaved={invalidate}
      />
    </PageContainer>
  )
}
