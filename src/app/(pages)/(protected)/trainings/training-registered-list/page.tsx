'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ColDef } from 'ag-grid-community'
import { FilteredListPage } from '@/components/layout'
import { Select } from '@/common/components/select'
import {
  listTrainingsByCollegeAndYear,
  listTrainingStudentsByCollegeAndTraining,
} from '@/services/trainings'
import { listColleges } from '@/services/admin/college'
import type { PlacementTraining, TrainingStudent } from '@/types/trainings'
import type { College } from '@/types/college'
import { rowIndexGetter } from '@/lib/utils'

function buildYearOptions(): { value: string; label: string }[] {
  const current = new Date().getFullYear()
  return Array.from({ length: 10 }, (_, i) => {
    const y = String(current - i)
    return { value: y, label: y }
  })
}

type RegisteredRow = TrainingStudent & {
  presentClasses?: number | null
  absentClasses?: number | null
}

export default function TrainingRegisteredListPage() {
  const [colleges, setColleges] = useState<College[]>([])
  const [trainings, setTrainings] = useState<PlacementTraining[]>([])
  const [rows, setRows] = useState<RegisteredRow[]>([])
  const [loadingTrainings, setLoadingTrainings] = useState(false)
  const [loadingRows, setLoadingRows] = useState(false)

  const [collegeId, setCollegeId] = useState<string | null>(null)
  const [yearName, setYearName] = useState<string | null>(null)
  const [traningId, setTraningId] = useState<string | null>(null)

  useEffect(() => {
    listColleges().then(setColleges).catch(console.error)
  }, [])

  useEffect(() => {
    if (!collegeId || !yearName) {
      setTrainings([])
      setTraningId(null)
      setRows([])
      return
    }
    setLoadingTrainings(true)
    listTrainingsByCollegeAndYear(Number(collegeId), yearName)
      .then(setTrainings)
      .catch(() => setTrainings([]))
      .finally(() => setLoadingTrainings(false))
  }, [collegeId, yearName])

  useEffect(() => {
    if (!collegeId || !traningId) {
      setRows([])
      return
    }
    setLoadingRows(true)
    // Angular: College.collegeId==X.and.Training.traningId==Y
    listTrainingStudentsByCollegeAndTraining(Number(collegeId), Number(traningId))
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoadingRows(false))
  }, [collegeId, traningId])

  const columnDefs = useMemo<ColDef<RegisteredRow>[]>(
    () => [
      { headerName: 'No.', valueGetter: rowIndexGetter, width: 60, flex: 0 },
      {
        headerName: 'Name',
        minWidth: 220,
        flex: 2,
        valueGetter: (p) => {
          const row = p.data
          if (!row) return ''
          const name = row.firstName ?? '—'
          if (row.empNumber) return `${name} (${row.empNumber}) E`
          if (row.rollNumber) return `${name} (${row.rollNumber}) S`
          return name
        },
      },
      {
        field: 'presentClasses',
        headerName: 'Present Classes',
        minWidth: 130,
        flex: 1,
        valueGetter: (p) => p.data?.presentClasses ?? 0,
      },
      {
        field: 'absentClasses',
        headerName: 'Absent Classes',
        minWidth: 130,
        flex: 1,
        valueGetter: (p) => p.data?.absentClasses ?? 0,
      },
    ],
    [],
  )

  return (
    <FilteredListPage
      title="Training Registered List"
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
              label: `${t.trainingTitle}${t.startDate ? ` (${t.startDate} - ${t.endDate})` : ''}`,
            }))}
            placeholder="Select training"
            disabled={!collegeId || !yearName}
            isLoading={loadingTrainings}
          />
        </div>
      )}
      rowData={collegeId && traningId ? rows : []}
      columnDefs={columnDefs}
      loading={loadingRows}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: 'Search',
        pdfDocumentTitle: 'Training Registered List',
      }}
    />
  )
}
