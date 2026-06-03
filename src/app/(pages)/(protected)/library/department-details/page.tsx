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
import { listLibraryCategories } from '@/services'
import type { LibraryCategory } from '@/types/library'
import { DepartmentDetailsModal } from './DepartmentDetailsModal'

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<LibraryCategory>,
  orgCode: { field: 'orgCode', headerName: 'Org', minWidth: 90 } as ColDef<LibraryCategory>,
  bookCategoryCode: { field: 'bookCategoryCode', headerName: 'Code', minWidth: 100 } as ColDef<LibraryCategory>,
  bookCategoryName: { field: 'bookCategoryName', headerName: 'Name', minWidth: 140 } as ColDef<LibraryCategory>,
  deptNo: { field: 'deptNo', headerName: 'Dept No', minWidth: 90 } as ColDef<LibraryCategory>,
  inBarcode: { field: 'inBarcode', headerName: 'Barcode', minWidth: 100 } as ColDef<LibraryCategory>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 100, flex: 0 } as ColDef<LibraryCategory>,
  actions: { headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<LibraryCategory>,
}

function statusRenderer(p: ICellRendererParams<LibraryCategory>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  setEditing: (row: LibraryCategory | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<LibraryCategory>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      aria-label="Edit department"
      onClick={() => {
        setEditing(p.data ?? null)
        setModalOpen(true)
      }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

export default function DepartmentDetailsPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<LibraryCategory | null>(null)

  const { data: rows, isLoading: loading, invalidate } = useCrudList({
    queryKey: QK.library.libraryCategories(),
    queryFn: listLibraryCategories,
  })

  const columnDefs = useMemo<ColDef<LibraryCategory>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.orgCode,
      COL_DEFS.bookCategoryCode,
      COL_DEFS.bookCategoryName,
      COL_DEFS.deptNo,
      COL_DEFS.inBarcode,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(setEditing, setModalOpen) },
    ],
    [],
  )

  return (
    <PageContainer className="space-y-5">
      <div className="app-card overflow-hidden px-4 py-3">
        <h1 className="text-[15px] font-semibold leading-tight text-[hsl(var(--card-title))]">
          Department Details
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
            searchPlaceholder: 'Search departments…',
            pdfDocumentTitle: 'Library Department Details',
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
              Add Department
            </Button>
          )}
        />
      </TableCard>

      <DepartmentDetailsModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditing(null)
        }}
        row={editing}
        onSaved={invalidate}
      />
    </PageContainer>
  )
}
