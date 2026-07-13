'use client'

import { useState, useMemo } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { PencilIcon } from 'lucide-react'
import { ListPage } from '@/components/layout'

import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { listAchievements } from '@/services/placements'
import type { Achievement } from '@/types/placements'
import { rowIndexGetter } from '@/lib/utils'
import AchievementModal from './AchievementModal'

export default function AchievementsPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editData, setEditData] = useState<Achievement | null>(null)

  const { data, isLoading, invalidate } = useCrudList<Achievement>({
    queryKey: QK.achievements.list(),
    queryFn: listAchievements,
  })

  const columnDefs = useMemo<ColDef<Achievement>[]>(() => [
    { headerName: 'No.', valueGetter: rowIndexGetter, width: 60, flex: 0 },
    { field: 'achivementTitle', headerName: 'Title', minWidth: 180, flex: 2 },
    { field: 'subcategoryName', headerName: 'Sub-Category', minWidth: 130, flex: 1 },
    { field: 'achievementLevelCatName', headerName: 'Level', minWidth: 110, flex: 1 },
    { field: 'organizationName', headerName: 'Organization', minWidth: 130, flex: 1 },
    {
      field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.8,
      cellRenderer: (p: ICellRendererParams<Achievement>) => (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${p.data?.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
          {p.data?.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      headerName: 'Actions', width: 80, flex: 0,
      cellRenderer: (p: ICellRendererParams<Achievement>) => {
        if (!p.data) return null
        return (
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0"
            onClick={() => { setEditData(p.data!); setModalOpen(true) }}>
            <PencilIcon className="h-3.5 w-3.5" />
          </Button>
        )
      },
    },
  ], [])

  return (
    <ListPage
              title="Achievements"
              rowData={data}
              columnDefs={columnDefs}
              loading={isLoading}
              pagination
              toolbar={{ search: true, searchPlaceholder: 'Search achievements…', pdfDocumentTitle: 'Achievements' }}
              toolbarTrailing={
                <Button size="sm" onClick={() => { setEditData(null); setModalOpen(true) }}>+ Add Achievement</Button>
              }
            >
      <AchievementModal open={modalOpen} onClose={() => setModalOpen(false)} editData={editData} onSaved={invalidate} />
    </ListPage>
  )
}
