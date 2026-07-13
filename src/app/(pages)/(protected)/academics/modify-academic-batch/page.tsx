'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { Select } from '@/common/components/select'
import { FilteredListPage } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  getDigitalOnlineSyncFilters,
  listStudentBatchesByCollegeCourse,
  listStudentsForModifyStudentBatches,
  listStaffMappingSections,
  submitStudentBatchChange,
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

export default function ModifyAcademicBatchPage() {
  const [filtersData, setFiltersData] = useState<AnyRow[]>([])
  const [academicData, setAcademicData] = useState<AnyRow[]>([])
  const [sections, setSections] = useState<AnyRow[]>([])
  const [studentBatches, setStudentBatches] = useState<AnyRow[]>([])
  const [rows, setRows] = useState<AnyRow[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [tableEnabled, setTableEnabled] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [courseId, setCourseId] = useState<number | null>(null)
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null)
  const [courseYearId, setCourseYearId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [groupSectionId, setGroupSectionId] = useState<number | null>(null)
  const [studentBatchId, setStudentBatchId] = useState<number | null>(null)

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
  const studentBatchOptions = useMemo(
    () => {
      const seen = new Set<string>()
      return studentBatches
        .map((x) => {
          const value = String(n(x.fk_batch_id ?? x.batchId ?? x.batch_id ?? x.studentBatchId ?? x.pk_student_batch_id))
          const label =
            s(x.batch_name)
            || s(x.batchName)
            || s(x.batch_code)
            || s(x.batchCode)
            || s(x.generalDetailCode)
            || s(x.general_detail_code)
            || 'Batch'
          return { value, label }
        })
        .filter((opt) => {
          if (!opt.value || opt.value === '0') return false
          const key = `${opt.value}::${opt.label}`
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
    },
    [studentBatches],
  )

  useEffect(() => { if (!collegeId && colleges.length) setCollegeId(n(colleges[0].fk_college_id)) }, [colleges, collegeId])
  useEffect(() => { setCourseId(null); setCourseGroupId(null); setCourseYearId(null); setAcademicYearId(null); setGroupSectionId(null); setStudentBatchId(null) }, [collegeId])
  useEffect(() => { if (!courseId && courses.length) setCourseId(n(courses[0].fk_course_id)) }, [courses, courseId])
  useEffect(() => { setCourseGroupId(null); setCourseYearId(null); setAcademicYearId(null); setGroupSectionId(null); setStudentBatchId(null) }, [courseId])
  useEffect(() => { if (!courseGroupId && courseGroups.length) setCourseGroupId(n(courseGroups[0].fk_course_group_id)) }, [courseGroups, courseGroupId])
  useEffect(() => { setCourseYearId(null); setAcademicYearId(null); setGroupSectionId(null) }, [courseGroupId])
  useEffect(() => { if (!courseYearId && courseYears.length) setCourseYearId(n(courseYears[0].fk_course_year_id)) }, [courseYears, courseYearId])
  useEffect(() => { setAcademicYearId(null); setGroupSectionId(null) }, [courseYearId])
  useEffect(() => { if (!academicYearId && academicYears.length) setAcademicYearId(n([...academicYears].sort((a, b) => n(b.is_curr_ay) - n(a.is_curr_ay))[0]?.fk_academic_year_id)) }, [academicYears, academicYearId])
  useEffect(() => { setGroupSectionId(null) }, [academicYearId])
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
    async function loadStudentBatches() {
      if (!collegeId || !courseId || !groupSectionId) {
        setStudentBatches([])
        setStudentBatchId(null)
        return
      }
      const list = await listStudentBatchesByCollegeCourse({
        collegeId,
        courseId,
      }).catch(() => [])
      setStudentBatches(Array.isArray(list) ? list : [])
    }
    void loadStudentBatches()
  }, [collegeId, courseId, groupSectionId])

  useEffect(() => {
    if (!studentBatchId && studentBatchOptions.length > 0) {
      setStudentBatchId(n(studentBatchOptions[0].value))
    }
  }, [studentBatchId, studentBatchOptions])

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
  const studentColumnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      { headerName: '#', width: 70, flex: 0, valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1 },
      { headerName: 'Student Name', minWidth: 220, flex: 1, valueGetter: (p) => s(p.data?.studentName ?? p.data?.student_name ?? p.data?.firstName) || '-' },
      { headerName: 'Register No', minWidth: 170, valueGetter: (p) => s(p.data?.registerNo ?? p.data?.register_number ?? p.data?.rollNumber ?? p.data?.hallticketNumber) || '-' },
      {
        headerName: 'Select',
        width: 90,
        flex: 0,
        cellRenderer: (p: ICellRendererParams<AnyRow>) => (
          <input
            type="checkbox"
            checked={selectedIds.has(s(p.data?.__rowKey))}
            onChange={(e) => toggleRow(s(p.data?.__rowKey), e.target.checked)}
          />
        ),
      },
    ],
    [selectedIds],
  )

  async function onSave() {
    if (!studentBatchId) {
      toastError('Please select student batch')
      return
    }
    if (selectedIds.size === 0) {
      toastError('Please select at least one student')
      return
    }
    const selectedRows = rows.filter((r) => selectedIds.has(s(r.__rowKey)))
    const payload = selectedRows.map((student) => ({
      studentId: n(student.studentId ?? student.fk_student_id),
      isActive: student.isActive ?? true,
      groupSectionId: n(student.groupSectionId ?? student.fk_group_section_id),
      regulationId: n(student.regulationId ?? student.fk_regulation_id),
      batchId: studentBatchId,
      academicYearId: n(student.academicYearId ?? student.fk_academic_year_id ?? academicYearId),
      quotaId: n(student.quotaId ?? student.fk_quota_id),
      collegeId: n(student.collegeId ?? student.fk_college_id ?? collegeId),
      courseId: n(student.courseId ?? student.fk_course_id ?? courseId),
      courseGroupId: n(student.courseGroupId ?? student.fk_course_group_id ?? courseGroupId),
      courseYearId: n(student.courseYearId ?? student.fk_course_year_id ?? courseYearId),
      studentStatusId: n(student.studentStatusId ?? student.fk_student_status_id),
      modifiedOn: new Date(),
    }))
    setSaving(true)
    try {
      await submitStudentBatchChange(payload)
      toastSuccess('Student batches updated successfully')
      setSelectedIds(new Set())
    } catch {
      toastError('Failed to update student batches')
    } finally {
      setSaving(false)
    }
  }

  return (
    <FilteredListPage
      title="Modify Student Batches"
      filters={(
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <Select label="College *" value={collegeId ? String(collegeId) : null} onChange={(v) => setCollegeId(v ? Number(v) : null)} options={colleges.map((x) => ({ value: String(n(x.fk_college_id)), label: s(x.college_code) }))} searchable className="md:col-span-3" />
          <Select label="Course *" value={courseId ? String(courseId) : null} onChange={(v) => setCourseId(v ? Number(v) : null)} options={courses.map((x) => ({ value: String(n(x.fk_course_id)), label: s(x.course_code) }))} searchable className="md:col-span-3" />
          <Select label="Course Group *" value={courseGroupId ? String(courseGroupId) : null} onChange={(v) => setCourseGroupId(v ? Number(v) : null)} options={courseGroups.map((x) => ({ value: String(n(x.fk_course_group_id)), label: s(x.group_code) || s(x.group_name) }))} searchable className="md:col-span-3" />
          <Select label="Course Year *" value={courseYearId ? String(courseYearId) : null} onChange={(v) => setCourseYearId(v ? Number(v) : null)} options={courseYears.map((x) => ({ value: String(n(x.fk_course_year_id)), label: s(x.course_year_name) }))} searchable className="md:col-span-3" />
          <Select label="Academic Year *" value={academicYearId ? String(academicYearId) : null} onChange={(v) => setAcademicYearId(v ? Number(v) : null)} options={academicYears.map((x) => ({ value: String(n(x.fk_academic_year_id)), label: s(x.academic_year) }))} searchable className="md:col-span-3" />
          <Select label="Section *" value={groupSectionId ? String(groupSectionId) : null} onChange={(v) => setGroupSectionId(v ? Number(v) : null)} options={sectionOptions} searchable className="md:col-span-2" />
          <Select label="Student Batch *" value={studentBatchId ? String(studentBatchId) : null} onChange={(v) => setStudentBatchId(v ? Number(v) : null)} options={studentBatchOptions} searchable className="md:col-span-2" />
        </div>
      )}
      rowData={tableEnabled ? rows : []}
      columnDefs={studentColumnDefs}
      loading={loading}
      pagination
      toolbar={{ search: true, searchPlaceholder: 'Search students' }}
    >
      {tableEnabled ? (
        <div className="mt-3 flex justify-end">
          <Button type="button" className="h-9" onClick={() => { void onSave() }} disabled={saving || !studentBatchId}>
            Save
          </Button>
        </div>
      ) : null}
    </FilteredListPage>
  )
}

