'use client'

import { useEffect, useMemo, useState } from 'react'
import { BookMarked, ChevronDown, Pencil } from 'lucide-react'
import type { ColDef } from 'ag-grid-community'
import { PageContainer, PageHeader } from '@/components/layout'
import { DataTable } from '@/common/components/table'
import { Select } from '@/common/components/select'
import { FormModal } from '@/common/components/feedback'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { GENERALCONSTANTS } from '@/common/general-constants'
import { toastError, toastSuccess } from '@/lib/toast'
import { getEvaluationApprovalsFilters, approveEvaluationAssignments } from '@/services/evaluation-process'
import { getStudentAnswerPapers } from '@/services/evaluation'

type AnyRow = Record<string, any>

type AnswerPaperRow = {
  examEvaluationAssignmentId: number
  omrSerialNo: string
  evaluatedTotalMarks: number | null
  answerSheetCheckDate: string | null
  studentAnswerPath: string | null
  evaluationStatusCatDetId: number
  evaluationStatusCatDetCode?: string
  evaluationStatusByProfileId?: number
}

const STATUS_OPTIONS = GENERALCONSTANTS.statusColors.map((s) => ({
  value: String(s.id),
  label: s.status === 'InProgress' ? 'In Progress' : s.status,
}))

function pickNum(row: AnyRow | null | undefined, keys: string[]) {
  if (!row) return 0
  for (const key of keys) {
    const n = Number(row[key])
    if (Number.isFinite(n) && n > 0) return n
  }
  return 0
}

function pickText(row: AnyRow | null | undefined, keys: string[]) {
  if (!row) return ''
  for (const key of keys) {
    const v = row[key]
    if (v != null && String(v).trim() !== '') return String(v)
  }
  return ''
}

