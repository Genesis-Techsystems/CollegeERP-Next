'use client'

import { useState, useMemo } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { PencilIcon, EyeIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { ListPage } from '@/components/layout'

import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { listPlacements } from '@/services/placements'
import type { Placement } from '@/types/placements'
import { rowIndexGetter } from '@/lib/utils'
import PlacementModal from './PlacementModal'

export default function PlacementsPage() {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [editData, setEditData] = useState<Placement | null>(null)

  const { data, isLoading, invalidate } = useCrudList<Placement>({
    queryKey: QK.placements.list(),
    queryFn: listPlacements,
  })

  const columnDefs = useMemo<ColDef<Placement>[]>(() => [
    { headerName: 'No.', valueGetter: rowIndexGetter, width: 60, flex: 0 },
    { field: 'plaecmentTitle', headerName: 'Placement Title', minWidth: 180, flex: 2 },
    { field: 'placementStartDate', headerName: 'Start Date', minWidth: 110, flex: 1 },
    { field: 'placementEndDate', headerName: 'End Date', minWidth: 110, flex: 1 },
    { field: 'campusCode', headerName: 'Campus', minWidth: 90, flex: 0.8 },
    { field: 'contactPerson', headerName: 'Contact Person', minWidth: 120, flex: 1 },
    { field: 'placementCatCode', headerName: 'Status', minWidth: 100, flex: 0.9 },
    {
      field: 'isActive', headerName: 'Active', minWidth: 90, flex: 0.8,
      cellRenderer: (p: ICellRendererParams<Placement>) => (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${p.data?.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
          {p.data?.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      headerName: 'Actions', width: 110, flex: 0,
      cellRenderer: (p: ICellRendererParams<Placement>) => {
        const row = p.data
        if (!row) return null
        return (
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0"
              onClick={() => { setEditData(row); setModalOpen(true) }}>
              <PencilIcon className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0"
              title="Placement Companies"
              onClick={() => router.push(`/placements-achievements/placements/placement-companies?placementId=${row.placementId}&plaecmentTitle=${encodeURIComponent(row.plaecmentTitle)}`)}>
              <EyeIcon className="h-3.5 w-3.5" />
            </Button>
          </div>
        )
      },
    },
  ], [router])

  return (
    <ListPage
              title="Placements"
              rowData={data}
              columnDefs={columnDefs}
              loading={isLoading}
              pagination
              toolbar={{ search: true, searchPlaceholder: 'Search placements…', pdfDocumentTitle: 'Placements' }}
              toolbarTrailing={
                <Button size="sm" onClick={() => { setEditData(null); setModalOpen(true) }}>+ Add Placement</Button>
              }
            >
      <PlacementModal open={modalOpen} onClose={() => setModalOpen(false)} editData={editData} onSaved={invalidate} />
    </ListPage>
  )
}
