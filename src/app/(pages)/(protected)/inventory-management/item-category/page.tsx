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
import { listInvItemCategories } from '@/services'
import type { InvItemCategory } from '@/types/inventory'
import ItemCategoryModal from './ItemCategoryModal'

const COL_DEFS = {
  siNo: { headerName: 'SI No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<InvItemCategory>,
  orgCode: { field: 'orgCode', headerName: 'Organisation', minWidth: 120, flex: 1 } as ColDef<InvItemCategory>,
  categoryCode: { field: 'categoryCode', headerName: 'Category Code', minWidth: 120, flex: 0.9 } as ColDef<InvItemCategory>,
  categoryName: { field: 'categoryName', headerName: 'Category Name', minWidth: 160, flex: 1.2 } as ColDef<InvItemCategory>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.7 } as ColDef<InvItemCategory>,
  actions: { headerName: 'Edit', minWidth: 86, width: 86, flex: 0 } as ColDef<InvItemCategory>,
}

function statusRenderer(p: ICellRendererParams<InvItemCategory>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  setEditing: (row: InvItemCategory | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<InvItemCategory>) => (
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

export default function ItemCategoryPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editData, setEditData] = useState<InvItemCategory | null>(null)

  const { data, isLoading, invalidate } = useCrudList<InvItemCategory>({
    queryKey: QK.invItemCategories.list(),
    queryFn: listInvItemCategories,
  })

  const columnDefs = useMemo<ColDef<InvItemCategory>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.orgCode,
      COL_DEFS.categoryCode,
      COL_DEFS.categoryName,
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
              toolbar={{ search: true, searchPlaceholder: 'Search categories…', pdfDocumentTitle: 'Item Category' }}
              toolbarLeading={<h2 className="app-card-title">Item Category</h2>}
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
      <ItemCategoryModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditData(null) }}
        editData={editData}
        onSaved={invalidate}
      />
    </PageContainer>
  )
}
