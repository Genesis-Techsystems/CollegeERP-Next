'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { Eye, Pencil, Plus } from 'lucide-react'
import { DataTable } from '@/common/components/table'
import { Select } from '@/common/components/select'
import { StatusBadge } from '@/common/components/data-display'
import { PageContainer, PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { MINIO_URL } from '@/config/constants/api'
import { listActiveCoursesByUniversity, listActiveUniversities, listSubjectsByCourse } from '@/services'
import SubjectModal from './SubjectModal'

type AnyRow = Record<string, any>

function pickNum(row: AnyRow | null | undefined, keys: string[]): number {
  if (!row) return 0
  for (const key of keys) {
    const n = Number(row[key] ?? 0)
    if (Number.isFinite(n) && n > 0) return n
  }
  return 0
}

function safeString(v: unknown): string {
  if (typeof v === 'string') return v.trim()
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return ''
}

const COLS = {
  siNo: { headerName: 'SI.No', valueGetter: (p: any) => (p.node?.rowIndex ?? 0) + 1, minWidth: 76, maxWidth: 90, flex: 0 } as ColDef<AnyRow>,
  subjectCode: { field: 'subjectCode', headerName: 'Subject Code', minWidth: 130, flex: 1 } as ColDef<AnyRow>,
  subjectName: { field: 'subjectName', headerName: 'Subject Name', minWidth: 220, flex: 1.3 } as ColDef<AnyRow>,
  subjectTypeName: { field: 'subjectTypeName', headerName: 'Subject Type', minWidth: 150, flex: 1 } as ColDef<AnyRow>,
  subCredits: { field: 'subCredits', headerName: 'Credits', minWidth: 95, maxWidth: 120, flex: 0 } as ColDef<AnyRow>,
  subCreditHrs: { field: 'subCreditHrs', headerName: 'Credit Hours', minWidth: 120, maxWidth: 140, flex: 0 } as ColDef<AnyRow>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 110, maxWidth: 130, flex: 0 } as ColDef<AnyRow>,
  actions: { headerName: 'Actions', minWidth: 95, maxWidth: 110, flex: 0 } as ColDef<AnyRow>,
  syllabus: { headerName: 'Syllabus', minWidth: 95, maxWidth: 115, flex: 0 } as ColDef<AnyRow>,
}

function statusRenderer(p: ICellRendererParams<AnyRow>) {
  return <StatusBadge status={Boolean(p.data?.isActive)} />
}

function makeActionsRenderer(setRow: (x: AnyRow | null) => void, setOpen: (n: boolean) => void) {
  return (p: ICellRendererParams<AnyRow>) => (
    <button
      type="button"
      className="inline-flex items-center justify-center rounded p-1 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      onClick={() => { setRow(p.data ?? null); setOpen(true) }}
      aria-label="Edit subject"
    >
      <Pencil className="h-4 w-4" />
    </button>
  )
}

function syllabusRenderer(p: ICellRendererParams<AnyRow>) {
  const path = safeString(p.data?.syllabusPath)
  const hasFile = path.length > 0
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center rounded p-1 ${hasFile ? 'text-blue-600 hover:bg-blue-50' : 'text-slate-300 cursor-not-allowed'}`}
      onClick={() => { if (hasFile) window.open(`${MINIO_URL}${path}`, '_blank', 'noopener,noreferrer') }}
      disabled={!hasFile}
      aria-label="View syllabus"
    >
      <Eye className="h-4 w-4" />
    </button>
  )
}

export default function SubjectsMasterPage() {
  const [universities, setUniversities] = useState<AnyRow[]>([])
  const [courses, setCourses] = useState<AnyRow[]>([])
  const [rows, setRows] = useState<AnyRow[]>([])
  const [universityId, setUniversityId] = useState<number | null>(null)
  const [courseId, setCourseId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [editingRow, setEditingRow] = useState<AnyRow | null>(null)

  const universityOptions = useMemo(
    () => universities.map((x) => ({ value: String(pickNum(x, ['universityId', 'pk_university_id'])), label: safeString(x.universityCode || x.universityName || 'University') })),
    [universities],
  )
  const courseOptions = useMemo(
    () => courses.map((x) => ({ value: String(pickNum(x, ['courseId', 'pk_course_id'])), label: safeString(x.courseCode || x.courseName || 'Course') })),
    [courses],
  )

  const loadSubjects = useCallback(async (id: number) => {
    setLoading(true)
    try {
      const list = await listSubjectsByCourse(id)
      setRows([...list].sort((a, b) => pickNum(b, ['subjectId']) - pickNum(a, ['subjectId'])))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    listActiveUniversities()
      .then((list) => {
        setUniversities(list)
        const firstId = pickNum(list[0], ['universityId', 'pk_university_id'])
        if (firstId) setUniversityId(firstId)
      })
      .catch(() => setUniversities([]))
  }, [])

  useEffect(() => {
    if (!universityId) {
      setCourses([])
      setCourseId(null)
      setRows([])
      return
    }
    setRows([])
    listActiveCoursesByUniversity(universityId)
      .then((list) => {
        setCourses(list)
        const firstId = pickNum(list[0], ['courseId', 'pk_course_id'])
        setCourseId(firstId || null)
      })
      .catch(() => {
        setCourses([])
        setCourseId(null)
      })
  }, [universityId])

  useEffect(() => {
    if (!courseId) {
      setRows([])
      return
    }
    void loadSubjects(courseId)
  }, [courseId, loadSubjects])

  const columnDefs = useMemo<ColDef<AnyRow>[]>(() => [
    COLS.siNo,
    COLS.subjectCode,
    COLS.subjectName,
    COLS.subjectTypeName,
    COLS.subCredits,
    COLS.subCreditHrs,
    { ...COLS.isActive, cellRenderer: statusRenderer },
    { ...COLS.actions, cellRenderer: makeActionsRenderer(setEditingRow, setOpen) },
    { ...COLS.syllabus, cellRenderer: syllabusRenderer },
  ], [])

  return (
    <PageContainer>
      <PageHeader title="Subjects Master" />

      <div className="app-card p-3 md:p-4 !mt-0">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Select
            label="University"
            value={universityId ? String(universityId) : null}
            onChange={(v) => setUniversityId(v ? Number(v) : null)}
            options={universityOptions}
            placeholder="Select university"
            searchable
          />
          <Select
            label="Course"
            value={courseId ? String(courseId) : null}
            onChange={(v) => setCourseId(v ? Number(v) : null)}
            options={courseOptions}
            placeholder="Select course"
            searchable
            disabled={!universityId}
          />
          <div className="flex items-end justify-start md:justify-end">
            <Button
              onClick={() => { setEditingRow(null); setOpen(true) }}
              disabled={!courseId}
              className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))/0.9]"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Subject
            </Button>
          </div>
        </div>
      </div>

      {Boolean(courseId) && (
        <div className="app-card mt-3 p-0 overflow-hidden">
          <DataTable
            rowData={rows}
            columnDefs={columnDefs}
            loading={loading}
            quickFilter
            quickFilterPlaceholder="Search subjects..."
            pagination
            paginationPageSize={10}
            rowSelection="single"
            suppressRowClickSelection
          />
        </div>
      )}

      <SubjectModal
        open={open}
        onClose={() => setOpen(false)}
        row={editingRow}
        courseId={courseId ?? 0}
        existingRows={rows}
        onSaved={() => { if (courseId) void loadSubjects(courseId) }}
      />
    </PageContainer>
  )
}

