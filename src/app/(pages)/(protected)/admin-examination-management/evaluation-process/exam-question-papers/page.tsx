'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ColDef } from 'ag-grid-community'
import { SearchInput } from '@/common/components/search'
import { DataTable } from '@/common/components/table'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChevronDown, Filter } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout'
import { StatusBadge } from '@/common/components/data-display'
import { cn } from '@/lib/utils'
import type { ICellRendererParams } from 'ag-grid-community'
import { getEvaluationExamFilters, getEvaluationExamRestFilters, listExamQuestionPapers } from '@/services/evaluation-process'
import { toDateStr } from '@/common/generic-functions'

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

// ── Pure renderer — publish status ──────────────────────────────────────────
function publishStatusRenderer(p: ICellRendererParams) {
  const published = p.data?.publishStatus === 'Published'
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        published ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600',
      )}
    >
      {published ? 'Published' : 'Draft'}
    </span>
  )
}

function statusRenderer(p: ICellRendererParams) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function actionsRenderer() {
  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" className="h-7">Edit</Button>
    </div>
  )
}

export default function ExamQuestionPapersPage() {
  const [filterOpen, setFilterOpen] = useState(true)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<AnyRow[]>([])

  const [baseRows, setBaseRows] = useState<AnyRow[]>([])
  const [restRows, setRestRows] = useState<AnyRow[]>([])
  const [courseId, setCourseId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)
  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null)
  const [courseYearId, setCourseYearId] = useState<number | null>(null)
  const [examDate, setExamDate] = useState<string>('')
  const [subjectTypeId, setSubjectTypeId] = useState<number | null>(null)
  const [subjectId, setSubjectId] = useState<number | null>(null)

  const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)
  const courses = useMemo(() => dedupeBy(baseRows, (r) => pickNum(r, ['fk_course_id', 'courseId'])), [baseRows])
  const academicYears = useMemo(
    () =>
      dedupeBy(
        baseRows.filter((r) => pickNum(r, ['fk_course_id', 'courseId']) === Number(courseId)),
        (r) => pickNum(r, ['fk_academic_year_id', 'academicYearId']),
      ),
    [baseRows, courseId],
  )
  const exams = useMemo(
    () =>
      dedupeBy(
        baseRows.filter(
          (r) =>
            pickNum(r, ['fk_course_id', 'courseId']) === Number(courseId) &&
            pickNum(r, ['fk_academic_year_id', 'academicYearId']) === Number(academicYearId),
        ),
        (r) => pickNum(r, ['fk_exam_id', 'examId']),
      ),
    [baseRows, courseId, academicYearId],
  )
  const colleges = useMemo(() => dedupeBy(restRows, (r) => pickNum(r, ['fk_college_id', 'collegeId'])), [restRows])
  const courseGroups = useMemo(
    () =>
      dedupeBy(
        restRows.filter((r) => pickNum(r, ['fk_college_id', 'collegeId']) === Number(collegeId)),
        (r) => pickNum(r, ['fk_course_group_id', 'courseGroupId']),
      ),
    [restRows, collegeId],
  )
  const courseYears = useMemo(
    () =>
      dedupeBy(
        restRows.filter(
          (r) =>
            pickNum(r, ['fk_college_id', 'collegeId']) === Number(collegeId) &&
            pickNum(r, ['fk_course_group_id', 'courseGroupId']) === Number(courseGroupId),
        ),
        (r) => pickNum(r, ['fk_course_year_id', 'courseYearId']),
      ),
    [restRows, collegeId, courseGroupId],
  )
  const examDates = useMemo(
    () =>
      dedupeBy(
        restRows
          .filter(
            (r) =>
              pickNum(r, ['fk_college_id', 'collegeId']) === Number(collegeId) &&
              pickNum(r, ['fk_course_group_id', 'courseGroupId']) === Number(courseGroupId) &&
              pickNum(r, ['fk_course_year_id', 'courseYearId']) === Number(courseYearId),
          )
          .map((r) => toDateStr(r.examDate ?? r.exam_date))
          .filter(Boolean),
        (d) => d,
      ),
    [restRows, collegeId, courseGroupId, courseYearId],
  )
  const subjectTypes = useMemo(
    () =>
      dedupeBy(
        restRows.filter((r) => {
          const rowDate = toDateStr(r.examDate ?? r.exam_date)
          return (
            pickNum(r, ['fk_college_id', 'collegeId']) === Number(collegeId) &&
            pickNum(r, ['fk_course_group_id', 'courseGroupId']) === Number(courseGroupId) &&
            pickNum(r, ['fk_course_year_id', 'courseYearId']) === Number(courseYearId) &&
            (!examDate || rowDate === examDate)
          )
        }),
        (r) => pickNum(r, ['fk_subject_type_id', 'subjectTypeId']),
      ),
    [restRows, collegeId, courseGroupId, courseYearId, examDate],
  )
  const subjects = useMemo(
    () =>
      dedupeBy(
        restRows.filter((r) => {
          const rowDate = toDateStr(r.examDate ?? r.exam_date)
          return (
            pickNum(r, ['fk_college_id', 'collegeId']) === Number(collegeId) &&
            pickNum(r, ['fk_course_group_id', 'courseGroupId']) === Number(courseGroupId) &&
            pickNum(r, ['fk_course_year_id', 'courseYearId']) === Number(courseYearId) &&
            (!examDate || rowDate === examDate) &&
            (!subjectTypeId || pickNum(r, ['fk_subject_type_id', 'subjectTypeId']) === Number(subjectTypeId))
          )
        }),
        (r) => pickNum(r, ['fk_subject_id', 'subjectId']),
      ),
    [restRows, collegeId, courseGroupId, courseYearId, examDate, subjectTypeId],
  )

  useEffect(() => {
    async function init() {
      setLoading(true)
      try {
        const rows = await getEvaluationExamFilters(employeeId).catch(() => [])
        const list = Array.isArray(rows) ? rows : []
        setBaseRows(list)
        if (list[0]) setCourseId(pickNum(list[0], ['fk_course_id', 'courseId']))
      } finally {
        setLoading(false)
      }
    }
    void init()
  }, [employeeId])

  useEffect(() => {
    if (academicYears[0]) setAcademicYearId(pickNum(academicYears[0], ['fk_academic_year_id', 'academicYearId']))
  }, [academicYears])
  useEffect(() => {
    if (exams[0]) setExamId(pickNum(exams[0], ['fk_exam_id', 'examId']))
  }, [exams])
  useEffect(() => {
    async function loadRest() {
      if (!courseId || !examId || !academicYearId) return
      const rows = await getEvaluationExamRestFilters({ courseId, examId, academicYearId, employeeId }).catch(() => [])
      const list = Array.isArray(rows) ? rows : []
      setRestRows(list)
      if (list[0]) setCollegeId(pickNum(list[0], ['fk_college_id', 'collegeId']))
    }
    void loadRest()
  }, [courseId, examId, academicYearId, employeeId])
  useEffect(() => {
    if (courseGroups[0]) setCourseGroupId(pickNum(courseGroups[0], ['fk_course_group_id', 'courseGroupId']))
  }, [courseGroups])

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((r) => Object.values(r).some((v) => String(v).toLowerCase().includes(term)))
  }, [rows, search])

  useEffect(() => {
    if (courseYears[0]) setCourseYearId(pickNum(courseYears[0], ['fk_course_year_id', 'courseYearId']))
  }, [courseYears])
  useEffect(() => {
    setExamDate('')
    setSubjectTypeId(null)
    setSubjectId(null)
  }, [collegeId, courseGroupId, courseYearId])
  useEffect(() => {
    setSubjectTypeId(null)
    setSubjectId(null)
  }, [examDate])
  useEffect(() => {
    setSubjectId(null)
  }, [subjectTypeId])

  async function getList() {
    setLoading(true)
    try {
      const data = await listExamQuestionPapers({
        examId: examId ?? undefined,
        courseYearId: courseYearId ?? undefined,
        courseGroupId: courseGroupId ?? undefined,
        subjectId: subjectId ?? undefined,
        subjectTypeId: subjectTypeId ?? undefined,
        examDate: examDate || undefined,
      }).catch(() => [])
      setRows(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }

  const cols = useMemo<ColDef[]>(
    () => [
      { headerName: 'SI.No', valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, width: 80 },
      { field: 'questionPaperTitle', headerName: 'QuestionPaper Title', minWidth: 180 },
      { field: 'setNumber', headerName: 'Set Number', minWidth: 110 },
      { field: 'passMarks', headerName: 'Pass Marks', minWidth: 110 },
      { field: 'totalMarks', headerName: 'Total Marks', minWidth: 110 },
      { field: 'totalQuestions', headerName: 'Total Questions', minWidth: 120 },
      { field: 'questionPaperPath', headerName: 'QuestionPaper Path', minWidth: 180 },
      { field: 'modelAnswerSheetPath', headerName: 'AnswerSheet Path', minWidth: 180 },
      {
        field: 'publishStatus',
        headerName: 'Publish Status',
        width: 130,
        flex: 0,
        cellRenderer: publishStatusRenderer,
      },
      {
        field: 'isActive',
        headerName: 'Status',
        width: 100,
        flex: 0,
        cellRenderer: statusRenderer,
      },
      {
        headerName: 'Actions',
        minWidth: 110,
        cellRenderer: actionsRenderer,
      },
    ],
    [],
  )

  return (
    <PageContainer className="space-y-5">
      <PageHeader title="Exam Question Papers" subtitle="Manage exam question papers" />
      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between gap-2">
          <h2 className="text-[16px] font-semibold text-[hsl(var(--primary))]">Exam Question Papers</h2>
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
          <div className="p-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
              <div className="md:col-span-2 space-y-1"><Label>College</Label><Select value={collegeId ? String(collegeId) : undefined} onValueChange={(v) => setCollegeId(Number(v))}><SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger><SelectContent>{colleges.map((c) => <SelectItem key={`cl-${pickNum(c, ['fk_college_id', 'collegeId'])}`} value={String(pickNum(c, ['fk_college_id', 'collegeId']))}>{pickText(c, ['college_code', 'collegeCode'])}</SelectItem>)}</SelectContent></Select></div>
              <div className="md:col-span-2 space-y-1"><Label>Exam Year</Label><Select value={academicYearId ? String(academicYearId) : undefined} onValueChange={(v) => setAcademicYearId(Number(v))}><SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger><SelectContent>{academicYears.map((a) => <SelectItem key={`ay-${pickNum(a, ['fk_academic_year_id', 'academicYearId'])}`} value={String(pickNum(a, ['fk_academic_year_id', 'academicYearId']))}>{pickText(a, ['academic_year', 'academicYear'])}</SelectItem>)}</SelectContent></Select></div>
              <div className="md:col-span-2 space-y-1"><Label>Course</Label><Select value={courseId ? String(courseId) : undefined} onValueChange={(v) => setCourseId(Number(v))}><SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger><SelectContent>{courses.map((c) => <SelectItem key={`c-${pickNum(c, ['fk_course_id', 'courseId'])}`} value={String(pickNum(c, ['fk_course_id', 'courseId']))}>{pickText(c, ['course_code', 'courseCode'])}</SelectItem>)}</SelectContent></Select></div>
              <div className="md:col-span-4 space-y-1"><Label>Exam</Label><Select value={examId ? String(examId) : undefined} onValueChange={(v) => setExamId(Number(v))}><SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger><SelectContent>{exams.map((e) => <SelectItem key={`e-${pickNum(e, ['fk_exam_id', 'examId'])}`} value={String(pickNum(e, ['fk_exam_id', 'examId']))}>{pickText(e, ['exam_name', 'examName'])}</SelectItem>)}</SelectContent></Select></div>
              <div className="md:col-span-2 space-y-1"><Label>Exam Date</Label><Select value={examDate || '0'} onValueChange={(v) => setExamDate(v === '0' ? '' : v)}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Choose exam date" /></SelectTrigger><SelectContent><SelectItem value="0">All Dates</SelectItem>{examDates.map((d) => <SelectItem key={`ed-${d}`} value={d}>{d}</SelectItem>)}</SelectContent></Select></div>
              <div className="md:col-span-2 space-y-1"><Label>Course Group</Label><Select value={courseGroupId ? String(courseGroupId) : undefined} onValueChange={(v) => setCourseGroupId(Number(v))}><SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger><SelectContent>{courseGroups.map((g) => <SelectItem key={`g-${pickNum(g, ['fk_course_group_id', 'courseGroupId'])}`} value={String(pickNum(g, ['fk_course_group_id', 'courseGroupId']))}>{pickText(g, ['group_code', 'groupCode'])}</SelectItem>)}</SelectContent></Select></div>
              <div className="md:col-span-2 space-y-1"><Label>Course Year</Label><Select value={courseYearId ? String(courseYearId) : undefined} onValueChange={(v) => setCourseYearId(Number(v))}><SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger><SelectContent>{courseYears.map((y) => <SelectItem key={`cy-${pickNum(y, ['fk_course_year_id', 'courseYearId'])}`} value={String(pickNum(y, ['fk_course_year_id', 'courseYearId']))}>{pickText(y, ['course_year_name', 'courseYearName', 'course_year_code', 'courseYearCode'])}</SelectItem>)}</SelectContent></Select></div>
              <div className="md:col-span-2 space-y-1"><Label>Subject Type</Label><Select value={subjectTypeId ? String(subjectTypeId) : '0'} onValueChange={(v) => setSubjectTypeId(v === '0' ? null : Number(v))}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="All" /></SelectTrigger><SelectContent><SelectItem value="0">All</SelectItem>{subjectTypes.map((t) => <SelectItem key={`st-${pickNum(t, ['fk_subject_type_id', 'subjectTypeId'])}`} value={String(pickNum(t, ['fk_subject_type_id', 'subjectTypeId']))}>{pickText(t, ['subject_type', 'subjectType', 'subject_type_name']) || `Type ${pickNum(t, ['fk_subject_type_id', 'subjectTypeId'])}`}</SelectItem>)}</SelectContent></Select></div>
              <div className="md:col-span-3 space-y-1"><Label>Subject</Label><Select value={subjectId ? String(subjectId) : '0'} onValueChange={(v) => setSubjectId(v === '0' ? null : Number(v))}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="All Subjects" /></SelectTrigger><SelectContent><SelectItem value="0">All Subjects</SelectItem>{subjects.map((s) => <SelectItem key={`sb-${pickNum(s, ['fk_subject_id', 'subjectId'])}`} value={String(pickNum(s, ['fk_subject_id', 'subjectId']))}>{pickText(s, ['subject_code', 'subjectCode', 'subject_name', 'subjectName']) || `Subject ${pickNum(s, ['fk_subject_id', 'subjectId'])}`}</SelectItem>)}</SelectContent></Select></div>
              <div className="md:col-span-1"><Button className="h-8 px-3 text-[12px] w-full" onClick={getList} disabled={loading}>Get List</Button></div>
            </div>
          </div>
        )}
      </div>

      <div className="app-card p-3 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SearchInput className="w-full max-w-sm" placeholder="Search" value={search} onChange={setSearch} />
          <Button size="sm">Exam Question Paper</Button>
        </div>
        <DataTable rowData={filteredRows} columnDefs={cols} pagination loading={loading} />
      </div>
    </PageContainer>
  )
}
