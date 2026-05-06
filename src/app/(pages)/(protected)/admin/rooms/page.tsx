'use client'

import { useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { DoorOpen, PencilIcon, PlusIcon } from 'lucide-react'
import { DataTable } from '@/common/components/table'
import { StatusBadge } from '@/common/components/data-display'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { listRooms } from '@/services'
import type { Room } from '@/types/room'
import RoomModal from './RoomModal'

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<Room>,
  blockName: { headerName: 'Block Name', minWidth: 130, flex: 1 } as ColDef<Room>,
  floorName: { headerName: 'Floor Name', minWidth: 130, flex: 1 } as ColDef<Room>,
  roomType: { headerName: 'Room Type', minWidth: 130, flex: 1 } as ColDef<Room>,
  roomCode: { headerName: 'Room Code', minWidth: 120, flex: 0.8 } as ColDef<Room>,
  roomName: { headerName: 'Room Name', minWidth: 150, flex: 1 } as ColDef<Room>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.7 } as ColDef<Room>,
  actions: { headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<Room>,
}

function pickText(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = row[key]
    if (typeof value === 'string' && value.trim()) return value
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return ''
}

function toSearchText(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return ''
}

function statusRenderer(p: ICellRendererParams<Room>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  setEditing: (row: Room | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<Room>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      aria-label="Edit room"
      onClick={() => { setEditing(p.data ?? null); setModalOpen(true) }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

export default function RoomsPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)

  const { data: rooms, isLoading: loading, invalidate } = useCrudList({
    queryKey: QK.rooms.list(),
    queryFn: listRooms,
  })

  const columnDefs = useMemo<ColDef<Room>[]>(
    () => [
      COL_DEFS.siNo,
      {
        ...COL_DEFS.blockName,
        valueGetter: (p) => pickText((p.data ?? {}) as Record<string, unknown>, ['blockName', 'blockname']),
      },
      {
        ...COL_DEFS.floorName,
        valueGetter: (p) => pickText((p.data ?? {}) as Record<string, unknown>, ['floorName', 'floorname']),
      },
      {
        ...COL_DEFS.roomType,
        valueGetter: (p) => pickText((p.data ?? {}) as Record<string, unknown>, ['roomType', 'roomtype']),
      },
      {
        ...COL_DEFS.roomCode,
        valueGetter: (p) => pickText((p.data ?? {}) as Record<string, unknown>, ['roomCode', 'roomcode']),
      },
      {
        ...COL_DEFS.roomName,
        valueGetter: (p) => pickText((p.data ?? {}) as Record<string, unknown>, ['roomName', 'roomname']),
      },
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(setEditingRoom, setModalOpen) },
    ],
    [setEditingRoom, setModalOpen],
  )

  return (
    <PageContainer className="space-y-5">
      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60">
          <h2 className="text-[14px] font-semibold text-[hsl(var(--primary))]">Rooms</h2>
        </div>
        <div className="px-3 pb-3 pt-2">
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            {!loading && rooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <DoorOpen className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">No rooms found</p>
              </div>
            ) : (
              <DataTable
                rowData={rooms}
                columnDefs={columnDefs}
                loading={loading}
                pagination
                toolbar={{ search: true, searchPlaceholder: 'Search rooms…', pdfDocumentTitle: 'Rooms' }}
                toolbarTrailing={
                  <Button size="sm" onClick={() => { setEditingRoom(null); setModalOpen(true) }}>
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Add Room
                  </Button>
                }
              />
            )}
          </div>
        </div>
      </div>

      <RoomModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingRoom(null) }}
        room={editingRoom}
        onSaved={invalidate}
      />
    </PageContainer>
  )
}
