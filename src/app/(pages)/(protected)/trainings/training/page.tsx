'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { Eye, PencilIcon } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { DataTable } from '@/common/components/table'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { listTrainings } from '@/services/trainings'
import type { PlacementTraining } from '@/types/trainings'
import { rowIndexGetter } from '@/lib/utils'
import AddTrainingModal from './AddTrainingModal'

function activeRenderer(p: ICellRendererParams<PlacementTraining>) {
  const active = p.data?.isActive
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
      {active ? 'Active' : 'Inactive'}
    </span>
  )
}

function makeActionsRenderer(
  onEdit: (row: PlacementTraining) => void,
  onView: (row: PlacementTraining) => void,
) {
  return (p: ICellRendererParams<PlacementTraining>) => {
    const row = p.data
    if (!row) return null
    return (
      <div className="flex gap-1">
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => onEdit(row)}>
          <PencilIcon className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => onView(row)}>
          <Eye className="h-3.5 w-3.5" />
        </Button>
      </div>
    )
  }
}

export default function PlacementTrainingsPage() {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [editData, setEditData] = useState<PlacementTraining | null>(null)

  const { data: trainings, isLoading, invalidate } = useCrudList<PlacementTraining>({
    queryKey: QK.trainings.list(),
    queryFn: listTrainings,
  })

  const columnDefs = useMemo<ColDef<PlacementTraining>[]>(
    () => [
      { headerName: 'No.', valueGetter: rowIndexGetter, width: 60, flex: 0 },
      { field: 'trainingTitle', headerName: 'Training Title', minWidth: 180, flex: 2 },
      { field: 'trainingTypeCatDisplayName', headerName: 'Training Type', minWidth: 130, flex: 1 },
      { field: 'trainerName', headerName: 'Trainer Name', minWidth: 130, flex: 1 },
      { field: 'empName', headerName: 'Incharge', minWidth: 130, flex: 1 },
      { field: 'yearName', headerName: 'Year', minWidth: 90, flex: 0.8 },
      { field: 'collegeCode', headerName: 'College', minWidth: 90, flex: 0.8 },
      { field: 'startDate', headerName: 'Start Date', minWidth: 110, flex: 1 },
      { field: 'endDate', headerName: 'End Date', minWidth: 110, flex: 1 },
      {
        field: 'isActive',
        headerName: 'Status',
        minWidth: 90,
        flex: 0.8,
        cellRenderer: activeRenderer,
      },
      {
        headerName: 'Actions',
        width: 100,
        flex: 0,
        cellRenderer: makeActionsRenderer(
          (row) => { setEditData(row); setModalOpen(true) },
          (row) => router.push(
            `/trainings/training-details?paTraningId=${row.traningId}&trainingTitle=${encodeURIComponent(row.trainingTitle)}&yearName=${encodeURIComponent(row.yearName)}&collegeId=${row.collegeId}&collegeCode=${encodeURIComponent(row.collegeCode)}`,
          ),
        ),
      },
    ],
    [router],
  )

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40">
          <h2 className="app-card-title">Placement Trainings</h2>
        </div>
        <div className="px-3 pb-3 pt-2">
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <DataTable
              rowData={trainings}
              columnDefs={columnDefs}
              loading={isLoading}
              pagination
              toolbar={{
                search: true,
                searchPlaceholder: 'Search trainings…',
                pdfDocumentTitle: 'Placement Trainings',
              }}
              toolbarTrailing={
                <Button
                  size="sm"
                  onClick={() => { setEditData(null); setModalOpen(true) }}
                >
                  + Add Training
                </Button>
              }
            />
          </div>
        </div>
      </div>

      <AddTrainingModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editData={editData}
        onSaved={invalidate}
      />
    </PageContainer>
  )
}
