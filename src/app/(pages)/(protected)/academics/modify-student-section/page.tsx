'use client'

import { useEffect, useMemo, useState } from 'react'
import { Filter, Users } from 'lucide-react'
import { DatePicker } from '@/common/components/date-picker'
import { Select } from '@/common/components/select'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  getDigitalOnlineSyncFilters,
  listStudentsForModifyStudentBatches,
  listStaffMappingSections,
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

export default function ModifyStudentSectionPage() {
  const [filtersData, setFiltersData] = useState<AnyRow[]>([])
  const [academicData, setAcademicData] = useState<AnyRow[]>([])
  const [sections, setSections] = useState<AnyRow[]>([])
  const [filterOpen, setFilterOpen] = useState(true)
  const [rows, setRows] = useState<AnyRow[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [tableEnabled, setTableEnabled] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [changeFrom, setChangeFrom] = useState<Date | null>(new Date())

  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [courseId, setCourseId] = useState<number | null>(null)
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null)
  const [courseYearId, setCourseYearId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [groupSectionId, setGroupSectionId] = useState<number | null>(null)
  const [targetSectionId, setTargetSectionId] = useState<number | null>(null)

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
  useEffect(() => { setCourseId(null); setCourseGroupId(null); setCourseYearId(null); setAcademicYearId(null); setGroupSectionId(null); setTargetSectionId(null) }, [collegeId])
  useEffect(() => { if (!courseId && courses.length) setCourseId(n(courses[0].fk_course_id)) }, [courses, courseId])
  useEffect(() => { setCourseGroupId(null); setCourseYearId(null); setAcademicYearId(null); setGroupSectionId(null); setTargetSectionId(null) }, [courseId])
  useEffect(() => { if (!courseGroupId && courseGroups.length) setCourseGroupId(n(courseGroups[0].fk_course_group_id)) }, [courseGroups, courseGroupId])
  useEffect(() => { setCourseYearId(null); setAcademicYearId(null); setGroupSectionId(null); setTargetSectionId(null) }, [courseGroupId])
  useEffect(() => { if (!courseYearId && courseYears.length) setCourseYearId(n(courseYears[0].fk_course_year_id)) }, [courseYears, courseYearId])
  useEffect(() => { setAcademicYearId(null); setGroupSectionId(null); setTargetSectionId(null) }, [courseYearId])
  useEffect(() => { if (!academicYearId && academicYears.length) setAcademicYearId(n([...academicYears].sort((a, b) => n(b.is_curr_ay) - n(a.is_curr_ay))[0]?.fk_academic_year_id)) }, [academicYears, academicYearId])
  useEffect(() => { setGroupSectionId(null); setTargetSectionId(null) }, [academicYearId])
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
    async function loadStudents() {
      if (!collegeId || !courseGroupId || !groupSectionId) {
        setRows([])
        setTableEnabled(false)
        return
      }
      setLoading(true)
      setTableEnabled(true)
      const list = await listStudentsForModifyStudentBatches({
        collegeId,
        courseGroupId,
        groupSectionId,
      }).catch(() => [])
      setRows(
        (Array.isArray(list) ? list : []).map((row, idx) => ({
          ...row,
          __rowKey: `${n(row.studentId ?? row.fk_student_id) || idx + 1}`,
        })),
      )
      setSelectedIds(new Set())
      setLoading(false)
    }
    void loadStudents()
  }, [collegeId, courseGroupId, groupSectionId])

  function toggleRow(key: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(key)
      else next.delete(key)
      return next
    })
  }

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((row) => {
      const name = s(row.studentName ?? row.student_name ?? row.firstName).toLowerCase()
      const reg = s(row.registerNo ?? row.register_number ?? row.rollNumber ?? row.hallticketNumber).toLowerCase()
      return name.includes(q) || reg.includes(q)
    })
  }, [rows, search])

  const allFilteredSelected = filteredRows.length > 0 && filteredRows.every((r) => selectedIds.has(s(r.__rowKey)))
  function toggleAllFiltered(checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const row of filteredRows) {
        const key = s(row.__rowKey)
        if (checked) next.add(key)
        else next.delete(key)
      }
      return next
    })
  }

  async function onSave() {
    if (!targetSectionId) {
      toastError('Please select target section')
      return
    }
    if (selectedIds.size === 0) {
      toastError('Please select at least one student')
      return
    }
    const selectedRows = rows.filter((r) => selectedIds.has(s(r.__rowKey)))
    const payload = selectedRows.map((student) => ({
      ...student,
      groupSectionId: targetSectionId,
      modifiedOn: changeFrom,
    }))
    setSaving(true)
    try {
      await submitAssignedStudentSections(payload)
      toastSuccess('Student sections updated successfully')
      setSelectedIds(new Set())
    } catch {
      toastError('Failed to update student sections')
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
            Modify Student Section
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
          </div>
        ) : null}
      </div>

      {tableEnabled ? (
        <div className="app-card mt-4 overflow-hidden">
          <div className="px-4 py-2 border-b text-sm font-semibold text-primary">
            Students - {s(courses.find((x) => n(x.fk_course_id) === (courseId ?? 0))?.course_code)} / {s(courseGroups.find((x) => n(x.fk_course_group_id) === (courseGroupId ?? 0))?.group_code)} / {s(courseYears.find((x) => n(x.fk_course_year_id) === (courseYearId ?? 0))?.course_year_name)} / Section {sectionOptions.find((x) => n(x.value) === (groupSectionId ?? 0))?.label ?? '-'} ({s(academicYears.find((x) => n(x.fk_academic_year_id) === (academicYearId ?? 0))?.academic_year)})
          </div>
          <div className="p-3 grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-8">
              <div className="mb-2 max-w-[220px]">
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" className="h-8" />
              </div>
              <div className="rounded border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-2 py-2 text-left w-10">SI.No</th>
                      <th className="px-2 py-2 text-left">Roll No.</th>
                      <th className="px-2 py-2 text-left">Student Name</th>
                      <th className="px-2 py-2 text-left w-[170px]">
                        <div className="inline-flex items-center gap-2">
                          <input type="checkbox" checked={allFilteredSelected} onChange={(e) => toggleAllFiltered(e.target.checked)} />
                          <button type="button" className="text-xs text-muted-foreground" onClick={() => setSelectedIds(new Set())}>UnMark All</button>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td className="px-2 py-3 text-muted-foreground" colSpan={4}>Loading students...</td></tr>
                    ) : filteredRows.length === 0 ? (
                      <tr><td className="px-2 py-3 text-muted-foreground" colSpan={4}>No students found</td></tr>
                    ) : (
                      filteredRows.map((row, idx) => (
                        <tr key={s(row.__rowKey)} className="border-t">
                          <td className="px-2 py-2">{idx + 1}</td>
                          <td className="px-2 py-2">{s(row.registerNo ?? row.register_number ?? row.rollNumber ?? row.hallticketNumber) || '-'}</td>
                          <td className="px-2 py-2">{s(row.studentName ?? row.student_name ?? row.firstName) || '-'}</td>
                          <td className="px-2 py-2">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(s(row.__rowKey))}
                              onChange={(e) => toggleRow(s(row.__rowKey), e.target.checked)}
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="md:col-span-4">
              <div className="rounded border overflow-hidden">
                <div className="px-4 py-2 border-b bg-slate-50 text-sm font-semibold text-center">CHANGE SECTION TO</div>
                <div className="p-3 space-y-3">
                  <DatePicker
                    label="Change From"
                    value={changeFrom}
                    onChange={setChangeFrom}
                    placeholder="Select date"
                  />
                  <Select
                    label="Change Section To *"
                    value={targetSectionId ? String(targetSectionId) : null}
                    onChange={(v) => setTargetSectionId(v ? Number(v) : null)}
                    options={sectionOptions.filter((x) => n(x.value) !== (groupSectionId ?? 0))}
                    searchable
                  />
                  <div className="pt-1 flex justify-end">
                    <Button type="button" className="h-8 px-5" onClick={() => { void onSave() }} disabled={saving || !targetSectionId}>
                      Change
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </PageContainer>
  )
}
