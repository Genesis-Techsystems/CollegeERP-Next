'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { format, parseISO } from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import { Select } from '@/common/components/select'
import { FilteredListPage } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { DATE_FORMATS } from '@/config/constants/app'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { listHostelRoomAllocationsByRoom, listHostelRoomsByHostel } from '@/services'
import type { HostelRoomAllocationRow } from '@/types/hostel'
import { useHostelSelect } from '@/app/(pages)/(protected)/hostel/_lib/use-hostel-select'

function pickField(row: HostelRoomAllocationRow, keys: string[]): string {
  for (const key of keys) {
    const value = row[key]
    if (value != null && String(value).trim() !== '') return String(value)
  }
  return ''
}

function formatDueDate(value?: string): string {
  if (!value) return '—'
  try {
    const d = value.includes('T') ? parseISO(value) : new Date(value)
    if (Number.isNaN(d.getTime())) return value
    return format(d, DATE_FORMATS.DISPLAY)
  } catch {
    return value
  }
}

function paymentStatusLabel(row: HostelRoomAllocationRow): string {
  const settled = row.isAmountSetteled === true || (row.isAmountSetteled as unknown) === 'true'
  return settled ? 'Setteled' : 'Pending'
}

function makeNameRenderer() {
  return (p: ICellRendererParams<HostelRoomAllocationRow>) => {
    const row = p.data
    if (!row) return null
    const name = pickField(row, ['firstName', 'stdFirstName', 'studentName'])
    const id = pickField(row, ['rollNumber', 'hallticketNumber', 'hallTicketNo'])
    if (!name && !id) return '—'
    return (
      <span>
        {name}
        {id ? (
          <>
            {' '}
            <span className="font-medium text-[#2563eb]">({id})</span>
          </>
        ) : null}
      </span>
    )
  }
}

function makePaymentRenderer(
  router: ReturnType<typeof useRouter>,
  hostelId: string | null,
  roomId: string | null,
) {
  return (p: ICellRendererParams<HostelRoomAllocationRow>) => {
    const row = p.data
    if (!row?.studentId) return null

    return (
      <Button
        type="button"
        size="sm"
        className="h-[30px] bg-[#f0c040] px-4 text-[12px] font-medium text-slate-900 hover:bg-[#e5b535]"
        onClick={() => {
          const params = new URLSearchParams({
            studentId: String(row.studentId),
            hostelId: hostelId ?? '',
            hstlRoomId: roomId ?? '',
          })
          const roll = pickField(row, ['rollNumber', 'hallticketNumber', 'hallTicketNo'])
          if (roll) params.set('rollNumber', roll)
          router.push(
            `/accounts-and-fees/fees-collection/hostel-payment/hostel-fee-payment?${params.toString()}`,
          )
        }}
      >
        Payment
      </Button>
    )
  }
}

export default function HostelPaymentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { hostels, loadingHostels } = useHostelSelect()
  const [hostelId, setHostelId] = useState<string | null>(searchParams.get('hostelId'))
  const [roomId, setRoomId] = useState<string | null>(searchParams.get('hstlRoomId'))
  const hostelNum = Number(hostelId ?? 0)
  const roomNum = Number(roomId ?? 0)

  const { data: rooms = [], isLoading: loadingRooms } = useQuery({
    queryKey: QK.hostel.rooms(hostelNum),
    queryFn: () => listHostelRoomsByHostel(hostelNum),
    enabled: hostelNum > 0,
  })

  const { data: allocations = [], isLoading: loadingAllocations } = useQuery({
    queryKey: QK.hostel.roomAllocations(hostelNum, roomNum),
    queryFn: () => listHostelRoomAllocationsByRoom(roomNum),
    enabled: hostelNum > 0 && roomNum > 0,
  })

  const roomOptions = useMemo(
    () =>
      rooms.map((r) => {
        const num = r.roomNumber ?? ''
        const type = r.roomTypeCode ?? ''
        const label = type ? `${num} ( ${type} )` : num || String(r.hstlRoomId)
        return { value: String(r.hstlRoomId), label }
      }),
    [rooms],
  )

  const columnDefs = useMemo<ColDef<HostelRoomAllocationRow>[]>(
    () => [
      { headerName: 'SI No.', valueGetter: rowIndexGetter, width: 72, flex: 0 },
      { headerName: 'Name', minWidth: 260, cellRenderer: makeNameRenderer() },
      {
        headerName: 'Parent Name',
        minWidth: 160,
        valueGetter: (p) =>
          pickField(p.data ?? {}, ['parentName', 'fatherName', 'parentname', 'guardianName']),
      },
      {
        headerName: 'Payment Due date',
        minWidth: 150,
        valueGetter: (p) => formatDueDate(pickField(p.data ?? {}, ['paymentDueDate'])),
      },
      {
        headerName: 'Payment Status',
        minWidth: 130,
        valueGetter: (p) => (p.data ? paymentStatusLabel(p.data) : '—'),
      },
      {
        headerName: 'Organisation',
        minWidth: 110,
        valueGetter: (p) =>
          pickField(p.data ?? {}, ['orgCode', 'organizationCode', 'orgName', 'organizationName']),
      },
      {
        headerName: 'Payment',
        minWidth: 110,
        flex: 0,
        width: 110,
        cellRenderer: makePaymentRenderer(router, hostelId, roomId),
      },
    ],
    [router, hostelId, roomId],
  )

  const showAllocationTable = hostelNum > 0 && roomNum > 0

  return (
    <FilteredListPage
      title="Hostel Payment"
      filters={(
        <div className="grid max-w-3xl grid-cols-1 gap-4 md:grid-cols-2">
          <Select
            label="Hostel"
            required
            value={hostelId}
            onChange={(v) => {
              setHostelId(v)
              setRoomId(null)
            }}
            options={hostels}
            placeholder="Select hostel"
            searchable
            isLoading={loadingHostels}
          />
          <Select
            label="Hostel Room"
            required
            value={roomId}
            onChange={setRoomId}
            options={roomOptions}
            placeholder="Select room"
            searchable
            disabled={!hostelId}
            isLoading={loadingRooms}
          />
        </div>
      )}
      rowData={showAllocationTable ? allocations : []}
      columnDefs={columnDefs}
      loading={loadingAllocations}
      height="auto"
      pagination
      toolbar={{ search: true, searchPlaceholder: 'Search allocations…' }}
    />
  )
}
