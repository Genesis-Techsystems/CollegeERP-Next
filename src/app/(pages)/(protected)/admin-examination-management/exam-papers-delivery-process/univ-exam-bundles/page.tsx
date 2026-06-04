'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { BookMarked, ChevronDown, Filter, Pencil, Plus } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout'
import { DataTable } from '@/common/components/table'
import { Select, type SelectOption } from '@/common/components/select'
import { FormModal } from '@/common/components/feedback'
import { ActiveStatusField } from '@/common/components/forms'
import { StatusBadge } from '@/common/components/data-display'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { rowIndexGetter } from '@/lib/utils'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  createUnivExamBundle,
  getExamTimetableFilterRows,
  listUnivExamBagsActive,
  listUnivExamBundlesByExamId,
  listUnivExamCentersByUniversity,
  listUniversitiesForExamGroup,
  updateUnivExamBundle,
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

function statusRenderer(p: ICellRendererParams<Row>) {
  return <StatusBadge status={Boolean(p.data?.isActive)} />
}

function makeEditRenderer(onEdit: (row: Row) => void) {
  return (p: ICellRendererParams<Row>) => {
    const row = p.data
    if (!row) return null
    return (
      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-blue-700" onClick={() => onEdit(row)}>
        <Pencil className="h-4 w-4" />
      </Button>
    )
  }
}

