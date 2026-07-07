'use client'

import { useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { PencilIcon, PlusIcon, Warehouse } from 'lucide-react'
import { DataTable } from '@/common/components/table'
import { StatusBadge } from '@/common/components/data-display'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { listRoomTypes } from '@/services'
import type { RoomType } from '@/types/room-type'
import RoomTypeModal from './RoomTypeModal'

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<RoomType>,
  roomType: {
    headerName: 'Room Type',
    minWidth: 160,
    flex: 1,
    valueGetter: (p) => {
      const row = (p.data ?? {}) as Record<string, unknown>
      return (
        (typeof row.roomType === 'string' && row.roomType) ||
        (typeof row.roomtype === 'string' && row.roomtype) ||
        ''
      )
    },
  } as ColDef<RoomType>,
  orgCode: {
    headerName: 'Organization',
    minWidth: 130,
    flex: 0.9,
    valueGetter: (p) => {
      const row = (p.data ?? {}) as Record<string, unknown>
      const org = (row.organization ?? row.Organization) as Record<string, unknown> | undefined
      return (
        (typeof row.orgCode === 'string' && row.orgCode) ||
        (typeof row.orgcode === 'string' && row.orgcode) ||
        (typeof row.organizationCode === 'string' && row.organizationCode) ||
        (typeof org?.orgCode === 'string' && org.orgCode) ||
        ''
      )
    },
  } as ColDef<RoomType>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.7 } as ColDef<RoomType>,
  actions: { headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<RoomType>,
}

function toSearchText(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return ''
}

function statusRenderer(p: ICellRendererParams<RoomType>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  setEditing: (row: RoomType | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<RoomType>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      aria-label="Edit room type"
      onClick={() => { setEditing(p.data ?? null); setModalOpen(true) }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

export default function RoomTypesPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRoomType, setEditingRoomType] = useState<RoomType | null>(null)

  const { data: roomTypes, isLoading: loading, invalidate } = useCrudList({
    queryKey: QK.roomTypes.list(),
    queryFn: listRoomTypes,
  })

  const columnDefs = useMemo<ColDef<RoomType>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.orgCode,
      COL_DEFS.roomType,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(setEditingRoomType, setModalOpen) },
    ],
    [setEditingRoomType, setModalOpen],
  )

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40">
          <h2 className="app-card-title">Room Types</h2>
        </div>
        <div className="px-3 pb-3 pt-2">
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            {!loading && roomTypes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Warehouse className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">No room types found</p>
                <Button size="sm" className="mt-4" onClick={() => { setEditingRoomType(null); setModalOpen(true) }}>
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Add Room Type
                </Button>
              </div>
            ) : (
              <DataTable
                rowData={roomTypes}
                columnDefs={columnDefs}
                loading={loading}
                pagination
                toolbar={{ search: true, searchPlaceholder: 'Search room types…', pdfDocumentTitle: 'Room Types' }}
                toolbarTrailing={
                  <Button size="sm" onClick={() => { setEditingRoomType(null); setModalOpen(true) }}>
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Add Room Type
                  </Button>
                }
              />
            )}
          </div>
        </div>
      </div>

      <RoomTypeModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingRoomType(null) }}
        roomType={editingRoomType}
        onSaved={invalidate}
      />
    </PageContainer>
  )
}
