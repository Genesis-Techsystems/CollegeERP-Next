'use client'

import { useEffect, useMemo, useState } from 'react'
import { Eye, Filter, Trash2 } from 'lucide-react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { DataTable } from '@/common/components/table'
import { Select } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageContainer, PageHeader } from '@/components/layout'
import { getDigitalOnlineSyncFilters, listElectiveGroupMappings } from '@/services'

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
  const [filterOpen, setFilterOpen] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [tableEnabled, setTableEnabled] = useState(false)

  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [addCourseId, setAddCourseId] = useState<number | null>(null)
  const [addCourseGroupId, setAddCourseGroupId] = useState<number | null>(null)
  const [addCourseYearId, setAddCourseYearId] = useState<number | null>(null)
  const [addElectiveId, setAddElectiveId] = useState<number | null>(null)
  const [addStaffId, setAddStaffId] = useState<number | null>(null)
  const [addGroupName, setAddGroupName] = useState('')
  const [addIsActive, setAddIsActive] = useState(true)

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
  const addElectiveOptions = useMemo(
    () => uniq(rows, 'electiveGroupyrMappingId').map((r, i) => ({ value: String(n(r.electiveGroupyrMappingId) || i + 1), label: electiveGroupNameOf(r) })),
    [rows],
  )

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
    <PageContainer>
      <PageHeader title="Elective Group Mapping" />
      <div className="app-card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold text-primary">Elective Group Mapping</h2>
          <button type="button" className="ml-auto inline-flex items-center gap-1 text-sm text-foreground" onClick={() => setFilterOpen((v) => !v)}>
            <span>Filter</span>
            <Filter className="h-4 w-4" />
          </button>
        </div>
        {filterOpen && (
          <div className="p-3 grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
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
      </div>
      {tableEnabled ? (
        <div className="app-card mt-4 p-3">
          <DataTable
            rowData={rows}
            columnDefs={columnDefs}
            loading={loading}
            toolbar={{ search: true, searchPlaceholder: 'Search' }}
            toolbarTrailing={(
              <Button type="button" size="sm" className="h-[30px] bg-[#0b2f61] px-3 text-[12px] text-white hover:bg-[#123d79]" onClick={() => setAddOpen(true)}>
                + Add Elective Group
              </Button>
            )}
            pagination
            paginationPageSize={10}
          />
        </div>
      ) : null}

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
                options={[]}
                placeholder="Select staff"
                searchable
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-9">
                <Label className="text-xs">Elective Group Name</Label>
                <Input value={addGroupName} onChange={(e) => setAddGroupName(e.target.value)} className="h-9 mt-1" />
              </div>
              <div className="md:col-span-3 flex items-center gap-2 pb-1">
                <Checkbox checked={addIsActive} onCheckedChange={(v) => setAddIsActive(Boolean(v))} />
                <Label className="text-sm">Active</Label>
              </div>
            </div>

            <div className="w-[230px] border border-slate-300 p-3">
              <p className="text-sm">Select Section - 0</p>
              <p className="mt-3 text-red-600 text-sm leading-tight">No sections at present.</p>
            </div>
          </div>
          <DialogFooter className="pt-1">
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Close</Button>
            <Button type="button" className="bg-[#0b2f61] hover:bg-[#123d79] text-white">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}

