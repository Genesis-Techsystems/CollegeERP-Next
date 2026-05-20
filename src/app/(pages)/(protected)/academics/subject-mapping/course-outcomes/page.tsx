'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ColDef } from 'ag-grid-community'
import { Filter, Plus, Search, Target } from 'lucide-react'
import { FormModal } from '@/common/components/feedback'
import { Select } from '@/common/components/select'
import { DataTable } from '@/common/components/table'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  getDigitalOnlineSyncFilters,
  listProgramOutcomeCategories,
  listRegulationsByCourse,
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
const pickText = (row: AnyRow, keys: string[]) => {
  for (const key of keys) {
    const value = row?.[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number') return String(value)
  }
  return ''
}

export default function CourseOutcomesPage() {
  const [filtersData, setFiltersData] = useState<AnyRow[]>([])
  const [academicData, setAcademicData] = useState<AnyRow[]>([])
  const [regulations, setRegulations] = useState<AnyRow[]>([])
  const [filterOpen, setFilterOpen] = useState(true)

  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [courseId, setCourseId] = useState<number | null>(null)
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null)
  const [courseYearId, setCourseYearId] = useState<number | null>(null)
  const [regulationId, setRegulationId] = useState<number | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [coCode, setCoCode] = useState('')
  const [coCategory, setCoCategory] = useState<string | null>(null)
  const [coCredits, setCoCredits] = useState('')
  const [coDescription, setCoDescription] = useState('')
  const [coActive, setCoActive] = useState(true)
  const [poCategoryRows, setPoCategoryRows] = useState<AnyRow[]>([])
  const [searchText, setSearchText] = useState('')

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
  const regulationOptions = useMemo(
    () => regulations.map((x) => ({
      value: String(n(x.regulationId ?? x.fk_regulation_id)),
      label: s(x.regulationCode ?? x.regulationName) || 'Regulation',
    })),
    [regulations],
  )
  const poCategoryOptions = useMemo(() => {
    const seen = new Set<string>()
    const mapped = poCategoryRows
      .map((row) => {
        const value =
          pickText(row, [
            'generalDetailCode',
            'general_detail_code',
            'detailCode',
            'code',
            'value',
          ]) ||
          String(n(row.generalDetailId ?? row.general_detail_id ?? row.id))
        const label = pickText(row, [
          'generalDetailName',
          'general_detail_name',
          'generalDetail',
          'detailName',
          'name',
          'label',
        ])
        return value && label ? { value, label } : null
      })
      .filter((x): x is { value: string; label: string } => Boolean(x))
      .filter((opt) => {
        if (seen.has(opt.value)) return false
        seen.add(opt.value)
        return true
      })
    if (mapped.length > 0) return mapped
    return [
      { value: 'PO1', label: 'Engineering Knowledge' },
      { value: 'PO2', label: 'Problem Analysis' },
      { value: 'PO3', label: 'Design / Development of Solutions' },
      { value: 'PO4', label: 'Conduct Investigations of Complex Problems' },
      { value: 'PO5', label: 'Modern Tool Usage' },
      { value: 'PO6', label: 'The Engineer and Society' },
      { value: 'PO7', label: 'Environment and Sustainability' },
      { value: 'PO8', label: 'Ethics' },
      { value: 'PO9', label: 'Individual and Team Work' },
      { value: 'PO10', label: 'Communication' },
      { value: 'PO11', label: 'Project Management and Finance' },
      { value: 'PO12', label: 'Life-long Learning' },
    ]
  }, [poCategoryRows])
  const tableColumns = useMemo<ColDef<AnyRow>[]>(
    () => [
      { headerName: 'No.', valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, width: 70, flex: 0 },
      { field: 'code', headerName: 'Code', minWidth: 120 },
      { field: 'category', headerName: 'Program Outcomes Category', minWidth: 220, flex: 1 },
      { field: 'description', headerName: 'Description', minWidth: 260, flex: 1 },
      { field: 'credits', headerName: 'Credits', width: 100, flex: 0 },
      { field: 'actions', headerName: 'Actions', width: 120, flex: 0 },
    ],
    [],
  )
  const tableRows = useMemo<AnyRow[]>(() => [], [])
  const filteredRows = useMemo(
    () =>
      !searchText.trim()
        ? tableRows
        : tableRows.filter((r) =>
            [r.code, r.category, r.description, r.credits]
              .some((v) => String(v ?? '').toLowerCase().includes(searchText.toLowerCase())),
          ),
    [searchText, tableRows],
  )

  useEffect(() => { if (!collegeId && colleges.length) setCollegeId(n(colleges[0].fk_college_id)) }, [colleges, collegeId])
  useEffect(() => { setCourseId(null); setCourseGroupId(null); setCourseYearId(null); setAcademicYearId(null); setRegulationId(null) }, [collegeId])
  useEffect(() => { if (!courseId && courses.length) setCourseId(n(courses[0].fk_course_id)) }, [courses, courseId])
  useEffect(() => { setCourseGroupId(null); setCourseYearId(null); setRegulationId(null) }, [courseId])
  useEffect(() => { if (!courseGroupId && courseGroups.length) setCourseGroupId(n(courseGroups[0].fk_course_group_id)) }, [courseGroups, courseGroupId])
  useEffect(() => { setCourseYearId(null); setRegulationId(null) }, [courseGroupId])
  useEffect(() => { if (!courseYearId && courseYears.length) setCourseYearId(n(courseYears[0].fk_course_year_id)) }, [courseYears, courseYearId])
  // Keep Academic Year empty by default; user must choose explicitly.

  useEffect(() => {
    async function loadRegulations() {
      if (!courseId) {
        setRegulations([])
        setRegulationId(null)
        return
      }
      const rows = await listRegulationsByCourse(courseId).catch(() => [])
      setRegulations(Array.isArray(rows) ? rows : [])
    }
    void loadRegulations()
  }, [courseId])
  useEffect(() => { if (!regulationId && regulationOptions.length) setRegulationId(n(regulationOptions[0].value)) }, [regulationId, regulationOptions])
  useEffect(() => {
    listProgramOutcomeCategories()
      .then((rows) => setPoCategoryRows(Array.isArray(rows) ? rows : []))
      .catch(() => setPoCategoryRows([]))
  }, [])

  function resetAddForm() {
    setCoCode('')
    setCoCategory(null)
    setCoCredits('')
    setCoDescription('')
    setCoActive(true)
  }

  function onOpenAddModal() {
    resetAddForm()
    setAddOpen(true)
  }

  function onSaveAdd() {
    // UI parity scaffold for now; API wiring will be added once endpoint is confirmed.
    setAddOpen(false)
  }

  return (
    <PageContainer>
      <div className="app-card p-0 overflow-hidden">
        <div className="px-4 py-2.5 border-b flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold text-primary inline-flex items-center gap-2">
            <Target className="h-4 w-4" />
            Course Outcomes
          </h2>
          <button type="button" className="ml-auto inline-flex items-center gap-1 text-sm text-foreground" onClick={() => setFilterOpen((v) => !v)}>
            <span>Filter</span>
            <Filter className="h-4 w-4" />
          </button>
        </div>
        {filterOpen ? (
          <div className="p-3 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <Select label="College *" value={collegeId ? String(collegeId) : null} onChange={(v) => setCollegeId(v ? Number(v) : null)} options={colleges.map((x) => ({ value: String(n(x.fk_college_id)), label: s(x.college_code) }))} searchable className="md:col-span-2" />
            <Select label="Academic Year *" value={academicYearId ? String(academicYearId) : null} onChange={(v) => setAcademicYearId(v ? Number(v) : null)} options={academicYears.map((x) => ({ value: String(n(x.fk_academic_year_id)), label: s(x.academic_year) }))} searchable className="md:col-span-2" />
            <Select label="Course *" value={courseId ? String(courseId) : null} onChange={(v) => setCourseId(v ? Number(v) : null)} options={courses.map((x) => ({ value: String(n(x.fk_course_id)), label: s(x.course_code) }))} searchable className="md:col-span-2" />
            <Select label="Course Group *" value={courseGroupId ? String(courseGroupId) : null} onChange={(v) => setCourseGroupId(v ? Number(v) : null)} options={courseGroups.map((x) => ({ value: String(n(x.fk_course_group_id)), label: s(x.group_code) || s(x.group_name) }))} searchable className="md:col-span-2" />
            <Select label="Course Year *" value={courseYearId ? String(courseYearId) : null} onChange={(v) => setCourseYearId(v ? Number(v) : null)} options={courseYears.map((x) => ({ value: String(n(x.fk_course_year_id)), label: s(x.course_year_name) }))} searchable className="md:col-span-2" />
            <Select label="Regulation *" value={regulationId ? String(regulationId) : null} onChange={(v) => setRegulationId(v ? Number(v) : null)} options={regulationOptions} searchable className="md:col-span-2" />
          </div>
        ) : null}
      </div>

      {academicYearId ? (
        <div className="app-card mt-4 overflow-hidden">
          <div className="p-3 flex items-center justify-between gap-3 border-b">
            <div className="relative w-full max-w-[280px]">
              <Search className="h-4 w-4 text-muted-foreground absolute left-2 top-2" />
              <input type="text" value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search" className="h-8 w-full rounded border border-input bg-background pl-8 pr-2 text-xs" />
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" className="h-[30px] px-3 text-[12px]">
                Columns
              </Button>
              <Button type="button" variant="outline" className="h-[30px] px-3 text-[12px]">
                Export PDF
              </Button>
              <Button type="button" className="h-[30px] rounded-full px-4 text-xs inline-flex items-center gap-1" onClick={onOpenAddModal}>
                <Plus className="h-3.5 w-3.5" />
                Add Program Outcomes
              </Button>
            </div>
          </div>
          <div className="overflow-hidden">
            <DataTable
              rowData={filteredRows}
              columnDefs={tableColumns}
              loading={false}
              pagination
              toolbar={false}
            />
          </div>
        </div>
      ) : null}
      <FormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Program Outcomes"
        titleClassName="text-teal-600"
        onSubmit={onSaveAdd}
        submitLabel="Save"
        cancelLabel="Cancel"
        size="xl"
        contentClassName="sm:max-w-4xl max-h-none overflow-visible [&_button[type='submit']]:bg-teal-600 [&_button[type='submit']]:hover:bg-teal-700 [&_button[type='submit']]:px-6 [&_button[type='submit']]:h-10 [&_button[type='submit']]:shadow-sm [&_button[type='button']]:h-10 [&_button[type='button']]:px-6"
        formClassName="space-y-5 py-1"
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/40/80 p-4 text-sm">
            <div className="grid grid-cols-[120px_1fr] gap-y-1">
              <div className="text-foreground">College :</div>
              <div className="font-semibold text-teal-500">
                {s(colleges.find((x) => n(x.fk_college_id) === (collegeId ?? 0))?.college_code)} / {s(academicYears.find((x) => n(x.fk_academic_year_id) === (academicYearId ?? 0))?.academic_year)}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              value={coCode}
              onChange={(e) => setCoCode(e.target.value)}
              placeholder="Code *"
              className="h-11 rounded-md border-border focus-visible:ring-teal-500/30"
            />
            <Select
              value={coCategory}
              onChange={setCoCategory}
              options={poCategoryOptions}
              placeholder="Program Outcomes Category *"
              searchable
              className="[&_button[role='combobox']]:h-11 [&_button[role='combobox']]:rounded-md [&_button[role='combobox']]:border-border"
            />
            <Input
              value={coCredits}
              onChange={(e) => setCoCredits(e.target.value)}
              placeholder="Credits *"
              className="h-11 rounded-md border-border focus-visible:ring-teal-500/30"
            />
          </div>
          <textarea
            value={coDescription}
            onChange={(e) => setCoDescription(e.target.value)}
            placeholder="Description *"
            rows={3}
            className="min-h-[80px] w-full resize-none overflow-hidden rounded-md border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30"
          />
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={coActive} onChange={(e) => setCoActive(e.target.checked)} />
            <span className="font-medium">Active</span>
          </label>
        </div>
      </FormModal>
    </PageContainer>
  )
}
