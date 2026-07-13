'use client'

import { useEffect, useMemo, useState } from 'react'
import { Select } from '@/common/components/select'
import { FilteredPage } from '@/components/layout'
import {
  getDigitalOnlineSyncFilters,
  listSubjectSyllabusPlanReport,
  listStaffMappingSections,
  listStaffSubjectRows,
} from '@/services'

type AnyRow = Record<string, any>

const n = (v: unknown) => Number(v) || 0
const s = (v: unknown) => {
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  return ''
}

const sectionIdOf = (row: AnyRow) => n(
  row.pk_group_section_id
  ?? row.groupSectionId
  ?? row.group_section_id
  ?? row.sectionId
  ?? row.section_id,
)
const sectionLabelOf = (row: AnyRow) => s(
  row.section
  ?? row.group_section_name
  ?? row.groupSectionName
  ?? row.section_name
  ?? row.sectionName,
)
const subjectIdOf = (row: AnyRow) => n(
  row.subjectId
  ?? row.fk_subject_id
  ?? row.subject_id
  ?? row.subject?.subjectId
  ?? row.Subject?.subjectId
  ?? row.subjectCourseyearId
  ?? row.subjectCourseYearId,
)
const subjectLabelOf = (row: AnyRow) => s(
  row.subjectName
  ?? row.subject_name
  ?? row.subject?.subjectName
  ?? row.Subject?.subjectName
  ?? row.subject,
)

const uniq = (rows: AnyRow[], key: string) => {
  const seen = new Set<number>()
  return rows.filter((r) => {
    const id = n(r[key])
    if (!id || seen.has(id)) return false
    seen.add(id)
    return true
  })
}

