'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { GraduationCap } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DataTable } from '@/common/components/table'
import { TableCard } from '@/common/components/table'
import {
  generateMarksEntrySecretCode,
  getMarksEntryStudentsBundle,
  getSecureMarksFilters,
  getSecureMarksRestFilters,
  getSecureMarksSubjects,
  saveInternalMarksEntry,
  validateMarksEntrySecretCode,
} from '@/services/post-examination'
import { getCollegeById } from '@/services'
import { MINIO_URL } from '@/config/constants/api'
import { useSessionContext } from '@/context/SessionContext'
import { useSecureMarksPrint } from './_print/useSecureMarksPrint'
import { toastError, toastSuccess } from '@/lib/toast'

type AnyRow = Record<string, any>

function numFrom(row: AnyRow, ...keys: string[]): number {
  for (const key of keys) {
    const value = Number(row?.[key] ?? 0)
    if (Number.isFinite(value) && value > 0) return value
  }
  return 0
}

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

function MarksInputRenderer(
  params: ICellRendererParams<AnyRow> & { maxMarks?: number; onChange: (row: AnyRow, value: number) => void; readOnly: boolean },
) {
  const value = Number(params.data?.marks ?? 0)
  const disabled = params.readOnly || params.data?.isPresent !== true
  const max = params.maxMarks && params.maxMarks > 0 ? params.maxMarks : undefined
  return (
    <Input
      type="number"
      min={0}
      max={max}
      className="h-8 text-[12px]"
      value={Number.isFinite(value) ? String(value) : '0'}
      disabled={disabled}
      onChange={(e) => params.data && params.onChange(params.data, Number(e.target.value || 0))}
    />
  )
}

