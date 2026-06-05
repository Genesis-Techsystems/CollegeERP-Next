'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ColDef } from 'ag-grid-community'
import { DataTable } from '@/common/components/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Select } from '@/common/components/select'
import { ChevronDown, Filter } from 'lucide-react'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  approveEvaluationAssignments,
  getEvaluationApprovalsFilters,
  listEvaluationApprovals,
} from '@/services/evaluation-process'
import { PageContainer, PageHeader } from '@/components/layout'

type AnyRow = Record<string, any>
const pickNum = (row: AnyRow | null | undefined, keys: string[]) => {
  if (!row) return 0
  for (const k of keys) {
    const n = Number(row[k])
    if (n > 0) return n
  }
  return 0
}
const pickText = (row: AnyRow | null | undefined, keys: string[]) => {
  if (!row) return ''
  for (const k of keys) {
    const v = row[k]
    if (v != null && String(v).trim() !== '') return String(v)
  }
  return ''
}
const dedupeBy = <T,>(rows: T[], keyFn: (r: T) => string | number) => {
  const seen = new Set<string | number>()
  return rows.filter((r) => {
    const key = keyFn(r)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function makeSelectionRenderer(selectedIds: number[], toggleOne: (id: number, checked: boolean) => void) {
  return (p: { data?: AnyRow }) => {
    const row = p.data
    if (!row || pickText(row, ['evaluationstatus', 'evaluationStatus']) !== 'Evaluated') return null
    const rowId = pickNum(row, ['pk_exam_evaluationassignment_id', 'examEvaluationAssignmentId', 'id'])
    return (
      <input
        type="checkbox"
        className="h-3 w-3 accent-[hsl(var(--primary))]"
        checked={selectedIds.includes(rowId)}
        onChange={(e) => toggleOne(rowId, e.target.checked)}
      />
    )
  }
}

function evaluationStatusRenderer(p: { value?: string }) {
  const value = p.value ?? ''
  if (value === 'Finalised') {
    return <Badge className="bg-slate-100 text-slate-700 border border-border">Finalised</Badge>
  }
  return <Badge className="bg-amber-50 text-amber-700 border border-amber-200">Evaluated</Badge>
}

function makeActionsRenderer(loading: boolean, approveOne: (row: AnyRow) => Promise<void>) {
  return (p: { data?: AnyRow }) =>
    pickText(p.data, ['evaluationstatus', 'evaluationStatus']) === 'Finalised' ? (
      <span className="text-[12px] text-slate-600">Finalised</span>
    ) : (
      <button
        type="button"
        className="text-[12px] text-blue-700 hover:underline disabled:text-muted-foreground disabled:no-underline"
        disabled={loading}
        onClick={() => void approveOne(p.data ?? {})}
      >
        Approve
      </button>
    )
}

export default function EvaluationApprovalsPage() {
  const [filterOpen, setFilterOpen] = useState(true)
  const [loading, setLoading] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)
  const [filters, setFilters] = useState<AnyRow[]>([])
  const [rows, setRows] = useState<AnyRow[]>([])
  const [courseId, setCourseId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)
  const [evaluatorProfileId, setEvaluatorProfileId] = useState<number | null>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)
  const organizationId = Number(globalThis?.localStorage?.getItem('organizationId') ?? 0)
  const profileId = Number(globalThis?.localStorage?.getItem('examEvaluatorProfileId') ?? 0)
  const finalizedCatDetId = Number(globalThis?.localStorage?.getItem('Finalized') ?? 0)

  const courses = useMemo(
    () => dedupeBy(filters, (r) => pickNum(r, ['fk_course_id', 'courseId'])),
    [filters],
  )
  const exams = useMemo(
    () =>
      dedupeBy(
        filters.filter((r) => pickNum(r, ['fk_course_id', 'courseId']) === Number(courseId)),
        (r) => pickNum(r, ['fk_exam_id', 'examId']),
      ),
    [filters, courseId],
  )
  const evaluators = useMemo(
    () =>
      dedupeBy(
        filters.filter(
          (r) =>
            pickNum(r, ['fk_course_id', 'courseId']) === Number(courseId) &&
            pickNum(r, ['fk_exam_id', 'examId']) === Number(examId),
        ),
        (r) => pickNum(r, ['fk_exam_evaluator_profile_id', 'examEvaluatorProfileId']),
      ),
    [filters, courseId, examId],
  )

  const evaluatableRows = useMemo(
    () =>
      rows
        .filter((r) => pickText(r, ['evaluationstatus', 'evaluationStatus']) === 'Evaluated')
        .map((r) => pickNum(r, ['pk_exam_evaluationassignment_id', 'examEvaluationAssignmentId', 'id'])),
    [rows],
  )

  const allEvaluatedSelected =
    evaluatableRows.length > 0 && evaluatableRows.every((id) => selectedIds.includes(id))

  function toggleOne(id: number, checked: boolean) {
    setSelectedIds((prev) => (checked ? [...new Set([...prev, id])] : prev.filter((v) => v !== id)))
  }

  function toggleAll(checked: boolean) {
    setSelectedIds(checked ? evaluatableRows : [])
  }

  function secondsToTime(total: number) {
    const h = String(Math.floor(total / 3600)).padStart(2, '0')
    const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0')
    const s = String(total % 60).padStart(2, '0')
    return `${h}:${m}:${s}`
  }

  useEffect(() => {
    async function init() {
      setLoading(true)
      try {
        const list = await getEvaluationApprovalsFilters(employeeId, organizationId).catch(() => [])
        const rows = Array.isArray(list) ? list : []
        setFilters(rows)
        if (rows[0]) setCourseId(pickNum(rows[0], ['fk_course_id', 'courseId']))
      } finally {
        setLoading(false)
      }
    }
    void init()
  }, [employeeId, organizationId])

  useEffect(() => {
    if (exams[0]) setExamId(pickNum(exams[0], ['fk_exam_id', 'examId']))
  }, [exams])
  useEffect(() => {
    if (evaluators[0]) {
      setEvaluatorProfileId(pickNum(evaluators[0], ['fk_exam_evaluator_profile_id', 'examEvaluatorProfileId']))
    }
  }, [evaluators])

  useEffect(() => {
    setRows([])
    setHasFetched(false)
    setSelectedIds([])
  }, [courseId, examId, evaluatorProfileId])

  async function getList() {
    if (!courseId || !examId || !evaluatorProfileId) {
      toastError('Please select Course, Exam and Evaluator.')
      return
    }
    setLoading(true)
    try {
      const list = await listEvaluationApprovals({
        employeeId,
        organizationId,
        courseId,
        examId,
        evaluatorProfileId,
      }).catch(() => [])
      setRows(Array.isArray(list) ? list : [])
      setHasFetched(true)
    } finally {
      setLoading(false)
    }
  }

  async function approveSelected() {
    if (selectedIds.length === 0) return
    const payload = rows
      .filter((r) =>
        selectedIds.includes(pickNum(r, ['pk_exam_evaluationassignment_id', 'examEvaluationAssignmentId', 'id'])),
      )
      .map((r) => ({
        evaluationStatusCatDetId: finalizedCatDetId || 0,
        examEvaluationAssignmentId: pickNum(r, ['pk_exam_evaluationassignment_id', 'examEvaluationAssignmentId', 'id']),
        isActive: true,
        evaluationStatusByProfileId: profileId || evaluatorProfileId || 0,
      }))
      .filter((r) => r.examEvaluationAssignmentId > 0)

    if (payload.length === 0) {
      toastError('No valid records selected for approval.')
      return
    }
    setLoading(true)
    try {
      await approveEvaluationAssignments(payload)
      toastSuccess('Approvals updated successfully.')
      setSelectedIds([])
      await getList()
    } catch (error: any) {
      toastError(error?.message ?? 'Failed to approve selected rows.')
    } finally {
      setLoading(false)
    }
  }

  async function approveOne(row: AnyRow) {
    const rowId = pickNum(row, ['pk_exam_evaluationassignment_id', 'examEvaluationAssignmentId', 'id'])
    if (rowId <= 0) {
      toastError('Unable to approve this row.')
      return
    }
    setLoading(true)
    try {
      await approveEvaluationAssignments([
        {
          evaluationStatusCatDetId: finalizedCatDetId || 0,
          examEvaluationAssignmentId: rowId,
          isActive: true,
          evaluationStatusByProfileId: profileId || evaluatorProfileId || 0,
        },
      ])
      toastSuccess('Row approved successfully.')
      setSelectedIds((prev) => prev.filter((id) => id !== rowId))
      await getList()
    } catch (error: any) {
      toastError(error?.message ?? 'Failed to approve row.')
    } finally {
      setLoading(false)
    }
  }

  const cols = useMemo<ColDef[]>(
    () => [
      {
        headerName: '',
        width: 70,
        cellRenderer: makeSelectionRenderer(selectedIds, toggleOne),
      },
      { headerName: 'SI.No', valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, width: 80 },
      { field: 'omrSerialNo', headerName: 'Omr Serial No', minWidth: 130, valueGetter: (p) => p.data?.omr_serial_no ?? p.data?.omrSerialNo ?? '-' },
      { field: 'evaluatedTotalMarks', headerName: 'Evaluated Total Marks', minWidth: 150, valueGetter: (p) => p.data?.evaluated_totalmarks ?? p.data?.evaluatedTotalMarks ?? '-' },
      { field: 'answerSheetCheckDate', headerName: 'Answer Sheet Check Date', minWidth: 160, valueGetter: (p) => p.data?.answersheetcheckdate ?? p.data?.answerSheetCheckDate ?? '-' },
      {
        field: 'evaluationTimeSec',
        headerName: 'Evaluation Time',
        minWidth: 130,
        valueGetter: (p) => p.data?.evaluationtime_sec ?? p.data?.evaluationTimeSec ?? 0,
        valueFormatter: (p) => secondsToTime(Number(p.value ?? 0)),
      },
      {
        field: 'evaluationStatus',
        headerName: 'Evaluation Status',
        minWidth: 130,
        cellRenderer: evaluationStatusRenderer,
        valueGetter: (p) => p.data?.evaluationstatus ?? p.data?.evaluationStatus ?? '',
      },
      { field: 'evaluatedAnswerPaperPath', headerName: 'Evaluated Answer Sheets', minWidth: 160, valueGetter: (p) => p.data?.evaluated_answerpaper_path ?? p.data?.evaluatedAnswerPaperPath ?? '-' },
      {
        headerName: 'Actions',
        minWidth: 120,
        cellRenderer: makeActionsRenderer(loading, approveOne),
      },
    ],
    [selectedIds, loading],
  )

  return (
    <PageContainer className="space-y-4">
      <PageHeader title="Moderator Approvals" subtitle="Review and approve evaluation assignments" />
      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center justify-between gap-2">
          <h2 className="app-card-title">Moderator Approvals</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-6 px-2.5 text-[12px]"
            onClick={() => setFilterOpen((v) => !v)}
            aria-expanded={filterOpen}
          >
            <Filter className="mr-1.5 h-3.5 w-3.5" />
            Filter
            <ChevronDown className={`ml-1.5 h-3.5 w-3.5 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
          </Button>
        </div>
        {filterOpen && (
          <div className="p-3 space-y-2 text-[13px]">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
            <div className="md:col-span-3">
              <Label className="text-[12px] text-muted-foreground">Course</Label>
              <Select
                value={courseId ? String(courseId) : null}
                onChange={(v) => setCourseId(v ? Number(v) : 0)}
                options={courses.map((c) => ({ value: String(pickNum(c, ['fk_course_id', 'courseId'])), label: pickText(c, ['course_code', 'courseCode', 'course_name', 'courseName']) }))}
                placeholder="Course"
              />
            </div>
            <div className="md:col-span-5">
              <Label className="text-[12px] text-muted-foreground">Exam</Label>
              <Select
                value={examId ? String(examId) : null}
                onChange={(v) => setExamId(v ? Number(v) : 0)}
                options={exams.map((e) => ({ value: String(pickNum(e, ['fk_exam_id', 'examId'])), label: pickText(e, ['exam_name', 'examName']) }))}
                placeholder="Exam"
              />
            </div>
            <div className="md:col-span-3">
              <Label className="text-[12px] text-muted-foreground">Evaluators</Label>
              <Select
                value={evaluatorProfileId ? String(evaluatorProfileId) : null}
                onChange={(v) => setEvaluatorProfileId(v ? Number(v) : 0)}
                options={evaluators.map((e) => ({ value: String(pickNum(e, ['fk_exam_evaluator_profile_id', 'examEvaluatorProfileId'])), label: pickText(e, ['evaluator_name', 'evaluatorName']) || `Evaluator ${pickNum(e, ['fk_exam_evaluator_profile_id', 'examEvaluatorProfileId'])}` }))}
                placeholder="Evaluator"
              />
            </div>
            <div className="md:col-span-1">
              <Button className="h-8 px-3 text-[12px] w-full" onClick={getList} disabled={loading}>
                Get List
              </Button>
            </div>
          </div>
          </div>
        )}
      </div>

      {hasFetched && (
        <div className="app-card overflow-hidden">
          <div className="p-4">
            <DataTable
              rowData={rows}
              columnDefs={cols}
              pagination
              loading={loading}
              toolbar={{
                search: true,
                searchPlaceholder: 'Search…',
                pdfDocumentTitle: 'Evaluation Approvals',
              }}
              toolbarTrailing={
                <>
                  <label
                    className={`inline-flex items-center gap-2 text-[12px] shrink-0 ${
                      allEvaluatedSelected ? 'text-[hsl(var(--primary))]' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="h-3 w-3 accent-[hsl(var(--primary))]"
                      checked={allEvaluatedSelected}
                      disabled={evaluatableRows.length === 0}
                      onChange={(e) => toggleAll(e.target.checked)}
                    />
                    <span>All</span>
                  </label>
                  <Button type="button" size="sm" disabled={selectedIds.length === 0 || loading} onClick={() => void approveSelected()}>
                    Approve
                  </Button>
                </>
              }
            />
          </div>
        </div>
      )}
    </PageContainer>
  )
}
