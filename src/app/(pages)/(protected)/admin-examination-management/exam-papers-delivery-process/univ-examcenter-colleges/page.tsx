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
import {
  addListUnivEcColleges,
  getExamTimetableFilterRows,
  listUnivEcCollegesByCenterAndExam,
  listUnivExamCentersByUniversity,
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
  if (v == null) return ''
  return ''
}

type CandidateCollege = Row & { checked?: boolean; isSelected?: boolean }

function makeAssignedEditRenderer(
  onEdit: (row: Row) => void,
) {
  return (p: ICellRendererParams<Row>) => {
    if (!p.data) return null
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-blue-700"
        onClick={() => onEdit(p.data)}
      >
        <Pencil className="h-4 w-4" />
      </Button>
    )
  }
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

export default function UnivExamCenterCollegesPage() {
  const orgId = Number(globalThis?.localStorage?.getItem('organizationId') ?? 0)
  const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)

  const [filtersOpen, setFiltersOpen] = useState(true)
  const [loadingFilters, setLoadingFilters] = useState(false)
  const [loadingList, setLoadingList] = useState(false)
  const [assigning, setAssigning] = useState(false)

  const [allFilterRows, setAllFilterRows] = useState<Row[]>([])
  const [examCenters, setExamCenters] = useState<Row[]>([])
  const [assignedRows, setAssignedRows] = useState<Row[]>([])
  const [candidateRows, setCandidateRows] = useState<CandidateCollege[]>([])
  const [candidateSearch, setCandidateSearch] = useState('')
  const [selectAll, setSelectAll] = useState(false)
  const [showSections, setShowSections] = useState(false)

  const [editOpen, setEditOpen] = useState(false)
  const [editRow, setEditRow] = useState<Row | null>(null)
  const [editForm, setEditForm] = useState({ isActive: true, reason: '' })

  const [form, setForm] = useState({
    courseId: '' as string,
    academicYearId: '' as string,
    examId: '' as string,
    univExamcenterId: '' as string,
  })

  const courses = useMemo(
    () => dedupeBy(allFilterRows, (r) => num(r.fk_course_id)),
    [allFilterRows],
  )
  const academicYears = useMemo(
    () =>
      dedupeBy(
        allFilterRows.filter((r) => num(r.fk_course_id) === Number(form.courseId)),
        (r) => num(r.fk_academic_year_id),
      ),
    [allFilterRows, form.courseId],
  )
  const exams = useMemo(
    () =>
      dedupeBy(
        allFilterRows.filter(
          (r) =>
            num(r.fk_course_id) === Number(form.courseId) &&
            num(r.fk_academic_year_id) === Number(form.academicYearId) &&
            r.is_internal_exam !== true,
        ),
        (r) => num(r.fk_exam_id),
      ),
    [allFilterRows, form.courseId, form.academicYearId],
  )

  const courseOptions: SelectOption[] = useMemo(
    () => courses.map((c) => ({ value: String(num(c.fk_course_id)), label: txt(c.course_code) })),
    [courses],
  )
  const ayOptions: SelectOption[] = useMemo(
    () => academicYears.map((a) => ({ value: String(num(a.fk_academic_year_id)), label: txt(a.academic_year) })),
    [academicYears],
  )
  const examOptions: SelectOption[] = useMemo(
    () =>
      exams.map((e) => ({
        value: String(num(e.fk_exam_id)),
        label: `${txt(e.exam_name)} (${txt(e.from_date)} - ${txt(e.to_date)})`,
      })),
    [exams],
  )
  const centerOptions: SelectOption[] = useMemo(
    () =>
      examCenters.map((c) => ({
        value: String(num(c.univExamcenterId ?? c.univExamCenterId ?? c.univ_examcenter_id)),
        label: txt(c.examcenterCode ?? c.examCenterCode),
      })),
    [examCenters],
  )

  const selectedCount = useMemo(
    () => candidateRows.filter((r) => r.isSelected).length,
    [candidateRows],
  )
  const selectedColleges = useMemo(
    () => candidateRows.filter((r) => r.isSelected),
    [candidateRows],
  )

  const headerText = useMemo(() => {
    const course = courses.find((c) => num(c.fk_course_id) === Number(form.courseId))
    const ay = academicYears.find((a) => num(a.fk_academic_year_id) === Number(form.academicYearId))
    const exam = exams.find((e) => num(e.fk_exam_id) === Number(form.examId))
    const center = examCenters.find((c) => num(c.univExamcenterId ?? c.univExamCenterId) === Number(form.univExamcenterId))
    return `${txt(course?.course_code)} / ${txt(ay?.academic_year)} / ${txt(exam?.exam_name)} / ${txt(center?.examcenterName ?? center?.examCenterName)}`
  }, [courses, academicYears, exams, examCenters, form])

  const onEditAssigned = useCallback((row: Row) => {
    setEditRow(row ?? null)
    setEditForm({ isActive: row?.isActive === true, reason: txt(row?.reason) })
    setEditOpen(true)
  }, [])

  const assignedColumnDefs = useMemo<ColDef<Row>[]>(
    () => [
      { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 80, flex: 0 },
      { headerName: 'Exam Center', minWidth: 150, valueGetter: (p) => txt(p.data?.examcenterCode) },
      { headerName: 'Exam', minWidth: 180, valueGetter: (p) => txt(p.data?.examName) },
      { headerName: 'College', minWidth: 130, valueGetter: (p) => txt(p.data?.collegeCode) },
      {
        headerName: 'Actions',
        width: 80,
        flex: 0,
        cellRenderer: makeAssignedEditRenderer(onEditAssigned),
      },
    ],
    [onEditAssigned],
  )

  const filteredCandidates = useMemo(() => {
    const q = candidateSearch.trim().toLowerCase()
    if (!q) return candidateRows
    return candidateRows.filter((r) => txt(r.college_code).toLowerCase().includes(q))
  }, [candidateRows, candidateSearch])

  const loadFilters = useCallback(async () => {
    setLoadingFilters(true)
    try {
      const rows = await getExamTimetableFilterRows({ organizationId: orgId, employeeId })
      setAllFilterRows(Array.isArray(rows) ? rows : [])
    } catch (e) {
      toastError(e, 'Failed to load filters')
      setAllFilterRows([])
    } finally {
      setLoadingFilters(false)
    }
  }, [orgId, employeeId])

  useEffect(() => {
    void loadFilters()
  }, [loadFilters])

  useEffect(() => {
    if (!courseOptions.length || form.courseId) return
    setForm((f) => ({ ...f, courseId: courseOptions[0].value }))
  }, [courseOptions, form.courseId])

  useEffect(() => {
    const next = ayOptions[0]?.value ?? ''
    setForm((f) => ({ ...f, academicYearId: next, examId: '', univExamcenterId: '' }))
  }, [form.courseId, ayOptions])

  useEffect(() => {
    const next = examOptions[0]?.value ?? ''
    setForm((f) => ({ ...f, examId: next, univExamcenterId: '' }))
  }, [form.academicYearId, examOptions])

  useEffect(() => {
    async function loadCenters() {
      setExamCenters([])
      if (!form.examId) return
      try {
        const universityId = num(allFilterRows.find((r) => num(r.fk_exam_id) === Number(form.examId))?.fk_university_id)
        const rows = await listUnivExamCentersByUniversity(universityId || 0)
        setExamCenters(Array.isArray(rows) ? rows : [])
      } catch {
        setExamCenters([])
      }
    }
    void loadCenters()
  }, [form.examId, allFilterRows])

  useEffect(() => {
    if (!centerOptions.length || form.univExamcenterId) return
    setForm((f) => ({ ...f, univExamcenterId: centerOptions[0].value }))
  }, [centerOptions, form.univExamcenterId])

  async function refreshAssignedAndCandidates() {
    const examId = Number(form.examId)
    const centerId = Number(form.univExamcenterId)
    if (!examId || !centerId) return
    setLoadingList(true)
    try {
      const assigned = await listUnivEcCollegesByCenterAndExam(centerId, examId)
      const source = dedupeBy(
        allFilterRows.filter((x) => num(x.fk_course_id) === Number(form.courseId) && num(x.fk_exam_id) === examId),
        (x) => num(x.fk_college_id),
      )
      const assignedCollegeIds = new Set(assigned.map((a) => num(a.collegeId ?? a.fk_college_id)))
      const candidates = source
        .filter((c) => !assignedCollegeIds.has(num(c.fk_college_id)))
        .map((c) => ({ ...c, checked: false, isSelected: false }))
      setAssignedRows(Array.isArray(assigned) ? assigned : [])
      setCandidateRows(candidates)
      setSelectAll(false)
      setShowSections(true)
    } catch (e) {
      toastError(e, 'Failed to load exam center colleges')
      setAssignedRows([])
      setCandidateRows([])
      setShowSections(false)
    } finally {
      setLoadingList(false)
    }
  }

  async function onGetList() {
    if (!form.courseId || !form.academicYearId || !form.examId || !form.univExamcenterId) {
      toastError('Select program, academic year, exam and exam center.')
      return
    }
    await refreshAssignedAndCandidates()
  }

  function toggleSelectAll(checked: boolean) {
    setSelectAll(checked)
    setCandidateRows((rows) => rows.map((r) => ({ ...r, checked, isSelected: checked })))
  }

  function toggleCandidate(idx: number, checked: boolean) {
    setCandidateRows((rows) =>
      rows.map((r, i) => (i === idx ? { ...r, checked, isSelected: checked } : r)),
    )
  }

  async function onAssign() {
    if (!selectedColleges.length) {
      toastError('Please select college(s).')
      return
    }
    setAssigning(true)
    try {
      const payload = selectedColleges.map((c) => ({
        univExamCentersId: Number(form.univExamcenterId),
        examMasterId: Number(form.examId),
        collegeId: num(c.fk_college_id),
        isActive: true,
        createdUser: employeeId,
      }))
      await addListUnivEcColleges(payload)
      toastSuccess('Colleges assigned.')
      await refreshAssignedAndCandidates()
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
      })
      toastSuccess('Updated.')
      setEditOpen(false)
      await refreshAssignedAndCandidates()
    } catch (err) {
      toastError(err, 'Update failed')
    }
  }

  return (
    <PageContainer className="space-y-4">
      <PageHeader title="Exam center colleges" subtitle="Exam papers delivery process · Exam center colleges" />

      <div className="app-card p-3 border-t-[3px] border-t-amber-300">
        <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
          <div className="flex items-center gap-2 min-w-0">
            <BookMarked className="h-4 w-4 text-blue-700 shrink-0" aria-hidden />
            <h2 className="app-card-title">
              Exam Center Colleges
            </h2>
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

        {filtersOpen && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="space-y-1 md:col-span-2">
              <Label>Program</Label>
              <Select options={courseOptions} value={form.courseId} onChange={(v) => setForm((f) => ({ ...f, courseId: v }))} disabled={loadingFilters} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Academic Year</Label>
              <Select options={ayOptions} value={form.academicYearId} onChange={(v) => setForm((f) => ({ ...f, academicYearId: v }))} />
            </div>
            <div className="space-y-1 md:col-span-4">
              <Label>Exam</Label>
              <Select options={examOptions} value={form.examId} onChange={(v) => setForm((f) => ({ ...f, examId: v }))} />
            </div>
            <div className="space-y-1 md:col-span-3">
              <Label>Exam Center</Label>
              <Select options={centerOptions} value={form.univExamcenterId} onChange={(v) => setForm((f) => ({ ...f, univExamcenterId: v }))} />
            </div>
            <div className="md:col-span-1">
              <Button type="button" onClick={() => void onGetList()} disabled={loadingList}>Get List</Button>
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
                          <td className="py-1">{txt(c.college_code) || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="md:col-span-2 flex items-end justify-center">
                <Button onClick={() => void onAssign()} disabled={assigning || !selectedColleges.length}>Assign</Button>
              </div>
            </div>
          </div>

          <div className="app-card px-3 py-2 border-t-[3px] border-t-amber-300 border-b border-border">
            <h3 className="text-[13px] font-semibold text-[hsl(var(--card-title))]">
              Exam Center Colleges - {headerText}
            </h3>
          </div>

          <div className="app-card overflow-hidden">
            <div className="p-2">
              <DataTable
                rowData={assignedRows}
                columnDefs={assignedColumnDefs}
                loading={loadingList}
                pagination
                toolbar={{
                  search: true,
                  searchPlaceholder: 'Search…',
                  pdfDocumentTitle: 'Exam Center Colleges — Assigned',
                }}
              />
            </div>
          </div>
        </>
      )}

      <FormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit exam center college"
        onSubmit={onSaveEdit}
        size="lg"
      >
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">College: {txt(editRow?.collegeCode)}</div>
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

