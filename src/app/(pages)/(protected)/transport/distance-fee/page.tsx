'use client'

import { useMemo, useState } from 'react'
import { PencilIcon, PlusIcon } from 'lucide-react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { EmptyState } from '@/common/components/feedback'
import { StatusBadge } from '@/common/components/data-display'
import { formatDate } from '@/common/generic-functions'
import { getErrorMessage } from '@/lib/errors'
import { ListPage } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { listDistanceFees } from '@/services'
import type { DistanceFee } from '@/types/transport'
import { DistanceFeeModal } from './DistanceFeeModal'

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<DistanceFee>,
  fromKm: { field: 'fromKm', headerName: 'From Km', minWidth: 90, flex: 0 } as ColDef<DistanceFee>,
  toKm: { field: 'toKm', headerName: 'To Km', minWidth: 90, flex: 0 } as ColDef<DistanceFee>,
  feeFrequencyDisplayName: {
    field: 'feeFrequencyDisplayName',
    headerName: 'Frequency',
    minWidth: 120,
  } as ColDef<DistanceFee>,
  amount: { field: 'amount', headerName: 'Amount', minWidth: 90, flex: 0 } as ColDef<DistanceFee>,
  transportName: { field: 'transportName', headerName: 'Transport', minWidth: 120 } as ColDef<DistanceFee>,
  fromDate: {
    field: 'fromDate',
    headerName: 'From Date',
    minWidth: 110,
    valueFormatter: (p) => formatDate(p.value),
  } as ColDef<DistanceFee>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 100, flex: 0 } as ColDef<DistanceFee>,
  actions: { headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<DistanceFee>,
}

function statusRenderer(p: ICellRendererParams<DistanceFee>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  setEditing: (row: DistanceFee | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<DistanceFee>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      aria-label="Edit"
      onClick={() => {
        setEditing(p.data ?? null)
        setModalOpen(true)
      }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

export default function DistanceFeePage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<DistanceFee | null>(null)

  const { data: rows, isLoading, isError, error, refetch, invalidate } = useCrudList({
    queryKey: QK.transport.distanceFees(),
    queryFn: listDistanceFees,
  })

  const columnDefs = useMemo<ColDef<DistanceFee>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.fromKm,
      COL_DEFS.toKm,
      COL_DEFS.feeFrequencyDisplayName,
      COL_DEFS.amount,
      COL_DEFS.transportName,
      COL_DEFS.fromDate,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(setEditing, setModalOpen) },
    ],
    [],
  )

  return (
    <ListPage
      title="Distance Fee"
      rowData={isError ? [] : rows}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: 'Search…',
        pdfDocumentTitle: 'Distance Fees',
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
          Add Distance Fee
        </Button>
      )}
      emptyState={
        isError ? (
          <EmptyState
            title="Could not load distance fees"
            description={getErrorMessage(error)}
            action={{ label: 'Retry', onClick: () => void refetch() }}
          />
        ) : undefined
      }
    >
      <DistanceFeeModal
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
