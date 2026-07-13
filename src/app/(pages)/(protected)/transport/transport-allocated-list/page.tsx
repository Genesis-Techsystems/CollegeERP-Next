'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PencilIcon } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { EmptyState } from '@/common/components/feedback'
import { StatusBadge } from '@/common/components/data-display'
import { formatDate } from '@/common/generic-functions'
import { getErrorMessage } from '@/lib/errors'
import { ListPage } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { listTransportAllocations } from '@/services'
import type { TransportAllocation, TransportAllocationFor } from '@/types/transport'
import { EditTransportAllocationModal } from './EditTransportAllocationModal'

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<TransportAllocation>,
  firstName: {
    field: 'firstName',
    headerName: 'Name',
    minWidth: 150,
    valueGetter: (p) => p.data?.firstName ?? p.data?.stdFirstName ?? '—',
  } as ColDef<TransportAllocation>,
  allocationFor: { field: 'allocationFor', headerName: 'For', minWidth: 70, flex: 0 } as ColDef<TransportAllocation>,
  academicYear: { field: 'academicYear', headerName: 'Academic Year', minWidth: 120 } as ColDef<TransportAllocation>,
  pickupRouteStopName: {
    field: 'pickupRouteStopName',
    headerName: 'Pickup Stop',
    minWidth: 140,
  } as ColDef<TransportAllocation>,
  fromDate: {
    field: 'fromDate',
    headerName: 'From',
    minWidth: 110,
    valueFormatter: (p) => formatDate(p.value),
  } as ColDef<TransportAllocation>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 100, flex: 0 } as ColDef<TransportAllocation>,
  actions: { headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<TransportAllocation>,
}

function statusRenderer(p: ICellRendererParams<TransportAllocation>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  setEditing: (row: TransportAllocation | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<TransportAllocation>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      aria-label="Edit allocation"
      onClick={() => {
        setEditing(p.data ?? null)
        setModalOpen(true)
      }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

export default function TransportAllocatedListPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const forType: TransportAllocationFor =
    searchParams.get('check') === '2' ? 'E' : 'S'
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<TransportAllocation | null>(null)

  const { data: rows = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: QK.transport.allocations(forType),
    queryFn: () => listTransportAllocations(forType),
  })

  const columnDefs = useMemo<ColDef<TransportAllocation>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.firstName,
      COL_DEFS.allocationFor,
      COL_DEFS.academicYear,
      COL_DEFS.pickupRouteStopName,
      COL_DEFS.fromDate,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(setEditing, setModalOpen) },
    ],
    [],
  )

  return (
    <ListPage
      title="Transport Allocated List"
      rowData={isError ? [] : rows}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: 'Search allocations…',
        pdfDocumentTitle: 'Transport Allocations',
      }}
      toolbarTrailing={
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={forType === 'S' ? 'default' : 'outline'}
            onClick={() => router.push('/transport/transport-allocated-list?check=1')}
          >
            Students
          </Button>
          <Button
            size="sm"
            variant={forType === 'E' ? 'default' : 'outline'}
            onClick={() => router.push('/transport/transport-allocated-list?check=2')}
          >
            Employees
          </Button>
        </div>
      }
      emptyState={
        isError ? (
          <EmptyState
            title="Could not load allocations"
            description={getErrorMessage(error)}
            action={{ label: 'Retry', onClick: () => void refetch() }}
          />
        ) : undefined
      }
    >
      <EditTransportAllocationModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditing(null)
        }}
        row={editing}
        onSaved={() => void refetch()}
      />
    </ListPage>
  )
}
