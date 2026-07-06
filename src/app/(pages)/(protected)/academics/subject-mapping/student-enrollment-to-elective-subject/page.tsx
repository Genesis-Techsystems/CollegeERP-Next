'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ColDef } from 'ag-grid-community'
import { Filter } from 'lucide-react'
import { DataTable } from '@/common/components/table'
import { Select } from '@/common/components/select'
import { PageContainer, PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import {
  getDigitalOnlineSyncFilters,
  listElectiveGroupMappings,
  listStaffMappingSections,
  listStudentEnrollmentElectives,
} from '@/services'

type AnyRow = Record<string, any>

const n = (v: unknown) => Number(v) || 0
const s = (v: unknown) => {
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  return ''
}
const pick = (row: AnyRow, keys: string[]) => {
  for (const key of keys) {
    const out = s(row?.[key]).trim()
    if (out) return out
  }
  return '-'
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

export default function StudentEnrollmentToElectiveSubjectPage() {
  const [filtersData, setFiltersData] = useState<AnyRow[]>([])
  const [academicData, setAcademicData] = useState<AnyRow[]>([])
  const [sections, setSections] = useState<AnyRow[]>([])
  const [electives, setElectives] = useState<AnyRow[]>([])
  const [filterOpen, setFilterOpen] = useState(true)
  const [rows, setRows] = useState<AnyRow[]>([])
  const [loading, setLoading] = useState(false)
  const [tableEnabled, setTableEnabled] = useState(false)

  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [courseId, setCourseId] = useState<number | null>(null)
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null)
  const [courseYearId, setCourseYearId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [groupSectionId, setGroupSectionId] = useState<number | null>(null)
  const [electiveGroupMappingId, setElectiveGroupMappingId] = useState<number | null>(null)

  useEffect(() => {
    const orgId = Number(localStorage.getItem('organizationId') ?? 0)
    const empId = Number(localStorage.getItem('employeeId') ?? 0)
    getDigitalOnlineSyncFilters(orgId, empId)
      .then((d) => {
        setFiltersData(d.filtersData as AnyRow[])
        setAcademicData(d.academicYearData as AnyRow[])
      })
      .catch(() => {
        setFiltersData([])
        setAcademicData([])
      })
  }, [])

  const colleges = useMemo(() => uniq(filtersData, 'fk_college_id').sort((a, b) => n(a.clg_sort_order) - n(b.clg_sort_order)), [filtersData])
  const courses = useMemo(() => uniq(filtersData.filter((r) => n(r.fk_college_id) === (collegeId ?? 0)), 'fk_course_id'), [filtersData, collegeId])
  const courseGroups = useMemo(() => uniq(filtersData.filter((r) => n(r.fk_college_id) === (collegeId ?? 0) && n(r.fk_course_id) === (courseId ?? 0)), 'fk_course_group_id'), [filtersData, collegeId, courseId])
  const courseYears = useMemo(() => uniq(filtersData.filter((r) => n(r.fk_college_id) === (collegeId ?? 0) && n(r.fk_course_id) === (courseId ?? 0) && n(r.fk_course_group_id) === (courseGroupId ?? 0)), 'fk_course_year_id').sort((a, b) => n(a.year_order) - n(b.year_order)), [filtersData, collegeId, courseId, courseGroupId])
  const academicYears = useMemo(() => {
    const univId = n(filtersData.find((x) => n(x.fk_college_id) === (collegeId ?? 0))?.fk_university_id)
    return uniq(academicData.filter((r) => n(r.fk_university_id) === univId), 'fk_academic_year_id')
      .sort((a, b) => String(b.academic_year ?? '').localeCompare(String(a.academic_year ?? '')))
  }, [academicData, filtersData, collegeId])

  useEffect(() => { if (!collegeId && colleges.length) setCollegeId(n(colleges[0].fk_college_id)) }, [colleges, collegeId])
  useEffect(() => { setCourseId(null); setCourseGroupId(null); setCourseYearId(null); setAcademicYearId(null); setGroupSectionId(null); setElectiveGroupMappingId(null); setRows([]); setTableEnabled(false) }, [collegeId])
  useEffect(() => { if (!courseId && courses.length) setCourseId(n(courses[0].fk_course_id)) }, [courses, courseId])
  useEffect(() => { setCourseGroupId(null); setCourseYearId(null); setAcademicYearId(null); setGroupSectionId(null); setElectiveGroupMappingId(null); setRows([]); setTableEnabled(false) }, [courseId])
  useEffect(() => { if (!courseGroupId && courseGroups.length) setCourseGroupId(n(courseGroups[0].fk_course_group_id)) }, [courseGroups, courseGroupId])
  useEffect(() => { setCourseYearId(null); setAcademicYearId(null); setGroupSectionId(null); setElectiveGroupMappingId(null); setRows([]); setTableEnabled(false) }, [courseGroupId])
  useEffect(() => { if (!courseYearId && courseYears.length) setCourseYearId(n(courseYears[0].fk_course_year_id)) }, [courseYears, courseYearId])
  useEffect(() => { setAcademicYearId(null); setGroupSectionId(null); setElectiveGroupMappingId(null); setRows([]); setTableEnabled(false) }, [courseYearId])
  useEffect(() => { if (!academicYearId && academicYears.length) setAcademicYearId(n([...academicYears].sort((a, b) => n(b.is_curr_ay) - n(a.is_curr_ay))[0]?.fk_academic_year_id)) }, [academicYears, academicYearId])
  useEffect(() => { setGroupSectionId(null); setElectiveGroupMappingId(null); setRows([]); setSections([]); setElectives([]); setTableEnabled(false) }, [academicYearId])
  useEffect(() => { if (!groupSectionId && sections.length) setGroupSectionId(n(sections[0].pk_group_section_id ?? sections[0].groupSectionId)) }, [sections, groupSectionId])
  useEffect(() => { if (!electiveGroupMappingId && electives.length) setElectiveGroupMappingId(n(electives[0].electiveGroupyrMappingId ?? electives[0].pk_elective_groupyr_mapping_id)) }, [electives, electiveGroupMappingId])

  useEffect(() => {
    async function loadSections() {
      if (!collegeId || !courseId || !courseGroupId || !courseYearId || !academicYearId) {
        setSections([])
        return
      }
      const organizationId = Number(localStorage.getItem('organizationId') ?? 0)
      const employeeId = Number(localStorage.getItem('employeeId') ?? 0)
      const list = await listStaffMappingSections({
        organizationId,
        employeeId,
        collegeId,
        courseId,
        courseGroupId,
        courseYearId,
        academicYearId,
      }).catch(() => [])
      setSections(list)
    }
    void loadSections()
  }, [collegeId, courseId, courseGroupId, courseYearId, academicYearId])

  useEffect(() => {
    async function loadElectives() {
      if (!collegeId || !academicYearId) {
        setElectives([])
        return
      }
      const list = await listElectiveGroupMappings({ collegeId, academicYearId }).catch(() => [])
      setElectives(Array.isArray(list) ? list : [])
    }
    void loadElectives()
  }, [collegeId, academicYearId])

  const columnDefs = useMemo<ColDef<AnyRow>[]>(() => [
    { headerName: 'SI.No', valueGetter: (p: any) => (p.node?.rowIndex ?? 0) + 1, minWidth: 70, maxWidth: 85, flex: 0 },
    {
      headerName: 'Student Name',
      minWidth: 190,
      flex: 1.2,
      valueGetter: (p) => pick(p.data ?? {}, ['studentName', 'student_name', 'fullName', 'studentFullName']),
    },
    {
      headerName: 'Register No',
      minWidth: 130,
      flex: 1,
      valueGetter: (p) => pick(p.data ?? {}, ['registerNo', 'regNo', 'register_number', 'admissionNo', 'rollNo']),
    },
    {
      headerName: 'Elective Subject',
      minWidth: 220,
      flex: 1.3,
      valueGetter: (p) => pick(p.data ?? {}, ['subjectName', 'electiveSubjectName', 'elective_name', 'subject_name']),
    },
    {
      headerName: 'Elective Group',
      minWidth: 180,
      flex: 1.1,
      valueGetter: (p) => pick(p.data ?? {}, ['electiveGroupName', 'groupName', 'elective_group_name']),
    },
  ], [])

  async function loadEnrollmentRows() {
    if (!collegeId || !academicYearId) return
    setLoading(true)
    setTableEnabled(true)
    const list = await listStudentEnrollmentElectives({
      collegeId,
      academicYearId,
      courseId: courseId ?? 0,
      courseGroupId: courseGroupId ?? 0,
      courseYearId: courseYearId ?? 0,
      groupSectionId: groupSectionId ?? 0,
    }).catch(() => [])
    const baseRows = Array.isArray(list) ? list : []
    const filteredRows = electiveGroupMappingId
      ? baseRows.filter((r) => (
        n(r.electiveGroupyrMappingId ?? r.fk_elective_groupyr_mapping_id ?? r.pk_elective_groupyr_mapping_id) === electiveGroupMappingId
      ))
      : baseRows
    setRows(filteredRows)
    setLoading(false)
  }

  return (
    <PageContainer>
      <PageHeader title="Student Enrollment to Elective Subject" />

      <div className="app-card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold text-primary">Student Enrollment to Elective Subject</h2>
          <button type="button" className="ml-auto inline-flex items-center gap-1 text-sm text-foreground" onClick={() => setFilterOpen((v) => !v)}>
            <span>Filter</span>
            <Filter className="h-4 w-4" />
          </button>
        </div>

        {(
          <div className="p-3 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <Select label="College *" value={collegeId ? String(collegeId) : null} onChange={(v) => setCollegeId(v ? Number(v) : null)} options={colleges.map((x) => ({ value: String(n(x.fk_college_id)), label: s(x.college_code) }))} searchable className="md:col-span-2" />
            <Select label="Course *" value={courseId ? String(courseId) : null} onChange={(v) => setCourseId(v ? Number(v) : null)} options={courses.map((x) => ({ value: String(n(x.fk_course_id)), label: s(x.course_code) }))} searchable className="md:col-span-2" />
            <Select label="Course Group *" value={courseGroupId ? String(courseGroupId) : null} onChange={(v) => setCourseGroupId(v ? Number(v) : null)} options={courseGroups.map((x) => ({ value: String(n(x.fk_course_group_id)), label: s(x.group_code) || s(x.group_name) }))} searchable className="md:col-span-2" />
            <Select label="Course Year *" value={courseYearId ? String(courseYearId) : null} onChange={(v) => setCourseYearId(v ? Number(v) : null)} options={courseYears.map((x) => ({ value: String(n(x.fk_course_year_id)), label: s(x.course_year_name) }))} searchable className="md:col-span-2" />
            <Select label="Academic Year *" value={academicYearId ? String(academicYearId) : null} onChange={(v) => setAcademicYearId(v ? Number(v) : null)} options={academicYears.map((x) => ({ value: String(n(x.fk_academic_year_id)), label: s(x.academic_year) }))} searchable className="md:col-span-1" />
            <Select label="Section" value={groupSectionId ? String(groupSectionId) : null} onChange={(v) => setGroupSectionId(v ? Number(v) : null)} options={sections.map((x) => ({ value: String(n(x.pk_group_section_id ?? x.groupSectionId)), label: s(x.section) || s(x.sectionName) }))} searchable className="md:col-span-1" />
            <Select
              label="Elective"
              value={electiveGroupMappingId ? String(electiveGroupMappingId) : null}
              onChange={(v) => setElectiveGroupMappingId(v ? Number(v) : null)}
              options={electives.map((x) => ({
                value: String(n(x.electiveGroupyrMappingId ?? x.pk_elective_groupyr_mapping_id)),
                label: pick(x, ['electiveGroupName', 'groupName', 'elective_group_name', 'electiveGroupCode']),
              }))}
              searchable
              className="md:col-span-1"
            />
            <div className="md:col-span-1">
              <Button type="button" className="h-9 w-full" disabled={!collegeId || !academicYearId} onClick={() => { void loadEnrollmentRows() }}>
                Get
              </Button>
            </div>
          </div>
        )}
      </div>

      {tableEnabled ? (
        <div className="app-card mt-4 p-3">
          <DataTable
            rowData={rows}
            columnDefs={columnDefs}
            loading={loading}
            toolbar={{ search: true, searchPlaceholder: 'Search students' }}
            pagination
            paginationPageSize={10}
          />
        </div>
      ) : null}
    </PageContainer>
  )
}

