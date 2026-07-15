'use client'

/**
 * Assignment Pending List Report — Angular `assignment-pending-list-report`.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColDef } from 'ag-grid-community'
import { Printer, RefreshCw } from 'lucide-react'
import { FilteredListPage } from '@/components/layout'
import { Select, type SelectOption } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toastError } from '@/lib/toast'
import { toast } from 'sonner'
import { fetchTimetableFilterRows, getAssignmentPendingListRows, type AnyRow } from '@/services'

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

function dash(v: unknown): string {
  const s = txt(v)
  return !s || s === 'null' ? '—' : s
}

const COLS: ColDef<Row>[] = [
  { headerName: 'S.No', valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, width: 70, flex: 0 },
  { headerName: 'Assignment', minWidth: 160, flex: 1, valueGetter: (p) => dash(p.data?.assignment_name ?? p.data?.assignment) },
  { headerName: 'Subject', minWidth: 140, flex: 1, valueGetter: (p) => dash(p.data?.subject_name) },
  { headerName: 'Subject Code', minWidth: 110, flex: 0, valueGetter: (p) => dash(p.data?.subject_code) },
  { headerName: 'Employee', minWidth: 140, flex: 1, valueGetter: (p) => dash(p.data?.employee_name ?? p.data?.emp_name) },
  { headerName: 'College', minWidth: 100, flex: 0, valueGetter: (p) => dash(p.data?.college_code) },
  { headerName: 'Course Year', minWidth: 110, flex: 0, valueGetter: (p) => dash(p.data?.course_year_name ?? p.data?.course_year_code) },
  { headerName: 'Description', minWidth: 160, flex: 1, valueGetter: (p) => dash(p.data?.description) },
]

export default function AssignmentPendingListReportPage() {
  const [loading, setLoading] = useState(false)
  const [loadingFilters, setLoadingFilters] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)
  const [filterRows, setFilterRows] = useState<Row[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [collegeId, setCollegeId] = useState('')
  const [academicYearId, setAcademicYearId] = useState('')
  const [courseId, setCourseId] = useState('')
  const [courseGroupId, setCourseGroupId] = useState('')
  const [courseYearId, setCourseYearId] = useState('')
  const [sectionId, setSectionId] = useState('0')

  useEffect(() => {
    async function init() {
      setLoadingFilters(true)
      try {
        const list = await fetchTimetableFilterRows('cls_timtable_filters', 0)
        setFilterRows(Array.isArray(list) ? list : [])
        const colleges = dedupeBy(list, (r) => num(r.fk_college_id ?? r.collegeId))
        if (colleges[0]) setCollegeId(String(num(colleges[0].fk_college_id ?? colleges[0].collegeId)))
      } catch (e) {
        toastError(e, 'Failed to load filters')
      } finally {
        setLoadingFilters(false)
      }
    }
    void init()
  }, [])

  const colleges = useMemo(
    () => dedupeBy(filterRows, (r) => num(r.fk_college_id ?? r.collegeId)),
    [filterRows],
  )
  const academicYears = useMemo(
    () =>
      dedupeBy(
        filterRows.filter((r) => !collegeId || num(r.fk_college_id ?? r.collegeId) === Number(collegeId)),
        (r) => num(r.fk_academic_year_id ?? r.academicYearId),
      ),
    [filterRows, collegeId],
  )
  const courses = useMemo(
    () =>
      dedupeBy(
        filterRows.filter(
          (r) =>
            (!collegeId || num(r.fk_college_id ?? r.collegeId) === Number(collegeId)) &&
            (!academicYearId || num(r.fk_academic_year_id ?? r.academicYearId) === Number(academicYearId)),
        ),
        (r) => num(r.fk_course_id ?? r.courseId),
      ),
    [filterRows, collegeId, academicYearId],
  )
  const courseGroups = useMemo(
    () =>
      dedupeBy(
        filterRows.filter(
          (r) =>
            (!collegeId || num(r.fk_college_id ?? r.collegeId) === Number(collegeId)) &&
            (!courseId || num(r.fk_course_id ?? r.courseId) === Number(courseId)),
        ),
        (r) => num(r.fk_course_group_id ?? r.courseGroupId),
      ),
    [filterRows, collegeId, courseId],
  )
  const courseYears = useMemo(() => {
    const rows = dedupeBy(
      filterRows.filter(
        (r) =>
          (!collegeId || num(r.fk_college_id ?? r.collegeId) === Number(collegeId)) &&
          (!academicYearId || num(r.fk_academic_year_id ?? r.academicYearId) === Number(academicYearId)) &&
          (!courseId || num(r.fk_course_id ?? r.courseId) === Number(courseId)) &&
          (!courseGroupId || num(r.fk_course_group_id ?? r.courseGroupId) === Number(courseGroupId)),
      ),
      (r) => num(r.fk_course_year_id ?? r.courseYearId),
    )
    return rows.sort((a, b) => num(a.year_order ?? a.yearOrder) - num(b.year_order ?? b.yearOrder))
  }, [filterRows, collegeId, academicYearId, courseId, courseGroupId])
  const sections = useMemo(
    () =>
      dedupeBy(
        filterRows.filter(
          (r) =>
            (!collegeId || num(r.fk_college_id ?? r.collegeId) === Number(collegeId)) &&
            (!academicYearId || num(r.fk_academic_year_id ?? r.academicYearId) === Number(academicYearId)) &&
            (!courseId || num(r.fk_course_id ?? r.courseId) === Number(courseId)) &&
            (!courseGroupId || num(r.fk_course_group_id ?? r.courseGroupId) === Number(courseGroupId)) &&
            (!courseYearId || num(r.fk_course_year_id ?? r.courseYearId) === Number(courseYearId)),
        ),
        (r) => num(r.fk_group_section_id ?? r.groupSectionId ?? r.sectionId),
      ),
    [filterRows, collegeId, academicYearId, courseId, courseGroupId, courseYearId],
  )

  useEffect(() => {
    if (!colleges.length) return
    if (!colleges.some((r) => num(r.fk_college_id ?? r.collegeId) === Number(collegeId))) {
      setCollegeId(String(num(colleges[0].fk_college_id ?? colleges[0].collegeId)))
    }
  }, [colleges, collegeId])

  useEffect(() => {
    if (!academicYears.length) return
    if (!academicYears.some((r) => num(r.fk_academic_year_id ?? r.academicYearId) === Number(academicYearId))) {
      setAcademicYearId(String(num(academicYears[0].fk_academic_year_id ?? academicYears[0].academicYearId)))
    }
  }, [academicYears, academicYearId])

  useEffect(() => {
    if (!courses.length) return
    if (!courses.some((r) => num(r.fk_course_id ?? r.courseId) === Number(courseId))) {
      setCourseId(String(num(courses[0].fk_course_id ?? courses[0].courseId)))
    }
  }, [courses, courseId])

  useEffect(() => {
    if (!courseGroups.length) return
    if (!courseGroups.some((r) => num(r.fk_course_group_id ?? r.courseGroupId) === Number(courseGroupId))) {
      setCourseGroupId(String(num(courseGroups[0].fk_course_group_id ?? courseGroups[0].courseGroupId)))
    }
  }, [courseGroups, courseGroupId])

  useEffect(() => {
    if (!courseYears.length) return
    if (!courseYears.some((r) => num(r.fk_course_year_id ?? r.courseYearId) === Number(courseYearId))) {
      setCourseYearId(String(num(courseYears[0].fk_course_year_id ?? courseYears[0].courseYearId)))
    }
  }, [courseYears, courseYearId])

  const sectionOptions: SelectOption[] = useMemo(
    () => [
      { value: '0', label: 'All' },
      ...sections.map((r) => ({
        value: String(num(r.fk_group_section_id ?? r.groupSectionId ?? r.sectionId)),
        // Angular: {{ section.section }}
        label:
          txt(r.section ?? r.section_name ?? r.group_section_name ?? r.sectionName ?? r.groupSectionName) ||
          String(num(r.fk_group_section_id ?? r.groupSectionId ?? r.sectionId)),
      })),
    ],
    [sections],
  )

  async function onGetList() {
    if (!collegeId || !courseYearId) {
      toast.info('Please Select Valid Filters')
      return
    }
    setLoading(true)
    setHasFetched(true)
    try {
      const list = await getAssignmentPendingListRows({
        collegeId: Number(collegeId),
        courseYearId: Number(courseYearId),
        sectionId: Number(sectionId || 0),
      })
      setRows(Array.isArray(list) ? list : [])
      if (!list?.length) toast.info('No Records Found.')
    } catch (e) {
      toastError(e, 'Failed to load assignment pending list')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  const getRowId = useCallback(
    (p: { data?: Row; node?: { rowIndex?: number | null } }) =>
      `row-${p.node?.rowIndex ?? 0}-${txt(p.data?.assignment_name)}-${txt(p.data?.subject_code)}`,
    [],
  )

  return (
    <FilteredListPage
      title="Assignment Pending List"
      filters={(
        <div className="space-y-2">
          <div className="grid grid-cols-1 items-end gap-2 md:grid-cols-12">
            <div className="space-y-1 md:col-span-2">
              <Label>College *</Label>
              <Select
                value={collegeId || null}
                onChange={(v) => setCollegeId(v ?? '')}
                options={colleges.map((r) => ({
                  value: String(num(r.fk_college_id ?? r.collegeId)),
                  label: txt(r.college_code ?? r.collegeCode) || String(num(r.fk_college_id)),
                }))}
                isLoading={loadingFilters}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Academic Year *</Label>
              <Select
                value={academicYearId || null}
                onChange={(v) => setAcademicYearId(v ?? '')}
                options={academicYears.map((r) => ({
                  value: String(num(r.fk_academic_year_id ?? r.academicYearId)),
                  label: txt(r.academic_year ?? r.academicYear) || String(num(r.fk_academic_year_id)),
                }))}
                disabled={!collegeId}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Course *</Label>
              <Select
                value={courseId || null}
                onChange={(v) => setCourseId(v ?? '')}
                options={courses.map((r) => ({
                  value: String(num(r.fk_course_id ?? r.courseId)),
                  label: txt(r.course_code ?? r.courseCode) || String(num(r.fk_course_id)),
                }))}
                disabled={!academicYearId}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Course Group *</Label>
              <Select
                value={courseGroupId || null}
                onChange={(v) => setCourseGroupId(v ?? '')}
                options={courseGroups.map((r) => ({
                  value: String(num(r.fk_course_group_id ?? r.courseGroupId)),
                  label: txt(r.group_code ?? r.groupCode) || String(num(r.fk_course_group_id)),
                }))}
                disabled={!courseId}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Course Year *</Label>
              <Select
                value={courseYearId || null}
                onChange={(v) => setCourseYearId(v ?? '')}
                options={courseYears.map((r) => ({
                  value: String(num(r.fk_course_year_id ?? r.courseYearId)),
                  label:
                    txt(r.course_year_name ?? r.courseYearName ?? r.course_year_code ?? r.courseYearCode) ||
                    String(num(r.fk_course_year_id ?? r.courseYearId)),
                }))}
                disabled={!courseGroupId}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 items-end gap-2 md:grid-cols-12">
            <div className="space-y-1 md:col-span-2">
              <Label>Section</Label>
              <Select value={sectionId} onChange={(v) => setSectionId(v ?? '0')} options={sectionOptions} />
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
                  setSectionId('0')
                }}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
      rowData={hasFetched ? rows : []}
      columnDefs={COLS}
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
