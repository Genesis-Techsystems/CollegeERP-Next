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
import { listDrivers } from '@/services'
import type { Driver } from '@/types/transport'
import { DriverModal } from './DriverModal'

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<Driver>,
  driverName: { field: 'driverName', headerName: 'Driver Name', minWidth: 150 } as ColDef<Driver>,
  mobileNumber: { field: 'mobileNumber', headerName: 'Mobile', minWidth: 120 } as ColDef<Driver>,
  licenseNumber: { field: 'licenseNumber', headerName: 'License', minWidth: 120 } as ColDef<Driver>,
  licenseValidUpto: {
    field: 'licenseValidUpto',
    headerName: 'License Valid',
    minWidth: 120,
    valueFormatter: (p) => formatDate(p.value),
  } as ColDef<Driver>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 100, flex: 0 } as ColDef<Driver>,
  actions: { headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<Driver>,
}

function statusRenderer(p: ICellRendererParams<Driver>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  setEditing: (row: Driver | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<Driver>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      aria-label="Edit driver"
      onClick={() => {
        setEditing(p.data ?? null)
        setModalOpen(true)
      }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

export default function DriverPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Driver | null>(null)

  const { data: rows, isLoading, isError, error, refetch, invalidate } = useCrudList({
    queryKey: QK.transport.drivers(),
    queryFn: listDrivers,
  })

  const columnDefs = useMemo<ColDef<Driver>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.driverName,
      COL_DEFS.mobileNumber,
      COL_DEFS.licenseNumber,
      COL_DEFS.licenseValidUpto,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(setEditing, setModalOpen) },
    ],
    [],
  )

  return (
    <ListPage
      title="Driver"
      rowData={isError ? [] : rows}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: 'Search drivers…',
        pdfDocumentTitle: 'Drivers',
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
          Add Driver
        </Button>
      )}
      emptyState={
        isError ? (
          <EmptyState
            title="Could not load drivers"
            description={getErrorMessage(error)}
            action={{ label: 'Retry', onClick: () => void refetch() }}
          />
        ) : undefined
      }
    >
      <DriverModal
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
