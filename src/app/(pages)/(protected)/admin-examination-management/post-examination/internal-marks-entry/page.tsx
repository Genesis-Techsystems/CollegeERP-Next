'use client'

import { useMemo, useState, useEffect } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { GraduationCap } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select as CommonSelect } from '@/common/components/select'
import { DataTable } from '@/common/components/table'
import { TableCard } from '@/common/components/table'
import { FilterCard } from '@/common/components/feedback'
import {
  getInternalMarksEntryFilters,
  getInternalMarksEntryRestFilters,
  getInternalMarksEntryStudents,
  getInternalMarksEntrySubjects,
  saveInternalMarksEntry,
} from '@/services/post-examination'
import { listExamMarksSetup, listGroupYearRegulationSubjects } from '@/services'
import { toastError, toastSuccess } from '@/lib/toast'
import { usePrintMode } from '@/lib/print'

type AnyRow = Record<string, any>
type MarkRow = Record<string, any>

interface MarksConfig {
  marks1Enabled: boolean
  marks2Enabled: boolean
  marks3Enabled: boolean
  marks1Max: number
  marks2Max: number
  marks3Max: number
  totalMax: number
}

const DEFAULT_MARKS_CONFIG: MarksConfig = {
  marks1Enabled: false,
  marks2Enabled: false,
  marks3Enabled: false,
  marks1Max: 0,
  marks2Max: 0,
  marks3Max: 0,
  totalMax: 0,
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

function pickNumber(row: AnyRow | null | undefined, keys: string[]): number {
  for (const key of keys) {
    const value = row?.[key]
    if (value == null || value === '') continue
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

function MarkInputRenderer(params: ICellRendererParams<MarkRow> & { field: string; maxMarks?: number; onChange: (row: MarkRow, field: string, value: number) => void; disabled?: boolean }) {
  const value = Number(params.data?.[params.field] ?? 0)
  const max = params.maxMarks && params.maxMarks > 0 ? params.maxMarks : undefined
  return (
    <Input
      type="number"
      min={0}
      max={max}
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
  const [checkUploadType] = useState(1)
  const { mode: printMode, triggerPrint } = usePrintMode<'marks-sheet'>()

  const [allFilters, setAllFilters] = useState<AnyRow[]>([])
  const [restFilters, setRestFilters] = useState<AnyRow[]>([])
  const [subjectRows, setSubjectRows] = useState<AnyRow[]>([])
  const [examMarksSetupRows, setExamMarksSetupRows] = useState<AnyRow[]>([])
  const [groupYrRegRows, setGroupYrRegRows] = useState<AnyRow[]>([])
  const [marksConfig, setMarksConfig] = useState<MarksConfig>(DEFAULT_MARKS_CONFIG)
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
  const selectedExamRow = useMemo(
    () => exams.find((x) => Number(x.fk_exam_id) === Number(examId)),
    [exams, examId],
  )
  const selectedSubjectRow = useMemo(
    () => subjects.find((x) => Number(x.fk_subject_id) === Number(subjectId)),
    [subjects, subjectId],
  )
  const isResultProcessingStarted = Number(selectedExamRow?.is_resultprocess_started ?? 0) === 1
  const courseOptions = useMemo(
    () =>
      courses.map((x) => ({
        value: String(x.fk_course_id),
        label: String(x.course_code ?? '-'),
      })),
    [courses],
  )
  const academicYearOptions = useMemo(
    () =>
      academicYears.map((x) => ({
        value: String(x.fk_academic_year_id),
        label: String(x.academic_year ?? '-'),
      })),
    [academicYears],
  )
  const examOptions = useMemo(
    () =>
      exams.map((x) => ({
        value: String(x.fk_exam_id),
        label: String(x.exam_name ?? '-'),
      })),
    [exams],
  )
  const collegeOptions = useMemo(
    () =>
      colleges.map((x) => ({
        value: String(x.fk_college_id),
        label: String(x.college_code ?? '-'),
      })),
    [colleges],
  )
  const courseGroupOptions = useMemo(
    () =>
      courseGroups.map((x) => ({
        value: String(x.fk_course_group_id),
        label: String(x.group_code ?? '-'),
      })),
    [courseGroups],
  )
  const courseYearOptions = useMemo(
    () =>
      courseYears.map((x) => ({
        value: String(x.fk_course_year_id),
        label: String(x.course_year_code ?? '-'),
      })),
    [courseYears],
  )
  const regulationOptions = useMemo(
    () =>
      regulations.map((x) => ({
        value: String(x.fk_regulation_id),
        label: String(x.regulation_code ?? '-'),
      })),
    [regulations],
  )
  const subjectTypeOptions = useMemo(
    () =>
      subjectTypes.map((x) => ({
        value: String(x.fk_subjecttype_catdet_id),
        label: String(x.subject_type ?? '-'),
      })),
    [subjectTypes],
  )
  const subjectOptions = useMemo(
    () =>
      subjects.map((x) => ({
        value: String(x.fk_subject_id),
        label: `${String(x.subject_name ?? '-') } (${String(x.subject_code ?? '-')})`,
      })),
    [subjects],
  )
  const labBatchOptions = useMemo(
    () => [
      { value: '0', label: 'All' },
      ...labBatches.map((x) => ({
        value: String(x.fk_exam_labbatch_id),
        label: String(x.labbatch_name ?? '-'),
      })),
    ],
    [labBatches],
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
    async function loadMarksSetup() {
      setExamMarksSetupRows([])
      setGroupYrRegRows([])
      setMarksConfig(DEFAULT_MARKS_CONFIG)
      if (!courseId || !courseGroupId || !courseYearId || !regulationId) return

      const [setupRows, groupRows] = await Promise.all([
        listExamMarksSetup(courseId, regulationId, true).catch(() => []),
        listGroupYearRegulationSubjects(courseGroupId, courseYearId, regulationId).catch(() => []),
      ])
      setExamMarksSetupRows(Array.isArray(setupRows) ? setupRows : [])
      setGroupYrRegRows(Array.isArray(groupRows) ? groupRows : [])
    }
    void loadMarksSetup()
  }, [courseId, courseGroupId, courseYearId, regulationId])

  useEffect(() => {
    if (!selectedSubjectRow) {
      setMarksConfig(DEFAULT_MARKS_CONFIG)
      return
    }

    const subId = Number(selectedSubjectRow.fk_subject_id ?? 0)
    const subTypeId = Number(selectedSubjectRow.fk_subjecttype_catdet_id ?? subjectTypeId ?? 0)
    const subCategoryId = Number(
      selectedSubjectRow.fk_subjectcategory_catdet_id ??
        selectedSubjectRow.subjectCategoryCatDetId ??
        0,
    )

    const examMark = groupYrRegRows.find((row) => {
      const rowSubId = Number(row.subjectId ?? row.fk_subject_id ?? row.subject_id ?? 0)
      return rowSubId === subId
    })

    const examSetup = examMarksSetupRows.find((row) => {
      const rowTypeId = Number(
        row.subjectTypeCatDetId ??
          row.subjecttypeCatdetId ??
          row.fk_subjecttype_catdet_id ??
          row.subjectTypeId ??
          0,
      )
      const rowCategoryId = Number(
        row.subjectCategoryCatDetId ??
          row.subjectcategoryCatdetId ??
          row.fk_subjectcategory_catdet_id ??
          0,
      )
      return rowTypeId === subTypeId || (subCategoryId > 0 && rowCategoryId === subCategoryId)
    })

    const marks1Max = pickNumber(examMark, ['marks1']) || pickNumber(examSetup, ['marks1'])
    const marks2Max = pickNumber(examMark, ['marks2']) || pickNumber(examSetup, ['marks2'])
    const marks3Max = pickNumber(examMark, ['marks3']) || pickNumber(examSetup, ['marks3'])
    const totalMax =
      pickNumber(examMark, ['internalmarks', 'internalMarks']) ||
      pickNumber(examSetup, ['internalMarks', 'internalmarks'])

    setMarksConfig({
      marks1Enabled: marks1Max > 0,
      marks2Enabled: marks2Max > 0,
      marks3Enabled: marks3Max > 0,
      marks1Max,
      marks2Max,
      marks3Max,
      totalMax,
    })
  }, [selectedSubjectRow, subjectTypeId, examMarksSetupRows, groupYrRegRows])

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
    let parsed = Number(value)
    if (!Number.isFinite(parsed) || parsed < 0) parsed = 0
    const fieldMax =
      field === 'internal_exam_marks'
        ? marksConfig.marks1Max
        : field === 'internal_assignment_marks'
          ? marksConfig.marks2Max
          : field === 'internal_quiz_marks'
            ? marksConfig.marks3Max
            : marksConfig.totalMax

    if (fieldMax > 0 && parsed > fieldMax) {
      const fieldName =
        field === 'internal_exam_marks'
          ? 'Exam'
          : field === 'internal_assignment_marks'
            ? 'Assignment'
            : field === 'internal_quiz_marks'
              ? 'Quiz'
              : 'Total Internal'
      toastError(`${fieldName} marks should not be greater than ${fieldMax}.`)
      return
    }

    setRows((prev) =>
      prev.map((r) => {
        const sid = Number(r.studentId ?? r.fk_student_id ?? 0)
        const hall = String(r.hallticketNumber ?? r.hallticket_number ?? '')
        const sameRow =
          (targetStudentId > 0 && sid === targetStudentId) ||
          (targetStudentId <= 0 && targetHallTicket.length > 0 && hall === targetHallTicket)
        if (!sameRow) return r
        const next = { ...r, [field]: parsed }
        if (field !== 'internal_total_marks') {
          const total =
            Number(next.internal_exam_marks ?? 0) +
            Number(next.internal_assignment_marks ?? 0) +
            Number(next.internal_quiz_marks ?? 0)
          if (marksConfig.totalMax > 0 && total > marksConfig.totalMax) {
            toastError(`Total internal marks should not be greater than ${marksConfig.totalMax}.`)
            return r
          }
          next.internal_total_marks = total
        } else if (marksConfig.totalMax > 0 && parsed > marksConfig.totalMax) {
          toastError(`Total internal marks should not be greater than ${marksConfig.totalMax}.`)
          return r
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
      const byStudent = new Map<string, AnyRow>()
      for (const item of Array.isArray(data) ? data : []) {
        const key =
          String(item.hallticketNumber ?? item.hallticket_number ?? '').trim() ||
          String(item.studentId ?? item.fk_student_id ?? Math.random())
        byStudent.set(key, item)
      }
      const uniqueRows = Array.from(byStudent.values())
      const normalized = uniqueRows.map((r) => ({
        ...r,
        internal_exam_marks: Number(r.internal_exam_marks ?? 0),
        internal_assignment_marks: Number(r.internal_assignment_marks ?? 0),
        internal_quiz_marks: Number(r.internal_quiz_marks ?? 0),
        internal_total_marks: Number(r.internal_total_marks ?? 0),
        isAttSatisfied: r.isAttSatisfied ?? true,
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

  const columnDefs = useMemo<ColDef<MarkRow>[]>(() => {
    const attendanceValue = (isPresent: unknown) => {
      if (isPresent === true) return 'Present'
      if (isPresent === false) return 'Absent'
      return 'Not Marked'
    }
    const columns: ColDef<MarkRow>[] = [
      { headerName: 'SI No', width: 70, flex: 0, valueGetter: (p: any) => (p.node?.rowIndex ?? 0) + 1 },
      { field: 'hallticketNumber', headerName: 'Hallticket Number', minWidth: 170 },
      { field: 'firstName', headerName: 'Student', minWidth: 180 },
      {
        headerName: 'Attendance Status',
        minWidth: 130,
        valueGetter: (p: any) => attendanceValue(p.data?.isPresent),
      },
    ]

    if (marksConfig.marks1Enabled) {
      columns.push({
        headerName: 'Exam',
        minWidth: 110,
        cellRenderer: MarkInputRenderer,
        cellRendererParams: {
          field: 'internal_exam_marks',
          maxMarks: marksConfig.marks1Max,
          onChange: updateMarks,
          disabled: isResultProcessingStarted,
        },
      })
    }

    if (marksConfig.marks2Enabled) {
      columns.push({
        headerName: 'Assignment',
        minWidth: 120,
        cellRenderer: MarkInputRenderer,
        cellRendererParams: {
          field: 'internal_assignment_marks',
          maxMarks: marksConfig.marks2Max,
          onChange: updateMarks,
          disabled: isResultProcessingStarted,
        },
      })
    }

    if (marksConfig.marks3Enabled) {
      columns.push({
        headerName: 'Quiz',
        minWidth: 110,
        cellRenderer: MarkInputRenderer,
        cellRendererParams: {
          field: 'internal_quiz_marks',
          maxMarks: marksConfig.marks3Max,
          onChange: updateMarks,
          disabled: isResultProcessingStarted,
        },
      })
    }

    const hasSplitMarks = marksConfig.marks1Enabled || marksConfig.marks2Enabled || marksConfig.marks3Enabled
    if (hasSplitMarks) {
      columns.push({
        headerName: 'Total Internal',
        minWidth: 130,
        valueGetter: (p: any) => Number(p.data?.internal_total_marks ?? 0),
      })
    } else {
      columns.push({
        headerName: 'Total Internal',
        minWidth: 130,
        cellRenderer: MarkInputRenderer,
        cellRendererParams: {
          field: 'internal_total_marks',
          maxMarks: marksConfig.totalMax || maxMarks,
          onChange: updateMarks,
          disabled: isResultProcessingStarted,
        },
      })
    }

    return columns
  }, [maxMarks, marksConfig, isResultProcessingStarted])

  // ── Print layout ─────────────────────────────────────────────────────────
  // Mirrors Angular's #printsection: banner placeholder, MARKS SHEET title,
  // college/course/subject info block, students table with conditional
  // Exam / Assignment / Quiz columns, and Faculty/HOD signature lines.
  if (printMode === 'marks-sheet') {
    const first = rows[0] ?? {}
    const examTypeLabel = String(first.examTypeCode ?? first.exam_type ?? 'Internal').toUpperCase()
    const sheetTitle = `${examTypeLabel} - MARKS SHEET`
    const isLab =
      Number(first.subjecttypeId ?? first.fk_subjecttype_catdet_id ?? 0) === 5 ||
      Number(first.subjecttypeId ?? first.fk_subjecttype_catdet_id ?? 0) === 6026
    const subjectTypeLabel = isLab ? 'LAB' : 'THEORY'
    const hasExamMarks = rows.some((r) => Number(r.internal_exam_marks ?? 0) > 0)
    const hasAssignmentMarks = rows.some((r) => Number(r.internal_assignment_marks ?? 0) > 0)
    const hasQuizMarks = rows.some((r) => Number(r.internal_quiz_marks ?? 0) > 0)
    return (
      <div
        className="text-black"
        style={{ fontFamily: 'Times New Roman, Times, serif', padding: '20px' }}
      >
        <h1 style={{ textAlign: 'center', fontSize: '18px', fontWeight: 600, margin: 0 }}>
          {selectedCollege?.college_name ?? selectedCollege?.college_code ?? ''}
        </h1>
        <hr style={{ border: 0, borderTop: '1px solid #000', margin: '12px 0' }} />
        <p style={{ textAlign: 'center', fontSize: '14px', fontWeight: 600, margin: 0 }}>
          {sheetTitle}
        </p>

        <div style={{ marginTop: '14px', fontSize: '12px', lineHeight: 1.6 }}>
          <div>
            <strong>College:</strong> {selectedCollege?.college_name ?? selectedCollege?.college_code ?? '-'}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <div>
              <strong>Course:</strong> {selectedCourse?.course_code ?? '-'} - {selectedGroup?.group_code ?? '-'}
            </div>
            <div>
              <strong>Academic Year:</strong> {selectedAcademicYear?.academic_year ?? '-'}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <div>
              <strong>Subject Code:</strong> {selectedSubject?.subject_code ?? '-'}
            </div>
            <div>
              <strong>Subject Title:</strong> {selectedSubject?.subject_name ?? '-'}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <div>
              <strong>Max Marks:</strong> {maxMarks || '-'}
            </div>
            <div>
              <strong>Subject Type:</strong> {subjectTypeLabel}
            </div>
          </div>
        </div>

        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            marginTop: '12px',
            fontSize: '12px',
          }}
        >
          <thead>
            <tr>
              <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>SI.NO</th>
              <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>USN</th>
              <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>Student Name</th>
              <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>Attendance</th>
              {hasExamMarks && (
                <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>Exam</th>
              )}
              {hasAssignmentMarks && (
                <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>Assignment</th>
              )}
              {hasQuizMarks && (
                <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>Quiz</th>
              )}
              <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>
                Total Internal Marks
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const attendance =
                r.isPresent === true ? 'Present' : r.isPresent === false ? 'Absent' : ''
              return (
                <tr key={`print-${r.hallticketNumber ?? r.studentId ?? i}`}>
                  <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>
                    {i + 1}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '4px' }}>
                    {r.hallticketNumber ?? r.hallticket_number ?? '-'}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '4px' }}>
                    {r.firstName ?? r.student_name ?? '-'}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '4px' }}>{attendance}</td>
                  {hasExamMarks && (
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>
                      {Number(r.internal_exam_marks ?? 0)}
                    </td>
                  )}
                  {hasAssignmentMarks && (
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>
                      {Number(r.internal_assignment_marks ?? 0)}
                    </td>
                  )}
                  {hasQuizMarks && (
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>
                      {Number(r.internal_quiz_marks ?? 0)}
                    </td>
                  )}
                  <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>
                    {Number(r.internal_total_marks ?? 0)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <p style={{ marginTop: '14px', fontSize: '12px', fontWeight: 500 }}>
          Date of Submission of IA Marks:
        </p>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '60px',
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          <div>Signature of the Faculty</div>
          <div>HOD</div>
        </div>
      </div>
    )
  }

  return (
    <PageContainer className="space-y-4">
      <h1 className="text-[18px] font-semibold leading-tight text-foreground">Internal Exam Marks Entry</h1>

      <FilterCard title={<span className="text-[14px] font-semibold leading-tight">Internal Exam Marks Entry</span>}>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-12 items-end">
          <div className="space-y-1 md:col-span-2"><Label>Course *</Label><CommonSelect value={courseId ? String(courseId) : null} onChange={(v) => setCourseId(v ? Number(v) : null)} options={courseOptions} placeholder="Course" searchable /></div>
          <div className="space-y-1 md:col-span-2"><Label>Academic Year *</Label><CommonSelect value={academicYearId ? String(academicYearId) : null} onChange={(v) => setAcademicYearId(v ? Number(v) : null)} options={academicYearOptions} placeholder="Academic Year" searchable /></div>
          <div className="space-y-1 md:col-span-8"><Label>Exam *</Label><CommonSelect value={examId ? String(examId) : null} onChange={(v) => setExamId(v ? Number(v) : null)} options={examOptions} placeholder="Exam" searchable /></div>
          <div className="space-y-1 md:col-span-2"><Label>College *</Label><CommonSelect value={collegeId ? String(collegeId) : null} onChange={(v) => setCollegeId(v ? Number(v) : null)} options={collegeOptions} placeholder="College" searchable /></div>
          <div className="space-y-1 md:col-span-2"><Label>Course Group *</Label><CommonSelect value={courseGroupId ? String(courseGroupId) : null} onChange={(v) => setCourseGroupId(v ? Number(v) : null)} options={courseGroupOptions} placeholder="Course Group" searchable /></div>
          <div className="space-y-1 md:col-span-2"><Label>Course Year *</Label><CommonSelect value={courseYearId ? String(courseYearId) : null} onChange={(v) => setCourseYearId(v ? Number(v) : null)} options={courseYearOptions} placeholder="Course Year" searchable /></div>
          <div className="space-y-1 md:col-span-2"><Label>Regulation</Label><CommonSelect value={regulationId ? String(regulationId) : null} onChange={(v) => setRegulationId(v ? Number(v) : null)} options={regulationOptions} placeholder="Regulation" searchable /></div>
          <div className="space-y-1 md:col-span-2"><Label>Subject Type</Label><CommonSelect value={subjectTypeId ? String(subjectTypeId) : null} onChange={(v) => setSubjectTypeId(v ? Number(v) : null)} options={subjectTypeOptions} placeholder="Subject Type" searchable /></div>
          <div className="space-y-1 md:col-span-2"><Label>Subject</Label><CommonSelect value={subjectId ? String(subjectId) : null} onChange={(v) => setSubjectId(v ? Number(v) : null)} options={subjectOptions} placeholder="Subject" searchable /></div>
          {labBatches.length > 0 && (
            <div className="space-y-1 md:col-span-2"><Label>Lab Batch</Label><CommonSelect value={String(labBatchId)} onChange={(v) => setLabBatchId(Number(v || 0))} options={labBatchOptions} placeholder="All" searchable /></div>
          )}
          <div className="space-y-1 md:col-span-2"><Label>Employee</Label><Input className="h-8 text-[12px]" value={employeeDisplay} readOnly /></div>
          <div className="space-y-1 md:col-span-2"><Label>Exam Date</Label><Input className="h-8 text-[12px]" type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} /></div>
          <div className="md:col-span-2"><Button className="h-8 text-[12px] w-full" onClick={onGetList} disabled={loading}>{loading ? 'Loading...' : 'Get List'}</Button></div>
        </div>
      </FilterCard>

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
                    <span className="text-muted-foreground">
                      ({String(selectedExam?.from_date ?? '').slice(0, 10)} - {String(selectedExam?.to_date ?? '').slice(0, 10)})
                    </span>{' '}
                    {examDate ? <span className="text-blue-700">({examDate})</span> : null}
                  </p>
                  <p className="text-muted-foreground">
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

          <TableCard withHeaderBorder={false}>
            <div className="space-y-3">
              <DataTable
                rowData={rows}
                columnDefs={columnDefs}
                loading={loading}
                getRowId={(p) => String(p.data.studentId ?? p.data.fk_student_id ?? p.data.hallticketNumber ?? p.data.hallticket_number ?? '')}
                pagination
                toolbar={{
                  search: true,
                  searchPlaceholder: 'Search…',
                  pdfDocumentTitle: 'Internal Marks Entry',
                }}
                toolbarLeading={
                  <div className="text-[12px] text-slate-600 whitespace-nowrap shrink-0">
                    Max Marks : <span className="font-semibold">{maxMarks || '-'}</span>
                  </div>
                }
              />
              <div className="flex items-center justify-end gap-2">
                <Button className="h-8 text-[12px]" onClick={onSaveMarks} disabled={saving || rows.length === 0 || isResultProcessingStarted}>{saving ? 'Saving...' : 'Save Marks'}</Button>
                <Button
                  className="h-8 text-[12px]"
                  variant="outline"
                  onClick={() => triggerPrint('marks-sheet')}
                  disabled={rows.length === 0}
                >
                  Print
                </Button>
              </div>
            </div>
          </TableCard>
        </div>
      )}
    </PageContainer>
  )
}

