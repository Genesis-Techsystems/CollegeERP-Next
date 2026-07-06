'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { BookMarked, ChevronDown, Filter, Pencil } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout'
import { DataTable } from '@/common/components/table'
import { SearchInput } from '@/common/components/search'
import { Select, type SelectOption } from '@/common/components/select'
import { FormModal } from '@/common/components/feedback'
import { ActiveStatusField } from '@/common/components/forms'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { rowIndexGetter } from '@/lib/utils'
import { toastError, toastSuccess } from '@/lib/toast'
import { toast } from 'sonner'
import {
  addListUnivEcColleges,
  getUnivExamGroupCenterGroups,
  listUnivEcCollegesByCenterAndExam,
  pickUnivEcCollegeId,
  updateUnivEcCollege,
  type AnyRow,
} from '@/services/exam-papers-delivery'

type Row = AnyRow

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
function txt(v: unknown): string {
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return ''
}
function dedupeBy<T>(rows: T[], keyFn: (row: T) => number): T[] {
  const seen = new Set<number>()
  const out: T[] = []
  for (const r of rows) {
    const key = keyFn(r)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(r)
  }
  return out
}

type CandidateCollege = Row & { checked?: boolean; isSelected?: boolean }

function makeAssignedEditRenderer(onEdit: (row: Row) => void) {
  return (p: ICellRendererParams<Row>) => {
    if (!p.data) return null
    return (
      <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-700" onClick={() => p.data && onEdit(p.data)}>
        <Pencil className="h-4 w-4" />
      </Button>
    )
  }
}

