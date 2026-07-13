'use client'

import { useMemo, useState } from 'react'
import { PencilIcon, PlusIcon } from 'lucide-react'
import type { ColDef, ICellRendererParams, ValueGetterParams } from 'ag-grid-community'
import { EmptyState } from '@/common/components/feedback'
import { StatusBadge } from '@/common/components/data-display'
import { formatDate } from '@/common/generic-functions'
import { getErrorMessage } from '@/lib/errors'
import { ListPage } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { listVehicleRoutes } from '@/services'
import type { VehicleRoute } from '@/types/transport'
import { VehicleMapModal } from './VehicleMapModal'

function durationGetter(p: ValueGetterParams<VehicleRoute>) {
  const from = formatDate(p.data?.fromDate)
  const to = formatDate(p.data?.toDate)
  if (from === '—' && to === '—') return '—'
  return `${from} - ${to}`
}

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<VehicleRoute>,
  serviceNumber: { field: 'serviceNumber', headerName: 'Service Number', minWidth: 120 } as ColDef<VehicleRoute>,
  duration: {
    headerName: 'Duration',
    minWidth: 200,
    valueGetter: durationGetter,
  } as ColDef<VehicleRoute>,
  routeCode: { field: 'routeCode', headerName: 'Route', minWidth: 120 } as ColDef<VehicleRoute>,
  vehicleName: { field: 'vehicleName', headerName: 'Vehicle', minWidth: 140 } as ColDef<VehicleRoute>,
  driverName: { field: 'driverName', headerName: 'Driver', minWidth: 130 } as ColDef<VehicleRoute>,
  helperName: { field: 'helperName', headerName: 'Helper', minWidth: 120 } as ColDef<VehicleRoute>,
  orgCode: { field: 'orgCode', headerName: 'Organization', minWidth: 110, flex: 0 } as ColDef<VehicleRoute>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 100, flex: 0 } as ColDef<VehicleRoute>,
  actions: { headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<VehicleRoute>,
}

function statusRenderer(p: ICellRendererParams<VehicleRoute>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  setEditing: (row: VehicleRoute | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<VehicleRoute>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      aria-label="Edit vehicle route"
      onClick={() => {
        setEditing(p.data ?? null)
        setModalOpen(true)
      }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

export default function VehicleMapPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<VehicleRoute | null>(null)

  const { data: rows, isLoading, isError, error, refetch, invalidate } = useCrudList({
    queryKey: QK.transport.vehicleRoutes(),
    queryFn: listVehicleRoutes,
  })

  const columnDefs = useMemo<ColDef<VehicleRoute>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.serviceNumber,
      COL_DEFS.duration,
      COL_DEFS.routeCode,
      COL_DEFS.vehicleName,
      COL_DEFS.driverName,
      COL_DEFS.helperName,
      COL_DEFS.orgCode,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(setEditing, setModalOpen) },
    ],
    [],
  )

  return (
    <ListPage
      title="Map Vehicle Route"
      rowData={isError ? [] : rows}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: 'Search…',
        pdfDocumentTitle: 'Map Vehicle Route',
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
          Add Vehicle Route
        </Button>
      )}
      emptyState={
        isError ? (
          <EmptyState
            title="Could not load vehicle routes"
            description={getErrorMessage(error)}
            action={{ label: 'Retry', onClick: () => void refetch() }}
          />
        ) : undefined
      }
    >
      <VehicleMapModal
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
