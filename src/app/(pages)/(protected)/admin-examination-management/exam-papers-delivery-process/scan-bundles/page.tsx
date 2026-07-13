'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { Pencil, Plus, Printer } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { DataTable } from '@/common/components/table'
import { GlobalFilterBar, GlobalFilterBarRow, GlobalFilterField } from '@/common/components/forms'
import { Select, type SelectOption } from '@/common/components/select'
import { FormModal } from '@/common/components/feedback'
import { StatusBadge } from '@/common/components/data-display'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getSecuredValue, setSecuredValue } from '@/common/generic-functions'
import { rowIndexGetter } from '@/lib/utils'
import { toast } from 'sonner'
import { toastError, toastSuccess } from '@/lib/toast'
import { ExamBundlePrintStickersView } from '../exam-bundle-print/ExamBundlePrintStickersView'
import {
  createExamScanBundle,
  getExamCenterFilterGroups,
  getScanBundleOmrDetailsBySubject,
  listExamScanBundlesBySubjectFilters,
  listExamScanProfilesByGroup,
  pickExamScanBundleId,
  populateScanBundleOmrDetails,
  updateExamScanBundle,
  type AnyRow,
} from '@/services/exam-papers-delivery'

type Row = AnyRow

const FILTERS_STORAGE_KEY = 'examScanBundlesFiltersData'
const BUNDLE_DETAILS_STORAGE_KEY = 'examScanBundleDetails'

interface SavedFilterRow {
  academicYearId?: string | number
  examGroupId?: string | number
  courseId?: string | number
  courseYearId?: string | number
  regulationId?: string | number
  subjectId?: string | number
}

interface FormState {
  academicYearId: string
  examGroupId: string
  courseId: string
  courseYearId: string
  regulationId: string
  subjectId: string
}

const EMPTY_FORM: FormState = {
  academicYearId: '',
  examGroupId: '',
  courseId: '',
  courseYearId: '',
  regulationId: '',
  subjectId: '',
}

function loadSavedFilters(): SavedFilterRow | null {
  const saved = getSecuredValue<SavedFilterRow[]>(FILTERS_STORAGE_KEY)
  if (Array.isArray(saved) && saved[0]) return saved[0]
  return null
}

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
  return txt(row.scanProfileName ?? row.profileName ?? row.name ?? row.scan_profile_name)
}

function pickCourseId(row: Row): number {
  return num(row.fk_course_id ?? row.courseId ?? row.course_id)
}

function pickScanProfileDetailId(row: Row): number {
  return num(
    row.pk_exam_scan_profile_detail_id ??
      row.scannerProfileDetailId ??
      row.scanner_profile_detail_id ??
      row.pk_exam_scan_profile_id,
  )
}

