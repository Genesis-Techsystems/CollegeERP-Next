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
import { getExamTimetableFilterRows } from '@/services/exam-papers-delivery'
import {
  createUnivExamBag,
  listUnivExamBagsByCenterAndTimetable,
  listUnivExamCentersByUniversity,
  listUniversitiesForExamGroup,
  pickUnivExamBagId,
  updateUnivExamBag,
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

function sealedRenderer(p: ICellRendererParams<Row>) {
  return <StatusBadge status={Boolean(p.data?.isSealed)} activeLabel="Yes" inactiveLabel="No" />
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

export default function UnivExamBagsPage() {
  const [filtersOpen, setFiltersOpen] = useState(true)
  const [loadingFilters, setLoadingFilters] = useState(false)
  const [loadingList, setLoadingList] = useState(false)
  const [saving, setSaving] = useState(false)

  const [filterRows, setFilterRows] = useState<Row[]>([])
  const [centerRows, setCenterRows] = useState<Row[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [showTable, setShowTable] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Row | null>(null)
  const [formModal, setFormModal] = useState({
    bagSerialNo: '',
    totalAnswerBooks: '',
    trackerId: '',
    sealedbyName: '',
    dispatchStatusCatdetId: '',
    isSealed: false,
    isActive: true,
    reason: '',
  })

  const [form, setForm] = useState({
    courseId: '',
    academicYearId: '',
    examId: '',
    univExamcenterId: '',
  })

  const [employeeId, setEmployeeId] = useState(0)
  const [orgId, setOrgId] = useState(0)

  useEffect(() => {
    setEmployeeId(Number(globalThis?.localStorage?.getItem('employeeId') ?? 0))
    setOrgId(Number(globalThis?.localStorage?.getItem('organizationId') ?? 0))
  }, [])

  const courses = useMemo(() => dedupeBy(filterRows, (r) => num(r.fk_course_id)), [filterRows])
  const academicYears = useMemo(
    () => dedupeBy(filterRows.filter((r) => num(r.fk_course_id) === Number(form.courseId)), (r) => num(r.fk_academic_year_id)),
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

  const centerOptions: SelectOption[] = useMemo(
    () =>
      centerRows.map((r) => ({
        value: String(num(r.univExamcenterId ?? r.univExamCenterId)),
        label: txt(r.examcenterCode ?? r.examCenterCode),
      })),
    [centerRows],
  )

  const headerText = useMemo(() => {
    const c = courses.find((x) => num(x.fk_course_id) === Number(form.courseId))
    const ay = academicYears.find((x) => num(x.fk_academic_year_id) === Number(form.academicYearId))
    const e = exams.find((x) => num(x.fk_exam_id) === Number(form.examId))
    const ec = centerRows.find((x) => num(x.univExamcenterId ?? x.univExamCenterId) === Number(form.univExamcenterId))
    return `${txt(c?.course_code)} / ${txt(ay?.academic_year)} / ${txt(e?.exam_name)} / ${txt(ec?.examcenterName ?? ec?.examCenterName)}`
  }, [courses, academicYears, exams, centerRows, form])

  const columnDefs = useMemo<ColDef<Row>[]>(
    () => [
      { headerName: 'SL No.', valueGetter: rowIndexGetter, width: 80, flex: 0 },
      { headerName: 'Exam Center', minWidth: 140, valueGetter: (p) => txt(p.data?.examcenterCode) },
      { headerName: 'Bag Serial No', minWidth: 130, valueGetter: (p) => txt(p.data?.bagSerialNo) },
      { headerName: 'Tracker Id', minWidth: 120, valueGetter: (p) => txt(p.data?.trackerId) },
      { headerName: 'Total Answer Books', minWidth: 150, valueGetter: (p) => txt(p.data?.totalAnswerBooks) },
      { headerName: 'Dispatched Status', minWidth: 150, valueGetter: (p) => txt(p.data?.dispatchStatusCatdetName) },
      { headerName: 'Sealed By Name', minWidth: 140, valueGetter: (p) => txt(p.data?.sealedbyName) },
      { headerName: 'Is Sealed', minWidth: 100, cellRenderer: sealedRenderer },
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
    if (!courses.length || form.courseId) return
    setForm((f) => ({ ...f, courseId: String(num(courses[0].fk_course_id)) }))
  }, [courses, form.courseId])

  useEffect(() => {
    const v = academicYears[0] ? String(num(academicYears[0].fk_academic_year_id)) : ''
    setForm((f) => ({ ...f, academicYearId: v, examId: '', univExamcenterId: '' }))
  }, [form.courseId, academicYears])

  useEffect(() => {
    const v = exams[0] ? String(num(exams[0].fk_exam_id)) : ''
    setForm((f) => ({ ...f, examId: v, univExamcenterId: '' }))
  }, [form.academicYearId, exams])

  useEffect(() => {
    async function loadCenters() {
      if (!form.examId) return
      const univs = await listUniversitiesForExamGroup(orgId, employeeId).catch(() => [])
      const universityId = num((univs[0] ?? {}).universityId)
      if (!universityId) {
        setCenterRows([])
        return
      }
      const rows = await listUnivExamCentersByUniversity(universityId).catch(() => [])
      setCenterRows(Array.isArray(rows) ? rows : [])
    }
    void loadCenters()
  }, [form.examId, orgId, employeeId])

  useEffect(() => {
    const v = centerOptions[0]?.value ?? ''
    setForm((f) => ({ ...f, univExamcenterId: v }))
  }, [centerOptions])

  function pickExamTimetableId(): number {
    return num(exams.find((e) => num(e.fk_exam_id) === Number(form.examId))?.fk_exam_timetable_id)
  }

  async function onGetList() {
    if (!form.univExamcenterId || !form.examId) {
      toastError('Select exam and exam center.')
      return
    }
    setLoadingList(true)
    try {
      const list = await listUnivExamBagsByCenterAndTimetable(Number(form.univExamcenterId), pickExamTimetableId())
      setRows(Array.isArray(list) ? list : [])
      setShowTable(true)
    } catch (e) {
      toastError(e, 'Failed to load exam bags')
      setRows([])
      setShowTable(false)
    } finally {
      setLoadingList(false)
    }
  }

  function openCreate() {
    setEditing(null)
    setFormModal({
      bagSerialNo: '',
      totalAnswerBooks: '',
      trackerId: '',
      sealedbyName: '',
      dispatchStatusCatdetId: '',
      isSealed: false,
      isActive: true,
      reason: '',
    })
    setModalOpen(true)
  }

  function onEdit(row: Row) {
    setEditing(row)
    setFormModal({
      bagSerialNo: txt(row.bagSerialNo),
      totalAnswerBooks: txt(row.totalAnswerBooks),
      trackerId: txt(row.trackerId),
      sealedbyName: txt(row.sealedbyName),
      dispatchStatusCatdetId: txt(row.dispatchStatusCatdetId),
      isSealed: row.isSealed === true,
      isActive: row.isActive === true,
      reason: txt(row.reason),
    })
    setModalOpen(true)
  }

  async function onSave(e: { preventDefault: () => void }) {
    e.preventDefault()
    if (!form.univExamcenterId || !form.examId) {
      toastError('Select filter values first.')
      return
    }
    if (!formModal.bagSerialNo.trim()) {
      toastError('Bag Serial No is required.')
      return
    }
    if (!formModal.totalAnswerBooks.trim()) {
      toastError('Total Answer Books is required.')
      return
    }
    if (!formModal.trackerId.trim()) {
      toastError('Tracker Id is required.')
      return
    }
    if (!formModal.dispatchStatusCatdetId.trim()) {
      toastError('Dispatch Status is required.')
      return
    }
    if (!formModal.isActive && !formModal.reason.trim()) {
      toastError('Reason is required when inactive.')
      return
    }

    const payload: Record<string, unknown> = {
      univExamcenterId: Number(form.univExamcenterId),
      examTimetableId: pickExamTimetableId(),
      bagSerialNo: formModal.bagSerialNo.trim(),
      totalAnswerBooks: Number(formModal.totalAnswerBooks),
      trackerId: formModal.trackerId.trim(),
      dispatchStatusCatdetId: Number(formModal.dispatchStatusCatdetId),
      isSealed: formModal.isSealed,
      sealedbyUserId: employeeId,
      sealedbyName: formModal.sealedbyName.trim(),
      isActive: formModal.isActive,
      reason: formModal.isActive ? '' : formModal.reason.trim(),
    }

    setSaving(true)
    try {
      const id = pickUnivExamBagId(editing ?? {})
      if (id > 0) {
        await updateUnivExamBag(id, { ...payload, univExamBagId: id })
        toastSuccess('Exam bag updated.')
      } else {
        await createUnivExamBag(payload)
        toastSuccess('Exam bag created.')
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
    <PageContainer className="space-y-5">
      <PageHeader title="Exam bags" subtitle="Exam papers delivery process · Exam bags" />

      <div className="app-card p-3 border-t-[3px] border-t-amber-300">
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2 min-w-0">
            <BookMarked className="h-4 w-4 text-blue-700 shrink-0" aria-hidden />
            <h2 className="text-[14px] font-semibold leading-tight text-[hsl(var(--card-title))] truncate">
              Exam Bags
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
            <div className="space-y-1 md:col-span-2"><Label>Program</Label><Select options={courses.map((r) => ({ value: String(num(r.fk_course_id)), label: txt(r.course_code) }))} value={form.courseId} onChange={(v) => setForm((f) => ({ ...f, courseId: v }))} disabled={loadingFilters} /></div>
            <div className="space-y-1 md:col-span-2"><Label>Academic Year</Label><Select options={academicYears.map((r) => ({ value: String(num(r.fk_academic_year_id)), label: txt(r.academic_year) }))} value={form.academicYearId} onChange={(v) => setForm((f) => ({ ...f, academicYearId: v }))} /></div>
            <div className="space-y-1 md:col-span-5"><Label>Exam</Label><Select options={exams.map((r) => ({ value: String(num(r.fk_exam_id)), label: `${txt(r.exam_name)} (${txt(r.from_date)} - ${txt(r.to_date)})` }))} value={form.examId} onChange={(v) => setForm((f) => ({ ...f, examId: v }))} /></div>
            <div className="space-y-1 md:col-span-2"><Label>Exam Center</Label><Select options={centerOptions} value={form.univExamcenterId} onChange={(v) => setForm((f) => ({ ...f, univExamcenterId: v }))} /></div>
            <div className="md:col-span-1"><Button type="button" onClick={() => void onGetList()} disabled={loadingList}>Get List</Button></div>
          </div>
        )}
      </div>

      {showTable && (
        <>
          <div className="app-card px-3 py-2 border-t-[3px] border-t-amber-300 border-b border-slate-200">
            <h3 className="text-[13px] font-semibold text-[hsl(var(--card-title))]">Exam Bags - {headerText}</h3>
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
                  pdfDocumentTitle: 'Exam Bags',
                }}
                toolbarTrailing={
                  <Button type="button" className="h-[30px] px-3 text-[12px]" onClick={openCreate}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add Exam Bags
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
        title={editing ? 'Edit Exam Bag' : 'Add Exam Bag'}
        onSubmit={onSave}
        isSubmitting={saving}
        size="xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Bag Serial No</Label>
            <Input value={formModal.bagSerialNo} onChange={(e) => setFormModal((f) => ({ ...f, bagSerialNo: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Total Answer Books</Label>
            <Input type="number" value={formModal.totalAnswerBooks} onChange={(e) => setFormModal((f) => ({ ...f, totalAnswerBooks: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Tracker Id</Label>
            <Input value={formModal.trackerId} onChange={(e) => setFormModal((f) => ({ ...f, trackerId: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Sealed By Name</Label>
            <Input value={formModal.sealedbyName} onChange={(e) => setFormModal((f) => ({ ...f, sealedbyName: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Dispatch Status (ID)</Label>
            <Input type="number" value={formModal.dispatchStatusCatdetId} onChange={(e) => setFormModal((f) => ({ ...f, dispatchStatusCatdetId: e.target.value }))} />
          </div>
          <label className="flex items-center gap-2 text-sm font-medium pt-7">
            <input type="checkbox" checked={formModal.isSealed} onChange={(e) => setFormModal((f) => ({ ...f, isSealed: e.target.checked }))} />
            Is Sealed
          </label>
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

