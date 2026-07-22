'use client'

import { useMemo, useState } from 'react'
import { PencilIcon, PlusIcon } from 'lucide-react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { StatusBadge } from '@/common/components/data-display'
import { ListPage } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { listLibraryCategories } from '@/services'
import type { LibraryCategory } from '@/types/library'
import { DepartmentDetailsModal } from './DepartmentDetailsModal'

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<LibraryCategory>,
  orgCode: { field: 'orgCode', headerName: 'Organization', minWidth: 120 } as ColDef<LibraryCategory>,
  bookCategoryCode: {
    field: 'bookCategoryCode',
    headerName: 'Book Department Code',
    minWidth: 160,
  } as ColDef<LibraryCategory>,
  bookCategoryName: {
    field: 'bookCategoryName',
    headerName: 'Book Department Name',
    minWidth: 160,
  } as ColDef<LibraryCategory>,
  deptNo: { field: 'deptNo', headerName: 'Dept No', minWidth: 90 } as ColDef<LibraryCategory>,
  inBarcode: { field: 'inBarcode', headerName: 'In Barcode', minWidth: 110 } as ColDef<LibraryCategory>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 100, flex: 0 } as ColDef<LibraryCategory>,
  actions: { headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<LibraryCategory>,
}

function statusRenderer(p: ICellRendererParams<LibraryCategory>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function inBarcodeRenderer(p: ICellRendererParams<LibraryCategory>) {
  const value = p.data?.inBarcode
  if (value === true) return 'true'
  if (value === false) return 'false'
  return ''
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
      { ...COL_DEFS.inBarcode, cellRenderer: inBarcodeRenderer },
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(setEditing, setModalOpen) },
    ],
    [],
  )

  return (
    <ListPage
      title="Department Details"
      rowData={rows}
      columnDefs={columnDefs}
      loading={loading}
      pagination
      paginationPageSize={10}
      toolbar={{
        search: true,
        searchPlaceholder: 'Search',
        pdfDocumentTitle: 'Library Department Details',
      }}
      toolbarTrailing={(
        <Button
          size="sm"
          onClick={() => {
            setEditing(null)
            setModalOpen(true)
          }}
        >
          <PlusIcon className="h-4 w-4 mr-1" />
          Add Department Details
        </Button>
      )}
    >
      <DepartmentDetailsModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditing(null)
        }}
        row={editing}
        onSaved={invalidate}
      />
    </ListPage>
  )
}
