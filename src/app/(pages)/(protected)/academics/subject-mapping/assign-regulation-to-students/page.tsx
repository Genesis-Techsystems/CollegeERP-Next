'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { Select } from '@/common/components/select'
import { FilteredListPage } from '@/components/layout'
import { Button } from '@/components/ui/button'
import {
  getDigitalOnlineSyncFilters,
  listRegulationsByCourse,
  listStaffMappingSections,
  listStudentsForPromotionPreview,
  submitAssignedStudentRegulations,
} from '@/services'
import { toastError, toastSuccess } from '@/lib/toast'

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

export default function AssignRegulationToStudentsPage() {
  const [filtersData, setFiltersData] = useState<AnyRow[]>([])
  const [academicData, setAcademicData] = useState<AnyRow[]>([])
  const [sections, setSections] = useState<AnyRow[]>([])
  const [regulations, setRegulations] = useState<AnyRow[]>([])
  const [rows, setRows] = useState<AnyRow[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [tableEnabled, setTableEnabled] = useState(false)
  const [bulkRegulationId, setBulkRegulationId] = useState<number | null>(null)

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

  useEffect(() => { if (!collegeId && colleges.length) setCollegeId(n(colleges[0].fk_college_id)) }, [colleges, collegeId])
  useEffect(() => { setCourseId(null); setCourseGroupId(null); setCourseYearId(null); setAcademicYearId(null); setGroupSectionId(null) }, [collegeId])
  useEffect(() => { if (!courseId && courses.length) setCourseId(n(courses[0].fk_course_id)) }, [courses, courseId])
  useEffect(() => { setCourseGroupId(null); setCourseYearId(null); setAcademicYearId(null); setGroupSectionId(null) }, [courseId])
  useEffect(() => { if (!courseGroupId && courseGroups.length) setCourseGroupId(n(courseGroups[0].fk_course_group_id)) }, [courseGroups, courseGroupId])
  useEffect(() => { setCourseYearId(null); setAcademicYearId(null); setGroupSectionId(null) }, [courseGroupId])
  useEffect(() => { if (!courseYearId && courseYears.length) setCourseYearId(n(courseYears[0].fk_course_year_id)) }, [courseYears, courseYearId])
  useEffect(() => { setAcademicYearId(null); setGroupSectionId(null) }, [courseYearId])
  useEffect(() => { if (!academicYearId && academicYears.length) setAcademicYearId(n([...academicYears].sort((a, b) => n(b.is_curr_ay) - n(a.is_curr_ay))[0]?.fk_academic_year_id)) }, [academicYears, academicYearId])
  useEffect(() => {
    setGroupSectionId(null)
    setSections([])
    setRegulations([])
    setBulkRegulationId(null)
    setRows([])
    setTableEnabled(false)
  }, [academicYearId])
  useEffect(() => {
    if (!groupSectionId && sections.length) {
      setGroupSectionId(n(sections[0].pk_group_section_id ?? sections[0].groupSectionId))
    }
  }, [sections, groupSectionId])

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

  const loadStudents = useCallback(async () => {
    if (!collegeId || !courseGroupId || !groupSectionId) {
      setRows([])
      setTableEnabled(false)
      return
    }
    setLoading(true)
    setTableEnabled(true)
    setBulkRegulationId(null)
    try {
      const [list, regs] = await Promise.all([
        listStudentsForPromotionPreview({ collegeId, courseGroupId, groupSectionId }),
        courseId ? listRegulationsByCourse(courseId) : Promise.resolve([] as AnyRow[]),
      ])
      setRegulations(Array.isArray(regs) ? regs : [])
      const normalizedRows = (Array.isArray(list) ? list : []).map((row, idx) => ({
        ...row,
        __rowKey: `${n(row.studentId ?? row.fk_student_id) || idx + 1}`,
        isStudentModification: false,
        assignedRegulationId: n(row.regulationId ?? row.assignedRegulationId ?? row.fk_regulation_id) || null,
      }))
      setRows(normalizedRows)
    } catch {
      setRows([])
      setRegulations([])
      toastError('Failed to load students')
    } finally {
      setLoading(false)
    }
  }, [collegeId, courseGroupId, groupSectionId, courseId])

  useEffect(() => {
    void loadStudents()
  }, [loadStudents])

  const regulationOptions = useMemo(
    () => regulations.map((reg) => ({
      value: String(n(reg.regulationId ?? reg.pk_regulation_id)),
      label: s(reg.regulationName) || s(reg.regulationCode) || String(n(reg.regulationId ?? reg.pk_regulation_id)),
    })),
    [regulations],
  )

  function updateRowRegulation(rowKey: string, nextId: number | null) {
    setRows((prev) => prev.map((r) => (r.__rowKey === rowKey ? { ...r, assignedRegulationId: nextId, regulationId: nextId } : r)))
  }

  /** Angular `selectedRegulation` — apply one regulation to every loaded student. */
  function applyBulkRegulation(regulationId: number | null) {
    setBulkRegulationId(regulationId)
    if (regulationId == null) return
    setRows((prev) => prev.map((r) => ({ ...r, assignedRegulationId: regulationId, regulationId })))
  }

  async function onSave() {
    if (rows.length === 0) return
    // Angular posts the full students array via addStudentslist
    const payload = rows.map((row) => ({
      ...row,
      regulationId: n(row.assignedRegulationId) || null,
      isStudentModification: false,
    }))

    setSaving(true)
    try {
      await submitAssignedStudentRegulations(payload)
      toastSuccess('Student regulations saved successfully')
      await loadStudents()
    } catch {
      toastError('Failed to save student regulations')
    } finally {
      setSaving(false)
    }
  }

  function regulationRenderer(p: ICellRendererParams<AnyRow>) {
    const row = p.data
    if (!row) return null
    const selected = n(row.assignedRegulationId)
    return (
      <Select
        value={selected > 0 ? String(selected) : null}
        onChange={(v) => updateRowRegulation(s(row.__rowKey), v ? Number(v) : null)}
        options={regulationOptions}
        placeholder="Regulation"
        className="min-w-[140px]"
      />
    )
  }

  const columnDefs = useMemo<ColDef<AnyRow>[]>(() => [
    {
      headerName: 'No.',
      valueGetter: (p: any) => (p.node?.rowIndex ?? 0) + 1,
      minWidth: 70,
      maxWidth: 85,
      flex: 0,
    },
    {
      headerName: 'Admission No',
      minWidth: 140,
      flex: 1,
      valueGetter: (p) => s(p.data?.admissionNumber ?? p.data?.admission_no ?? p.data?.admissionNo) || '',
    },
    {
      headerName: 'Student Name',
      minWidth: 240,
      flex: 1.4,
      valueGetter: (p) => {
        const name = s(p.data?.firstName ?? p.data?.studentName ?? p.data?.student_name ?? '-')
        const roll = s(p.data?.rollNumber ?? p.data?.roll_number ?? p.data?.hallticketNumber ?? p.data?.registerNo)
        return roll ? `${name} (${roll})` : name
      },
      cellStyle: { color: 'hsl(var(--primary))' },
    },
    {
      headerName: 'Regulation',
      minWidth: 180,
      flex: 1,
      cellRenderer: regulationRenderer,
      sortable: false,
      filter: false,
    },
  ], [regulationOptions])

  return (
    <FilteredListPage
      title="Assign Regulation to Student"
      filters={(
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <Select label="College *" value={collegeId ? String(collegeId) : null} onChange={(v) => setCollegeId(v ? Number(v) : null)} options={colleges.map((x) => ({ value: String(n(x.fk_college_id)), label: s(x.college_code) }))} searchable className="md:col-span-2" />
          <Select label="Course *" value={courseId ? String(courseId) : null} onChange={(v) => setCourseId(v ? Number(v) : null)} options={courses.map((x) => ({ value: String(n(x.fk_course_id)), label: s(x.course_code) }))} searchable className="md:col-span-2" />
          <Select label="Course Group *" value={courseGroupId ? String(courseGroupId) : null} onChange={(v) => setCourseGroupId(v ? Number(v) : null)} options={courseGroups.map((x) => ({ value: String(n(x.fk_course_group_id)), label: s(x.group_code) || s(x.group_name) }))} searchable className="md:col-span-2" />
          <Select label="Course Year *" value={courseYearId ? String(courseYearId) : null} onChange={(v) => setCourseYearId(v ? Number(v) : null)} options={courseYears.map((x) => ({ value: String(n(x.fk_course_year_id)), label: s(x.course_year_name) }))} searchable className="md:col-span-2" />
          <Select label="Academic Year *" value={academicYearId ? String(academicYearId) : null} onChange={(v) => setAcademicYearId(v ? Number(v) : null)} options={academicYears.map((x) => ({ value: String(n(x.fk_academic_year_id)), label: s(x.academic_year) }))} searchable className="md:col-span-2" />
          <Select
            label="Section *"
            value={groupSectionId ? String(groupSectionId) : null}
            onChange={(v) => setGroupSectionId(v ? Number(v) : null)}
            options={sections.map((x) => ({ value: String(n(x.pk_group_section_id ?? x.groupSectionId)), label: s(x.section) || s(x.sectionName) }))}
            searchable
            className="md:col-span-2"
          />
        </div>
      )}
      rowData={tableEnabled ? rows : []}
      columnDefs={columnDefs}
      loading={loading}
      toolbar={{ search: true, searchPlaceholder: 'Search' }}
      toolbarLeading={
        tableEnabled && rows.length > 0 ? (
          <Select
            value={bulkRegulationId ? String(bulkRegulationId) : null}
            onChange={(v) => applyBulkRegulation(v ? Number(v) : null)}
            options={regulationOptions}
            placeholder="Regulation"
            className="min-w-[180px]"
          />
        ) : null
      }
      getRowId={(p) => s((p.data as AnyRow)?.__rowKey)}
      pagination
      paginationPageSize={10}
    >
      {tableEnabled && rows.length > 0 ? (
        <div className="mt-3 flex items-end justify-end gap-2">
          <Button type="button" className="h-9" disabled={saving} onClick={() => { void onSave() }}>
            Save
          </Button>
        </div>
      ) : null}
    </FilteredListPage>
  )
}
