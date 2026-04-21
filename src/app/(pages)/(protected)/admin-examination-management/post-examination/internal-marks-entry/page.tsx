'use client'

import { useMemo, useState, useEffect } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { GraduationCap } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable } from '@/common/components/table'
import { TableCard } from '@/common/components/table/TableCard'
import {
  getInternalMarksEntryFilters,
  getInternalMarksEntryRestFilters,
  getInternalMarksEntryStudents,
  getInternalMarksEntrySubjects,
  saveInternalMarksEntry,
} from '@/services/post-examination'
import { toastError, toastSuccess } from '@/lib/toast'

type AnyRow = Record<string, any>
type MarkRow = Record<string, any>

function dedupeBy<T extends AnyRow>(arr: T[], key: string): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const row of arr) {
    const value = String(row?.[key] ?? '')
    if (!value || seen.has(value)) continue
    seen.add(value)
    out.push(row)
  }
  return out
}

function MarkInputRenderer(params: ICellRendererParams<MarkRow> & { field: string; onChange: (row: MarkRow, field: string, value: number) => void; disabled?: boolean }) {
  const value = Number(params.data?.[params.field] ?? 0)
  return (
    <Input
      type="number"
      className="h-8 text-[12px]"
      value={Number.isFinite(value) ? String(value) : '0'}
      disabled={Boolean(params.disabled)}
      onChange={(e) => params.data && params.onChange(params.data, params.field, Number(e.target.value || 0))}
    />
  )
}

