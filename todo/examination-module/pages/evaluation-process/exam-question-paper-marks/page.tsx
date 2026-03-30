'use client'

import { useState, useCallback, useMemo } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { PlusIcon, BookOpenCheck } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout'
import { DataTable } from '@/common/components/table'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExamQuestionPaperMarks {
  id: number
  examName: string
  subjectName: string
  subjectCode: string
  courseName: string
  sectionName: string
  questionNumber: number
  maxMarks: number
  passingMarks: number
  isActive: boolean
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ExamQuestionPaperMarksPage() {
  const [records, setRecords] = useState<ExamQuestionPaperMarks[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null)
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null)
  const [tableVisible, setTableVisible] = useState(false)

  // Filter options (TODO: replace with real data)
  const exams: { id: string; name: string }[] = []
  const subjects: { id: string; name: string }[] = []

  // ── Fetch records ───────────────────────────────────────────────────────
  const fetchRecords = useCallback(async () => {
    if (!selectedExamId) return
    setLoading(true)
    setTableVisible(true)
    try {
      // TODO: replace with real service call
      // const result = await getExamQuestionPaperMarks({ examId: selectedExamId, subjectId: selectedSubjectId })
      // setRecords(result)
      setRecords([])
    } finally {
      setLoading(false)
    }
  }, [selectedExamId, selectedSubjectId])

  // ── Column definitions ──────────────────────────────────────────────────
  const columnDefs = useMemo<ColDef<ExamQuestionPaperMarks>[]>(
    () => [
      { headerName: 'SI.No', valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, width: 70, flex: 0 },
      { field: 'examName', headerName: 'Exam Name', minWidth: 160 },
      { field: 'subjectName', headerName: 'Subject', minWidth: 180 },
      { field: 'subjectCode', headerName: 'Subject Code', minWidth: 130 },
      { field: 'courseName', headerName: 'Course', minWidth: 150 },
      { field: 'sectionName', headerName: 'Section', minWidth: 120 },
      { field: 'questionNumber', headerName: 'Question No.', minWidth: 120 },
      { field: 'maxMarks', headerName: 'Max Marks', minWidth: 110 },
      { field: 'passingMarks', headerName: 'Passing Marks', minWidth: 130 },
      {
        field: 'isActive',
        headerName: 'Status',
        minWidth: 100,
        cellRenderer: (p: ICellRendererParams<ExamQuestionPaperMarks>) =>
          p.data?.isActive ? (
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-emerald-50 text-emerald-700">
              Active
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-red-50 text-red-700">
              Inactive
            </span>
          ),
      },
      {
        headerName: 'Actions',
        minWidth: 100,
        flex: 0,
        width: 100,
        cellRenderer: () => (
          <Button size="sm" variant="ghost">
            Edit
          </Button>
        ),
      },
    ],
    []
  )

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <PageContainer className="space-y-5">
      <PageHeader
        title="Exam Question Paper Marks"
        subtitle="Configure marks allocation for each question in exam papers"
        action={
          <Button size="sm">
            <PlusIcon className="h-4 w-4 mr-1" />
            Add Marks
          </Button>
        }
      />

      {/* Filter panel */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1 min-w-[200px]">
            <Label>Exam</Label>
            <Select
              value={selectedExamId ?? undefined}
              onValueChange={(v) => { setSelectedExamId(v); setTableVisible(false) }}
              disabled={exams.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Exam" />
              </SelectTrigger>
              <SelectContent>
                {exams.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1 min-w-[200px]">
            <Label>Subject</Label>
            <Select
              value={selectedSubjectId ?? undefined}
              onValueChange={(v) => setSelectedSubjectId(v)}
              disabled={subjects.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={fetchRecords} disabled={!selectedExamId || loading}>
            Search
          </Button>
        </div>
      </div>

      {/* Table */}
      {tableVisible && (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          {!loading && records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <BookOpenCheck className="h-10 w-10 mb-3 opacity-40" />
              <p className="text-sm">No marks configuration found</p>
            </div>
          ) : (
            <DataTable
              rowData={records}
              columnDefs={columnDefs}
              loading={loading}
              pagination
            />
          )}
        </div>
      )}
    </PageContainer>
  )
}