export default function ScanBundlesPage() {
  const router = useRouter()
  const pendingSaved = useRef<SavedFilterRow | null>(loadSavedFilters())

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [egFilterRows, setEgFilterRows] = useState<Row[]>([])
  const [scanFilterRows, setScanFilterRows] = useState<Row[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [scanProfiles, setScanProfiles] = useState<Row[]>([])
  const [loadingFilters, setLoadingFilters] = useState(false)
  const [loadingList, setLoadingList] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)
  const [saving, setSaving] = useState(false)

  const [stickerRows, setStickerRows] = useState<Row[]>([])
  const [stickerView, setStickerView] = useState<'stickers' | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Row | null>(null)
  const [formModal, setFormModal] = useState({
    bundleNumber: '',
    totalAnswerBooks: '',
    examScanProfileId: '',
    startSeatNo: '',
    endSeatNo: '',
    isActive: true,
    reason: '',
  })

  const clearListState = useCallback(() => {
    setRows([])
    setHasFetched(false)
  }, [])

  const loadAcademicYearAndGroups = useCallback(async () => {
    setLoadingFilters(true)
    try {
      const groups = await getExamCenterFilterGroups({ flag: 'eg_filters' })
      const flat: Row[] = []
      for (const g of groups) {
        if (g.length > 0 && txt(g[0].flag) === 'eg_ay_filter') flat.push(...g)
      }
      setEgFilterRows(flat)
    } catch (e) {
      toastError(e, 'Failed to load filters')
      setEgFilterRows([])
    } finally {
      setLoadingFilters(false)
    }
  }, [])

  useEffect(() => {
    void loadAcademicYearAndGroups()
  }, [loadAcademicYearAndGroups])

  const academicYears = useMemo(() => dedupeBy(egFilterRows, (r) => num(r.fk_academic_year_id)), [egFilterRows])

  useEffect(() => {
    if (!academicYears.length || form.academicYearId) return
    const saved = pendingSaved.current
    const id =
      saved?.academicYearId != null
        ? String(saved.academicYearId)
        : String(num(academicYears[0].fk_academic_year_id))
    setForm((f) => ({ ...f, academicYearId: id }))
  }, [academicYears, form.academicYearId])

  const examGroups = useMemo(
    () =>
      dedupeBy(
        egFilterRows.filter((r) => num(r.fk_academic_year_id) === Number(form.academicYearId)),
        (r) => num(r.fk_univ_exam_group_id),
      ),
    [egFilterRows, form.academicYearId],
  )

  useEffect(() => {
    if (!examGroups.length || !form.academicYearId || form.examGroupId) return
    const saved = pendingSaved.current
    const id =
      saved?.examGroupId != null
        ? String(saved.examGroupId)
        : String(num(examGroups[0].fk_univ_exam_group_id))
    setForm((f) => ({ ...f, examGroupId: id }))
  }, [examGroups, form.academicYearId, form.examGroupId])

  useEffect(() => {
    let cancelled = false
    async function loadScanFilterRows() {
      if (!form.academicYearId || !form.examGroupId) {
        setScanFilterRows([])
        return
      }
      try {
        const groups = await getExamCenterFilterGroups({
          flag: 'eg_scan_filter',
          examGroupId: Number(form.examGroupId),
          academicYearId: Number(form.academicYearId),
        })
        if (cancelled) return
        const nextRows = groups[0] ?? []
        setScanFilterRows(nextRows)
        const saved = pendingSaved.current
        if (saved?.courseId != null) {
          setForm((f) => ({
            ...f,
            courseId: String(saved.courseId),
            courseYearId: saved.courseYearId != null ? String(saved.courseYearId) : '',
            regulationId: saved.regulationId != null ? String(saved.regulationId) : '',
            subjectId: saved.subjectId != null ? String(saved.subjectId) : '',
          }))
          if (saved.subjectId != null) pendingSaved.current = null
        } else {
          setForm((f) => ({ ...f, courseId: '', courseYearId: '', regulationId: '', subjectId: '' }))
        }
      } catch (e) {
        if (!cancelled) toastError(e, 'Failed to load course filters')
        setScanFilterRows([])
      }
    }
    void loadScanFilterRows()
    return () => {
      cancelled = true
    }
  }, [form.academicYearId, form.examGroupId])

  const courses = useMemo(() => dedupeBy(scanFilterRows, (r) => pickCourseId(r)), [scanFilterRows])
  const courseYears = useMemo(
    () =>
      dedupeBy(
        scanFilterRows.filter((r) => pickCourseId(r) === Number(form.courseId)),
        (r) => num(r.fk_course_year_id ?? r.courseYearId),
      ),
    [scanFilterRows, form.courseId],
  )
  const regulations = useMemo(
    () =>
      dedupeBy(
        scanFilterRows.filter(
          (r) =>
            pickCourseId(r) === Number(form.courseId) &&
            num(r.fk_course_year_id ?? r.courseYearId) === Number(form.courseYearId),
        ),
        (r) => num(r.fk_regulation_id ?? r.regulationId ?? r.regulationCatId),
      ),
    [scanFilterRows, form.courseId, form.courseYearId],
  )
  const subjects = useMemo(
    () =>
      dedupeBy(
        scanFilterRows.filter(
          (r) =>
            pickCourseId(r) === Number(form.courseId) &&
            num(r.fk_course_year_id ?? r.courseYearId) === Number(form.courseYearId) &&
            num(r.fk_regulation_id ?? r.regulationId ?? r.regulationCatId) === Number(form.regulationId),
        ),
        (r) => num(r.fk_subject_id ?? r.subjectId),
      ),
    [scanFilterRows, form.courseId, form.courseYearId, form.regulationId],
  )

  useEffect(() => {
    if (!courses.length || form.courseId) return
    setForm((f) => ({ ...f, courseId: String(pickCourseId(courses[0])) }))
  }, [courses, form.courseId])

  useEffect(() => {
    if (!courseYears.length || form.courseYearId) return
    setForm((f) => ({ ...f, courseYearId: String(num(courseYears[0].fk_course_year_id ?? courseYears[0].courseYearId)) }))
  }, [courseYears, form.courseYearId])

  useEffect(() => {
    if (!regulations.length || form.regulationId) return
    setForm((f) => ({
      ...f,
      regulationId: String(num(regulations[0].fk_regulation_id ?? regulations[0].regulationId ?? regulations[0].regulationCatId)),
    }))
  }, [regulations, form.regulationId])

  useEffect(() => {
    if (!subjects.length || form.subjectId) return
    setForm((f) => ({ ...f, subjectId: String(num(subjects[0].fk_subject_id ?? subjects[0].subjectId)) }))
  }, [subjects, form.subjectId])

  useEffect(() => {
    const saved = pendingSaved.current
    if (!saved?.subjectId || !form.subjectId || hasFetched) return
    pendingSaved.current = null
    void onGetList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.subjectId])

  const academicYearOptions: SelectOption[] = useMemo(
    () => academicYears.map((r) => ({ value: String(num(r.fk_academic_year_id)), label: txt(r.academic_year) })),
    [academicYears],
  )
  const examGroupOptions: SelectOption[] = useMemo(
    () => examGroups.map((r) => ({ value: String(num(r.fk_univ_exam_group_id)), label: txt(r.exam_group_code) })),
    [examGroups],
  )
  const courseOptions: SelectOption[] = useMemo(
    () => courses.map((r) => ({ value: String(pickCourseId(r)), label: txt(r.course_code ?? r.courseCode) })),
    [courses],
  )
  const courseYearOptions: SelectOption[] = useMemo(
    () =>
      courseYears.map((r) => ({
        value: String(num(r.fk_course_year_id ?? r.courseYearId)),
        label: txt(r.course_year_code ?? r.courseYearCode),
      })),
    [courseYears],
  )
  const regulationOptions: SelectOption[] = useMemo(
    () =>
      regulations.map((r) => ({
        value: String(num(r.fk_regulation_id ?? r.regulationId ?? r.regulationCatId)),
        label: txt(r.regulation_code ?? r.regulationCode ?? r.regulation_name),
      })),
    [regulations],
  )
  const subjectOptions: SelectOption[] = useMemo(
    () =>
      subjects.map((r) => ({
        value: String(num(r.fk_subject_id ?? r.subjectId)),
        label: `${txt(r.subject_name ?? r.subjectName)} (${txt(r.subject_code ?? r.subjectCode)})`,
      })),
    [subjects],
  )

  const scanProfileOptions: SelectOption[] = useMemo(
    () =>
      scanProfiles.map((p) => ({
        value: String(pickScanProfileDetailId(p)),
        label: txt(p.scan_profile_name ?? p.scanProfileName) || String(pickScanProfileDetailId(p)),
      })),
    [scanProfiles],
  )

  const tableSummaryText = useMemo(() => {
    const eg = examGroups.find((e) => num(e.fk_univ_exam_group_id) === Number(form.examGroupId))
    const cy = courseYears.find((r) => num(r.fk_course_year_id ?? r.courseYearId) === Number(form.courseYearId))
    const reg = regulations.find(
      (r) => num(r.fk_regulation_id ?? r.regulationId ?? r.regulationCatId) === Number(form.regulationId),
    )
    const sub = subjects.find((r) => num(r.fk_subject_id ?? r.subjectId) === Number(form.subjectId))
    const examGroupCode = txt(eg?.exam_group_code ?? eg?.examGroupCode) || '-'
    const courseYearCode = txt(cy?.course_year_code ?? cy?.courseYearCode) || '-'
    const regulationCode = txt(reg?.regulation_code ?? reg?.regulationCode) || '-'
    const subjectLabel =
      sub != null
        ? `${txt(sub.subject_name ?? sub.subjectName)} (${txt(sub.subject_code ?? sub.subjectCode)})`
        : '-'
    return `${examGroupCode} / ${courseYearCode} / ${regulationCode} / ${subjectLabel}`
  }, [examGroups, courseYears, regulations, subjects, form])

  const examGroupCode = useMemo(() => tableSummaryText.split(' / ')[0] ?? '-', [tableSummaryText])

  const saveFiltersToSession = useCallback(() => {
    setSecuredValue(FILTERS_STORAGE_KEY, [{ ...form }])
  }, [form])

  const filterArgs = useCallback(
    () => ({
      examGroupId: Number(form.examGroupId || 0),
      academicYearId: Number(form.academicYearId || 0),
      courseId: Number(form.courseId || 0),
      courseYearId: Number(form.courseYearId || 0),
      subjectId: Number(form.subjectId || 0),
      regulationId: Number(form.regulationId || 0),
    }),
    [form],
  )

  function onAcademicYearChange(v: string | null) {
    clearListState()
    pendingSaved.current = null
    setForm({
      academicYearId: v ?? '',
      examGroupId: '',
      courseId: '',
      courseYearId: '',
      regulationId: '',
      subjectId: '',
    })
  }

  function onExamGroupChange(v: string | null) {
    clearListState()
    pendingSaved.current = null
    setForm((f) => ({
      ...f,
      examGroupId: v ?? '',
      courseId: '',
      courseYearId: '',
      regulationId: '',
      subjectId: '',
    }))
  }

  function onCourseChange(v: string | null) {
    clearListState()
    pendingSaved.current = null
    setForm((f) => ({
      ...f,
      courseId: v ?? '',
      courseYearId: '',
      regulationId: '',
      subjectId: '',
    }))
  }

  function onCourseYearChange(v: string | null) {
    clearListState()
    pendingSaved.current = null
    setForm((f) => ({ ...f, courseYearId: v ?? '', regulationId: '', subjectId: '' }))
  }

  function onRegulationChange(v: string | null) {
    clearListState()
    pendingSaved.current = null
    setForm((f) => ({ ...f, regulationId: v ?? '', subjectId: '' }))
  }

  function onSubjectChange(v: string | null) {
    clearListState()
    pendingSaved.current = null
    setForm((f) => ({ ...f, subjectId: v ?? '' }))
  }

  async function loadScanProfilesForGroup() {
    if (!form.examGroupId) return
    const list = await listExamScanProfilesByGroup(Number(form.examGroupId)).catch(() => [])
    setScanProfiles(Array.isArray(list) ? list : [])
  }

  async function onGetList() {
    const args = filterArgs()
    if (!args.examGroupId || !args.courseYearId || !args.regulationId || !args.subjectId) {
      toast.info('Please Select Required Filters')
      return
    }
    setHasFetched(true)
    setLoadingList(true)
    saveFiltersToSession()
    try {
      const list = await listExamScanBundlesBySubjectFilters(args)
      setRows(Array.isArray(list) ? list : [])
      if (!list.length) toast.info('No Record(s) found.')
    } catch (e) {
      toastError(e, 'Failed to load scan bundles')
      setRows([])
    } finally {
      setLoadingList(false)
    }
  }

  async function onPopulate(scanBundleId: number) {
    setLoadingList(true)
    try {
      await populateScanBundleOmrDetails({ ...filterArgs(), scanBundleId })
      toastSuccess('Populate completed.')
    } catch (e) {
      toastError(e, 'Populate failed')
    } finally {
      setLoadingList(false)
    }
  }

  async function onPrintStickers(scanBundleId: number) {
    setLoadingList(true)
    try {
      const stickerData = await getScanBundleOmrDetailsBySubject({ ...filterArgs(), scanBundleId })
      if (!stickerData.length) {
        toast.info('No stickers found for this bundle.')
        return
      }
      saveFiltersToSession()
      setStickerRows(stickerData)
      setStickerView('stickers')
    } catch (e) {
      toastError(e, 'Failed to load stickers')
    } finally {
      setLoadingList(false)
    }
  }

  function openBundleDetails(row: Row) {
    saveFiltersToSession()
    setSecuredValue(BUNDLE_DETAILS_STORAGE_KEY, [
      {
        ...row,
        academicYearId: form.academicYearId,
        examGroupId: form.examGroupId,
        courseId: form.courseId,
        courseYearId: form.courseYearId,
        regulationId: form.regulationId,
        subjectId: form.subjectId,
        univExamScanbundleId: pickExamScanBundleId(row),
      },
    ])
    router.push('/admin-examination-management/exam-papers-delivery-process/scan-bundle-details')
  }

  async function openCreate() {
    await loadScanProfilesForGroup()
    setEditing(null)
    setFormModal({
      bundleNumber: '',
      totalAnswerBooks: '',
      examScanProfileId: '',
      startSeatNo: '',
      endSeatNo: '',
      isActive: true,
      reason: '',
    })
    setModalOpen(true)
  }

  async function onEdit(row: Row) {
    await loadScanProfilesForGroup()
    setEditing(row)
    setFormModal({
      bundleNumber: txt(row.bundleNumber),
      totalAnswerBooks: txt(row.totalAnswerBooks),
      examScanProfileId: String(
        num(row.scannerProfileDetailId ?? row.scanner_profile_detail_id ?? row.examScanProfileId),
      ),
      startSeatNo: txt(row.startEcSeatNo ?? row.startSeatNo ?? row.startSerialNo),
      endSeatNo: txt(row.endEcSeatNo ?? row.endSeatNo ?? row.endSerialNo),
      isActive: row.isActive !== false,
      reason: txt(row.reason),
    })
    setModalOpen(true)
  }

  async function onSave(e: { preventDefault: () => void }) {
    e.preventDefault()
    if (!formModal.bundleNumber.trim()) return toastError('Bundle Number is required.')
    if (!formModal.examScanProfileId) return toastError('Exam Scan Profile is required.')

    const selectedSubject = subjects.find((s) => num(s.fk_subject_id ?? s.subjectId) === Number(form.subjectId))
    const employee = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)
    const now = new Date().toISOString()
    const payload: Record<string, unknown> = {
      univExamGroupId: Number(form.examGroupId || 0),
      examGroupId: Number(form.examGroupId || 0),
      courseId: Number(form.courseId || 0),
      academicYearId: Number(form.academicYearId || 0),
      courseYearId: Number(form.courseYearId || 0),
      regulationId: Number(form.regulationId || 0),
      subjectId: Number(form.subjectId || 0),
      examId: num(selectedSubject?.fk_exam_id ?? selectedSubject?.examId),
      examTimetableDetId: num(selectedSubject?.fk_exam_timetable_det_id ?? selectedSubject?.examTimetableDetId),
      bundleNumber: formModal.bundleNumber.trim(),
      totalAnswerBooks: Number(formModal.totalAnswerBooks || 0),
      scannerProfileDetailId: Number(formModal.examScanProfileId),
      startEcSeatNo: formModal.startSeatNo.trim(),
      endEcSeatNo: formModal.endSeatNo.trim(),
      isActive: formModal.isActive,
      reason: formModal.isActive ? '' : formModal.reason.trim(),
      createdDt: now,
      updatedDt: now,
      createdUser: employee || null,
      updatedUser: employee || null,
    }

    setSaving(true)
    try {
      const id = pickExamScanBundleId(editing ?? {})
      if (id > 0) {
        await updateExamScanBundle(id, { ...payload, univExamScanbundleId: id })
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

  useEffect(() => {
    if (!modalOpen || formModal.examScanProfileId || !scanProfileOptions.length) return
    setFormModal((f) => ({ ...f, examScanProfileId: scanProfileOptions[0]?.value ?? '' }))
  }, [modalOpen, scanProfileOptions, formModal.examScanProfileId])

  const columnDefs = useMemo<ColDef<Row>[]>(
    () => [
      { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 },
      { headerName: 'Bundle Number', minWidth: 130, valueGetter: (p) => txt(p.data?.bundleNumber) || '-' },
      { headerName: 'Scan Profile Name', minWidth: 160, valueGetter: (p) => pickName(p.data ?? {}) || '-' },
      { headerName: 'Total Answer Books', minWidth: 140, valueGetter: (p) => txt(p.data?.totalAnswerBooks) || '-' },
      {
        headerName: 'Start Seat No',
        minWidth: 120,
        valueGetter: (p) => txt(p.data?.startEcSeatNo ?? p.data?.startSeatNo ?? p.data?.startSerialNo) || '-',
      },
      {
        headerName: 'End Seat No',
        minWidth: 120,
        valueGetter: (p) => txt(p.data?.endEcSeatNo ?? p.data?.endSeatNo ?? p.data?.endSerialNo) || '-',
      },
      { field: 'isActive', headerName: 'Status', minWidth: 90, cellRenderer: statusRenderer },
      {
        headerName: 'Actions',
        minWidth: 280,
        flex: 0,
        cellRenderer: (p: ICellRendererParams<Row>) => {
          const row = p.data
          if (!row) return null
          const id = pickExamScanBundleId(row)
          return (
            <div className="flex items-center gap-2 text-[12px]">
              <button type="button" className="text-[hsl(var(--primary))] hover:underline" onClick={() => openBundleDetails(row)}>
                Bundle Details
              </button>
              <span className="text-muted-foreground">|</span>
              <button type="button" className="text-[hsl(var(--primary))] hover:underline" onClick={() => void onPopulate(id)}>
                Populate
              </button>
              <span className="text-muted-foreground">|</span>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 p-0" title="Print Stickers" onClick={() => void onPrintStickers(id)}>
                <Printer className="h-3.5 w-3.5" />
              </Button>
              <span className="text-muted-foreground">|</span>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 p-0" title="Edit" onClick={() => void onEdit(row)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>
          )
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form, tableSummaryText],
  )

  if (stickerView === 'stickers') {
    return (
      <ExamBundlePrintStickersView
        stickerRows={stickerRows}
        examGroupCode={examGroupCode}
        variant="stickers"
        onBack={() => setStickerView(null)}
      />
    )
  }

  return (
    <PageContainer className="space-y-4">
      <h2 className="px-1 text-lg font-semibold tracking-tight text-foreground">Exam Scan Bundles</h2>

      <GlobalFilterBar title="Scan Bundles" defaultOpen={false}>
        <GlobalFilterBarRow>
          <GlobalFilterField label="Academic Year *">
            <Select
              options={academicYearOptions}
              value={form.academicYearId}
              onChange={onAcademicYearChange}
              placeholder="Academic Year"
              disabled={loadingFilters}
            />
          </GlobalFilterField>
          <GlobalFilterField label="Exam Group *">
            <Select
              options={examGroupOptions}
              value={form.examGroupId}
              onChange={onExamGroupChange}
              placeholder="Exam Group"
            />
          </GlobalFilterField>
          <GlobalFilterField label="Course *">
            <Select
              options={courseOptions}
              value={form.courseId}
              onChange={onCourseChange}
              placeholder="Course"
              searchable
            />
          </GlobalFilterField>
          <GlobalFilterField label="Course Years *">
            <Select
              options={courseYearOptions}
              value={form.courseYearId}
              onChange={onCourseYearChange}
              placeholder="Course Years"
            />
          </GlobalFilterField>
          <GlobalFilterField label="Regulation *">
            <Select
              options={regulationOptions}
              value={form.regulationId}
              onChange={onRegulationChange}
              placeholder="Regulation"
            />
          </GlobalFilterField>
        </GlobalFilterBarRow>
        <GlobalFilterBarRow>
          <GlobalFilterField label="Subjects">
            <Select
              options={subjectOptions}
              value={form.subjectId}
              onChange={onSubjectChange}
              placeholder="Subjects"
              searchable
            />
          </GlobalFilterField>
          <GlobalFilterField label=" " className="global-filter-field--action global-filter-field--shrink">
            <Button
              type="button"
              size="sm"
              onClick={() => void onGetList()}
              disabled={loadingList}
              className="h-8 shrink-0 px-3 text-[12px]"
            >
              Get List
            </Button>
          </GlobalFilterField>
        </GlobalFilterBarRow>
      </GlobalFilterBar>

      {hasFetched && (
        <div className="app-card overflow-hidden">
          <div className="px-3 pb-3 pt-2">
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <DataTable
                rowData={rows}
                columnDefs={columnDefs}
                loading={loadingList}
                pagination
                title={
                  <p
                    className="truncate text-[12px] font-medium text-[hsl(var(--primary))]"
                    title={`Scan Bundles - ${tableSummaryText}`}
                  >
                    Scan Bundles - {tableSummaryText}
                  </p>
                }
                toolbar={{
                  search: true,
                  searchPlaceholder: 'Search…',
                  pdfDocumentTitle: 'Scan Bundles',
                }}
                toolbarTrailing={
                  <div className="flex flex-nowrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="h-[30px] shrink-0 gap-1.5 px-3 text-[12px]"
                      onClick={() => void onPopulate(0)}
                      disabled={loadingList}
                    >
                      Bulk Populate
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-[30px] shrink-0 gap-1.5 px-3 text-[12px]"
                      onClick={() => void onPrintStickers(0)}
                      disabled={loadingList}
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Bulk Print Stickers
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-[30px] shrink-0 gap-1.5 px-3 text-[12px]"
                      onClick={() => void openCreate()}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Scan Bundles
                    </Button>
                  </div>
                }
              />
            </div>
          </div>
        </div>
      )}

      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`${editing ? 'Edit' : 'Add'} Scan Bundles - /${tableSummaryText}`}
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
          {!formModal.isActive && (
            <div className="space-y-1 md:col-span-2">
              <Label>Reason</Label>
              <Input value={formModal.reason} onChange={(e) => setFormModal((f) => ({ ...f, reason: e.target.value }))} />
            </div>
          )}
        </div>
      </FormModal>
    </PageContainer>
  )
}
