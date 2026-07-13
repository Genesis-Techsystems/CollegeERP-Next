'use client'

import { useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { PencilIcon, PlusIcon } from 'lucide-react'
import { ListPage } from '@/components/layout'

import { StatusBadge } from '@/common/components/data-display'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { listFinSubCategories } from '@/services'
import type { FinSubCategory } from '@/types/finance'
import FinanceSubCategoryModal from './FinanceSubCategoryModal'

const COL_DEFS = {
  siNo: { headerName: 'SI No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<FinSubCategory>,
  collegeCode: { field: 'collegeCode', headerName: 'College', minWidth: 90, flex: 0.7 } as ColDef<FinSubCategory>,
  subCategoryName: { field: 'subCategoryName', headerName: 'Sub Category', minWidth: 140, flex: 1 } as ColDef<FinSubCategory>,
  finCategoryId: { field: 'finCategoryId', headerName: 'Category ID', minWidth: 100, flex: 0.7 } as ColDef<FinSubCategory>,
  subCategoryDescription: { field: 'subCategoryDescription', headerName: 'Description', minWidth: 160, flex: 1.1 } as ColDef<FinSubCategory>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.7 } as ColDef<FinSubCategory>,
  actions: { headerName: 'Edit', minWidth: 86, width: 86, flex: 0 } as ColDef<FinSubCategory>,
}

function statusRenderer(p: ICellRendererParams<FinSubCategory>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  setEditing: (row: FinSubCategory | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<FinSubCategory>) => (
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

export default function FinanceSubCategoryPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editData, setEditData] = useState<FinSubCategory | null>(null)

  const { data, isLoading, invalidate } = useCrudList<FinSubCategory>({
    queryKey: QK.finSubCategories.list(),
    queryFn: listFinSubCategories,
  })

  const columnDefs = useMemo<ColDef<FinSubCategory>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.collegeCode,
      COL_DEFS.subCategoryName,
      COL_DEFS.finCategoryId,
      COL_DEFS.subCategoryDescription,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(setEditData, setModalOpen) },
    ],
    [],
  )

  return (
    <ListPage
              title="Finance Sub Category"
              rowData={data}
              columnDefs={columnDefs}
              loading={isLoading}
              pagination
              toolbar={{ search: true, searchPlaceholder: 'Search sub-categories…', pdfDocumentTitle: 'Finance Sub Category' }}
              toolbarTrailing={(
                <Button size="sm" onClick={() => { setEditData(null); setModalOpen(true) }}>
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Add Sub Category
                </Button>
              )}
            >
      <FinanceSubCategoryModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditData(null) }}
        editData={editData}
        onSaved={invalidate}
      />
    </ListPage>
  )
}
