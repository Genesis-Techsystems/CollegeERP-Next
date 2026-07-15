'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { GraduationCap } from 'lucide-react'
import { FilteredListPage } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select as CommonSelect } from '@/common/components/select'
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

function numFrom(row: AnyRow, keys: string[]): number {
  for (const key of keys) {
    const n = Number(row?.[key])
    if (Number.isFinite(n) && n > 0) return n
  }
  return 0
}

function strFrom(row: AnyRow, keys: string[]): string {
  for (const key of keys) {
    const v = String(row?.[key] ?? '').trim()
    if (v) return v
  }
  return ''
}

function dedupeBy(rows: AnyRow[], keys: string[]): AnyRow[] {
  const seen = new Set<number>()
  const out: AnyRow[] = []
  for (const row of rows) {
    const id = numFrom(row, keys)
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push(row)
  }
  return out
}

function asBool(v: unknown): boolean {
  return v === true || v === 1 || v === '1' || v === 'true'
}

/** Angular grade-memo / secure-marks exam option: name (from - to) + type badges. */
function formatExamLabel(row: AnyRow): string {
  const name = strFrom(row, ['exam_name', 'examName']) || 'Exam'
  const from = strFrom(row, ['from_date', 'fromDate']).slice(0, 10)
  const to = strFrom(row, ['to_date', 'toDate']).slice(0, 10)
  const range = from && to ? ` (${from} - ${to})` : ''
  const badges: string[] = []
  if (asBool(row.is_internal_exam ?? row.isInternalExam)) badges.push('Internal')
  if (asBool(row.is_regular_exam ?? row.isRegularExam)) badges.push('Regular')
  if (asBool(row.is_supply_exam ?? row.isSupplyExam)) badges.push('Supple')
  const badgeText = badges.length > 0 ? ` (${badges.join(', ')})` : ''
  return `${name}${range}${badgeText}`
}

