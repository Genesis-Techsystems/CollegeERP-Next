'use client'

import { useMemo, useState } from 'react'
import { PencilIcon, PlusIcon } from 'lucide-react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { DataTable, TableCard } from '@/common/components/table'
import { EmptyState } from '@/common/components/feedback'
import { StatusBadge } from '@/common/components/data-display'
import { getErrorMessage } from '@/lib/errors'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { listLibraryDetails } from '@/services'
import type { LibraryDetail } from '@/types/library'
import { LibraryDetailsModal } from './LibraryDetailsModal'

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<LibraryDetail>,
  libraryId: { field: 'libraryId', headerName: 'ID', minWidth: 70, flex: 0 } as ColDef<LibraryDetail>,
  orgCode: { field: 'orgCode', headerName: 'Org', minWidth: 90 } as ColDef<LibraryDetail>,
  campusCode: { field: 'campusCode', headerName: 'Campus', minWidth: 90 } as ColDef<LibraryDetail>,
  collegeCode: { field: 'collegeCode', headerName: 'College', minWidth: 100 } as ColDef<LibraryDetail>,
  libraryCode: { field: 'libraryCode', headerName: 'Code', minWidth: 100 } as ColDef<LibraryDetail>,
  libraryName: { field: 'libraryName', headerName: 'Library', minWidth: 140 } as ColDef<LibraryDetail>,
  roomName: { field: 'roomName', headerName: 'Room', minWidth: 110 } as ColDef<LibraryDetail>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 100, flex: 0 } as ColDef<LibraryDetail>,
  actions: { headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<LibraryDetail>,
}

function statusRenderer(p: ICellRendererParams<LibraryDetail>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  setEditing: (row: LibraryDetail | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<LibraryDetail>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      aria-label="Edit library"
      onClick={() => {
        setEditing(p.data ?? null)
        setModalOpen(true)
      }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

export default function LibraryDetailsPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<LibraryDetail | null>(null)

  const { data: rows, isLoading: loading, isError, error, refetch, invalidate } = useCrudList({
    queryKey: QK.library.details(),
    queryFn: listLibraryDetails,
  })

  const columnDefs = useMemo<ColDef<LibraryDetail>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.libraryId,
      COL_DEFS.orgCode,
      COL_DEFS.campusCode,
      COL_DEFS.collegeCode,
      COL_DEFS.libraryCode,
      COL_DEFS.libraryName,
      COL_DEFS.roomName,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(setEditing, setModalOpen) },
    ],
    [],
  )

  return (
    <PageContainer className="space-y-5">
      <div className="app-card overflow-hidden px-4 py-3">
        <h1 className="text-[15px] font-semibold leading-tight text-[hsl(var(--card-title))]">
          Library Details
        </h1>
      </div>

      <TableCard withHeaderBorder={false}>
        {isError ? (
          <EmptyState
            title="Could not load library details"
            description={getErrorMessage(error)}
            action={{ label: 'Retry', onClick: () => void refetch() }}
          />
        ) : (
          <DataTable
            rowData={rows}
            columnDefs={columnDefs}
            loading={loading}
            pagination
            toolbar={{
              search: true,
              searchPlaceholder: 'Search libraries…',
              pdfDocumentTitle: 'Library Details',
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
                Add Library
              </Button>
            )}
          />
        )}
      </TableCard>

      <LibraryDetailsModal
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