export default function UnivExamCenterCollegesPage() {
  const universityId = Number(globalThis?.localStorage?.getItem('universityId') ?? 0)
  const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)

  const [filtersOpen, setFiltersOpen] = useState(true)
  const [loadingFilters, setLoadingFilters] = useState(false)
  const [loadingList, setLoadingList] = useState(false)
  const [assigning, setAssigning] = useState(false)

  // eg_ay_filter group rows (academic years + exam groups + colleges)
  const [filterAyRows, setFilterAyRows] = useState<Row[]>([])
  const [examCenters, setExamCenters] = useState<Row[]>([])
  const [assignedRows, setAssignedRows] = useState<Row[]>([])
  const [candidateRows, setCandidateRows] = useState<CandidateCollege[]>([])
  const [candidateSearch, setCandidateSearch] = useState('')
  const [selectAll, setSelectAll] = useState(false)
  const [showSections, setShowSections] = useState(false)

  const [editOpen, setEditOpen] = useState(false)
  const [editRow, setEditRow] = useState<Row | null>(null)
  const [editForm, setEditForm] = useState({ isActive: true, reason: '' })

  const [academicYearId, setAcademicYearId] = useState<string>('')
  const [examGroupId, setExamGroupId] = useState<string>('')
  const [univExamcenterId, setUnivExamcenterId] = useState<string>('')

  // ── Filter options (Angular getFiltersList → eg_ay_filter group) ──
  const academicYears = useMemo(
    () =>
      dedupeBy(filterAyRows, (r) => num(r.fk_academic_year_id)).sort(
        (a, b) => num(b.academic_year) - num(a.academic_year),
      ),
    [filterAyRows],
  )
  const examGroups = useMemo(() => dedupeBy(filterAyRows, (r) => num(r.fk_univ_exam_group_id)), [filterAyRows])

  const ayOptions: SelectOption[] = useMemo(
    () => academicYears.map((a) => ({ value: String(num(a.fk_academic_year_id)), label: txt(a.academic_year) })),
    [academicYears],
  )
  const examGroupOptions: SelectOption[] = useMemo(
    () => examGroups.map((g) => ({ value: String(num(g.fk_univ_exam_group_id)), label: txt(g.exam_group_code) })),
    [examGroups],
  )
  const centerOptions: SelectOption[] = useMemo(
    () =>
      examCenters.map((c) => ({
        value: String(num(c.fk_univ_ec_id ?? c.univExamcenterId)),
        label: `${txt(c.ec_code ?? c.examcenterCode)} - ${txt(c.ec_name ?? c.examcenterName)}`,
      })),
    [examCenters],
  )

  const selectedCount = useMemo(() => candidateRows.filter((r) => r.isSelected).length, [candidateRows])
  const selectedColleges = useMemo(() => candidateRows.filter((r) => r.isSelected), [candidateRows])

  const headerText = useMemo(() => {
    const ay = academicYears.find((a) => num(a.fk_academic_year_id) === Number(academicYearId))
    const grp = examGroups.find((g) => num(g.fk_univ_exam_group_id) === Number(examGroupId))
    const center = examCenters.find((c) => num(c.fk_univ_ec_id ?? c.univExamcenterId) === Number(univExamcenterId))
    return [txt(ay?.academic_year), txt(grp?.exam_group_code), txt(center?.ec_name ?? center?.examcenterName)]
      .filter(Boolean)
      .join(' / ')
  }, [academicYears, examGroups, examCenters, academicYearId, examGroupId, univExamcenterId])

  const onEditAssigned = useCallback((row: Row) => {
    setEditRow(row ?? null)
    setEditForm({ isActive: row?.isActive === true, reason: txt(row?.reason) })
    setEditOpen(true)
  }, [])

  const assignedColumnDefs = useMemo<ColDef<Row>[]>(
    () => [
      { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 80, flex: 0 },
      { headerName: 'Exam Center', minWidth: 160, valueGetter: (p) => txt(p.data?.examcenterCode ?? p.data?.ec_code) },
      { headerName: 'Exam', minWidth: 200, valueGetter: (p) => txt(p.data?.examName ?? p.data?.exam_name) },
      { headerName: 'College', minWidth: 140, valueGetter: (p) => txt(p.data?.collegeCode ?? p.data?.college_code) },
      { headerName: 'Actions', width: 90, flex: 0, cellRenderer: makeAssignedEditRenderer(onEditAssigned) },
    ],
    [onEditAssigned],
  )

  const filteredCandidates = useMemo(() => {
    const q = candidateSearch.trim().toLowerCase()
    if (!q) return candidateRows
    return candidateRows.filter((r) => txt(r.college_code).toLowerCase().includes(q))
  }, [candidateRows, candidateSearch])

  // ── Angular getFiltersList(): eg_filters → eg_ay_filter group ──
  const loadFilters = useCallback(async () => {
    setLoadingFilters(true)
    try {
      const groups = await getUnivExamGroupCenterGroups({ flag: 'eg_filters', universityId })
      const ayGroup = groups.find((g) => txt(g[0]?.flag) === 'eg_ay_filter') ?? groups[0] ?? []
      setFilterAyRows(ayGroup)
    } catch (e) {
      toastError(e, 'Failed to load filters')
      setFilterAyRows([])
    } finally {
      setLoadingFilters(false)
    }
  }, [universityId])

  useEffect(() => {
    void loadFilters()
  }, [loadFilters])

  // Auto-select first academic year
  useEffect(() => {
    if (!ayOptions.length || academicYearId) return
    setAcademicYearId(ayOptions[0].value)
  }, [ayOptions, academicYearId])

  // Angular selectedExamGroup(): eg_ec_filters → exam centers
  const loadCentersForGroup = useCallback(
    async (grpId: number, ayId: number) => {
      if (!grpId) {
        setExamCenters([])
        return
      }
      const groups = await getUnivExamGroupCenterGroups({
        flag: 'eg_ec_filters',
        examGroupId: grpId,
        academicYearId: ayId,
        universityId,
      }).catch(() => [])
      setExamCenters(groups[0] ?? [])
    },
    [universityId],
  )

  function onChangeExamGroup(v: string | null) {
    const grp = v ?? ''
    setExamGroupId(grp)
    setUnivExamcenterId('')
    setShowSections(false)
    if (grp) void loadCentersForGroup(Number(grp), Number(academicYearId))
  }

  // Auto-select first exam center
  useEffect(() => {
    if (!centerOptions.length || univExamcenterId) return
    setUnivExamcenterId(centerOptions[0].value)
  }, [centerOptions, univExamcenterId])

  // Angular getexamCenterColleges(): eg_clg_cou_exam_list → assigned + getExamColleges() candidates
  async function onGetList() {
    if (!academicYearId || !examGroupId || !univExamcenterId) {
      toastError('Select academic year, exam group and exam center.')
      return
    }
    setLoadingList(true)
    try {
      // No assigned colleges yet returns a "No Record(s) found" — treat as empty, not an error.
      const groups = await getUnivExamGroupCenterGroups({
        flag: 'eg_clg_cou_exam_list',
        univExamcenterId: Number(univExamcenterId),
        examGroupId: Number(examGroupId),
        academicYearId: Number(academicYearId),
        universityId,
      }).catch(() => [] as AnyRow[][])
      const assigned = groups[0] ?? []
      setAssignedRows(assigned)

      // candidate colleges = all colleges in the exam group minus already-assigned
      const assignedCollegeIds = new Set(assigned.map((a) => num(a.collegeId ?? a.fk_college_id)))
      const candidates = dedupeBy(
        filterAyRows.filter((r) => num(r.fk_college_id) > 0),
        (r) => num(r.fk_college_id),
      )
        .filter((c) => !assignedCollegeIds.has(num(c.fk_college_id)))
        .map((c) => ({ ...c, checked: false, isSelected: false }))
      setCandidateRows(candidates)
      setSelectAll(false)
      setShowSections(true)
    } finally {
      setLoadingList(false)
    }
  }

  function toggleSelectAll(checked: boolean) {
    setSelectAll(checked)
    setCandidateRows((rows) => rows.map((r) => ({ ...r, checked, isSelected: checked })))
  }
  function toggleCandidate(idx: number, checked: boolean) {
    setCandidateRows((rows) => rows.map((r, i) => (i === idx ? { ...r, checked, isSelected: checked } : r)))
  }

  // Angular Assign()
  async function onAssign() {
    if (!selectedColleges.length) {
      toast.info('Please Select College...!')
      return
    }
    setAssigning(true)
    try {
      const payload = selectedColleges.map((c) => ({
        univExamCentersId: Number(univExamcenterId),
        examMasterId: num(c.fk_exam_id) || 0,
        collegeId: num(c.fk_college_id),
        isActive: true,
        createdUser: employeeId,
      }))
      await addListUnivEcColleges(payload)
      toastSuccess('Colleges assigned.')
      await onGetList()
    } catch (e) {
      toastError(e, 'Assign failed')
    } finally {
      setAssigning(false)
    }
  }

  async function onSaveEdit(e: { preventDefault: () => void }) {
    e.preventDefault()
    if (!editRow) return
    const id = pickUnivEcCollegeId(editRow)
    if (!id) return
    if (!editForm.isActive && !editForm.reason.trim()) {
      toastError('Reason is required when inactive.')
      return
    }
    try {
      await updateUnivEcCollege(id, {
        ...editRow,
        univEcCollegeId: id,
        isActive: editForm.isActive,
        reason: editForm.isActive ? '' : editForm.reason.trim(),
        updatedUser: employeeId,
      })
      toastSuccess('Updated.')
      setEditOpen(false)
      await onGetList()
    } catch (err) {
      toastError(err, 'Update failed')
    }
  }

  return (
    <PageContainer className="space-y-4">
      <PageHeader title="Exam Center Colleges" subtitle="Exam papers delivery process · Exam center colleges" />

      <div className="app-card p-3 border-t-[3px] border-t-amber-300">
        <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
          <div className="flex items-center gap-2 min-w-0">
            <BookMarked className="h-4 w-4 text-blue-700 shrink-0" aria-hidden />
            <h2 className="app-card-title">Exam Center Colleges</h2>
          </div>
          <button
            type="button"
            className="flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
          >
            <span>Filter</span>
            <Filter className="h-4 w-4" aria-hidden />
            <ChevronDown className={`h-4 w-4 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {(
          <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="space-y-1 md:col-span-2">
              <Label>Academic Year</Label>
              <Select
                options={ayOptions}
                value={academicYearId}
                onChange={(v) => {
                  setAcademicYearId(v ?? '')
                  setExamGroupId('')
                  setUnivExamcenterId('')
                  setExamCenters([])
                  setShowSections(false)
                }}
                disabled={loadingFilters}
              />
            </div>
            <div className="space-y-1 md:col-span-4">
              <Label>Exam Group</Label>
              <Select options={examGroupOptions} value={examGroupId} onChange={onChangeExamGroup} searchable />
            </div>
            <div className="space-y-1 md:col-span-4">
              <Label>Exam Center</Label>
              <Select
                options={centerOptions}
                value={univExamcenterId}
                onChange={(v) => {
                  setUnivExamcenterId(v ?? '')
                  setShowSections(false)
                }}
                searchable
              />
            </div>
            <div className="md:col-span-2">
              <Button type="button" onClick={() => void onGetList()} disabled={loadingList}>
                Get List
              </Button>
            </div>
          </div>
        )}
      </div>

      {showSections && (
        <>
          <div className="app-card p-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-5 border rounded-md p-2">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <SearchInput value={candidateSearch} onChange={setCandidateSearch} placeholder="Search…" className="w-full max-w-sm" />
                  <span className="text-[13px] text-blue-700 font-semibold whitespace-nowrap">Selected: {selectedCount}</span>
                </div>
                <div className="max-h-[320px] overflow-auto">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-1 w-[70px]">
                          <label className="flex items-center gap-2">
                            <Checkbox checked={selectAll} onCheckedChange={(v) => toggleSelectAll(v === true)} />
                            All
                          </label>
                        </th>
                        <th className="text-left py-1">Serial No</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCandidates.map((c, idx) => (
                        <tr key={`${num(c.fk_college_id)}-${idx}`} className="border-b">
                          <td className="py-1">
                            <Checkbox checked={Boolean(c.checked)} onCheckedChange={(v) => toggleCandidate(idx, v === true)} />
                          </td>
                          <td className="py-1">{txt(c.college_code)}</td>
                        </tr>
                      ))}
                      {filteredCandidates.length === 0 && (
                        <tr>
                          <td colSpan={2} className="py-3 text-center text-muted-foreground">No colleges to assign.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="md:col-span-5 border rounded-md p-2">
                <h4 className="text-[13px] text-blue-700 font-semibold mb-2">Selected Colleges: {selectedCount}</h4>
                <div className="max-h-[320px] overflow-auto">
                  <table className="w-full text-[13px]">
                    <tbody>
                      {selectedColleges.map((c, idx) => (
                        <tr key={`${num(c.fk_college_id)}-s-${idx}`} className="border-b">
                          <td className="py-1 text-blue-700">{txt(c.college_code) || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="md:col-span-2 flex items-end justify-center">
                <Button onClick={() => void onAssign()} disabled={assigning || !selectedColleges.length}>
                  Assign
                </Button>
              </div>
            </div>
          </div>

          <div className="app-card px-3 py-2 border-t-[3px] border-t-amber-300 border-b border-border">
            <h3 className="text-[13px] font-semibold text-[hsl(var(--card-title))]">Exam Center Colleges - {headerText}</h3>
          </div>

          <div className="app-card overflow-hidden">
            <div className="p-2">
              <DataTable
                rowData={assignedRows}
                columnDefs={assignedColumnDefs}
                loading={loadingList}
                pagination
                toolbar={{ search: true, searchPlaceholder: 'Search…', pdfDocumentTitle: 'Exam Center Colleges' }}
              />
            </div>
          </div>
        </>
      )}

      <FormModal open={editOpen} onClose={() => setEditOpen(false)} title="Edit exam center college" onSubmit={onSaveEdit} size="lg">
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">College: {txt(editRow?.collegeCode ?? editRow?.college_code)}</div>
          <ActiveStatusField
            isActive={editForm.isActive}
            reason={editForm.reason}
            onActiveChange={(v) => setEditForm((f) => ({ ...f, isActive: v === true }))}
            onReasonChange={(v) => setEditForm((f) => ({ ...f, reason: v }))}
          />
        </div>
      </FormModal>
    </PageContainer>
  )
}
