'use client'

import { useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams, ValueFormatterParams } from 'ag-grid-community'
import { Building2, PencilIcon, PlusIcon } from 'lucide-react'
import { StatusBadge } from '@/common/components/data-display'
import { ListPage } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { listBuildings } from '@/services'
import type { Building } from '@/types/building'
import BuildingModal from './BuildingModal'

const EMPTY_DASH = '-'

function dashFormatter(p: ValueFormatterParams<Building>) {
  const value = p.value
  if (value == null) return EMPTY_DASH
  if (typeof value === 'string' && value.trim() === '') return EMPTY_DASH
  return String(value)
}

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<Building>,
  buildingName: {
    field: 'buildingName',
    headerName: 'Building Name',
    minWidth: 170,
    flex: 1.2,
    valueFormatter: dashFormatter,
  } as ColDef<Building>,
  buildingCode: {
    field: 'buildingCode',
    headerName: 'Building Code',
    minWidth: 120,
    flex: 0.85,
    valueFormatter: dashFormatter,
  } as ColDef<Building>,
  landMark: {
    field: 'landMark',
    headerName: 'Land Mark',
    minWidth: 150,
    flex: 1,
    valueFormatter: dashFormatter,
  } as ColDef<Building>,
  noOfFloors: {
    field: 'noOfFloors',
    headerName: 'No of Floors',
    minWidth: 110,
    flex: 0.7,
    valueFormatter: dashFormatter,
  } as ColDef<Building>,
  campusName: {
    field: 'campusName',
    headerName: 'Campus',
    minWidth: 150,
    flex: 1,
    valueFormatter: dashFormatter,
  } as ColDef<Building>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.7 } as ColDef<Building>,
  actions: { headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<Building>,
}

function statusRenderer(p: ICellRendererParams<Building>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  setEditing: (row: Building | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<Building>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      aria-label="Edit building"
      onClick={() => { setEditing(p.data ?? null); setModalOpen(true) }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

export default function BuildingsPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null)

  const { data: buildings, isLoading: loading, invalidate } = useCrudList({
    queryKey: QK.buildings.list(),
    queryFn: listBuildings,
  })

  const columnDefs = useMemo<ColDef<Building>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.buildingName,
      COL_DEFS.buildingCode,
      COL_DEFS.landMark,
      COL_DEFS.noOfFloors,
      COL_DEFS.campusName,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(setEditingBuilding, setModalOpen) },
    ],
    [setEditingBuilding, setModalOpen],
  )

  return (
    <ListPage
      title="Buildings"
      rowData={buildings}
      columnDefs={columnDefs}
      loading={loading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: 'Search buildings…',
        pdfDocumentTitle: 'Buildings',
      }}
      toolbarTrailing={
        <Button size="sm" onClick={() => { setEditingBuilding(null); setModalOpen(true) }}>
          <PlusIcon className="h-4 w-4 mr-1" />
          Add Building
        </Button>
      }
      emptyState={
        <div className="app-card flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Building2 className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm">No buildings found</p>
          <Button size="sm" className="mt-4" onClick={() => { setEditingBuilding(null); setModalOpen(true) }}>
            <PlusIcon className="h-4 w-4 mr-1" />
            Add Building
          </Button>
        </div>
      }
    >
      <BuildingModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingBuilding(null) }}
        building={editingBuilding}
        onSaved={invalidate}
      />
    </ListPage>
  )
}
