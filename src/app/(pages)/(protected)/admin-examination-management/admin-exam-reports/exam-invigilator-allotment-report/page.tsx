'use client'

/**
 * Invigilator Allotment Report — Angular
 * `admin-examination-management/admin-exam-reports/exam-invigilator-allotment-report`.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { format, parseISO } from 'date-fns'
import { RefreshCw, Printer } from 'lucide-react'
import { FilteredListPage } from '@/components/layout'
import { Select, type SelectOption } from '@/common/components/select'
import { DatePicker } from '@/common/components/date-picker'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { toastError } from '@/lib/toast'
import { toast } from 'sonner'
import {
  getInvigilatorAllotmentReportRows,
  getUnivExamFiltersRegSup,
  getUnivExamRestInRegExamStd,
  searchBuildingDetailsRooms,
  searchEmployeesForHr,
  type AnyRow,
} from '@/services'

type Row = AnyRow

const WIDE_FROM = new Date('1990-01-01T00:00:00')
const WIDE_TO = new Date('9999-12-31T00:00:00')
const REPORT_TITLE = 'Invigilator Allotment Report'

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

/** Angular `printPage()` — browser print of the allotment table. */
function printInvigilatorReport(args: {
  collegeName: string
  courseGroupCode: string
  courseYearCode: string
  rows: Row[]
}): void {
  const bodyRows = args.rows
    .map((r, i) => {
      const name = txt(r.invigilator_name ?? r.invigilatorName)
      const type = txt(r.invigilator_type ?? r.invigilatorType)
      const inv = type ? `${escapeHtml(name)} (${escapeHtml(type)})` : escapeHtml(name)
      const start = tConvert(r.session_start_time ?? r.sessionStartTime)
      const end = tConvert(r.session_end_time ?? r.sessionEndTime)
      const timings = start && end ? `${start} - ${end}` : start || end
      return `<tr>
        <td style="text-align:center">${i + 1}</td>
        <td>${inv || '—'}</td>
        <td>${escapeHtml(txt(r.exam_name ?? r.examName) || '—')}</td>
        <td>${escapeHtml(parseMaybeDate(r.exam_date ?? r.examDate) || '—')}</td>
        <td>${escapeHtml(txt(r.exam_session_name ?? r.session_name ?? r.examSessionName) || '—')}</td>
        <td>${escapeHtml(timings || '—')}</td>
        <td>${escapeHtml(txt(r.search_String ?? r.search_string ?? r.room_details) || '—')}</td>
      </tr>`
    })
    .join('')

  const metaParts: string[] = []
  if (args.courseGroupCode) {
    metaParts.push(`<p style="width:50%;margin:0;text-align:left">Course : ${escapeHtml(args.courseGroupCode)}</p>`)
  }
  if (args.courseYearCode) {
    metaParts.push(`<p style="width:50%;margin:0;text-align:right">Semester : ${escapeHtml(args.courseYearCode)}</p>`)
  }

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(REPORT_TITLE)}</title><style>
@page { size: A4 landscape; margin: 10mm; }
body { font: 11px/1.4 system-ui, -apple-system, 'Segoe UI', sans-serif; color: #111; margin: 0; }
.collegeName { font-size: 16px; font-weight: 600; margin: 0 0 2px; }
.title { font-size: 14px; font-weight: 600; margin: 0 0 10px; }
.meta { display: flex; justify-content: space-between; margin: 0 0 10px; }
table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #94a3b8; padding: 5px 6px; text-align: left; vertical-align: top; word-break: break-word; }
th { background: #c3d9ff; font-weight: 600; }
tr { break-inside: avoid; }
</style></head><body>
  ${args.collegeName ? `<p class="collegeName">${escapeHtml(args.collegeName)}</p>` : ''}
  <p class="title">${escapeHtml(REPORT_TITLE)}</p>
  ${metaParts.length ? `<div class="meta">${metaParts.join('')}</div>` : ''}
  <table>
    <thead>
      <tr>
        <th>S.No</th>
        <th>Invigilator</th>
        <th>Exam</th>
        <th>Exam Date</th>
        <th>Session</th>
        <th>Exam Timings</th>
        <th>Room Details</th>
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

function ymd(d: Date | null): string {
  if (!d || Number.isNaN(d.getTime())) return ''
  return format(d, 'yyyy-MM-dd')
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

function tConvert(time: unknown): string {
  const s = txt(time).trim()
  if (!s) return ''
  const m = s.match(/^([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/)
  if (!m) return s
  let h = Number(m[1])
  const min = m[2]
  const ampm = h < 12 ? 'AM' : 'PM'
  h = h % 12 || 12
  return `${h}:${min} ${ampm}`
}

function roomLabel(r: Row): string {
  const name = txt(r.roomName ?? r.room_name)
  const type = txt(r.roomType ?? r.room_type)
  const campus = txt(r.campuName ?? r.campusName ?? r.campus_name)
  const building = txt(r.buildingName ?? r.building_name)
  const block = txt(r.blockName ?? r.block_name)
  const floor = txt(r.floorName ?? r.floor_name)
  const loc = [campus, building, block, floor].filter(Boolean).join(' / ')
  const head = type ? `${name} (${type})` : name
  return loc ? `${head} — ${loc}` : head || String(num(r.roomId ?? r.room_id))
}

function empLabel(r: Row): string {
  const n = txt(r.empNumber ?? r.emp_number)
  const name = txt(r.firstName ?? r.first_name ?? r.empName)
  if (n && name) return `${n} (${name})`
  return n || name || String(num(r.employeeId ?? r.employee_id))
}

function invigilatorRenderer(p: ICellRendererParams<Row>) {
  const name = txt(p.data?.invigilator_name ?? p.data?.invigilatorName)
  const type = txt(p.data?.invigilator_type ?? p.data?.invigilatorType)
  if (!name) return '—'
  if (!type) return name
  return (
    <span>
      {name} <span className="text-blue-700">({type})</span>
    </span>
  )
}

const COL_DEFS = {
  siNo: {
    headerName: 'S.No',
    valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
    width: 70,
    flex: 0,
  } as ColDef<Row>,
  invigilator: {
    headerName: 'Invigilator',
    minWidth: 180,
    flex: 1,
  } as ColDef<Row>,
  exam: {
    headerName: 'Exam',
    minWidth: 160,
    flex: 1,
    valueGetter: (p) => txt(p.data?.exam_name ?? p.data?.examName) || '—',
  } as ColDef<Row>,
  examDate: {
    headerName: 'Exam Date',
    minWidth: 120,
    flex: 0,
    valueGetter: (p) => parseMaybeDate(p.data?.exam_date ?? p.data?.examDate) || '—',
  } as ColDef<Row>,
  session: {
    headerName: 'Session',
    minWidth: 110,
    flex: 0,
    valueGetter: (p) =>
      txt(p.data?.exam_session_name ?? p.data?.session_name ?? p.data?.examSessionName) || '—',
  } as ColDef<Row>,
  timings: {
    headerName: 'Exam Timings',
    minWidth: 160,
    flex: 0,
    valueGetter: (p) => {
      const start = tConvert(p.data?.session_start_time ?? p.data?.sessionStartTime)
      const end = tConvert(p.data?.session_end_time ?? p.data?.sessionEndTime)
      if (start && end) return `${start} - ${end}`
      return start || end || '—'
    },
  } as ColDef<Row>,
  room: {
    headerName: 'Room Details',
    minWidth: 200,
    flex: 1,
    valueGetter: (p) =>
      txt(p.data?.search_String ?? p.data?.search_string ?? p.data?.room_details) || '—',
  } as ColDef<Row>,
}

export default function ExamInvigilatorAllotmentReportPage() {
  const [loading, setLoading] = useState(false)
  const [loadingFilters, setLoadingFilters] = useState(false)
  const [searchingEmp, setSearchingEmp] = useState(false)
  const [searchingRoom, setSearchingRoom] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)
  const [employeeId, setEmployeeId] = useState(0)

  const [baseRows, setBaseRows] = useState<Row[]>([])
  const [restRows, setRestRows] = useState<Row[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [empOptions, setEmpOptions] = useState<SelectOption[]>([])
  const [roomSearchOptions, setRoomSearchOptions] = useState<SelectOption[]>([])

  const [courseId, setCourseId] = useState('')
  const [academicYearId, setAcademicYearId] = useState('')
  const [examId, setExamId] = useState('')
  const [collegeId, setCollegeId] = useState('')
  const [courseGroupId, setCourseGroupId] = useState('')
  const [courseYearId, setCourseYearId] = useState('')
  const [empId, setEmpId] = useState('')
  const [roomId, setRoomId] = useState('0')

  const [dateRangeEnabled, setDateRangeEnabled] = useState(false)
  const [fromDate, setFromDate] = useState<Date | null>(WIDE_FROM)
  const [toDate, setToDate] = useState<Date | null>(WIDE_TO)
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
        setCollegeId('')
        setCourseGroupId('')
        setCourseYearId('')
        setEmpId('')
        setEmpOptions([])
        setRoomId('0')
        setRoomSearchOptions([])
        setRows([])
        setHasFetched(false)
        setFilterSummary('')
      } catch (e) {
        toastError(e, 'Failed to load college / group filters')
        setRestRows([])
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

  function applyDateRangeMode(enabled: boolean) {
    setDateRangeEnabled(enabled)
    if (enabled) {
      const today = new Date()
      setFromDate(today)
      setToDate(today)
    } else {
      setFromDate(WIDE_FROM)
      setToDate(WIDE_TO)
    }
    setRows([])
    setHasFetched(false)
    setFilterSummary('')
  }

  function resetFilters() {
    setExamId('')
    setAcademicYearId('')
    setCourseGroupId('')
    setCourseYearId('')
    setCollegeId('')
    setEmpId('')
    setEmpOptions([])
    setRoomId('0')
    setRoomSearchOptions([])
    setRows([])
    setHasFetched(false)
    setFilterSummary('')
    applyDateRangeMode(false)
    const firstCourse = courses[0]
    if (firstCourse) setCourseId(String(num(firstCourse.fk_course_id)))
  }

  async function onSearchEmployee(term: string) {
    const q = term.trim()
    if (q.length < 4 || !collegeId) {
      setEmpOptions([])
      return
    }
    setSearchingEmp(true)
    try {
      const list = await searchEmployeesForHr(q, Number(collegeId))
      setEmpOptions(
        (Array.isArray(list) ? list : [])
          .map((r) => ({
            value: String(num(r.employeeId ?? r.employee_id)),
            label: empLabel(r),
          }))
          .filter((o) => o.value !== '0'),
      )
    } catch {
      setEmpOptions([])
    } finally {
      setSearchingEmp(false)
    }
  }

  async function onSearchRoom(term: string) {
    const q = term.trim()
    if (q.length < 2) {
      setRoomSearchOptions([])
      return
    }
    setSearchingRoom(true)
    try {
      const list = await searchBuildingDetailsRooms(q)
      setRoomSearchOptions(
        (Array.isArray(list) ? list : [])
          .map((r) => ({
            value: String(num(r.roomId ?? r.room_id)),
            label: roomLabel(r),
          }))
          .filter((o) => o.value !== '0'),
      )
    } catch {
      setRoomSearchOptions([])
    } finally {
      setSearchingRoom(false)
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
  const roomOptions: SelectOption[] = useMemo(
    () => [{ value: '0', label: 'All' }, ...roomSearchOptions],
    [roomSearchOptions],
  )

  const columnDefs = useMemo<ColDef<Row>[]>(
    () => [
      COL_DEFS.siNo,
      { ...COL_DEFS.invigilator, cellRenderer: invigilatorRenderer },
      COL_DEFS.exam,
      COL_DEFS.examDate,
      COL_DEFS.session,
      COL_DEFS.timings,
      COL_DEFS.room,
    ],
    [],
  )

  const getRowId = useCallback((p: { data?: Row; node?: { rowIndex?: number | null } }) => {
    const d = p.data
    if (!d) return ''
    const id = num(d.exam_invigilation_allotment_id ?? d.fk_exam_invigilation_allotment_id)
    if (id > 0) return String(id)
    const idx = p.node?.rowIndex ?? 0
    return `row-${idx}-${txt(d.invigilator_name)}-${txt(d.exam_date)}-${txt(d.search_String)}`
  }, [])

  function buildSummary(): string {
    const college = colleges.find((r) => num(r.fk_college_id) === Number(collegeId))
    const course = courses.find((r) => num(r.fk_course_id) === Number(courseId))
    const year = academicYears.find((r) => num(r.fk_academic_year_id) === Number(academicYearId))
    const cy = courseYears.find((r) => num(r.fk_course_year_id) === Number(courseYearId))
    const group = courseGroups.find((r) => num(r.fk_course_group_id) === Number(courseGroupId))
    const exam = exams.find((r) => num(r.fk_exam_id) === Number(examId))
    return [
      txt(college?.college_code ?? college?.collegeCode),
      txt(course?.course_code ?? course?.courseCode),
      txt(year?.academic_year ?? year?.academicYear),
      txt(cy?.regulation_code ?? cy?.regulationCode),
      txt(group?.group_code ?? group?.groupCode),
      txt(cy?.course_year_name ?? cy?.course_year_code ?? cy?.courseYearCode),
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
    if (dateRangeEnabled && fromDate && toDate && fromDate.getTime() > toDate.getTime()) {
      toast.info('To Date cannot be earlier than From Date')
      setToDate(fromDate)
      return
    }
    setLoading(true)
    setHasFetched(true)
    try {
      const list = await getInvigilatorAllotmentReportRows({
        examId: Number(examId),
        courseId: Number(courseId),
        collegeId: Number(collegeId),
        courseGroupId: Number(courseGroupId || 0),
        courseYearId: Number(courseYearId || 0),
        empId: Number(empId || 0),
        roomId: Number(roomId || 0),
        fromDate: ymd(fromDate) || '1990-01-01',
        toDate: ymd(toDate) || '9999-12-31',
      })
      setRows(Array.isArray(list) ? list : [])
      setFilterSummary(list?.length ? buildSummary() : '')
      if (!list?.length) toast.info('No Records Found.')
    } catch (e) {
      toastError(e, 'Failed to load invigilator allotment')
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
    const group = courseGroups.find((r) => num(r.fk_course_group_id) === Number(courseGroupId))
    const cy = courseYears.find((r) => num(r.fk_course_year_id) === Number(courseYearId))
    printInvigilatorReport({
      collegeName: txt(college?.college_name ?? college?.collegeName ?? college?.college_code),
      courseGroupCode: txt(group?.group_code ?? group?.groupCode),
      courseYearCode: txt(
        cy?.course_year_name ?? cy?.course_year_code ?? cy?.courseYearCode,
      ),
      rows,
    })
  }

  return (
    <FilteredListPage
      title="Invigilator Allotment Report"
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
                  setEmpId('')
                  setEmpOptions([])
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
                onChange={(v) => {
                  setCourseYearId(v ?? '')
                  setEmpId('')
                  setRows([])
                  setHasFetched(false)
                }}
                options={courseYearOptions}
                placeholder="Course Years"
                disabled={!courseGroupId}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Employee</Label>
              <Select
                value={empId || null}
                onChange={(v) => {
                  setEmpId(v ?? '')
                  setRows([])
                  setHasFetched(false)
                }}
                options={empOptions}
                placeholder="Employee"
                searchable
                clearable
                onSearch={onSearchEmployee}
                isLoading={searchingEmp}
                disabled={!collegeId}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Room Search</Label>
              <Select
                value={roomId}
                onChange={(v) => setRoomId(v ?? '0')}
                options={roomOptions}
                placeholder="All"
                searchable
                onSearch={onSearchRoom}
                isLoading={searchingRoom}
                wrapOptionLabels
              />
            </div>
            <div className="space-y-1 md:col-span-1">
              <Label>From Date</Label>
              <DatePicker
                value={fromDate}
                onChange={(d) => {
                  setFromDate(d)
                  if (d && toDate && d.getTime() > toDate.getTime()) setToDate(d)
                }}
                disabled={!dateRangeEnabled}
                displayFormat="dd/MM/yyyy"
                clearable={false}
                placeholder="From Date"
              />
            </div>
            <div className="space-y-1 md:col-span-1">
              <Label>To Date</Label>
              <DatePicker
                value={toDate}
                onChange={setToDate}
                disabled={!dateRangeEnabled}
                minDate={fromDate ?? undefined}
                displayFormat="dd/MM/yyyy"
                clearable={false}
                placeholder="To Date"
              />
            </div>
            <div className="flex items-center gap-2 pb-1 md:col-span-1">
              <Checkbox
                id="inv-allot-date-enable"
                checked={dateRangeEnabled}
                onCheckedChange={(c) => applyDateRangeMode(c === true)}
              />
              <Label htmlFor="inv-allot-date-enable" className="cursor-pointer text-[12px] font-normal">
                {dateRangeEnabled ? 'Enable' : 'Disable'}
              </Label>
            </div>
            <div className="flex items-end gap-2 md:col-span-12">
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
        pdfDocumentTitle: 'Invigilator Allotment Report',
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
