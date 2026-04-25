'use client'

import { useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { BookOpen, PencilIcon, PlusIcon } from 'lucide-react'
import { DataTable } from '@/common/components/table'
import { Select } from '@/common/components/select'
import { StatusBadge } from '@/common/components/data-display'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { useSession } from '@/hooks/useSession'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import {
  getCollegeCourseGroupFilters,
  listCollegeCourseGroups,
} from '@/services'
import type { CollegeFilterRow, CollegeCourseGroupRow } from '@/services/admin/college-courses-groups'
import CollegeCourseGroupModal from './CollegeCourseGroupModal'

function num(v: unknown) { const n = Number(v); return Number.isFinite(n) ? n : 0 }

const COL_DEFS = {
  universityCode: { headerName: 'University', field: 'universityCode', minWidth: 120, flex: 1 } as ColDef<CollegeCourseGroupRow>,
  collegeCode: { headerName: 'College', field: 'collegeCode', minWidth: 110, flex: 0.9 } as ColDef<CollegeCourseGroupRow>,
  courseCode: { headerName: 'Course', field: 'courseCode', minWidth: 110, flex: 0.9 } as ColDef<CollegeCourseGroupRow>,
  courseGroupCode: { headerName: 'Course Group', field: 'courseGroupCode', minWidth: 130, flex: 1 } as ColDef<CollegeCourseGroupRow>,
  courseYearCode: { headerName: 'Course Year', field: 'courseYearCode', minWidth: 120, flex: 0.9 } as ColDef<CollegeCourseGroupRow>,
  isActive: { headerName: 'Status', field: 'isActive', minWidth: 90, flex: 0.7 } as ColDef<CollegeCourseGroupRow>,
  actions: { headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<CollegeCourseGroupRow>,
}

function statusRenderer(p: ICellRendererParams<CollegeCourseGroupRow>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function actionsRenderer() {
  return <PencilIcon className="h-3.5 w-3.5 text-slate-500" />
}

export default function CollegeCoursesGroupsPage() {
  const { user } = useSession()
  const [filters, setFilters] = useState<CollegeFilterRow[]>([])
  const [selectedUniversityId, setSelectedUniversityId] = useState<number>(0)
  const [selectedCollegeId, setSelectedCollegeId] = useState<number>(0)
  const [selectedCourseId, setSelectedCourseId] = useState<number>(0)
  const [selectedCourseGroupId, setSelectedCourseGroupId] = useState<number>(0)
  const [rows, setRows] = useState<CollegeCourseGroupRow[]>([])
  const [showList, setShowList] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

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
      map.set(id, String(r.college_code ?? r.collegeCode ?? ''))
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
      map.set(id, String(r.course_code ?? ''))
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
    COL_DEFS.courseGroupCode,
    COL_DEFS.courseYearCode,
    { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
    { ...COL_DEFS.actions, cellRenderer: actionsRenderer },
  ], [])

  return (
    <PageContainer className="space-y-4">
      <div className="app-card p-3 grid grid-cols-1 md:grid-cols-5 gap-2">
        <Select label="University" value={selectedUniversityId ? String(selectedUniversityId) : null} onChange={(v) => { setSelectedUniversityId(v ? Number(v) : 0); setSelectedCollegeId(0); setSelectedCourseId(0); setSelectedCourseGroupId(0) }} options={universities} placeholder="Select university" searchable />
        <Select label="College" value={selectedCollegeId ? String(selectedCollegeId) : null} onChange={(v) => { setSelectedCollegeId(v ? Number(v) : 0); setSelectedCourseId(0); setSelectedCourseGroupId(0) }} options={colleges} placeholder="Select college" searchable />
        <Select label="Course" value={String(selectedCourseId)} onChange={(v) => { setSelectedCourseId(v ? Number(v) : 0); setSelectedCourseGroupId(0) }} options={courses} placeholder="Select course" searchable />
        <Select label="Course Group" value={String(selectedCourseGroupId)} onChange={(v) => setSelectedCourseGroupId(v ? Number(v) : 0)} options={courseGroups} placeholder="Select group" searchable />
        <div className="flex items-end"><Button onClick={getList}>Get List</Button></div>
      </div>

      {showList && (
        <div className="app-card overflow-hidden">
          <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-[hsl(var(--primary))]">College Courses & Groups</h2>
            <Button size="sm" onClick={() => setModalOpen(true)}><PlusIcon className="h-4 w-4 mr-1" />Add Course / Groups</Button>
          </div>
          <div className="px-3 py-3">
            {rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <BookOpen className="h-10 w-10 mb-2 opacity-40" />
                <p className="text-sm">No records found</p>
              </div>
            ) : (
              <DataTable rowData={rows} columnDefs={columnDefs} loading={false} pagination />
            )}
          </div>
        </div>
      )}

      <CollegeCourseGroupModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        collegeId={selectedCollegeId}
        onSaved={() => { void getList() }}
      />
    </PageContainer>
  )
}
