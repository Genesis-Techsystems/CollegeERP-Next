'use client'

/**
 * Scan Bundles — Angular `exam-papers-delivery-process/scan-bundles`.
 * Cascade: Academic Year → Exam Group (eg_filters) → Course / Year / Regulation /
 * Subject (eg_scan_filter) → Get List via listDetailsByFiveIds(UnivExamScanbundle).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { Pencil, Plus, Printer } from 'lucide-react'
import { FilteredListPage } from '@/components/layout'
import { Select, type SelectOption } from '@/common/components/select'
import { FormModal } from '@/common/components/feedback'
import { StatusBadge } from '@/common/components/data-display'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getSecuredValue, setSecuredValue } from '@/common/generic-functions'
import { rowIndexGetter } from '@/lib/utils'
import { toastError, toastInfo, toastSuccess } from '@/lib/toast'
import {
  ExamBundlePrintStickersView,
  type StickerVariant,
} from '../exam-bundle-print/ExamBundlePrintStickersView'
import {
  createExamScanBundle,
  getExamCenterByCodeRows,
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

/** Mirrors Angular `ParametersService.examScanBundlesFiltersData` (print stickers Back). */
const FILTERS_STORAGE_KEY = 'examScanBundlesFiltersData'
/** Mirrors Angular `ParametersService.examScanBundleDetails` (Bundle Details nav). */
const BUNDLE_DETAILS_STORAGE_KEY = 'examScanBundleDetails'
const SCAN_BUNDLE_DETAILS_ROUTE =
  '/admin-examination-management/exam-papers-delivery-process/scan-bundle-details'

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

function loadSavedFilters(): SavedFilterRow | null {
  const saved = getSecuredValue<SavedFilterRow[]>(FILTERS_STORAGE_KEY)
  if (Array.isArray(saved) && saved[0]) return saved[0]
  return null
}

function statusRenderer(p: ICellRendererParams<Row>) {
  return <StatusBadge status={Boolean(p.data?.isActive)} />
}

function pickProfileName(row: Row): string {
  return txt(row.scanProfileName ?? row.profileName ?? row.scan_profile_name ?? row.name)
}

function pickAcademicYearKey(row: Row): string {
  return String(row.fk_academic_year_id ?? row.academicYearId ?? '').trim()
}

/** Angular mat-option `[value]="obj.fk_univ_exam_group_id"`. */
function pickExamGroupKey(row: Row): string {
  return String(
    row.fk_univ_exam_group_id ??
      row.univExamGroupId ??
      row.fk_exam_group_id ??
      row.examGroupId ??
      '',
  ).trim()
}

function pickCourseId(row: Row): number {
  return num(row.fk_course_id ?? row.courseId)
}

function pickCourseYearId(row: Row): number {
  return num(row.fk_course_year_id ?? row.courseYearId)
}

function pickRegulationId(row: Row): number {
  return num(row.fk_regulation_id ?? row.regulationId ?? row.regulationCatId)
}

function pickSubjectId(row: Row): number {
  return num(row.fk_subject_id ?? row.subjectId)
}

function pickScanProfileId(row: Row): number {
  return num(
    row.pk_exam_scan_profile_id ??
      row.scannerProfileDetailId ??
      row.examScanProfileId ??
      row.univEcPorifleId,
  )
}

