'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeftIcon, PencilIcon, PlusIcon } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { DataTable, TableCard } from '@/common/components/table'
import { EmptyState } from '@/common/components/feedback'
import { StatusBadge } from '@/common/components/data-display'
import { getErrorMessage } from '@/lib/errors'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { listRouteStopsByRoute } from '@/services'
import type { RouteStop } from '@/types/transport'
import { TransportPageTitle } from '../_components/TransportPageTitle'
import { formatTransportTime } from '../_lib/format-transport-time'
import { RouteStopModal } from './RouteStopModal'

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<RouteStop>,
  stopName: { field: 'stopName', headerName: 'Stop', minWidth: 140 } as ColDef<RouteStop>,
  distanceFromSchoolKm: {
    field: 'distanceFromSchoolKm',
    headerName: 'Distance (km)',
    minWidth: 110,
    flex: 0,
  } as ColDef<RouteStop>,
  pickTime: {
    field: 'pickTime',
    headerName: 'Pick',
    minWidth: 90,
    valueFormatter: (p) => formatTransportTime(p.value),
  } as ColDef<RouteStop>,
  dropTime: {
    field: 'dropTime',
    headerName: 'Drop',
    minWidth: 90,
    valueFormatter: (p) => formatTransportTime(p.value),
  } as ColDef<RouteStop>,
  feeFrequencyCode: { field: 'feeFrequencyCode', headerName: 'Frequency', minWidth: 100 } as ColDef<RouteStop>,
  amount: { field: 'amount', headerName: 'Amount', minWidth: 90, flex: 0 } as ColDef<RouteStop>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 100, flex: 0 } as ColDef<RouteStop>,
  actions: { headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<RouteStop>,
}

function statusRenderer(p: ICellRendererParams<RouteStop>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  setEditing: (row: RouteStop | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<RouteStop>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      aria-label="Edit route stop"
      onClick={() => {
        setEditing(p.data ?? null)
        setModalOpen(true)
      }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

export default function RouteStopsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const routeId = Number(searchParams.get('routeId') ?? 0)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<RouteStop | null>(null)

  const { data: rows = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: QK.transport.routeStops(routeId),
    queryFn: () => listRouteStopsByRoute(routeId),
    enabled: routeId > 0,
  })

  const columnDefs = useMemo<ColDef<RouteStop>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.stopName,
      COL_DEFS.distanceFromSchoolKm,
      COL_DEFS.pickTime,
      COL_DEFS.dropTime,
      COL_DEFS.feeFrequencyCode,
      COL_DEFS.amount,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(setEditing, setModalOpen) },
    ],
    [],
  )

  if (!routeId) {
    return (
      <PageContainer className="space-y-5">
        <EmptyState
          title="No route selected"
          description="Open route stops from the Route list using the map icon."
          action={{ label: 'Go to Routes', onClick: () => router.push('/transport/route') }}
        />
      </PageContainer>
    )
  }

  return (
    <PageContainer className="space-y-5">
      <TransportPageTitle title={`Route Stops (Route #${routeId})`}>
        <Button size="sm" variant="outline" onClick={() => router.back()}>
          <ArrowLeftIcon className="h-3.5 w-3.5 mr-1.5" />
          Back
        </Button>
      </TransportPageTitle>

      <TableCard withHeaderBorder={false}>
        {isError ? (
          <EmptyState
            title="Could not load route stops"
            description={getErrorMessage(error)}
            action={{ label: 'Retry', onClick: () => void refetch() }}
          />
        ) : (
          <DataTable
            rowData={rows}
            columnDefs={columnDefs}
            loading={isLoading}
            pagination
            toolbar={{
              search: true,
              searchPlaceholder: 'Search stops…',
              pdfDocumentTitle: 'Route Stops',
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
                Add Stop
              </Button>
            )}
          />
        )}
      </TableCard>

      <RouteStopModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditing(null)
        }}
        row={editing}
        routeId={routeId}
        onSaved={() => void refetch()}
      />
    </PageContainer>
  )
}
