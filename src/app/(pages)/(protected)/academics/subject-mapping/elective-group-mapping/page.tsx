'use client'

import { useEffect, useMemo, useState } from 'react'
import { Eye, Trash2 } from 'lucide-react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { Select } from '@/common/components/select'
import { FilteredListPage } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toastError, toastInfo, toastSuccess } from '@/lib/toast'
import {
  createElectiveGroupMapping,
  getDigitalOnlineSyncFilters,
  listElectiveGroupMappings,
  listElectiveGroupSections,
  listElectiveGroupStaff,
  listElectiveSubjectsForGroup,
} from '@/services'

type AnyRow = Record<string, any>

const n = (v: unknown) => Number(v) || 0
const s = (v: unknown) => {
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  return ''
}
const pickText = (row: AnyRow, keys: string[]) => {
  for (const key of keys) {
    const value = s(row?.[key]).trim()
    if (value) return value
  }
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

export default function ElectiveGroupMappingPage() {
  const [filtersData, setFiltersData] = useState<AnyRow[]>([])
  const [academicData, setAcademicData] = useState<AnyRow[]>([])
  const [rows, setRows] = useState<AnyRow[]>([])
  const [loading, setLoading] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [tableEnabled, setTableEnabled] = useState(false)

  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [addCourseId, setAddCourseId] = useState<number | null>(null)
  const [addCourseGroupId, setAddCourseGroupId] = useState<number | null>(null)
  const [addCourseYearId, setAddCourseYearId] = useState<number | null>(null)
  const [addElectiveId, setAddElectiveId] = useState<number | null>(null)
  const [addStaffId, setAddStaffId] = useState<number | null>(null)
  const [addIsActive, setAddIsActive] = useState(true)
  const [saving, setSaving] = useState(false)

  // Modal cascade data (Angular AddElectiveGroupComponent)
  const [electiveSubjects, setElectiveSubjects] = useState<AnyRow[]>([])
  const [employees, setEmployees] = useState<AnyRow[]>([])
  const [sections, setSections] = useState<AnyRow[]>([])

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
  const academicYears = useMemo(() => {
    const univId = n(filtersData.find((x) => n(x.fk_college_id) === (collegeId ?? 0))?.fk_university_id)
    return uniq(academicData.filter((r) => n(r.fk_university_id) === univId), 'fk_academic_year_id')
      .sort((a, b) => String(b.academic_year ?? '').localeCompare(String(a.academic_year ?? '')))
  }, [academicData, filtersData, collegeId])
  const addCourses = useMemo(
    () => uniq(filtersData.filter((r) => n(r.fk_college_id) === (collegeId ?? 0)), 'fk_course_id'),
    [filtersData, collegeId],
  )
  const addCourseGroups = useMemo(
    () => uniq(
      filtersData.filter(
        (r) => n(r.fk_college_id) === (collegeId ?? 0) && n(r.fk_course_id) === (addCourseId ?? 0),
      ),
      'fk_course_group_id',
    ),
    [filtersData, collegeId, addCourseId],
  )
  const addCourseYears = useMemo(
    () => uniq(
      filtersData.filter(
        (r) =>
          n(r.fk_college_id) === (collegeId ?? 0)
          && n(r.fk_course_id) === (addCourseId ?? 0)
          && n(r.fk_course_group_id) === (addCourseGroupId ?? 0),
      ),
      'fk_course_year_id',
    ).sort((a, b) => n(a.year_order) - n(b.year_order)),
    [filtersData, collegeId, addCourseId, addCourseGroupId],
  )
  // Elective dropdown = elective subjects for the chosen course-group/year (Angular electiveSubjects)
  const addElectiveOptions = useMemo(
    () => electiveSubjects
      .filter((x) => n(x.subjectId))
      .map((x) => ({ value: String(n(x.subjectId)), label: s(x.subjectName) || s(x.subjectCode) })),
    [electiveSubjects],
  )
  // Staff dropdown = employees mapped to the chosen elective (Angular employees)
  const addStaffOptions = useMemo(
    () => employees
      .filter((e) => n(e.employeeId))
      .map((e) => ({ value: String(n(e.employeeId)), label: s(e.firstName) || s(e.employeeName) })),
    [employees],
  )
  // subjectTypeId of the chosen elective — needed by the staff query (Angular subjecttypeId)
  const selectedSubjectTypeId = useMemo(() => {
    const sub = electiveSubjects.find((x) => n(x.subjectId) === (addElectiveId ?? 0))
    return sub ? (sub.subjecttypeId ?? sub.subjectTypeId ?? '') : ''
  }, [electiveSubjects, addElectiveId])
  // Computed elective group name (Angular checkedSection) — read-only, also sent in payload
  const electiveGroupName = useMemo(() => {
    const collegeCode = s(colleges.find((c) => n(c.fk_college_id) === (collegeId ?? 0))?.college_code)
    const groupCode = s(addCourseGroups.find((g) => n(g.fk_course_group_id) === (addCourseGroupId ?? 0))?.group_code)
    const courseYearName = s(addCourseYears.find((y) => n(y.fk_course_year_id) === (addCourseYearId ?? 0))?.course_year_name)
    const subject = s(electiveSubjects.find((x) => n(x.subjectId) === (addElectiveId ?? 0))?.subjectName)
    const staff = s(employees.find((e) => n(e.employeeId) === (addStaffId ?? 0))?.firstName)
    const checkedSections = sections.filter((sec) => sec.checked)
    if (!subject && !staff && checkedSections.length === 0) return ''
    const secStr = checkedSections.map((sec) => s(sec.section)).join('-')
    return `${collegeCode}-${groupCode}-${courseYearName}[${secStr}] (${subject})${staff}`
  }, [colleges, collegeId, addCourseGroups, addCourseGroupId, addCourseYears, addCourseYearId, electiveSubjects, addElectiveId, employees, addStaffId, sections])

  useEffect(() => { if (!collegeId && colleges.length) setCollegeId(n(colleges[0].fk_college_id)) }, [colleges, collegeId])
  useEffect(() => { setAcademicYearId(null) }, [collegeId])
  useEffect(() => {
    if (!academicYearId && academicYears.length) {
      const latest = [...academicYears].sort((a, b) => n(b.is_curr_ay) - n(a.is_curr_ay))[0]
      setAcademicYearId(n(latest?.fk_academic_year_id))
    }
  }, [academicYears, academicYearId])

  useEffect(() => {
    setRows([])
    setTableEnabled(false)
  }, [collegeId, academicYearId])
  useEffect(() => { if (!addCourseId && addCourses.length) setAddCourseId(n(addCourses[0].fk_course_id)) }, [addCourses, addCourseId])
  useEffect(() => { setAddCourseGroupId(null); setAddCourseYearId(null) }, [addCourseId])
  useEffect(() => { if (!addCourseGroupId && addCourseGroups.length) setAddCourseGroupId(n(addCourseGroups[0].fk_course_group_id)) }, [addCourseGroups, addCourseGroupId])
  useEffect(() => { setAddCourseYearId(null) }, [addCourseGroupId])
  useEffect(() => { if (!addCourseYearId && addCourseYears.length) setAddCourseYearId(n(addCourseYears[0].fk_course_year_id)) }, [addCourseYears, addCourseYearId])

  // Elective subjects for the chosen course-group/year (Angular selectedYear → getElectiveSubjects1)
  useEffect(() => {
    async function load() {
      setAddElectiveId(null)
      setAddStaffId(null)
      setEmployees([])
      setSections([])
      if (!addOpen || !collegeId || !academicYearId || !addCourseGroupId || !addCourseYearId) {
        setElectiveSubjects([])
        return
      }
      const list = await listElectiveSubjectsForGroup({
        collegeId, academicYearId, courseGroupId: addCourseGroupId, courseYearId: addCourseYearId,
      }).catch(() => [])
      setElectiveSubjects(Array.isArray(list) ? list : [])
    }
    void load()
  }, [addOpen, collegeId, academicYearId, addCourseGroupId, addCourseYearId])

  // Staff mapped to the chosen elective (Angular selectedSubject → staffcourseyrsubjects)
  useEffect(() => {
    async function load() {
      setAddStaffId(null)
      setSections([])
      if (!addElectiveId || !collegeId || !academicYearId || !addCourseGroupId || !addCourseYearId) {
        setEmployees([])
        return
      }
      const list = await listElectiveGroupStaff({
        collegeId,
        academicYearId,
        subjectId: addElectiveId,
        subjectTypeId: selectedSubjectTypeId,
        courseGroupId: addCourseGroupId,
        courseYearId: addCourseYearId,
      }).catch(() => [])
      const seen = new Set<number>()
      const emps: AnyRow[] = []
      for (const e of Array.isArray(list) ? list : []) {
        const id = n(e.employeeId)
        if (id && !seen.has(id)) { seen.add(id); emps.push(e) }
      }
      setEmployees(emps)
    }
    void load()
  }, [addElectiveId, selectedSubjectTypeId, collegeId, academicYearId, addCourseGroupId, addCourseYearId])

  // Sections for the chosen subject + staff (Angular selectedStaff → staffSections)
  useEffect(() => {
    async function load() {
      if (!addStaffId || !collegeId || !academicYearId || !addElectiveId || !addCourseYearId || !addCourseGroupId) {
        setSections([])
        return
      }
      const list = await listElectiveGroupSections({
        collegeId,
        academicYearId,
        subjectId: addElectiveId,
        employeeId: addStaffId,
        courseYearId: addCourseYearId,
        courseGroupId: addCourseGroupId,
      }).catch(() => [])
      setSections((Array.isArray(list) ? list : []).map((sec) => ({
        ...sec,
        checked: false,
        check: true,
        batchwiseStudents: Array.isArray(sec.batchwiseStudents) ? sec.batchwiseStudents : [],
      })))
    }
    void load()
  }, [addStaffId, collegeId, academicYearId, addElectiveId, addCourseYearId, addCourseGroupId])

  function electiveGroupNameOf(row: AnyRow) {
    const direct = pickText(row, [
      'electiveGroupName',
      'elective_group_name',
      'groupName',
      'group_name',
      'groupname',
      'electiveGroup',
      'elective_group',
      'ElectiveGroup.electiveGroupName',
      'ElectiveGroup.groupName',
    ])
    if (direct) return direct

    const nested = (row?.ElectiveGroup ?? row?.electiveGroup ?? row?.electivegroup ?? {}) as AnyRow
    const nestedName = pickText(nested, [
      'electiveGroupName',
      'elective_group_name',
      'groupName',
      'group_name',
      'name',
      'electiveGroup',
    ])
    if (nestedName) return nestedName

    const fallbackCode = pickText(row, ['electiveGroupCode', 'groupCode', 'elective_group_code'])
    if (fallbackCode) return fallbackCode

    return '-'
  }

  const loadElectives = async () => {
    if (!collegeId || !academicYearId) return
    setLoading(true)
    setTableEnabled(true)
    const list = await listElectiveGroupMappings({ collegeId, academicYearId }).catch(() => [])
    setRows(Array.isArray(list) ? list : [])
    setLoading(false)
  }

  function toggleSection(index: number, checked: boolean) {
    setSections((prev) => prev.map((sec, i) => (i === index ? { ...sec, checked, check: checked } : sec)))
  }

  // Angular AddElectiveGroupComponent.submit() + parent openDialog/postMapping
  async function onSave() {
    if (!collegeId || !academicYearId || !addCourseId || !addCourseGroupId || !addCourseYearId || !addElectiveId) {
      toastInfo('Please fill all required fields.')
      return
    }
    // Only checked, brand-new sections are created (Angular: no electiveGroupyrMappingId → else branch)
    const eleGroup = sections
      .filter((sec) => sec.checked && !sec.electiveGroupyrMappingId)
      .map((sec) => ({
        academicYearId,
        subjectId: addElectiveId,
        groupSectionId: n(sec.groupSectionId),
        electivegroupname: electiveGroupName,
        isActive: addIsActive,
        collegeId,
        employeeId: addStaffId ?? null,
      }))
    if (eleGroup.length === 0) {
      toastInfo('Please select at least one section.')
      return
    }
    // Duplicate guard (Angular openDialog.afterClosed): same college/AY/subject/staff/course-year already mapped
    const duplicate = rows.some((r) =>
      n(r.subjectId) === addElectiveId
      && n(r.employeeId) === (addStaffId ?? 0)
      && n(r.courseYearId) === addCourseYearId)
    if (duplicate) {
      toastInfo('Already elective mapping has done please check.')
      return
    }
    setSaving(true)
    try {
      await createElectiveGroupMapping(eleGroup)
      toastSuccess('Elective group added successfully.')
      setAddOpen(false)
      await loadElectives()
    } catch (err) {
      toastError(err, 'Failed to add elective group')
    } finally {
      setSaving(false)
    }
  }

  function actionsRenderer(_p: ICellRendererParams<AnyRow>) {
    return (
      <div className="flex items-center gap-2 h-full">
        <button type="button" className="text-red-700 hover:text-red-800" title="Delete">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
        <span className="text-muted-foreground">|</span>
        <button type="button" className="text-slate-600 hover:text-slate-800" title="View">
          <Eye className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  const columnDefs = useMemo<ColDef<AnyRow>[]>(() => [
    {
      headerName: 'SI.No',
      valueGetter: (p: any) => (p.node?.rowIndex ?? 0) + 1,
      minWidth: 70,
      maxWidth: 90,
      flex: 0,
    },
    {
      headerName: 'Elective Group Name',
      minWidth: 280,
      flex: 1,
      valueGetter: (p) => electiveGroupNameOf(p.data ?? {}),
    },
    {
      headerName: 'Actions',
      minWidth: 110,
      maxWidth: 130,
      flex: 0,
      cellRenderer: actionsRenderer,
    },
  ], [])

  return (
    <>
      <FilteredListPage
        title="Elective Group Mapping"
        filters={(
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
            <Select
              label="College *"
              value={collegeId ? String(collegeId) : null}
              onChange={(v) => setCollegeId(v ? Number(v) : null)}
              options={colleges.map((x) => ({ value: String(n(x.fk_college_id)), label: s(x.college_code) }))}
              searchable
            />
            <Select
              label="Academic Year *"
              value={academicYearId ? String(academicYearId) : null}
              onChange={(v) => setAcademicYearId(v ? Number(v) : null)}
              options={academicYears.map((x) => ({ value: String(n(x.fk_academic_year_id)), label: s(x.academic_year) }))}
              searchable
              disabled={!collegeId}
            />
            <div className="md:col-span-1">
              <Button type="button" className="h-9 w-full" disabled={!collegeId || !academicYearId} onClick={() => { void loadElectives() }}>
                Get Electives
              </Button>
            </div>
          </div>
        )}
        rowData={tableEnabled ? rows : []}
        columnDefs={columnDefs}
        loading={loading}
        toolbar={{ search: true, searchPlaceholder: 'Search' }}
        toolbarTrailing={(
          <Button type="button" size="sm" className="h-[30px] bg-primary px-3 text-[12px] text-white hover:bg-[#123d79]" onClick={() => setAddOpen(true)}>
            + Add Elective Group
          </Button>
        )}
        pagination
        paginationPageSize={10}
      />

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pr-8">
            <DialogTitle className="text-base font-semibold leading-none text-[hsl(var(--primary))]">Add Elective Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Select
                label="Course *"
                value={addCourseId ? String(addCourseId) : null}
                onChange={(v) => setAddCourseId(v ? Number(v) : null)}
                options={addCourses.map((x) => ({ value: String(n(x.fk_course_id)), label: s(x.course_code) || s(x.course_name) }))}
                searchable
              />
              <Select
                label="Course Group *"
                value={addCourseGroupId ? String(addCourseGroupId) : null}
                onChange={(v) => setAddCourseGroupId(v ? Number(v) : null)}
                options={addCourseGroups.map((x) => ({ value: String(n(x.fk_course_group_id)), label: s(x.group_code) || s(x.group_name) }))}
                searchable
              />
              <Select
                label="Course Year *"
                value={addCourseYearId ? String(addCourseYearId) : null}
                onChange={(v) => setAddCourseYearId(v ? Number(v) : null)}
                options={addCourseYears.map((x) => ({ value: String(n(x.fk_course_year_id)), label: s(x.course_year_name) }))}
                searchable
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Select
                label="Elective *"
                value={addElectiveId ? String(addElectiveId) : null}
                onChange={(v) => setAddElectiveId(v ? Number(v) : null)}
                options={addElectiveOptions}
                searchable
              />
              <Select
                label="Staff *"
                value={addStaffId ? String(addStaffId) : null}
                onChange={(v) => setAddStaffId(v ? Number(v) : null)}
                options={addStaffOptions}
                placeholder="Select staff"
                searchable
                disabled={!addElectiveId}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-9">
                <Label className="text-xs">Elective Group Name</Label>
                <Input value={electiveGroupName} readOnly className="h-9 mt-1" />
              </div>
              <div className="md:col-span-3 flex items-center gap-2 pb-1">
                <Checkbox checked={addIsActive} onCheckedChange={(v) => setAddIsActive(Boolean(v))} />
                <Label className="text-sm">Active</Label>
              </div>
            </div>

            <div className="w-[230px] border border-input p-3">
              <p className="text-sm">Select Section - {sections.length}</p>
              {sections.length === 0 ? (
                <p className="mt-3 text-red-600 text-sm leading-tight">No sections at present.</p>
              ) : (
                <div className="mt-2 space-y-2">
                  {sections.map((sec, i) => (
                    <label key={n(sec.groupSectionId) || i} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={Boolean(sec.checked)}
                        disabled={Array.isArray(sec.batchwiseStudents) && sec.batchwiseStudents.length > 0}
                        onCheckedChange={(v) => toggleSection(i, Boolean(v))}
                      />
                      Section - {s(sec.section)}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="pt-1">
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Close</Button>
            <Button type="button" className="bg-primary hover:bg-[#123d79] text-white" onClick={() => { void onSave() }} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

