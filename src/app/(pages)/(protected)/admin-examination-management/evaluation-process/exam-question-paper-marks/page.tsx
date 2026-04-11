'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { BookOpenCheck, PencilIcon } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout'
import { DataTable } from '@/common/components/table'
import { SearchInput } from '@/common/components/search'
import { StatusBadge } from '@/common/components/data-display'
import { Button } from '@/components/ui/button'
import { Select } from '@/common/components/select'
import type { SelectOption } from '@/common/components/select'
import { useSessionContext } from '@/context/SessionContext'
import {
  getExamFiltersForQp,
  getQuestionPaperList,
  type ExamQuestionPaper,
} from '@/services/evaluation'
import { rowIndexGetter } from '@/lib/utils'

// ─── Filter row shapes returned by getExamFiltersForQp ────────────────────────
// The stored proc returns multiple result sets. We inspect each row for known
// fields and group them into courses / exams / subjects.

interface FilterCourse {
  course_id?: number
  fk_course_id?: number
  course_name?: string
  course_code?: string
}

interface FilterExam {
  exam_id?: number
  fk_exam_id?: number
  exam_name?: string
}

interface FilterSubject {
  subject_id?: number
  fk_subject_id?: number
  subject_name?: string
  subject_code?: string
}

interface FilterRegulation {
  regulation_id?: number
  fk_regulation_id?: number
  regulation_code?: string
}

// ─── Column shape (pure data — no renderers) ──────────────────────────────────

