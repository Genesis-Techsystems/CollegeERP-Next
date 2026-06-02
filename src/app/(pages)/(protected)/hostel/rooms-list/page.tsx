'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { useQuery } from '@tanstack/react-query'
import { DataTable, TableCard } from '@/common/components/table'
import { FilterCard, FILTER_CARD_SELECT_CLASS } from '@/common/components/feedback'
import { Select } from '@/common/components/select'
import { StatusBadge } from '@/common/components/data-display'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { listHostelDetails, listHostelRoomsByHostel } from '@/services'
import type { HostelDetail, HostelRoom } from '@/types/hostel'
import { useHostelSelect } from '../_lib/use-hostel-select'

function floorRenderer(p: ICellRendererParams<HostelRoom>) {
  const row = p.data
  if (!row) return '—'
  const floorNo = row.floorNo ?? ''
  const floorName = row.floorName
  if (floorName) return `${floorNo} (${floorName})`
  return String(floorNo || '—')
}

function buildAllocationUrl(row: HostelRoom, hostel?: HostelDetail) {
  const params = new URLSearchParams()
  params.set('hostelId', String(row.hostelId ?? hostel?.hostelId ?? ''))
  params.set('hstlRoomId', String(row.hstlRoomId))
  params.set('hostelName', hostel?.hostelName ?? '')
  params.set('hostelCode', hostel?.hostelCode ?? '')
  params.set('floorNo', String(row.floorNo ?? ''))
  if (row.floorName) params.set('floorName', row.floorName)
  params.set('roomNumber', row.roomNumber ?? '')
  if (row.roomTypeCode) params.set('roomTypeCode', row.roomTypeCode)
  params.set('availableBeds', String(row.availableBeds ?? 0))
  params.set('amount', String(row.amount ?? ''))
  return `/hostel/room-allocation?${params.toString()}`
}

function makeAllocateRenderer(
  router: ReturnType<typeof useRouter>,
  hostelById: Map<number, HostelDetail>,
) {
  return (p: ICellRendererParams<HostelRoom>) => {
    const row = p.data
    if (!row) return null
    const available = Number(row.availableBeds ?? 0)
    if (available <= 0) {
      return (
        <Button type="button" size="sm" variant="outline" disabled className="h-[30px] text-[12px]">
          No beds available
        </Button>
      )
    }
    const hostel = hostelById.get(Number(row.hostelId))
    return (
      <Button
        type="button"
        size="sm"
        className="h-[30px] px-3 text-[12px]"
        onClick={() => router.push(buildAllocationUrl(row, hostel))}
      >
        Allocate room
      </Button>
    )
  }
}

export default function HostelRoomAllocationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialHostelId = searchParams.get('hostelId')
  const [hostelId, setHostelId] = useState<string | null>(initialHostelId)
  const { hostels, loadingHostels } = useHostelSelect()
  const hostelNum = Number(hostelId ?? 0)

  const { data: hostelRows = [] } = useQuery({
    queryKey: QK.hostel.details(),
    queryFn: listHostelDetails,
  })

  const hostelById = useMemo(() => {
    const map = new Map<number, HostelDetail>()
    for (const h of hostelRows) {
      if (h.hostelId) map.set(h.hostelId, h)
    }
    return map
  }, [hostelRows])

  useEffect(() => {
    if (hostelId || hostels.length === 0) return
    setHostelId(hostels[0]?.value ?? null)
  }, [hostelId, hostels])

  const { data: rows = [], isLoading } = useQuery({
    queryKey: QK.hostel.rooms(hostelNum),
    queryFn: () => listHostelRoomsByHostel(hostelNum),
    enabled: hostelNum > 0,
  })

  const columnDefs = useMemo<ColDef<HostelRoom>[]>(
    () => [
      { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 },
      { field: 'roomNumber', headerName: 'Room number', minWidth: 110 },
      { field: 'noOfBeds', headerName: 'No. of beds', width: 100, flex: 0 },
      { field: 'allotedBeds', headerName: 'Allotted beds', width: 110, flex: 0 },
      { headerName: 'Floor number', minWidth: 130, cellRenderer: floorRenderer },
      { field: 'availableBeds', headerName: 'Available beds', width: 120, flex: 0 },
      { field: 'amount', headerName: 'Room amount', minWidth: 110 },
      {
        field: 'isActive',
        headerName: 'Status',
        minWidth: 100,
        flex: 0,
        cellRenderer: (p: ICellRendererParams<HostelRoom>) => (
          <StatusBadge status={p.data?.isActive ?? false} />
        ),
      },
      {
        headerName: 'Actions',
        minWidth: 140,
        width: 140,
        flex: 0,
        cellRenderer: makeAllocateRenderer(router, hostelById),
      },
    ],
    [router, hostelById],
  )

  return (
    <PageContainer className="space-y-5">
      <FilterCard title="Hostel room allocation">
        <Select
          label="Hostel"
          className={FILTER_CARD_SELECT_CLASS}
          value={hostelId}
          onChange={setHostelId}
          options={hostels}
          placeholder="Select hostel"
          searchable
          isLoading={loadingHostels}
        />
      </FilterCard>

      <TableCard withHeaderBorder={false}>
        <DataTable
          rowData={rows}
          columnDefs={columnDefs}
          loading={isLoading}
          pagination
          toolbar={{
            search: true,
            searchPlaceholder: 'Search rooms…',
            exportPdf: true,
            pdfDocumentTitle: 'Hostel Room Allocation',
          }}
          height="auto"
        />
      </TableCard>
    </PageContainer>
  )
}
