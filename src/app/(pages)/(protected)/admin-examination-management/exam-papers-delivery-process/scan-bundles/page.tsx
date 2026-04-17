'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { BookMarked, ChevronDown, Filter, Pencil, Plus } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { DataTable } from '@/common/components/table'
import { SearchInput } from '@/common/components/search'
import { Select, type SelectOption } from '@/common/components/select'
import { FormModal } from '@/common/components/feedback'
import { StatusBadge } from '@/common/components/data-display'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { rowIndexGetter } from '@/lib/utils'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  createExamScanBundle,
  getExamCenterByCodeRows,
  listAllActiveExamScanBundles,
  listAllActiveUnivEcProfiles,
  pickExamScanBundleId,
  updateExamScanBundle,
  type AnyRow,
} from '@/services/exam-papers-delivery'
import { getUnivExamFiltersRegSup } from '@/services/pre-examination'

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

function pickName(row: Row): string {
  return txt(row.scanProfileName ?? row.profileName ?? row.name)
}

function pickExamGroupId(row: Row): number {
  return num(row.fk_exam_group_id ?? row.examGroupId ?? row.exam_group_id ?? row.fk_exam_id ?? row.examId ?? row.exam_id)
}

function pickAcademicYearId(row: Row): number {
  return num(row.fk_academic_year_id ?? row.academicYearId ?? row.academic_year_id ?? row.fk_academic_yearid)
}

function pickCourseId(row: Row): number {
  return num(row.fk_course_id ?? row.courseId ?? row.course_id)
}

function pickAcademicYearKey(row: Row): string {
  const v =
    row.fk_academic_year_id ??
    row.academicYearId ??
    row.academic_year_id ??
    row.fk_academic_yearid ??
    row.academicYear
  return String(v ?? '').trim()
}

