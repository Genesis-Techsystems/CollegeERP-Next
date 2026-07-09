'use client'

import { useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { BookOpen, PencilIcon, PlusIcon } from 'lucide-react'
import { useBreadcrumbLabel } from '@/common/components/breadcrumb'
import { DataTable } from '@/common/components/table'
import { Select } from '@/common/components/select'
import { StatusBadge } from '@/common/components/data-display'
import { GlobalFilterBar, GlobalFilterBarRow, GlobalFilterField } from '@/common/components/forms'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { useSession } from '@/hooks/useSession'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { getCrudModalKey } from '@/lib/utils'
import {
  getCollegeCourseGroupFilters,
  listCollegeCourseGroups,
} from '@/services'
import type { CollegeFilterRow, CollegeCourseGroupRow } from '@/services/admin/college-courses-groups'
import CollegeCourseGroupModal from './CollegeCourseGroupModal'
import CollegeCourseGroupEditModal from './CollegeCourseGroupEditModal'

function num(v: unknown) { const n = Number(v); return Number.isFinite(n) ? n : 0 }

const COL_DEFS = {
  universityCode: { headerName: 'University', field: 'universityCode', minWidth: 120, flex: 1 } as ColDef<CollegeCourseGroupRow>,
  collegeCode: { headerName: 'College', field: 'collegeCode', minWidth: 110, flex: 0.9 } as ColDef<CollegeCourseGroupRow>,
  courseCode: { headerName: 'Course', field: 'courseCode', minWidth: 110, flex: 0.9 } as ColDef<CollegeCourseGroupRow>,
  courseGroup: { headerName: 'Course Group', minWidth: 130, flex: 1 } as ColDef<CollegeCourseGroupRow>,
  courseYearCode: { headerName: 'Course Year', field: 'courseYearCode', minWidth: 120, flex: 0.9 } as ColDef<CollegeCourseGroupRow>,
  isActive: { headerName: 'Status', field: 'isActive', minWidth: 90, flex: 0.7 } as ColDef<CollegeCourseGroupRow>,
  actions: { headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<CollegeCourseGroupRow>,
}

function statusRenderer(p: ICellRendererParams<CollegeCourseGroupRow>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  setRow: (r: CollegeCourseGroupRow | null) => void,
  setOpen: (b: boolean) => void,
) {
  return (p: ICellRendererParams<CollegeCourseGroupRow>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      onClick={() => { setRow(p.data ?? null); setOpen(true) }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

export default function CollegeCoursesGroupsPage() {
  useBreadcrumbLabel('College Courses & Groups')
  const { user } = useSession()
  const [filters, setFilters] = useState<CollegeFilterRow[]>([])
  const [selectedUniversityId, setSelectedUniversityId] = useState<number>(0)
  const [selectedCollegeId, setSelectedCollegeId] = useState<number>(0)
  const [selectedCourseId, setSelectedCourseId] = useState<number>(0)
  const [selectedCourseGroupId, setSelectedCourseGroupId] = useState<number>(0)
  const [rows, setRows] = useState<CollegeCourseGroupRow[]>([])
  const [showList, setShowList] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editRow, setEditRow] = useState<CollegeCourseGroupRow | null>(null)

  useCrudList({
    queryKey: QK.collegeCoursesGroups.filters(user?.organizationId ?? 0, user?.employeeId ?? 0),
    queryFn: async () => {
      const data = await getCollegeCourseGroupFilters(user?.organizationId ?? 0, user?.employeeId ?? 0)
      setFilters(data)
      if (data.length > 0 && selectedUniversityId === 0) {
        setSelectedUniversityId(num(data[0].fk_university_id ?? data[0].universityId))
      }
      return data as unknown as []
    },
    enabled: Boolean(user),
  })

  const universities = useMemo(() => {
    const map = new Map<number, string>()
    for (const r of filters) {
      const id = num(r.fk_university_id ?? r.universityId)
      if (!id || map.has(id)) continue
      map.set(id, String(r.university_code ?? r.universityCode ?? ''))
    }
    return Array.from(map.entries()).map(([value, label]) => ({ value: String(value), label }))
  }, [filters])

  const colleges = useMemo(() => {
    const map = new Map<number, string>()
    for (const r of filters.filter((x) => num(x.fk_university_id ?? x.universityId) === selectedUniversityId)) {
      const id = num(r.fk_college_id ?? r.collegeId)
      if (!id || map.has(id)) continue
      map.set(id, String(r.college_name ?? r.collegeName ?? r.college_code ?? r.collegeCode ?? ''))
    }
    return Array.from(map.entries()).map(([value, label]) => ({ value: String(value), label }))
  }, [filters, selectedUniversityId])

  const courses = useMemo(() => {
    const map = new Map<number, string>()
    for (const r of filters.filter((x) =>
      num(x.fk_university_id ?? x.universityId) === selectedUniversityId
      && num(x.fk_college_id ?? x.collegeId) === selectedCollegeId)) {
      const id = num(r.fk_course_id ?? r.course_id)
      if (!id || map.has(id)) continue
      map.set(id, String(r.course_name ?? r.courseName ?? r.course_code ?? ''))
    }
    return [{ value: '0', label: 'All' }, ...Array.from(map.entries()).map(([value, label]) => ({ value: String(value), label }))]
  }, [filters, selectedUniversityId, selectedCollegeId])

  const courseGroups = useMemo(() => {
    const map = new Map<number, string>()
    for (const r of filters.filter((x) =>
      num(x.fk_university_id ?? x.universityId) === selectedUniversityId
      && num(x.fk_college_id ?? x.collegeId) === selectedCollegeId
      && (selectedCourseId === 0 || num(x.fk_course_id ?? x.course_id) === selectedCourseId))) {
      const id = num(r.fk_course_group_id ?? r.course_group_id)
      if (!id || map.has(id)) continue
      map.set(id, String(r.group_code ?? ''))
    }
    return [{ value: '0', label: 'All' }, ...Array.from(map.entries()).map(([value, label]) => ({ value: String(value), label }))]
  }, [filters, selectedUniversityId, selectedCollegeId, selectedCourseId])

  const selectedCollegeCode = useMemo(
    () => colleges.find((c) => Number(c.value) === selectedCollegeId)?.label ?? '',
    [colleges, selectedCollegeId],
  )
  const selectedUniversityCode = useMemo(
    () => universities.find((u) => Number(u.value) === selectedUniversityId)?.label ?? '',
    [universities, selectedUniversityId],
  )

  async function getList() {
    if (!selectedUniversityId || !selectedCollegeId) return
    const data = await listCollegeCourseGroups({
      universityId: selectedUniversityId,
      collegeId: selectedCollegeId,
      courseId: selectedCourseId || undefined,
      courseGroupId: selectedCourseGroupId || undefined,
    })
    setRows(data)
    setShowList(true)
  }

  const columnDefs = useMemo<ColDef<CollegeCourseGroupRow>[]>(() => [
    COL_DEFS.universityCode,
    COL_DEFS.collegeCode,
    COL_DEFS.courseCode,
    {
      ...COL_DEFS.courseGroup,
      valueGetter: (p) => p.data?.courseGroupCode || '',
    },
    COL_DEFS.courseYearCode,
    { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
    { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(setEditRow, setEditOpen) },
  ], [])

  return (
    <PageContainer className="space-y-4">
      <h2 className="px-1 text-lg font-semibold tracking-tight text-foreground">College Courses & Groups</h2>
      <GlobalFilterBar title="College Courses & Groups">
        <GlobalFilterBarRow>
          <GlobalFilterField label="University">
            <Select
              value={selectedUniversityId ? String(selectedUniversityId) : null}
              onChange={(v) => {
                setSelectedUniversityId(v ? Number(v) : 0)
                setSelectedCollegeId(0)
                setSelectedCourseId(0)
                setSelectedCourseGroupId(0)
              }}
              options={universities}
              placeholder="All"
              searchable
            />
          </GlobalFilterField>
          <GlobalFilterField label="College">
            <Select
              value={selectedCollegeId ? String(selectedCollegeId) : null}
              onChange={(v) => {
                setSelectedCollegeId(v ? Number(v) : 0)
                setSelectedCourseId(0)
                setSelectedCourseGroupId(0)
              }}
              options={colleges}
              placeholder="All"
              searchable
            />
          </GlobalFilterField>
          <GlobalFilterField label="Course">
            <Select
              value={String(selectedCourseId)}
              onChange={(v) => {
                setSelectedCourseId(v ? Number(v) : 0)
                setSelectedCourseGroupId(0)
              }}
              options={courses}
              placeholder="All"
              searchable
            />
          </GlobalFilterField>
          <GlobalFilterField label="Course Group">
            <Select
              value={String(selectedCourseGroupId)}
              onChange={(v) => setSelectedCourseGroupId(v ? Number(v) : 0)}
              options={courseGroups}
              placeholder="All"
              searchable
            />
          </GlobalFilterField>
          <GlobalFilterField label=" " className="global-filter-field--action">
            <Button size="sm" onClick={getList} className="shrink-0">
              Get List
            </Button>
          </GlobalFilterField>
        </GlobalFilterBarRow>
      </GlobalFilterBar>

      {showList && (
        <div className="app-card overflow-hidden">
          <div className="px-3 pb-3 pt-2">
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              {rows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <BookOpen className="h-10 w-10 mb-2 opacity-40" />
                  <p className="text-sm">No records found</p>
                  <Button size="sm" className="mt-4" onClick={() => setModalOpen(true)}>
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Add Course / Groups
                  </Button>
                </div>
              ) : (
                <DataTable
                  // Prevent DataTable from inferring a title and rendering its own heading.
                  toolbarLeading={<span className="hidden" />}
                  rowData={rows}
                  columnDefs={columnDefs}
                  loading={false}
                  pagination
                  toolbar={{ search: true, searchPlaceholder: 'Search college courses & groups…', pdfDocumentTitle: 'College Courses & Groups' }}
                  toolbarTrailing={
                    <Button size="sm" onClick={() => setModalOpen(true)}>
                      <PlusIcon className="h-4 w-4 mr-1" />
                      Add Course / Groups
                    </Button>
                  }
                />
              )}
            </div>
          </div>
        </div>
      )}

      <CollegeCourseGroupModal
        key={getCrudModalKey(null, modalOpen)}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        collegeId={selectedCollegeId}
        collegeCode={selectedCollegeCode}
        universityCode={selectedUniversityCode}
        existingRows={rows}
        defaultCourseId={selectedCourseId || undefined}
        defaultCourseGroupId={selectedCourseGroupId || undefined}
        onSaved={() => { void getList() }}
      />
      <CollegeCourseGroupEditModal
        key={getCrudModalKey(editRow, editOpen, 'univCollegeWiseGroupId', 'univCollegeWiseCourseId')}
        open={editOpen}
        onClose={() => { setEditOpen(false); setEditRow(null) }}
        row={editRow}
        onSaved={() => { void getList() }}
      />
    </PageContainer>
  )
}
