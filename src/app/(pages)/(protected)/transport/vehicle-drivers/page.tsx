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
import { listVehicleDrivers } from '@/services'
import type { VehicleDriver } from '@/types/transport'
import { VehicleDriverModal } from './VehicleDriverModal'

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<VehicleDriver>,
  vehicleName: { field: 'vehicleName', headerName: 'Vehicle', minWidth: 120 } as ColDef<VehicleDriver>,
  driverName: { field: 'driverName', headerName: 'Driver', minWidth: 120 } as ColDef<VehicleDriver>,
  helperName: { field: 'helperName', headerName: 'Helper', minWidth: 120 } as ColDef<VehicleDriver>,
  orgName: { field: 'orgName', headerName: 'Organization', minWidth: 110 } as ColDef<VehicleDriver>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 100, flex: 0 } as ColDef<VehicleDriver>,
  actions: { headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<VehicleDriver>,
}

function statusRenderer(p: ICellRendererParams<VehicleDriver>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  setEditing: (row: VehicleDriver | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<VehicleDriver>) => (
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

export default function VehicleDriversPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<VehicleDriver | null>(null)

  const { data: rows, isLoading, isError, error, refetch, invalidate } = useCrudList({
    queryKey: QK.transport.vehicleDrivers(),
    queryFn: listVehicleDrivers,
  })

  const columnDefs = useMemo<ColDef<VehicleDriver>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.vehicleName,
      COL_DEFS.driverName,
      COL_DEFS.helperName,
      COL_DEFS.orgName,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(setEditing, setModalOpen) },
    ],
    [],
  )

  return (
    <ListPage
      title="Map Vehicle Driver"
      rowData={isError ? [] : rows}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: 'Search…',
        pdfDocumentTitle: 'Vehicle Drivers',
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
          Assign
        </Button>
      )}
      emptyState={
        isError ? (
          <EmptyState
            title="Could not load vehicle drivers"
            description={getErrorMessage(error)}
            action={{ label: 'Retry', onClick: () => void refetch() }}
          />
        ) : undefined
      }
    >
      <VehicleDriverModal
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
