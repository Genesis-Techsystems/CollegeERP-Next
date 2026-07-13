'use client'

import { useMemo, useState } from 'react'
import { PencilIcon, PlusIcon } from 'lucide-react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { EmptyState } from '@/common/components/feedback'
import { StatusBadge } from '@/common/components/data-display'
import { getErrorMessage } from '@/lib/errors'
import { ListPage } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { listTransportDetails } from '@/services'
import type { TransportDetail } from '@/types/transport'
import { TransportDetailsModal } from './TransportDetailsModal'

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<TransportDetail>,
  transportName: { field: 'transportName', headerName: 'Transport', minWidth: 160 } as ColDef<TransportDetail>,
  orgCode: { field: 'orgCode', headerName: 'Organization', minWidth: 120 } as ColDef<TransportDetail>,
  campusCode: { field: 'campusCode', headerName: 'Campus', minWidth: 120 } as ColDef<TransportDetail>,
  collegeCode: { field: 'collegeCode', headerName: 'College', minWidth: 120 } as ColDef<TransportDetail>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 100, flex: 0 } as ColDef<TransportDetail>,
  actions: { headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<TransportDetail>,
}

function statusRenderer(p: ICellRendererParams<TransportDetail>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  setEditing: (row: TransportDetail | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<TransportDetail>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      aria-label="Edit transport details"
      onClick={() => {
        setEditing(p.data ?? null)
        setModalOpen(true)
      }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

export default function TransportDetailsPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<TransportDetail | null>(null)

  const { data: rows, isLoading: loading, isError, error, refetch, invalidate } = useCrudList({
    queryKey: QK.transport.details(),
    queryFn: listTransportDetails,
  })

  const columnDefs = useMemo<ColDef<TransportDetail>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.transportName,
      COL_DEFS.orgCode,
      COL_DEFS.campusCode,
      COL_DEFS.collegeCode,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(setEditing, setModalOpen) },
    ],
    [],
  )

  return (
    <ListPage
      title="Transport Details"
      rowData={isError ? [] : rows}
      columnDefs={columnDefs}
      loading={loading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: 'Search…',
        pdfDocumentTitle: 'Transport Details',
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
          Add Transport Details
        </Button>
      )}
      emptyState={
        isError ? (
          <EmptyState
            title="Could not load transport details"
            description={getErrorMessage(error)}
            action={{ label: 'Retry', onClick: () => void refetch() }}
          />
        ) : undefined
      }
    >
      <TransportDetailsModal
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