function pickExamGroupKey(row: Row): string {
  const v =
    row.fk_exam_group_id ??
    row.examGroupId ??
    row.exam_group_id ??
    row.fk_exam_id ??
    row.examId ??
    row.exam_id
  return String(v ?? '').trim()
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

export default function ScanBundlesPage() {
  const [employeeId, setEmployeeId] = useState(0)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(true)
  const [showTable, setShowTable] = useState(false)
  const [tableSearch, setTableSearch] = useState('')

  const [baseRows, setBaseRows] = useState<Row[]>([])
  const [scanFilterRows, setScanFilterRows] = useState<Row[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [scanProfiles, setScanProfiles] = useState<Row[]>([])

  const [form, setForm] = useState({
    academicYearId: '',
    examId: '',
    courseId: '',
    courseYearId: '',
    regulationId: '',
    subjectId: '',
  })

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Row | null>(null)
  const [formModal, setFormModal] = useState({
    bundleNumber: '',
    totalAnswerBooks: '',
    examScanProfileId: '',
    startSeatNo: '',
    endSeatNo: '',
    isActive: true,
  })

  const courses = useMemo(() => dedupeBy(scanFilterRows, (r) => pickCourseId(r)), [scanFilterRows])
  const academicYears = useMemo(() => {
    const seen = new Set<string>()
    const out: Row[] = []
    for (const r of baseRows) {
      const key = pickAcademicYearKey(r)
      if (!key || seen.has(key)) continue
      seen.add(key)
      out.push(r)
    }
    return out
  }, [baseRows])
  const exams = useMemo(
    () => {
      const rows = baseRows.filter((r) => pickAcademicYearKey(r) === String(form.academicYearId))
      const seen = new Set<string>()
      const out: Row[] = []
      for (const r of rows) {
        const key = pickExamGroupKey(r)
        if (!key || seen.has(key)) continue
        seen.add(key)
        out.push(r)
      }
      return out
    },
    [baseRows, form.academicYearId],
  )
  const courseYears = useMemo(
    () =>
      dedupeBy(
        scanFilterRows.filter(
          (r) =>
            pickCourseId(r) === Number(form.courseId) &&
            pickAcademicYearId(r) === Number(form.academicYearId) &&
            num(r.fk_exam_id ?? r.examId) === Number(form.examId),
        ),
        (r) => num(r.fk_course_year_id ?? r.courseYearId),
      ),
    [scanFilterRows, form.courseId, form.academicYearId, form.examId],
  )
  const regulations = useMemo(
    () =>
      dedupeBy(
        scanFilterRows.filter(
          (r) =>
            pickCourseId(r) === Number(form.courseId) &&
            pickAcademicYearId(r) === Number(form.academicYearId) &&
            num(r.fk_exam_id ?? r.examId) === Number(form.examId) &&
            num(r.fk_course_year_id ?? r.courseYearId) === Number(form.courseYearId),
        ),
        (r) => num(r.fk_regulation_id ?? r.regulationId ?? r.regulationCatId),
      ),
    [scanFilterRows, form.courseId, form.academicYearId, form.examId, form.courseYearId],
  )
  const subjects = useMemo(
    () =>
      dedupeBy(
        scanFilterRows.filter(
          (r) =>
            pickCourseId(r) === Number(form.courseId) &&
            pickAcademicYearId(r) === Number(form.academicYearId) &&
            num(r.fk_exam_id ?? r.examId) === Number(form.examId) &&
            num(r.fk_course_year_id ?? r.courseYearId) === Number(form.courseYearId) &&
            num(r.fk_regulation_id ?? r.regulationId ?? r.regulationCatId) === Number(form.regulationId),
        ),
        (r) => num(r.fk_subject_id ?? r.subjectId),
      ),
    [scanFilterRows, form.courseId, form.academicYearId, form.examId, form.courseYearId, form.regulationId],
  )

  const filteredRows = useMemo(() => {
    const q = tableSearch.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q))
  }, [rows, tableSearch])

  const headerText = useMemo(() => {
    const ex = exams.find((e) => pickExamGroupId(e) === Number(form.examId))
    const examCode = txt(ex?.exam_name ?? ex?.examName) || 'GU'
    return `${examCode} / / /`
  }, [exams, form.examId])

  const scanProfileOptions: SelectOption[] = useMemo(
    () =>
      scanProfiles.map((p) => ({
        value: String(num(p.examScanProfileId ?? p.univEcPorifleId)),
        label: pickName(p),
      })),
    [scanProfiles],
  )

  useEffect(() => {
    setEmployeeId(Number(globalThis?.localStorage?.getItem('employeeId') ?? 0))
  }, [])

  useEffect(() => {
    async function init() {
      if (!employeeId) return
      setLoading(true)
      try {
        const topFilters = await getUnivExamFiltersRegSup(employeeId).catch(() => [])
        const filtersFromEg = await getExamCenterByCodeRows({
          flag: 'eg_filters',
          flagType: 'REGSUP',
          univExamcenterId: 0,
          examGroupId: 0,
          collegeId: 0,
          courseId: 0,
          courseGroupId: 0,
          courseYearId: 0,
          academicYearId: 0,
          examId: 0,
          regulationId: 0,
          subjectId: 0,
          universityId: 0,
        }).catch(() => [])
        const mergedTop = [
          ...(Array.isArray(topFilters) ? topFilters : []),
          ...(Array.isArray(filtersFromEg) ? filtersFromEg : []),
        ]
        setBaseRows(mergedTop)
        setScanFilterRows([])
      } finally {
        setLoading(false)
      }
    }
    void init()
  }, [employeeId])

  useEffect(() => {
    async function loadProfiles() {
      const list = await listAllActiveUnivEcProfiles().catch(() => [])
      setScanProfiles(Array.isArray(list) ? list : [])
    }
    void loadProfiles()
  }, [])

  useEffect(() => {
    if (!academicYears.length || form.academicYearId) return
    setForm((f) => ({ ...f, academicYearId: pickAcademicYearKey(academicYears[0]) }))
  }, [academicYears, form.academicYearId])

  useEffect(() => {
    if (!exams.length || form.examId) return
    setForm((f) => ({ ...f, examId: pickExamGroupKey(exams[0]) }))
  }, [exams, form.examId])

  useEffect(() => {
    async function loadScanFilterRows() {
      if (!form.academicYearId || !form.examId) return
      const rows = await getExamCenterByCodeRows({
        flag: 'eg_scan_filter',
        flagType: 'REGSUP',
        univExamcenterId: 0,
        examGroupId: Number(form.examId),
        collegeId: 0,
        courseId: 0,
        courseGroupId: 0,
        courseYearId: 0,
        academicYearId: Number(form.academicYearId),
        examId: 0,
        regulationId: 0,
        subjectId: 0,
        universityId: 0,
      }).catch(() => [])
      setScanFilterRows(Array.isArray(rows) ? rows : [])
      setForm((f) => ({ ...f, courseId: '', courseYearId: '', regulationId: '', subjectId: '' }))
    }
    void loadScanFilterRows()
  }, [form.academicYearId, form.examId])

  useEffect(() => {
    if (!courses.length) return
    setForm((f) => ({ ...f, courseId: f.courseId || String(pickCourseId(courses[0])) }))
  }, [courses])

  useEffect(() => {
    const y = courseYears[0]
    const r = regulations[0]
    const s = subjects[0]
    setForm((f) => ({
      ...f,
      courseYearId: y ? String(num(y.fk_course_year_id ?? y.courseYearId)) : f.courseYearId,
      regulationId: r ? String(num(r.fk_regulation_id ?? r.regulationId ?? r.regulationCatId)) : f.regulationId,
      subjectId: s ? String(num(s.fk_subject_id ?? s.subjectId)) : f.subjectId,
    }))
  }, [courseYears, regulations, subjects])

  async function onGetList() {
    setLoading(true)
    try {
      const list = await listAllActiveExamScanBundles()
      let out = Array.isArray(list) ? list : []
      if (form.examId) out = out.filter((r) => num(r.examGroupId ?? r.fk_exam_group_id ?? r.examId ?? r.fk_exam_id) === Number(form.examId))
      if (form.courseId) out = out.filter((r) => num(r.courseId ?? r.fk_course_id) === Number(form.courseId))
      if (form.courseYearId) out = out.filter((r) => num(r.courseYearId ?? r.fk_course_year_id) === Number(form.courseYearId))
      if (form.regulationId) out = out.filter((r) => num(r.regulationId ?? r.fk_regulation_id ?? r.regulationCatId) === Number(form.regulationId))
      if (form.subjectId) out = out.filter((r) => num(r.subjectId ?? r.fk_subject_id) === Number(form.subjectId))
      setRows(out)
      setShowTable(true)
    } catch (e) {
      toastError(e, 'Failed to load scan bundles')
      setRows([])
      setShowTable(false)
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditing(null)
    setFormModal({
      bundleNumber: '',
      totalAnswerBooks: '',
      examScanProfileId: scanProfileOptions[0]?.value ?? '',
      startSeatNo: '',
      endSeatNo: '',
      isActive: true,
    })
    setModalOpen(true)
  }

  function onEdit(row: Row) {
    setEditing(row)
    setFormModal({
      bundleNumber: txt(row.bundleNumber),
      totalAnswerBooks: txt(row.totalAnswerBooks),
      examScanProfileId: String(num(row.examScanProfileId ?? row.univEcPorifleId)),
      startSeatNo: txt(row.startSeatNo ?? row.startSerialNo),
      endSeatNo: txt(row.endSeatNo ?? row.endSerialNo),
      isActive: row.isActive === true,
    })
    setModalOpen(true)
  }

  async function onSave(e: { preventDefault: () => void }) {
    e.preventDefault()
    if (!formModal.bundleNumber.trim()) return toastError('Bundle Number is required.')
    if (!formModal.examScanProfileId) return toastError('Exam Scan Profile is required.')

    const employee = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)
    const now = new Date().toISOString()
    const payload: Record<string, unknown> = {
      examGroupId: Number(form.examId || 0),
      examId: Number(form.examId || 0),
      courseId: Number(form.courseId || 0),
      academicYearId: Number(form.academicYearId || 0),
      courseYearId: Number(form.courseYearId || 0),
      regulationId: Number(form.regulationId || 0),
      subjectId: Number(form.subjectId || 0),
      bundleNumber: formModal.bundleNumber.trim(),
      totalAnswerBooks: Number(formModal.totalAnswerBooks || 0),
      examScanProfileId: Number(formModal.examScanProfileId),
      startSeatNo: formModal.startSeatNo.trim(),
      endSeatNo: formModal.endSeatNo.trim(),
      isActive: formModal.isActive,
      reason: '',
      createdDt: now,
      updatedDt: now,
      createdUser: employee || null,
      updatedUser: employee || null,
    }

    setSaving(true)
    try {
      const id = pickExamScanBundleId(editing ?? {})
      if (id > 0) {
        await updateExamScanBundle(id, { ...payload, examScanBundleId: id })
        toastSuccess('Scan bundle updated.')
      } else {
        await createExamScanBundle(payload)
        toastSuccess('Scan bundle created.')
      }
      setModalOpen(false)
      await onGetList()
    } catch (err) {
      toastError(err, 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const columnDefs = useMemo<ColDef<Row>[]>(
    () => [
      { headerName: 'SL No.', valueGetter: rowIndexGetter, width: 78, flex: 0 },
      { headerName: 'Bundle Number', minWidth: 130, valueGetter: (p) => txt(p.data?.bundleNumber) },
      { headerName: 'Scan Profile Name', minWidth: 160, valueGetter: (p) => pickName(p.data ?? {}) },
      { headerName: 'Total Answer Books', minWidth: 140, valueGetter: (p) => txt(p.data?.totalAnswerBooks) },
      { headerName: 'Start Seat No', minWidth: 120, valueGetter: (p) => txt(p.data?.startSeatNo ?? p.data?.startSerialNo) },
      { headerName: 'End Seat No', minWidth: 120, valueGetter: (p) => txt(p.data?.endSeatNo ?? p.data?.endSerialNo) },
      { field: 'isActive', headerName: 'Status', minWidth: 90, cellRenderer: statusRenderer },
      { headerName: 'Actions', minWidth: 70, width: 70, flex: 0, cellRenderer: makeEditRenderer(onEdit) },
    ],
    [],
  )

  return (
    <PageContainer className="space-y-5">
      <div className="app-card p-3 border-t-[3px] border-t-amber-300">
        <div className="pb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <BookMarked className="h-4 w-4 text-blue-700 shrink-0" aria-hidden />
            <h2 className="text-[14px] font-semibold leading-tight text-[hsl(var(--card-title))] truncate">Scan Bundles</h2>
          </div>
          <button type="button" className="flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground" onClick={() => setFiltersOpen((v) => !v)} aria-expanded={filtersOpen}>
            <span>Filter</span>
            <Filter className="h-4 w-4" aria-hidden />
            <ChevronDown className={`h-4 w-4 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {filtersOpen && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="space-y-1 md:col-span-3"><Label>Academic Year *</Label><Select options={academicYears.map((r) => ({ value: pickAcademicYearKey(r), label: txt(r.academic_year ?? r.academicYear ?? r.academicYearCode ?? pickAcademicYearKey(r)) }))} value={form.academicYearId} onChange={(v) => setForm((f) => ({ ...f, academicYearId: v ?? '' }))} /></div>
            <div className="space-y-1 md:col-span-4"><Label>Exam Group *</Label><Select options={exams.map((r) => ({ value: pickExamGroupKey(r), label: txt(r.exam_name ?? r.examName ?? r.examGroupName ?? pickExamGroupKey(r)) }))} value={form.examId} onChange={(v) => setForm((f) => ({ ...f, examId: v ?? '' }))} /></div>
            <div className="space-y-1 md:col-span-3"><Label>Course *</Label><Select options={courses.map((r) => ({ value: String(pickCourseId(r)), label: txt(r.course_code ?? r.courseCode) }))} value={form.courseId} onChange={(v) => setForm((f) => ({ ...f, courseId: v ?? '' }))} /></div>
            <div className="space-y-1 md:col-span-2"><Label>Course Years *</Label><Select options={courseYears.map((r) => ({ value: String(num(r.fk_course_year_id ?? r.courseYearId)), label: txt(r.course_year_code ?? r.courseYearCode) }))} value={form.courseYearId} onChange={(v) => setForm((f) => ({ ...f, courseYearId: v ?? '' }))} /></div>
            <div className="space-y-1 md:col-span-3"><Label>Regulation *</Label><Select options={regulations.map((r) => ({ value: String(num(r.fk_regulation_id ?? r.regulationId ?? r.regulationCatId)), label: txt(r.regulation_code ?? r.regulationCode ?? r.regulation_name) }))} value={form.regulationId} onChange={(v) => setForm((f) => ({ ...f, regulationId: v ?? '' }))} /></div>
            <div className="space-y-1 md:col-span-5"><Label>Subjects</Label><Select options={subjects.map((r) => ({ value: String(num(r.fk_subject_id ?? r.subjectId)), label: `${txt(r.subject_name ?? r.subjectName)} (${txt(r.subject_code ?? r.subjectCode)})` }))} value={form.subjectId} onChange={(v) => setForm((f) => ({ ...f, subjectId: v ?? '' }))} /></div>
            <div className="md:col-span-2"><Button type="button" onClick={() => void onGetList()} disabled={loading}>Get List</Button></div>
          </div>
        )}
      </div>

      {showTable && (
        <>
          <div className="app-card px-3 py-2 border-t-[3px] border-t-amber-300">
            <h3 className="text-[13px] font-semibold text-[hsl(var(--card-title))]">Scan Bundles - {headerText}</h3>
          </div>
          <div className="app-card overflow-hidden">
            <div className="px-3 py-2 border-b border-border flex items-center justify-between gap-2">
              <SearchInput value={tableSearch} onChange={setTableSearch} placeholder="Search" className="w-full sm:max-w-xs" />
              <div className="flex items-center gap-2">
                <Button type="button">Bulk Populate</Button>
                <Button type="button">Bulk Print Stickers</Button>
                <Button type="button" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Scan Bundles</Button>
              </div>
            </div>
            <div className="p-2">
              <DataTable rowData={filteredRows} columnDefs={columnDefs} loading={loading} pagination />
            </div>
          </div>
        </>
      )}

      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`${editing ? 'Edit' : 'Add'} Scan Bundles - /${headerText}`}
        onSubmit={onSave}
        isSubmitting={saving}
        size="xl"
        showHeaderDivider
        showCloseButton={false}
        cancelLabel="Close"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label>Bundle Number *</Label>
            <Input value={formModal.bundleNumber} onChange={(e) => setFormModal((f) => ({ ...f, bundleNumber: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Total Answer Books</Label>
            <Input value={formModal.totalAnswerBooks} onChange={(e) => setFormModal((f) => ({ ...f, totalAnswerBooks: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Exam Scan Profile</Label>
            <Select options={scanProfileOptions} value={formModal.examScanProfileId} onChange={(v) => setFormModal((f) => ({ ...f, examScanProfileId: v ?? '' }))} />
          </div>
          <div className="space-y-1">
            <Label>Start Seat No</Label>
            <Input value={formModal.startSeatNo} onChange={(e) => setFormModal((f) => ({ ...f, startSeatNo: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>End Seat No</Label>
            <Input value={formModal.endSeatNo} onChange={(e) => setFormModal((f) => ({ ...f, endSeatNo: e.target.value }))} />
          </div>
          <div className="flex items-center gap-2 text-sm font-medium mt-6">
            <input id="scanBundleActive" type="checkbox" checked={formModal.isActive} onChange={(e) => setFormModal((f) => ({ ...f, isActive: e.target.checked }))} />
            <Label htmlFor="scanBundleActive">Active</Label>
          </div>
        </div>
      </FormModal>
    </PageContainer>
  )
}