const COL_DEFS = {
  siNo:        { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<ExamQuestionPaper>,
  title:       { field: 'questionpaper_title', headerName: 'Title', minWidth: 200 } as ColDef<ExamQuestionPaper>,
  code:        { field: 'questionpaper_code', headerName: 'Code', minWidth: 140 } as ColDef<ExamQuestionPaper>,
  setNo:       { field: 'setnumber', headerName: 'Set No.', minWidth: 90, width: 90, flex: 0 } as ColDef<ExamQuestionPaper>,
  totalQs:     { field: 'totalquestions', headerName: 'Total Questions', minWidth: 130 } as ColDef<ExamQuestionPaper>,
  totalMarks:  { field: 'totalmarks', headerName: 'Total Marks', minWidth: 120 } as ColDef<ExamQuestionPaper>,
  passMarks:   { field: 'passmarks', headerName: 'Pass Marks', minWidth: 110 } as ColDef<ExamQuestionPaper>,
  subject:     { field: 'subject_name', headerName: 'Subject', minWidth: 160 } as ColDef<ExamQuestionPaper>,
  exam:        { field: 'exam_name', headerName: 'Exam', minWidth: 150 } as ColDef<ExamQuestionPaper>,
  isActive:    { field: 'isActive', headerName: 'Status', minWidth: 110 } as ColDef<ExamQuestionPaper>,
  actions:     { headerName: 'Actions', minWidth: 100, flex: 0, width: 100 } as ColDef<ExamQuestionPaper>,
}

// ─── Pure renderers ───────────────────────────────────────────────────────────

function statusRenderer(p: ICellRendererParams<ExamQuestionPaper>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  setEditing: (row: ExamQuestionPaper | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<ExamQuestionPaper>) => (
    <Button
      size="sm"
      variant="ghost"
      onClick={() => { setEditing(p.data ?? null); setModalOpen(true) }}
    >
      <PencilIcon className="h-3.5 w-3.5 mr-1" /> Edit
    </Button>
  )
}

// ─── Helpers: parse filter result sets ────────────────────────────────────────

function toSelectOptions(
  items: unknown[],
  idKey: string,
  fallbackIdKey: string,
  labelKey: string,
  fallbackLabelKey?: string,
): SelectOption[] {
  const seen = new Set<string>()
  const opts: SelectOption[] = []
  for (const item of items) {
    const row = item as Record<string, unknown>
    const id = row[idKey] ?? row[fallbackIdKey]
    const label = row[labelKey] ?? (fallbackLabelKey ? row[fallbackLabelKey] : undefined)
    if (id == null || label == null) continue
    const val = String(id)
    if (seen.has(val)) continue
    seen.add(val)
    opts.push({ value: val, label: String(label) })
  }
  return opts.sort((a, b) => a.label.localeCompare(b.label))
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExamQuestionPaperMarksPage() {
  const { user } = useSessionContext()

  // Filter data
  const [filterLoading, setFilterLoading] = useState(true)
  const [allFilterRows, setAllFilterRows] = useState<unknown[]>([])
  const [courseOptions, setCourseOptions] = useState<SelectOption[]>([])
  const [examOptions, setExamOptions] = useState<SelectOption[]>([])
  const [subjectOptions, setSubjectOptions] = useState<SelectOption[]>([])

  // Selections
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null)
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null)

  // Table
  const [records, setRecords] = useState<ExamQuestionPaper[]>([])
  const [tableLoading, setTableLoading] = useState(false)
  const [tableVisible, setTableVisible] = useState(false)
  const [search, setSearch] = useState('')

  // Edit modal state (wired to column renderer)
  const [editingRow, setEditingRow] = useState<ExamQuestionPaper | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  // ── Load filter data on mount ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    async function load() {
      setFilterLoading(true)
      try {
        const resultSets = await getExamFiltersForQp({
          employeeId: user?.employeeId,
        })
        if (cancelled) return

        // resultSets is unknown[][]. Flatten all rows and inspect their keys.
        const flat: unknown[] = resultSets.flat()
        setAllFilterRows(flat)

        // Courses — rows that have course_id / fk_course_id
        const courses = flat.filter((r) => {
          const row = r as Record<string, unknown>
          return (row['course_id'] != null || row['fk_course_id'] != null) && row['course_name'] != null
        }) as FilterCourse[]
        setCourseOptions(toSelectOptions(courses, 'course_id', 'fk_course_id', 'course_name'))

        // Exams — rows that have exam_id / fk_exam_id
        const exams = flat.filter((r) => {
          const row = r as Record<string, unknown>
          return (row['exam_id'] != null || row['fk_exam_id'] != null) && row['exam_name'] != null
        }) as FilterExam[]
        setExamOptions(toSelectOptions(exams, 'exam_id', 'fk_exam_id', 'exam_name'))

        // Subjects — rows that have subject_id / fk_subject_id
        const subjects = flat.filter((r) => {
          const row = r as Record<string, unknown>
          return (row['subject_id'] != null || row['fk_subject_id'] != null) && (row['subject_name'] != null || row['subject_code'] != null)
        }) as FilterSubject[]
        setSubjectOptions(toSelectOptions(subjects, 'subject_id', 'fk_subject_id', 'subject_name', 'subject_code'))
      } catch {
        // Filters unavailable — user can still manually enter via fallback (see below)
      } finally {
        if (!cancelled) setFilterLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [user?.employeeId])

  // ── Cascade: filter exams/subjects when course changes ────────────────────
  useEffect(() => {
    if (!selectedCourseId) return
    const courseRows = allFilterRows.filter((r) => {
      const row = r as Record<string, unknown>
      const id = String(row['course_id'] ?? row['fk_course_id'] ?? '')
      return id === selectedCourseId
    })

    const exams = courseRows.filter((r) => {
      const row = r as Record<string, unknown>
      return (row['exam_id'] != null || row['fk_exam_id'] != null) && row['exam_name'] != null
    })
    if (exams.length > 0) {
      setExamOptions(toSelectOptions(exams, 'exam_id', 'fk_exam_id', 'exam_name'))
    }

    const subjects = courseRows.filter((r) => {
      const row = r as Record<string, unknown>
      return (row['subject_id'] != null || row['fk_subject_id'] != null) && row['subject_name'] != null
    })
    if (subjects.length > 0) {
      setSubjectOptions(toSelectOptions(subjects, 'subject_id', 'fk_subject_id', 'subject_name', 'subject_code'))
    }

    // Reset downstream selections
    setSelectedExamId(null)
    setSelectedSubjectId(null)
    setTableVisible(false)
  }, [selectedCourseId, allFilterRows])

  // ── Fetch question papers ─────────────────────────────────────────────────
  const fetchRecords = useCallback(async () => {
    if (!selectedExamId || !selectedSubjectId) return
    setTableLoading(true)
    setTableVisible(true)
    setRecords([])
    try {
      // Derive regulation from allFilterRows if possible
      const regulationRow = allFilterRows.find((r) => {
        const row = r as Record<string, unknown>
        return row['regulation_id'] != null || row['fk_regulation_id'] != null
      }) as FilterRegulation | undefined
      const regulationId = regulationRow
        ? Number(regulationRow.regulation_id ?? regulationRow.fk_regulation_id)
        : undefined

      const result = await getQuestionPaperList({
        examId: Number(selectedExamId),
        subjectId: Number(selectedSubjectId),
        regulationId,
        courseId: selectedCourseId ? Number(selectedCourseId) : undefined,
      })
      setRecords(result)
    } catch {
      setRecords([])
    } finally {
      setTableLoading(false)
    }
  }, [selectedExamId, selectedSubjectId, selectedCourseId, allFilterRows])

  // ── Client-side search filter ─────────────────────────────────────────────
  const filteredRecords = useMemo(() => {
    if (!search) return records
    const q = search.toLowerCase()
    return records.filter(
      (r) =>
        r.questionpaper_title?.toLowerCase().includes(q) ||
        r.questionpaper_code?.toLowerCase().includes(q) ||
        r.subject_name?.toLowerCase().includes(q) ||
        r.exam_name?.toLowerCase().includes(q),
    )
  }, [records, search])

  // ── Column definitions ────────────────────────────────────────────────────
  const columnDefs = useMemo<ColDef<ExamQuestionPaper>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.title,
      COL_DEFS.code,
      COL_DEFS.setNo,
      COL_DEFS.subject,
      COL_DEFS.exam,
      COL_DEFS.totalQs,
      COL_DEFS.totalMarks,
      COL_DEFS.passMarks,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(setEditingRow, setModalOpen) },
    ],
    [],
  )

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <PageContainer className="space-y-5">
      <PageHeader
        title="Exam Question Paper Marks"
        subtitle="View and manage marks allocation for exam question papers"
      />

      {/* Filter panel */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[200px] flex-1">
            <Select
              label="Course"
              options={courseOptions}
              value={selectedCourseId}
              onChange={(v) => { setSelectedCourseId(v); setTableVisible(false) }}
              placeholder="Select Course"
              isLoading={filterLoading}
              searchable={courseOptions.length > 8}
              clearable
            />
          </div>

          <div className="min-w-[200px] flex-1">
            <Select
              label="Exam"
              options={examOptions}
              value={selectedExamId}
              onChange={(v) => { setSelectedExamId(v); setTableVisible(false) }}
              placeholder="Select Exam"
              isLoading={filterLoading}
              disabled={examOptions.length === 0}
              searchable={examOptions.length > 8}
              clearable
            />
          </div>

          <div className="min-w-[200px] flex-1">
            <Select
              label="Subject"
              options={subjectOptions}
              value={selectedSubjectId}
              onChange={(v) => setSelectedSubjectId(v)}
              placeholder="Select Subject"
              isLoading={filterLoading}
              disabled={subjectOptions.length === 0}
              searchable={subjectOptions.length > 8}
              clearable
            />
          </div>

          <Button
            onClick={fetchRecords}
            disabled={!selectedExamId || !selectedSubjectId || tableLoading}
            className="shrink-0"
          >
            {tableLoading ? 'Loading…' : 'Get List'}
          </Button>
        </div>
      </div>

      {/* Table section */}
      {tableVisible && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''} found
            </p>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search title, code, subject…"
            />
          </div>

          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
            {!tableLoading && filteredRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <BookOpenCheck className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm font-medium">No question papers found</p>
                <p className="text-xs mt-1">Try adjusting the filters above</p>
              </div>
            ) : (
              <DataTable
                rowData={filteredRecords}
                columnDefs={columnDefs}
                loading={tableLoading}
                pagination
              />
            )}
          </div>
        </div>
      )}

      {/* Edit slide-in panel */}
      {modalOpen && editingRow && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setModalOpen(false)}
          />

          {/* Panel */}
          <aside className="relative ml-auto flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-base font-semibold">Edit Question Paper</h2>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setModalOpen(false)}
              >
                Close
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-sm">
              <dl className="space-y-3">
                {[
                  ['Title', editingRow.questionpaper_title],
                  ['Code', editingRow.questionpaper_code],
                  ['Set No.', editingRow.setnumber],
                  ['Total Questions', editingRow.totalquestions],
                  ['Total Marks', editingRow.totalmarks],
                  ['Pass Marks', editingRow.passmarks],
                  ['Subject', editingRow.subject_name],
                  ['Exam', editingRow.exam_name],
                ].map(([label, val]) => (
                  <div key={String(label)} className="grid grid-cols-2 gap-2">
                    <dt className="font-medium text-slate-500">{label}</dt>
                    <dd className="text-slate-900">{val ?? '—'}</dd>
                  </div>
                ))}
              </dl>

              <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                Full edit functionality requires the question paper management form. This panel shows a read-only summary.
              </p>
            </div>

            <div className="border-t px-6 py-4">
              <Button variant="outline" className="w-full" onClick={() => setModalOpen(false)}>
                Close
              </Button>
            </div>
          </aside>
        </div>
      )}
    </PageContainer>
  )
}
