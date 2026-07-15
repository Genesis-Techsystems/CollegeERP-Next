'use client'

/**
 * Exam Student Registration Report — Angular
 * `admin-examination-management/admin-exam-reports/exam-student-registration-report`.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { format, parseISO } from 'date-fns'
import { Eye, Printer, RefreshCw } from 'lucide-react'
import { FilteredListPage } from '@/components/layout'
import { Select, type SelectOption } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toastError } from '@/lib/toast'
import { toast } from 'sonner'
import {
  getExamStudentRegistrationReportRows,
  getUnivExamFiltersRegSup,
  getUnivExamRestInRegExamStd,
  listActiveRooms,
  listStudents,
  type AnyRow,
} from '@/services'

type Row = AnyRow

const REPORT_TITLE = 'Exam Student Registration Report'

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

function formatRegDate(v: unknown): string {
  const s = txt(v)
  if (!s) return '—'
  try {
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return format(parseISO(s.slice(0, 10)), 'dd/MM/yyyy')
    return format(new Date(s), 'dd/MM/yyyy')
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

/** Angular subject_name: `CODE-Name^CODE-Name` → Name (CODE), Name (CODE) */
function formatSubjects(raw: unknown): string {
  const s = txt(raw)
  if (!s) return '—'
  return s
    .split('^')
    .map((part) => {
      const bits = part.split('-')
      if (bits.length < 2) return part.trim()
      const code = bits[0]?.trim() ?? ''
      const name = bits.slice(1).join('-').trim()
      return name && code ? `${name} (${code})` : part.trim()
    })
    .filter(Boolean)
    .join(', ')
}

function subjectsRenderer(p: ICellRendererParams<Row>) {
  const s = txt(p.data?.subject_name)
  if (!s) return '—'
  const parts = s.split('^').filter(Boolean)
  return (
    <span className="text-[12px] leading-snug">
      {parts.map((part, i) => {
        const bits = part.split('-')
        const code = bits[0]?.trim() ?? ''
        const name = bits.slice(1).join('-').trim() || part
        return (
          <span key={`${code}-${i}`}>
            {i > 0 ? ', ' : ''}
            {name}
            {code ? <span className="text-blue-700"> ({code})</span> : null}
          </span>
        )
      })}
    </span>
  )
}

function yesNo(v: unknown): string {
  if (v === true || v === 1 || v === '1' || String(v).toLowerCase() === 'true') return 'Yes'
  if (v === false || v === 0 || v === '0' || String(v).toLowerCase() === 'false') return 'No'
  return '—'
}

function examFormRenderer(p: ICellRendererParams<Row>) {
  const path = txt(p.data?.application_file_path ?? p.data?.applicationFilePath)
  if (!path) return '—'
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-7 w-7"
      title="View exam form"
      onClick={(e) => {
        e.stopPropagation()
        window.open(path, '_blank', 'noopener,noreferrer')
      }}
    >
      <Eye className="h-4 w-4" />
    </Button>
  )
}

