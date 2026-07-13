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
import { listHostelRoomCharges } from '@/services'
import type { HostelRoomCharge } from '@/types/hostel'
import { RoomChargeModal } from './RoomChargeModal'

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<HostelRoomCharge>,
  hostelCode: { field: 'hostelCode', headerName: 'Hostel', minWidth: 120 } as ColDef<HostelRoomCharge>,
  roomTypeCatdetCode: { field: 'roomTypeCatdetCode', headerName: 'Room Type', minWidth: 110 } as ColDef<HostelRoomCharge>,
  paymentFrequencyCatdetCode: {
    field: 'paymentFrequencyCatdetCode',
    headerName: 'Frequency',
    minWidth: 110,
  } as ColDef<HostelRoomCharge>,
  fromDate: { field: 'fromDate', headerName: 'From', minWidth: 100 } as ColDef<HostelRoomCharge>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 100, flex: 0 } as ColDef<HostelRoomCharge>,
  actions: { headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<HostelRoomCharge>,
}

function statusRenderer(p: ICellRendererParams<HostelRoomCharge>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

export default function RoomChargesPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<HostelRoomCharge | null>(null)

  const { data: rows, isLoading, isError, error, refetch, invalidate } = useCrudList({
    queryKey: QK.hostel.roomCharges(),
    queryFn: listHostelRoomCharges,
  })

  const columnDefs = useMemo<ColDef<HostelRoomCharge>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.hostelCode,
      COL_DEFS.roomTypeCatdetCode,
      COL_DEFS.paymentFrequencyCatdetCode,
      COL_DEFS.fromDate,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      {
        ...COL_DEFS.actions,
        cellRenderer: (p: ICellRendererParams<HostelRoomCharge>) => (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={() => {
              setEditing(p.data ?? null)
              setModalOpen(true)
            }}
          >
            <PencilIcon className="h-3.5 w-3.5" />
          </Button>
        ),
      },
    ],
    [],
  )

  return (
    <ListPage
      title="Room Charges"
      rowData={isError ? [] : rows}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      height="auto"
      toolbar={{
        search: true,
        searchPlaceholder: 'Search room charges…',
        exportPdf: true,
        pdfDocumentTitle: 'Room Charges',
      }}
      toolbarTrailing={
        <Button
          type="button"
          size="sm"
          onClick={() => {
            setEditing(null)
            setModalOpen(true)
          }}
        >
          <PlusIcon className="mr-1.5 h-4 w-4" />
          Add Room Charge
        </Button>
      }
      emptyState={
        isError ? (
          <EmptyState
            title="Could not load room charges"
            description={getErrorMessage(error)}
            action={{ label: 'Retry', onClick: () => void refetch() }}
          />
        ) : undefined
      }
    >
      <RoomChargeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        row={editing}
        onSaved={() => void invalidate()}
      />
    </ListPage>
  )
}
