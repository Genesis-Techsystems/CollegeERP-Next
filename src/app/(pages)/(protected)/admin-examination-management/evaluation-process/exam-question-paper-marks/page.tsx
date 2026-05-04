'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ColDef } from 'ag-grid-community'
import { DataTable } from '@/common/components/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select } from '@/common/components/select'
import { ChevronDown, Filter } from 'lucide-react'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  createExamQuestionPaper,
  getEvaluationExamFilters,
  getEvaluationExamRestBundle,
  listEvaluationSubjects,
  listExamQuestionPapers,
} from '@/services/evaluation-process'
import { PageContainer, PageHeader } from '@/components/layout'
import { StatusBadge } from '@/common/components/data-display'
import { toDateOnlyISO } from '@/common/generic-functions'

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

export default function ExamQuestionPaperMarksPage() {
  const [filterOpen, setFilterOpen] = useState(true)
  const [loading, setLoading] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)
  const [openAddModal, setOpenAddModal] = useState(false)
  const [rows, setRows] = useState<AnyRow[]>([])
  const [baseRows, setBaseRows] = useState<AnyRow[]>([])
  const [restRows, setRestRows] = useState<AnyRow[]>([])
  const [regulationRows, setRegulationRows] = useState<AnyRow[]>([])
  const [subjectRows, setSubjectRows] = useState<AnyRow[]>([])
  const [courseId, setCourseId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)
  const [regulationId, setRegulationId] = useState<number | null>(null)
  const [courseYearId, setCourseYearId] = useState<number | null>(null)
  const [subjectId, setSubjectId] = useState<number | null>(null)
  const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)
  const [form, setForm] = useState({
    questionPaperTitle: '',
    questionPaperCode: '',
    setNumber: '',
    totalQuestions: '',
    totalMarks: '',
    passMarks: '',
    preparedByEmp: 'Praveen Reddy',
    preparedDate: toDateOnlyISO(new Date()),
    questionPaperStatus: 'Prepared',
    statusComments: '',
    isActive: true,
    reason: 'active',
  })

  function resetForm() {
    setForm({
      questionPaperTitle: '',
      questionPaperCode: '',
      setNumber: '',
      totalQuestions: '',
      totalMarks: '',
      passMarks: '',
      preparedByEmp: 'Praveen Reddy',
      preparedDate: toDateOnlyISO(new Date()),
      questionPaperStatus: 'Prepared',
      statusComments: '',
      isActive: true,
      reason: 'active',
    })
  }

  async function saveQuestionPaper() {
    if (!form.questionPaperTitle || !form.questionPaperCode) {
      toastError('Question Paper Title and Code are required.')
      return
    }
    if (!examId || !courseYearId || !subjectId) {
      toastError('Please select Exam, Course Year and Subject before saving.')
      return
    }
    setLoading(true)
    try {
      await createExamQuestionPaper({
        questionPaperTitle: form.questionPaperTitle,
        questionPaperCode: form.questionPaperCode,
        setNumber: form.setNumber || null,
        totalQuestions: Number(form.totalQuestions || 0),
        totalMarks: Number(form.totalMarks || 0),
        passMarks: Number(form.passMarks || 0),
        preparedByEmp: form.preparedByEmp || null,
        preparedDate: form.preparedDate || null,
        questionPaperStatus: form.questionPaperStatus || null,
        statusComments: form.statusComments || null,
        isActive: form.isActive,
        reason: form.isActive ? 'active' : form.reason || null,
        examId,
        courseYearId,
        subjectId,
        regulationId: regulationId ?? undefined,
        academicYearId: academicYearId ?? undefined,
        courseId: courseId ?? undefined,
      })
      toastSuccess('Question paper saved successfully.')
      setOpenAddModal(false)
      resetForm()
      await getList()
    } catch (error: any) {
      toastError(error?.message ?? 'Failed to save question paper.')
    } finally {
      setLoading(false)
    }
  }

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
  const regulations = useMemo(() => dedupeBy(regulationRows, (r) => pickNum(r, ['regulationId', 'fk_regulation_id'])), [regulationRows])
  const courseYears = useMemo(
    () =>
      dedupeBy(
        restRows,
        (r) => pickNum(r, ['fk_course_year_id', 'courseYearId', 'course_year_id']),
      ),
    [restRows],
  )
  const subjects = useMemo(() => dedupeBy(subjectRows, (r) => pickNum(r, ['subjectId', 'fk_subject_id'])), [subjectRows])
  const selectedCollegeId = useMemo(() => pickNum(restRows[0], ['fk_college_id', 'collegeId']), [restRows])
  const selectedCourseGroupId = useMemo(() => pickNum(restRows[0], ['fk_course_group_id', 'courseGroupId']), [restRows])
  const selectedCourse = useMemo(
    () => courses.find((r) => pickNum(r, ['fk_course_id', 'courseId']) === Number(courseId)) ?? null,
    [courses, courseId],
  )
  const selectedAcademicYear = useMemo(
    () => academicYears.find((r) => pickNum(r, ['fk_academic_year_id', 'academicYearId']) === Number(academicYearId)) ?? null,
    [academicYears, academicYearId],
  )
  const selectedExam = useMemo(
    () => exams.find((r) => pickNum(r, ['fk_exam_id', 'examId']) === Number(examId)) ?? null,
    [exams, examId],
  )
  const selectedCourseYear = useMemo(
    () => courseYears.find((r) => pickNum(r, ['fk_course_year_id', 'courseYearId']) === Number(courseYearId)) ?? null,
    [courseYears, courseYearId],
  )
  const selectedSubject = useMemo(
    () => subjects.find((r) => pickNum(r, ['fk_subject_id', 'subjectId']) === Number(subjectId)) ?? null,
    [subjects, subjectId],
  )

  useEffect(() => {
    async function init() {
      setLoading(true)
      try {
        const list = await getEvaluationExamFilters(employeeId).catch(() => [])
        const rows = Array.isArray(list) ? list : []
        setBaseRows(rows)
        if (rows[0]) setCourseId(pickNum(rows[0], ['fk_course_id', 'courseId']))
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
      const bundle = await getEvaluationExamRestBundle({ courseId, examId, academicYearId, employeeId }).catch(() => ({ restFilters: [], regulations: [] }))
      const rows = Array.isArray(bundle.restFilters) ? bundle.restFilters : []
      setRestRows(rows)
      setRegulationRows(Array.isArray(bundle.regulations) ? bundle.regulations : [])
      if (rows[0]) {
        const defaultReg = pickNum((Array.isArray(bundle.regulations) ? bundle.regulations : [])[0], ['regulationId', 'fk_regulation_id'])
        setRegulationId(defaultReg || pickNum(rows[0], ['fk_regulation_id', 'regulationId']) || null)
        setCourseYearId(pickNum(rows[0], ['fk_course_year_id', 'courseYearId']) || null)
      }
    }
    void loadRest()
  }, [courseId, examId, academicYearId, employeeId])
  useEffect(() => {
    async function loadSubjects() {
      if (!courseId || !examId || !academicYearId || !courseYearId || !regulationId || !selectedCollegeId || !selectedCourseGroupId) {
        setSubjectRows([])
        return
      }
      const list = await listEvaluationSubjects({
        collegeId: selectedCollegeId,
        courseId,
        courseGroupId: selectedCourseGroupId,
        courseYearId,
        examId,
        academicYearId,
        regulationId,
        employeeId,
      }).catch(() => [])
      setSubjectRows(Array.isArray(list) ? list : [])
    }
    void loadSubjects()
  }, [selectedCollegeId, selectedCourseGroupId, courseId, examId, academicYearId, courseYearId, regulationId, employeeId])
  useEffect(() => {
    if (!subjectId && subjects[0]) setSubjectId(pickNum(subjects[0], ['fk_subject_id', 'subjectId']))
  }, [subjects, subjectId])
  useEffect(() => {
    setRows([])
    setHasFetched(false)
  }, [courseId, academicYearId, examId, regulationId, courseYearId, subjectId])

  async function getList() {
    setLoading(true)
    try {
      const list = await listExamQuestionPapers({
        examId: examId ?? undefined,
        courseYearId: courseYearId ?? undefined,
        subjectId: subjectId ?? undefined,
      }).catch(() => [])
      setRows(Array.isArray(list) ? list : [])
      setHasFetched(true)
    } finally {
      setLoading(false)
    }
  }

  const cols = useMemo<ColDef[]>(
    () => [
      { headerName: 'SI.No', valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, width: 82, pinned: 'left' },
      {
        field: 'questionPaperTitle',
        headerName: 'Question Paper Title',
        minWidth: 240,
        cellRenderer: (p: { data?: any }) => (
          <div className="py-1">
            <p className="font-medium text-[12px]">{p.data?.questionPaperTitle}</p>
            <p className="text-[11px] text-blue-700">
              View Questions | Print QP | Print QA | Edit
            </p>
          </div>
        ),
      },
      { field: 'paperCode', headerName: 'QP Code', minWidth: 110, valueGetter: (p) => p.data?.paperCode ?? p.data?.questionPaperCode ?? '-' },
      { field: 'courseYearCode', headerName: 'Course Year', minWidth: 120, valueGetter: (p) => p.data?.courseYearCode ?? p.data?.courseYearName ?? '-' },
      { field: 'setNo', headerName: 'Set No.', minWidth: 95, valueGetter: (p) => p.data?.setNo ?? p.data?.setNumber ?? '-' },
      { field: 'totalQuestions', headerName: 'Total Questions', minWidth: 130 },
      { field: 'totalMarks', headerName: 'Total Marks', minWidth: 120 },
      { field: 'passMarks', headerName: 'Pass Marks', minWidth: 110 },
      { field: 'preparedBy', headerName: 'Prepared By', minWidth: 130, valueGetter: (p) => p.data?.preparedBy ?? p.data?.preparedByEmp ?? '-' },
      { field: 'questionPaper', headerName: 'Question Paper', minWidth: 130 },
      { field: 'answerSheet', headerName: 'Answer Sheet', minWidth: 120 },
      { field: 'viewTemplate', headerName: 'View Template', minWidth: 125 },
      {
        field: 'isActive',
        headerName: 'Status',
        minWidth: 105,
        cellRenderer: (p: { data?: AnyRow }) => (
          <StatusBadge status={p.data?.isActive === true || p.data?.isActive === 'Active'} />
        ),
      },
      {
        headerName: 'Actions',
        minWidth: 190,
        cellRenderer: () => (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-7">Manage Question</Button>
            <Button size="sm" className="h-7">Upload QP & AS</Button>
          </div>
        ),
      },
    ],
    [],
  )

  return (
    <PageContainer className="space-y-5">
      <PageHeader title="Exam Question Paper" subtitle="Manage question paper marks setup" />
      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between gap-2">
          <h2 className="text-[16px] font-semibold text-[hsl(var(--primary))]">Exam Question Paper</h2>
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
              <label className="text-[12px] text-muted-foreground">Course</label>
              <Select
                value={courseId ? String(courseId) : null}
                onChange={(v) => setCourseId(v ? Number(v) : 0)}
                options={courses.map((c) => ({ value: String(pickNum(c, ['fk_course_id', 'courseId'])), label: pickText(c, ['course_code', 'courseCode', 'course_name', 'courseName']) }))}
                placeholder="Course"
              />
            </div>
            <div className="md:col-span-3">
              <label className="text-[12px] text-muted-foreground">Academic Year</label>
              <Select
                value={academicYearId ? String(academicYearId) : null}
                onChange={(v) => setAcademicYearId(v ? Number(v) : 0)}
                options={academicYears.map((a) => ({ value: String(pickNum(a, ['fk_academic_year_id', 'academicYearId'])), label: pickText(a, ['academic_year', 'academicYear']) }))}
                placeholder="Academic Year"
              />
            </div>
            <div className="md:col-span-6">
              <label className="text-[12px] text-muted-foreground">Exam</label>
              <Select
                value={examId ? String(examId) : null}
                onChange={(v) => setExamId(v ? Number(v) : 0)}
                options={exams.map((e) => ({ value: String(pickNum(e, ['fk_exam_id', 'examId'])), label: pickText(e, ['exam_name', 'examName']) }))}
                placeholder="Exam"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-[12px] text-muted-foreground">Regulation Id</label>
              <Select
                value={regulationId ? String(regulationId) : null}
                onChange={(v) => setRegulationId(v ? Number(v) : 0)}
                options={regulations.map((r) => ({ value: String(pickNum(r, ['fk_regulation_id', 'regulationId'])), label: pickText(r, ['regulationCode', 'regulation_code']) || `R${pickNum(r, ['regulationId', 'fk_regulation_id'])}` }))}
                placeholder="Regulation"
              />
            </div>
            <div className="md:col-span-3">
              <label className="text-[12px] text-muted-foreground">Course Years *</label>
              <Select
                value={courseYearId ? String(courseYearId) : null}
                onChange={(v) => setCourseYearId(v ? Number(v) : 0)}
                options={courseYears.map((y) => ({ value: String(pickNum(y, ['fk_course_year_id', 'courseYearId'])), label: pickText(y, ['course_year_name', 'courseYearName', 'course_year_code', 'courseYearCode']) }))}
                placeholder="Course Year"
              />
            </div>
            <div className="md:col-span-5">
              <label className="text-[12px] text-muted-foreground">Subject</label>
              <Select
                value={subjectId ? String(subjectId) : null}
                onChange={(v) => setSubjectId(v ? Number(v) : 0)}
                options={subjects.map((s) => ({ value: String(pickNum(s, ['fk_subject_id', 'subjectId'])), label: pickText(s, ['subjectCode', 'subject_code', 'subjectName', 'subject_name']) }))}
                placeholder="Subject"
              />
            </div>
            <div className="md:col-span-2">
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
                pdfDocumentTitle: 'Exam Question Paper',
              }}
              toolbarTrailing={(
                <Button
                  type="button"
                  size="sm"
                  className="h-[30px] px-3 text-[12px]"
                  onClick={() => setOpenAddModal(true)}
                >
                  + Exam Question Paper
                </Button>
              )}
            />
          </div>
        </div>
      )}

      <Dialog open={openAddModal} onOpenChange={setOpenAddModal}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-[18px] text-[hsl(var(--primary))]">Create Question Paper</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-[13px]">
            <div className="md:col-span-3 space-y-1">
              <Label>Course</Label>
              <Input value={pickText(selectedCourse, ['course_code', 'courseCode', 'course_name', 'courseName']) || '-'} disabled className="h-9 text-[12px]" />
            </div>
            <div className="md:col-span-3 space-y-1">
              <Label>Academic Year</Label>
              <Input value={pickText(selectedAcademicYear, ['academic_year', 'academicYear']) || '-'} disabled className="h-9 text-[12px]" />
            </div>
            <div className="md:col-span-6 space-y-1">
              <Label>Exam</Label>
              <Input value={pickText(selectedExam, ['exam_name', 'examName']) || '-'} disabled className="h-9 text-[12px]" />
            </div>
            <div className="md:col-span-2 space-y-1">
              <Label>Regulation Id</Label>
              <Input value={pickText(regulations.find((r) => pickNum(r, ['regulationId', 'fk_regulation_id']) === Number(regulationId)), ['regulationCode', 'regulation_code']) || '-'} disabled className="h-9 text-[12px]" />
            </div>
            <div className="md:col-span-3 space-y-1">
              <Label>Course Years</Label>
              <Input value={pickText(selectedCourseYear, ['course_year_name', 'courseYearName', 'course_year_code', 'courseYearCode']) || '-'} disabled className="h-9 text-[12px]" />
            </div>
            <div className="md:col-span-4 space-y-1">
              <Label>Subject</Label>
              <Input value={pickText(selectedSubject, ['subject_code', 'subjectCode', 'subject_name', 'subjectName']) || '-'} disabled className="h-9 text-[12px]" />
            </div>
            <div className="md:col-span-3 space-y-1">
              <Label>Template</Label>
              <Input value="B.Tech DS Template A" disabled className="h-9 text-[12px]" />
            </div>

            <div className="md:col-span-12 border-t pt-3 mt-1" />

            <div className="md:col-span-6 space-y-1">
              <Label>Question Paper Title *</Label>
              <Input
                className="h-9 text-[12px]"
                value={form.questionPaperTitle}
                onChange={(e) => setForm((s) => ({ ...s, questionPaperTitle: e.target.value }))}
              />
            </div>
            <div className="md:col-span-3 space-y-1">
              <Label>Question Paper Code *</Label>
              <Input
                className="h-9 text-[12px]"
                value={form.questionPaperCode}
                onChange={(e) => setForm((s) => ({ ...s, questionPaperCode: e.target.value }))}
              />
            </div>
            <div className="md:col-span-3 space-y-1">
              <Label>Set Number</Label>
              <Input
                className="h-9 text-[12px]"
                value={form.setNumber}
                onChange={(e) => setForm((s) => ({ ...s, setNumber: e.target.value }))}
              />
            </div>
            <div className="md:col-span-4 space-y-1">
              <Label>Total Questions</Label>
              <Input
                className="h-9 text-[12px]"
                value={form.totalQuestions}
                onChange={(e) => setForm((s) => ({ ...s, totalQuestions: e.target.value }))}
              />
            </div>
            <div className="md:col-span-4 space-y-1">
              <Label>Total Marks</Label>
              <Input
                className="h-9 text-[12px]"
                value={form.totalMarks}
                onChange={(e) => setForm((s) => ({ ...s, totalMarks: e.target.value }))}
              />
            </div>
            <div className="md:col-span-4 space-y-1">
              <Label>Pass Marks</Label>
              <Input
                className="h-9 text-[12px]"
                value={form.passMarks}
                onChange={(e) => setForm((s) => ({ ...s, passMarks: e.target.value }))}
              />
            </div>
            <div className="md:col-span-4 space-y-1">
              <Label>Prepared Employee</Label>
              <Input
                className="h-9 text-[12px]"
                value={form.preparedByEmp}
                onChange={(e) => setForm((s) => ({ ...s, preparedByEmp: e.target.value }))}
              />
            </div>
            <div className="md:col-span-4 space-y-1">
              <Label>Prepared Date</Label>
              <Input
                type="date"
                className="h-9 text-[12px]"
                value={form.preparedDate}
                onChange={(e) => setForm((s) => ({ ...s, preparedDate: e.target.value }))}
              />
            </div>
            <div className="md:col-span-4 space-y-1">
              <Label>Question Paper Status</Label>
              <Select
                value={form.questionPaperStatus ?? null}
                onChange={(v) => setForm((s) => ({ ...s, questionPaperStatus: v ?? '' }))}
                options={[
                  { value: 'Prepared', label: 'Prepared' },
                  { value: 'In Review', label: 'In Review' },
                  { value: 'Approved', label: 'Approved' },
                ]}
              />
            </div>
            <div className="md:col-span-12 space-y-1">
              <Label>Status Comments</Label>
              <textarea
                className="min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-[12px] focus:outline-none focus:ring-2 focus:ring-ring"
                value={form.statusComments}
                onChange={(e) => setForm((s) => ({ ...s, statusComments: e.target.value }))}
              />
            </div>
            <div className="md:col-span-4 flex items-center gap-2">
              <Checkbox
                checked={form.isActive}
                onCheckedChange={(v) =>
                  setForm((s) => ({ ...s, isActive: v === true, reason: v === true ? 'active' : s.reason }))
                }
              />
              <Label>Active</Label>
            </div>
            {!form.isActive && (
              <div className="md:col-span-8 space-y-1">
                <Label>Reason</Label>
                <Input
                  className="h-9 text-[12px]"
                  value={form.reason}
                  onChange={(e) => setForm((s) => ({ ...s, reason: e.target.value }))}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAddModal(false)}>Close</Button>
            <Button onClick={() => void saveQuestionPaper()} disabled={loading}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </PageContainer>
  )
}