function makeActionsRenderer(handlers: {
  onBundleDetails: (row: Row) => void
  onPopulate: (row: Row) => void
  onPrint: (row: Row) => void
  onEdit: (row: Row) => void
}) {
  return (p: ICellRendererParams<Row>) => {
    const row = p.data
    if (!row) return null
    return (
      <div className="flex items-center gap-1 text-[12px]">
        <button
          type="button"
          className="text-blue-700 hover:underline px-0.5"
          onClick={() => handlers.onBundleDetails(row)}
        >
          Bundle Details
        </button>
        <span className="text-muted-foreground">|</span>
        <button
          type="button"
          className="text-blue-700 hover:underline px-0.5"
          onClick={() => handlers.onPopulate(row)}
        >
          Populate
        </button>
        <span className="text-muted-foreground">|</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          title="Print Stickers"
          onClick={() => handlers.onPrint(row)}
        >
          <Printer className="h-3.5 w-3.5" />
        </Button>
        <span className="text-muted-foreground">|</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-blue-700"
          title="Edit"
          onClick={() => handlers.onEdit(row)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </div>
    )
  }
}

export default function ScanBundlesPage() {
  const router = useRouter()
  const pendingSaved = useRef<SavedFilterRow | null>(loadSavedFilters())
  const autoListOnce = useRef(Boolean(pendingSaved.current))

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showTable, setShowTable] = useState(false)

  const [egFilterRows, setEgFilterRows] = useState<Row[]>([])
  const [scanFilterRows, setScanFilterRows] = useState<Row[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [scanProfiles, setScanProfiles] = useState<Row[]>([])

  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Row | null>(null)
  const [formModal, setFormModal] = useState({
    bundleNumber: '',
    totalAnswerBooks: '',
    scannerProfileDetailId: '',
    startEcSeatNo: '',
    endEcSeatNo: '',
    isActive: true,
    reason: '',
  })

  const [stickerRows, setStickerRows] = useState<Row[]>([])
  const [stickerView, setStickerView] = useState<StickerVariant | null>(null)

  const clearList = useCallback(() => {
    setRows([])
    setShowTable(false)
  }, [])

  // ── eg_filters → academic years + exam groups (Angular getExamGroupDetails) ──
  useEffect(() => {
    async function init() {
      setLoading(true)
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
        setLoading(false)
      }
    }
    void init()
  }, [])

  const academicYears = useMemo(
    () => dedupeBy(egFilterRows, (r) => num(r.fk_academic_year_id)),
    [egFilterRows],
  )

  const examGroups = useMemo(
    () =>
      dedupeBy(
        egFilterRows.filter((r) => pickAcademicYearKey(r) === form.academicYearId),
        (r) => num(r.fk_univ_exam_group_id ?? r.univExamGroupId),
      ),
    [egFilterRows, form.academicYearId],
  )

  const courses = useMemo(() => dedupeBy(scanFilterRows, (r) => pickCourseId(r)), [scanFilterRows])

  const courseYears = useMemo(
    () =>
      dedupeBy(
        scanFilterRows.filter((r) => pickCourseId(r) === Number(form.courseId)),
        (r) => pickCourseYearId(r),
      ),
    [scanFilterRows, form.courseId],
  )

  const regulations = useMemo(
    () =>
      dedupeBy(
        scanFilterRows.filter(
          (r) =>
            pickCourseId(r) === Number(form.courseId) &&
            pickCourseYearId(r) === Number(form.courseYearId),
        ),
        (r) => pickRegulationId(r),
      ),
    [scanFilterRows, form.courseId, form.courseYearId],
  )

  const subjects = useMemo(
    () =>
      dedupeBy(
        scanFilterRows.filter(
          (r) =>
            pickCourseId(r) === Number(form.courseId) &&
            pickCourseYearId(r) === Number(form.courseYearId) &&
            pickRegulationId(r) === Number(form.regulationId),
        ),
        (r) => pickSubjectId(r),
      ),
    [scanFilterRows, form.courseId, form.courseYearId, form.regulationId],
  )

  const selectedSubjectRow = useMemo(
    () => subjects.find((s) => pickSubjectId(s) === Number(form.subjectId)) ?? null,
    [subjects, form.subjectId],
  )

  const headerCodes = useMemo(() => {
    const eg = examGroups.find((e) => pickExamGroupKey(e) === form.examGroupId)
    const cy = courseYears.find((r) => pickCourseYearId(r) === Number(form.courseYearId))
    const reg = regulations.find((r) => pickRegulationId(r) === Number(form.regulationId))
    const sub = selectedSubjectRow
    return {
      examGroupCode: txt(eg?.exam_group_code ?? eg?.examGroupCode),
      courseYearCode: txt(cy?.course_year_code ?? cy?.courseYearCode),
      regulationCode: txt(reg?.regulation_code ?? reg?.regulationCode),
      subjectCode: txt(sub?.subject_code ?? sub?.subjectCode),
    }
  }, [examGroups, courseYears, regulations, selectedSubjectRow, form])

  const headerText = useMemo(() => {
    const { examGroupCode, courseYearCode, regulationCode, subjectCode } = headerCodes
    return `${examGroupCode} / ${courseYearCode} / ${regulationCode} / ${subjectCode}`
  }, [headerCodes])

  const scanProfileOptions: SelectOption[] = useMemo(
    () =>
      dedupeBy(scanProfiles, (p) => pickScanProfileId(p)).map((p) => ({
        value: String(pickScanProfileId(p)),
        label: pickProfileName(p) || String(pickScanProfileId(p)),
      })),
    [scanProfiles],
  )

  // Default / restore academic year
  useEffect(() => {
    if (!academicYears.length || form.academicYearId) return
    const saved = pendingSaved.current
    const id =
      saved?.academicYearId != null
        ? String(saved.academicYearId)
        : pickAcademicYearKey(academicYears[0])
    setForm((f) => ({ ...f, academicYearId: id }))
  }, [academicYears, form.academicYearId])

  // Default / restore exam group when academic year set
  useEffect(() => {
    if (!examGroups.length || !form.academicYearId) return
    const saved = pendingSaved.current
    const stillValid = examGroups.some((e) => pickExamGroupKey(e) === form.examGroupId)
    if (form.examGroupId && stillValid) return
    const id =
      saved?.examGroupId != null &&
      examGroups.some((e) => pickExamGroupKey(e) === String(saved.examGroupId))
        ? String(saved.examGroupId)
        : pickExamGroupKey(examGroups[0])
    setForm((f) => ({
      ...f,
      examGroupId: id,
      courseId: '',
      courseYearId: '',
      regulationId: '',
      subjectId: '',
    }))
    clearList()
  }, [examGroups, form.academicYearId, form.examGroupId, clearList])

  // eg_scan_filter when academic year + exam group selected (Angular selectedExamGroup)
  useEffect(() => {
    let cancelled = false
    async function loadScanFilterRows() {
      if (!form.academicYearId || !form.examGroupId) {
        setScanFilterRows([])
        return
      }
      const list = await getExamCenterByCodeRows({
        flag: 'eg_scan_filter',
        flagType: 'REGSUP',
        univExamcenterId: 0,
        examGroupId: Number(form.examGroupId),
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
      if (cancelled) return
      setScanFilterRows(Array.isArray(list) ? list : [])
      setForm((f) => ({
        ...f,
        courseId: '',
        courseYearId: '',
        regulationId: '',
        subjectId: '',
      }))
      clearList()
    }
    void loadScanFilterRows()
    return () => {
      cancelled = true
    }
  }, [form.academicYearId, form.examGroupId, clearList])

  // Cascade defaults / restore for course → year → regulation → subject
  useEffect(() => {
    if (!courses.length) return
    const saved = pendingSaved.current
    setForm((f) => {
      if (f.courseId && courses.some((c) => String(pickCourseId(c)) === f.courseId)) return f
      const id =
        saved?.courseId != null &&
        courses.some((c) => String(pickCourseId(c)) === String(saved.courseId))
          ? String(saved.courseId)
          : String(pickCourseId(courses[0]))
      return { ...f, courseId: id, courseYearId: '', regulationId: '', subjectId: '' }
    })
  }, [courses])

  useEffect(() => {
    if (!courseYears.length) return
    const saved = pendingSaved.current
    setForm((f) => {
      if (f.courseYearId && courseYears.some((r) => String(pickCourseYearId(r)) === f.courseYearId)) {
        return f
      }
      const id =
        saved?.courseYearId != null &&
        courseYears.some((r) => String(pickCourseYearId(r)) === String(saved.courseYearId))
          ? String(saved.courseYearId)
          : String(pickCourseYearId(courseYears[0]))
      return { ...f, courseYearId: id, regulationId: '', subjectId: '' }
    })
  }, [courseYears])

  useEffect(() => {
    if (!regulations.length) return
    const saved = pendingSaved.current
    setForm((f) => {
      if (f.regulationId && regulations.some((r) => String(pickRegulationId(r)) === f.regulationId)) {
        return f
      }
      const id =
        saved?.regulationId != null &&
        regulations.some((r) => String(pickRegulationId(r)) === String(saved.regulationId))
          ? String(saved.regulationId)
          : String(pickRegulationId(regulations[0]))
      return { ...f, regulationId: id, subjectId: '' }
    })
  }, [regulations])

  useEffect(() => {
    if (!subjects.length) return
    const saved = pendingSaved.current
    setForm((f) => {
      if (f.subjectId && subjects.some((r) => String(pickSubjectId(r)) === f.subjectId)) return f
      const id =
        saved?.subjectId != null &&
        subjects.some((r) => String(pickSubjectId(r)) === String(saved.subjectId))
          ? String(saved.subjectId)
          : String(pickSubjectId(subjects[0]))
      return { ...f, subjectId: id }
    })
  }, [subjects])

  // Angular restore path: after subject restored from filtersSetArray → getScanBundles()
  useEffect(() => {
    if (!autoListOnce.current) return
    if (!form.examGroupId || !form.courseYearId || !form.regulationId || !form.subjectId) return
    autoListOnce.current = false
    pendingSaved.current = null
    void onGetList()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot restore list
  }, [form.examGroupId, form.courseYearId, form.regulationId, form.subjectId])

  // Scan profiles for modal — Angular getScanProfiles (exam_scan_profile_details)
  useEffect(() => {
    async function loadProfiles() {
      if (!form.examGroupId) {
        setScanProfiles([])
        return
      }
      const list = await listExamScanProfilesByGroup(Number(form.examGroupId)).catch(() => [])
      setScanProfiles(Array.isArray(list) ? list : [])
    }
    void loadProfiles()
  }, [form.examGroupId])

  async function onGetList() {
    const examGroupId = Number(form.examGroupId)
    const courseYearId = Number(form.courseYearId)
    const regulationId = Number(form.regulationId)
    const subjectId = Number(form.subjectId)
    if (!examGroupId || !courseYearId || !regulationId || !subjectId) {
      toastError('Please select Academic Year, Exam Group, Course, Course Year, Regulation and Subject.')
      return
    }
    setLoading(true)
    try {
      // Angular listDetailsByFiveIds(UnivExamScanbundleUrl, examGroupId, courseYearId, regulationId, subjectId, true, …)
      const list = await listExamScanBundlesBySubjectFilters({
        examGroupId,
        courseYearId,
        regulationId,
        subjectId,
      })
      setRows(Array.isArray(list) ? list : [])
      setShowTable(true)
      setSecuredValue(FILTERS_STORAGE_KEY, [form])
      if (!list.length) toastInfo('No Records Found.')
    } catch (e) {
      toastError(e, 'Failed to load scan bundles')
      setRows([])
      setShowTable(false)
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    if (!form.subjectId) {
      toastError('Please select a subject first.')
      return
    }
    setEditing(null)
    setFormModal({
      bundleNumber: '',
      totalAnswerBooks: '',
      scannerProfileDetailId: scanProfileOptions[0]?.value ?? '',
      startEcSeatNo: '',
      endEcSeatNo: '',
      isActive: true,
      reason: '',
    })
    setModalOpen(true)
  }

  function onEdit(row: Row) {
    setEditing(row)
    setFormModal({
      bundleNumber: txt(row.bundleNumber),
      totalAnswerBooks: txt(row.totalAnswerBooks),
      scannerProfileDetailId: String(
        num(row.scannerProfileDetailId ?? row.examScanProfileId) || pickScanProfileId(row) || '',
      ),
      startEcSeatNo: txt(row.startEcSeatNo ?? row.startSeatNo ?? row.startSerialNo),
      endEcSeatNo: txt(row.endEcSeatNo ?? row.endSeatNo ?? row.endSerialNo),
      isActive: row.isActive === true,
      reason: txt(row.reason),
    })
    setModalOpen(true)
  }

  async function onSave(e: { preventDefault: () => void }) {
    e.preventDefault()
    if (!formModal.bundleNumber.trim()) return toastError('Bundle Number is required.')

    const employee = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)
    const now = new Date().toISOString()
    const id = pickExamScanBundleId(editing ?? {})
    const payload: Record<string, unknown> = {
      univExamGroupId: Number(form.examGroupId || 0),
      courseYearId: Number(form.courseYearId || 0),
      regulationId: Number(form.regulationId || 0),
      subjectId: Number(form.subjectId || 0),
      examId: num(selectedSubjectRow?.fk_exam_id ?? selectedSubjectRow?.examId),
      examTimetableDetId: num(
        selectedSubjectRow?.fk_exam_timetable_det_id ?? selectedSubjectRow?.examTimetableDetId,
      ),
      bundleNumber: formModal.bundleNumber.trim(),
      totalAnswerBooks: Number(formModal.totalAnswerBooks || 0),
      scannerProfileDetailId: formModal.scannerProfileDetailId
        ? Number(formModal.scannerProfileDetailId)
        : null,
      startEcSeatNo: formModal.startEcSeatNo.trim(),
      endEcSeatNo: formModal.endEcSeatNo.trim(),
      isActive: formModal.isActive,
      reason: formModal.isActive ? '' : formModal.reason || '',
      updatedDt: now,
      updatedUser: employee || null,
    }
    if (id <= 0) {
      payload.createdDt = now
      payload.createdUser = employee || null
    }

    setSaving(true)
    try {
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

  function populateArgs(scanBundleId: number) {
    return {
      examGroupId: Number(form.examGroupId),
      academicYearId: Number(form.academicYearId),
      courseId: Number(form.courseId),
      courseYearId: Number(form.courseYearId),
      subjectId: Number(form.subjectId),
      regulationId: Number(form.regulationId),
      scanBundleId,
    }
  }

  async function onPopulate(scanBundleId: number) {
    if (!form.examGroupId || !form.subjectId) {
      toastError('Please select filters and get the list first.')
      return
    }
    setLoading(true)
    try {
      await populateScanBundleOmrDetails(populateArgs(scanBundleId))
      toastSuccess('Populate completed.')
    } catch (e) {
      toastError(e, 'Populate failed')
    } finally {
      setLoading(false)
    }
  }

  async function onPrintStickers(scanBundleId: number) {
    if (!form.examGroupId || !form.subjectId) {
      toastError('Please select filters and get the list first.')
      return
    }
    setLoading(true)
    try {
      const list = await getScanBundleOmrDetailsBySubject(populateArgs(scanBundleId))
      if (!list.length) {
        toastInfo('No stickers found for this bundle.')
        return
      }
      setStickerRows(list)
      setStickerView('stickers')
      setSecuredValue(FILTERS_STORAGE_KEY, [form])
    } catch (e) {
      toastError(e, 'Failed to load stickers')
    } finally {
      setLoading(false)
    }
  }

  function onBundleDetails(row: Row) {
    const details = {
      ...row,
      academicYearId: Number(form.academicYearId),
      examGroupId: Number(form.examGroupId),
      courseId: Number(form.courseId),
      courseYearId: Number(form.courseYearId),
      regulationId: Number(form.regulationId),
      subjectId: Number(form.subjectId),
      univExamScanbundleId: pickExamScanBundleId(row),
    }
    setSecuredValue(BUNDLE_DETAILS_STORAGE_KEY, [details])
    setSecuredValue(FILTERS_STORAGE_KEY, [form])
    router.push(SCAN_BUNDLE_DETAILS_ROUTE)
  }

  const columnDefs = useMemo<ColDef<Row>[]>(
    () => [
      { headerName: 'SL No.', valueGetter: rowIndexGetter, width: 78, flex: 0 },
      { headerName: 'Bundle Number', minWidth: 130, valueGetter: (p) => txt(p.data?.bundleNumber) },
      {
        headerName: 'Scan Profile Name',
        minWidth: 160,
        valueGetter: (p) => pickProfileName(p.data ?? {}),
      },
      {
        headerName: 'Total Answer Books',
        minWidth: 140,
        valueGetter: (p) => txt(p.data?.totalAnswerBooks),
      },
      {
        headerName: 'Start Seat No',
        minWidth: 120,
        valueGetter: (p) => txt(p.data?.startEcSeatNo ?? p.data?.startSeatNo ?? p.data?.startSerialNo),
      },
      {
        headerName: 'End Seat No',
        minWidth: 120,
        valueGetter: (p) => txt(p.data?.endEcSeatNo ?? p.data?.endSeatNo ?? p.data?.endSerialNo),
      },
      { field: 'isActive', headerName: 'Status', minWidth: 90, cellRenderer: statusRenderer },
      {
        headerName: 'Actions',
        minWidth: 280,
        flex: 0,
        width: 280,
        cellRenderer: makeActionsRenderer({
          onBundleDetails,
          onPopulate: (row) => void onPopulate(pickExamScanBundleId(row)),
          onPrint: (row) => void onPrintStickers(pickExamScanBundleId(row)),
          onEdit,
        }),
      },
    ],
    // handlers close over latest form — recreate when form keys used by actions change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form, scanProfileOptions],
  )

  if (stickerView) {
    return (
      <ExamBundlePrintStickersView
        stickerRows={stickerRows}
        examGroupCode={headerCodes.examGroupCode}
        variant={stickerView}
        onBack={() => {
          setStickerView(null)
          setStickerRows([])
        }}
      />
    )
  }

  return (
    <FilteredListPage
      title="Scan Bundles"
      filters={(
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="space-y-1 md:col-span-3">
            <Label>Academic Year *</Label>
            <Select
              options={academicYears.map((r) => ({
                value: pickAcademicYearKey(r),
                label: txt(r.academic_year ?? r.academicYear ?? pickAcademicYearKey(r)),
              }))}
              value={form.academicYearId}
              onChange={(v) => {
                pendingSaved.current = null
                setForm({
                  ...EMPTY_FORM,
                  academicYearId: v ?? '',
                })
                clearList()
              }}
            />
          </div>
          <div className="space-y-1 md:col-span-4">
            <Label>Exam Group *</Label>
            <Select
              options={examGroups.map((r) => ({
                value: pickExamGroupKey(r),
                label: txt(
                  r.exam_group_code ??
                    r.examGroupCode ??
                    r.exam_name ??
                    r.examName ??
                    pickExamGroupKey(r),
                ),
              }))}
              value={form.examGroupId}
              onChange={(v) => {
                pendingSaved.current = null
                setForm((f) => ({
                  ...f,
                  examGroupId: v ?? '',
                  courseId: '',
                  courseYearId: '',
                  regulationId: '',
                  subjectId: '',
                }))
                clearList()
              }}
            />
          </div>
          <div className="space-y-1 md:col-span-3">
            <Label>Course *</Label>
            <Select
              options={courses.map((r) => ({
                value: String(pickCourseId(r)),
                label: txt(r.course_code ?? r.courseCode),
              }))}
              value={form.courseId}
              onChange={(v) => {
                pendingSaved.current = null
                setForm((f) => ({
                  ...f,
                  courseId: v ?? '',
                  courseYearId: '',
                  regulationId: '',
                  subjectId: '',
                }))
                clearList()
              }}
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Course Years *</Label>
            <Select
              options={courseYears.map((r) => ({
                value: String(pickCourseYearId(r)),
                label: txt(r.course_year_code ?? r.courseYearCode),
              }))}
              value={form.courseYearId}
              onChange={(v) => {
                pendingSaved.current = null
                setForm((f) => ({
                  ...f,
                  courseYearId: v ?? '',
                  regulationId: '',
                  subjectId: '',
                }))
                clearList()
              }}
            />
          </div>
          <div className="space-y-1 md:col-span-3">
            <Label>Regulation *</Label>
            <Select
              options={regulations.map((r) => ({
                value: String(pickRegulationId(r)),
                label: txt(r.regulation_code ?? r.regulationCode ?? r.regulation_name),
              }))}
              value={form.regulationId}
              onChange={(v) => {
                pendingSaved.current = null
                setForm((f) => ({ ...f, regulationId: v ?? '', subjectId: '' }))
                clearList()
              }}
            />
          </div>
          <div className="space-y-1 md:col-span-5">
            <Label>Subjects</Label>
            <Select
              options={subjects.map((r) => ({
                value: String(pickSubjectId(r)),
                label: `${txt(r.subject_name ?? r.subjectName)} (${txt(r.subject_code ?? r.subjectCode)})`,
              }))}
              value={form.subjectId}
              onChange={(v) => {
                pendingSaved.current = null
                setForm((f) => ({ ...f, subjectId: v ?? '' }))
                clearList()
              }}
            />
          </div>
          <div className="md:col-span-2">
            <Button type="button" onClick={() => void onGetList()} disabled={loading}>
              Get List
            </Button>
          </div>
        </div>
      )}
      rowData={showTable ? rows : []}
      columnDefs={columnDefs}
      loading={loading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: 'Search…',
        pdfDocumentTitle: 'Scan Bundles',
      }}
      toolbarLeading={
        showTable ? (
          <span className="text-[12px] font-medium text-[hsl(var(--primary))] truncate max-w-[min(100%,40rem)]">
            {headerText}
          </span>
        ) : null
      }
      toolbarTrailing={
        <>
          <Button
            type="button"
            className="h-[30px] px-3 text-[12px]"
            disabled={!showTable || loading}
            onClick={() => void onPopulate(0)}
          >
            Bulk Populate
          </Button>
          <Button
            type="button"
            className="h-[30px] px-3 text-[12px]"
            disabled={!showTable || loading}
            onClick={() => void onPrintStickers(0)}
          >
            Bulk Print Stickers
          </Button>
          <Button
            type="button"
            className="h-[30px] px-3 text-[12px]"
            disabled={!showTable}
            onClick={openCreate}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Scan Bundles
          </Button>
        </>
      }
    >
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
            <Input
              value={formModal.bundleNumber}
              onChange={(e) => setFormModal((f) => ({ ...f, bundleNumber: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Total Answer Books</Label>
            <Input
              value={formModal.totalAnswerBooks}
              onChange={(e) => setFormModal((f) => ({ ...f, totalAnswerBooks: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Exam Scan Profile</Label>
            <Select
              options={scanProfileOptions}
              value={formModal.scannerProfileDetailId}
              onChange={(v) => setFormModal((f) => ({ ...f, scannerProfileDetailId: v ?? '' }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Start Seat No</Label>
            <Input
              value={formModal.startEcSeatNo}
              onChange={(e) => setFormModal((f) => ({ ...f, startEcSeatNo: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>End Seat No</Label>
            <Input
              value={formModal.endEcSeatNo}
              onChange={(e) => setFormModal((f) => ({ ...f, endEcSeatNo: e.target.value }))}
            />
          </div>
          <div className="flex items-center gap-2 text-sm font-medium mt-6">
            <input
              id="scanBundleActive"
              type="checkbox"
              checked={formModal.isActive}
              onChange={(e) => setFormModal((f) => ({ ...f, isActive: e.target.checked }))}
            />
            <Label htmlFor="scanBundleActive">Active</Label>
          </div>
        </div>
      </FormModal>
    </FilteredListPage>
  )
}