export default function SecureExamMarksEntryPage() {
  const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)
  const userId = Number(globalThis?.localStorage?.getItem('userId') ?? 0)
  const userRole = String(globalThis?.localStorage?.getItem('userRole') ?? '')
  const empNumber = globalThis?.localStorage?.getItem('empNumber') ?? ''
  const userName = globalThis?.localStorage?.getItem('userName') ?? ''

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)

  const [allFilters, setAllFilters] = useState<AnyRow[]>([])
  const [restFilters, setRestFilters] = useState<AnyRow[]>([])
  const [regRows, setRegRows] = useState<AnyRow[]>([])
  const [subjectRows, setSubjectRows] = useState<AnyRow[]>([])
  const [rows, setRows] = useState<AnyRow[]>([])

  const [courseId, setCourseId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)
  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null)
  const [courseYearId, setCourseYearId] = useState<number | null>(null)
  const [regulationId, setRegulationId] = useState<number | null>(null)
  const [subjectTypeId, setSubjectTypeId] = useState<number | null>(null)
  const [subjectId, setSubjectId] = useState<number | null>(null)
  const [examType, setExamType] = useState('ALL')
  const [labBatchId, setLabBatchId] = useState(0)
  const [examDate, setExamDate] = useState('')

  const [saveUnlocked, setSaveUnlocked] = useState(false)
  const [codeDialogOpen, setCodeDialogOpen] = useState(false)
  const [secretCodeInput, setSecretCodeInput] = useState('')
  const [validatingCode, setValidatingCode] = useState(false)

  // Print sheet data: evaluator names (result[1]/[2]) + selected college logo.
  const [internalEvaluators, setInternalEvaluators] = useState<AnyRow[]>([])
  const [externalEvaluators, setExternalEvaluators] = useState<AnyRow[]>([])
  const [collegeLogoUrl, setCollegeLogoUrl] = useState<string | null>(null)
  const { user } = useSessionContext()

  // Resolve the SELECTED college's logo (MinIO); fall back to the login DTO logo.
  useEffect(() => {
    let cancelled = false
    const sessionLogo = user?.collegeLogo
      ? (/^(https?:\/\/|data:)/i.test(user.collegeLogo) ? user.collegeLogo : `${MINIO_URL}${user.collegeLogo.replace(/^\/+/, '')}`)
      : null
    if (!collegeId) {
      setCollegeLogoUrl(sessionLogo)
      return
    }
    getCollegeById(collegeId)
      .then((college) => {
        if (cancelled) return
        const logo = college?.logo
        setCollegeLogoUrl(logo ? `${MINIO_URL}${String(logo).replace(/^\/+/, '')}` : sessionLogo)
      })
      .catch(() => { if (!cancelled) setCollegeLogoUrl(sessionLogo) })
    return () => { cancelled = true }
  }, [collegeId, user?.collegeLogo])

  const { printMode, printButton, printView } = useSecureMarksPrint({
    students: rows,
    internalEvaluators,
    externalEvaluators,
    logoUrl: collegeLogoUrl,
  })

  const isExternalEvaluator = userRole === 'EXTERNAL EVALUATOR' || userRole === 'Offline External Evaluator'
  const employeeDisplay = userName ? `${empNumber} (${userName})` : empNumber
  let saveButtonText = 'Save Marks'
  if (isExternalEvaluator) saveButtonText = 'Approve'
  if (saving) saveButtonText = 'Saving...'

  const courses = useMemo(() => dedupeBy(allFilters, 'fk_course_id'), [allFilters])
  const academicYears = useMemo(
    () => dedupeBy(allFilters.filter((x) => Number(x.fk_course_id) === Number(courseId)), 'fk_academic_year_id'),
    [allFilters, courseId],
  )
  const exams = useMemo(
    () =>
      dedupeBy(
        allFilters.filter(
          (x) =>
            Number(x.fk_course_id) === Number(courseId) &&
            Number(x.fk_academic_year_id) === Number(academicYearId),
        ),
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
        restFilters.filter(
          (x) =>
            Number(x.fk_college_id) === Number(collegeId) &&
            Number(x.fk_course_group_id) === Number(courseGroupId),
        ),
        'fk_course_year_id',
      ),
    [restFilters, collegeId, courseGroupId],
  )
  const regulations = useMemo(() => {
    const direct = dedupeBy(regRows, 'fk_regulation_id')
    if (direct.length > 0) return direct
    return dedupeBy(
      restFilters.filter((x) => numFrom(x, 'fk_regulation_id', 'regulationId') > 0),
      'fk_regulation_id',
    )
  }, [regRows, restFilters])
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
    () =>
      dedupeBy(
        subjectRows.filter((x) => numFrom(x, 'fk_subject_id', 'subjectId') === Number(subjectId) && numFrom(x, 'fk_exam_labbatch_id', 'examLabbatchId') > 0),
        'fk_exam_labbatch_id',
      ),
    [subjectRows, subjectId],
  )
  const examTypeOptions = useMemo(() => {
    const exam = exams.find((x) => Number(x.fk_exam_id) === Number(examId))
    if (!exam) return [{ value: 'ALL', label: 'All' }]
    const opts: { value: string; label: string }[] = []
    if (exam.is_regular_exam) opts.push({ value: 'REGULAR', label: 'Regular' })
    if (exam.is_supply_exam) opts.push({ value: 'SUPPLY', label: 'Supple' })
    if (exam.is_internal_exam) opts.push({ value: 'INTERNAL', label: 'Internal' })
    return opts.length > 0 ? opts : [{ value: 'ALL', label: 'All' }]
  }, [exams, examId])

  useEffect(() => {
    async function loadFilters() {
      setLoading(true)
      try {
        const data = await getSecureMarksFilters(employeeId).catch(() => [])
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
      setRegRows([])
      setSubjectRows([])
      if (!courseId || !academicYearId || !examId) return
      const data = await getSecureMarksRestFilters({
        courseId,
        academicYearId,
        examId,
        employeeId,
      }).catch(() => ({ restFilters: [], regulations: [] }))
      setRestFilters(Array.isArray(data.restFilters) ? data.restFilters : [])
      setRegRows(Array.isArray(data.regulations) ? data.regulations : [])
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
      if (!collegeId || !courseId || !courseGroupId || !courseYearId || !examId || !academicYearId || !regulationId) return
      const data = await getSecureMarksSubjects({
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
  }, [collegeId, courseId, courseGroupId, courseYearId, examId, academicYearId, regulationId, employeeId])

  useEffect(() => {
    if (subjectTypes[0]?.fk_subjecttype_catdet_id) setSubjectTypeId(Number(subjectTypes[0].fk_subjecttype_catdet_id))
  }, [subjectTypes])
  useEffect(() => {
    if (subjects[0]?.fk_subject_id) setSubjectId(Number(subjects[0].fk_subject_id))
  }, [subjects])
  useEffect(() => {
    if (examTypeOptions[0]?.value) setExamType(examTypeOptions[0].value)
  }, [examTypeOptions])
  useEffect(() => {
    const nextDate = String(subjects[0]?.exam_date ?? '').slice(0, 10)
    setExamDate(nextDate || '')
  }, [subjects])

  function updateMarks(target: AnyRow, marks: number) {
    const sid = Number(target.studentId ?? target.fk_student_id ?? 0)
    let parsed = Number(marks)
    if (!Number.isFinite(parsed) || parsed < 0) parsed = 0
    if (maxMarks > 0 && parsed > maxMarks) {
      parsed = maxMarks
      toastError(`Entered marks should not exceed ${maxMarks}.`)
    }
    setRows((prev) =>
      prev.map((r) => {
        const rsid = Number(r.studentId ?? r.fk_student_id ?? 0)
        if (sid > 0 ? rsid !== sid : String(r.hallticketNumber) !== String(target.hallticketNumber)) return r
        return { ...r, marks: parsed }
      }),
    )
  }

  async function onGetList() {
    if (!collegeId || !courseId || !examId || !courseGroupId || !courseYearId || !regulationId || !subjectId || !examDate) return
    setLoading(true)
    setHasFetched(true)
    setSaveUnlocked(false)
    try {
      const bundle = await getMarksEntryStudentsBundle({
        collegeId,
        courseId,
        examId,
        courseGroupId,
        courseYearId,
        regulationId,
        subjectId,
        labBatchId,
        examDate,
      }).catch(() => ({ students: [], internalEvaluators: [], externalEvaluators: [] }))
      setRows((Array.isArray(bundle.students) ? bundle.students : []).map((r) => ({ ...r, marks: Number(r.marks ?? 0) })))
      setInternalEvaluators(bundle.internalEvaluators ?? [])
      setExternalEvaluators(bundle.externalEvaluators ?? [])
    } finally {
      setLoading(false)
    }
  }

  // window.prompt() is suppressed by some browsers (the reported "Generate
  // code not working") — use a proper dialog instead.
  async function onGenerateSecretCode() {
    try {
      await generateMarksEntrySecretCode(userId)
      setSecretCodeInput('')
      setCodeDialogOpen(true)
    } catch (error) {
      toastError(error, 'Failed to generate secret code')
    }
  }

  async function onValidateSecretCode() {
    const plain = secretCodeInput.trim()
    if (!plain) return
    setValidatingCode(true)
    try {
      const encoded = btoa(plain)
      const valid = await validateMarksEntrySecretCode(userId, encoded)
      if (!valid) {
        toastError('Invalid secret code')
        setSaveUnlocked(false)
        return
      }
      setSaveUnlocked(true)
      setCodeDialogOpen(false)
      toastSuccess('Secret code validated')
    } catch (error) {
      toastError(error, 'Failed to validate secret code')
    } finally {
      setValidatingCode(false)
    }
  }

  async function onSave() {
    if (!saveUnlocked || rows.length === 0 || !collegeId || !courseId || !examId || !courseYearId || !subjectId || !regulationId) return
    setSaving(true)
    try {
      const payload = rows.map((row) => ({
        examStudentInternalMarkDTO:
          row.examTypeCode === 'Internal'
            ? {
                examDate,
                isActive: true,
                isPresent: Boolean(row.isPresent),
                isPublished: false,
                marks: Number(row.marks ?? 0),
                collegeId,
                studentId: Number(row.studentId ?? row.fk_student_id ?? 0),
                courseYearId,
                subjectId,
                examId,
                employeeId,
                examStdInternalMarkId: row.examStdInternalMarkId ?? row.exam_std_internal_mark_id ?? 0,
              }
            : null,
        examStudentDetailDTO: {
          ...row,
          marksEnteredEmpId: employeeId,
          courseId,
          regulationId,
          subjectTypeId,
          isExtenalpersonApprove: isExternalEvaluator,
          examEvaluatorProfileId: isExternalEvaluator ? Number(globalThis?.localStorage?.getItem('examEvaluatorProfileId') ?? 0) : null,
          credits: row.isPass ? Number(row.sub_credits ?? 0) : 0,
        },
      }))
      await saveInternalMarksEntry(payload)
      toastSuccess(isExternalEvaluator ? 'Marks approved successfully' : 'Marks saved successfully')
      await onGetList()
    } catch (error) {
      toastError(error, 'Failed to save marks')
    } finally {
      setSaving(false)
    }
  }

  const maxMarks = useMemo(() => {
    const first = rows.find((r) => Number(r.maxMarks ?? r.externalmarks ?? r.internalmarks ?? 0) > 0)
    return Number(first?.maxMarks ?? first?.externalmarks ?? first?.internalmarks ?? 0)
  }, [rows])

  const selectedExam = useMemo(() => exams.find((x) => Number(x.fk_exam_id) === Number(examId)), [exams, examId])
  const selectedCollege = useMemo(() => colleges.find((x) => Number(x.fk_college_id) === Number(collegeId)), [colleges, collegeId])
  const selectedCourse = useMemo(() => courses.find((x) => Number(x.fk_course_id) === Number(courseId)), [courses, courseId])
  const selectedGroup = useMemo(() => courseGroups.find((x) => Number(x.fk_course_group_id) === Number(courseGroupId)), [courseGroups, courseGroupId])
  const selectedYear = useMemo(() => courseYears.find((x) => Number(x.fk_course_year_id) === Number(courseYearId)), [courseYears, courseYearId])
  const selectedRegulation = useMemo(() => regulations.find((x) => Number(x.fk_regulation_id) === Number(regulationId)), [regulations, regulationId])
  const selectedSubject = useMemo(() => subjects.find((x) => Number(x.fk_subject_id) === Number(subjectId)), [subjects, subjectId])
  const selectedAcademicYear = useMemo(() => academicYears.find((x) => Number(x.fk_academic_year_id) === Number(academicYearId)), [academicYears, academicYearId])

  const columnDefs = useMemo<ColDef<AnyRow>[]>(() => {
    const toAttendanceText = (isPresent: unknown) => {
      if (isPresent === true) return 'Present'
      if (isPresent === false) return 'Absent'
      return 'Not Marked'
    }
    const toResultText = (isPass: unknown) => {
      if (isPass == null) return 'Not Posted'
      return isPass ? 'P' : 'F'
    }
    return [
      { headerName: 'SI No', width: 70, flex: 0, valueGetter: (p: any) => (p.node?.rowIndex ?? 0) + 1 },
      { field: 'hallticketNumber', headerName: 'Hallticket Number', minWidth: 140 },
      { field: 'firstName', headerName: 'Student', minWidth: 240, flex: 1 },
      {
        headerName: 'Attendance Status',
        minWidth: 140,
        valueGetter: (p: any) => toAttendanceText(p.data?.isPresent),
      },
      {
        headerName: 'Marks',
        minWidth: 120,
        cellRenderer: MarksInputRenderer,
        cellRendererParams: { maxMarks, onChange: updateMarks, readOnly: !saveUnlocked },
      },
      {
        headerName: 'Result',
        minWidth: 100,
        flex: 0,
        valueGetter: (p: any) => toResultText(p.data?.isPass),
      },
    ]
  }, [saveUnlocked, maxMarks])

  // While printing, replace the page with the marks sheet (AppShell @media
  // print rules hide the app chrome so only the sheet prints).
  if (printMode) return <>{printView}</>

  return (
    <PageContainer className="space-y-4">
      <PageHeader title="Secure Marks Entry" subtitle="Post examination secure marks flow" />

      <div className="app-card p-3">
        <div className="border-b border-border pb-3">
          <h2 className="app-card-title">Secure Marks Entry</h2>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-12 items-end">
          <div className="space-y-1 md:col-span-2"><Label>Course *</Label><Select value={courseId ? String(courseId) : undefined} onValueChange={(v) => setCourseId(Number(v))}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Course" /></SelectTrigger><SelectContent>{courses.map((x) => <SelectItem key={x.fk_course_id} value={String(x.fk_course_id)}>{x.course_code}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1 md:col-span-2"><Label>Exam Year *</Label><Select value={academicYearId ? String(academicYearId) : undefined} onValueChange={(v) => setAcademicYearId(Number(v))}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Exam Year" /></SelectTrigger><SelectContent>{academicYears.map((x) => <SelectItem key={x.fk_academic_year_id} value={String(x.fk_academic_year_id)}>{x.academic_year}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1 md:col-span-6"><Label>Exam *</Label><Select value={examId ? String(examId) : undefined} onValueChange={(v) => setExamId(Number(v))}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Exam" /></SelectTrigger><SelectContent>{exams.map((x) => <SelectItem key={x.fk_exam_id} value={String(x.fk_exam_id)}>{x.exam_name}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1 md:col-span-2"><Label>Exam Type *</Label><Select value={examType} onValueChange={setExamType}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Exam Type" /></SelectTrigger><SelectContent>{examTypeOptions.map((x) => <SelectItem key={x.value} value={x.value}>{x.label}</SelectItem>)}</SelectContent></Select></div>
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
          <div className="app-card overflow-hidden border border-[#c3d9ff]">
            <div className="flex items-start gap-4 p-3">
              <div className="flex h-20 w-24 items-center justify-center bg-[#c3d9ff] text-slate-700">
                <GraduationCap className="h-10 w-10" />
              </div>
              <div className="space-y-1 text-[13px]">
                <p className="text-slate-700">{selectedExam?.exam_name ?? '-'} {examDate ? <span className="text-blue-700">({examDate})</span> : null}</p>
                <p className="text-muted-foreground">/ {selectedCollege?.college_code ?? '-'} / {selectedCourse?.course_code ?? '-'} / {selectedGroup?.group_code ?? '-'} / {selectedYear?.course_year_code ?? '-'} / <span className="text-blue-700">({selectedAcademicYear?.academic_year ?? '-'})</span></p>
                <p className="font-semibold text-slate-800">{selectedSubject?.subject_name ?? '-'} ({selectedRegulation?.regulation_code ?? '-'}) - <span className="text-blue-700">{selectedSubject?.subject_type ?? '-'}</span></p>
              </div>
            </div>
          </div>

          <TableCard withHeaderBorder={false}>
            <div className="space-y-3">
              <DataTable
                rowData={rows}
                columnDefs={columnDefs}
                loading={loading}
                getRowId={(p) => String(p.data.studentId ?? p.data.fk_student_id ?? p.data.hallticketNumber ?? '')}
                pagination
                toolbar={{
                  search: true,
                  searchPlaceholder: 'Search…',
                  pdfDocumentTitle: 'Secure Exam Marks Entry',
                }}
                toolbarLeading={
                  <div className="text-[12px] text-slate-600 whitespace-nowrap shrink-0">
                    Max Marks : <span className="font-semibold">{maxMarks || '-'}</span>
                  </div>
                }
              />
              <div className="flex items-center justify-end gap-2">
                {!saveUnlocked && (
                  <Button className="h-8 text-[12px]" onClick={onGenerateSecretCode} disabled={rows.length === 0}>
                    Generate Secret Code
                  </Button>
                )}
                {saveUnlocked && (
                  <Button className="h-8 text-[12px]" onClick={onSave} disabled={saving || rows.length === 0}>
                    {saveButtonText}
                  </Button>
                )}
                {printButton}
              </div>
            </div>
          </TableCard>
        </div>
      )}

      {/* Secret-code validation (replaces the browser prompt) */}
      <Dialog open={codeDialogOpen} onOpenChange={(next) => { if (!next) setCodeDialogOpen(false) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-[hsl(var(--primary))]">
              Enter Secret Code
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-1 py-1">
            <Label htmlFor="secret-code">Secret code sent to you</Label>
            <Input
              id="secret-code"
              type="password"
              autoFocus
              value={secretCodeInput}
              onChange={(e) => setSecretCodeInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void onValidateSecretCode() }}
              placeholder="Enter secret code"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCodeDialogOpen(false)} disabled={validatingCode}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void onValidateSecretCode()} disabled={validatingCode || !secretCodeInput.trim()}>
              {validatingCode ? 'Validating…' : 'Validate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}

