'use client'

import { useMemo, useState } from 'react'
import { PencilIcon, PlusIcon } from 'lucide-react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { DataTable, TableCard } from '@/common/components/table'
import { StatusBadge } from '@/common/components/data-display'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { listFeeCategories } from '@/services'
import type { FeeCategory } from '@/types/fee-category'
import { FeeCategoryModal } from './FeeCategoryModal'

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<FeeCategory>,
  feeCategoryCode: { field: 'feeCategoryCode', headerName: 'Category Code', minWidth: 130, flex: 0.9 } as ColDef<FeeCategory>,
  categoryName: { field: 'categoryName', headerName: 'Category Name', minWidth: 180, flex: 1.2 } as ColDef<FeeCategory>,
  collegeCode: { field: 'collegeCode', headerName: 'College', minWidth: 110, flex: 0.8 } as ColDef<FeeCategory>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 100, flex: 0 } as ColDef<FeeCategory>,
  actions: { headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<FeeCategory>,
}

function statusRenderer(p: ICellRendererParams<FeeCategory>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  setEditing: (row: FeeCategory | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<FeeCategory>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      aria-label="Edit fee category"
      onClick={() => {
        setEditing(p.data ?? null)
        setModalOpen(true)
      }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

export default function FeeCategoriesPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<FeeCategory | null>(null)

  const { data: rows, isLoading: loading, invalidate } = useCrudList({
    queryKey: QK.feeCategories.list(),
    queryFn: listFeeCategories,
  })

  const columnDefs = useMemo<ColDef<FeeCategory>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.feeCategoryCode,
      COL_DEFS.categoryName,
      COL_DEFS.collegeCode,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(setEditing, setModalOpen) },
    ],
    [],
  )

  return (
    <PageContainer className="space-y-5">
      <div className="app-card overflow-hidden px-4 py-3">
        <h1 className="text-[15px] font-semibold leading-tight text-[hsl(var(--card-title))]">
          Fee Categories
        </h1>
      </div>

      <TableCard withHeaderBorder={false}>
        <DataTable
          rowData={rows}
          columnDefs={columnDefs}
          loading={loading}
          pagination
          toolbar={{
            search: true,
            searchPlaceholder: 'Search fee categories…',
            pdfDocumentTitle: 'Fee Categories',
          }}
          toolbarTrailing={(
            <Button
              size="sm"
              className="h-[30px] px-3 text-[12px]"
              onClick={() => {
                setEditing(null)
                setModalOpen(true)
              }}
            >
              <PlusIcon className="h-3.5 w-3.5 mr-1.5" />
              Add Fee Category
            </Button>
          )}
        />
      </TableCard>

      <FeeCategoryModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditing(null)
        }}
        category={editing}
        onSaved={invalidate}
      />
    </PageContainer>
  )
}
