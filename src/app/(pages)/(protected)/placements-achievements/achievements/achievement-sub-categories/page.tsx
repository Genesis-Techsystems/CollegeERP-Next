'use client'

import { useState, useMemo } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { PencilIcon } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { DataTable } from '@/common/components/table'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { listAchievementSubCategories } from '@/services/placements'
import type { AchievementSubCategory } from '@/types/placements'
import { rowIndexGetter } from '@/lib/utils'
import AchievementSubCategoryModal from './AchievementSubCategoryModal'

export default function AchievementSubCategoriesPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editData, setEditData] = useState<AchievementSubCategory | null>(null)

  const { data, isLoading, invalidate } = useCrudList<AchievementSubCategory>({
    queryKey: QK.achievementSubCategories.list(),
    queryFn: listAchievementSubCategories,
  })

  const columnDefs = useMemo<ColDef<AchievementSubCategory>[]>(() => [
    { headerName: 'No.', valueGetter: rowIndexGetter, width: 60, flex: 0 },
    { field: 'achievementSubcategory', headerName: 'Sub-Category Name', minWidth: 160, flex: 2 },
    { field: 'achievementSubcategoryCode', headerName: 'Code', minWidth: 100, flex: 1 },
    { field: 'achievementCategoryName', headerName: 'Category', minWidth: 140, flex: 1 },
    {
      field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.8,
      cellRenderer: (p: ICellRendererParams<AchievementSubCategory>) => (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${p.data?.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
          {p.data?.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      headerName: 'Actions', width: 80, flex: 0,
      cellRenderer: (p: ICellRendererParams<AchievementSubCategory>) => {
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
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="px-3 pb-3 pt-2">
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <DataTable
              rowData={data}
              columnDefs={columnDefs}
              loading={isLoading}
              pagination
              toolbar={{ search: true, searchPlaceholder: 'Search sub-categories…', pdfDocumentTitle: 'Achievement Sub-Categories' }}
              toolbarLeading={<h2 className="app-card-title">Achievement Sub-Categories</h2>}
              toolbarTrailing={
                <Button size="sm" onClick={() => { setEditData(null); setModalOpen(true) }}>+ Add Sub-Category</Button>
              }
            />
          </div>
        </div>
      </div>
      <AchievementSubCategoryModal open={modalOpen} onClose={() => setModalOpen(false)} editData={editData} onSaved={invalidate} />
    </PageContainer>
  )
}
