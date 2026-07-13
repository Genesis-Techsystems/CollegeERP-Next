'use client'

import { useState, useMemo, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { PencilIcon } from 'lucide-react'
import { FilteredListPage } from '@/components/layout'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { listTrainings, listTrainingDetails } from '@/services/trainings'
import { listColleges } from '@/services/admin/college'
import type { PlacementTraining, TrainingDetail } from '@/types/trainings'
import type { College } from '@/types/college'
import { rowIndexGetter } from '@/lib/utils'

function activeRenderer(p: ICellRendererParams<TrainingDetail>) {
  const active = p.data?.isActive
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
      {active ? 'Active' : 'Inactive'}
    </span>
  )
}

function TrainingDetailsContent() {
  const router = useRouter()
  const params = useSearchParams()

  const [colleges, setColleges] = useState<College[]>([])
  const [trainings, setTrainings] = useState<PlacementTraining[]>([])

  const [collegeId, setCollegeId] = useState(params.get('collegeId') ?? '')
  const [yearName, setYearName] = useState(params.get('yearName') ?? '')
  const [traningId, setTraningId] = useState(params.get('paTraningId') ?? '')

  const filtersReady = Boolean(collegeId && yearName && traningId)

  const { data: details, isLoading } = useCrudList<TrainingDetail>({
    queryKey: QK.trainingDetails.byTraining(Number(traningId)),
    queryFn: () =>
      listTrainingDetails({
        collegeId: Number(collegeId),
        yearName,
        traningId: Number(traningId),
      }),
    enabled: filtersReady,
  })

  useEffect(() => {
    listColleges().then(setColleges).catch(console.error)
  }, [])

  useEffect(() => {
    if (collegeId) {
      listTrainings().then(setTrainings).catch(console.error)
    } else {
      setTrainings([])
      setTraningId('')
    }
  }, [collegeId])

  const filteredTrainings = trainings.filter(
    (t) => !collegeId || String(t.collegeId) === collegeId,
  )

  const selectedTraining = trainings.find((t) => String(t.traningId) === traningId)

  const columnDefs = useMemo<ColDef<TrainingDetail>[]>(
    () => [
      { headerName: 'No.', valueGetter: rowIndexGetter, width: 60, flex: 0 },
      { field: 'trainerName', headerName: 'Trainer Name', minWidth: 130, flex: 1 },
      { field: 'trainingDetailTitle', headerName: 'Detail Title', minWidth: 180, flex: 2 },
      { field: 'startTime', headerName: 'Start Time', minWidth: 100, flex: 0.8 },
      { field: 'endTime', headerName: 'End Time', minWidth: 100, flex: 0.8 },
      { field: 'roomCode', headerName: 'Room', minWidth: 90, flex: 0.8 },
      { field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.8, cellRenderer: activeRenderer },
      {
        headerName: 'Actions',
        width: 80,
        flex: 0,
        cellRenderer: (p: ICellRendererParams<TrainingDetail>) => {
          const row = p.data
          if (!row) return null
          return (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={() =>
                router.push(
                  `/trainings/training-detail?a=Edit+Training+Detail&traningDetId=${row.traningDetId}&paTraningId=${row.paTraningId}&trainingTitle=${encodeURIComponent(selectedTraining?.trainingTitle ?? '')}&collegeId=${collegeId}&yearName=${encodeURIComponent(yearName)}`,
                )
              }
            >
              <PencilIcon className="h-3.5 w-3.5" />
            </Button>
          )
        },
      },
    ],
    [router, collegeId, yearName, selectedTraining],
  )

  return (
    <FilteredListPage
      title="Training Details"
      filters={(
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-0.5">
            <Label className="text-xs">College *</Label>
            <Select
              value={collegeId}
              onValueChange={(v) => { setCollegeId(v); setTraningId('') }}
            >
              <SelectTrigger><SelectValue placeholder="Select college" /></SelectTrigger>
              <SelectContent>
                {colleges.map((c) => (
                  <SelectItem key={c.collegeId} value={String(c.collegeId)}>
                    {c.collegeName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-0.5">
            <Label className="text-xs">Year *</Label>
            <Input
              value={yearName}
              onChange={(e) => setYearName(e.target.value)}
              placeholder="e.g. 2024-25"
            />
          </div>

          <div className="space-y-0.5">
            <Label className="text-xs">Training *</Label>
            <Select
              value={traningId}
              onValueChange={setTraningId}
              disabled={!collegeId || filteredTrainings.length === 0}
            >
              <SelectTrigger><SelectValue placeholder="Select training" /></SelectTrigger>
              <SelectContent>
                {filteredTrainings.map((t) => (
                  <SelectItem key={t.traningId} value={String(t.traningId)}>
                    {t.trainingTitle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
      rowData={filtersReady ? details : []}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: 'Search details…',
        pdfDocumentTitle: 'Training Details',
      }}
      toolbarTrailing={(
        <Button
          size="sm"
          disabled={!filtersReady}
          onClick={() =>
            router.push(
              `/trainings/training-detail?a=New+Training+Detail&paTraningId=${traningId}&trainingTitle=${encodeURIComponent(selectedTraining?.trainingTitle ?? '')}&collegeId=${collegeId}&yearName=${encodeURIComponent(yearName)}`,
            )
          }
        >
          + Add Training Detail
        </Button>
      )}
    />
  )
}

export default function TrainingDetailsPage() {
  return (
    <Suspense>
      <TrainingDetailsContent />
    </Suspense>
  )
}
