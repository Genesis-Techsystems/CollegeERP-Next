'use client'

import { useEffect, useMemo, useState } from 'react'
import { Monitor } from 'lucide-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { FilterCard, FILTER_CARD_SELECT_CLASS } from '@/common/components/feedback'
import { Select } from '@/common/components/select'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { QK } from '@/lib/query-keys'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  listAcademicYearsByUniversity,
  listBatchesByCourse,
  listCollegesActive,
  listCoursesByUniversity,
  listFeeCollectionQuotaOptions,
  listFeeStructuresForAllocation,
  loadStudentFeeStructureAllocation,
} from '@/services'

type FeeStructureRow = Record<string, unknown> & {
  feeStructureId?: number
  classGroupName?: string
  structureName?: string
}

export default function AllocateStudentFeePage() {
  const [mode, setMode] = useState<'batch' | 'academic'>('batch')
  const [collegeId, setCollegeId] = useState<string | null>(null)
  const [academicYearId, setAcademicYearId] = useState<string | null>(null)
  const [courseId, setCourseId] = useState<string | null>(null)
  const [batchId, setBatchId] = useState<string | null>(null)
  const [quotaId, setQuotaId] = useState<string | null>(null)
  const [universityId, setUniversityId] = useState(0)
  const [checkedIds, setCheckedIds] = useState<Set<number>>(() => new Set())

  const { data: colleges = [] } = useQuery({
    queryKey: ['feesCollection', 'colleges'],
    queryFn: listCollegesActive,
  })

  const { data: courses = [] } = useQuery({
    queryKey: ['feesCollection', 'courses', universityId],
    queryFn: () => listCoursesByUniversity(universityId),
    enabled: universityId > 0,
  })

  const { data: academicYears = [] } = useQuery({
    queryKey: ['feesCollection', 'academicYears', universityId],
    queryFn: () => listAcademicYearsByUniversity(universityId),
    enabled: universityId > 0 && mode === 'academic',
  })

  const { data: batches = [] } = useQuery({
    queryKey: ['feesCollection', 'batches', courseId],
    queryFn: () => listBatchesByCourse(Number(courseId)),
    enabled: mode === 'batch' && !!courseId,
  })

  const { data: quotas = [] } = useQuery({
    queryKey: ['feesCollection', 'quotas'],
    queryFn: listFeeCollectionQuotaOptions,
  })

  const structureFilters = useMemo(
    () => ({
      collegeId: Number(collegeId ?? 0),
      quotaId: quotaId != null ? Number(quotaId) : -1,
      courseId: Number(courseId ?? 0),
      batchId: batchId ? Number(batchId) : undefined,
      academicYearId: academicYearId ? Number(academicYearId) : undefined,
      isAcademicFee: mode === 'academic',
    }),
    [collegeId, quotaId, courseId, batchId, academicYearId, mode],
  )

  const canLoadStructures =
    structureFilters.collegeId > 0 &&
    structureFilters.courseId > 0 &&
    quotaId != null &&
    quotaId !== ''

  const { data: feeStructures, isFetching: structuresLoading } = useQuery({
    queryKey: QK.feesCollection.allocateStructures(structureFilters),
    queryFn: () => listFeeStructuresForAllocation(structureFilters),
    enabled: canLoadStructures,
  })

  const structureRows: FeeStructureRow[] = feeStructures ?? []

  const selectionResetKey = useMemo(
    () =>
      [mode, collegeId, academicYearId, courseId, batchId, quotaId].join('|'),
    [mode, collegeId, academicYearId, courseId, batchId, quotaId],
  )

  useEffect(() => {
    setCheckedIds(new Set())
  }, [selectionResetKey])

  const saveMutation = useMutation({
    mutationFn: () =>
      loadStudentFeeStructureAllocation({
        mode,
        feeStructureIds: [...checkedIds],
      }),
    onSuccess: () => toastSuccess('Fee structure allocation saved'),
    onError: (e) => toastError(e),
  })

  function resetSelection() {
    setCheckedIds(new Set())
  }

  function handleModeChange(next: 'batch' | 'academic') {
    setMode(next)
    setAcademicYearId(null)
    setBatchId(null)
    setQuotaId(null)
    resetSelection()
  }

  function toggleStructure(id: number, checked: boolean) {
    setCheckedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const quotaOptions = useMemo(
    () => [
      { value: '0', label: 'All' },
      ...quotas.map((q) => ({
        value: String(q.generalDetailId ?? ''),
        label: String(
          (q as { generalDetailDisplayName?: string }).generalDetailDisplayName ??
            q.generalDetailName ??
            q.generalDetailId ??
            '',
        ),
      })),
    ],
    [quotas],
  )

  return (
    <PageContainer className="space-y-5">
      <div className="flex flex-wrap gap-6 rounded-lg border bg-card px-4 py-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
          <input
            type="radio"
            name="allocate-fee-mode"
            className="h-4 w-4 accent-primary"
            checked={mode === 'batch'}
            onChange={() => handleModeChange('batch')}
          />
          Batch-Wise Fee Structure
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
          <input
            type="radio"
            name="allocate-fee-mode"
            className="h-4 w-4 accent-primary"
            checked={mode === 'academic'}
            onChange={() => handleModeChange('academic')}
          />
          Academic-Wise Fee Structure
        </label>
      </div>

      <FilterCard
        title={
          <span className="inline-flex items-center gap-2">
            <Monitor className="h-4 w-4 text-slate-500" />
            Allocate Student Fee Structure
          </span>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            className={FILTER_CARD_SELECT_CLASS}
            label="College"
            required
            value={collegeId}
            onChange={(v) => {
              setCollegeId(v)
              const college = colleges.find((c) => String(c.collegeId) === v)
              setUniversityId(Number(college?.universityId ?? 0))
              setCourseId(null)
              setBatchId(null)
              setAcademicYearId(null)
              setQuotaId(null)
              resetSelection()
            }}
            options={colleges.map((c) => ({
              value: String(c.collegeId ?? ''),
              label: String(c.collegeCode ?? c.collegeId ?? ''),
            }))}
            placeholder="College"
            searchable
          />

          {mode === 'academic' ? (
            <Select
              className={FILTER_CARD_SELECT_CLASS}
              label="Academic Year"
              value={academicYearId}
              onChange={(v) => {
                setAcademicYearId(v)
                setQuotaId(null)
                resetSelection()
              }}
              options={academicYears.map((ay) => ({
                value: String(ay.academicYearId ?? ''),
                label: String(ay.academicYear ?? ay.academicYearId ?? ''),
              }))}
              placeholder="Academic Year"
              disabled={!collegeId}
              searchable
            />
          ) : null}

          <Select
            className={FILTER_CARD_SELECT_CLASS}
            label="Course"
            required
            value={courseId}
            onChange={(v) => {
              setCourseId(v)
              setBatchId(null)
              setQuotaId(null)
              resetSelection()
            }}
            options={courses.map((c) => ({
              value: String(c.courseId ?? ''),
              label: String(c.courseCode ?? c.courseName ?? c.courseId ?? ''),
            }))}
            placeholder="Course"
            disabled={!collegeId}
            searchable
          />

          {mode === 'batch' ? (
            <Select
              className={FILTER_CARD_SELECT_CLASS}
              label="Batch"
              value={batchId}
              onChange={(v) => {
                setBatchId(v)
                setQuotaId(null)
                resetSelection()
              }}
              options={batches.map((b) => ({
                value: String(b.batchId ?? ''),
                label: String(b.batchName ?? b.batchId ?? ''),
              }))}
              placeholder="Batch"
              disabled={!courseId}
              searchable
              clearable
            />
          ) : null}

          <Select
            className={FILTER_CARD_SELECT_CLASS}
            label="Quota"
            required
            value={quotaId}
            onChange={setQuotaId}
            options={quotaOptions}
            placeholder="Quota"
            disabled={!collegeId || !courseId}
            searchable
          />
        </div>

        {structuresLoading ? (
          <p className="mt-4 text-sm text-slate-500">Loading fee structures…</p>
        ) : null}

        {structureRows.length > 0 ? (
          <div className="mt-5 space-y-3 rounded-md border border-blue-100 bg-blue-50/40 p-4">
            <p className="text-sm font-semibold text-blue-700">Select Fee Structure :</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {structureRows.map((row, index) => {
                const id = Number(row.feeStructureId ?? 0) || index
                const label = String(row.classGroupName ?? row.structureName ?? `Structure ${id}`)
                return (
                  <label
                    key={id}
                    className="flex cursor-pointer items-center gap-2 rounded border bg-white px-3 py-2 text-sm"
                  >
                    <Checkbox
                      checked={checkedIds.has(id)}
                      onCheckedChange={(checked) => toggleStructure(id, checked === true)}
                    />
                    <span>{label}</span>
                  </label>
                )
              })}
            </div>
            <div className="flex justify-end pt-2">
              <Button
                type="button"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || checkedIds.size === 0}
              >
                {saveMutation.isPending ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        ) : null}

        {canLoadStructures && !structuresLoading && structureRows.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No fee structures found for the selected filters.</p>
        ) : null}
      </FilterCard>
    </PageContainer>
  )
}
