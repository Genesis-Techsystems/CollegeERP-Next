'use client'

import { useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { Layers, PencilIcon, PlusIcon } from 'lucide-react'
import { DataTable } from '@/common/components/table'
import { SearchInput } from '@/common/components/search'
import { StatusBadge } from '@/common/components/data-display'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { listFloors } from '@/services'
import type { Floor } from '@/types/floor'
import FloorModal from './FloorModal'

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<Floor>,
  blockName: {
    headerName: 'Block Name',
    minWidth: 150,
    flex: 1,
    valueGetter: (p) => {
      const row = (p.data ?? {}) as Record<string, unknown>
      const block = (row.block ?? row.Block) as Record<string, unknown> | undefined
      return (
        (typeof row.blockName === 'string' && row.blockName) ||
        (typeof row.blockname === 'string' && row.blockname) ||
        (typeof row.block_code === 'string' && row.block_code) ||
        (typeof block?.blockName === 'string' && block.blockName) ||
        (typeof block?.blockname === 'string' && block.blockname) ||
        ''
      )
    },
  } as ColDef<Floor>,
  floorName: { field: 'floorName', headerName: 'Floor Name', minWidth: 150, flex: 1 } as ColDef<Floor>,
  floorNo: { field: 'floorNo', headerName: 'Floor No', minWidth: 100, flex: 0.8 } as ColDef<Floor>,
  noOfRooms: { field: 'noOfRooms', headerName: 'No. Of Rooms', minWidth: 120, flex: 0.8 } as ColDef<Floor>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.7 } as ColDef<Floor>,
  actions: { headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<Floor>,
}

function toSearchText(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return ''
}

function statusRenderer(p: ICellRendererParams<Floor>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  setEditing: (row: Floor | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<Floor>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      aria-label="Edit floor"
      onClick={() => { setEditing(p.data ?? null); setModalOpen(true) }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

export default function FloorsPage() {
  const [searchValue, setSearchValue] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingFloor, setEditingFloor] = useState<Floor | null>(null)

  const { data: floors, isLoading: loading, invalidate } = useCrudList({
    queryKey: QK.floors.list(),
    queryFn: listFloors,
  })

  const filteredData = useMemo(() => {
    if (!searchValue.trim()) return floors
    const lower = searchValue.toLowerCase()
    return floors.filter((row) =>
      Object.values(row).some((val) => toSearchText(val).toLowerCase().includes(lower)),
    )
  }, [searchValue, floors])

  const columnDefs = useMemo<ColDef<Floor>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.blockName,
      COL_DEFS.floorName,
      COL_DEFS.floorNo,
      COL_DEFS.noOfRooms,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(setEditingFloor, setModalOpen) },
    ],
    [setEditingFloor, setModalOpen],
  )

  return (
    <PageContainer className="space-y-5">
      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60">
          <h2 className="text-[14px] font-semibold text-[hsl(var(--primary))]">Floors</h2>
        </div>
        <div className="flex items-center justify-between gap-3 p-3">
          <SearchInput
            className="w-full max-w-sm"
            placeholder="Search floors…"
            value={searchValue}
            onChange={setSearchValue}
          />
          <Button size="sm" onClick={() => { setEditingFloor(null); setModalOpen(true) }}>
            <PlusIcon className="h-4 w-4 mr-1" />
            Add Floor
          </Button>
        </div>

        <div className="px-3 pb-3">
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            {!loading && filteredData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Layers className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">No floors found</p>
              </div>
            ) : (
              <DataTable
                rowData={filteredData}
                columnDefs={columnDefs}
                loading={loading}
                pagination
              />
            )}
          </div>
        </div>
      </div>

      <FloorModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingFloor(null) }}
        floor={editingFloor}
        onSaved={invalidate}
      />
    </PageContainer>
  )
}
