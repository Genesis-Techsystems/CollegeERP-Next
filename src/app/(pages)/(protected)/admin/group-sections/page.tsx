'use client'
import { useEffect, useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { PencilIcon, PlusIcon } from 'lucide-react'
import { DataTable } from '@/common/components/table'
import { StatusBadge } from '@/common/components/data-display'
import { Select } from '@/common/components/select'
import { useBreadcrumbLabel } from '@/common/components/breadcrumb'
import { GlobalFilterBar } from '@/common/components/forms'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { useQuery } from '@tanstack/react-query'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import {
  getExamMasterCollegeFilters,
  listGroupSectionsByFilters,
} from '@/services'
import type { GroupSection } from '@/types/group-section'
import GroupSectionModal from './GroupSectionModal'

const COLS = {
  siNo: { colId: 'siNo', headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<GroupSection>,
  courseGroup: { colId: 'courseGroup', headerName: 'Course group', minWidth: 150, flex: 1 } as ColDef<GroupSection>,
  courseYear: { colId: 'courseYear', headerName: 'course year', minWidth: 130, flex: 1 } as ColDef<GroupSection>,
  academicYear: { colId: 'academicYear', headerName: 'Acadamic year', minWidth: 140, flex: 1 } as ColDef<GroupSection>,
  section: { colId: 'section', headerName: 'section', minWidth: 160, flex: 1.1 } as ColDef<GroupSection>,
  sortOrder: { colId: 'sortOrder', headerName: 'sort order', minWidth: 110, flex: 0.8 } as ColDef<GroupSection>,
  isActive: { colId: 'isActive', field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.7 } as ColDef<GroupSection>,
  actions: { colId: 'actions', headerName: 'action', minWidth: 86, width: 86, flex: 0 } as ColDef<GroupSection>,
}
function pick(r: Record<string, unknown>, keys: string[]) { for (const k of keys) { const v = r[k]; if (typeof v === 'string' && v.trim()) return v } return '' }
function numPick(r: Record<string, unknown>, keys: string[]) {
  for (const k of keys) {
    const v = r[k]
    const n = typeof v === 'number' ? v : Number(v)
    if (Number.isFinite(n) && n > 0) return n
  }
  return 0
}
function statusRenderer(p: ICellRendererParams<GroupSection>) { return <StatusBadge status={p.data?.isActive ?? false} /> }
function actionRenderer(setRow: (r: GroupSection | null) => void, setOpen: (b: boolean) => void) { return (p: ICellRendererParams<GroupSection>) => <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setRow(p.data ?? null); setOpen(true) }}><PencilIcon className="h-3.5 w-3.5" /></Button> }

