'use client'

import { useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { useQuery } from '@tanstack/react-query'
import { DataTable, TableCard } from '@/common/components/table'
import { FilterCard, FILTER_CARD_SELECT_CLASS } from '@/common/components/feedback'
import { Select } from '@/common/components/select'
import { StatusBadge } from '@/common/components/data-display'
import { PageContainer } from '@/components/layout'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { listHostelRoomsByHostel } from '@/services'
import type { HostelRoom } from '@/types/hostel'
import { useHostelSelect } from '../_lib/use-hostel-select'

export default function ViewRoomDetailsPage() {
  const [hostelId, setHostelId] = useState<string | null>(null)
  const { hostels, loadingHostels } = useHostelSelect()
  const hostelNum = Number(hostelId ?? 0)

  const { data: rows = [], isLoading } = useQuery({
    queryKey: QK.hostel.rooms(hostelNum),
    queryFn: () => listHostelRoomsByHostel(hostelNum),
    enabled: hostelNum > 0,
  })

  const columnDefs = useMemo<ColDef<HostelRoom>[]>(
    () => [
      { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 },
      { field: 'floorName', headerName: 'Floor', minWidth: 90 },
      { field: 'roomNumber', headerName: 'Room', minWidth: 90 },
      { field: 'noOfBeds', headerName: 'Beds', width: 80, flex: 0 },
      { field: 'allotedBeds', headerName: 'Allotted', width: 90, flex: 0 },
      { field: 'availableBeds', headerName: 'Available', width: 100, flex: 0 },
      { field: 'amount', headerName: 'Amount', minWidth: 90 },
      {
        field: 'isActive',
        headerName: 'Status',
        cellRenderer: (p: ICellRendererParams<HostelRoom>) => (
          <StatusBadge status={p.data?.isActive ?? false} />
        ),
      },
    ],
    [],
  )

  return (
    <PageContainer className="space-y-5">
      <FilterCard title="View Room details">
        <Select
          label="Hostel"
          className={FILTER_CARD_SELECT_CLASS}
          value={hostelId}
          onChange={setHostelId}
          options={hostels}
          searchable
          isLoading={loadingHostels}
        />
      </FilterCard>

      <TableCard withHeaderBorder={false}>
        <DataTable rowData={rows} columnDefs={columnDefs} loading={isLoading} height="auto" />
      </TableCard>
    </PageContainer>
  )
}
