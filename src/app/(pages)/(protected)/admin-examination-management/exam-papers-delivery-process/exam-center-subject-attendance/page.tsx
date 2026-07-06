'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { ChevronDown, ClipboardCheck, Filter } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout'
import { DataTable } from '@/common/components/table'
import { Select, type SelectOption } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { rowIndexGetter } from '@/lib/utils'
import { toast } from 'sonner'
import { toastError, toastSuccess } from '@/lib/toast'

const toastInfo = (msg: string) => toast.info(msg)
import {
  getExamCenterBundleByCode,
  getExamCenterFilterGroups,
  saveExamCenterAttendance,
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

function dedupeBy<T>(rows: T[], keyFn: (r: T) => number | string): T[] {
  const seen = new Set<number | string>()
  const out: T[] = []
  for (const r of rows) {
    const k = keyFn(r)
    if (k == null || k === '' || k === 0 || seen.has(k)) continue
    seen.add(k)
    out.push(r)
  }
  return out
}

function todayLocalDate(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface FormState {
  academicYearId: string
  examGroupId: string
  examCenterId: string
  examDate: string
  questionPaperCode: string
}

const EMPTY_FORM: FormState = {
  academicYearId: '',
  examGroupId: '',
  examCenterId: '',
  examDate: '',
  questionPaperCode: '',
}

interface StudentRow extends Row {
  is_present?: boolean
  isufm?: boolean
  mark?: number | string
}

export default function ExamCenterSubjectAttendancePage() {
  const [filtersOpen, setFiltersOpen] = useState(true)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [egFilterRows, setEgFilterRows] = useState<Row[]>([])
  const [ecGroupRows, setEcGroupRows] = useState<Row[]>([])
  const [questionPaperRows, setQuestionPaperRows] = useState<Row[]>([])
  const [students, setStudents] = useState<StudentRow[]>([])
  const [loadingFilters, setLoadingFilters] = useState(false)
  const [loadingList, setLoadingList] = useState(false)
  const [saving, setSaving] = useState(false)
  const [markAll, setMarkAll] = useState(true)

  const loadAcademicYearAndGroups = useCallback(async () => {
    setLoadingFilters(true)
    try {
      const groups = await getExamCenterFilterGroups({ flag: 'eg_filters' })
      const flat: Row[] = []
      for (const g of groups) {
        if (g.length > 0 && txt(g[0].flag) === 'eg_ay_filter') {
          flat.push(...g)
        }
      }
      setEgFilterRows(flat)
    } catch (e) {
      toastError(e, 'Failed to load filters')
    } finally {
      setLoadingFilters(false)
    }
  }, [])

  useEffect(() => {
    void loadAcademicYearAndGroups()
  }, [loadAcademicYearAndGroups])

  const academicYears = useMemo(
    () => dedupeBy(egFilterRows, (r) => num(r.fk_academic_year_id)),
    [egFilterRows],
  )

  useEffect(() => {
    if (!academicYears.length || form.academicYearId) return
    setForm((f) => ({ ...f, academicYearId: String(num(academicYears[0].fk_academic_year_id)) }))
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
    if (!examGroups.length || !form.academicYearId) return
    setForm((f) => ({ ...f, examGroupId: String(num(examGroups[0].fk_univ_exam_group_id)) }))
  }, [examGroups, form.academicYearId])

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!form.academicYearId || !form.examGroupId) {
        setEcGroupRows([])
        return
      }
      try {
        const groups = await getExamCenterFilterGroups({
          flag: 'eg_ec_filters',
          academicYearId: Number(form.academicYearId),
          examGroupId: Number(form.examGroupId),
        })
        if (cancelled) return
        const flat: Row[] = []
        for (const g of groups) flat.push(...g)
        setEcGroupRows(flat)
      } catch (e) {
        if (!cancelled) toastError(e, 'Failed to load exam centers')
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [form.academicYearId, form.examGroupId])

  const examCenters = useMemo(
    () => dedupeBy(ecGroupRows, (r) => num(r.fk_univ_ec_id)),
    [ecGroupRows],
  )

  useEffect(() => {
    if (!examCenters.length || !form.examGroupId) return
    setForm((f) => ({ ...f, examCenterId: String(num(examCenters[0].fk_univ_ec_id)) }))
  }, [examCenters, form.examGroupId])

  const examDates = useMemo(
    () =>
      dedupeBy(
        ecGroupRows.filter((r) => num(r.fk_univ_ec_id) === Number(form.examCenterId)),
        (r) => txt(r.exam_date),
      ),
    [ecGroupRows, form.examCenterId],
  )

  useEffect(() => {
    if (!examDates.length || !form.examCenterId) return
    setForm((f) => ({ ...f, examDate: txt(examDates[0].exam_date) }))
  }, [examDates, form.examCenterId])

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!form.academicYearId || !form.examGroupId || !form.examCenterId || !form.examDate) {
        setQuestionPaperRows([])
        return
      }
      try {
        const groups = await getExamCenterFilterGroups({
          flag: 'eg_ec_qc_filters',
          academicYearId: Number(form.academicYearId),
          examGroupId: Number(form.examGroupId),
          univExamcenterId: Number(form.examCenterId),
          examDate: form.examDate,
        })
        if (cancelled) return
        setQuestionPaperRows(groups[0] ?? [])
      } catch (e) {
        if (!cancelled) toastError(e, 'Failed to load question papers')
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [form.academicYearId, form.examGroupId, form.examCenterId, form.examDate])

  useEffect(() => {
    if (!questionPaperRows.length || !form.examDate) return
    setForm((f) => ({
      ...f,
      questionPaperCode: txt(questionPaperRows[0].questionPaperCode ?? questionPaperRows[0].questionpaper_code),
    }))
  }, [questionPaperRows, form.examDate])

  const academicYearOptions: SelectOption[] = useMemo(
    () =>
      academicYears.map((r) => ({
        value: String(num(r.fk_academic_year_id)),
        label: txt(r.academic_year),
      })),
    [academicYears],
  )
  const examGroupOptions: SelectOption[] = useMemo(
    () =>
      examGroups.map((r) => ({
        value: String(num(r.fk_univ_exam_group_id)),
        label: txt(r.exam_group_code),
      })),
    [examGroups],
  )
  const examCenterOptions: SelectOption[] = useMemo(
    () =>
      examCenters.map((r) => ({
        value: String(num(r.fk_univ_ec_id)),
        label: `${txt(r.ec_code)} - ${txt(r.ec_name)}`,
      })),
    [examCenters],
  )
  const examDateOptions: SelectOption[] = useMemo(
    () => examDates.map((r) => ({ value: txt(r.exam_date), label: txt(r.exam_date) })),
    [examDates],
  )
  const questionPaperOptions: SelectOption[] = useMemo(
    () =>
      questionPaperRows.map((r) => {
        const c = txt(r.questionPaperCode ?? r.questionpaper_code)
        return { value: c, label: c }
      }),
    [questionPaperRows],
  )

  async function onGetList() {
    if (
      !form.academicYearId ||
      !form.examGroupId ||
      !form.examCenterId ||
      !form.examDate ||
      !form.questionPaperCode
    ) {
      toastInfo('Please Select Required Filters')
      return
    }
    setLoadingList(true)
    try {
      const rows = await getExamCenterBundleByCode({
        flag: 'bundle_omr_details',
        univExamcenterId: Number(form.examCenterId),
        examGroupId: Number(form.examGroupId),
        academicYearId: Number(form.academicYearId),
        examDate: form.examDate,
        questionPaperCode: form.questionPaperCode,
      })
      // Angular: default is_present=true if null, isufm=false if null
      const normalized: StudentRow[] = rows.map((r) => ({
        ...r,
        is_present: r.is_present == null ? true : r.is_present === true,
        isufm: r.isufm == null ? false : r.isufm === true,
      }))
      setStudents(normalized)
      setMarkAll(true)
    } catch (e) {
      toastError(e, 'Failed to load attendance list')
      setStudents([])
    } finally {
      setLoadingList(false)
    }
  }

  function setStudentField(idx: number, field: keyof StudentRow, value: unknown) {
    setStudents((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)))
  }

  function toggleAllPresent(checked: boolean) {
    setMarkAll(checked)
    setStudents((prev) => prev.map((r) => ({ ...r, is_present: checked })))
  }

  async function onSave() {
    if (!students.length) {
      toastInfo('Nothing to save.')
      return
    }
    const empId = Number(globalThis.localStorage?.getItem('employeeId') ?? 0)
    const today = todayLocalDate()
    const payload = students.map((r) => ({
      examStdDetId: num(r.pk_exam_std_det_id),
      examId: num(r.fk_exam_id),
      studentId: num(r.fk_student_id),
      hallticketNo: txt(r.hallticket_number),
      isPresent: r.is_present === true,
      isufm: r.isufm === true,
      mark: r.mark == null || r.mark === '' ? null : Number(r.mark),
      attendanceTakenEmpId: empId,
      attendanceTakenDate: today,
      isActive: true,
    }))
    setSaving(true)
    try {
      await saveExamCenterAttendance(payload)
      toastSuccess('Attendance saved.')
      await onGetList()
    } catch (e) {
      toastError(e, 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const columnDefs = useMemo<ColDef<StudentRow>[]>(
    () => [
      { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 },
      { headerName: 'Hall Ticket', minWidth: 140, valueGetter: (p) => txt(p.data?.hallticket_number) },
      { headerName: 'OMR Serial', minWidth: 130, valueGetter: (p) => txt(p.data?.omr_serialno ?? p.data?.omrSerialNo) },
      { headerName: 'EC Seat No', minWidth: 120, valueGetter: (p) => txt(p.data?.ec_seatno ?? p.data?.ecSeatNo) },
      { headerName: 'Subject', minWidth: 160, valueGetter: (p) => txt(p.data?.subject_code ?? p.data?.subjectCode) },
      {
        headerName: 'Present',
        minWidth: 90,
        width: 90,
        cellRenderer: (p: ICellRendererParams<StudentRow>) => {
          if (!p.data) return null
          const idx = (p.node?.rowIndex ?? -1) as number
          return (
            <Checkbox
              checked={p.data.is_present === true}
              onCheckedChange={(v) => setStudentField(idx, 'is_present', v === true)}
            />
          )
        },
      },
      {
        headerName: 'Marks',
        minWidth: 110,
        cellRenderer: (p: ICellRendererParams<StudentRow>) => {
          if (!p.data) return null
          const idx = (p.node?.rowIndex ?? -1) as number
          const value = p.data.mark
          return (
            <Input
              type="number"
              className="h-7 text-xs"
              value={value == null ? '' : String(value)}
              onChange={(e) => setStudentField(idx, 'mark', e.target.value)}
            />
          )
        },
      },
      {
        headerName: 'UFM',
        minWidth: 80,
        width: 80,
        cellRenderer: (p: ICellRendererParams<StudentRow>) => {
          if (!p.data) return null
          const idx = (p.node?.rowIndex ?? -1) as number
          return (
            <Checkbox
              checked={p.data.isufm === true}
              onCheckedChange={(v) => setStudentField(idx, 'isufm', v === true)}
            />
          )
        },
      },
    ],
    [],
  )

  return (
    <PageContainer className="space-y-4">
      <PageHeader
        title="Exam Center Subject Attendance"
        subtitle="Examination management · Exam papers delivery · Subject attendance"
      />

      <div className="app-card p-3 border-t-[3px] border-t-amber-300">
        <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-blue-700" aria-hidden />
            <h2 className="app-card-title">Subject Attendance</h2>
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
          <div className="mt-3 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="space-y-1 md:col-span-2">
              <Label>Academic Year *</Label>
              <Select
                options={academicYearOptions}
                value={form.academicYearId}
                onChange={(v) => setForm((f) => ({ ...f, academicYearId: v ?? '' }))}
                disabled={loadingFilters}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Exam Group *</Label>
              <Select
                options={examGroupOptions}
                value={form.examGroupId}
                onChange={(v) => setForm((f) => ({ ...f, examGroupId: v ?? '' }))}
              />
            </div>
            <div className="space-y-1 md:col-span-3">
              <Label>Exam Center *</Label>
              <Select
                options={examCenterOptions}
                value={form.examCenterId}
                onChange={(v) => setForm((f) => ({ ...f, examCenterId: v ?? '' }))}
                searchable
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Exam Date *</Label>
              <Select
                options={examDateOptions}
                value={form.examDate}
                onChange={(v) => setForm((f) => ({ ...f, examDate: v ?? '' }))}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>QP Code *</Label>
              <Select
                options={questionPaperOptions}
                value={form.questionPaperCode}
                onChange={(v) => setForm((f) => ({ ...f, questionPaperCode: v ?? '' }))}
              />
            </div>
            <div className="md:col-span-1">
              <Button type="button" onClick={() => void onGetList()} disabled={loadingList}>
                Get List
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="app-card overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-muted/40">
          <h3 className="text-[13px] font-semibold text-[hsl(var(--card-title))]">
            Students {students.length > 0 && `(${students.length})`}
          </h3>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs">
              <Checkbox checked={markAll} onCheckedChange={(v) => toggleAllPresent(v === true)} />
              Mark all present
            </label>
            <Button size="sm" onClick={() => void onSave()} disabled={saving || !students.length}>
              Save Attendance
            </Button>
          </div>
        </div>
        <div className="p-2">
          <DataTable
            rowData={students}
            columnDefs={columnDefs}
            loading={loadingList}
            pagination
            toolbar={{
              search: true,
              searchPlaceholder: 'Search…',
              pdfDocumentTitle: 'Subject Attendance',
            }}
          />
        </div>
      </div>
    </PageContainer>
  )
}
