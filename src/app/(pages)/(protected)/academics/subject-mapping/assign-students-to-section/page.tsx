'use client'

import { useEffect, useMemo, useState } from 'react'
import { Filter, Search, Users } from 'lucide-react'
import { Select } from '@/common/components/select'
import { PageContainer } from '@/components/layout'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  getDigitalOnlineSyncFilters,
  listStaffMappingSections,
  listStudentsForPromotionPreview,
  submitAssignedStudentSections,
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

export default function AssignStudentsToSectionPage() {
  const [filtersData, setFiltersData] = useState<AnyRow[]>([])
  const [academicData, setAcademicData] = useState<AnyRow[]>([])
  const [sections, setSections] = useState<AnyRow[]>([])
  const [filterOpen, setFilterOpen] = useState(true)
  const [rows, setRows] = useState<AnyRow[]>([])
  const [loading, setLoading] = useState(false)
  const [cardsEnabled, setCardsEnabled] = useState(false)
  const [leftSearch, setLeftSearch] = useState('')
  const [rightSearch, setRightSearch] = useState('')
  const [selectedLeft, setSelectedLeft] = useState<Set<string>>(new Set())
  const [selectedRight, setSelectedRight] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [courseId, setCourseId] = useState<number | null>(null)
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null)
  const [courseYearId, setCourseYearId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [groupSectionId, setGroupSectionId] = useState<number | null>(null)

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

  useEffect(() => { if (!collegeId && colleges.length) setCollegeId(n(colleges[0].fk_college_id)) }, [colleges, collegeId])
  useEffect(() => { setCourseId(null); setCourseGroupId(null); setCourseYearId(null); setAcademicYearId(null); setGroupSectionId(null); setRows([]); setCardsEnabled(false) }, [collegeId])
  useEffect(() => { if (!courseId && courses.length) setCourseId(n(courses[0].fk_course_id)) }, [courses, courseId])
  useEffect(() => { setCourseGroupId(null); setCourseYearId(null); setAcademicYearId(null); setGroupSectionId(null); setRows([]); setCardsEnabled(false) }, [courseId])
  useEffect(() => { if (!courseGroupId && courseGroups.length) setCourseGroupId(n(courseGroups[0].fk_course_group_id)) }, [courseGroups, courseGroupId])
  useEffect(() => { setCourseYearId(null); setAcademicYearId(null); setGroupSectionId(null); setRows([]); setCardsEnabled(false) }, [courseGroupId])
  useEffect(() => { if (!courseYearId && courseYears.length) setCourseYearId(n(courseYears[0].fk_course_year_id)) }, [courseYears, courseYearId])
  useEffect(() => { setAcademicYearId(null); setGroupSectionId(null); setRows([]); setCardsEnabled(false) }, [courseYearId])
  useEffect(() => { if (!academicYearId && academicYears.length) setAcademicYearId(n([...academicYears].sort((a, b) => n(b.is_curr_ay) - n(a.is_curr_ay))[0]?.fk_academic_year_id)) }, [academicYears, academicYearId])
  useEffect(() => { setGroupSectionId(null); setRows([]); setSections([]); setCardsEnabled(false) }, [academicYearId])
  useEffect(() => { if (!groupSectionId && sections.length) setGroupSectionId(n(sections[0].pk_group_section_id ?? sections[0].groupSectionId)) }, [sections, groupSectionId])

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
    async function loadStudentsBySection() {
      if (!collegeId || !courseGroupId || !groupSectionId) {
        setRows([])
        setCardsEnabled(false)
        return
      }
      setLoading(true)
      setCardsEnabled(true)
      const list = await listStudentsForPromotionPreview({ collegeId, courseGroupId, groupSectionId }).catch(() => [])
      const normalizedRows = (Array.isArray(list) ? list : []).map((row, idx) => ({
        ...row,
        __rowKey: `${n(row.studentId ?? row.fk_student_id) || idx + 1}`,
        assignedGroupSectionId: n(row.groupSectionId ?? row.fk_group_section_id ?? row.group_section_id) || null,
        originalGroupSectionId: n(row.groupSectionId ?? row.fk_group_section_id ?? row.group_section_id) || null,
      }))
      setRows(normalizedRows)
      setSelectedLeft(new Set())
      setSelectedRight(new Set())
      setLoading(false)
    }
    void loadStudentsBySection()
  }, [collegeId, courseGroupId, groupSectionId])

  const selectedSectionLabel = useMemo(
    () => sectionOptions.find((x) => n(x.value) === (groupSectionId ?? 0))?.label ?? '-',
    [sectionOptions, groupSectionId],
  )
  const selectedCollege = useMemo(() => s(colleges.find((x) => n(x.fk_college_id) === (collegeId ?? 0))?.college_code), [colleges, collegeId])
  const selectedCourse = useMemo(() => s(courses.find((x) => n(x.fk_course_id) === (courseId ?? 0))?.course_code), [courses, courseId])
  const selectedGroup = useMemo(() => s(courseGroups.find((x) => n(x.fk_course_group_id) === (courseGroupId ?? 0))?.group_code), [courseGroups, courseGroupId])
  const selectedYear = useMemo(() => s(courseYears.find((x) => n(x.fk_course_year_id) === (courseYearId ?? 0))?.course_year_name), [courseYears, courseYearId])
  const selectedAcademic = useMemo(() => s(academicYears.find((x) => n(x.fk_academic_year_id) === (academicYearId ?? 0))?.academic_year), [academicYears, academicYearId])

  const leftRows = useMemo(() => {
    const q = leftSearch.trim().toLowerCase()
    return rows.filter((row) => {
      if (n(row.assignedGroupSectionId) === (groupSectionId ?? 0)) return false
      const name = s(row.studentName ?? row.student_name ?? row.firstName).toLowerCase()
      const reg = s(row.registerNo ?? row.register_number ?? row.rollNumber ?? row.hallticketNumber).toLowerCase()
      return !q || name.includes(q) || reg.includes(q)
    })
  }, [rows, leftSearch, groupSectionId])

  const rightRows = useMemo(() => {
    const q = rightSearch.trim().toLowerCase()
    return rows.filter((row) => {
      if (n(row.assignedGroupSectionId) !== (groupSectionId ?? 0)) return false
      const name = s(row.studentName ?? row.student_name ?? row.firstName).toLowerCase()
      const reg = s(row.registerNo ?? row.register_number ?? row.rollNumber ?? row.hallticketNumber).toLowerCase()
      return !q || name.includes(q) || reg.includes(q)
    })
  }, [rows, rightSearch, groupSectionId])

  function toggleLeft(key: string, checked: boolean) {
    setSelectedLeft((prev) => {
      const next = new Set(prev)
      if (checked) next.add(key)
      else next.delete(key)
      return next
    })
  }
  function toggleRight(key: string, checked: boolean) {
    setSelectedRight((prev) => {
      const next = new Set(prev)
      if (checked) next.add(key)
      else next.delete(key)
      return next
    })
  }

  function assignSelectedToSection() {
    if (!groupSectionId || selectedLeft.size === 0) return
    setRows((prev) => prev.map((r) => (selectedLeft.has(s(r.__rowKey)) ? { ...r, assignedGroupSectionId: groupSectionId } : r)))
    setSelectedLeft(new Set())
  }

  function removeSelectedFromSection() {
    if (selectedRight.size === 0) return
    setRows((prev) => prev.map((r) => (selectedRight.has(s(r.__rowKey)) ? { ...r, assignedGroupSectionId: null } : r)))
    setSelectedRight(new Set())
  }

  async function onSave() {
    const changed = rows.filter((r) => n(r.assignedGroupSectionId) !== n(r.originalGroupSectionId))
    if (changed.length === 0) {
      toastError('No section changes to save')
      return
    }
    const payload = changed.map((r) => ({
      ...r,
      groupSectionId: n(r.assignedGroupSectionId) || 0,
    }))
    setSaving(true)
    try {
      await submitAssignedStudentSections(payload)
      toastSuccess('Students assigned to section successfully')
      setRows((prev) => prev.map((r) => ({ ...r, originalGroupSectionId: r.assignedGroupSectionId })))
    } catch {
      toastError('Failed to assign students to section')
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageContainer>
      <div className="app-card p-0 overflow-hidden">
        <div className="px-4 py-2.5 border-b flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold text-primary inline-flex items-center gap-2">
            <Users className="h-4 w-4" />
            Assign Students to Section
          </h2>
          <button type="button" className="ml-auto inline-flex items-center gap-1 text-sm text-foreground" onClick={() => setFilterOpen((v) => !v)}>
            <span>Filter</span>
            <Filter className="h-4 w-4" />
          </button>
        </div>
        {filterOpen && (
          <div className="p-3 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <Select label="College *" value={collegeId ? String(collegeId) : null} onChange={(v) => setCollegeId(v ? Number(v) : null)} options={colleges.map((x) => ({ value: String(n(x.fk_college_id)), label: s(x.college_code) }))} searchable className="md:col-span-2" />
            <Select label="Academic Year *" value={academicYearId ? String(academicYearId) : null} onChange={(v) => setAcademicYearId(v ? Number(v) : null)} options={academicYears.map((x) => ({ value: String(n(x.fk_academic_year_id)), label: s(x.academic_year) }))} searchable className="md:col-span-3" />
            <Select label="Course *" value={courseId ? String(courseId) : null} onChange={(v) => setCourseId(v ? Number(v) : null)} options={courses.map((x) => ({ value: String(n(x.fk_course_id)), label: s(x.course_code) }))} searchable className="md:col-span-2" />
            <Select label="Course Group *" value={courseGroupId ? String(courseGroupId) : null} onChange={(v) => setCourseGroupId(v ? Number(v) : null)} options={courseGroups.map((x) => ({ value: String(n(x.fk_course_group_id)), label: s(x.group_code) || s(x.group_name) }))} searchable className="md:col-span-3" />
            <Select label="Course Year *" value={courseYearId ? String(courseYearId) : null} onChange={(v) => setCourseYearId(v ? Number(v) : null)} options={courseYears.map((x) => ({ value: String(n(x.fk_course_year_id)), label: s(x.course_year_name) }))} searchable className="md:col-span-2" />
            <Select label="Section *" value={groupSectionId ? String(groupSectionId) : null} onChange={(v) => setGroupSectionId(v ? Number(v) : null)} options={sectionOptions} searchable className="md:col-span-2" />
          </div>
        )}
      </div>

      {cardsEnabled ? (
        <div className="app-card mt-4 p-3">
          <div className="mb-2.5 px-1 text-sm font-semibold text-primary">
            Students - {selectedCollege} / {selectedCourse} / {selectedGroup} / {selectedYear} ({selectedAcademic})
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
            <div className="md:col-span-4 border rounded-sm overflow-hidden bg-card">
              <div className="bg-primary/10 border-b px-3 py-1.5 flex items-center justify-between text-sm font-semibold">
                <span>STUDENTS</span>
                <span>{leftRows.length}</span>
              </div>
              <div className="p-2">
                <div className="relative mb-2">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input value={leftSearch} onChange={(e) => setLeftSearch(e.target.value)} placeholder="Search..." className="h-9 pl-8" />
                </div>
                <div className="h-[380px] overflow-y-auto border rounded-sm">
                  {loading ? (
                    <div className="p-3 text-sm text-muted-foreground">Loading students...</div>
                  ) : leftRows.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground">No students</div>
                  ) : (
                    leftRows.map((row) => (
                      <div key={s(row.__rowKey)} className="px-3 py-2 text-xs border-b flex items-center gap-2">
                        <input type="checkbox" checked={selectedLeft.has(s(row.__rowKey))} onChange={(e) => toggleLeft(s(row.__rowKey), e.target.checked)} />
                        <span>{s(row.studentName ?? row.student_name ?? row.firstName)}</span>{' '}
                        <span className="text-blue-700 font-semibold">({s(row.registerNo ?? row.register_number ?? row.rollNumber ?? row.hallticketNumber)})</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            <div className="md:col-span-1 flex flex-col items-center justify-center gap-2">
              <Button type="button" size="sm" onClick={assignSelectedToSection} disabled={selectedLeft.size === 0 || !groupSectionId}>{'>>'}</Button>
              <Button type="button" size="sm" variant="outline" onClick={removeSelectedFromSection} disabled={selectedRight.size === 0}>{'<<'}</Button>
            </div>
            <div className="md:col-span-7 border rounded-sm overflow-hidden bg-card">
              <div className="bg-primary/10 border-b px-3 py-1.5 flex items-center justify-between text-sm font-semibold">
                <span>SECTION : {selectedSectionLabel}</span>
                <span>{rightRows.length}</span>
              </div>
              <div className="p-2">
                <div className="relative mb-2">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input value={rightSearch} onChange={(e) => setRightSearch(e.target.value)} placeholder="Search..." className="h-9 pl-8" />
                </div>
                <div className="h-[380px] overflow-y-auto border rounded-sm">
                  {loading ? (
                    <div className="p-3 text-sm text-muted-foreground">Loading students...</div>
                  ) : rightRows.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground">No students</div>
                  ) : (
                    rightRows.map((row) => (
                      <div key={`r-${s(row.__rowKey)}`} className="px-3 py-2 text-xs border-b flex items-center justify-between gap-2">
                        <div>
                          <input className="mr-2" type="checkbox" checked={selectedRight.has(s(row.__rowKey))} onChange={(e) => toggleRight(s(row.__rowKey), e.target.checked)} />
                          <span>{s(row.studentName ?? row.student_name ?? row.firstName)}</span>{' '}
                          <span className="text-blue-700 font-semibold">({s(row.registerNo ?? row.register_number ?? row.rollNumber ?? row.hallticketNumber)})</span>
                        </div>
                        <div className="h-6 w-6 rounded-full bg-slate-200" />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <Button type="button" className="h-9" onClick={() => { void onSave() }} disabled={saving}>
              Save
            </Button>
          </div>
        </div>
      ) : null}
    </PageContainer>
  )
}

