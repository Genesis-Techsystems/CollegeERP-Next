'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { Select } from '@/common/components/select'
import { FilteredListPage } from '@/components/layout'
import { toastError } from '@/lib/toast'
import {
  getUnivCurrFilters,
  listGroupYearRegulationDetails,
} from '@/services'

type AnyRow = Record<string, any>

const n = (v: unknown) => Number(v) || 0
const s = (v: unknown) => {
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  return ''
}
const uniq = (rows: AnyRow[], key: string) => {
  const seen = new Set<number>()
  return rows.filter((r) => {
    const id = n(r[key])
    if (!id || seen.has(id)) return false
    seen.add(id)
    return true
  })
}

type ActionCtx = {
  collegeId: number | null
  courseId: number | null
  regulationId: number | null
  courseGroupId: number | null
  courseYearId: number | null
  collegeCode: string
  courseCode: string
  courseGroupCode: string
  courseYearName: string
}

/** Angular `assignUnits` / `assignLessonPlanning` query params. */
function buildSubjectActionQs(row: AnyRow, ctx: ActionCtx): string | null {
  const subjectId = n(row.subjectId ?? row.fk_subject_id ?? row.pk_subject_id)
  if (!subjectId || !ctx.collegeId || !ctx.courseId || !ctx.regulationId || !ctx.courseGroupId || !ctx.courseYearId) {
    return null
  }
  const qs = new URLSearchParams({
    collegeName: ctx.collegeCode,
    collegeId: String(ctx.collegeId),
    regulationCode: s(row.regulationCode ?? row.regulation_code),
    subjectId: String(subjectId),
    regulationId: String(ctx.regulationId),
    courseYearId: String(n(row.courseYearId) || ctx.courseYearId),
    courseGroupId: String(n(row.courseGroupId) || ctx.courseGroupId),
    courseId: String(ctx.courseId),
    courseGroupName: ctx.courseGroupCode,
    // Angular lesson-planning reads `groupName` (legacy); keep both.
    groupName: ctx.courseGroupCode,
    courseYearName: ctx.courseYearName,
    courseCode: ctx.courseCode,
    subjectName: s(row.subjectName ?? row.subject_name),
  })
  return qs.toString()
}

function makeActionsRenderer(ctx: ActionCtx) {
  return (p: ICellRendererParams<AnyRow>) => {
    const row = p.data ?? {}
    const qs = buildSubjectActionQs(row, ctx)
    if (!qs) return <span className="text-xs text-muted-foreground">—</span>
    const unitsHref = `/academics/subject-mapping/add-subject-units?${qs}`
    const lessonHref = `/academics/subject-mapping/assign-subject-units/assign-lesson-planning?${qs}`
    return (
      <div className="text-xs inline-flex max-w-full flex-nowrap items-center gap-x-1.5 whitespace-nowrap">
        <Link href={unitsHref} className="shrink-0 text-blue-700 font-medium hover:underline">
          Assign Units
        </Link>
        <span className="shrink-0 text-muted-foreground">|</span>
        <Link href={lessonHref} className="shrink-0 text-blue-700 font-medium hover:underline">
          Assign Lesson Planning
        </Link>
      </div>
    )
  }
}