function formatSubjectLabel(row: AnyRow): string {
  const name = strFrom(row, ['subject_name', 'subjectName'])
  const code = strFrom(row, ['subject_code', 'subjectCode'])
  const reg = strFrom(row, ['regulation_code', 'regulationCode'])
  const examType = strFrom(row, ['ttd_exam_type', 'ttdExamType', 'exam_type', 'examType', 'subject_type'])
  let label = name
  if (code) label += ` - ${code}`
  if (reg) label += ` (${reg})`
  if (examType) label += ` (${examType})`
  return label || code || 'Subject'
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
  const { user } = useSessionContext()
  // The approve/save action's acting identity must come from the authenticated
  // session (httpOnly iron-session), NOT client-writable localStorage — otherwise a
  // user could overwrite employeeId/userRole and approve as/for someone else.
  const employeeId = Number(user?.employeeId ?? globalThis?.localStorage?.getItem('employeeId') ?? 0)
  const userId = Number(user?.userId ?? globalThis?.localStorage?.getItem('userId') ?? 0)
  const userRole = String(user?.userRole ?? globalThis?.localStorage?.getItem('userRole') ?? '')
  const empNumber = String(globalThis?.localStorage?.getItem('empNumber') ?? '') // display-only; not on SessionUser
  const userName = String(user?.userName ?? globalThis?.localStorage?.getItem('userName') ?? '')

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

  const courses = useMemo(() => dedupeBy(allFilters, ['fk_course_id', 'courseId']), [allFilters])
  const academicYears = useMemo(
    () =>
      dedupeBy(
        allFilters.filter((x) => numFrom(x, ['fk_course_id', 'courseId']) === Number(courseId)),
        ['fk_academic_year_id', 'academicYearId'],
      ),
    [allFilters, courseId],
  )
  const exams = useMemo(
    () =>
      dedupeBy(
        allFilters.filter(
          (x) =>
            numFrom(x, ['fk_course_id', 'courseId']) === Number(courseId) &&
            numFrom(x, ['fk_academic_year_id', 'academicYearId']) === Number(academicYearId),
        ),
        ['fk_exam_id', 'examId'],
      ),
    [allFilters, courseId, academicYearId],
  )
  const colleges = useMemo(() => dedupeBy(restFilters, ['fk_college_id', 'collegeId']), [restFilters])
  const courseGroups = useMemo(
    () =>
      dedupeBy(
        restFilters.filter((x) => numFrom(x, ['fk_college_id', 'collegeId']) === Number(collegeId)),
        ['fk_course_group_id', 'courseGroupId'],
      ),
    [restFilters, collegeId],
  )
  const courseYears = useMemo(
    () =>
      dedupeBy(
        restFilters.filter(
          (x) =>
            numFrom(x, ['fk_college_id', 'collegeId']) === Number(collegeId) &&
            numFrom(x, ['fk_course_group_id', 'courseGroupId']) === Number(courseGroupId),
        ),
        ['fk_course_year_id', 'courseYearId'],
      ),
    [restFilters, collegeId, courseGroupId],
  )
  const regulations = useMemo(() => {
    const direct = dedupeBy(regRows, ['fk_regulation_id', 'regulationId'])
    if (direct.length > 0) return direct
    return dedupeBy(
      restFilters.filter((x) => numFrom(x, ['fk_regulation_id', 'regulationId']) > 0),
      ['fk_regulation_id', 'regulationId'],
    )
  }, [regRows, restFilters])
  const subjectTypes = useMemo(
    () =>
      dedupeBy(
        subjectRows.filter((x) => numFrom(x, ['fk_regulation_id', 'regulationId']) === Number(regulationId)),
        ['fk_subjecttype_catdet_id', 'subjectTypeId'],
      ),
    [subjectRows, regulationId],
  )
  const subjects = useMemo(
    () =>
      dedupeBy(
        subjectRows.filter(
          (x) =>
            numFrom(x, ['fk_regulation_id', 'regulationId']) === Number(regulationId) &&
            numFrom(x, ['fk_subjecttype_catdet_id', 'subjectTypeId']) === Number(subjectTypeId),
        ),
        ['fk_subject_id', 'subjectId'],
      ),
    [subjectRows, regulationId, subjectTypeId],
  )
  const labBatches = useMemo(
    () =>
      dedupeBy(
        subjectRows.filter(
          (x) =>
            numFrom(x, ['fk_subject_id', 'subjectId']) === Number(subjectId) &&
            numFrom(x, ['fk_exam_labbatch_id', 'examLabbatchId']) > 0,
        ),
        ['fk_exam_labbatch_id', 'examLabbatchId'],
      ),
    [subjectRows, subjectId],
  )

  const courseOptions = useMemo(
    () =>
      courses
        .map((x) => ({
          value: String(numFrom(x, ['fk_course_id', 'courseId'])),
          label: strFrom(x, ['course_code', 'courseCode']),
        }))
        .filter((o) => o.value !== '0' && o.label),
    [courses],
  )
  const yearOptions = useMemo(
    () =>
      academicYears
        .map((x) => ({
          value: String(numFrom(x, ['fk_academic_year_id', 'academicYearId'])),
          label: strFrom(x, ['academic_year', 'academicYear']),
        }))
        .filter((o) => o.value !== '0' && o.label),
    [academicYears],
  )
  const examOptions = useMemo(
    () =>
      exams
        .map((x) => ({
          value: String(numFrom(x, ['fk_exam_id', 'examId'])),
          label: formatExamLabel(x),
        }))
        .filter((o) => o.value !== '0'),
    [exams],
  )
  const collegeOptions = useMemo(
    () =>
      colleges
        .map((x) => ({
          value: String(numFrom(x, ['fk_college_id', 'collegeId'])),
          label: strFrom(x, ['college_code', 'collegeCode']),
        }))
        .filter((o) => o.value !== '0' && o.label),
    [colleges],
  )
  const groupOptions = useMemo(
    () =>
      courseGroups
        .map((x) => ({
          value: String(numFrom(x, ['fk_course_group_id', 'courseGroupId'])),
          label: strFrom(x, ['group_code', 'groupCode']),
        }))
        .filter((o) => o.value !== '0' && o.label),
    [courseGroups],
  )
  const courseYearOptions = useMemo(
    () =>
      courseYears
        .map((x) => ({
          value: String(numFrom(x, ['fk_course_year_id', 'courseYearId'])),
          label: strFrom(x, ['course_year_code', 'courseYearName', 'courseYearCode']),
        }))
        .filter((o) => o.value !== '0' && o.label),
    [courseYears],
  )
  const regulationOptions = useMemo(
    () =>
      regulations
        .map((x) => ({
          value: String(numFrom(x, ['fk_regulation_id', 'regulationId'])),
          label: strFrom(x, ['regulation_code', 'regulationCode']),
        }))
        .filter((o) => o.value !== '0' && o.label),
    [regulations],
  )
  const subjectTypeOptions = useMemo(
    () =>
      subjectTypes
        .map((x) => ({
          value: String(numFrom(x, ['fk_subjecttype_catdet_id', 'subjectTypeId'])),
          label: strFrom(x, ['subject_type', 'subjectType']),
        }))
        .filter((o) => o.value !== '0' && o.label),
    [subjectTypes],
  )
  const subjectOptions = useMemo(
    () =>
      subjects
        .map((x) => ({
          value: String(numFrom(x, ['fk_subject_id', 'subjectId'])),
          label: formatSubjectLabel(x),
        }))
        .filter((o) => o.value !== '0'),
    [subjects],
  )
  const labBatchOptions = useMemo(
    () => [
      { value: '0', label: 'All' },
      ...labBatches
        .map((x) => ({
          value: String(numFrom(x, ['fk_exam_labbatch_id', 'examLabbatchId'])),
          label: strFrom(x, ['labbatch_name', 'labBatchName', 'labbatchName']),
        }))
        .filter((o) => o.value !== '0' && o.label),
    ],
    [labBatches],
  )
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
    const first = courses[0]
    if (first) setCourseId(numFrom(first, ['fk_course_id', 'courseId']))
  }, [courses])
  useEffect(() => {
    const first = academicYears[0]
    if (first) setAcademicYearId(numFrom(first, ['fk_academic_year_id', 'academicYearId']))
  }, [academicYears])
  useEffect(() => {
    const first = exams[0]
    if (first) setExamId(numFrom(first, ['fk_exam_id', 'examId']))
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
    const first = colleges[0]
    if (first) setCollegeId(numFrom(first, ['fk_college_id', 'collegeId']))
  }, [colleges])
  useEffect(() => {
    const first = courseGroups[0]
    if (first) setCourseGroupId(numFrom(first, ['fk_course_group_id', 'courseGroupId']))
  }, [courseGroups])
  useEffect(() => {
    const first = courseYears[0]
    if (first) setCourseYearId(numFrom(first, ['fk_course_year_id', 'courseYearId']))
  }, [courseYears])
  useEffect(() => {
    const first = regulations[0]
    if (first) setRegulationId(numFrom(first, ['fk_regulation_id', 'regulationId']))
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
    const first = subjectTypes[0]
    if (first) setSubjectTypeId(numFrom(first, ['fk_subjecttype_catdet_id', 'subjectTypeId']))
  }, [subjectTypes])
  useEffect(() => {
    const first = subjects[0]
    if (first) setSubjectId(numFrom(first, ['fk_subject_id', 'subjectId']))
  }, [subjects])
  useEffect(() => {
    const nextDate = strFrom(subjects[0] ?? {}, ['exam_date', 'examDate']).slice(0, 10)
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

  const selectedExam = useMemo(
    () => exams.find((x) => numFrom(x, ['fk_exam_id', 'examId']) === Number(examId)),
    [exams, examId],
  )
  const selectedCollege = useMemo(
    () => colleges.find((x) => numFrom(x, ['fk_college_id', 'collegeId']) === Number(collegeId)),
    [colleges, collegeId],
  )
  const selectedCourse = useMemo(
    () => courses.find((x) => numFrom(x, ['fk_course_id', 'courseId']) === Number(courseId)),
    [courses, courseId],
  )
  const selectedGroup = useMemo(
    () => courseGroups.find((x) => numFrom(x, ['fk_course_group_id', 'courseGroupId']) === Number(courseGroupId)),
    [courseGroups, courseGroupId],
  )
  const selectedYear = useMemo(
    () => courseYears.find((x) => numFrom(x, ['fk_course_year_id', 'courseYearId']) === Number(courseYearId)),
    [courseYears, courseYearId],
  )
  const selectedRegulation = useMemo(
    () => regulations.find((x) => numFrom(x, ['fk_regulation_id', 'regulationId']) === Number(regulationId)),
    [regulations, regulationId],
  )
  const selectedSubject = useMemo(
    () => subjects.find((x) => numFrom(x, ['fk_subject_id', 'subjectId']) === Number(subjectId)),
    [subjects, subjectId],
  )
  const selectedAcademicYear = useMemo(
    () => academicYears.find((x) => numFrom(x, ['fk_academic_year_id', 'academicYearId']) === Number(academicYearId)),
    [academicYears, academicYearId],
  )

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
    <FilteredListPage
      title="Secure Marks Entry"
      notice={hasFetched ? (
        <div className="app-card overflow-hidden border border-[#c3d9ff]">
          <div className="flex items-start gap-4 p-3">
            <div className="flex h-20 w-24 items-center justify-center bg-[#c3d9ff] text-slate-700">
              <GraduationCap className="h-10 w-10" />
            </div>
            <div className="space-y-1 text-[13px]">
              <p className="text-slate-700">{strFrom(selectedExam ?? {}, ['exam_name', 'examName']) || '-'} {examDate ? <span className="text-blue-700">({examDate})</span> : null}</p>
              <p className="text-muted-foreground">/ {strFrom(selectedCollege ?? {}, ['college_code', 'collegeCode']) || '-'} / {strFrom(selectedCourse ?? {}, ['course_code', 'courseCode']) || '-'} / {strFrom(selectedGroup ?? {}, ['group_code', 'groupCode']) || '-'} / {strFrom(selectedYear ?? {}, ['course_year_code', 'courseYearName']) || '-'} / <span className="text-blue-700">({strFrom(selectedAcademicYear ?? {}, ['academic_year', 'academicYear']) || '-'})</span></p>
              <p className="font-semibold text-slate-800">{strFrom(selectedSubject ?? {}, ['subject_name', 'subjectName']) || '-'} ({strFrom(selectedRegulation ?? {}, ['regulation_code', 'regulationCode']) || '-'}) - <span className="text-blue-700">{strFrom(selectedSubject ?? {}, ['subject_type', 'subjectType']) || '-'}</span></p>
            </div>
          </div>
        </div>
      ) : null}
      filters={(
        <div className="grid grid-cols-1 gap-2 md:grid-cols-12 items-end">
          <div className="space-y-1 md:col-span-2">
            <Label>Course *</Label>
            <CommonSelect
              value={courseId ? String(courseId) : null}
              onChange={(v) => setCourseId(v ? Number(v) : null)}
              options={courseOptions}
              placeholder="Course"
              searchable
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Exam Year *</Label>
            <CommonSelect
              value={academicYearId ? String(academicYearId) : null}
              onChange={(v) => setAcademicYearId(v ? Number(v) : null)}
              options={yearOptions}
              placeholder="Exam Year"
              searchable
            />
          </div>
          <div className="space-y-1 md:col-span-8">
            <Label>Exam *</Label>
            <CommonSelect
              value={examId ? String(examId) : null}
              onChange={(v) => setExamId(v ? Number(v) : null)}
              options={examOptions}
              placeholder="Exam"
              searchable
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>College *</Label>
            <CommonSelect
              value={collegeId ? String(collegeId) : null}
              onChange={(v) => setCollegeId(v ? Number(v) : null)}
              options={collegeOptions}
              placeholder="College"
              searchable
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Course Group *</Label>
            <CommonSelect
              value={courseGroupId ? String(courseGroupId) : null}
              onChange={(v) => setCourseGroupId(v ? Number(v) : null)}
              options={groupOptions}
              placeholder="Course Group"
              searchable
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Course Year *</Label>
            <CommonSelect
              value={courseYearId ? String(courseYearId) : null}
              onChange={(v) => setCourseYearId(v ? Number(v) : null)}
              options={courseYearOptions}
              placeholder="Course Year"
              searchable
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Regulation</Label>
            <CommonSelect
              value={regulationId ? String(regulationId) : null}
              onChange={(v) => setRegulationId(v ? Number(v) : null)}
              options={regulationOptions}
              placeholder="Regulation"
              searchable
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Subject Type</Label>
            <CommonSelect
              value={subjectTypeId ? String(subjectTypeId) : null}
              onChange={(v) => setSubjectTypeId(v ? Number(v) : null)}
              options={subjectTypeOptions}
              placeholder="Subject Type"
              searchable
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Subject</Label>
            <CommonSelect
              value={subjectId ? String(subjectId) : null}
              onChange={(v) => setSubjectId(v ? Number(v) : null)}
              options={subjectOptions}
              placeholder="Subject"
              searchable
            />
          </div>
          {labBatches.length > 0 && (
            <div className="space-y-1 md:col-span-2">
              <Label>Lab Batch</Label>
              <CommonSelect
                value={String(labBatchId)}
                onChange={(v) => setLabBatchId(v ? Number(v) : 0)}
                options={labBatchOptions}
                placeholder="All"
                searchable
              />
            </div>
          )}
          <div className="space-y-1 md:col-span-2">
            <Label>Employee</Label>
            <Input className="h-8 text-[12px]" value={employeeDisplay} readOnly />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Exam Date</Label>
            <Input className="h-8 text-[12px]" type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Button className="h-8 text-[12px] w-full" onClick={onGetList} disabled={loading}>
              {loading ? 'Loading...' : 'Get List'}
            </Button>
          </div>
        </div>
      )}
      rowData={hasFetched ? rows : []}
      columnDefs={columnDefs}
      loading={loading}
      getRowId={(p) => String(p.data.studentId ?? p.data.fk_student_id ?? p.data.hallticketNumber ?? '')}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: 'Search…',
        pdfDocumentTitle: 'Secure Exam Marks Entry',
      }}
      toolbarLeading={(
        <div className="text-[12px] text-slate-600 whitespace-nowrap shrink-0">
          Max Marks : <span className="font-semibold">{maxMarks || '-'}</span>
        </div>
      )}
    >
      {hasFetched && (
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
      )}
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
    </FilteredListPage>
  )
}

