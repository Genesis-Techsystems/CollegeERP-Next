'use client'

/**
 * Final Marks Pre Moderation Report — Angular `final-marks-premoderation`.
 * Filters: Course, Exam Year, Exam Master, College, Course Group, Course Year,
 * Regulation, Subject.
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
  getExamPreModerationReport,
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

function subjectLabel(r: Row): string {
  const name = txt(r.subject_name) || 'Subject'
  const code = txt(r.subject_code)
  return code ? `${name} (${code})` : name
}

/** Angular: Object.keys then splice(0,1), splice(1,1), splice(2,1). */
function angularDisplayKeys(firstRow: Row): string[] {
  const keys = Object.keys(firstRow)
  keys.splice(0, 1)
  keys.splice(1, 1)
  keys.splice(2, 1)
  return keys
}

function buildPreModerationCols(firstRow: Row): ColDef<Row>[] {
  const keys = angularDisplayKeys(firstRow)
  if (!keys.length) {
    return [{ headerName: 'S.No', valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, width: 70, flex: 0 }]
  }
  return [
    { headerName: 'S.No', valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, width: 70, flex: 0 },
    ...keys.map(
      (key): ColDef<Row> => ({
        headerName: key.replace(/_/g, ' '),
        minWidth: 110,
        flex: key.toLowerCase().includes('name') || key.toLowerCase().includes('subject') ? 1 : 0,
        valueGetter: (p) => dash(p.data?.[key]),
      }),
    ),
  ]
}