export default function SubjectUnitTopicsPage() {
  const searchParams = useSearchParams()
  const pageParamsApplied = useRef(false)

  const [filtersData, setFiltersData] = useState<AnyRow[]>([])
  const [loading, setLoading] = useState(false)

  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [courseId, setCourseId] = useState<number | null>(null)
  const [regulationId, setRegulationId] = useState<number | null>(null)
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null)
  const [courseYearId, setCourseYearId] = useState<number | null>(null)

  const [rows, setRows] = useState<AnyRow[]>([])

  const pageParams = useMemo(() => ({
    collegeId: n(searchParams.get('collegeId')),
    courseId: n(searchParams.get('courseId')),
    regulationId: n(searchParams.get('regulationId')),
    courseGroupId: n(searchParams.get('courseGroupId')),
    courseYearId: n(searchParams.get('courseYearId')),
  }), [searchParams])

  useEffect(() => {
    const orgId = Number(localStorage.getItem('organizationId') ?? 0)
    const empId = Number(localStorage.getItem('employeeId') ?? 0)
    getUnivCurrFilters(orgId, empId)
      .then((d) => setFiltersData(d.filtersData))
      .catch(() => setFiltersData([]))
  }, [])

  const colleges = useMemo(
    () => uniq(filtersData, 'fk_college_id').sort((a, b) => n(a.clg_sort_order) - n(b.clg_sort_order)),
    [filtersData],
  )
  const courses = useMemo(
    () => uniq(filtersData.filter((r) => n(r.fk_college_id) === (collegeId ?? 0)), 'fk_course_id'),
    [filtersData, collegeId],
  )
  const regulations = useMemo(
    () =>
      uniq(
        filtersData.filter(
          (r) => n(r.fk_college_id) === (collegeId ?? 0) && n(r.fk_course_id) === (courseId ?? 0),
        ),
        'fk_regulation_id',
      ),
    [filtersData, collegeId, courseId],
  )
  const courseGroups = useMemo(
    () =>
      uniq(
        filtersData.filter(
          (r) =>
            n(r.fk_college_id) === (collegeId ?? 0)
            && n(r.fk_course_id) === (courseId ?? 0)
            && n(r.fk_regulation_id) === (regulationId ?? 0),
        ),
        'fk_course_group_id',
      ),
    [filtersData, collegeId, courseId, regulationId],
  )
  const courseYears = useMemo(
    () =>
      uniq(
        filtersData.filter(
          (r) =>
            n(r.fk_college_id) === (collegeId ?? 0)
            && n(r.fk_course_id) === (courseId ?? 0)
            && n(r.fk_regulation_id) === (regulationId ?? 0)
            && n(r.fk_course_group_id) === (courseGroupId ?? 0),
        ),
        'fk_course_year_id',
      ).sort((a, b) => n(a.year_order) - n(b.year_order)),
    [filtersData, collegeId, courseId, regulationId, courseGroupId],
  )

  // Angular cascade + optional return query params from Assign Units / Lesson Planning Back
  useEffect(() => {
    if (!colleges.length || collegeId) return
    if (pageParams.collegeId && colleges.some((c) => n(c.fk_college_id) === pageParams.collegeId)) {
      setCollegeId(pageParams.collegeId)
      return
    }
    setCollegeId(n(colleges[0].fk_college_id))
  }, [colleges, collegeId, pageParams.collegeId])

  useEffect(() => {
    setCourseId(null)
    setRegulationId(null)
    setCourseGroupId(null)
    setCourseYearId(null)
    setRows([])
  }, [collegeId])

  useEffect(() => {
    if (!courses.length || courseId) return
    if (pageParams.courseId && courses.some((c) => n(c.fk_course_id) === pageParams.courseId)) {
      setCourseId(pageParams.courseId)
      return
    }
    setCourseId(n(courses[0].fk_course_id))
  }, [courses, courseId, pageParams.courseId])

  useEffect(() => {
    setRegulationId(null)
    setCourseGroupId(null)
    setCourseYearId(null)
    setRows([])
  }, [courseId])

  useEffect(() => {
    if (!regulations.length || regulationId) return
    if (pageParams.regulationId && regulations.some((r) => n(r.fk_regulation_id) === pageParams.regulationId)) {
      setRegulationId(pageParams.regulationId)
      return
    }
    setRegulationId(n(regulations[0].fk_regulation_id))
  }, [regulations, regulationId, pageParams.regulationId])

  useEffect(() => {
    setCourseGroupId(null)
    setCourseYearId(null)
    setRows([])
  }, [regulationId])

  useEffect(() => {
    if (!courseGroups.length || courseGroupId) return
    if (pageParams.courseGroupId && courseGroups.some((g) => n(g.fk_course_group_id) === pageParams.courseGroupId)) {
      setCourseGroupId(pageParams.courseGroupId)
      return
    }
    setCourseGroupId(n(courseGroups[0].fk_course_group_id))
  }, [courseGroups, courseGroupId, pageParams.courseGroupId])

  useEffect(() => {
    setCourseYearId(null)
    setRows([])
  }, [courseGroupId])

  useEffect(() => {
    if (!courseYears.length || courseYearId) return
    if (pageParams.courseYearId && courseYears.some((y) => n(y.fk_course_year_id) === pageParams.courseYearId)) {
      setCourseYearId(pageParams.courseYearId)
      pageParamsApplied.current = true
      return
    }
    setCourseYearId(n(courseYears[0].fk_course_year_id))
    pageParamsApplied.current = true
  }, [courseYears, courseYearId, pageParams.courseYearId])

  useEffect(() => {
    async function loadSubjects() {
      if (!courseGroupId || !courseYearId || !regulationId) {
        setRows([])
        return
      }
      setLoading(true)
      try {
        const list = await listGroupYearRegulationDetails({
          coursegroupId: courseGroupId,
          courseyearId: courseYearId,
          regulationId,
        })
        setRows(
          (Array.isArray(list) ? list : []).map((row) => ({
            ...row,
            subjectCode: s(row.subjectCode ?? row.subject_code),
            subjectName: s(row.subjectName ?? row.subject_name),
            subjecttypeName: s(
              row.subjecttypeName
              ?? row.subjectTypeName
              ?? row.subjecttypeCode
              ?? row.subjectTypeCode
              ?? row.subjectType,
            ),
            regulationCode: s(row.regulationCode ?? row.regulation_code ?? row.regulationName),
            subjectId: n(row.subjectId ?? row.fk_subject_id ?? row.pk_subject_id),
            courseYearId: n(row.courseYearId) || courseYearId,
            courseGroupId: n(row.courseGroupId) || courseGroupId,
          })),
        )
      } catch {
        setRows([])
        toastError('Failed to load subjects')
      } finally {
        setLoading(false)
      }
    }
    void loadSubjects()
  }, [courseGroupId, courseYearId, regulationId])

  const collegeCode = useMemo(
    () => s(colleges.find((x) => n(x.fk_college_id) === (collegeId ?? 0))?.college_code),
    [colleges, collegeId],
  )
  const courseCode = useMemo(
    () => s(courses.find((x) => n(x.fk_course_id) === (courseId ?? 0))?.course_code),
    [courses, courseId],
  )
  const courseGroupCode = useMemo(
    () => s(courseGroups.find((x) => n(x.fk_course_group_id) === (courseGroupId ?? 0))?.group_code),
    [courseGroups, courseGroupId],
  )
  const courseYearName = useMemo(
    () =>
      s(
        courseYears.find((x) => n(x.fk_course_year_id) === (courseYearId ?? 0))?.course_year_name
          ?? courseYears.find((x) => n(x.fk_course_year_id) === (courseYearId ?? 0))?.course_year_code,
      ),
    [courseYears, courseYearId],
  )

  const contextLine = useMemo(() => {
    if (!courseYearId) return ''
    return [collegeCode, courseCode, courseGroupCode, courseYearName].filter(Boolean).join(' / ')
  }, [collegeCode, courseCode, courseGroupCode, courseYearName, courseYearId])

  const actionCtx: ActionCtx = useMemo(
    () => ({
      collegeId,
      courseId,
      regulationId,
      courseGroupId,
      courseYearId,
      collegeCode,
      courseCode,
      courseGroupCode,
      courseYearName,
    }),
    [
      collegeId,
      courseId,
      regulationId,
      courseGroupId,
      courseYearId,
      collegeCode,
      courseCode,
      courseGroupCode,
      courseYearName,
    ],
  )

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      {
        headerName: 'SI.No',
        valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
        width: 70,
        flex: 0,
        sortable: false,
        filter: false,
      },
      { field: 'subjectCode', headerName: 'Subject Code', minWidth: 120, flex: 0.8 },
      { field: 'subjectName', headerName: 'Subject', minWidth: 240, flex: 1.5 },
      { field: 'subjecttypeName', headerName: 'Subject Type', minWidth: 120, flex: 0.8 },
      { field: 'regulationCode', headerName: 'Regulation', minWidth: 120, flex: 0.8 },
      {
        headerName: 'Actions',
        minWidth: 260,
        flex: 1.2,
        sortable: false,
        filter: false,
        cellRenderer: makeActionsRenderer(actionCtx),
      },
    ],
    [actionCtx],
  )

  return (
    <FilteredListPage
      title="Subject Unit Topics"
      filters={(
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <Select
            label="College *"
            value={collegeId ? String(collegeId) : null}
            onChange={(v) => setCollegeId(v ? Number(v) : null)}
            options={colleges.map((x) => ({ value: String(n(x.fk_college_id)), label: s(x.college_code) }))}
            searchable
          />
          <Select
            label="Course *"
            value={courseId ? String(courseId) : null}
            onChange={(v) => setCourseId(v ? Number(v) : null)}
            options={courses.map((x) => ({ value: String(n(x.fk_course_id)), label: s(x.course_code) }))}
            searchable
            disabled={!collegeId}
          />
          <Select
            label="Regulation *"
            value={regulationId ? String(regulationId) : null}
            onChange={(v) => setRegulationId(v ? Number(v) : null)}
            options={regulations.map((x) => ({
              value: String(n(x.fk_regulation_id)),
              label: s(x.regulation_code) || s(x.regulation_name),
            }))}
            searchable
            disabled={!courseId}
          />
          <Select
            label="Course Group *"
            value={courseGroupId ? String(courseGroupId) : null}
            onChange={(v) => setCourseGroupId(v ? Number(v) : null)}
            options={courseGroups.map((x) => ({
              value: String(n(x.fk_course_group_id)),
              label: s(x.group_code),
            }))}
            searchable
            disabled={!regulationId}
          />
          <Select
            label="Course Year *"
            value={courseYearId ? String(courseYearId) : null}
            onChange={(v) => setCourseYearId(v ? Number(v) : null)}
            options={courseYears.map((x) => ({
              value: String(n(x.fk_course_year_id)),
              label: s(x.course_year_name) || s(x.course_year_code),
            }))}
            searchable
            disabled={!courseGroupId}
          />
        </div>
      )}
      notice={contextLine ? (
        <div className="px-1 text-[13px] text-blue-700 font-semibold">{contextLine}</div>
      ) : undefined}
      rowData={rows}
      columnDefs={columnDefs}
      loading={loading}
      toolbar={{ search: true, searchPlaceholder: 'Search' }}
      pagination
      paginationPageSize={10}
    />
  )
}