export default function GroupSectionsPage() {
  useBreadcrumbLabel('Section')

  const [open, setOpen] = useState(false)
  const [row, setRow] = useState<GroupSection | null>(null)

  // Filters (Angular parity behavior)
  const [universityId, setUniversityId] = useState<number | null>(null)
  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [courseId, setCourseId] = useState<number | null>(null)
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null)
  const [courseYearId, setCourseYearId] = useState<number | null>(null)

  const orgId = Number(globalThis?.localStorage?.getItem('organizationId') ?? 0)
  const empId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)

  const filtersQuery = useQuery({
    queryKey: QK.collegeFilters.byUser(orgId, empId),
    queryFn: () => getExamMasterCollegeFilters(orgId, empId),
    enabled: orgId > 0 && empId > 0,
    staleTime: 5 * 60 * 1000,
  })

  const filtersData = filtersQuery.data?.filtersData ?? []
  const academicData = filtersQuery.data?.academicData ?? []

  const universities = useMemo(() => {
    const seen = new Set<number>()
    const out: any[] = []
    for (const row of filtersData as any[]) {
      const id = Number(row?.fk_university_id ?? 0)
      if (!id || seen.has(id)) continue
      seen.add(id)
      out.push(row)
    }
    return out
  }, [filtersData])

  const colleges = useMemo(() => {
    if (!universityId) return []
    const rows = (filtersData as any[]).filter((r) => Number(r?.fk_university_id ?? 0) === universityId)
    const seen = new Set<number>()
    const out: any[] = []
    for (const row of rows) {
      const id = Number(row?.fk_college_id ?? 0)
      if (!id || seen.has(id)) continue
      seen.add(id)
      out.push(row)
    }
    return out.sort((a, b) => Number(a?.clg_sort_order ?? 0) - Number(b?.clg_sort_order ?? 0))
  }, [filtersData, universityId])

  const academicYears = useMemo(() => {
    if (!universityId) return []
    const rows = (academicData as any[]).filter((r) => Number(r?.fk_university_id ?? 0) === universityId)
    const seen = new Set<number>()
    const out: any[] = []
    for (const row of rows) {
      const id = Number(row?.fk_academic_year_id ?? 0)
      if (!id || seen.has(id)) continue
      seen.add(id)
      out.push(row)
    }
    return out.sort((a, b) => String(b?.academic_year ?? '').localeCompare(String(a?.academic_year ?? '')))
  }, [academicData, universityId])

  const courses = useMemo(() => {
    if (!universityId || !collegeId) return []
    const rows = (filtersData as any[]).filter(
      (r) => Number(r?.fk_university_id ?? 0) === universityId && Number(r?.fk_college_id ?? 0) === collegeId,
    )
    const seen = new Set<number>()
    const out: any[] = []
    for (const row of rows) {
      const id = Number(row?.fk_course_id ?? 0)
      if (!id || seen.has(id)) continue
      seen.add(id)
      out.push(row)
    }
    return out
  }, [filtersData, universityId, collegeId])

  const courseGroups = useMemo(() => {
    if (!universityId || !collegeId || !courseId) return []
    const rows = (filtersData as any[]).filter(
      (r) =>
        Number(r?.fk_university_id ?? 0) === universityId &&
        Number(r?.fk_college_id ?? 0) === collegeId &&
        Number(r?.fk_course_id ?? 0) === courseId,
    )
    const seen = new Set<number>()
    const out: any[] = []
    for (const row of rows) {
      const id = Number(row?.fk_course_group_id ?? 0)
      if (!id || seen.has(id)) continue
      seen.add(id)
      out.push(row)
    }
    return out
  }, [filtersData, universityId, collegeId, courseId])

  const courseYears = useMemo(() => {
    if (!universityId || !collegeId || !courseId || !courseGroupId) return []
    const rows = (filtersData as any[]).filter(
      (r) =>
        Number(r?.fk_university_id ?? 0) === universityId &&
        Number(r?.fk_college_id ?? 0) === collegeId &&
        Number(r?.fk_course_id ?? 0) === courseId &&
        Number(r?.fk_course_group_id ?? 0) === courseGroupId,
    )
    const seen = new Set<number>()
    const out: any[] = []
    for (const row of rows) {
      const id = Number(row?.fk_course_year_id ?? 0)
      if (!id || seen.has(id)) continue
      seen.add(id)
      out.push(row)
    }
    return out.sort((a, b) => Number(a?.year_order ?? 0) - Number(b?.year_order ?? 0))
  }, [filtersData, universityId, collegeId, courseId, courseGroupId])

  const sectionsQuery = useQuery({
    queryKey: QK.groupSections.list({ collegeId: collegeId ?? undefined, academicYearId: academicYearId ?? undefined, courseGroupId: courseGroupId ?? undefined, courseYearId: courseYearId ?? undefined }),
    queryFn: async () => {
      return listGroupSectionsByFilters({
        collegeId: collegeId ?? 0,
        academicYearId: academicYearId ?? 0,
        courseGroupId: courseGroupId ?? 0,
        courseYearId: courseYearId ?? 0,
      })
    },
    enabled: Boolean(collegeId && academicYearId && courseGroupId && courseYearId),
  })

  const data = (sectionsQuery.data ?? []) as any[]
  const isLoading = filtersQuery.isLoading || sectionsQuery.isLoading
  const invalidate = () => sectionsQuery.refetch()
  const columnDefs = useMemo<ColDef<GroupSection>[]>(() => [
    COLS.siNo,
    { ...COLS.courseGroup, valueGetter: (p) => pick((p.data ?? {}) as Record<string, unknown>, ['groupName', 'group_name', 'groupCode', 'courseGroupCode']) },
    { ...COLS.courseYear, valueGetter: (p) => pick((p.data ?? {}) as Record<string, unknown>, ['courseYearCode', 'courseYearName']) },
    { ...COLS.academicYear, valueGetter: (p) => pick((p.data ?? {}) as Record<string, unknown>, ['academicYear', 'academicYearCode', 'academicYearName']) },
    { ...COLS.section, valueGetter: (p) => pick((p.data ?? {}) as Record<string, unknown>, ['groupSectionName', 'groupSectionCode']) },
    { ...COLS.sortOrder, valueGetter: (p) => ((p.data ?? {}) as Record<string, unknown>).sortOrder ?? '' },
    { ...COLS.isActive, cellRenderer: statusRenderer },
    { ...COLS.actions, cellRenderer: actionRenderer(setRow, setOpen) },
  ], [])

  // Default selections + cascading resets
  useEffect(() => {
    if (universityId == null && universities.length > 0) setUniversityId(Number((universities[0] as any).fk_university_id ?? 0) || null)
  }, [universities, universityId])
  useEffect(() => {
    setCollegeId(null)
    setAcademicYearId(null)
    setCourseId(null)
    setCourseGroupId(null)
    setCourseYearId(null)
  }, [universityId])
  useEffect(() => {
    if (collegeId == null && colleges.length > 0) setCollegeId(Number((colleges[0] as any).fk_college_id ?? 0) || null)
  }, [colleges, collegeId])
  useEffect(() => {
    setAcademicYearId(null)
    setCourseId(null)
    setCourseGroupId(null)
    setCourseYearId(null)
  }, [collegeId])

  useEffect(() => {
    if (academicYearId == null && academicYears.length > 0) {
      const curr = [...academicYears].sort((a, b) => Number((b as any)?.is_curr_ay ?? 0) - Number((a as any)?.is_curr_ay ?? 0))[0] as any
      const id = Number(curr?.fk_academic_year_id ?? 0)
      setAcademicYearId(id || null)
    }
  }, [academicYears, academicYearId])
  useEffect(() => {
    setCourseId(null)
    setCourseGroupId(null)
    setCourseYearId(null)
  }, [academicYearId])

  useEffect(() => {
    if (courseId == null && courses.length > 0) setCourseId(Number((courses[0] as any).fk_course_id ?? 0) || null)
  }, [courses, courseId])
  useEffect(() => {
    setCourseGroupId(null)
    setCourseYearId(null)
  }, [courseId])
  useEffect(() => {
    if (courseGroupId == null && courseGroups.length > 0) setCourseGroupId(Number((courseGroups[0] as any).fk_course_group_id ?? 0) || null)
  }, [courseGroups, courseGroupId])
  useEffect(() => {
    setCourseYearId(null)
  }, [courseGroupId])

  useEffect(() => {
    if (courseYearId == null && courseYears.length > 0) setCourseYearId(Number((courseYears[0] as any).fk_course_year_id ?? 0) || null)
  }, [courseYears, courseYearId])

  const canShowTable =
    universityId != null &&
    collegeId != null &&
    academicYearId != null &&
    courseId != null &&
    courseGroupId != null &&
    courseYearId != null

  return (
    <PageContainer className="space-y-4">
      <h2 className="px-1 text-lg font-semibold tracking-tight text-foreground">Section</h2>
      <GlobalFilterBar title="Section" defaultOpen={false} collapsible>
        <div className="p-3 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <Select
            label="University *"
            value={universityId ? String(universityId) : null}
            onChange={(v) => setUniversityId(v ? Number(v) : null)}
            options={universities.map((u: any) => ({ value: String(u.fk_university_id ?? 0), label: String(u.university_code ?? u.university_name ?? '') }))}
            searchable
            className="md:col-span-2"
          />
          <Select
            label="College *"
            value={collegeId ? String(collegeId) : null}
            onChange={(v) => setCollegeId(v ? Number(v) : null)}
            options={colleges.map((c: any) => ({ value: String(c.fk_college_id ?? 0), label: String(c.college_name ?? c.collegeName ?? c.college_code ?? c.collegeCode ?? '') }))}
            searchable
            className="md:col-span-2"
          />
          <Select
            label="Academic Year *"
            value={academicYearId ? String(academicYearId) : null}
            onChange={(v) => setAcademicYearId(v ? Number(v) : null)}
            options={academicYears.map((a) => ({
              value: String(Number((a as any)?.fk_academic_year_id ?? 0)),
              label: String((a as any)?.academic_year ?? ''),
            }))}
            searchable
            className="md:col-span-2"
          />
          <Select
            label="Course *"
            value={courseId ? String(courseId) : null}
            onChange={(v) => setCourseId(v ? Number(v) : null)}
            options={courses.map((c: any) => ({ value: String(c.fk_course_id ?? 0), label: String(c.course_code ?? '') }))}
            searchable
            className="md:col-span-2"
          />
          <Select
            label="Course Group *"
            value={courseGroupId ? String(courseGroupId) : null}
            onChange={(v) => setCourseGroupId(v ? Number(v) : null)}
            options={courseGroups.map((g: any) => ({ value: String(g.fk_course_group_id ?? 0), label: String(g.group_name ?? g.groupName ?? g.group_code ?? '') }))}
            searchable
            className="md:col-span-2"
          />
          <Select
            label="Course Year *"
            value={courseYearId ? String(courseYearId) : null}
            onChange={(v) => setCourseYearId(v ? Number(v) : null)}
            options={courseYears.map((y: any) => ({ value: String(y.fk_course_year_id ?? 0), label: String(y.course_year_name ?? '') }))}
            searchable
            className="md:col-span-2"
          />
        </div>
      </GlobalFilterBar>

      {/* Table card (no extra "Sections" heading) */}
      {canShowTable ? (
        <div className="app-card overflow-hidden">
          <div className="px-3 pb-3 pt-2">
            <DataTable
              // Prevent DataTable from inferring a title from breadcrumb/card and
              // showing the default filter hint subtitle on this screen.
              toolbarLeading={<span className="hidden" />}
              subtitle="Click the filter icon next to each column header to filter that column."
              rowData={data}
              columnDefs={columnDefs}
              loading={isLoading}
              pagination
              toolbarTrailing={
                <Button size="sm" onClick={() => { setRow(null); setOpen(true) }}>
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Add Section
                </Button>
              }
              toolbar={{ search: true, searchPlaceholder: 'Search sections…', pdfDocumentTitle: 'Sections' }}
            />
          </div>
        </div>
      ) : null}
      <GroupSectionModal
        open={open}
        onClose={() => { setOpen(false); setRow(null) }}
        row={row}
        onSaved={invalidate}
        filterDefaults={{
          universityId,
          collegeId,
          academicYearId,
          courseId,
          courseGroupId,
          courseYearId,
        }}
        filtersData={filtersData as Record<string, unknown>[]}
        academicData={academicData as Record<string, unknown>[]}
      />
    </PageContainer>
  )
}
