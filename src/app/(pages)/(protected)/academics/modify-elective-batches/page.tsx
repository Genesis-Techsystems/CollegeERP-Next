'use client'

import { useEffect, useMemo, useState } from 'react'
import { Filter, Users } from 'lucide-react'
import { Select } from '@/common/components/select'
import { PageContainer } from '@/components/layout'
import {
  getDigitalOnlineSyncFilters,
  listStaffMappingSections,
  listStudentBatchesByCollegeCourse,
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

export default function ModifyElectiveBatchesPage() {
  const [filtersData, setFiltersData] = useState<AnyRow[]>([])
  const [academicData, setAcademicData] = useState<AnyRow[]>([])
  const [sections, setSections] = useState<AnyRow[]>([])
  const [electives, setElectives] = useState<AnyRow[]>([])
  const [filterOpen, setFilterOpen] = useState(true)

  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [courseId, setCourseId] = useState<number | null>(null)
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null)
  const [courseYearId, setCourseYearId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [groupSectionId, setGroupSectionId] = useState<number | null>(null)
  const [electiveId, setElectiveId] = useState<number | null>(null)

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
  const sectionOptions = useMemo(
    () => sections.map((x) => ({
      value: String(n(x.pk_group_section_id ?? x.groupSectionId)),
      label: s(x.section) || s(x.sectionName),
    })),
    [sections],
  )
  const electiveOptions = useMemo(
    () =>
      electives.map((x) => ({
        value: String(n(x.fk_batch_id ?? x.batchId ?? x.batch_id ?? x.studentBatchId ?? x.pk_student_batch_id)),
        label: s(x.batch_name) || s(x.batchName) || s(x.batch_code) || s(x.batchCode) || 'Batch',
      })),
    [electives],
  )

  useEffect(() => { if (!collegeId && colleges.length) setCollegeId(n(colleges[0].fk_college_id)) }, [colleges, collegeId])
  useEffect(() => { setCourseId(null); setCourseGroupId(null); setCourseYearId(null); setAcademicYearId(null); setGroupSectionId(null); setElectiveId(null) }, [collegeId])
  useEffect(() => { if (!courseId && courses.length) setCourseId(n(courses[0].fk_course_id)) }, [courses, courseId])
  useEffect(() => { setCourseGroupId(null); setCourseYearId(null); setAcademicYearId(null); setGroupSectionId(null); setElectiveId(null) }, [courseId])
  useEffect(() => { if (!courseGroupId && courseGroups.length) setCourseGroupId(n(courseGroups[0].fk_course_group_id)) }, [courseGroups, courseGroupId])
  useEffect(() => { setCourseYearId(null); setAcademicYearId(null); setGroupSectionId(null); setElectiveId(null) }, [courseGroupId])
  useEffect(() => { if (!courseYearId && courseYears.length) setCourseYearId(n(courseYears[0].fk_course_year_id)) }, [courseYears, courseYearId])
  useEffect(() => { setAcademicYearId(null); setGroupSectionId(null); setElectiveId(null) }, [courseYearId])
  useEffect(() => { if (!academicYearId && academicYears.length) setAcademicYearId(n([...academicYears].sort((a, b) => n(b.is_curr_ay) - n(a.is_curr_ay))[0]?.fk_academic_year_id)) }, [academicYears, academicYearId])
  useEffect(() => { setGroupSectionId(null); setElectiveId(null) }, [academicYearId])
  useEffect(() => { if (!groupSectionId && sections.length) setGroupSectionId(n(sections[0].pk_group_section_id ?? sections[0].groupSectionId)) }, [sections, groupSectionId])
  useEffect(() => { if (!electiveId && electiveOptions.length) setElectiveId(n(electiveOptions[0].value)) }, [electiveId, electiveOptions])

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
      if (!collegeId || !courseId || !groupSectionId) {
        setElectives([])
        setElectiveId(null)
        return
      }
      const list = await listStudentBatchesByCollegeCourse({ collegeId, courseId }).catch(() => [])
      setElectives(Array.isArray(list) ? list : [])
    }
    void loadElectives()
  }, [collegeId, courseId, groupSectionId])

  return (
    <PageContainer>
      <div className="app-card p-0 overflow-hidden">
        <div className="px-4 py-2.5 border-b flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold text-primary inline-flex items-center gap-2">
            <Users className="h-4 w-4" />
            Modify Elective Batches
          </h2>
          <button type="button" className="ml-auto inline-flex items-center gap-1 text-sm text-foreground" onClick={() => setFilterOpen((v) => !v)}>
            <span>Filter</span>
            <Filter className="h-4 w-4" />
          </button>
        </div>
        {filterOpen ? (
          <div className="p-3 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <Select label="College *" value={collegeId ? String(collegeId) : null} onChange={(v) => setCollegeId(v ? Number(v) : null)} options={colleges.map((x) => ({ value: String(n(x.fk_college_id)), label: s(x.college_code) }))} searchable className="md:col-span-3" />
            <Select label="Course *" value={courseId ? String(courseId) : null} onChange={(v) => setCourseId(v ? Number(v) : null)} options={courses.map((x) => ({ value: String(n(x.fk_course_id)), label: s(x.course_code) }))} searchable className="md:col-span-3" />
            <Select label="Course Group *" value={courseGroupId ? String(courseGroupId) : null} onChange={(v) => setCourseGroupId(v ? Number(v) : null)} options={courseGroups.map((x) => ({ value: String(n(x.fk_course_group_id)), label: s(x.group_code) || s(x.group_name) }))} searchable className="md:col-span-3" />
            <Select label="Course Year *" value={courseYearId ? String(courseYearId) : null} onChange={(v) => setCourseYearId(v ? Number(v) : null)} options={courseYears.map((x) => ({ value: String(n(x.fk_course_year_id)), label: s(x.course_year_name) }))} searchable className="md:col-span-3" />
            <Select label="Academic Year *" value={academicYearId ? String(academicYearId) : null} onChange={(v) => setAcademicYearId(v ? Number(v) : null)} options={academicYears.map((x) => ({ value: String(n(x.fk_academic_year_id)), label: s(x.academic_year) }))} searchable className="md:col-span-3" />
            <Select label="Section *" value={groupSectionId ? String(groupSectionId) : null} onChange={(v) => setGroupSectionId(v ? Number(v) : null)} options={sectionOptions} searchable className="md:col-span-3" />
            <Select label="Elective *" value={electiveId ? String(electiveId) : null} onChange={(v) => setElectiveId(v ? Number(v) : null)} options={electiveOptions} searchable className="md:col-span-3" />
          </div>
        ) : null}
      </div>
    </PageContainer>
  )
}
