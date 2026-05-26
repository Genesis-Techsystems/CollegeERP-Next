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
import { listHostelRegistersByHostel } from '@/services'
import type { HostelRegister } from '@/types/hostel'
import { HostelPageTitle } from '../_components/HostelPageTitle'
import { useHostelSelect } from '../_lib/use-hostel-select'

export default function HostelRegisterPage() {
  const [hostelId, setHostelId] = useState<string | null>(null)
  const { hostels, loadingHostels } = useHostelSelect()
  const hostelNum = Number(hostelId ?? 0)

  const { data: rows = [], isLoading } = useQuery({
    queryKey: QK.hostel.register(hostelNum),
    queryFn: () => listHostelRegistersByHostel(hostelNum),
    enabled: hostelNum > 0,
  })

  const columnDefs = useMemo<ColDef<HostelRegister>[]>(
    () => [
      { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 },
      { field: 'stdFirstName', headerName: 'Student', minWidth: 140 },
      { field: 'attendeesName', headerName: 'Attendee', minWidth: 120 },
      { field: 'relationCatdetDisplayName', headerName: 'Relation', minWidth: 100 },
      { field: 'inTiming', headerName: 'In', minWidth: 90 },
      { field: 'outTiming', headerName: 'Out', minWidth: 90 },
      { field: 'mobileNumber', headerName: 'Mobile', minWidth: 110 },
      {
        field: 'isActive',
        headerName: 'Status',
        cellRenderer: (p: ICellRendererParams<HostelRegister>) => (
          <StatusBadge status={p.data?.isActive ?? false} />
        ),
      },
    ],
    [],
  )

  return (
    <PageContainer className="space-y-5">
      <HostelPageTitle title="Hostel Register" />

      <FilterCard title="Filters">
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
        <DataTable rowData={rows} columnDefs={columnDefs} loading={isLoading} pagination height="auto" />
      </TableCard>
    </PageContainer>
  )
}
