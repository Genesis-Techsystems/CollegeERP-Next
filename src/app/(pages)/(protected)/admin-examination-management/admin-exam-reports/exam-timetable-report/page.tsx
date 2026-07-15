'use client'

/**
 * Exam Timetable Report — Angular
 * `admin-examination-management/admin-exam-reports/exam-timetable-report`.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColDef } from 'ag-grid-community'
import { format, parseISO } from 'date-fns'
import { RefreshCw } from 'lucide-react'
import { FilteredListPage } from '@/components/layout'
import { Select, type SelectOption } from '@/common/components/select'
import { DatePicker } from '@/common/components/date-picker'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { toastError } from '@/lib/toast'
import { toast } from 'sonner'
import {
  getExamTimetableReportRows,
  getUnivExamFiltersRegSup,
  getUnivExamRestInRegExamStd,
  type AnyRow,
} from '@/services/pre-examination'

type Row = AnyRow

const WIDE_FROM = new Date('1990-01-01T00:00:00')
const WIDE_TO = new Date('9999-12-31T00:00:00')

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function txt(v: unknown): string {
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return ''
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

const COL_DEFS = {
  siNo: {
    headerName: 'S.No',
    valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
    width: 70,
    flex: 0,
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
    valueGetter: (p) => txt(p.data?.exam_date ?? p.data?.examDate) || '—',
  } as ColDef<Row>,
  group: {
    headerName: 'Group',
    minWidth: 100,
    flex: 0,
    valueGetter: (p) => txt(p.data?.group_code ?? p.data?.groupCode ?? p.data?.course_group_code) || '—',
  } as ColDef<Row>,
  courseYear: {
    headerName: 'Course Year',
    minWidth: 110,
    flex: 0,
    valueGetter: (p) =>
      txt(p.data?.course_year_code ?? p.data?.courseYearCode ?? p.data?.course_year_name) || '—',
  } as ColDef<Row>,
  subject: {
    headerName: 'Subject',
    minWidth: 200,
    flex: 1,
    valueGetter: (p) => {
      const sn = txt(p.data?.subject_name ?? p.data?.subjectName)
      const sc = txt(p.data?.subject_code ?? p.data?.subjectCode)
      if (sn && sc) return `${sn} (${sc})`
      return sn || sc || '—'
    },
  } as ColDef<Row>,
  examType: {
    headerName: 'Exam Type',
    minWidth: 110,
    flex: 0,
    valueGetter: (p) =>
      txt(p.data?.gd_display_name ?? p.data?.exam_type ?? p.data?.examType ?? p.data?.paper_type) || '—',
  } as ColDef<Row>,
  session: {
    headerName: 'Session',
    minWidth: 160,
    flex: 1,
    valueGetter: (p) => {
      const name = txt(p.data?.exam_session_name ?? p.data?.session_name ?? p.data?.examSessionName)
      const start = txt(p.data?.session_start_time ?? p.data?.sessionStartTime)
      const end = txt(p.data?.session_end_time ?? p.data?.sessionEndTime)
      if (name && start && end) return `${name}-(${start} To ${end})`
      return name || '—'
    },
  } as ColDef<Row>,
}

export default function ExamTimetableReportPage() {
  const [loading, setLoading] = useState(false)
  const [loadingFilters, setLoadingFilters] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)
  const [employeeId, setEmployeeId] = useState(0)

  const [baseRows, setBaseRows] = useState<Row[]>([])
  const [restRows, setRestRows] = useState<Row[]>([])
  const [regulationRows, setRegulationRows] = useState<Row[]>([])
  const [rows, setRows] = useState<Row[]>([])

  const [courseId, setCourseId] = useState('')
  const [academicYearId, setAcademicYearId] = useState('')
  const [examId, setExamId] = useState('')
  const [collegeId, setCollegeId] = useState('')
  const [courseGroupId, setCourseGroupId] = useState('')
  const [courseYearId, setCourseYearId] = useState('')
  const [regulationId, setRegulationId] = useState('0')

  /** Angular `isDisable` — when true, From/To dates are editable (label shows "enable"). */
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

  useEffect(() => {
    if (!regulations.length) return
    const ok =
      regulationId === '0' ||
      regulations.some((r) => num(r.fk_regulation_id ?? r.regulationId) === Number(regulationId))
    if (!ok) {
      setRegulationId(String(num(regulations[0].fk_regulation_id ?? regulations[0].regulationId)))
    }
  }, [regulations, regulationId])

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
    setRegulationId('0')
    setCollegeId('')
    setRows([])
    setHasFetched(false)
    setFilterSummary('')
    applyDateRangeMode(false)
    const firstCourse = courses[0]
    if (firstCourse) setCourseId(String(num(firstCourse.fk_course_id)))
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

  const columnDefs = useMemo<ColDef<Row>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.exam,
      COL_DEFS.examDate,
      COL_DEFS.group,
      COL_DEFS.courseYear,
      COL_DEFS.subject,
      COL_DEFS.examType,
      COL_DEFS.session,
    ],
    [],
  )

  const getRowId = useCallback((p: { data?: Row }) => {
    const d = p.data
    if (!d) return ''
    const id = num(d.exam_timetable_id ?? d.fk_exam_timetable_id ?? d.examTimetableId)
    if (id > 0) return String(id)
    return `row-${txt(d.exam_date)}-${txt(d.subject_code)}-${txt(d.exam_session_name)}-${num(d.fk_subject_id)}`
  }, [])

  function buildSummary(): string {
    const college = colleges.find((r) => num(r.fk_college_id) === Number(collegeId))
    const course = courses.find((r) => num(r.fk_course_id) === Number(courseId))
    const year = academicYears.find((r) => num(r.fk_academic_year_id) === Number(academicYearId))
    const group = courseGroups.find((r) => num(r.fk_course_group_id) === Number(courseGroupId))
    const exam = exams.find((r) => num(r.fk_exam_id) === Number(examId))
    return [
      txt(college?.college_code ?? college?.collegeCode),
      txt(course?.course_code ?? course?.courseCode),
      txt(year?.academic_year ?? year?.academicYear),
      txt(group?.group_code ?? group?.groupCode),
      txt(exam?.exam_name ?? exam?.examName),
    ]
      .filter(Boolean)
      .join(' / ')
  }

  async function onGetTimetable() {
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
      const list = await getExamTimetableReportRows({
        examId: Number(examId),
        courseId: Number(courseId),
        collegeId: Number(collegeId),
        courseGroupId: Number(courseGroupId || 0),
        courseYearId: Number(courseYearId || 0),
        regulationId: Number(regulationId || 0),
        fromDate: ymd(fromDate) || '1990-01-01',
        toDate: ymd(toDate) || '9999-12-31',
      })
      setRows(Array.isArray(list) ? list : [])
      setFilterSummary(list?.length ? buildSummary() : '')
      if (!list?.length) toast.info('No Records Found.')
    } catch (e) {
      toastError(e, 'Failed to load exam timetable')
      setRows([])
      setFilterSummary('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <FilteredListPage
      title="Exam Timetable Report"
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
            <div className="space-y-1 md:col-span-5">
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
            <div className="space-y-1 md:col-span-3">
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
            <div className="space-y-1 md:col-span-2">
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
            <div className="space-y-1 md:col-span-2">
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
                id="tt-date-enable"
                checked={dateRangeEnabled}
                onCheckedChange={(c) => applyDateRangeMode(c === true)}
              />
              <Label htmlFor="tt-date-enable" className="cursor-pointer text-[12px] font-normal">
                {dateRangeEnabled ? 'Enable' : 'Disable'}
              </Label>
            </div>
            <div className="flex items-end gap-2 md:col-span-2">
              <Button
                type="button"
                onClick={() => void onGetTimetable()}
                disabled={loading || loadingFilters}
                className="h-8 shrink-0 px-2.5 text-[12px]"
              >
                Get Timetable
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
        pdfDocumentTitle: 'Exam Timetable Report',
      }}
    />
  )
}
