'use client'

import { useEffect, useMemo, useState } from 'react'
import { Eye } from 'lucide-react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { DataTable } from '@/common/components/table'
import { Select } from '@/common/components/select'
import { FilteredListPage } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  getDigitalOnlineSyncFilters,
  listStaffSubjectRows,
  listStaffMappingSections,
  listActiveEmployeesByCollege,
  saveStaffSubjectMappings,
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

function makeActionsRenderer(
  onAssign: (row: AnyRow) => void,
  onView: (row: AnyRow) => void,
) {
  return (p: ICellRendererParams<AnyRow>) => (
    <div className="flex items-center gap-2 h-full">
      <button type="button" className="text-blue-700 text-xs font-medium hover:underline" onClick={() => onAssign(p.data ?? {})}>Assign</button>
      <span className="text-muted-foreground">|</span>
      <button type="button" className="inline-flex items-center" onClick={() => onView(p.data ?? {})} title="View Staff Details">
        <Eye className="h-3.5 w-3.5 text-slate-600" />
      </button>
    </div>
  )
}

function makeEmployeeCheckboxRenderer(
  checked: Set<number>,
  setChecked: (next: Set<number>) => void,
) {
  return (p: ICellRendererParams<AnyRow>) => {
    const id = n(p.data?.employeeId)
    return (
      <input
        type="checkbox"
        checked={checked.has(id)}
        onChange={(e) => {
          const next = new Set(checked)
          if (e.target.checked) next.add(id)
          else next.delete(id)
          setChecked(next)
        }}
      />
    )
  }
}

