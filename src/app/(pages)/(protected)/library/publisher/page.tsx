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
import { listLibraryPublishers } from '@/services'
import type { LibraryPublisher } from '@/types/library'
import { PublisherModal } from './PublisherModal'

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<LibraryPublisher>,
  publisherId: { field: 'publisherId', headerName: 'ID', minWidth: 70, flex: 0 } as ColDef<LibraryPublisher>,
  libraryName: { field: 'libraryName', headerName: 'Library', minWidth: 120 } as ColDef<LibraryPublisher>,
  publishername: { field: 'publishername', headerName: 'Publisher', minWidth: 160 } as ColDef<LibraryPublisher>,
  shortName: { field: 'shortName', headerName: 'Short Name', minWidth: 110 } as ColDef<LibraryPublisher>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 100, flex: 0 } as ColDef<LibraryPublisher>,
  actions: { headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<LibraryPublisher>,
}

function statusRenderer(p: ICellRendererParams<LibraryPublisher>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  setEditing: (row: LibraryPublisher | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<LibraryPublisher>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      aria-label="Edit publisher"
      onClick={() => {
        setEditing(p.data ?? null)
        setModalOpen(true)
      }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

export default function PublisherPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<LibraryPublisher | null>(null)

  const { data: rows, isLoading: loading, invalidate } = useCrudList({
    queryKey: QK.library.publishers(),
    queryFn: listLibraryPublishers,
  })

  const columnDefs = useMemo<ColDef<LibraryPublisher>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.publisherId,
      COL_DEFS.libraryName,
      COL_DEFS.publishername,
      COL_DEFS.shortName,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(setEditing, setModalOpen) },
    ],
    [],
  )

  return (
    <ListPage
      title="Publisher"
      rowData={rows}
      columnDefs={columnDefs}
      loading={loading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: 'Search publishers…',
        pdfDocumentTitle: 'Publishers',
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
          Add Publisher
        </Button>
      )}
    >
      <PublisherModal
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
