'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapPinIcon, PencilIcon, PlusIcon } from 'lucide-react'
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
import { listRoutes } from '@/services'
import type { TransportRoute } from '@/types/transport'
import { TransportPageTitle } from '../_components/TransportPageTitle'
import { RouteModal } from './RouteModal'

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<TransportRoute>,
  serviceNumber: { field: 'serviceNumber', headerName: 'Service No.', minWidth: 120 } as ColDef<TransportRoute>,
  routeCode: { field: 'routeCode', headerName: 'Route Code', minWidth: 110 } as ColDef<TransportRoute>,
  routePickupPlace: { field: 'routePickupPlace', headerName: 'Pickup', minWidth: 140 } as ColDef<TransportRoute>,
  routeDropPlace: { field: 'routeDropPlace', headerName: 'Drop', minWidth: 140 } as ColDef<TransportRoute>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 100, flex: 0 } as ColDef<TransportRoute>,
  actions: { headerName: 'Actions', minWidth: 120, width: 120, flex: 0 } as ColDef<TransportRoute>,
}

function statusRenderer(p: ICellRendererParams<TransportRoute>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  router: ReturnType<typeof useRouter>,
  setEditing: (row: TransportRoute | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<TransportRoute>) => (
    <div className="flex items-center gap-1">
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0"
        aria-label="Route stops"
        onClick={() => {
          const id = p.data?.routeId
          if (id) router.push(`/transport/route-stops?routeId=${id}`)
        }}
      >
        <MapPinIcon className="h-3.5 w-3.5" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0"
        aria-label="Edit route"
        onClick={() => {
          setEditing(p.data ?? null)
          setModalOpen(true)
        }}
      >
        <PencilIcon className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

export default function RoutePage() {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<TransportRoute | null>(null)

  const { data: rows, isLoading, isError, error, refetch, invalidate } = useCrudList({
    queryKey: QK.transport.routes(),
    queryFn: listRoutes,
  })

  const columnDefs = useMemo<ColDef<TransportRoute>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.serviceNumber,
      COL_DEFS.routeCode,
      COL_DEFS.routePickupPlace,
      COL_DEFS.routeDropPlace,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(router, setEditing, setModalOpen) },
    ],
    [router],
  )

  return (
    <PageContainer className="space-y-5">
      <TransportPageTitle title="Add Route" />

      <TableCard withHeaderBorder={false}>
        {isError ? (
          <EmptyState
            title="Could not load routes"
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
              searchPlaceholder: 'Search routes…',
              pdfDocumentTitle: 'Routes',
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
                Add Route
              </Button>
            )}
          />
        )}
      </TableCard>

      <RouteModal
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
