'use client'

/**
 * Shared UI for Angular Exam Results Summary / Detailed Result / Backlog reports.
 * Routes: student-summary-result-report, student-result-details-report, student-backlog-report.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColDef } from 'ag-grid-community'
import { format, parseISO } from 'date-fns'
import { Printer, RefreshCw } from 'lucide-react'
import { FilteredListPage } from '@/components/layout'
import { Select, type SelectOption } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toastError } from '@/lib/toast'
import { toast } from 'sonner'
import {
  getExamStudentResultsReport,
  getUnivExamFiltersRegSup,
  getUnivExamRestInRegExamStd,
  listStudents,
  type AnyRow,
} from '@/services'

export type StudentResultsReportKind = 'summary' | 'details' | 'backlog' | 'credits'

type Row = AnyRow

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function txt(v: unknown): string {
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return ''
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function dedupeBy<T>(rows: T[], keyFn: (r: T) => number): T[] {
  const seen = new Set<number>()
  const out: T[] = []
  for (const r of rows) {
    const k = keyFn(r)
    if (!k || seen.has(k)) continue
    seen.add(k)
    out.push(r)
  }
  return out
}

function parseMaybeDate(v: unknown): string {
  const s = txt(v)
  if (!s) return ''
  try {
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return format(parseISO(s.slice(0, 10)), 'dd MMM, yyyy')
    return format(new Date(s), 'dd MMM, yyyy')
  } catch {
    return s
  }
}

function examMasterLabel(r: Row): string {
  const name = txt(r.exam_name ?? r.examName) || 'Exam'
  const from = parseMaybeDate(r.from_date ?? r.fromDate)
  const to = parseMaybeDate(r.to_date ?? r.toDate)
  const range = from && to ? ` (${from} - ${to})` : ''
  const tags: string[] = []
  if (r.is_internal_exam || r.isInternalExam) tags.push('(Internal)')
  if (r.is_regular_exam || r.isRegularExam) tags.push('(Regular)')
  if (r.is_supply_exam || r.isSupplyExam) tags.push('(Supple)')
  return `${name}${range}${tags.length ? ` ${tags.join('')}` : ''}`
}

function dash(v: unknown): string {
  const s = txt(v)
  if (!s || s === 'null' || s === 'undefined') return '—'
  return s
}

function printTable(title: string, headerHtml: string, columns: string[], bodyRows: string): void {
  const th = columns.map((c) => `<th>${escapeHtml(c)}</th>`).join('')
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
@page { size: A4 landscape; margin: 10mm; }
body { font: 11px/1.4 system-ui, -apple-system, 'Segoe UI', sans-serif; color: #111; margin: 0; }
h1 { font-size: 15px; margin: 0 0 6px; }
p { margin: 0 0 10px; }
table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #94a3b8; padding: 4px 6px; text-align: left; vertical-align: top; word-break: break-word; }
th { background: #c3d9ff; font-weight: 600; }
tr { break-inside: avoid; }
</style></head><body>
  <h1>${escapeHtml(title)}</h1>
  ${headerHtml}
  <table><thead><tr>${th}</tr></thead><tbody>${bodyRows}</tbody></table>
</body></html>`

  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;'
  document.body.appendChild(frame)
  const fdoc = frame.contentDocument
  const win = frame.contentWindow
  if (!fdoc || !win) {
    frame.remove()
    return
  }
  fdoc.open()
  fdoc.write(html)
  fdoc.close()
  win.addEventListener('afterprint', () => frame.remove())
  setTimeout(() => {
    win.focus()
    win.print()
  }, 50)
}

const TITLES: Record<StudentResultsReportKind, string> = {
  summary: 'Student Summary Result Report',
  details: 'Student Result Details Report',
  backlog: 'Student Backlog Report',
  credits: 'Student Credits Report',
}

const MODE_LABELS: Record<StudentResultsReportKind, { course: string; student: string }> = {
  summary: { course: 'Summary By Course', student: 'Summary By Student' },
  details: { course: 'Detailed Result By Course', student: 'Detailed Result By Student' },
  backlog: { course: 'Backlogs By Course', student: 'Backlogs By Student' },
  credits: { course: 'Credits By Course', student: 'Credits By Student' },
}

const PASS_OPTIONS: SelectOption[] = [
  { value: '-1', label: 'All' },
  { value: '1', label: 'Pass' },
  { value: '0', label: 'Fail' },
]

function summaryCols(): ColDef<Row>[] {
  return [
    {
      headerName: 'S.No',
      valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
      width: 70,
      flex: 0,
    },
    {
      headerName: 'Student',
      minWidth: 180,
      flex: 1,
      valueGetter: (p) => {
        const name = txt(p.data?.student_name ?? p.data?.studentName)
        const ht = txt(p.data?.hallticket_no ?? p.data?.hallticketNo)
        if (name && ht) return `${name} (${ht})`
        return name || ht || '—'
      },
    },
    {
      headerName: 'Course Details',
      minWidth: 140,
      flex: 0,
      valueGetter: (p) => {
        const a = txt(p.data?.college_code ?? p.data?.collegeCode)
        const b = txt(p.data?.group_code ?? p.data?.groupCode)
        if (a && b) return `${a} / ${b}`
        return a || b || '—'
      },
    },
    {
      headerName: 'Total Internal Marks',
      minWidth: 130,
      flex: 0,
      valueGetter: (p) => dash(p.data?.total_internal_marks),
    },
    {
      headerName: 'Total External Marks',
      minWidth: 130,
      flex: 0,
      valueGetter: (p) => dash(p.data?.total_external_marks),
    },
    {
      headerName: 'Total Pass Subjects',
      minWidth: 120,
      flex: 0,
      valueGetter: (p) => dash(p.data?.total_pass_subjects),
    },
    {
      headerName: 'Total Fail Subjects',
      minWidth: 120,
      flex: 0,
      valueGetter: (p) => dash(p.data?.total_fail_subjects),
    },
    {
      headerName: 'Total Credits',
      minWidth: 110,
      flex: 0,
      valueGetter: (p) => dash(p.data?.total_credits),
    },
  ]
}

function detailsCols(): ColDef<Row>[] {
  return [
    {
      headerName: 'S.No',
      valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
      width: 70,
      flex: 0,
    },
    {
      headerName: 'HallTicket No.',
      minWidth: 120,
      flex: 0,
      valueGetter: (p) => dash(p.data?.hallticket_no ?? p.data?.hallticketNo),
    },
    {
      headerName: 'Course Details',
      minWidth: 160,
      flex: 1,
      valueGetter: (p) => dash(p.data?.course_details ?? p.data?.college_code),
    },
    {
      headerName: 'Exam',
      minWidth: 140,
      flex: 1,
      valueGetter: (p) => dash(p.data?.exam_name ?? p.data?.examName),
    },
    {
      headerName: 'Exam Type',
      minWidth: 100,
      flex: 0,
      valueGetter: (p) => dash(p.data?.examtype ?? p.data?.exam_type),
    },
    {
      headerName: 'Subject',
      minWidth: 160,
      flex: 1,
      valueGetter: (p) => dash(p.data?.subject_name ?? p.data?.subjectName),
    },
    {
      headerName: 'Internal Marks',
      minWidth: 110,
      flex: 0,
      valueGetter: (p) => dash(p.data?.internal_marks),
    },
    {
      headerName: 'External Marks',
      minWidth: 110,
      flex: 0,
      valueGetter: (p) => dash(p.data?.external_marks),
    },
    {
      headerName: 'Total Marks',
      minWidth: 100,
      flex: 0,
      valueGetter: (p) => dash(p.data?.Total ?? p.data?.total_marks),
    },
    {
      headerName: 'Grade',
      minWidth: 80,
      flex: 0,
      valueGetter: (p) => dash(p.data?.grade),
    },
    {
      headerName: 'Grade Points',
      minWidth: 100,
      flex: 0,
      valueGetter: (p) => dash(p.data?.grade_points),
    },
    {
      headerName: 'Result',
      minWidth: 90,
      flex: 0,
      valueGetter: (p) => dash(p.data?.result),
    },
    {
      headerName: 'Credits',
      minWidth: 90,
      flex: 0,
      valueGetter: (p) => dash(p.data?.credits),
    },
  ]
}

function normalizeDetailsRows(list: Row[]): Row[] {
  return list.map((r) => {
    const internal = Number(r.internal_marks)
    const external = Number(r.external_marks)
    const total =
      Number.isFinite(internal) && Number.isFinite(external) ? internal + external : r.Total
    const courseDetails = [
      txt(r.college_code),
      txt(r.course_code),
      txt(r.regulation_code),
      txt(r.group_code),
      txt(r.course_year_code),
    ]
      .filter(Boolean)
      .join(' / ')
    return {
      ...r,
      internal_marks: r.internal_marks == null ? '—' : r.internal_marks,
      external_marks: r.external_marks == null ? '—' : r.external_marks,
      grade: r.grade == null ? '—' : r.grade,
      grade_points: r.grade_points == null ? '—' : r.grade_points,
      Total: total ?? '—',
      course_details: courseDetails || txt(r.college_code),
    }
  })
}

export function ExamStudentResultsReportPage({ kind }: { kind: StudentResultsReportKind }) {
  const title = TITLES[kind]
  const modeLabels = MODE_LABELS[kind]

  const [mode, setMode] = useState<'course' | 'student'>('course')
  const [loading, setLoading] = useState(false)
  const [loadingFilters, setLoadingFilters] = useState(false)
  const [searchingStudent, setSearchingStudent] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)
  const [employeeId, setEmployeeId] = useState(0)

  const [baseRows, setBaseRows] = useState<Row[]>([])
  const [restRows, setRestRows] = useState<Row[]>([])
  const [regulationRows, setRegulationRows] = useState<Row[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [studentOptions, setStudentOptions] = useState<SelectOption[]>([])

  const [courseId, setCourseId] = useState('')
  const [academicYearId, setAcademicYearId] = useState('')
  const [examId, setExamId] = useState('')
  const [collegeId, setCollegeId] = useState('')
  const [courseGroupId, setCourseGroupId] = useState('')
  const [courseYearId, setCourseYearId] = useState('')
  const [regulationId, setRegulationId] = useState('0')
  const [studentId, setStudentId] = useState('')
  const [isPass, setIsPass] = useState('-1')
  const [backlogCount, setBacklogCount] = useState('0')
  const [belowCredits, setBelowCredits] = useState('0')
  const [filterSummary, setFilterSummary] = useState('')

  useEffect(() => {
    setEmployeeId(Number(globalThis?.localStorage?.getItem('employeeId') ?? 0))
  }, [])

  useEffect(() => {
    async function init() {
      if (!employeeId) return
      setLoadingFilters(true)
      try {
        const filters = await getUnivExamFiltersRegSup(employeeId)
        const list = Array.isArray(filters) ? filters : []
        const univ = list.filter((r) => txt(r.flag) === 'univ_exam_filters').length
          ? list.filter((r) => txt(r.flag) === 'univ_exam_filters' || num(r.fk_course_id) > 0)
          : list
        setBaseRows(univ)
        const courses = dedupeBy(univ, (r) => num(r.fk_course_id))
        if (courses[0] && mode === 'course') setCourseId(String(num(courses[0].fk_course_id)))
      } catch (e) {
        toastError(e, 'Failed to load filters')
      } finally {
        setLoadingFilters(false)
      }
    }
    void init()
  }, [employeeId])

  const courses = useMemo(() => dedupeBy(baseRows, (r) => num(r.fk_course_id)), [baseRows])

  const academicYears = useMemo(
    () =>
      dedupeBy(
        baseRows.filter((r) => !courseId || num(r.fk_course_id) === Number(courseId)),
        (r) => num(r.fk_academic_year_id),
      ),
    [baseRows, courseId],
  )

  const exams = useMemo(() => {
    if (mode === 'student') {
      return dedupeBy(baseRows, (r) => num(r.fk_exam_id))
    }
    return dedupeBy(
      baseRows.filter(
        (r) =>
          (!courseId || num(r.fk_course_id) === Number(courseId)) &&
          (!academicYearId || num(r.fk_academic_year_id) === Number(academicYearId)),
      ),
      (r) => num(r.fk_exam_id),
    )
  }, [baseRows, courseId, academicYearId, mode])

  const colleges = useMemo(() => dedupeBy(restRows, (r) => num(r.fk_college_id)), [restRows])

  const courseGroups = useMemo(() => {
    const source = restRows.filter(
      (r) => !collegeId || collegeId === '0' || num(r.fk_college_id) === Number(collegeId),
    )
    return dedupeBy(source, (r) => num(r.fk_course_group_id))
  }, [restRows, collegeId])

  const courseYears = useMemo(() => {
    const source = restRows.filter(
      (r) =>
        (!collegeId || collegeId === '0' || num(r.fk_college_id) === Number(collegeId)) &&
        (!courseGroupId || courseGroupId === '0' || num(r.fk_course_group_id) === Number(courseGroupId)),
    )
    return dedupeBy(source, (r) => num(r.fk_course_year_id))
  }, [restRows, collegeId, courseGroupId])

  const regulations = useMemo(
    () => dedupeBy([...regulationRows, ...restRows], (r) => num(r.fk_regulation_id ?? r.regulationId)),
    [regulationRows, restRows],
  )

  useEffect(() => {
    if (mode !== 'course' || !courseId || academicYears.length === 0) return
    const ok = academicYears.some((r) => num(r.fk_academic_year_id) === Number(academicYearId))
    if (!ok) setAcademicYearId(String(num(academicYears[0].fk_academic_year_id)))
  }, [mode, courseId, academicYears, academicYearId])

  useEffect(() => {
    if (!academicYearId || exams.length === 0) return
    const ok = exams.some((r) => num(r.fk_exam_id) === Number(examId))
    if (!ok) setExamId(String(num(exams[0].fk_exam_id)))
  }, [academicYearId, exams, examId])

  useEffect(() => {
    async function loadRest() {
      if (!courseId || !academicYearId || !examId || !employeeId) {
        setRestRows([])
        setRegulationRows([])
        return
      }
      setLoadingFilters(true)
      try {
        const bundle = await getUnivExamRestInRegExamStd({
          courseId: Number(courseId),
          examId: Number(examId),
          academicYearId: Number(academicYearId),
          employeeId,
        })
        setRestRows(Array.isArray(bundle.restFilters) ? bundle.restFilters : [])
        setRegulationRows(Array.isArray(bundle.regulations) ? bundle.regulations : [])
        if (mode === 'course') {
          setCollegeId('')
          setCourseGroupId('')
          setCourseYearId('')
          setRegulationId('0')
        }
        setRows([])
        setHasFetched(false)
        setFilterSummary('')
      } catch (e) {
        toastError(e, 'Failed to load college / group filters')
        setRestRows([])
        setRegulationRows([])
      } finally {
        setLoadingFilters(false)
      }
    }
    void loadRest()
  }, [courseId, academicYearId, examId, employeeId, mode])

  const allowsAllCascade = kind === 'backlog' || kind === 'details' || kind === 'credits'

  useEffect(() => {
    if (mode !== 'course' || !colleges.length) return
    // "All" uses value "0" for credits/details/backlog — do not overwrite it
    if (allowsAllCascade && collegeId === '0') return
    const ok = colleges.some((r) => num(r.fk_college_id) === Number(collegeId))
    if (!ok) setCollegeId(String(num(colleges[0].fk_college_id)))
  }, [mode, colleges, collegeId, allowsAllCascade])

  useEffect(() => {
    if (mode !== 'course' || !courseGroups.length) return
    if (allowsAllCascade && courseGroupId === '0') return
    const ok = courseGroups.some((r) => num(r.fk_course_group_id) === Number(courseGroupId))
    if (!ok) {
      setCourseGroupId(String(num(courseGroups[0].fk_course_group_id)))
      setCourseYearId(allowsAllCascade ? '0' : '')
    }
  }, [mode, courseGroups, courseGroupId, allowsAllCascade])

  useEffect(() => {
    if (mode !== 'course' || !courseYears.length) return
    if (allowsAllCascade && courseYearId === '0') return
    const ok = courseYears.some((r) => num(r.fk_course_year_id) === Number(courseYearId))
    if (!ok) setCourseYearId(String(num(courseYears[0].fk_course_year_id)))
  }, [mode, courseYears, courseYearId, allowsAllCascade])

  function switchMode(next: 'course' | 'student') {
    setMode(next)
    setRows([])
    setHasFetched(false)
    setFilterSummary('')
    setStudentId('')
    setStudentOptions([])
    if (next === 'course') {
      const first = courses[0]
      if (first) setCourseId(String(num(first.fk_course_id)))
    } else {
      setCourseId('')
      setAcademicYearId('')
      setExamId('')
      setCollegeId('')
      setCourseGroupId('')
      setCourseYearId('')
      setRegulationId('0')
    }
  }

  function resetFilters() {
    setExamId('')
    setAcademicYearId('')
    setCourseGroupId('')
    setCourseYearId('')
    setRegulationId('0')
    setCollegeId('')
    setStudentId('')
    setStudentOptions([])
    setIsPass('-1')
    setBacklogCount('0')
    setBelowCredits('0')
    setRows([])
    setHasFetched(false)
    setFilterSummary('')
    if (mode === 'course') {
      const first = courses[0]
      if (first) setCourseId(String(num(first.fk_course_id)))
    } else {
      setCourseId('')
    }
  }

  async function onSearchStudent(term: string) {
    const q = term.trim()
    if (q.length < 4) {
      setStudentOptions([])
      return
    }
    setSearchingStudent(true)
    try {
      const list = await listStudents(q)
      setStudentOptions(
        (Array.isArray(list) ? list : [])
          .map((r) => {
            const id = num(r.studentId ?? r.student_id)
            const roll = txt(r.rollNumber ?? r.roll_number ?? r.hallticketNo)
            const name = txt(r.firstName ?? r.first_name ?? r.studentName)
            return {
              value: String(id),
              label: name ? `${roll} (${name})` : roll || String(id),
            }
          })
          .filter((o) => o.value !== '0'),
      )
    } catch {
      setStudentOptions([])
    } finally {
      setSearchingStudent(false)
    }
  }

  const courseOptions: SelectOption[] = useMemo(
    () =>
      courses.map((r) => ({
        value: String(num(r.fk_course_id)),
        label: txt(r.course_code ?? r.courseCode) || String(num(r.fk_course_id)),
      })),
    [courses],
  )
  const academicYearOptions: SelectOption[] = useMemo(
    () =>
      academicYears.map((r) => ({
        value: String(num(r.fk_academic_year_id)),
        label: txt(r.academic_year ?? r.academicYear) || String(num(r.fk_academic_year_id)),
      })),
    [academicYears],
  )
  const examOptions: SelectOption[] = useMemo(
    () =>
      exams.map((r) => ({
        value: String(num(r.fk_exam_id)),
        label: examMasterLabel(r),
      })),
    [exams],
  )
  const collegeOptions: SelectOption[] = useMemo(() => {
    const opts = colleges.map((r) => ({
      value: String(num(r.fk_college_id)),
      label: txt(r.college_code ?? r.collegeCode) || String(num(r.fk_college_id)),
    }))
    return kind === 'backlog' || kind === 'details' || kind === 'credits'
      ? [{ value: '0', label: 'All' }, ...opts]
      : opts
  }, [colleges, kind])
  const courseGroupOptions: SelectOption[] = useMemo(() => {
    const opts = courseGroups.map((r) => ({
      value: String(num(r.fk_course_group_id)),
      label: txt(r.group_code ?? r.groupCode) || String(num(r.fk_course_group_id)),
    }))
    return kind === 'details' || kind === 'backlog' || kind === 'credits'
      ? [{ value: '0', label: 'All' }, ...opts]
      : opts
  }, [courseGroups, kind])
  const courseYearOptions: SelectOption[] = useMemo(() => {
    const opts = courseYears.map((r) => ({
      value: String(num(r.fk_course_year_id)),
      label:
        txt(r.course_year_code ?? r.courseYearCode ?? r.course_year_name) ||
        String(num(r.fk_course_year_id)),
    }))
    return kind === 'details' || kind === 'backlog' || kind === 'credits'
      ? [{ value: '0', label: 'All' }, ...opts]
      : opts
  }, [courseYears, kind])
  const regulationOptions: SelectOption[] = useMemo(
    () => [
      { value: '0', label: 'All' },
      ...regulations.map((r) => ({
        value: String(num(r.fk_regulation_id ?? r.regulationId)),
        label:
          txt(r.regulation_code ?? r.regulationCode ?? r.regulation_name) ||
          String(num(r.fk_regulation_id ?? r.regulationId)),
      })),
    ],
    [regulations],
  )

  const columnDefs = useMemo<ColDef<Row>[]>(
    () => (kind === 'details' ? detailsCols() : summaryCols()),
    [kind],
  )

  const getRowId = useCallback(
    (p: { data?: Row; node?: { rowIndex?: number | null } }) => {
      const d = p.data
      if (!d) return ''
      return `row-${p.node?.rowIndex ?? 0}-${txt(d.hallticket_no)}-${txt(d.student_name)}-${txt(d.subject_name)}-${txt(d.exam_name)}`
    },
    [],
  )

  function buildSummary(): string {
    const college = colleges.find((r) => num(r.fk_college_id) === Number(collegeId))
    const course = courses.find((r) => num(r.fk_course_id) === Number(courseId))
    const year = academicYears.find((r) => num(r.fk_academic_year_id) === Number(academicYearId))
    const group = courseGroups.find((r) => num(r.fk_course_group_id) === Number(courseGroupId))
    const cy = courseYears.find((r) => num(r.fk_course_year_id) === Number(courseYearId))
    const exam = exams.find((r) => num(r.fk_exam_id) === Number(examId))
    const reg = regulations.find((r) => num(r.fk_regulation_id ?? r.regulationId) === Number(regulationId))
    return [
      txt(college?.college_code ?? college?.collegeCode),
      txt(course?.course_code ?? course?.courseCode),
      txt(year?.academic_year ?? year?.academicYear),
      regulationId !== '0' ? txt(reg?.regulation_code ?? reg?.regulationCode) : '',
      txt(group?.group_code ?? group?.groupCode),
      txt(cy?.course_year_name ?? cy?.course_year_code),
      txt(exam?.exam_name ?? exam?.examName),
    ]
      .filter(Boolean)
      .join(' / ')
  }

  async function onGetList() {
    if (mode === 'course') {
      if (!courseId || !academicYearId || !examId) {
        toast.info('Please Select Valid Filters')
        return
      }
      if (kind === 'summary' && (!collegeId || !courseGroupId || !courseYearId)) {
        toast.info('Please Select Valid Filters')
        return
      }
    } else if (!studentId || !examId) {
      toast.info('Please select Student and Exam Master')
      return
    }

    setLoading(true)
    setHasFetched(true)
    try {
      const flag = kind === 'details' ? 'exam_std_result_detail' : 'std_summary'
      const list = await getExamStudentResultsReport({
        flag,
        examId: Number(examId),
        courseId: Number(courseId || 0),
        courseGroupId: Number(courseGroupId || 0),
        courseYearId: Number(courseYearId || 0),
        collegeId: Number(collegeId || 0),
        studentId: Number(studentId || 0),
        regulationId: Number(regulationId || 0),
        isPass: kind === 'backlog' || kind === 'credits' ? -1 : Number(isPass),
        aboveFailSubjects: kind === 'backlog' ? Number(backlogCount || 0) : -1,
        belowCredits: kind === 'credits' ? Number(belowCredits || 0) : -1,
      })
      const normalized = kind === 'details' ? normalizeDetailsRows(list) : list
      setRows(Array.isArray(normalized) ? normalized : [])
      setFilterSummary(normalized?.length ? buildSummary() : '')
      if (!normalized?.length) toast.info('No Records Found.')
    } catch (e) {
      toastError(e, 'Failed to load report')
      setRows([])
      setFilterSummary('')
    } finally {
      setLoading(false)
    }
  }

  function handlePrintReport() {
    if (!rows.length) {
      toast.info('No Records Found.')
      return
    }
    if (kind === 'details') {
      const body = rows
        .map(
          (r, i) => `<tr>
          <td>${i + 1}</td>
          <td>${escapeHtml(dash(r.hallticket_no))}</td>
          <td>${escapeHtml(dash(r.course_details ?? r.college_code))}</td>
          <td>${escapeHtml(dash(r.exam_name))}</td>
          <td>${escapeHtml(dash(r.examtype ?? r.exam_type))}</td>
          <td>${escapeHtml(dash(r.subject_name))}</td>
          <td>${escapeHtml(dash(r.internal_marks))}</td>
          <td>${escapeHtml(dash(r.external_marks))}</td>
          <td>${escapeHtml(dash(r.Total))}</td>
          <td>${escapeHtml(dash(r.grade))}</td>
          <td>${escapeHtml(dash(r.grade_points))}</td>
          <td>${escapeHtml(dash(r.result))}</td>
          <td>${escapeHtml(dash(r.credits))}</td>
        </tr>`,
        )
        .join('')
      printTable(
        title,
        filterSummary ? `<p>${escapeHtml(filterSummary)}</p>` : '',
        [
          'S.No',
          'HallTicket No.',
          'Course Details',
          'Exam',
          'Exam Type',
          'Subject',
          'Internal',
          'External',
          'Total',
          'Grade',
          'Points',
          'Result',
          'Credits',
        ],
        body,
      )
      return
    }
    const body = rows
      .map((r, i) => {
        const name = txt(r.student_name)
        const ht = txt(r.hallticket_no)
        const student = name && ht ? `${name} (${ht})` : name || ht
        const course = [txt(r.college_code), txt(r.group_code)].filter(Boolean).join(' / ')
        return `<tr>
          <td>${i + 1}</td>
          <td>${escapeHtml(student || '—')}</td>
          <td>${escapeHtml(course || '—')}</td>
          <td>${escapeHtml(dash(r.total_internal_marks))}</td>
          <td>${escapeHtml(dash(r.total_external_marks))}</td>
          <td>${escapeHtml(dash(r.total_pass_subjects))}</td>
          <td>${escapeHtml(dash(r.total_fail_subjects))}</td>
          <td>${escapeHtml(dash(r.total_credits))}</td>
        </tr>`
      })
      .join('')
    printTable(
      title,
      filterSummary ? `<p>${escapeHtml(filterSummary)}</p>` : '',
      [
        'S.No',
        'Student',
        'Course Details',
        'Total Internal Marks',
        'Total External Marks',
        'Total Pass Subjects',
        'Total Fail Subjects',
        'Total Credits',
      ],
      body,
    )
  }

  return (
    <FilteredListPage
      title={title}
      filters={(
        <>
          <div className="mb-2 flex flex-wrap items-center gap-4 text-[12px]">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name={`${kind}-mode`}
                checked={mode === 'course'}
                onChange={() => switchMode('course')}
              />
              {modeLabels.course}
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name={`${kind}-mode`}
                checked={mode === 'student'}
                onChange={() => switchMode('student')}
              />
              {modeLabels.student}
            </label>
          </div>

          <div className="grid grid-cols-1 items-end gap-2 md:grid-cols-12">
            {mode === 'course' ? (
              <>
                <div className="space-y-1 md:col-span-2">
                  <Label>Course *</Label>
                  <Select
                    value={courseId || null}
                    onChange={(v) => {
                      setCourseId(v ?? '')
                      setAcademicYearId('')
                      setExamId('')
                      setCollegeId('')
                    }}
                    options={courseOptions}
                    placeholder="Course"
                    isLoading={loadingFilters}
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label>Exam Year *</Label>
                  <Select
                    value={academicYearId || null}
                    onChange={(v) => {
                      setAcademicYearId(v ?? '')
                      setExamId('')
                      setCollegeId('')
                    }}
                    options={academicYearOptions}
                    placeholder="Exam Year"
                    disabled={!courseId}
                  />
                </div>
              </>
            ) : (
              <div className="space-y-1 md:col-span-3">
                <Label>Student *</Label>
                <Select
                  value={studentId || null}
                  onChange={(v) => {
                    setStudentId(v ?? '')
                    setRows([])
                    setHasFetched(false)
                  }}
                  options={studentOptions}
                  placeholder="Search student…"
                  searchable
                  clearable
                  onSearch={onSearchStudent}
                  isLoading={searchingStudent}
                />
              </div>
            )}

            <div className={`space-y-1 ${mode === 'course' ? 'md:col-span-5' : 'md:col-span-6'}`}>
              <Label>Exam Master *</Label>
              <Select
                value={examId || null}
                onChange={(v) => setExamId(v ?? '')}
                options={examOptions}
                placeholder="Exam Master"
                searchable={examOptions.length > 6}
                wrapOptionLabels
                disabled={mode === 'course' ? !academicYearId : false}
              />
            </div>

            {mode === 'course' ? (
              <>
                <div className="space-y-1 md:col-span-3">
                  <Label>College{kind === 'summary' ? ' *' : ''}</Label>
                  <Select
                    value={collegeId || (kind === 'summary' ? null : '0')}
                    onChange={(v) => {
                      setCollegeId(v ?? (kind === 'summary' ? '' : '0'))
                      setCourseGroupId(kind === 'summary' ? '' : '0')
                      setCourseYearId(kind === 'summary' ? '' : '0')
                    }}
                    options={collegeOptions}
                    placeholder="College"
                    disabled={!examId}
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label>Course Group{kind === 'summary' ? ' *' : ''}</Label>
                  <Select
                    value={courseGroupId || (kind === 'summary' ? null : '0')}
                    onChange={(v) => {
                      setCourseGroupId(v ?? (kind === 'summary' ? '' : '0'))
                      setCourseYearId(kind === 'summary' ? '' : '0')
                    }}
                    options={courseGroupOptions}
                    placeholder="Course Group"
                    disabled={!collegeId && kind === 'summary'}
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label>Course Years{kind === 'summary' ? ' *' : ''}</Label>
                  <Select
                    value={courseYearId || (kind === 'summary' ? null : '0')}
                    onChange={(v) => setCourseYearId(v ?? (kind === 'summary' ? '' : '0'))}
                    options={courseYearOptions}
                    placeholder="Course Years"
                    disabled={!courseGroupId && kind === 'summary'}
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label>Regulation</Label>
                  <Select
                    value={regulationId}
                    onChange={(v) => setRegulationId(v ?? '0')}
                    options={regulationOptions}
                    placeholder="All"
                  />
                </div>
              </>
            ) : null}

            {kind === 'backlog' ? (
              <div className="space-y-1 md:col-span-2">
                <Label>{'>'} Backlogs</Label>
                <Input
                  type="number"
                  min={0}
                  value={backlogCount}
                  onChange={(e) => setBacklogCount(e.target.value)}
                  className="h-8 text-[12px]"
                />
              </div>
            ) : kind === 'credits' ? (
              <div className="space-y-1 md:col-span-2">
                <Label>{'<'} Credits</Label>
                <Input
                  type="number"
                  min={0}
                  value={belowCredits}
                  onChange={(e) => setBelowCredits(e.target.value)}
                  className="h-8 text-[12px]"
                />
              </div>
            ) : (
              <div className="space-y-1 md:col-span-2">
                <Label>Result Status *</Label>
                <Select value={isPass} onChange={(v) => setIsPass(v ?? '-1')} options={PASS_OPTIONS} />
              </div>
            )}

            <div className="flex items-end gap-2 md:col-span-2">
              <Button
                type="button"
                onClick={() => void onGetList()}
                disabled={loading || loadingFilters}
                className="h-8 shrink-0 px-2.5 text-[12px]"
              >
                Get List
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                title="Reset"
                onClick={resetFilters}
                disabled={loading || loadingFilters}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {hasFetched && filterSummary ? (
            <p className="mt-2 text-[12px] font-medium text-blue-700">{filterSummary}</p>
          ) : null}
        </>
      )}
      rowData={hasFetched ? rows : []}
      columnDefs={columnDefs}
      loading={loading}
      pagination
      paginationPageSize={10}
      getRowId={getRowId}
      toolbar={{
        search: true,
        searchPlaceholder: 'Search…',
        exportPdf: false,
        pdfDocumentTitle: title,
      }}
      toolbarTrailing={
        hasFetched && rows.length > 0 ? (
          <Button
            type="button"
            size="sm"
            className="h-9 shrink-0 px-3 text-[12px]"
            onClick={handlePrintReport}
          >
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Print Report
          </Button>
        ) : undefined
      }
    />
  )
}
