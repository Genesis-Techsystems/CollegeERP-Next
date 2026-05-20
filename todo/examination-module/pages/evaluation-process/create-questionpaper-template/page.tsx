'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { PlusIcon, FileQuestion } from 'lucide-react'
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
import { useSessionContext } from '@/context/SessionContext'

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuestionPaperTemplate {
  templateId: number
  templateName: string
  examName: string
  subjectName: string
  subjectCode: string
  totalMarks: number
  sections: number
  isActive: boolean
  createdDt: string
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function CreateQuestionPaperTemplatePage() {
  const { user } = useSessionContext()

  const [templates, setTemplates] = useState<QuestionPaperTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null)
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [tableVisible, setTableVisible] = useState(false)

  // Filter options (TODO: replace with real data)
  const exams: { id: string; name: string }[] = []
  const courses: { id: string; name: string }[] = []

  // ── Fetch templates ─────────────────────────────────────────────────────
  const fetchTemplates = useCallback(async () => {
    if (!selectedExamId) return
    setLoading(true)
    setTableVisible(true)
    try {
      // TODO: replace with real service call
      // const result = await getQuestionPaperTemplates({ examId: selectedExamId, courseId: selectedCourseId })
      // setTemplates(result)
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }, [selectedExamId, selectedCourseId])

  // ── Column definitions ──────────────────────────────────────────────────
  const columnDefs = useMemo<ColDef<QuestionPaperTemplate>[]>(
    () => [
      { headerName: 'SI.No', valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, width: 70, flex: 0 },
      { field: 'templateName', headerName: 'Template Name', minWidth: 180 },
      { field: 'examName', headerName: 'Exam', minWidth: 150 },
      { field: 'subjectName', headerName: 'Subject', minWidth: 180 },
      { field: 'subjectCode', headerName: 'Subject Code', minWidth: 130 },
      { field: 'totalMarks', headerName: 'Total Marks', minWidth: 120 },
      { field: 'sections', headerName: 'Sections', minWidth: 100 },
      {
        field: 'isActive',
        headerName: 'Status',
        minWidth: 100,
        cellRenderer: (p: ICellRendererParams<QuestionPaperTemplate>) =>
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
        title="Create Question Paper Template"
        subtitle="Define templates for question papers used in evaluations"
        action={
          <Button size="sm">
            <PlusIcon className="h-4 w-4 mr-1" />
            Add Template
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
            <Label>Course</Label>
            <Select
              value={selectedCourseId ?? undefined}
              onValueChange={(v) => { setSelectedCourseId(v); setTableVisible(false) }}
              disabled={courses.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={fetchTemplates} disabled={!selectedExamId || loading}>
            Search
          </Button>
        </div>
      </div>

      {/* Table */}
      {tableVisible && (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          {!loading && templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <FileQuestion className="h-10 w-10 mb-3 opacity-40" />
              <p className="text-sm">No templates found</p>
            </div>
          ) : (
            <DataTable
              rowData={templates}
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