export default function StaffSubjectMappingPage() {
  const [filtersData, setFiltersData] = useState<AnyRow[]>([])
  const [academicData, setAcademicData] = useState<AnyRow[]>([])
  const [loading, setLoading] = useState(false)

  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [courseId, setCourseId] = useState<number | null>(null)
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null)
  const [courseYearId, setCourseYearId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [groupSectionId, setGroupSectionId] = useState<number | null>(null)
  const [sections, setSections] = useState<AnyRow[]>([])

  const [rows, setRows] = useState<AnyRow[]>([])
  const [assignOpen, setAssignOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [selectedRow, setSelectedRow] = useState<AnyRow | null>(null)
  const [employees, setEmployees] = useState<AnyRow[]>([])
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [employeeSearch, setEmployeeSearch] = useState('')

  useEffect(() => {
    const orgId = Number(localStorage.getItem('organizationId') ?? 0)
    const empId = Number(localStorage.getItem('employeeId') ?? 0)
    getDigitalOnlineSyncFilters(orgId, empId).then((d) => {
      setFiltersData(d.filtersData as AnyRow[])
      setAcademicData(d.academicYearData as AnyRow[])
    }).catch(() => {
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
  useEffect(() => { setCourseId(null); setCourseGroupId(null); setCourseYearId(null); setAcademicYearId(null); setGroupSectionId(null); setRows([]) }, [collegeId])
  useEffect(() => { if (!courseId && courses.length) setCourseId(n(courses[0].fk_course_id)) }, [courses, courseId])
  useEffect(() => { setCourseGroupId(null); setCourseYearId(null); setAcademicYearId(null); setGroupSectionId(null); setRows([]) }, [courseId])
  useEffect(() => { if (!courseGroupId && courseGroups.length) setCourseGroupId(n(courseGroups[0].fk_course_group_id)) }, [courseGroups, courseGroupId])
  useEffect(() => { setCourseYearId(null); setAcademicYearId(null); setGroupSectionId(null); setRows([]) }, [courseGroupId])
  useEffect(() => { if (!courseYearId && courseYears.length) setCourseYearId(n(courseYears[0].fk_course_year_id)) }, [courseYears, courseYearId])
  useEffect(() => { setAcademicYearId(null); setGroupSectionId(null); setRows([]) }, [courseYearId])
  useEffect(() => { if (!academicYearId && academicYears.length) setAcademicYearId(n([...academicYears].sort((a, b) => n(b.is_curr_ay) - n(a.is_curr_ay))[0]?.fk_academic_year_id)) }, [academicYears, academicYearId])
  useEffect(() => { setGroupSectionId(null); setRows([]); setSections([]) }, [academicYearId])
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
    if (!collegeId || !academicYearId || !groupSectionId) return setRows([])
    setLoading(true)
    listStaffSubjectRows({ collegeId, academicYearId, groupSectionId })
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [collegeId, academicYearId, groupSectionId])

  const contextLine = useMemo(() => {
    const clg = s(colleges.find((x) => n(x.fk_college_id) === collegeId)?.college_code)
    const ay = s(academicYears.find((x) => n(x.fk_academic_year_id) === academicYearId)?.academic_year)
    const c = s(courses.find((x) => n(x.fk_course_id) === courseId)?.course_code)
    const g = s(courseGroups.find((x) => n(x.fk_course_group_id) === courseGroupId)?.group_code)
    const y = s(courseYears.find((x) => n(x.fk_course_year_id) === courseYearId)?.course_year_name)
    const sec = s(sections.find((x) => n(x.pk_group_section_id ?? x.groupSectionId) === groupSectionId)?.section)
    return [clg, ay, c, g, y, sec].filter(Boolean).join(' / ')
  }, [colleges, academicYears, courses, courseGroups, courseYears, sections, collegeId, academicYearId, courseId, courseGroupId, courseYearId, groupSectionId])

  function renderStaffCell(p: ICellRendererParams<AnyRow>) {
    const staff = Array.isArray(p.data?.staffCourseyrSubjects) ? p.data.staffCourseyrSubjects : []
    if (staff.length === 0) return <span className="text-red-600">Not Assigned</span>
    const names = staff.map((x: AnyRow) => [x.firstName, x.middleName, x.lastName].filter(Boolean).join(' ').trim()).filter(Boolean)
    return <span>{names.length ? names.join(', ') : '-'}</span>
  }

  async function openAssign(row: AnyRow) {
    if (!collegeId) return
    setSelectedRow(row)
    setAssignOpen(true)
    const list = await listActiveEmployeesByCollege(collegeId).catch(() => [])
    const mapped = new Set<number>((row.staffCourseyrSubjects ?? []).map((x: AnyRow) => n(x.employeeId)).filter(Boolean))
    setEmployees(list)
    setChecked(mapped)
    setEmployeeSearch('')
  }

  async function saveAssign() {
    if (!selectedRow || !collegeId || !academicYearId) return
    const existing = Array.isArray(selectedRow.staffCourseyrSubjects) ? selectedRow.staffCourseyrSubjects : []
    const existingByEmp = new Map<number, AnyRow>(existing.map((x: AnyRow) => [n(x.employeeId), x]))
    const payload: AnyRow[] = []

    for (const emp of employees) {
      const employeeId = n(emp.employeeId)
      if (!employeeId) continue
      const found = existingByEmp.get(employeeId)
      const isChecked = checked.has(employeeId)
      if (found && !isChecked) {
        payload.push({ ...found, isActive: false, toDate: new Date().toISOString().slice(0, 10) })
      } else if (found && isChecked) {
        payload.push(found)
      } else if (!found && isChecked) {
        payload.push({
          employeeId,
          subjectCourseyearId: n(selectedRow.subjectCourseyearId),
          collegeId,
          academicYearId,
          fromDate: new Date().toISOString().slice(0, 10),
          toDate: '9999-12-31',
          isActive: true,
        })
      }
    }
    try {
      await saveStaffSubjectMappings(payload)
      toastSuccess('Staff mapping saved')
      setAssignOpen(false)
      const refreshed = await listStaffSubjectRows({ collegeId, academicYearId, groupSectionId: n(groupSectionId) })
      setRows(refreshed)
    } catch {
      toastError('Failed to save staff mapping')
    }
  }

  const columnDefs = useMemo<ColDef<AnyRow>[]>(() => [
    { headerName: 'SI.No', valueGetter: (p: any) => (p.node?.rowIndex ?? 0) + 1, minWidth: 70, maxWidth: 80, flex: 0 },
    { field: 'subjectName', headerName: 'Subject', minWidth: 180, flex: 1.2 },
    { field: 'subjectCode', headerName: 'Subject Code', minWidth: 120, flex: 1 },
    { field: 'subjectType', headerName: 'Subject Type', minWidth: 120, flex: 1 },
    { field: 'regulationName', headerName: 'Regulation', minWidth: 110, flex: 1 },
    { headerName: 'Staff', minWidth: 220, flex: 1.5, cellRenderer: renderStaffCell },
    {
      headerName: 'Actions',
      minWidth: 140,
      maxWidth: 160,
      flex: 0,
      cellRenderer: makeActionsRenderer(
        (row) => { void openAssign(row) },
        (row) => { setSelectedRow(row); setViewOpen(true) },
      ),
    },
  ], [openAssign])

  const assignedStaffText = useMemo(() => {
    const staff = Array.isArray(selectedRow?.staffCourseyrSubjects) ? selectedRow?.staffCourseyrSubjects : []
    const chips = staff
      .map((x: AnyRow) => {
        const name = [x.firstName, x.middleName, x.lastName].filter(Boolean).join(' ').trim()
        const emp = s(x.empNumber)
        if (!name && !emp) return ''
        if (!name) return emp
        if (!emp) return name
        return `${name} - ${emp}`
      })
      .filter(Boolean)
    return chips.length > 0 ? chips.join(', ') : '-'
  }, [selectedRow])

  const filteredEmployees = useMemo(() => {
    const q = employeeSearch.trim().toLowerCase()
    if (!q) return employees
    return employees.filter((row) => {
      const fullName = [row.firstName, row.middleName, row.lastName].filter(Boolean).join(' ').toLowerCase()
      return (
        s(row.empNumber).toLowerCase().includes(q)
        || fullName.includes(q)
        || s(row.deptName).toLowerCase().includes(q)
      )
    })
  }, [employees, employeeSearch])

  return (
    <>
      <FilteredListPage
        title="Staff Subject Mapping"
        notice={rows.length > 0 ? (
          <div className="px-1 text-[13px] text-blue-700 font-medium">{contextLine}</div>
        ) : undefined}
        filters={(
          <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
            <Select label="College" value={collegeId ? String(collegeId) : null} onChange={(v) => setCollegeId(v ? Number(v) : null)} options={colleges.map((x) => ({ value: String(n(x.fk_college_id)), label: s(x.college_code) }))} searchable />
            <Select label="Course" value={courseId ? String(courseId) : null} onChange={(v) => setCourseId(v ? Number(v) : null)} options={courses.map((x) => ({ value: String(n(x.fk_course_id)), label: s(x.course_code) }))} searchable disabled={!collegeId} />
            <Select label="Course Group" value={courseGroupId ? String(courseGroupId) : null} onChange={(v) => setCourseGroupId(v ? Number(v) : null)} options={courseGroups.map((x) => ({ value: String(n(x.fk_course_group_id)), label: s(x.group_code) }))} searchable disabled={!courseId} />
            <Select label="Course Year" value={courseYearId ? String(courseYearId) : null} onChange={(v) => setCourseYearId(v ? Number(v) : null)} options={courseYears.map((x) => ({ value: String(n(x.fk_course_year_id)), label: s(x.course_year_name) }))} searchable disabled={!courseGroupId} />
            <Select label="Academic Year" value={academicYearId ? String(academicYearId) : null} onChange={(v) => setAcademicYearId(v ? Number(v) : null)} options={academicYears.map((x) => ({ value: String(n(x.fk_academic_year_id)), label: s(x.academic_year) }))} searchable disabled={!courseYearId} />
            <Select label="Section" value={groupSectionId ? String(groupSectionId) : null} onChange={(v) => setGroupSectionId(v ? Number(v) : null)} options={sections.map((x) => ({ value: String(n(x.pk_group_section_id ?? x.groupSectionId)), label: s(x.section) }))} searchable disabled={!academicYearId} />
          </div>
        )}
        rowData={rows}
        columnDefs={columnDefs}
        loading={loading}
        toolbar={{ search: true, searchPlaceholder: 'Search' }}
        pagination
        paginationPageSize={10}
      />

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-hidden p-0 flex flex-col">
          <DialogHeader className="px-5 pt-4 pb-3 pr-12 border-b bg-background sm:pl-10 sm:pt-10">
            <DialogTitle className="text-base font-semibold leading-normal text-[hsl(var(--primary))]">
              Staff List
            </DialogTitle>
          </DialogHeader>
          <div className="px-4 py-3 space-y-3 flex-1 overflow-y-auto">
            <div className="rounded border p-3 grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
              <Input
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                placeholder="Employee Number / Name / Department"
                className="h-9"
              />
              <div className="text-sm">
                <span className="text-[#1f5b89] font-semibold">Assigned Staff : </span>
                <span>{assignedStaffText}</span>
              </div>
            </div>

            <DataTable
              rowData={filteredEmployees}
              columnDefs={[
                {
                  headerName: 'Select',
                  minWidth: 72,
                  maxWidth: 84,
                  flex: 0,
                  cellRenderer: makeEmployeeCheckboxRenderer(checked, setChecked),
                },
                { field: 'empNumber', headerName: 'Employee No', minWidth: 130, flex: 1 },
                {
                  headerName: 'Staff Name',
                  minWidth: 210,
                  flex: 1.4,
                  valueGetter: (p: any) => [p.data?.firstName, p.data?.middleName, p.data?.lastName].filter(Boolean).join(' '),
                },
                { field: 'designationName', headerName: 'Designation', minWidth: 170, flex: 1.1 },
                { field: 'deptName', headerName: 'Department', minWidth: 140, flex: 1.1 },
              ]}
              pagination
              paginationPageSize={10}
            />
          </div>
          <DialogFooter className="px-4 py-3 border-t bg-background">
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Close</Button>
            <Button onClick={() => { void saveAssign() }}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>Staff Details</DialogTitle></DialogHeader>
          <div className="text-sm space-y-2">
            {Array.isArray(selectedRow?.staffCourseyrSubjects) && selectedRow.staffCourseyrSubjects.length > 0 ? (
              selectedRow.staffCourseyrSubjects.map((x: AnyRow, i: number) => (
                <div key={`${n(x.employeeId)}-${i}`}>{[x.firstName, x.middleName, x.lastName].filter(Boolean).join(' ') || '-'}</div>
              ))
            ) : (
              <div className="text-muted-foreground">No staff assigned</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

