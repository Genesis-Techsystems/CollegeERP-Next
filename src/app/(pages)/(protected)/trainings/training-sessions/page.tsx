'use client'

import { useState, useMemo, useEffect, Suspense } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { PencilIcon } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { DataTable } from '@/common/components/table'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { listTrainings, listTrainingDetails, listTrainingSessions } from '@/services/trainings'
import { listColleges } from '@/services/admin/college'
import type { PlacementTraining, TrainingDetail, TrainingSession } from '@/types/trainings'
import type { College } from '@/types/college'
import { rowIndexGetter } from '@/lib/utils'
import AddTrainingSessionModal from './AddTrainingSessionModal'

function buildYearOptions(): string[] {
  const current = new Date().getFullYear()
  return Array.from({ length: 10 }, (_, i) => String(current - i))
}

function activeRenderer(p: ICellRendererParams<TrainingSession>) {
  const active = p.data?.isActive
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
      {active ? 'Active' : 'Inactive'}
    </span>
  )
}

function TrainingSessionsContent() {
  const [colleges, setColleges] = useState<College[]>([])
  const [trainings, setTrainings] = useState<PlacementTraining[]>([])
  const [trainingDetails, setTrainingDetails] = useState<TrainingDetail[]>([])

  const [collegeId, setCollegeId] = useState('')
  const [yearName, setYearName] = useState('')
  const [traningId, setTraningId] = useState('')
  const [traningDetId, setTraningDetId] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editData, setEditData] = useState<TrainingSession | null>(null)

  const filtersReady = Boolean(collegeId && yearName && traningId && traningDetId)

  const { data: sessions, isLoading, invalidate } = useCrudList<TrainingSession>({
    queryKey: QK.trainingSessions.byDetail(Number(traningDetId)),
    queryFn: () => listTrainingSessions(Number(traningDetId)),
    enabled: filtersReady,
  })

  useEffect(() => {
    listColleges().then(setColleges).catch(console.error)
  }, [])

  useEffect(() => {
    if (collegeId && yearName) {
      listTrainings()
        .then((rows) =>
          setTrainings(
            rows.filter(
              (t) => String(t.collegeId) === collegeId && t.yearName === yearName,
            ),
          ),
        )
        .catch(console.error)
    } else {
      setTrainings([])
      setTraningId('')
      setTraningDetId('')
    }
  }, [collegeId, yearName])

  useEffect(() => {
    if (traningId && collegeId && yearName) {
      listTrainingDetails({ collegeId: Number(collegeId), yearName, traningId: Number(traningId) })
        .then(setTrainingDetails)
        .catch(console.error)
    } else {
      setTrainingDetails([])
      setTraningDetId('')
    }
  }, [traningId, collegeId, yearName])

  const selectedDetail = trainingDetails.find((d) => String(d.traningDetId) === traningDetId)

  const columnDefs = useMemo<ColDef<TrainingSession>[]>(
    () => [
      { headerName: 'No.', valueGetter: rowIndexGetter, width: 60, flex: 0 },
      { field: 'trainerName', headerName: 'Trainer Name', minWidth: 130, flex: 1 },
      { field: 'sessionDate', headerName: 'Session Date', minWidth: 110, flex: 1 },
      { field: 'fromTime', headerName: 'From Time', minWidth: 100, flex: 0.8 },
      { field: 'noOfAttendees', headerName: 'Attendees', minWidth: 90, flex: 0.8 },
      { field: 'inchargeEmpName', headerName: 'Incharge', minWidth: 130, flex: 1 },
      { field: 'collegeCode', headerName: 'College', minWidth: 90, flex: 0.8 },
      { field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.8, cellRenderer: activeRenderer },
      {
        headerName: 'Actions',
        width: 80,
        flex: 0,
        cellRenderer: (p: ICellRendererParams<TrainingSession>) => {
          const row = p.data
          if (!row) return null
          return (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={() => { setEditData(row); setModalOpen(true) }}
            >
              <PencilIcon className="h-3.5 w-3.5" />
            </Button>
          )
        },
      },
    ],
    [],
  )

  return (
    <PageContainer className="space-y-4">
      {/* Filter bar */}
      <div className="app-card p-4">
        <h2 className="app-card-title mb-3">Training Sessions</h2>
        <div className="grid grid-cols-4 gap-3">
          <div className="space-y-0.5">
            <Label className="text-xs">College *</Label>
            <Select
              value={collegeId}
              onValueChange={(v) => { setCollegeId(v); setYearName(''); setTraningId(''); setTraningDetId('') }}
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
            <Select
              value={yearName}
              onValueChange={(v) => { setYearName(v); setTraningId(''); setTraningDetId('') }}
              disabled={!collegeId}
            >
              <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
              <SelectContent>
                {buildYearOptions().map((y) => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-0.5">
            <Label className="text-xs">Training *</Label>
            <Select
              value={traningId}
              onValueChange={(v) => { setTraningId(v); setTraningDetId('') }}
              disabled={!collegeId || !yearName || trainings.length === 0}
            >
              <SelectTrigger><SelectValue placeholder="Select training" /></SelectTrigger>
              <SelectContent>
                {trainings.map((t) => (
                  <SelectItem key={t.traningId} value={String(t.traningId)}>
                    {t.trainingTitle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-0.5">
            <Label className="text-xs">Training Detail *</Label>
            <Select
              value={traningDetId}
              onValueChange={setTraningDetId}
              disabled={!traningId || trainingDetails.length === 0}
            >
              <SelectTrigger><SelectValue placeholder="Select detail" /></SelectTrigger>
              <SelectContent>
                {trainingDetails.map((d) => (
                  <SelectItem key={d.traningDetId} value={String(d.traningDetId)}>
                    {d.trainingDetailTitle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Results */}
      {filtersReady && (
        <div className="app-card overflow-hidden">
          <div className="px-3 pb-3 pt-2">
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <DataTable
                rowData={sessions}
                columnDefs={columnDefs}
                loading={isLoading}
                pagination
                toolbar={{
                  search: true,
                  searchPlaceholder: 'Search sessions…',
                  pdfDocumentTitle: 'Training Sessions',
                }}
                toolbarTrailing={
                  <Button
                    size="sm"
                    onClick={() => { setEditData(null); setModalOpen(true) }}
                  >
                    + Add Session
                  </Button>
                }
              />
            </div>
          </div>
        </div>
      )}

      <AddTrainingSessionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editData={editData}
        traningDetId={Number(traningDetId)}
        collegeId={Number(collegeId)}
        onSaved={invalidate}
      />
    </PageContainer>
  )
}

export default function TrainingSessionsPage() {
  return (
    <Suspense>
      <TrainingSessionsContent />
    </Suspense>
  )
}