export default function UnivExamBundlesPage() {
  const [filtersOpen, setFiltersOpen] = useState(true)
  const [loadingFilters, setLoadingFilters] = useState(false)
  const [loadingList, setLoadingList] = useState(false)
  const [saving, setSaving] = useState(false)

  const [filterRows, setFilterRows] = useState<Row[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [bags, setBags] = useState<Row[]>([])
  const [centers, setCenters] = useState<Row[]>([])
  const [showTable, setShowTable] = useState(false)

  const [employeeId, setEmployeeId] = useState(0)
  const [orgId, setOrgId] = useState(0)

  const [form, setForm] = useState({
    univExamcenterId: '',
    courseId: '',
    academicYearId: '',
    examId: '',
    univExamBagId: '0',
  })

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Row | null>(null)
  const [formModal, setFormModal] = useState({
    univExamBagId: '',
    bundleNumber: '',
    startSerialNo: '',
    endSerialNo: '',
    totalAnswerBooks: '',
    isActive: true,
    reason: '',
  })

  useEffect(() => {
    setEmployeeId(Number(globalThis?.localStorage?.getItem('employeeId') ?? 0))
    setOrgId(Number(globalThis?.localStorage?.getItem('organizationId') ?? 0))
  }, [])

  const courses = useMemo(() => dedupeBy(filterRows, (r) => num(r.fk_course_id)), [filterRows])
  const academicYears = useMemo(
    () =>
      dedupeBy(
        filterRows.filter((r) => num(r.fk_course_id) === Number(form.courseId)),
        (r) => num(r.fk_academic_year_id),
      ),
    [filterRows, form.courseId],
  )
  const exams = useMemo(
    () =>
      dedupeBy(
        filterRows.filter(
          (r) =>
            num(r.fk_course_id) === Number(form.courseId) &&
            num(r.fk_academic_year_id) === Number(form.academicYearId) &&
            r.is_internal_exam !== true,
        ),
        (r) => num(r.fk_exam_id),
      ),
    [filterRows, form.courseId, form.academicYearId],
  )

  const bagsOptions: SelectOption[] = useMemo(
    () => [{ value: '0', label: 'All' }, ...bags.map((b) => ({ value: String(num(b.univExamBagId ?? b.univ_exam_bag_id)), label: txt(b.bagSerialNo) }))],
    [bags],
  )
  const centerOptions: SelectOption[] = useMemo(
    () => centers.map((c) => ({ value: String(num(c.univExamcenterId ?? c.univExamCenterId)), label: txt(c.examcenterCode ?? c.examCenterCode) })),
    [centers],
  )

  const headerText = useMemo(() => {
    const c = courses.find((x) => num(x.fk_course_id) === Number(form.courseId))
    const ay = academicYears.find((x) => num(x.fk_academic_year_id) === Number(form.academicYearId))
    const e = exams.find((x) => num(x.fk_exam_id) === Number(form.examId))
    return `${txt(c?.course_code)} / ${txt(ay?.academic_year)} / ${txt(e?.exam_name)}`
  }, [courses, academicYears, exams, form])

  const columnDefs = useMemo<ColDef<Row>[]>(
    () => [
      { headerName: 'SL No.', valueGetter: rowIndexGetter, width: 80, flex: 0 },
      { headerName: 'Exam Bag', minWidth: 130, valueGetter: (p) => txt(p.data?.bagSerialNo) },
      { headerName: 'Bundle Number', minWidth: 130, valueGetter: (p) => txt(p.data?.bundleNumber) },
      { headerName: 'Start Serial No', minWidth: 130, valueGetter: (p) => txt(p.data?.startSerialNo) },
      { headerName: 'End Serial No', minWidth: 130, valueGetter: (p) => txt(p.data?.endSerialNo) },
      { headerName: 'Total Answer Books', minWidth: 150, valueGetter: (p) => txt(p.data?.totalAnswerBooks) },
      { field: 'isActive', headerName: 'Status', minWidth: 100, cellRenderer: statusRenderer },
      { headerName: 'Actions', minWidth: 72, width: 72, flex: 0, cellRenderer: makeEditRenderer(onEdit) },
    ],
    [],
  )

  async function loadFilters() {
    if (!employeeId || !orgId) return
    setLoadingFilters(true)
    try {
      const rows = await getExamTimetableFilterRows({ organizationId: orgId, employeeId })
      setFilterRows(Array.isArray(rows) ? rows : [])
    } catch (e) {
      toastError(e, 'Failed to load filters')
      setFilterRows([])
    } finally {
      setLoadingFilters(false)
    }
  }

  useEffect(() => {
    void loadFilters()
  }, [employeeId, orgId])

  useEffect(() => {
    async function loadBags() {
      const rows = await listUnivExamBagsActive().catch(() => [])
      setBags(Array.isArray(rows) ? rows : [])
    }
    void loadBags()
  }, [])

  useEffect(() => {
    if (!courses.length || form.courseId) return
    setForm((f) => ({ ...f, courseId: String(num(courses[0].fk_course_id)) }))
  }, [courses, form.courseId])

  useEffect(() => {
    const v = academicYears[0] ? String(num(academicYears[0].fk_academic_year_id)) : ''
    setForm((f) => ({ ...f, academicYearId: v, examId: '', univExamcenterId: '', univExamBagId: '0' }))
  }, [form.courseId, academicYears])

  useEffect(() => {
    const v = exams[0] ? String(num(exams[0].fk_exam_id)) : ''
    setForm((f) => ({ ...f, examId: v, univExamcenterId: '', univExamBagId: '0' }))
  }, [form.academicYearId, exams])

  useEffect(() => {
    async function loadCenters() {
      if (!form.examId || !orgId || !employeeId) return
      const univs = await listUniversitiesForExamGroup(orgId, employeeId).catch(() => [])
      const universityId = num(univs[0]?.universityId)
      if (!universityId) {
        setCenters([])
        return
      }
      const rows = await listUnivExamCentersByUniversity(universityId).catch(() => [])
      setCenters(Array.isArray(rows) ? rows : [])
    }
    void loadCenters()
  }, [form.examId, orgId, employeeId])

  useEffect(() => {
    const v = centerOptions[0]?.value ?? ''
    setForm((f) => ({ ...f, univExamcenterId: v }))
  }, [centerOptions])

  async function onGetList() {
    if (!form.examId || !form.univExamcenterId) {
      toastError('Select exam center, course, academic year and exam.')
      return
    }
    setLoadingList(true)
    try {
      const list = await listUnivExamBundlesByExamId(Number(form.examId))
      let filtered = Array.isArray(list) ? list : []
      filtered = filtered.filter((r) => num(r.univExamcenterId ?? r.univExamCenterId) === Number(form.univExamcenterId))
      if (Number(form.univExamBagId) > 0) {
        filtered = filtered.filter((r) => num(r.univExamBagId ?? r.univ_exam_bag_id) === Number(form.univExamBagId))
      }
      setRows(filtered)
      setShowTable(true)
    } catch (e) {
      toastError(e, 'Failed to load exam bundles')
      setRows([])
      setShowTable(false)
    } finally {
      setLoadingList(false)
    }
  }

  function openCreate() {
    setEditing(null)
    setFormModal({
      univExamBagId: '',
      bundleNumber: '',
      startSerialNo: '',
      endSerialNo: '',
      totalAnswerBooks: '',
      isActive: true,
      reason: '',
    })
    setModalOpen(true)
  }

  function onEdit(row: Row) {
    setEditing(row)
    setFormModal({
      univExamBagId: String(num(row.univExamBagId ?? row.univ_exam_bag_id)),
      bundleNumber: txt(row.bundleNumber),
      startSerialNo: txt(row.startSerialNo),
      endSerialNo: txt(row.endSerialNo),
      totalAnswerBooks: txt(row.totalAnswerBooks),
      isActive: row.isActive === true,
      reason: txt(row.reason),
    })
    setModalOpen(true)
  }

  async function onSave(e: { preventDefault: () => void }) {
    e.preventDefault()
    if (!form.examId) {
      toastError('Select exam first.')
      return
    }
    if (!formModal.univExamBagId) {
      toastError('Univ Exam Bag is required.')
      return
    }
    if (!formModal.bundleNumber.trim()) {
      toastError('Bundle Number is required.')
      return
    }
    if (!formModal.startSerialNo.trim()) {
      toastError('Start Serial No is required.')
      return
    }
    if (!formModal.endSerialNo.trim()) {
      toastError('End Serial No is required.')
      return
    }
    if (!formModal.totalAnswerBooks.trim()) {
      toastError('Total Answer Books is required.')
      return
    }
    if (!formModal.isActive && !formModal.reason.trim()) {
      toastError('Reason is required when inactive.')
      return
    }

    const payload: Record<string, unknown> = {
      examId: Number(form.examId),
      univExamBagId: Number(formModal.univExamBagId),
      bundleNumber: formModal.bundleNumber.trim(),
      startSerialNo: formModal.startSerialNo.trim(),
      endSerialNo: formModal.endSerialNo.trim(),
      totalAnswerBooks: Number(formModal.totalAnswerBooks),
      isActive: formModal.isActive,
      reason: formModal.isActive ? '' : formModal.reason.trim(),
    }

    setSaving(true)
    try {
      const id = num(editing?.unvExamBundleId)
      if (id > 0) {
        await updateUnivExamBundle(id, { ...payload, unvExamBundleId: id })
        toastSuccess('Exam bundle updated.')
      } else {
        await createUnivExamBundle(payload)
        toastSuccess('Exam bundle created.')
      }
      setModalOpen(false)
      await onGetList()
    } catch (err) {
      toastError(err, 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageContainer className="space-y-4">
      <PageHeader title="Exam bundles" subtitle="Exam papers delivery process · Exam bundles" />

      <div className="app-card p-3 border-t-[3px] border-t-amber-300">
        <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
          <div className="flex items-center gap-2 min-w-0">
            <BookMarked className="h-4 w-4 text-blue-700 shrink-0" aria-hidden />
            <h2 className="app-card-title">
              Exam Bundles
            </h2>
          </div>
          <button type="button" className="flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground" onClick={() => setFiltersOpen((v) => !v)} aria-expanded={filtersOpen}>
            <span>Filter</span>
            <Filter className="h-4 w-4" aria-hidden />
            <ChevronDown className={`h-4 w-4 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {filtersOpen && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="space-y-1 md:col-span-2"><Label>Exam Center *</Label><Select options={centerOptions} value={form.univExamcenterId} onChange={(v) => setForm((f) => ({ ...f, univExamcenterId: v ?? '' }))} /></div>
            <div className="space-y-1 md:col-span-2"><Label>Course *</Label><Select options={courses.map((r) => ({ value: String(num(r.fk_course_id)), label: txt(r.course_code) }))} value={form.courseId} onChange={(v) => setForm((f) => ({ ...f, courseId: v ?? '' }))} disabled={loadingFilters} /></div>
            <div className="space-y-1 md:col-span-2"><Label>Academic Year *</Label><Select options={academicYears.map((r) => ({ value: String(num(r.fk_academic_year_id)), label: txt(r.academic_year) }))} value={form.academicYearId} onChange={(v) => setForm((f) => ({ ...f, academicYearId: v ?? '' }))} /></div>
            <div className="space-y-1 md:col-span-6"><Label>Exam</Label><Select options={exams.map((r) => ({ value: String(num(r.fk_exam_id)), label: `${txt(r.exam_name)} (${txt(r.from_date)} - ${txt(r.to_date)})` }))} value={form.examId} onChange={(v) => setForm((f) => ({ ...f, examId: v ?? '' }))} /></div>
            <div className="space-y-1 md:col-span-4"><Label>Univ Exam Bag *</Label><Select options={bagsOptions} value={form.univExamBagId} onChange={(v) => setForm((f) => ({ ...f, univExamBagId: v ?? '' }))} /></div>
            <div className="md:col-span-2"><Button type="button" onClick={() => void onGetList()} disabled={loadingList}>Get List</Button></div>
          </div>
        )}
      </div>

      {showTable && (
        <>
          <div className="app-card px-3 py-2 border-t-[3px] border-t-amber-300 border-b border-border">
            <h3 className="text-[13px] font-semibold text-[hsl(var(--card-title))]">Exam Bundles - {headerText}</h3>
          </div>
          <div className="app-card overflow-hidden">
            <div className="p-2">
              <DataTable
                rowData={rows}
                columnDefs={columnDefs}
                loading={loadingList}
                pagination
                toolbar={{
                  search: true,
                  searchPlaceholder: 'Search…',
                  pdfDocumentTitle: 'Exam Bundles',
                }}
                toolbarTrailing={
                  <Button type="button" className="h-[30px] px-3 text-[12px]" onClick={openCreate}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add Exam Bundles
                  </Button>
                }
              />
            </div>
          </div>
        </>
      )}

      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Exam Bundles' : 'Add Exam Bundles'}
        onSubmit={onSave}
        isSubmitting={saving}
        size="xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1 md:col-span-2">
            <Label>Univ Exam Bag</Label>
            <Select options={bagsOptions} value={formModal.univExamBagId} onChange={(v) => setFormModal((f) => ({ ...f, univExamBagId: v ?? '' }))} />
          </div>
          <div className="space-y-1">
            <Label>Bundle Number</Label>
            <Input value={formModal.bundleNumber} onChange={(e) => setFormModal((f) => ({ ...f, bundleNumber: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Start Serial No</Label>
            <Input value={formModal.startSerialNo} onChange={(e) => setFormModal((f) => ({ ...f, startSerialNo: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>End Serial No</Label>
            <Input value={formModal.endSerialNo} onChange={(e) => setFormModal((f) => ({ ...f, endSerialNo: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Total Answer Books</Label>
            <Input type="number" value={formModal.totalAnswerBooks} onChange={(e) => setFormModal((f) => ({ ...f, totalAnswerBooks: e.target.value }))} />
          </div>
        </div>

        <ActiveStatusField
          isActive={formModal.isActive}
          reason={formModal.reason}
          onActiveChange={(v) => setFormModal((f) => ({ ...f, isActive: v === true }))}
          onReasonChange={(v) => setFormModal((f) => ({ ...f, reason: v }))}
        />
      </FormModal>
    </PageContainer>
  )
}

