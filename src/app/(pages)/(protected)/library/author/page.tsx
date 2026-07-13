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
import { listLibraryAuthors } from '@/services'
import type { LibraryAuthor } from '@/types/library'
import { AuthorModal } from './AuthorModal'

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<LibraryAuthor>,
  authorId: { field: 'authorId', headerName: 'ID', minWidth: 70, flex: 0 } as ColDef<LibraryAuthor>,
  orgCode: { field: 'orgCode', headerName: 'Org', minWidth: 90 } as ColDef<LibraryAuthor>,
  libraryName: { field: 'libraryName', headerName: 'Library', minWidth: 120 } as ColDef<LibraryAuthor>,
  firstName: { field: 'firstName', headerName: 'First Name', minWidth: 130 } as ColDef<LibraryAuthor>,
  lastName: { field: 'lastName', headerName: 'Last Name', minWidth: 130 } as ColDef<LibraryAuthor>,
  shortName: { field: 'shortName', headerName: 'Short Name', minWidth: 100 } as ColDef<LibraryAuthor>,
  pseudonym: { field: 'pseudonym', headerName: 'Pseudonym', minWidth: 100 } as ColDef<LibraryAuthor>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 100, flex: 0 } as ColDef<LibraryAuthor>,
  actions: { headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<LibraryAuthor>,
}

function statusRenderer(p: ICellRendererParams<LibraryAuthor>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  setEditing: (row: LibraryAuthor | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<LibraryAuthor>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      aria-label="Edit author"
      onClick={() => {
        setEditing(p.data ?? null)
        setModalOpen(true)
      }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

export default function AuthorPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<LibraryAuthor | null>(null)

  const { data: rows, isLoading: loading, invalidate } = useCrudList({
    queryKey: QK.library.authors(),
    queryFn: listLibraryAuthors,
  })

  const columnDefs = useMemo<ColDef<LibraryAuthor>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.authorId,
      COL_DEFS.orgCode,
      COL_DEFS.libraryName,
      COL_DEFS.firstName,
      COL_DEFS.lastName,
      COL_DEFS.shortName,
      COL_DEFS.pseudonym,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(setEditing, setModalOpen) },
    ],
    [],
  )

  return (
    <ListPage
      title="Author"
      rowData={rows}
      columnDefs={columnDefs}
      loading={loading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: 'Search authors…',
        pdfDocumentTitle: 'Authors',
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
          Add Author
        </Button>
      )}
    >
      <AuthorModal
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
