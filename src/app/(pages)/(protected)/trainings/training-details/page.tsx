'use client'

import { useState, useMemo, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { PencilIcon } from 'lucide-react'
import { FilteredListPage } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Select } from '@/common/components/select'
import { StatusBadge } from '@/common/components/data-display'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import {
  listTrainingsByCollegeAndYear,
  listTrainingDetailsByCollegeAndTraining,
} from '@/services/trainings'
import { listColleges } from '@/services/admin/college'
import type { PlacementTraining, TrainingDetail } from '@/types/trainings'
import type { College } from '@/types/college'
import { rowIndexGetter } from '@/lib/utils'

function buildYearOptions(): { value: string; label: string }[] {
  const current = new Date().getFullYear()
  return Array.from({ length: 10 }, (_, i) => {
    const y = String(current - i)
    return { value: y, label: y }
  })
}

function tConvert(time?: string | null): string {
  if (!time) return ''
  const match = String(time).match(/^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/)
  if (!match) return time
  const hour = Number(match[1])
  const mins = match[2]
  const ampm = hour < 12 ? 'AM' : 'PM'
  const h12 = hour % 12 || 12
  return `${h12}:${mins} ${ampm}`
}

function statusRenderer(p: ICellRendererParams<TrainingDetail>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function TrainingDetailsContent() {
  const router = useRouter()
  const params = useSearchParams()

  const [colleges, setColleges] = useState<College[]>([])
  const [trainings, setTrainings] = useState<PlacementTraining[]>([])
  const [loadingTrainings, setLoadingTrainings] = useState(false)

  const [collegeId, setCollegeId] = useState<string | null>(params.get('collegeId'))
  const [yearName, setYearName] = useState<string | null>(params.get('yearName'))
  const [traningId, setTraningId] = useState<string | null>(
    params.get('paTraningId') ?? params.get('traningId'),
  )

  const filtersReady = Boolean(collegeId && yearName && traningId)
  const selectedTraining = trainings.find((t) => String(t.traningId) === traningId)
  const collegeCode =
    colleges.find((c) => String(c.collegeId) === collegeId)?.collegeCode ??
    params.get('collegeCode') ??
    ''

  const { data: details, isLoading } = useCrudList<TrainingDetail>({
    queryKey: QK.trainingDetails.byCollegeTraining(Number(collegeId), Number(traningId)),
    queryFn: () =>
      listTrainingDetailsByCollegeAndTraining(Number(collegeId), Number(traningId)),
    enabled: filtersReady,
  })

  useEffect(() => {
    listColleges().then(setColleges).catch(console.error)
  }, [])

  useEffect(() => {
    if (!collegeId || !yearName) {
      setTrainings([])
      return
    }
    setLoadingTrainings(true)
    listTrainingsByCollegeAndYear(Number(collegeId), yearName)
      .then(setTrainings)
      .catch(() => setTrainings([]))
      .finally(() => setLoadingTrainings(false))
  }, [collegeId, yearName])

  const columnDefs = useMemo<ColDef<TrainingDetail>[]>(
    () => [
      { headerName: 'No.', valueGetter: rowIndexGetter, width: 60, flex: 0 },
      { field: 'trainerName', headerName: 'Trainer Name', minWidth: 130, flex: 1 },
      { field: 'trainingDetailTitle', headerName: 'Training Detail Title', minWidth: 180, flex: 2 },
      {
        headerName: 'Timings',
        minWidth: 140,
        flex: 1,
        valueGetter: (p) =>
          `${tConvert(p.data?.startTime)} - ${tConvert(p.data?.endTime)}`,
      },
      { field: 'fkDayIds', headerName: 'Days', minWidth: 120, flex: 1 },
      { field: 'roomCode', headerName: 'Room', minWidth: 90, flex: 0.8 },
      {
        field: 'isActive',
        headerName: 'Status',
        minWidth: 90,
        flex: 0.8,
        cellRenderer: statusRenderer,
      },
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
                  `/trainings/training-detail?a=Edit+Training+Detail` +
                    `&traningDetId=${row.traningDetId}` +
                    `&traningId=${row.paTraningId}` +
                    `&paTraningId=${row.paTraningId}` +
                    `&trainingTitle=${encodeURIComponent(selectedTraining?.trainingTitle ?? '')}` +
                    `&collegeId=${collegeId}` +
                    `&collegeCode=${encodeURIComponent(collegeCode)}` +
                    `&yearName=${encodeURIComponent(yearName ?? '')}` +
                    `&trainingTypeCatCode=${encodeURIComponent(selectedTraining?.trainingTypeCatCode ?? '')}` +
                    `&empName=${encodeURIComponent(selectedTraining?.empName ?? '')}` +
                    `&empNumber=${encodeURIComponent(selectedTraining?.empNumber ?? '')}`,
                )
              }
            >
              <PencilIcon className="h-3.5 w-3.5" />
            </Button>
          )
        },
      },
    ],
    [router, collegeId, yearName, selectedTraining, collegeCode],
  )

  return (
    <FilteredListPage
      title="Training Details"
      filters={(
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Select
            label="College *"
            value={collegeId}
            onChange={(v) => {
              setCollegeId(v)
              setYearName(null)
              setTraningId(null)
            }}
            options={colleges.map((c) => ({
              value: String(c.collegeId),
              label: c.collegeCode || c.collegeName,
            }))}
            placeholder="Select college"
          />
          <Select
            label="Year *"
            value={yearName}
            onChange={(v) => {
              setYearName(v)
              setTraningId(null)
            }}
            options={buildYearOptions()}
            placeholder="Select year"
            disabled={!collegeId}
          />
          <Select
            label="Training *"
            value={traningId}
            onChange={setTraningId}
            options={trainings.map((t) => ({
              value: String(t.traningId),
              label: t.trainingTitle,
            }))}
            placeholder="Select training"
            disabled={!collegeId || !yearName}
            isLoading={loadingTrainings}
          />
        </div>
      )}
      rowData={filtersReady ? details : []}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: 'Search',
        pdfDocumentTitle: 'Training Details',
      }}
      toolbarTrailing={(
        <Button
          size="sm"
          disabled={!filtersReady}
          onClick={() =>
            router.push(
              `/trainings/training-detail?collegeId=${collegeId}` +
                `&collegeCode=${encodeURIComponent(collegeCode)}` +
                `&yearName=${encodeURIComponent(yearName ?? '')}` +
                `&traningId=${traningId}` +
                `&paTraningId=${traningId}` +
                `&trainingTitle=${encodeURIComponent(selectedTraining?.trainingTitle ?? '')}` +
                `&trainingTypeCatCode=${encodeURIComponent(selectedTraining?.trainingTypeCatCode ?? '')}` +
                `&empName=${encodeURIComponent(selectedTraining?.empName ?? '')}` +
                `&empNumber=${encodeURIComponent(selectedTraining?.empNumber ?? '')}`,
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