function dedupeBy<T>(rows: T[], keyFn: (row: T) => string | number) {
  const seen = new Set<string | number>()
  return rows.filter((row) => {
    const key = keyFn(row)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function fmtDate(input: string | null) {
  if (!input) return '-'
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return input
  return d.toLocaleDateString('en-US')
}

function statusText(row: AnswerPaperRow) {
  if (!row.studentAnswerPath) return 'Answer Paper Not Available'
  const code = String(row.evaluationStatusCatDetCode ?? '').toLowerCase()
  if (code === 'reject') return 'Rejected'
  if (code === 'finalised' || code === 'finalized') return 'Finalised'
  if (code === 'approved') return 'Approved'
  if (code === 'evaluated') return 'Evaluated'
  if (code === 'inprogress') return 'In Progress'
  if (code === 'assigned') return 'Check Answersheet'
  if (code === 'new') return 'Check Answersheet'
  const id = Number(row.evaluationStatusCatDetId)
  if (id === 632) return 'Rejected'
  if (id === 631) return 'Finalised'
  if (id === 630) return 'Approved'
  if (id === 629) return 'Evaluated'
  if (id === 628) return 'In Progress'
  if (id === 627 || id === 626 || id === 0) return 'Check Answersheet'
  return '-'
}

function marksText(row: AnswerPaperRow) {
  const text = statusText(row)
  return text === 'Evaluated' || text === 'Finalised' ? (row.evaluatedTotalMarks ?? '-') : '-'
}

function checkDateText(row: AnswerPaperRow) {
  const text = statusText(row)
  return text === 'Evaluated' || text === 'Finalised' ? fmtDate(row.answerSheetCheckDate) : '-'
}

function makeActionRenderer(onEdit: (row: AnswerPaperRow) => void) {
  return (p: { data?: AnswerPaperRow }) => {
    const row = p.data
    if (!row) return null
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => onEdit(row)}
        aria-label="Update status"
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
    )
  }
}

export default function EvaluationStatusTrackingPage() {
  const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)
  const [loading, setLoading] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(true)
  const [filters, setFilters] = useState<AnyRow[]>([])
  const [rows, setRows] = useState<AnswerPaperRow[]>([])
  const [hasFetched, setHasFetched] = useState(false)

  const [examMonthYear, setExamMonthYear] = useState<string | null>(null)
  const [subjectCode, setSubjectCode] = useState<string | null>(null)
  const [evaluatorProfileId, setEvaluatorProfileId] = useState<number | null>(null)
  const [timeTableId, setTimeTableId] = useState<number | null>(null)

  const [editOpen, setEditOpen] = useState(false)
  const [editingRow, setEditingRow] = useState<AnswerPaperRow | null>(null)
  const [editStatusId, setEditStatusId] = useState<number | null>(null)

  const monthYearRows = useMemo(
    () => dedupeBy(filters, (r) => pickText(r, ['exam_month_yr', 'examMonthYear'])),
    [filters],
  )

  const subjectRows = useMemo(() => {
    const base = filters.filter((r) => pickText(r, ['exam_month_yr', 'examMonthYear']) === (examMonthYear ?? ''))
    return dedupeBy(base, (r) => pickText(r, ['evaluator_subject_code', 'subject_code', 'subjectCode']))
  }, [filters, examMonthYear])

  const evaluatorRows = useMemo(() => {
    const base = filters.filter(
      (r) =>
        pickText(r, ['exam_month_yr', 'examMonthYear']) === (examMonthYear ?? '') &&
        pickText(r, ['evaluator_subject_code', 'subject_code', 'subjectCode']) === (subjectCode ?? ''),
    )
    return dedupeBy(base, (r) => pickNum(r, ['fk_exam_evaluator_profile_id', 'examEvaluatorProfileId']))
  }, [filters, examMonthYear, subjectCode])

  useEffect(() => {
    async function init() {
      setLoading(true)
      try {
        const list = await getEvaluationApprovalsFilters(employeeId).catch(() => [])
        const safe = Array.isArray(list) ? list : []
        setFilters(safe)
      } catch (error) {
        toastError(error, 'Failed to load filters')
      } finally {
        setLoading(false)
      }
    }
    void init()
  }, [employeeId])

  useEffect(() => {
    if (!examMonthYear && monthYearRows[0]) {
      setExamMonthYear(pickText(monthYearRows[0], ['exam_month_yr', 'examMonthYear']))
    }
  }, [monthYearRows, examMonthYear])

  useEffect(() => {
    const first = subjectRows[0]
    setSubjectCode(first ? pickText(first, ['evaluator_subject_code', 'subject_code', 'subjectCode']) : null)
  }, [subjectRows])

  useEffect(() => {
    const first = evaluatorRows[0]
    const profile = first ? pickNum(first, ['fk_exam_evaluator_profile_id', 'examEvaluatorProfileId']) : null
    const ttId = first ? pickNum(first, ['fk_exam_timetable_det_id', 'examTimetableDetId']) : null
    setEvaluatorProfileId(profile && profile > 0 ? profile : null)
    setTimeTableId(ttId && ttId > 0 ? ttId : null)
  }, [evaluatorRows])

  useEffect(() => {
    setRows([])
    setHasFetched(false)
  }, [examMonthYear, subjectCode, evaluatorProfileId, timeTableId])

  const columnDefs = useMemo<ColDef<AnswerPaperRow>[]>(
    () => [
      { headerName: 'SI.No', valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, width: 80, flex: 0 },
      { field: 'omrSerialNo', headerName: 'Serial Number', minWidth: 140 },
      {
        field: 'evaluationStatusCatDetId',
        headerName: 'Status',
        minWidth: 170,
        valueGetter: (p) => (p.data ? statusText(p.data) : '-'),
      },
      {
        field: 'evaluatedTotalMarks',
        headerName: 'Evaluator Marks',
        minWidth: 120,
        valueGetter: (p) => (p.data ? marksText(p.data) : '-'),
      },
      {
        field: 'answerSheetCheckDate',
        headerName: 'AnswerSheet Check Date',
        minWidth: 170,
        valueGetter: (p) => (p.data ? checkDateText(p.data) : '-'),
      },
      {
        headerName: 'Actions',
        minWidth: 100,
        flex: 0,
        width: 100,
        cellRenderer: makeActionRenderer((row) => {
          setEditingRow(row)
          setEditStatusId(row.evaluationStatusCatDetId || null)
          setEditOpen(true)
        }),
      },
    ],
    [],
  )

  async function getList() {
    if (!evaluatorProfileId || !timeTableId) {
      toastError('Please select Exam Month Year, Subject and Evaluator.')
      return
    }
    setLoading(true)
    try {
      const list = await getStudentAnswerPapers(evaluatorProfileId, timeTableId).catch(() => [])
      setRows(Array.isArray(list) ? (list as AnswerPaperRow[]) : [])
      setHasFetched(true)
    } catch (error) {
      toastError(error, 'Failed to load answer papers')
      setRows([])
      setHasFetched(true)
    } finally {
      setLoading(false)
    }
  }

  async function submitStatusUpdate(e: { preventDefault: () => void }) {
    e.preventDefault()
    if (!editingRow || !editStatusId) return
    setLoading(true)
    try {
      await approveEvaluationAssignments([
        {
          evaluationStatusCatDetId: editStatusId,
          examEvaluationAssignmentId: editingRow.examEvaluationAssignmentId,
          isActive: true,
          evaluationStatusByProfileId: editingRow.evaluationStatusByProfileId || evaluatorProfileId || 0,
        },
      ])
      toastSuccess('Answer paper status updated successfully.')
      setEditOpen(false)
      setEditingRow(null)
      await getList()
    } catch (error) {
      toastError(error, 'Failed to update status')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageContainer className="space-y-4">
      <PageHeader title="Evaluation status tracking" subtitle="Evaluation process · Update evaluator answer paper status" />

      <div className="app-card p-3 border-t-[3px] border-t-amber-300">
        <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <BookMarked className="h-4 w-4 text-blue-700" aria-hidden />
            <h2 className="app-card-title">Evaluation status tracking</h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-[13px]"
            onClick={() => setFiltersOpen((prev) => !prev)}
            aria-expanded={filtersOpen}
          >
            Filters
            <ChevronDown className={`ml-1 h-4 w-4 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
          </Button>
        </div>

        {filtersOpen && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="space-y-1 md:col-span-2">
              <Label>Exam Month Year</Label>
              <Select
                value={examMonthYear}
                onChange={(v) => setExamMonthYear(v)}
                options={monthYearRows.map((r) => {
                  const val = pickText(r, ['exam_month_yr', 'examMonthYear'])
                  return { value: val, label: val || '-' }
                })}
                placeholder="Exam month year"
                searchable
                disabled={loading}
              />
            </div>
            <div className="space-y-1 md:col-span-6">
              <Label>Subject</Label>
              <Select
                value={subjectCode}
                onChange={(v) => setSubjectCode(v)}
                options={subjectRows.map((r) => {
                  const code = pickText(r, ['evaluator_subject_code', 'subject_code', 'subjectCode'])
                  const name = pickText(r, ['subject_name', 'subjectName'])
                  const label = (name || 'Subject') + (code ? ` (${code})` : '')
                  return { value: code, label }
                })}
                placeholder="Subject"
                searchable
                disabled={!examMonthYear || loading}
              />
            </div>
            <div className="space-y-1 md:col-span-3">
              <Label>Evaluators</Label>
              <Select
                value={evaluatorProfileId ? String(evaluatorProfileId) : null}
                onChange={(v) => {
                  const id = v ? Number(v) : 0
                  const match = evaluatorRows.find(
                    (r) => pickNum(r, ['fk_exam_evaluator_profile_id', 'examEvaluatorProfileId']) === id,
                  )
                  setEvaluatorProfileId(id > 0 ? id : null)
                  setTimeTableId(match ? pickNum(match, ['fk_exam_timetable_det_id', 'examTimetableDetId']) : null)
                }}
                options={evaluatorRows.map((r) => {
                  const id = pickNum(r, ['fk_exam_evaluator_profile_id', 'examEvaluatorProfileId'])
                  const evaluator = pickText(r, ['evaluator_name', 'evaluatorName'])
                  const user = pickText(r, ['user_name', 'userName'])
                  const label = (evaluator || 'Evaluator') + (user ? ` (${user})` : '')
                  return { value: String(id), label }
                })}
                placeholder="Evaluator"
                searchable
                disabled={!subjectCode || loading}
              />
            </div>
            <div className="md:col-span-1">
              <Button className="h-9 w-full" onClick={() => void getList()} disabled={loading}>
                Get List
              </Button>
            </div>
          </div>
        )}
      </div>

      {hasFetched && (
        <div className="app-card overflow-hidden">
          <div className="p-3">
            <DataTable
              rowData={rows}
              columnDefs={columnDefs}
              pagination
              loading={loading}
              toolbar={{
                search: true,
                searchPlaceholder: 'Search…',
                pdfDocumentTitle: 'Answer Paper Status',
              }}
            />
          </div>
        </div>
      )}

      <FormModal
        open={editOpen}
        onClose={() => {
          setEditOpen(false)
          setEditingRow(null)
        }}
        title="Update answer paper status"
        onSubmit={submitStatusUpdate}
        isSubmitting={loading}
        submitLabel="Save"
        size="sm"
      >
        <div className="space-y-1">
          <Label>Status</Label>
          <Select
            value={editStatusId ? String(editStatusId) : null}
            onChange={(v) => setEditStatusId(v ? Number(v) : null)}
            options={STATUS_OPTIONS}
            placeholder="Select status"
            searchable
          />
        </div>
      </FormModal>
    </PageContainer>
  )
}
