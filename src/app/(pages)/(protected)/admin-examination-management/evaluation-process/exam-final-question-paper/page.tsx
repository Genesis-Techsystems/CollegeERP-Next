'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ColDef } from 'ag-grid-community'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Select } from '@/common/components/select'
import { FilteredListPage } from '@/components/layout'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  finalizeOneQuestionPaper,
  getFinalizeQuestionPaperFilters,
  getFinalizeRegulations,
  getFinalizeSubjectUc,
  listFinalizableQuestionPapers,
} from '@/services/evaluation-process'

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

function questionPaperStatusRenderer(p: { value?: string }) {
  const status = (p.value ?? '').trim() || '-'
  if (status === 'Approved') {
    return (
      <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200">{status}</Badge>
    )
  }
  if (status === 'Draft') {
    return (
      <Badge className="bg-slate-50 text-slate-700 border border-slate-200">{status}</Badge>
    )
  }
  return (
    <Badge className="bg-amber-50 text-amber-700 border border-amber-200">{status}</Badge>
  )
}

export default function ExamFinalQuestionPaperPage() {
  const [loading, setLoading] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)
  const [rows, setRows] = useState<AnyRow[]>([])
  const [baseRows, setBaseRows] = useState<AnyRow[]>([])
  const [regulationRows, setRegulationRows] = useState<AnyRow[]>([])
  const [subjectUcRows, setSubjectUcRows] = useState<AnyRow[]>([])

  const [courseId, setCourseId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)
  const [regulationId, setRegulationId] = useState<number | null>(null)
  const [courseYearId, setCourseYearId] = useState<number | null>(null)
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
  const regulations = useMemo(
    () => dedupeBy(regulationRows, (r) => pickNum(r, ['fk_regulation_id', 'regulationId'])),
    [regulationRows],
  )
  const courseYears = useMemo(
    () => dedupeBy(subjectUcRows, (r) => pickNum(r, ['fk_course_year_id', 'courseYearId'])),
    [subjectUcRows],
  )
  const subjects = useMemo(
    () =>
      dedupeBy(
        subjectUcRows.filter((r) => !courseYearId || pickNum(r, ['fk_course_year_id', 'courseYearId']) === Number(courseYearId)),
        (r) => pickNum(r, ['fk_subject_id', 'subjectId']),
      ),
    [subjectUcRows, courseYearId],
  )

  const isFinalized = useMemo(
    () => rows.some((r) => pickText(r, ['question_status', 'questionPaperStatus']) === 'Approved'),
    [rows],
  )
  const courseYearValue = courseYearId === null ? undefined : String(courseYearId)

  useEffect(() => {
    async function init() {
      setLoading(true)
      try {
        const list = await getFinalizeQuestionPaperFilters(employeeId).catch(() => [])
        const r = Array.isArray(list) ? list : []
        setBaseRows(r)
        if (r[0]) setCourseId(pickNum(r[0], ['fk_course_id', 'courseId']))
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
    async function loadRegulations() {
      if (!courseId) return
      const list = await getFinalizeRegulations({ courseId, employeeId }).catch(() => [])
      const r = Array.isArray(list) ? list : []
      setRegulationRows(r)
      if (r[0]) setRegulationId(pickNum(r[0], ['fk_regulation_id', 'regulationId']))
    }
    void loadRegulations()
  }, [courseId, employeeId])

  useEffect(() => {
    async function loadSubjectUc() {
      if (!courseId || !examId || !academicYearId || !regulationId) return
      const list = await getFinalizeSubjectUc({
        courseId,
        examId,
        academicYearId,
        regulationId,
        employeeId,
      }).catch(() => [])
      const r = Array.isArray(list) ? list : []
      setSubjectUcRows(r)
      if (r[0]) {
        setCourseYearId(pickNum(r[0], ['fk_course_year_id', 'courseYearId']) || 0)
      }
    }
    void loadSubjectUc()
  }, [courseId, examId, academicYearId, regulationId, employeeId])

  useEffect(() => {
    if (!subjectId && subjects[0]) setSubjectId(pickNum(subjects[0], ['fk_subject_id', 'subjectId']))
  }, [subjects, subjectId])

  useEffect(() => {
    setRows([])
    setHasFetched(false)
  }, [courseId, academicYearId, examId, regulationId, courseYearId, subjectId])

  async function getList() {
    if (!examId || !regulationId) {
      toastError('Please select Exam and Regulation.')
      return
    }
    setLoading(true)
    try {
      const list = await listFinalizableQuestionPapers({
        employeeId,
        examId,
        courseYearId: (courseYearId ?? 0) > 0 ? courseYearId ?? undefined : undefined,
        subjectId: subjectId ?? undefined,
        regulationId,
      }).catch(() => [])
      setRows(Array.isArray(list) ? list : [])
      setHasFetched(true)
    } finally {
      setLoading(false)
    }
  }

  async function onFinalize() {
    if (rows.length === 0) return
    // Angular Finalize(): pick a RANDOM question paper from the list, then
    // re-send its full record with questionPaperStatusCatDetId = 623 (Approved).
    const ids = rows
      .map((r) => pickNum(r, ['pk_exam_questionpaper_id', 'questionPaperId', 'examQuestionPaperId']))
      .filter((n) => n > 0)
    if (ids.length === 0) {
      toastError('No eligible question paper found to finalize.')
      return
    }
    const queid = ids[Math.floor(Math.random() * ids.length)]
    const selected = rows.find(
      (r) => pickNum(r, ['pk_exam_questionpaper_id', 'questionPaperId', 'examQuestionPaperId']) === queid,
    )
    if (!selected) return
    // Map the proc row to the ExamQuestionPapers update shape (mirrors Angular).
    const data = {
      organizationId: selected.organizationId,
      examMonthYear: selected.exam_month_yr,
      courseCode: selected.coursecode,
      courseYearCode: selected.courseyearcode,
      courseYearId: selected.fk_course_year_id,
      courseGroupCodes: selected.coursegroupcodes,
      regulationCode: selected.regulationcode,
      subjectCode: selected.subjectcode,
      examDate: selected.exam_date,
      questionPaperTitle: selected.questionpaper_title,
      setNumber: selected.setnumber,
      passMarks: selected.passmarks,
      totalMarks: selected.totalmarks,
      totalQuestions: selected.totalquestions,
      preparedByEmpId: selected.fk_preparedby_emp_id,
      preparedDate: selected.prepared_date,
      questionPaperStatusCatDetId: 623,
      statusComments: selected.status_comments,
      isApproved: selected.is_approved,
      approvedByEmpId: selected.approvedByEmpId,
      questionPaperPath: selected.questionpaper_path,
      modelAnswerSheetPath: selected.modelanswersheet_path,
      approvedDate: selected.approvedDate,
      isActive: selected.is_active,
    }
    setLoading(true)
    try {
      await finalizeOneQuestionPaper({ questionPaperId: queid, data })
      toastSuccess('Question paper finalized successfully.')
      await getList()
    } catch (error: any) {
      toastError(error?.message ?? 'Failed to finalize question paper.')
    } finally {
      setLoading(false)
    }
  }

  const cols = useMemo<ColDef[]>(
    () => [
      { headerName: 'SI.No', valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, width: 80 },
      { field: 'courseYearCode', headerName: 'Course Year', minWidth: 130, valueGetter: (p) => p.data?.courseyearcode ?? p.data?.courseYearCode ?? '-' },
      { field: 'preparedBy', headerName: 'Prepared By', minWidth: 170, valueGetter: (p) => p.data?.preparedby_emp_name ?? p.data?.prepareby_emp ?? p.data?.preparedBy ?? '-' },
      { field: 'questionPaperTitle', headerName: 'Question Paper Title', minWidth: 280, valueGetter: (p) => p.data?.questionpaper_title ?? p.data?.questionPaperTitle ?? '-' },
      {
        field: 'questionPaperStatus',
        headerName: 'Question Paper Status',
        minWidth: 160,
        valueGetter: (p) => p.data?.question_status ?? p.data?.questionPaperStatus ?? '-',
        cellRenderer: questionPaperStatusRenderer,
      },
    ],
    [],
  )

  return (
    <FilteredListPage
      title="Finalize Exam Question Paper"
      filters={(
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end text-[13px]">
          <div className="md:col-span-3">
            <Label className="text-[12px] text-muted-foreground">Course</Label>
            <Select
              value={courseId ? String(courseId) : null}
              onChange={(v) => setCourseId(v ? Number(v) : 0)}
              options={courses.map((c) => ({ value: String(pickNum(c, ['fk_course_id', 'courseId'])), label: pickText(c, ['course_code', 'courseCode']) }))}
              placeholder="Course"
            />
          </div>
          <div className="md:col-span-3">
            <Label className="text-[12px] text-muted-foreground">Academic Year</Label>
            <Select
              value={academicYearId ? String(academicYearId) : null}
              onChange={(v) => setAcademicYearId(v ? Number(v) : 0)}
              options={academicYears.map((a) => ({ value: String(pickNum(a, ['fk_academic_year_id', 'academicYearId'])), label: pickText(a, ['academic_year', 'academicYear']) }))}
              placeholder="Academic Year"
            />
          </div>
          <div className="md:col-span-6">
            <Label className="text-[12px] text-muted-foreground">Exam</Label>
            <Select
              value={examId ? String(examId) : null}
              onChange={(v) => setExamId(v ? Number(v) : 0)}
              options={exams.map((e) => ({ value: String(pickNum(e, ['fk_exam_id', 'examId'])), label: pickText(e, ['exam_name', 'examName']) }))}
              placeholder="Exam"
            />
          </div>
          <div className="md:col-span-2">
            <Label className="text-[12px] text-muted-foreground">Regulation Id</Label>
            <Select
              value={regulationId ? String(regulationId) : null}
              onChange={(v) => setRegulationId(v ? Number(v) : 0)}
              options={regulations.map((r) => ({ value: String(pickNum(r, ['fk_regulation_id', 'regulationId'])), label: pickText(r, ['regulation_code', 'regulationCode']) }))}
              placeholder="Regulation"
            />
          </div>
          <div className="md:col-span-3">
            <Label className="text-[12px] text-muted-foreground">Course Years *</Label>
            <Select
              value={courseYearValue ?? null}
              onChange={(v) => setCourseYearId(v ? Number(v) : 0)}
              options={[
                { value: '0', label: 'All' },
                ...courseYears.map((y) => ({ value: String(pickNum(y, ['fk_course_year_id', 'courseYearId'])), label: pickText(y, ['course_year_code', 'courseYearCode', 'course_year_name', 'courseYearName']) })),
              ]}
              placeholder="Course Year"
            />
          </div>
          <div className="md:col-span-5">
            <Label className="text-[12px] text-muted-foreground">Subject</Label>
            <Select
              value={subjectId ? String(subjectId) : null}
              onChange={(v) => setSubjectId(v ? Number(v) : 0)}
              options={subjects.map((s) => {
                const code = pickText(s, ['subject_code', 'subjectCode'])
                const name = pickText(s, ['subject_name', 'subjectName'])
                const label = code && name ? `${code}-${name}` : name || code || '-'
                return {
                  value: String(pickNum(s, ['fk_subject_id', 'subjectId'])),
                  label,
                }
              })}
              placeholder="Subject"
            />
          </div>
          <div className="md:col-span-2">
            <Button className="h-8 px-3 text-[12px] w-full" onClick={getList} disabled={loading}>
              Get List
            </Button>
          </div>
        </div>
      )}
      rowData={hasFetched ? rows : []}
      columnDefs={cols}
      pagination
      loading={loading}
      toolbar={{
        search: true,
        searchPlaceholder: 'Search…',
        pdfDocumentTitle: 'Finalize exam question paper',
      }}
      toolbarTrailing={
        hasFetched ? (
          isFinalized ? (
            <Button
              type="button"
              size="sm"
              disabled
              className="h-[30px] px-3 text-[12px] bg-slate-500 hover:bg-slate-500 text-white"
            >
              Finalized
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              className="h-[30px] px-3 text-[12px]"
              onClick={() => void onFinalize()}
              disabled={loading || rows.length === 0}
            >
              Finalize
            </Button>
          )
        ) : undefined
      }
    />
  )
}
