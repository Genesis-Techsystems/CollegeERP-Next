'use client'

/**
 * Subject Wise Result Report — Angular `subjectwise-result-report`.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColDef } from 'ag-grid-community'
import { format, parseISO } from 'date-fns'
import { Printer, RefreshCw } from 'lucide-react'
import { FilteredListPage } from '@/components/layout'
import { Select } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toastError } from '@/lib/toast'
import { toast } from 'sonner'
import {
  getSubjectWiseResultReport,
  getUnivExamFiltersRegSup,
  getUnivExamRestInRegExamStd,
  getUnivExamSubjectUc,
  type AnyRow,
} from '@/services'

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

function dash(v: unknown): string {
  const s = txt(v)
  return !s || s === 'null' ? '—' : s
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

const COL_DEFS: ColDef<Row>[] = [
  { headerName: 'S.No', valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, width: 70, flex: 0 },
  {
    headerName: 'Hall Ticket',
    minWidth: 130,
    flex: 0,
    valueGetter: (p) => dash(p.data?.hallticket_number ?? p.data?.hallticket_no ?? p.data?.rollNumber),
  },
  {
    headerName: 'Student Name',
    minWidth: 200,
    flex: 1,
    valueGetter: (p) => dash(p.data?.student_name ?? p.data?.studentName ?? p.data?.firstName),
  },
  {
    headerName: 'Marks',
    minWidth: 90,
    flex: 0,
    valueGetter: (p) => dash(p.data?.marks ?? p.data?.external_marks ?? p.data?.total_marks),
  },
]

export default function SubjectwiseResultReportPage() {
  const [loading, setLoading] = useState(false)
  const [loadingFilters, setLoadingFilters] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)
  const [employeeId, setEmployeeId] = useState(0)
  const [baseRows, setBaseRows] = useState<Row[]>([])
  const [restRows, setRestRows] = useState<Row[]>([])
  const [regulations, setRegulations] = useState<Row[]>([])
  const [subjectRows, setSubjectRows] = useState<Row[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [courseId, setCourseId] = useState('')
  const [academicYearId, setAcademicYearId] = useState('')
  const [examId, setExamId] = useState('')
  const [collegeId, setCollegeId] = useState('')
  const [courseGroupId, setCourseGroupId] = useState('')
  const [courseYearId, setCourseYearId] = useState('')
  const [regulationId, setRegulationId] = useState('0')
  const [subjectId, setSubjectId] = useState('0')

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

  const regulationOptions = useMemo(() => {
    const fromBundle = dedupeBy(regulations, (r) => num(r.fk_regulation_id))
    const fromRest = dedupeBy(
      restRows.filter((r) => num(r.fk_regulation_id) > 0),
      (r) => num(r.fk_regulation_id),
    )
    const source = fromBundle.length ? fromBundle : fromRest
    return [{ value: '0', label: 'All' }, ...source.map((r) => ({
      value: String(num(r.fk_regulation_id)),
      label: txt(r.regulation_code) || String(num(r.fk_regulation_id)),
    }))]
  }, [regulations, restRows])

  const subjectOptions = useMemo(() => {
    const fromRest = dedupeBy(
      restRows.filter((r) => num(r.fk_subject_id) > 0),
      (r) => num(r.fk_subject_id),
    )
    const source = subjectRows.length ? subjectRows : fromRest
    return source.map((r) => ({
      value: String(num(r.fk_subject_id)),
      label:
        [txt(r.subject_code), txt(r.subject_name)].filter(Boolean).join(' - ') ||
        String(num(r.fk_subject_id)),
    }))
  }, [subjectRows, restRows])

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
        setRegulations([])
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
        setRegulations(Array.isArray(bundle.regulations) ? bundle.regulations : [])
        setCollegeId('')
        setCourseGroupId('')
        setCourseYearId('')
        setSubjectId('0')
        setSubjectRows([])
        setRows([])
        setHasFetched(false)
      } catch (e) {
        toastError(e, 'Failed to load filters')
        setRestRows([])
        setRegulations([])
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

  useEffect(() => {
    async function loadSubjects() {
      if (!collegeId || !courseGroupId || !courseYearId || !examId || !courseId || !academicYearId || !employeeId) {
        setSubjectRows([])
        return
      }
      try {
        const list = await getUnivExamSubjectUc({
          collegeId: Number(collegeId),
          courseId: Number(courseId),
          courseGroupId: Number(courseGroupId),
          courseYearId: Number(courseYearId),
          examId: Number(examId),
          academicYearId: Number(academicYearId),
          regulationId: Number(regulationId || 0),
          employeeId,
        })
        setSubjectRows(Array.isArray(list) ? list : [])
      } catch {
        setSubjectRows([])
      }
    }
    void loadSubjects()
  }, [collegeId, courseGroupId, courseYearId, examId, courseId, academicYearId, regulationId, employeeId])

  useEffect(() => {
    if (!subjectOptions.length) {
      setSubjectId('0')
      return
    }
    if (!subjectOptions.some((o) => o.value === subjectId)) {
      setSubjectId(subjectOptions[0].value)
    }
  }, [subjectOptions, subjectId])

  async function onGetList() {
    if (!courseId || !examId || !collegeId || !courseGroupId || !courseYearId) {
      toast.info('Please Select Valid Filters')
      return
    }
    if (subjectOptions.length > 0 && (!subjectId || subjectId === '0')) {
      toast.info('Please Select Subject')
      return
    }
    setLoading(true)
    setHasFetched(true)
    try {
      const list = await getSubjectWiseResultReport({
        examId: Number(examId),
        collegeId: Number(collegeId),
        courseId: Number(courseId),
        courseGroupId: Number(courseGroupId),
        courseYearId: Number(courseYearId),
        subjectId: Number(subjectId || 0),
        regulationId: Number(regulationId || 0),
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
      `row-${p.node?.rowIndex ?? 0}-${txt(p.data?.rollNumber)}-${txt(p.data?.studentId)}`,
    [],
  )

  return (
    <FilteredListPage
      title="Subject Wise Result Report"
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
          <div className="space-y-1 md:col-span-3">
            <Label>Exam Master *</Label>
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
          <div className="space-y-1 md:col-span-2">
            <Label>Regulation</Label>
            <Select
              value={regulationId}
              onChange={(v) => setRegulationId(v ?? '0')}
              options={regulationOptions}
              disabled={!courseYearId}
            />
          </div>
          <div className="space-y-1 md:col-span-3">
            <Label>Subject{subjectOptions.length ? ' *' : ''}</Label>
            <Select
              value={subjectOptions.length ? subjectId || null : '0'}
              onChange={(v) => setSubjectId(v ?? '0')}
              options={subjectOptions.length ? subjectOptions : [{ value: '0', label: 'All Subjects' }]}
              searchable
              wrapOptionLabels
              disabled={!courseYearId}
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
                setSubjectId('0')
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
      columnDefs={COL_DEFS}
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
