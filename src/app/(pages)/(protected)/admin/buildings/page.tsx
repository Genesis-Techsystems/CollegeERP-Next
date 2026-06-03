'use client'

import { useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { Building2, PencilIcon, PlusIcon } from 'lucide-react'
import { DataTable } from '@/common/components/table'
import { StatusBadge } from '@/common/components/data-display'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { listBuildings } from '@/services'
import type { Building } from '@/types/building'
import BuildingModal from './BuildingModal'

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<Building>,
  buildingName: { field: 'buildingName', headerName: 'Building', minWidth: 170, flex: 1.2 } as ColDef<Building>,
  buildingCode: { field: 'buildingCode', headerName: 'Code', minWidth: 100, flex: 0.75 } as ColDef<Building>,
  landMark: { field: 'landMark', headerName: 'Land Mark', minWidth: 150, flex: 1 } as ColDef<Building>,
  noOfFloors: { field: 'noOfFloors', headerName: 'Floors', minWidth: 90, flex: 0.6 } as ColDef<Building>,
  campusName: { field: 'campusName', headerName: 'Campus', minWidth: 150, flex: 1 } as ColDef<Building>,
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
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40">
          <h2 className="app-card-title">Buildings</h2>
        </div>
        <div className="px-3 pb-3 pt-2">
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            {!loading && buildings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Building2 className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">No buildings found</p>
              </div>
            ) : (
              <DataTable
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
              />
            )}
          </div>
        </div>
      </div>

      <BuildingModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingBuilding(null) }}
        building={editingBuilding}
        onSaved={invalidate}
      />
    </PageContainer>
  )
}
