'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { FilteredListPage } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Select } from '@/common/components/select'
import { SearchInput } from '@/common/components/search'
import { StatusBadge } from '@/common/components/data-display'
import type { ColDef } from 'ag-grid-community'
import { Pencil } from 'lucide-react'
import {
  createGradeRuleSetting,
  getExamMasterCollegeFilters,
  listGradeRuleSettings,
  listRegulations,
  updateGradeRuleSetting,
} from '@/services'
import { toastError, toastSuccess } from '@/lib/toast'

type AnyRow = Record<string, any>

function numOrNull(value: string): number | null {
  if (value.trim() === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export default function GradeRuleSettingsPage() {
  const [loadingFilters, setLoadingFilters] = useState(true)
  const [loadingList, setLoadingList] = useState(false)
  const [rows, setRows] = useState<AnyRow[]>([])
  const [q, setQ] = useState('')

  const [allFilters, setAllFilters] = useState<AnyRow[]>([])
  const [colleges, setColleges] = useState<AnyRow[]>([])
  const [courses, setCourses] = useState<AnyRow[]>([])
  const [regulations, setRegulations] = useState<AnyRow[]>([])

  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [courseId, setCourseId] = useState<number | null>(null)
  const [regulationId, setRegulationId] = useState<number | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AnyRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    firstmodmarkstobeAdded: '',
    firstmodpassPercentage: '',
    secmodmarkstobeAdded: '',
    secmodmarksPercentage: '',
    secmodstdPercentage: '',
    graftingPercentage: '',
    evaluationGraceMarks: '',
    moderationGraceMarks: '',
    isActive: true,
  })

  useEffect(() => {
    async function init() {
      setLoadingFilters(true)
      try {
        const { filtersData } = await getExamMasterCollegeFilters(0, 0)
        const source = Array.isArray(filtersData) ? filtersData : []
        setAllFilters(source)
        const map = new Map<number, AnyRow>()
        for (const row of source) {
          const id = Number(row.fk_college_id ?? row.collegeId ?? 0)
          if (id > 0 && !map.has(id)) map.set(id, row)
        }
        const list = Array.from(map.values())
        setColleges(list)
        if (list[0]) {
          const firstCollegeId = Number(list[0].fk_college_id ?? list[0].collegeId ?? 0)
          if (firstCollegeId > 0) {
            setCollegeId(firstCollegeId)
          }
        }
      } finally {
        setLoadingFilters(false)
      }
    }
    void init()
  }, [])

  useEffect(() => {
    if (!collegeId) {
      setCourses([])
      setCourseId(null)
      setRegulations([])
      setRegulationId(null)
      return
    }
    const map = new Map<number, AnyRow>()
    for (const row of allFilters) {
      const cId = Number(row.fk_college_id ?? row.collegeId ?? 0)
      if (cId !== collegeId) continue
      const crsId = Number(row.fk_course_id ?? row.courseId ?? 0)
      if (crsId > 0 && !map.has(crsId)) map.set(crsId, row)
    }
    const list = Array.from(map.values())
    setCourses(list)
    setCourseId(list[0] ? Number(list[0].fk_course_id ?? list[0].courseId ?? 0) : null)
    setRegulations([])
    setRegulationId(null)
  }, [collegeId, allFilters])

  useEffect(() => {
    async function loadRegulations() {
      if (!courseId) {
        setRegulations([])
        setRegulationId(null)
        return
      }
      const data = await listRegulations(courseId).catch(() => [])
      const regs = Array.isArray(data) ? data : []
      setRegulations(regs)
      setRegulationId(regs[0] ? Number(regs[0].regulationId ?? 0) : null)
    }
    void loadRegulations()
  }, [courseId])

  const collegeOptions = useMemo(
    () =>
      colleges.map((x) => ({
        value: String(x.fk_college_id ?? x.collegeId),
        label: x.college_code ?? x.collegeCode ?? x.college_name ?? x.collegeName ?? 'College',
      })),
    [colleges],
  )
  const courseOptions = useMemo(
    () =>
      courses.map((x) => ({
        value: String(x.fk_course_id ?? x.courseId),
        label: x.course_code ?? x.courseCode ?? x.course_name ?? x.courseName ?? 'Course',
      })),
    [courses],
  )
  const regulationOptions = useMemo(
    () =>
      regulations.map((x) => ({
        value: String(x.regulationId),
        label: x.regulationCode ?? x.regulationName ?? 'Regulation',
      })),
    [regulations],
  )

  const getList = useCallback(async () => {
    if (!collegeId || !courseId || !regulationId) return
    setLoadingList(true)
    try {
      const data = await listGradeRuleSettings({ collegeId, courseId, regulationId })
      setRows(Array.isArray(data) ? data : [])
    } finally {
      setLoadingList(false)
    }
  }, [collegeId, courseId, regulationId])

  useEffect(() => {
    if (collegeId && courseId && regulationId) void getList()
  }, [collegeId, courseId, regulationId, getList])

  const filteredRows = useMemo(() => {
    if (!q.trim()) return rows
    const lower = q.toLowerCase()
    return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(lower))
  }, [q, rows])

  const openAdd = useCallback(() => {
    setEditing(null)
    setForm({
      firstmodmarkstobeAdded: '',
      firstmodpassPercentage: '',
      secmodmarkstobeAdded: '',
      secmodmarksPercentage: '',
      secmodstdPercentage: '',
      graftingPercentage: '',
      evaluationGraceMarks: '',
      moderationGraceMarks: '',
      isActive: true,
    })
    setModalOpen(true)
  }, [])

  const openEdit = useCallback((row: AnyRow) => {
    setEditing(row)
    setForm({
      firstmodmarkstobeAdded: String(row.firstmodmarkstobeAdded ?? row.mod1Marks ?? row.minPoints ?? ''),
      firstmodpassPercentage: String(row.firstmodpassPercentage ?? row.mod1PassPercentage ?? row.fromPercentage ?? ''),
      secmodmarkstobeAdded: String(row.secmodmarkstobeAdded ?? row.mod2Marks ?? row.maxPoints ?? ''),
      secmodmarksPercentage: String(row.secmodmarksPercentage ?? row.mod2PassPercentage ?? row.toPercentage ?? ''),
      secmodstdPercentage: String(row.secmodstdPercentage ?? row.mod1StudentPercentage ?? ''),
      graftingPercentage: String(row.graftingPercentage ?? row.gratingPercentage ?? row.gradingPercentage ?? ''),
      evaluationGraceMarks: String(row.evaluationGraceMarks ?? ''),
      moderationGraceMarks: String(row.moderationGraceMarks ?? ''),
      isActive: row.isActive !== undefined ? !!row.isActive : true,
    })
    setModalOpen(true)
  }, [])

  async function saveGradeRule(e: React.FormEvent) {
    e.preventDefault()
    if (!courseId || !regulationId) return
    setSaving(true)
    try {
      const payload: AnyRow = {
        courseId,
        regulationId,
        collegeId,
        universityId:
          colleges.find((c) => Number(c.fk_college_id ?? c.collegeId) === collegeId)?.fk_university_id ??
          colleges.find((c) => Number(c.fk_college_id ?? c.collegeId) === collegeId)?.universityId ??
          0,
        isActive: form.isActive,
        firstmodmarkstobeAdded: numOrNull(form.firstmodmarkstobeAdded),
        firstmodpassPercentage: numOrNull(form.firstmodpassPercentage),
        secmodmarkstobeAdded: numOrNull(form.secmodmarkstobeAdded),
        secmodmarksPercentage: numOrNull(form.secmodmarksPercentage),
        secmodstdPercentage: numOrNull(form.secmodstdPercentage),
        graftingPercentage: numOrNull(form.graftingPercentage),
        evaluationGraceMarks: numOrNull(form.evaluationGraceMarks),
        moderationGraceMarks: numOrNull(form.moderationGraceMarks),
      }

      const id = editing?.examrpsettingId ?? editing?.id
      if (id != null) {
        await updateGradeRuleSetting(Number(id), payload)
        toastSuccess('Grade rule updated')
      } else {
        await createGradeRuleSetting(payload)
        toastSuccess('Grade rule added')
      }
      setModalOpen(false)
      await getList()
    } catch (error) {
      toastError(error, 'Failed to save grade rule')
    } finally {
      setSaving(false)
    }
  }

  const colDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      { headerName: 'SI No.', valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, width: 70 },
      { headerName: 'Mod 1 Marks', field: 'firstmodmarkstobeAdded', minWidth: 120 },
      { headerName: 'Mod 1 Pass Percentage', field: 'firstmodpassPercentage', minWidth: 170 },
      { headerName: 'Mod 2 Marks', field: 'secmodmarkstobeAdded', minWidth: 120 },
      { headerName: 'Mod 2 Pass Percentage', field: 'secmodmarksPercentage', minWidth: 170 },
      { headerName: 'Mod 1 Student Percentage', field: 'secmodstdPercentage', minWidth: 180 },
      { headerName: 'Grafting Percentage', field: 'graftingPercentage', minWidth: 150 },
      { headerName: 'Evaluation GraceMarks', field: 'evaluationGraceMarks', minWidth: 170 },
      { headerName: 'Moderation GraceMarks', field: 'moderationGraceMarks', minWidth: 175 },
      {
        headerName: 'Status',
        cellRenderer: (p: any) => <StatusBadge status={p.data?.isActive ?? false} />,
        minWidth: 100,
      },
      {
        headerName: 'Actions',
        minWidth: 90,
        cellRenderer: (p: any) => (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            aria-label="Edit grade rule"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              openEdit(p.data)
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        ),
      },
    ],
    [openEdit],
  )

  return (
    <FilteredListPage
      title="Grade Rule Settings"
      filters={(
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
          <div className="space-y-1 md:col-span-3">
            <Label>College</Label>
            <Select
              value={collegeId ? String(collegeId) : null}
              onChange={(v) => setCollegeId(v ? Number(v) : null)}
              options={collegeOptions}
              placeholder="College"
              searchable
              disabled={loadingFilters}
            />
          </div>
          <div className="space-y-1 md:col-span-3">
            <Label>Course</Label>
            <Select
              value={courseId ? String(courseId) : null}
              onChange={(v) => setCourseId(v ? Number(v) : null)}
              options={courseOptions}
              placeholder="Course"
              disabled={loadingFilters || !collegeId}
            />
          </div>
          <div className="space-y-1 md:col-span-3">
            <Label>Regulation</Label>
            <Select
              value={regulationId ? String(regulationId) : null}
              onChange={(v) => setRegulationId(v ? Number(v) : null)}
              options={regulationOptions}
              placeholder="Regulation"
              disabled={loadingFilters || !courseId}
            />
          </div>
        </div>
      )}
      rowData={regulationId ? filteredRows : []}
      columnDefs={colDefs}
      loading={loadingList}
      pagination
      toolbar={{ search: false }}
      toolbarLeading={<SearchInput className="w-full max-w-sm" placeholder="Search…" value={q} onChange={setQ} />}
      toolbarTrailing={(
        <Button size="sm" onClick={openAdd} disabled={!courseId || !regulationId}>
          + Add Grade Rule
        </Button>
      )}
    >
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Grade Rule' : 'Add Grade Rule'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveGradeRule} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <Input placeholder="Mod 1 Marks" value={form.firstmodmarkstobeAdded} onChange={(e) => setForm((s) => ({ ...s, firstmodmarkstobeAdded: e.target.value }))} />
              <Input placeholder="Mod 1 Pass %" value={form.firstmodpassPercentage} onChange={(e) => setForm((s) => ({ ...s, firstmodpassPercentage: e.target.value }))} />
              <Input placeholder="Mod 2 Marks" value={form.secmodmarkstobeAdded} onChange={(e) => setForm((s) => ({ ...s, secmodmarkstobeAdded: e.target.value }))} />
              <Input placeholder="Mod 2 Pass %" value={form.secmodmarksPercentage} onChange={(e) => setForm((s) => ({ ...s, secmodmarksPercentage: e.target.value }))} />
              <Input placeholder="Mod 1 Student %" value={form.secmodstdPercentage} onChange={(e) => setForm((s) => ({ ...s, secmodstdPercentage: e.target.value }))} />
              <Input placeholder="Grafting %" value={form.graftingPercentage} onChange={(e) => setForm((s) => ({ ...s, graftingPercentage: e.target.value }))} />
              <Input placeholder="Evaluation Grace Marks" value={form.evaluationGraceMarks} onChange={(e) => setForm((s) => ({ ...s, evaluationGraceMarks: e.target.value }))} />
              <Input placeholder="Moderation Grace Marks" value={form.moderationGraceMarks} onChange={(e) => setForm((s) => ({ ...s, moderationGraceMarks: e.target.value }))} />
            </div>
            <label className="flex items-center gap-2 text-[12px] text-slate-700">
              <Checkbox checked={form.isActive} onCheckedChange={(v) => setForm((s) => ({ ...s, isActive: !!v }))} />
              Active
            </label>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </FilteredListPage>
  )
}