function printReport(args: {
  collegeName: string
  examName: string
  filterSummary: string
  rows: Row[]
}): void {
  const bodyRows = args.rows
    .map((r, i) => {
      return `<tr>
        <td style="text-align:center">${i + 1}</td>
        <td>${escapeHtml(txt(r.hallticket_no ?? r.hallticketNo) || '—')}</td>
        <td>${escapeHtml(txt(r.student_name ?? r.studentName) || '—')}</td>
        <td>${escapeHtml(`${txt(r.college_code)} / ${txt(r.course_year)}`.replace(/^ \/ | \/ $/g, '') || '—')}</td>
        <td>${escapeHtml(txt(r.exam_name ?? r.examName) || '—')}</td>
        <td>${escapeHtml(txt(r.exam_type ?? r.examType) || '—')}</td>
        <td>${escapeHtml(formatRegDate(r.registration_date ?? r.registrationDate))}</td>
        <td>${escapeHtml(formatSubjects(r.subject_name))}</td>
        <td>${escapeHtml(yesNo(r.is_fee_paid ?? r.isFeePaid))}</td>
        <td>${escapeHtml(yesNo(r.is_hallticket_issued ?? r.isHallticketIssued))}</td>
      </tr>`
    })
    .join('')

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(REPORT_TITLE)}</title><style>
@page { size: A4 landscape; margin: 10mm; }
body { font: 11px/1.4 system-ui, -apple-system, 'Segoe UI', sans-serif; color: #111; margin: 0; }
.collegeName { font-size: 16px; font-weight: 600; margin: 0 0 2px; }
.title { font-size: 14px; font-weight: 600; margin: 0 0 4px; }
.details { margin: 0 0 10px; color: #334155; }
table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #94a3b8; padding: 5px 6px; text-align: left; vertical-align: top; word-break: break-word; }
th { background: #c3d9ff; font-weight: 600; }
tr { break-inside: avoid; }
</style></head><body>
  ${args.collegeName ? `<p class="collegeName">${escapeHtml(args.collegeName)}</p>` : ''}
  <p class="title">Exam Student Registration</p>
  ${args.examName ? `<p class="details">${escapeHtml(args.examName)}</p>` : ''}
  ${args.filterSummary ? `<p class="details">${escapeHtml(args.filterSummary)}</p>` : ''}
  <table>
    <thead>
      <tr>
        <th>S.No</th>
        <th>HallTicket No.</th>
        <th>Student Name</th>
        <th>Course Details</th>
        <th>Exam</th>
        <th>Exam Type</th>
        <th>Registration Date</th>
        <th>Subjects</th>
        <th>Fee Paid</th>
        <th>HallTicket Issued</th>
      </tr>
    </thead>
    <tbody>${bodyRows}</tbody>
  </table>
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

const COL_DEFS = {
  siNo: {
    headerName: 'S.No',
    valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
    width: 70,
    flex: 0,
  } as ColDef<Row>,
  hallticket: {
    headerName: 'HallTicket No.',
    minWidth: 130,
    flex: 0,
    valueGetter: (p) => txt(p.data?.hallticket_no ?? p.data?.hallticketNo) || '—',
  } as ColDef<Row>,
  studentName: {
    headerName: 'Student Name',
    minWidth: 150,
    flex: 1,
    valueGetter: (p) => txt(p.data?.student_name ?? p.data?.studentName) || '—',
  } as ColDef<Row>,
  courseDetails: {
    headerName: 'Course Details',
    minWidth: 120,
    flex: 0,
    valueGetter: (p) => {
      const college = txt(p.data?.college_code ?? p.data?.collegeCode)
      const year = txt(p.data?.course_year ?? p.data?.courseYear)
      if (college && year) return `${college} / ${year}`
      return college || year || '—'
    },
  } as ColDef<Row>,
  exam: {
    headerName: 'Exam',
    minWidth: 160,
    flex: 1,
    valueGetter: (p) => txt(p.data?.exam_name ?? p.data?.examName) || '—',
  } as ColDef<Row>,
  examType: {
    headerName: 'Exam Type',
    minWidth: 100,
    flex: 0,
    valueGetter: (p) => txt(p.data?.exam_type ?? p.data?.examType) || '—',
  } as ColDef<Row>,
  regDate: {
    headerName: 'Registration Date',
    minWidth: 120,
    flex: 0,
    valueGetter: (p) => formatRegDate(p.data?.registration_date ?? p.data?.registrationDate),
  } as ColDef<Row>,
  subjects: {
    headerName: 'Subjects',
    minWidth: 200,
    flex: 1.2,
  } as ColDef<Row>,
  examForm: {
    headerName: 'Exam Form',
    minWidth: 90,
    flex: 0,
    width: 100,
  } as ColDef<Row>,
  feePaid: {
    headerName: 'Fee Paid',
    minWidth: 90,
    flex: 0,
    valueGetter: (p) => yesNo(p.data?.is_fee_paid ?? p.data?.isFeePaid),
  } as ColDef<Row>,
  htIssued: {
    headerName: 'HallTicket Issued',
    minWidth: 120,
    flex: 0,
    valueGetter: (p) => yesNo(p.data?.is_hallticket_issued ?? p.data?.isHallticketIssued),
  } as ColDef<Row>,
}

export default function ExamStudentRegistrationReportPage() {
  const [loading, setLoading] = useState(false)
  const [loadingFilters, setLoadingFilters] = useState(false)
  const [searchingStudent, setSearchingStudent] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)
  const [employeeId, setEmployeeId] = useState(0)

  const [baseRows, setBaseRows] = useState<Row[]>([])
  const [restRows, setRestRows] = useState<Row[]>([])
  const [regulationRows, setRegulationRows] = useState<Row[]>([])
  const [roomRows, setRoomRows] = useState<Row[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [studentOptions, setStudentOptions] = useState<SelectOption[]>([])

  const [courseId, setCourseId] = useState('')
  const [academicYearId, setAcademicYearId] = useState('')
  const [examId, setExamId] = useState('')
  const [collegeId, setCollegeId] = useState('')
  const [courseGroupId, setCourseGroupId] = useState('')
  const [courseYearId, setCourseYearId] = useState('')
  const [regulationId, setRegulationId] = useState('0')
  const [roomId, setRoomId] = useState('0')
  const [studentId, setStudentId] = useState('')
  const [filterSummary, setFilterSummary] = useState('')

  useEffect(() => {
    setEmployeeId(Number(globalThis?.localStorage?.getItem('employeeId') ?? 0))
  }, [])

  useEffect(() => {
    async function init() {
      if (!employeeId) return
      setLoadingFilters(true)
      try {
        const [filters, rooms] = await Promise.all([
          getUnivExamFiltersRegSup(employeeId),
          listActiveRooms().catch(() => []),
        ])
        const list = Array.isArray(filters) ? filters : []
        const univ = list.filter((r) => txt(r.flag) === 'univ_exam_filters').length
          ? list.filter((r) => txt(r.flag) === 'univ_exam_filters' || num(r.fk_course_id) > 0)
          : list
        setBaseRows(univ)
        setRoomRows(Array.isArray(rooms) ? rooms : [])
        const courses = dedupeBy(univ, (r) => num(r.fk_course_id))
        if (courses[0]) setCourseId(String(num(courses[0].fk_course_id)))
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
        baseRows.filter((r) => num(r.fk_course_id) === Number(courseId)),
        (r) => num(r.fk_academic_year_id),
      ),
    [baseRows, courseId],
  )

  const exams = useMemo(
    () =>
      dedupeBy(
        baseRows.filter(
          (r) =>
            num(r.fk_course_id) === Number(courseId) &&
            num(r.fk_academic_year_id) === Number(academicYearId),
        ),
        (r) => num(r.fk_exam_id),
      ),
    [baseRows, courseId, academicYearId],
  )

  const colleges = useMemo(() => dedupeBy(restRows, (r) => num(r.fk_college_id)), [restRows])

  const courseGroups = useMemo(() => {
    const source = restRows.filter((r) => !collegeId || num(r.fk_college_id) === Number(collegeId))
    return dedupeBy(source, (r) => num(r.fk_course_group_id))
  }, [restRows, collegeId])

  const courseYears = useMemo(() => {
    const source = restRows.filter(
      (r) =>
        (!collegeId || num(r.fk_college_id) === Number(collegeId)) &&
        (!courseGroupId || num(r.fk_course_group_id) === Number(courseGroupId)),
    )
    return dedupeBy(source, (r) => num(r.fk_course_year_id))
  }, [restRows, collegeId, courseGroupId])

  const regulations = useMemo(
    () => dedupeBy([...regulationRows, ...restRows], (r) => num(r.fk_regulation_id ?? r.regulationId)),
    [regulationRows, restRows],
  )

  useEffect(() => {
    if (!courseId || academicYears.length === 0) return
    const ok = academicYears.some((r) => num(r.fk_academic_year_id) === Number(academicYearId))
    if (!ok) setAcademicYearId(String(num(academicYears[0].fk_academic_year_id)))
  }, [courseId, academicYears, academicYearId])

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
        setCollegeId('')
        setCourseGroupId('')
        setCourseYearId('')
        setRegulationId('0')
        setRoomId('0')
        setStudentId('')
        setStudentOptions([])
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
  }, [courseId, academicYearId, examId, employeeId])

  useEffect(() => {
    if (!colleges.length) return
    const ok = colleges.some((r) => num(r.fk_college_id) === Number(collegeId))
    if (!ok) setCollegeId(String(num(colleges[0].fk_college_id)))
  }, [colleges, collegeId])

  useEffect(() => {
    if (!courseGroups.length) return
    const ok = courseGroups.some((r) => num(r.fk_course_group_id) === Number(courseGroupId))
    if (!ok) {
      setCourseGroupId(String(num(courseGroups[0].fk_course_group_id)))
      setCourseYearId('')
    }
  }, [courseGroups, courseGroupId])

  useEffect(() => {
    if (!courseYears.length) return
    const ok = courseYears.some((r) => num(r.fk_course_year_id) === Number(courseYearId))
    if (!ok) setCourseYearId(String(num(courseYears[0].fk_course_year_id)))
  }, [courseYears, courseYearId])

  function resetFilters() {
    setExamId('')
    setAcademicYearId('')
    setCourseGroupId('')
    setCourseYearId('')
    setRegulationId('0')
    setCollegeId('')
    setRoomId('0')
    setStudentId('')
    setStudentOptions([])
    setRows([])
    setHasFetched(false)
    setFilterSummary('')
    const firstCourse = courses[0]
    if (firstCourse) setCourseId(String(num(firstCourse.fk_course_id)))
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
            const roll = txt(r.rollNumber ?? r.roll_number)
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
  const collegeOptions: SelectOption[] = useMemo(
    () =>
      colleges.map((r) => ({
        value: String(num(r.fk_college_id)),
        label: txt(r.college_code ?? r.collegeCode) || String(num(r.fk_college_id)),
      })),
    [colleges],
  )
  const courseGroupOptions: SelectOption[] = useMemo(
    () =>
      courseGroups.map((r) => ({
        value: String(num(r.fk_course_group_id)),
        label: txt(r.group_code ?? r.groupCode) || String(num(r.fk_course_group_id)),
      })),
    [courseGroups],
  )
  const courseYearOptions: SelectOption[] = useMemo(
    () =>
      courseYears.map((r) => ({
        value: String(num(r.fk_course_year_id)),
        label:
          txt(r.course_year_code ?? r.courseYearCode ?? r.course_year_name) ||
          String(num(r.fk_course_year_id)),
      })),
    [courseYears],
  )
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
  const roomOptions: SelectOption[] = useMemo(
    () => [
      { value: '0', label: 'All' },
      ...roomRows.map((r) => ({
        value: String(num(r.roomId ?? r.room_id)),
        label: txt(r.roomCode ?? r.room_code ?? r.roomName ?? r.room_name) || String(num(r.roomId)),
      })),
    ],
    [roomRows],
  )

  const columnDefs = useMemo<ColDef<Row>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.hallticket,
      COL_DEFS.studentName,
      COL_DEFS.courseDetails,
      COL_DEFS.exam,
      COL_DEFS.examType,
      COL_DEFS.regDate,
      { ...COL_DEFS.subjects, cellRenderer: subjectsRenderer },
      { ...COL_DEFS.examForm, cellRenderer: examFormRenderer },
      COL_DEFS.feePaid,
      COL_DEFS.htIssued,
    ],
    [],
  )

  const getRowId = useCallback((p: { data?: Row; node?: { rowIndex?: number | null } }) => {
    const d = p.data
    if (!d) return ''
    const id = num(d.exam_student_reg_id ?? d.fk_exam_student_registration_id ?? d.studentId)
    if (id > 0) return `${id}-${txt(d.hallticket_no)}-${p.node?.rowIndex ?? 0}`
    return `row-${p.node?.rowIndex ?? 0}-${txt(d.hallticket_no)}-${txt(d.student_name)}`
  }, [])

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
    if (!courseId || !academicYearId || !examId || !collegeId || !courseGroupId || !courseYearId) {
      toast.info('Please Select Valid Filters')
      return
    }
    setLoading(true)
    setHasFetched(true)
    try {
      const list = await getExamStudentRegistrationReportRows({
        examId: Number(examId),
        courseId: Number(courseId),
        collegeId: Number(collegeId),
        courseGroupId: Number(courseGroupId || 0),
        courseYearId: Number(courseYearId || 0),
        studentId: Number(studentId || 0),
        regulationId: Number(regulationId || 0),
        roomId: Number(roomId || 0),
      })
      setRows(Array.isArray(list) ? list : [])
      setFilterSummary(list?.length ? buildSummary() : '')
      if (!list?.length) toast.info('No Records Found.')
    } catch (e) {
      toastError(e, 'Failed to load student registration report')
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
    const college = colleges.find((r) => num(r.fk_college_id) === Number(collegeId))
    const exam = exams.find((r) => num(r.fk_exam_id) === Number(examId))
    printReport({
      collegeName: txt(college?.college_name ?? college?.collegeName ?? college?.college_code),
      examName: txt(exam?.exam_name ?? exam?.examName),
      filterSummary,
      rows,
    })
  }

  return (
    <FilteredListPage
      title="Exam Student Registration Report"
      filters={(
        <>
          <div className="grid grid-cols-1 items-end gap-2 md:grid-cols-12">
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
            <div className="space-y-1 md:col-span-8">
              <Label>Exam Master *</Label>
              <Select
                value={examId || null}
                onChange={(v) => setExamId(v ?? '')}
                options={examOptions}
                placeholder="Exam Master"
                searchable={examOptions.length > 6}
                wrapOptionLabels
                disabled={!academicYearId}
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <Label>College *</Label>
              <Select
                value={collegeId || null}
                onChange={(v) => {
                  setCollegeId(v ?? '')
                  setCourseGroupId('')
                  setCourseYearId('')
                }}
                options={collegeOptions}
                placeholder="College"
                disabled={!examId}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Course Group *</Label>
              <Select
                value={courseGroupId || null}
                onChange={(v) => {
                  setCourseGroupId(v ?? '')
                  setCourseYearId('')
                }}
                options={courseGroupOptions}
                placeholder="Course Group"
                disabled={!collegeId}
              />
            </div>
            <div className="space-y-1 md:col-span-1">
              <Label>Course Years *</Label>
              <Select
                value={courseYearId || null}
                onChange={(v) => setCourseYearId(v ?? '')}
                options={courseYearOptions}
                placeholder="Course Years"
                disabled={!courseGroupId}
              />
            </div>
            <div className="space-y-1 md:col-span-1">
              <Label>Regulation</Label>
              <Select
                value={regulationId}
                onChange={(v) => setRegulationId(v ?? '0')}
                options={regulationOptions}
                placeholder="All"
                disabled={!collegeId}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Room</Label>
              <Select
                value={roomId}
                onChange={(v) => setRoomId(v ?? '0')}
                options={roomOptions}
                placeholder="All"
                searchable={roomOptions.length > 8}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Student</Label>
              <Select
                value={studentId || null}
                onChange={(v) => {
                  setStudentId(v ?? '')
                  setRows([])
                  setHasFetched(false)
                }}
                options={studentOptions}
                placeholder="Student"
                searchable
                clearable
                onSearch={onSearchStudent}
                isLoading={searchingStudent}
              />
            </div>
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
        pdfDocumentTitle: REPORT_TITLE,
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