export default function SubjectSyllabusPlanPage() {
  const [filtersData, setFiltersData] = useState<AnyRow[]>([])
  const [academicData, setAcademicData] = useState<AnyRow[]>([])
  const [sections, setSections] = useState<AnyRow[]>([])
  const [subjects, setSubjects] = useState<AnyRow[]>([])
  const [syllabusRows, setSyllabusRows] = useState<AnyRow[]>([])

  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [courseId, setCourseId] = useState<number | null>(null)
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null)
  const [courseYearId, setCourseYearId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [groupSectionId, setGroupSectionId] = useState<number | null>(null)
  const [subjectId, setSubjectId] = useState<number | null>(null)

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

  const colleges = useMemo(
    () => uniq(filtersData, 'fk_college_id').sort((a, b) => n(a.clg_sort_order) - n(b.clg_sort_order)),
    [filtersData],
  )
  const courses = useMemo(
    () => uniq(filtersData.filter((r) => n(r.fk_college_id) === (collegeId ?? 0)), 'fk_course_id'),
    [filtersData, collegeId],
  )
  const courseGroups = useMemo(
    () => uniq(
      filtersData.filter((r) => n(r.fk_college_id) === (collegeId ?? 0) && n(r.fk_course_id) === (courseId ?? 0)),
      'fk_course_group_id',
    ),
    [filtersData, collegeId, courseId],
  )
  const courseYears = useMemo(
    () => uniq(
      filtersData.filter((r) =>
        n(r.fk_college_id) === (collegeId ?? 0)
        && n(r.fk_course_id) === (courseId ?? 0)
        && n(r.fk_course_group_id) === (courseGroupId ?? 0),
      ),
      'fk_course_year_id',
    ).sort((a, b) => n(a.year_order) - n(b.year_order)),
    [filtersData, collegeId, courseId, courseGroupId],
  )
  const academicYears = useMemo(() => {
    const univId = n(filtersData.find((x) => n(x.fk_college_id) === (collegeId ?? 0))?.fk_university_id)
    return uniq(academicData.filter((r) => n(r.fk_university_id) === univId), 'fk_academic_year_id')
      .sort((a, b) => String(b.academic_year ?? '').localeCompare(String(a.academic_year ?? '')))
  }, [academicData, filtersData, collegeId])

  useEffect(() => { if (!collegeId && colleges.length) setCollegeId(n(colleges[0].fk_college_id)) }, [colleges, collegeId])
  useEffect(() => { setCourseId(null); setCourseGroupId(null); setCourseYearId(null); setAcademicYearId(null); setGroupSectionId(null); setSubjectId(null); setSections([]); setSubjects([]) }, [collegeId])
  useEffect(() => { if (!courseId && courses.length) setCourseId(n(courses[0].fk_course_id)) }, [courses, courseId])
  useEffect(() => { setCourseGroupId(null); setCourseYearId(null); setAcademicYearId(null); setGroupSectionId(null); setSubjectId(null); setSections([]); setSubjects([]) }, [courseId])
  useEffect(() => { if (!courseGroupId && courseGroups.length) setCourseGroupId(n(courseGroups[0].fk_course_group_id)) }, [courseGroups, courseGroupId])
  useEffect(() => { setCourseYearId(null); setAcademicYearId(null); setGroupSectionId(null); setSubjectId(null); setSections([]); setSubjects([]) }, [courseGroupId])
  useEffect(() => { if (!courseYearId && courseYears.length) setCourseYearId(n(courseYears[0].fk_course_year_id)) }, [courseYears, courseYearId])
  useEffect(() => { setAcademicYearId(null); setGroupSectionId(null); setSubjectId(null); setSections([]); setSubjects([]) }, [courseYearId])
  useEffect(() => {
    if (!academicYearId && academicYears.length) {
      const latest = [...academicYears].sort((a, b) => n(b.is_curr_ay) - n(a.is_curr_ay))[0]
      setAcademicYearId(n(latest?.fk_academic_year_id))
    }
  }, [academicYears, academicYearId])
  useEffect(() => { setGroupSectionId(null); setSubjectId(null); setSections([]); setSubjects([]) }, [academicYearId])
  useEffect(() => { if (!groupSectionId && sections.length) setGroupSectionId(sectionIdOf(sections[0])) }, [sections, groupSectionId])
  useEffect(() => { setSubjectId(null); setSubjects([]); setSyllabusRows([]) }, [groupSectionId])

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
      setSections(Array.isArray(list) ? list : [])
    }
    void loadSections()
  }, [collegeId, courseId, courseGroupId, courseYearId, academicYearId])

  useEffect(() => {
    async function loadSubjects() {
      if (!collegeId || !academicYearId || !groupSectionId) {
        setSubjects([])
        setSyllabusRows([])
        return
      }
      const rows = await listStaffSubjectRows({
        collegeId,
        academicYearId,
        groupSectionId,
      }).catch(() => [])
      setSubjects(Array.isArray(rows) ? rows : [])
    }
    void loadSubjects()
  }, [collegeId, academicYearId, groupSectionId])

  useEffect(() => {
    async function loadSyllabusPlan() {
      if (!collegeId || !subjectId) {
        setSyllabusRows([])
        return
      }
      const rows = await listSubjectSyllabusPlanReport({
        subjectId,
        collegeId,
      }).catch(() => [])
      setSyllabusRows(Array.isArray(rows) ? rows : [])
    }
    void loadSyllabusPlan()
  }, [subjectId, collegeId])

  return (
    <FilteredPage
      title="Subjects Syllabus Plan"
      filters={(
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <Select label="College *" value={collegeId ? String(collegeId) : null} onChange={(v) => setCollegeId(v ? Number(v) : null)} options={colleges.map((x) => ({ value: String(n(x.fk_college_id)), label: s(x.college_code) }))} searchable />
          <Select label="Course *" value={courseId ? String(courseId) : null} onChange={(v) => setCourseId(v ? Number(v) : null)} options={courses.map((x) => ({ value: String(n(x.fk_course_id)), label: s(x.course_code) }))} searchable disabled={!collegeId} />
          <Select label="Course Group *" value={courseGroupId ? String(courseGroupId) : null} onChange={(v) => setCourseGroupId(v ? Number(v) : null)} options={courseGroups.map((x) => ({ value: String(n(x.fk_course_group_id)), label: s(x.group_code) }))} searchable disabled={!courseId} />
          <Select label="Course Year *" value={courseYearId ? String(courseYearId) : null} onChange={(v) => setCourseYearId(v ? Number(v) : null)} options={courseYears.map((x) => ({ value: String(n(x.fk_course_year_id)), label: s(x.course_year_name) }))} searchable disabled={!courseGroupId} />
          <Select label="Academic Year *" value={academicYearId ? String(academicYearId) : null} onChange={(v) => setAcademicYearId(v ? Number(v) : null)} options={academicYears.map((x) => ({ value: String(n(x.fk_academic_year_id)), label: s(x.academic_year) }))} searchable disabled={!courseYearId} />
          <Select label="Section *" value={groupSectionId ? String(groupSectionId) : null} onChange={(v) => setGroupSectionId(v ? Number(v) : null)} options={sections.map((x) => ({ value: String(sectionIdOf(x)), label: sectionLabelOf(x) }))} searchable disabled={!academicYearId} />
          <div className="md:col-span-3">
            <Select
              label="Subject *"
              value={subjectId ? String(subjectId) : null}
              onChange={(v) => setSubjectId(v ? Number(v) : null)}
              options={subjects.map((x) => ({
                value: String(subjectIdOf(x)),
                label: subjectLabelOf(x),
              }))}
              searchable
              disabled={!groupSectionId}
            />
          </div>
        </div>
      )}
    >
      {!!subjectId && (
        <div className="app-card px-4 py-3 text-xs text-muted-foreground">
          Loaded syllabus records: {syllabusRows.length}
        </div>
      )}
    </FilteredPage>
  )
}

