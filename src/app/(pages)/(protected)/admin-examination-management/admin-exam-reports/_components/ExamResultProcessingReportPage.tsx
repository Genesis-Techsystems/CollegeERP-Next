'use client'

/**
 * Shared Moderation / Grace Marks report UI —
 * Angular exam-moderation-reports / exam-gracemarks-reports.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColDef } from 'ag-grid-community'
import { format, parseISO } from 'date-fns'
import { Printer, RefreshCw } from 'lucide-react'
import { FilteredListPage } from '@/components/layout'
import { Select, type SelectOption } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toastError } from '@/lib/toast'
import { toast } from 'sonner'
import {
  getExamResultProcessingReport,
  getUnivExamFiltersRegSup,
  getUnivExamRestInRegExamStd,
  type AnyRow,
} from '@/services'

type Row = AnyRow
type Kind = 'moderation' | 'gracemarks'

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
  return `${name}${range}`
}

function dash(v: unknown): string {
  const s = txt(v)
  return !s || s === 'null' ? '—' : s
}

const moderationCols: ColDef<Row>[] = [
  { headerName: 'S.No', valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, width: 70, flex: 0 },
  { headerName: 'Subject Name', minWidth: 200, flex: 1, valueGetter: (p) => dash(p.data?.subject_name ?? p.data?.subject) },
  { headerName: 'Scheme', minWidth: 90, flex: 0, valueGetter: (p) => dash(p.data?.regulation_code ?? p.data?.scheme) },
  { headerName: 'Subject Maximum', minWidth: 120, flex: 0, valueGetter: (p) => dash(p.data?.ext_maxmarks ?? p.data?.subject_maximum) },
  { headerName: 'Appeared', minWidth: 90, flex: 0, valueGetter: (p) => dash(p.data?.Appeared ?? p.data?.appeared) },
  { headerName: 'Passed (Before)', minWidth: 110, flex: 0, valueGetter: (p) => dash(p.data?.passed ?? p.data?.before_passed) },
  { headerName: 'Pass % (Before)', minWidth: 110, flex: 0, valueGetter: (p) => dash(p.data?.Passed_percent ?? p.data?.before_pass_percent) },
  {
    headerName: 'Passed (After)',
    minWidth: 110,
    flex: 0,
    valueGetter: (p) => dash(p.data?.Passed_after_moderation ?? p.data?.after_passed),
  },
  {
    headerName: 'Pass % (After)',
    minWidth: 110,
    flex: 0,
    valueGetter: (p) => dash(p.data?.Passed_after_moderation_percent ?? p.data?.after_pass_percent),
  },
  {
    headerName: 'Moderation Marks',
    minWidth: 120,
    flex: 0,
    valueGetter: (p) => dash(p.data?.Moderation_marks_awarded ?? p.data?.moderation_marks),
  },
]

const graceCols: ColDef<Row>[] = [
  { headerName: 'S.No', valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, width: 70, flex: 0 },
  {
    headerName: 'Hall Ticket No',
    minWidth: 120,
    flex: 0,
    valueGetter: (p) => dash(p.data?.hallticket_number ?? p.data?.hallticket_no),
  },
  { headerName: 'Semester', minWidth: 100, flex: 0, valueGetter: (p) => dash(p.data?.course_year_code ?? p.data?.semester) },
  { headerName: 'Subject Name', minWidth: 160, flex: 1, valueGetter: (p) => dash(p.data?.subject_name ?? p.data?.subject) },
  { headerName: 'Internal Marks', minWidth: 110, flex: 0, valueGetter: (p) => dash(p.data?.internal_marks ?? p.data?.int_marks) },
  { headerName: 'External Marks', minWidth: 110, flex: 0, valueGetter: (p) => dash(p.data?.external_marks ?? p.data?.ext_marks) },
  {
    headerName: 'Grace Marks',
    minWidth: 100,
    flex: 0,
    valueGetter: (p) => dash(p.data?.grace_marks_added ?? p.data?.grace_marks),
  },
  {
    headerName: 'Final External Marks',
    minWidth: 130,
    flex: 0,
    valueGetter: (p) => dash(p.data?.ext_grace_total ?? p.data?.final_external_marks),
  },
  {
    headerName: 'Total Marks',
    minWidth: 100,
    flex: 0,
    valueGetter: (p) => dash(p.data?.total_marks ?? p.data?.int_ext_grace_total),
  },
]

export function ExamResultProcessingReportPage({ kind }: { kind: Kind }) {
  const title = kind === 'moderation' ? 'Moderation Reports' : 'Gracemarks Reports'
  const [loading, setLoading] = useState(false)
  const [loadingFilters, setLoadingFilters] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)
  const [employeeId, setEmployeeId] = useState(0)
  const [baseRows, setBaseRows] = useState<Row[]>([])
  const [restRows, setRestRows] = useState<Row[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [courseId, setCourseId] = useState('')
  const [academicYearId, setAcademicYearId] = useState('')
  const [examId, setExamId] = useState('')
  const [examTypeId, setExamTypeId] = useState('0')
  const [collegeId, setCollegeId] = useState('')
  const [courseGroupId, setCourseGroupId] = useState('')
  const [courseYearId, setCourseYearId] = useState('')

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
        setBaseRows(list)
        const courses = dedupeBy(list, (r) => num(r.fk_course_id))
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

  const examTypeOptions: SelectOption[] = useMemo(() => {
    const types = dedupeBy(exams, (r) => num(r.fk_exam_type_id ?? r.exam_type_id ?? r.examTypeCatdetId))
    const opts = types
      .map((r) => ({
        value: String(num(r.fk_exam_type_id ?? r.exam_type_id ?? r.examTypeCatdetId)),
        label: txt(r.exam_type ?? r.examType ?? r.gd_display_name) || String(num(r.fk_exam_type_id)),
      }))
      .filter((o) => o.value !== '0')
    return [{ value: '0', label: 'All' }, ...opts]
  }, [exams])

  useEffect(() => {
    if (!courseId || !academicYears.length) return
    if (!academicYears.some((r) => num(r.fk_academic_year_id) === Number(academicYearId))) {
      setAcademicYearId(String(num(academicYears[0].fk_academic_year_id)))
    }
  }, [courseId, academicYears, academicYearId])

  useEffect(() => {
    if (!academicYearId || !exams.length) return
    if (!exams.some((r) => num(r.fk_exam_id) === Number(examId))) {
      setExamId(String(num(exams[0].fk_exam_id)))
    }
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
        setRows([])
        setHasFetched(false)
      } catch (e) {
        toastError(e, 'Failed to load filters')
        setRestRows([])
      } finally {
        setLoadingFilters(false)
      }
    }
    void loadRest()
  }, [courseId, academicYearId, examId, employeeId])

  useEffect(() => {
    if (!colleges.length) return
    if (!colleges.some((r) => num(r.fk_college_id) === Number(collegeId))) {
      setCollegeId(String(num(colleges[0].fk_college_id)))
    }
  }, [colleges, collegeId])

  useEffect(() => {
    if (!courseGroups.length) return
    if (!courseGroups.some((r) => num(r.fk_course_group_id) === Number(courseGroupId))) {
      setCourseGroupId(String(num(courseGroups[0].fk_course_group_id)))
      setCourseYearId('')
    }
  }, [courseGroups, courseGroupId])

  useEffect(() => {
    if (!courseYears.length) return
    if (!courseYears.some((r) => num(r.fk_course_year_id) === Number(courseYearId))) {
      setCourseYearId(String(num(courseYears[0].fk_course_year_id)))
    }
  }, [courseYears, courseYearId])

  async function onGetList() {
    if (!courseId || !examId || !collegeId || !courseGroupId || !courseYearId) {
      toast.info('Please Select Valid Filters')
      return
    }
    setLoading(true)
    setHasFetched(true)
    try {
      const list = await getExamResultProcessingReport({
        flag: kind === 'moderation' ? 'exam_analysis_by_subject' : 'exam_gracemark_added_list',
        examId: Number(examId),
        examType: Number(examTypeId || 0),
        collegeId: Number(collegeId),
        courseId: Number(courseId),
        courseGroupId: Number(courseGroupId),
        courseYearId: Number(courseYearId),
      })
      setRows(Array.isArray(list) ? list : [])
      if (!list?.length) toast.info('No Records Found.')
    } catch (e) {
      toastError(e, 'Failed to load report')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  const getRowId = useCallback(
    (p: { data?: Row; node?: { rowIndex?: number | null } }) =>
      `row-${p.node?.rowIndex ?? 0}-${txt(p.data?.subject_name)}-${txt(p.data?.hallticket_no)}`,
    [],
  )

  return (
    <FilteredListPage
      title={title}
      filters={(
        <div className="grid grid-cols-1 items-end gap-2 md:grid-cols-12">
          <div className="space-y-1 md:col-span-2">
            <Label>Course *</Label>
            <Select
              value={courseId || null}
              onChange={(v) => {
                setCourseId(v ?? '')
                setAcademicYearId('')
                setExamId('')
              }}
              options={courses.map((r) => ({
                value: String(num(r.fk_course_id)),
                label: txt(r.course_code) || String(num(r.fk_course_id)),
              }))}
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
              }}
              options={academicYears.map((r) => ({
                value: String(num(r.fk_academic_year_id)),
                label: txt(r.academic_year) || String(num(r.fk_academic_year_id)),
              }))}
              disabled={!courseId}
            />
          </div>
          <div className="space-y-1 md:col-span-4">
            <Label>Exam *</Label>
            <Select
              value={examId || null}
              onChange={(v) => setExamId(v ?? '')}
              options={exams.map((r) => ({
                value: String(num(r.fk_exam_id)),
                label: examMasterLabel(r),
              }))}
              searchable
              wrapOptionLabels
              disabled={!academicYearId}
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Exam Type</Label>
            <Select value={examTypeId} onChange={(v) => setExamTypeId(v ?? '0')} options={examTypeOptions} />
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
              options={colleges.map((r) => ({
                value: String(num(r.fk_college_id)),
                label: txt(r.college_code) || String(num(r.fk_college_id)),
              }))}
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
              options={courseGroups.map((r) => ({
                value: String(num(r.fk_course_group_id)),
                label: txt(r.group_code) || String(num(r.fk_course_group_id)),
              }))}
              disabled={!collegeId}
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Course Year *</Label>
            <Select
              value={courseYearId || null}
              onChange={(v) => setCourseYearId(v ?? '')}
              options={courseYears.map((r) => ({
                value: String(num(r.fk_course_year_id)),
                label: txt(r.course_year_code) || String(num(r.fk_course_year_id)),
              }))}
              disabled={!courseGroupId}
            />
          </div>
          <div className="flex items-end gap-2 md:col-span-2">
            <Button type="button" className="h-8 text-[12px]" onClick={() => void onGetList()} disabled={loading}>
              Get List
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="Reset"
              onClick={() => {
                setRows([])
                setHasFetched(false)
                const c = courses[0]
                if (c) setCourseId(String(num(c.fk_course_id)))
              }}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      rowData={hasFetched ? rows : []}
      columnDefs={kind === 'moderation' ? moderationCols : graceCols}
      loading={loading}
      pagination
      getRowId={getRowId}
      toolbar={{ search: true, searchPlaceholder: 'Search…', exportPdf: false }}
      toolbarTrailing={
        hasFetched && rows.length > 0 ? (
          <Button type="button" size="sm" className="h-9 text-[12px]" onClick={() => window.print()}>
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Print Report
          </Button>
        ) : undefined
      }
    />
  )
}
