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
import { listVehicles } from '@/services'
import type { VehicleDetail } from '@/types/transport'
import { VehicleModal } from './VehicleModal'

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<VehicleDetail>,
  vehicleNumber: { field: 'vehicleNumber', headerName: 'Vehicle No.', minWidth: 120 } as ColDef<VehicleDetail>,
  vehicleName: { field: 'vehicleName', headerName: 'Vehicle Name', minWidth: 140 } as ColDef<VehicleDetail>,
  noOfSeats: { field: 'noOfSeats', headerName: 'Seats', minWidth: 80, flex: 0 } as ColDef<VehicleDetail>,
  maximumAllowed: { field: 'maximumAllowed', headerName: 'Max Allowed', minWidth: 100, flex: 0 } as ColDef<VehicleDetail>,
  availableSeats: { field: 'availableSeats', headerName: 'Available', minWidth: 90, flex: 0 } as ColDef<VehicleDetail>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 100, flex: 0 } as ColDef<VehicleDetail>,
  actions: { headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<VehicleDetail>,
}

function statusRenderer(p: ICellRendererParams<VehicleDetail>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  setEditing: (row: VehicleDetail | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<VehicleDetail>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      aria-label="Edit vehicle"
      onClick={() => {
        setEditing(p.data ?? null)
        setModalOpen(true)
      }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

export default function VehiclePage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<VehicleDetail | null>(null)

  const { data: rows, isLoading, isError, error, refetch, invalidate } = useCrudList({
    queryKey: QK.transport.vehicles(),
    queryFn: listVehicles,
  })

  const columnDefs = useMemo<ColDef<VehicleDetail>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.vehicleNumber,
      COL_DEFS.vehicleName,
      COL_DEFS.noOfSeats,
      COL_DEFS.maximumAllowed,
      COL_DEFS.availableSeats,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(setEditing, setModalOpen) },
    ],
    [],
  )

  return (
    <ListPage
      title="Vehicle"
      rowData={isError ? [] : rows}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: 'Search vehicles…',
        pdfDocumentTitle: 'Vehicles',
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
          Add Vehicle
        </Button>
      )}
      emptyState={
        isError ? (
          <EmptyState
            title="Could not load vehicles"
            description={getErrorMessage(error)}
            action={{ label: 'Retry', onClick: () => void refetch() }}
          />
        ) : undefined
      }
    >
      <VehicleModal
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