export default function FinalMarksPremoderationReportPage() {
  const [loading, setLoading] = useState(false)
  const [loadingFilters, setLoadingFilters] = useState(false)
  const [loadingSubjects, setLoadingSubjects] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)
  const [employeeId, setEmployeeId] = useState(0)
  const [baseRows, setBaseRows] = useState<Row[]>([])
  const [restRows, setRestRows] = useState<Row[]>([])
  const [regulationRows, setRegulationRows] = useState<Row[]>([])
  const [subjectRows, setSubjectRows] = useState<Row[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [courseId, setCourseId] = useState('')
  const [academicYearId, setAcademicYearId] = useState('')
  const [examId, setExamId] = useState('')
  const [collegeId, setCollegeId] = useState('')
  const [courseGroupId, setCourseGroupId] = useState('')
  const [courseYearId, setCourseYearId] = useState('')
  const [regulationId, setRegulationId] = useState('')
  const [subjectId, setSubjectId] = useState('')

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

  // Angular `selectedYear`: regulations from rest filters for the selected course (fallback: regulations flag)
  const regulations = useMemo(() => {
    const fromRest = dedupeBy(
      restRows.filter((r) => num(r.fk_course_id) === Number(courseId) && num(r.fk_regulation_id) > 0),
      (r) => num(r.fk_regulation_id),
    )
    if (fromRest.length) return fromRest
    return dedupeBy(
      regulationRows.filter((r) => num(r.fk_regulation_id) > 0),
      (r) => num(r.fk_regulation_id),
    )
  }, [restRows, regulationRows, courseId])

  const subjects = useMemo(() => dedupeBy(subjectRows, (r) => num(r.fk_subject_id)), [subjectRows])

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
        setRegulationId('')
        setSubjectId('')
        setSubjectRows([])
        setRows([])
        setHasFetched(false)
      } catch (e) {
        toastError(e, 'Failed to load filters')
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
    if (!colleges.some((r) => num(r.fk_college_id) === Number(collegeId))) {
      setCollegeId(String(num(colleges[0].fk_college_id)))
      setCourseGroupId('')
      setCourseYearId('')
      setRegulationId('')
      setSubjectId('')
      setSubjectRows([])
    }
  }, [colleges, collegeId])

  useEffect(() => {
    if (!courseGroups.length) return
    if (!courseGroups.some((r) => num(r.fk_course_group_id) === Number(courseGroupId))) {
      setCourseGroupId(String(num(courseGroups[0].fk_course_group_id)))
      setCourseYearId('')
      setRegulationId('')
      setSubjectId('')
      setSubjectRows([])
    }
  }, [courseGroups, courseGroupId])

  useEffect(() => {
    if (!courseYears.length) return
    if (!courseYears.some((r) => num(r.fk_course_year_id) === Number(courseYearId))) {
      setCourseYearId(String(num(courseYears[0].fk_course_year_id)))
      setRegulationId('')
      setSubjectId('')
      setSubjectRows([])
    }
  }, [courseYears, courseYearId])

  useEffect(() => {
    if (!regulations.length) return
    if (!regulations.some((r) => num(r.fk_regulation_id) === Number(regulationId))) {
      setRegulationId(String(num(regulations[0].fk_regulation_id)))
      setSubjectId('')
      setSubjectRows([])
    }
  }, [regulations, regulationId])

  useEffect(() => {
    async function loadSubjects() {
      if (
        !collegeId ||
        !courseId ||
        !courseGroupId ||
        !courseYearId ||
        !examId ||
        !academicYearId ||
        !regulationId ||
        !employeeId
      ) {
        setSubjectRows([])
        setSubjectId('')
        return
      }
      setLoadingSubjects(true)
      try {
        const list = await getUnivExamSubjectUc({
          collegeId: Number(collegeId),
          courseId: Number(courseId),
          courseGroupId: Number(courseGroupId),
          courseYearId: Number(courseYearId),
          examId: Number(examId),
          academicYearId: Number(academicYearId),
          regulationId: Number(regulationId),
          employeeId,
        })
        const subjectsList = Array.isArray(list) ? list : []
        setSubjectRows(subjectsList)
        const first = dedupeBy(subjectsList, (r) => num(r.fk_subject_id))[0]
        setSubjectId(first ? String(num(first.fk_subject_id)) : '')
        setRows([])
        setHasFetched(false)
      } catch (e) {
        toastError(e, 'Failed to load subjects')
        setSubjectRows([])
        setSubjectId('')
      } finally {
        setLoadingSubjects(false)
      }
    }
    void loadSubjects()
  }, [
    collegeId,
    courseId,
    courseGroupId,
    courseYearId,
    examId,
    academicYearId,
    regulationId,
    employeeId,
  ])

  async function onGetList() {
    if (!courseId || !examId || !collegeId || !courseGroupId || !courseYearId || !regulationId || !subjectId) {
      toast.info('Please Select Valid Filters')
      return
    }
    setLoading(true)
    setHasFetched(true)
    try {
      // Angular Get Reports: course_year_id is always 0; regulation + subject drive the dataset
      const list = await getExamPreModerationReport({
        examId: Number(examId),
        collegeId: Number(collegeId),
        courseGroupId: Number(courseGroupId),
        courseYearId: 0,
        regulationId: Number(regulationId),
        subjectId: Number(subjectId),
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

  const columnDefs = useMemo<ColDef<Row>[]>(() => {
    if (rows.length > 0) return buildPreModerationCols(rows[0])
    return [
      { headerName: 'S.No', valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, width: 70, flex: 0 },
      { headerName: 'Program Code', minWidth: 110, flex: 0, valueGetter: () => '—' },
      { headerName: 'Semester', minWidth: 120, flex: 0, valueGetter: () => '—' },
      { headerName: 'Hall Ticket', minWidth: 130, flex: 0, valueGetter: () => '—' },
      { headerName: 'Name', minWidth: 180, flex: 1, valueGetter: () => '—' },
      { headerName: 'Course', minWidth: 180, flex: 1, valueGetter: () => '—' },
      { headerName: 'Course code', minWidth: 120, flex: 0, valueGetter: () => '—' },
      { headerName: 'Exam Type', minWidth: 100, flex: 0, valueGetter: () => '—' },
      { headerName: 'External Appeared', minWidth: 120, flex: 0, valueGetter: () => '—' },
      { headerName: 'External marks', minWidth: 110, flex: 0, valueGetter: () => '—' },
      { headerName: 'Internal marks', minWidth: 110, flex: 0, valueGetter: () => '—' },
    ]
  }, [rows])

  const getRowId = useCallback(
    (p: { data?: Row; node?: { rowIndex?: number | null } }) =>
      `row-${p.node?.rowIndex ?? 0}-${txt(p.data?.hallticket_number ?? p.data?.Hall_Ticket)}-${txt(p.data?.Course_code)}`,
    [],
  )

  return (
    <FilteredListPage
      title="Final Marks Pre Moderation Report"
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
                setRegulationId('')
                setSubjectId('')
                setSubjectRows([])
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
                setRegulationId('')
                setSubjectId('')
                setSubjectRows([])
              }}
              options={courseGroups.map((r) => ({
                value: String(num(r.fk_course_group_id)),
                label: txt(r.group_code) || String(num(r.fk_course_group_id)),
              }))}
              disabled={!collegeId}
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Course Years *</Label>
            <Select
              value={courseYearId || null}
              onChange={(v) => {
                setCourseYearId(v ?? '')
                setRegulationId('')
                setSubjectId('')
                setSubjectRows([])
              }}
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
              value={regulationId || null}
              onChange={(v) => {
                setRegulationId(v ?? '')
                setSubjectId('')
                setSubjectRows([])
              }}
              options={regulations.map((r) => ({
                value: String(num(r.fk_regulation_id)),
                label: txt(r.regulation_code) || String(num(r.fk_regulation_id)),
              }))}
              disabled={!courseYearId}
              isLoading={loadingFilters}
            />
          </div>
          <div className="space-y-1 md:col-span-4">
            <Label>Subject *</Label>
            <Select
              value={subjectId || null}
              onChange={(v) => setSubjectId(v ?? '')}
              options={subjects.map((r) => ({
                value: String(num(r.fk_subject_id)),
                label: subjectLabel(r),
              }))}
              searchable
              wrapOptionLabels
              disabled={!regulationId}
              isLoading={loadingSubjects}
            />
          </div>
          <div className="flex items-end gap-2 md:col-span-2">
            <Button type="button" className="h-8 text-[12px]" onClick={() => void onGetList()} disabled={loading}>
              Get Reports
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
                setSubjectId('')
                setSubjectRows([])
                setRegulationId('')
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
      columnDefs={columnDefs}
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