export default function InternalMarksEntryPage() {
  const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)
  const empNumber = globalThis?.localStorage?.getItem('empNumber') ?? ''
  const userName = globalThis?.localStorage?.getItem('userName') ?? ''

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)
  const [search, setSearch] = useState('')
  const [checkUploadType] = useState(1)

  const [allFilters, setAllFilters] = useState<AnyRow[]>([])
  const [restFilters, setRestFilters] = useState<AnyRow[]>([])
  const [subjectRows, setSubjectRows] = useState<AnyRow[]>([])
  const [rows, setRows] = useState<MarkRow[]>([])

  const [courseId, setCourseId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)
  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null)
  const [courseYearId, setCourseYearId] = useState<number | null>(null)
  const [regulationId, setRegulationId] = useState<number | null>(null)
  const [subjectTypeId, setSubjectTypeId] = useState<number | null>(null)
  const [subjectId, setSubjectId] = useState<number | null>(null)
  const [labBatchId, setLabBatchId] = useState<number>(0)
  const [examDate, setExamDate] = useState('')

  const courses = useMemo(() => dedupeBy(allFilters, 'fk_course_id'), [allFilters])
  const academicYears = useMemo(
    () => dedupeBy(allFilters.filter((x) => Number(x.fk_course_id) === Number(courseId)), 'fk_academic_year_id'),
    [allFilters, courseId],
  )
  const exams = useMemo(
    () =>
      dedupeBy(
        allFilters.filter((x) => Number(x.fk_course_id) === Number(courseId) && Number(x.fk_academic_year_id) === Number(academicYearId)),
        'fk_exam_id',
      ),
    [allFilters, courseId, academicYearId],
  )
  const colleges = useMemo(() => dedupeBy(restFilters, 'fk_college_id'), [restFilters])
  const courseGroups = useMemo(
    () => dedupeBy(restFilters.filter((x) => Number(x.fk_college_id) === Number(collegeId)), 'fk_course_group_id'),
    [restFilters, collegeId],
  )
  const courseYears = useMemo(
    () =>
      dedupeBy(
        restFilters.filter((x) => Number(x.fk_college_id) === Number(collegeId) && Number(x.fk_course_group_id) === Number(courseGroupId)),
        'fk_course_year_id',
      ),
    [restFilters, collegeId, courseGroupId],
  )
  const regulations = useMemo(
    () =>
      dedupeBy(
        restFilters.filter(
          (x) =>
            Number(x.fk_college_id) === Number(collegeId) &&
            Number(x.fk_course_group_id) === Number(courseGroupId) &&
            Number(x.fk_course_year_id) === Number(courseYearId),
        ),
        'fk_regulation_id',
      ),
    [restFilters, collegeId, courseGroupId, courseYearId],
  )
  const subjectTypes = useMemo(
    () => dedupeBy(subjectRows.filter((x) => Number(x.fk_regulation_id) === Number(regulationId)), 'fk_subjecttype_catdet_id'),
    [subjectRows, regulationId],
  )
  const subjects = useMemo(
    () =>
      dedupeBy(
        subjectRows.filter(
          (x) =>
            Number(x.fk_regulation_id) === Number(regulationId) &&
            Number(x.fk_subjecttype_catdet_id) === Number(subjectTypeId),
        ),
        'fk_subject_id',
      ),
    [subjectRows, regulationId, subjectTypeId],
  )
  const labBatches = useMemo(
    () => dedupeBy(subjectRows.filter((x) => Number(x.fk_subject_id) === Number(subjectId) && Number(x.fk_exam_labbatch_id ?? 0) > 0), 'fk_exam_labbatch_id'),
    [subjectRows, subjectId],
  )

  const maxMarks = useMemo(() => {
    const values = rows.map((r) => Number(r.maxMarks ?? r.internal_max_marks ?? 0))
    const firstValid = values.find((v) => Number.isFinite(v) && v > 0)
    return firstValid ?? 0
  }, [rows])
  const employeeDisplay = userName ? `${empNumber} (${userName})` : empNumber
  const selectedExam = useMemo(() => exams.find((x) => Number(x.fk_exam_id) === Number(examId)), [exams, examId])
  const selectedCollege = useMemo(() => colleges.find((x) => Number(x.fk_college_id) === Number(collegeId)), [colleges, collegeId])
  const selectedCourse = useMemo(() => courses.find((x) => Number(x.fk_course_id) === Number(courseId)), [courses, courseId])
  const selectedGroup = useMemo(
    () => courseGroups.find((x) => Number(x.fk_course_group_id) === Number(courseGroupId)),
    [courseGroups, courseGroupId],
  )
  const selectedYear = useMemo(
    () => courseYears.find((x) => Number(x.fk_course_year_id) === Number(courseYearId)),
    [courseYears, courseYearId],
  )
  const selectedRegulation = useMemo(
    () => regulations.find((x) => Number(x.fk_regulation_id) === Number(regulationId)),
    [regulations, regulationId],
  )
  const selectedSubject = useMemo(() => subjects.find((x) => Number(x.fk_subject_id) === Number(subjectId)), [subjects, subjectId])
  const selectedAcademicYear = useMemo(
    () => academicYears.find((x) => Number(x.fk_academic_year_id) === Number(academicYearId)),
    [academicYears, academicYearId],
  )

  useEffect(() => {
    async function loadFilters() {
      setLoading(true)
      try {
        const data = await getInternalMarksEntryFilters(employeeId).catch(() => [])
        setAllFilters(Array.isArray(data) ? data : [])
      } finally {
        setLoading(false)
      }
    }
    void loadFilters()
  }, [employeeId])

  useEffect(() => {
    if (courses[0]?.fk_course_id) setCourseId(Number(courses[0].fk_course_id))
  }, [courses])
  useEffect(() => {
    if (academicYears[0]?.fk_academic_year_id) setAcademicYearId(Number(academicYears[0].fk_academic_year_id))
  }, [academicYears])
  useEffect(() => {
    if (exams[0]?.fk_exam_id) setExamId(Number(exams[0].fk_exam_id))
  }, [exams])

  useEffect(() => {
    async function loadRest() {
      setRestFilters([])
      setSubjectRows([])
      if (!courseId || !academicYearId || !examId) return
      const data = await getInternalMarksEntryRestFilters({ courseId, academicYearId, examId, employeeId }).catch(() => [])
      setRestFilters(Array.isArray(data) ? data : [])
    }
    void loadRest()
  }, [courseId, academicYearId, examId, employeeId])

  useEffect(() => {
    if (colleges[0]?.fk_college_id) setCollegeId(Number(colleges[0].fk_college_id))
  }, [colleges])
  useEffect(() => {
    if (courseGroups[0]?.fk_course_group_id) setCourseGroupId(Number(courseGroups[0].fk_course_group_id))
  }, [courseGroups])
  useEffect(() => {
    if (courseYears[0]?.fk_course_year_id) setCourseYearId(Number(courseYears[0].fk_course_year_id))
  }, [courseYears])
  useEffect(() => {
    if (regulations[0]?.fk_regulation_id) setRegulationId(Number(regulations[0].fk_regulation_id))
  }, [regulations])

  useEffect(() => {
    async function loadSubjects() {
      setSubjectRows([])
      if (!courseId || !academicYearId || !examId || !collegeId || !courseGroupId || !courseYearId || !regulationId) return
      const data = await getInternalMarksEntrySubjects({
        collegeId,
        courseId,
        courseGroupId,
        courseYearId,
        examId,
        academicYearId,
        regulationId,
        employeeId,
      }).catch(() => [])
      setSubjectRows(Array.isArray(data) ? data : [])
    }
    void loadSubjects()
  }, [courseId, academicYearId, examId, collegeId, courseGroupId, courseYearId, regulationId, employeeId])

  useEffect(() => {
    if (subjectTypes[0]?.fk_subjecttype_catdet_id) setSubjectTypeId(Number(subjectTypes[0].fk_subjecttype_catdet_id))
  }, [subjectTypes])
  useEffect(() => {
    if (subjects[0]?.fk_subject_id) setSubjectId(Number(subjects[0].fk_subject_id))
  }, [subjects])
  useEffect(() => {
    const dateValue = String(subjects[0]?.exam_date ?? '').slice(0, 10)
    setExamDate(dateValue || '')
  }, [subjects])

  function updateMarks(row: MarkRow, field: string, value: number) {
    const targetStudentId = Number(row.studentId ?? row.fk_student_id ?? 0)
    const targetHallTicket = String(row.hallticketNumber ?? row.hallticket_number ?? '')
    setRows((prev) =>
      prev.map((r) => {
        const sid = Number(r.studentId ?? r.fk_student_id ?? 0)
        const hall = String(r.hallticketNumber ?? r.hallticket_number ?? '')
        const sameRow =
          (targetStudentId > 0 && sid === targetStudentId) ||
          (targetStudentId <= 0 && targetHallTicket.length > 0 && hall === targetHallTicket)
        if (!sameRow) return r
        const next = { ...r, [field]: value }
        if (field !== 'internal_total_marks') {
          const total =
            Number(next.internal_exam_marks ?? 0) +
            Number(next.internal_assignment_marks ?? 0) +
            Number(next.internal_quiz_marks ?? 0)
          next.internal_total_marks = total
        }
        return next
      }),
    )
  }

  async function onGetList() {
    if (!collegeId || !courseId || !examId || !courseGroupId || !courseYearId || !regulationId || !subjectId || !examDate) return
    setLoading(true)
    setHasFetched(true)
    try {
      const data = await getInternalMarksEntryStudents({
        collegeId,
        courseId,
        examId,
        courseGroupId,
        courseYearId,
        regulationId,
        subjectId,
        labBatchId,
        examDate,
      }).catch(() => [])
      const normalized = (Array.isArray(data) ? data : []).map((r) => ({
        ...r,
        internal_exam_marks: Number(r.internal_exam_marks ?? 0),
        internal_assignment_marks: Number(r.internal_assignment_marks ?? 0),
        internal_quiz_marks: Number(r.internal_quiz_marks ?? 0),
        internal_total_marks: Number(r.internal_total_marks ?? 0),
      }))
      setRows(normalized)
    } finally {
      setLoading(false)
    }
  }

  async function onSaveMarks() {
    if (!courseId || !collegeId || !examId || !courseYearId || !subjectId || !regulationId) return
    if (rows.length === 0) return
    setSaving(true)
    try {
      const payload = rows.map((row) => ({
        examStudentDetailDTO: {
          ...row,
          marksEnteredEmpId: employeeId,
          courseId,
          regulationId,
          subjectTypeId,
          credits: row.isPass ? Number(row.sub_credits ?? 0) : 0,
        },
        examStudentInternalMarkDTO: {
          examDate,
          isActive: true,
          isPresent: Boolean(row.isPresent),
          isPublished: false,
          marks: Number(row.internal_total_marks ?? row.marks ?? 0),
          internal_total_marks: Number(row.internal_total_marks ?? 0),
          internal_exam_marks: Number(row.internal_exam_marks ?? 0),
          internal_quiz_marks: Number(row.internal_quiz_marks ?? 0),
          internal_assignment_marks: Number(row.internal_assignment_marks ?? 0),
          collegeId,
          studentId: Number(row.studentId ?? row.fk_student_id ?? 0),
          courseYearId,
          subjectId,
          examId,
          employeeId,
          examStdInternalMarkId: row.examStdInternalMarkId ?? row.exam_std_internal_mark_id ?? 0,
        },
      }))
      await saveInternalMarksEntry(payload)
      toastSuccess('Marks saved successfully')
      await onGetList()
    } catch (error) {
      toastError(error, 'Failed to save marks')
    } finally {
      setSaving(false)
    }
  }

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => `${r.hallticketNumber ?? ''} ${r.firstName ?? ''}`.toLowerCase().includes(q))
  }, [rows, search])

  const columnDefs = useMemo<ColDef<MarkRow>[]>(() => {
    const attendanceValue = (isPresent: unknown) => {
      if (isPresent === true) return 'Present'
      if (isPresent === false) return 'Absent'
      return 'Not Marked'
    }
    const cols: ColDef<MarkRow>[] = [
      { headerName: 'SI No', width: 70, flex: 0, valueGetter: (p: any) => (p.node?.rowIndex ?? 0) + 1 },
      { field: 'hallticketNumber', headerName: 'Hallticket Number', minWidth: 170 },
      { field: 'firstName', headerName: 'Student', minWidth: 180 },
      {
        headerName: 'Attendance Status',
        minWidth: 130,
        valueGetter: (p: any) => attendanceValue(p.data?.isPresent),
      },
    ]
    cols.push({
      headerName: 'Total Internal',
      minWidth: 130,
      cellRenderer: MarkInputRenderer,
      cellRendererParams: { field: 'internal_total_marks', onChange: updateMarks, disabled: false },
    })
    return cols
  }, [])

  return (
    <PageContainer className="space-y-5">
      <PageHeader title="Internal Marks Entry" subtitle="Post examination marks entry" />

      <div className="app-card p-3">
        <div className="border-b border-yellow-200 pb-2">
          <h2 className="text-[15px] font-semibold leading-tight text-[hsl(var(--card-title))]">Internal Marks Entry</h2>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-12 items-end">
          <div className="space-y-1 md:col-span-2"><Label>Course *</Label><Select value={courseId ? String(courseId) : undefined} onValueChange={(v) => setCourseId(Number(v))}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Course" /></SelectTrigger><SelectContent>{courses.map((x) => <SelectItem key={x.fk_course_id} value={String(x.fk_course_id)}>{x.course_code}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1 md:col-span-2"><Label>Academic Year *</Label><Select value={academicYearId ? String(academicYearId) : undefined} onValueChange={(v) => setAcademicYearId(Number(v))}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Academic Year" /></SelectTrigger><SelectContent>{academicYears.map((x) => <SelectItem key={x.fk_academic_year_id} value={String(x.fk_academic_year_id)}>{x.academic_year}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1 md:col-span-8"><Label>Exam *</Label><Select value={examId ? String(examId) : undefined} onValueChange={(v) => setExamId(Number(v))}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Exam" /></SelectTrigger><SelectContent>{exams.map((x) => <SelectItem key={x.fk_exam_id} value={String(x.fk_exam_id)}>{x.exam_name}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1 md:col-span-2"><Label>College *</Label><Select value={collegeId ? String(collegeId) : undefined} onValueChange={(v) => setCollegeId(Number(v))}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="College" /></SelectTrigger><SelectContent>{colleges.map((x) => <SelectItem key={x.fk_college_id} value={String(x.fk_college_id)}>{x.college_code}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1 md:col-span-2"><Label>Course Group *</Label><Select value={courseGroupId ? String(courseGroupId) : undefined} onValueChange={(v) => setCourseGroupId(Number(v))}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Course Group" /></SelectTrigger><SelectContent>{courseGroups.map((x) => <SelectItem key={x.fk_course_group_id} value={String(x.fk_course_group_id)}>{x.group_code}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1 md:col-span-2"><Label>Course Year *</Label><Select value={courseYearId ? String(courseYearId) : undefined} onValueChange={(v) => setCourseYearId(Number(v))}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Course Year" /></SelectTrigger><SelectContent>{courseYears.map((x) => <SelectItem key={x.fk_course_year_id} value={String(x.fk_course_year_id)}>{x.course_year_code}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1 md:col-span-2"><Label>Regulation</Label><Select value={regulationId ? String(regulationId) : undefined} onValueChange={(v) => setRegulationId(Number(v))}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Regulation" /></SelectTrigger><SelectContent>{regulations.map((x) => <SelectItem key={x.fk_regulation_id} value={String(x.fk_regulation_id)}>{x.regulation_code}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1 md:col-span-2"><Label>Subject Type</Label><Select value={subjectTypeId ? String(subjectTypeId) : undefined} onValueChange={(v) => setSubjectTypeId(Number(v))}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Subject Type" /></SelectTrigger><SelectContent>{subjectTypes.map((x) => <SelectItem key={x.fk_subjecttype_catdet_id} value={String(x.fk_subjecttype_catdet_id)}>{x.subject_type}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1 md:col-span-2"><Label>Subject</Label><Select value={subjectId ? String(subjectId) : undefined} onValueChange={(v) => setSubjectId(Number(v))}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Subject" /></SelectTrigger><SelectContent>{subjects.map((x) => <SelectItem key={x.fk_subject_id} value={String(x.fk_subject_id)}>{x.subject_name} ({x.subject_code})</SelectItem>)}</SelectContent></Select></div>
          {labBatches.length > 0 && (
            <div className="space-y-1 md:col-span-2"><Label>Lab Batch</Label><Select value={String(labBatchId)} onValueChange={(v) => setLabBatchId(Number(v))}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="All" /></SelectTrigger><SelectContent><SelectItem value="0">All</SelectItem>{labBatches.map((x) => <SelectItem key={x.fk_exam_labbatch_id} value={String(x.fk_exam_labbatch_id)}>{x.labbatch_name}</SelectItem>)}</SelectContent></Select></div>
          )}
          <div className="space-y-1 md:col-span-2"><Label>Employee</Label><Input className="h-8 text-[12px]" value={employeeDisplay} readOnly /></div>
          <div className="space-y-1 md:col-span-2"><Label>Exam Date</Label><Input className="h-8 text-[12px]" type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} /></div>
          <div className="md:col-span-2"><Button className="h-8 text-[12px] w-full" onClick={onGetList} disabled={loading}>{loading ? 'Loading...' : 'Get List'}</Button></div>
        </div>
      </div>

      {hasFetched && (
        <div className="space-y-3">
          <div className="px-1 text-[14px] text-slate-700">◉ List Of Marks</div>

          {checkUploadType === 1 && (
            <div className="app-card overflow-hidden border border-[#c3d9ff]">
              <div className="flex items-start gap-4 p-3">
                <div className="flex h-20 w-24 items-center justify-center bg-[#c3d9ff] text-slate-700">
                  <GraduationCap className="h-10 w-10" />
                </div>
                <div className="space-y-1 text-[13px]">
                  <p className="text-slate-700">
                    {selectedExam?.exam_name ?? '-'}{' '}
                    <span className="text-slate-500">
                      ({String(selectedExam?.from_date ?? '').slice(0, 10)} - {String(selectedExam?.to_date ?? '').slice(0, 10)})
                    </span>{' '}
                    {examDate ? <span className="text-blue-700">({examDate})</span> : null}
                  </p>
                  <p className="text-slate-500">
                    / {selectedCollege?.college_code ?? '-'} / {selectedCourse?.course_code ?? '-'} / {selectedGroup?.group_code ?? '-'} /{' '}
                    {selectedYear?.course_year_code ?? '-'} / <span className="text-blue-700">({selectedAcademicYear?.academic_year ?? '-'})</span>
                  </p>
                  <p className="font-semibold text-slate-800">
                    {selectedSubject?.subject_name ?? '-'} ({selectedRegulation?.regulation_code ?? '-'}) -{' '}
                    <span className="text-blue-700">{selectedSubject?.subject_type ?? '-'}</span>{' '}
                    <span>({selectedExam?.is_internal_exam ? 'Internal' : 'Regular'})</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          <TableCard
            headerLeft={<Input className="h-8 text-[12px] max-w-sm" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />}
            headerRight={<div className="text-[12px] text-slate-600">Max Marks : <span className="font-semibold">{maxMarks || '-'}</span></div>}
          >
            <div className="space-y-3">
              <DataTable rowData={filteredRows} columnDefs={columnDefs} loading={loading} pagination />
              <div className="flex items-center justify-end gap-2">
                <Button className="h-8 text-[12px]" onClick={onSaveMarks} disabled={saving || rows.length === 0}>{saving ? 'Saving...' : 'Save Marks'}</Button>
                <Button className="h-8 text-[12px]" variant="outline" onClick={() => globalThis?.print?.()}>Print</Button>
              </div>
            </div>
          </TableCard>
        </div>
      )}
    </PageContainer>
  )
}

