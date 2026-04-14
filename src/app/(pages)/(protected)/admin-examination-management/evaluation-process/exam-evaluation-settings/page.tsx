'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ColDef } from 'ag-grid-community'
import { SearchInput } from '@/common/components/search'
import { DataTable } from '@/common/components/table'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, type SelectOption } from '@/common/components/select'
import { StatusBadge } from '@/common/components/data-display'
import { ChevronDown, Filter } from 'lucide-react'
import { toastError, toastSuccess } from '@/lib/toast'
import { toDateOnlyISO } from '@/common/generic-functions'
import {
  createExamEvaluationSetting,
  getExamEvaluationSettingsFilters,
  listExamEvaluationSettings,
  updateExamEvaluationSetting,
} from '@/services/evaluation-process'
import { PageContainer, PageHeader } from '@/components/layout'

type AnyRow = Record<string, any>

const pickNum = (row: AnyRow | null | undefined, keys: string[]) => {
  if (!row) return 0
  for (const k of keys) {
    const n = Number(row[k])
    if (n > 0) return n
  }
  return 0
}
const pickText = (row: AnyRow | null | undefined, keys: string[]) => {
  if (!row) return ''
  for (const k of keys) {
    const v = row[k]
    if (v != null && String(v).trim() !== '') return String(v)
  }
  return ''
}
const dedupeBy = <T,>(rows: T[], keyFn: (r: T) => string | number) => {
  const seen = new Set<string | number>()
  return rows.filter((r) => {
    const key = keyFn(r)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}
const toYmd = (v?: string | Date) => {
  if (!v) return ''
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return ''
  return toDateOnlyISO(d)
}
const secondsToTime = (total: number) => {
  const h = String(Math.floor(total / 3600)).padStart(2, '0')
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0')
  const s = String(total % 60).padStart(2, '0')
  return `${h}:${m}:${s}`
}

function statusRenderer(p: { value?: boolean }) {
  return <StatusBadge status={p.value ?? false} />
}

function makeActionsRenderer(openEdit: (row: AnyRow) => void) {
  return (p: { data?: AnyRow }) => (
    <button type="button" className="text-[12px] text-blue-700 hover:underline" onClick={() => openEdit(p.data ?? {})}>
      Edit
    </button>
  )
}

type FormState = {
  minEvaluationTIme: string
  evaluationStartDate: string
  evaluationEndDate: string
  maxNoOfEvaluationsAssign: string
  maxNoOfReevaluationsAssign: string
  noOfEvaluations: string
  noOfReEvaluations: string
  marksDiffForModEvaluatoin: string
  noOfChiefEvaluations: string
  noOfChiefReevaluations: string
  isActive: boolean
  reason: string
}

function emptyForm(): FormState {
  const today = toDateOnlyISO(new Date())
  return {
    minEvaluationTIme: '',
    evaluationStartDate: today,
    evaluationEndDate: today,
    maxNoOfEvaluationsAssign: '',
    maxNoOfReevaluationsAssign: '',
    noOfEvaluations: '',
    noOfReEvaluations: '',
    marksDiffForModEvaluatoin: '',
    noOfChiefEvaluations: '',
    noOfChiefReevaluations: '',
    isActive: true,
    reason: '',
  }
}

export default function ExamEvaluationSettingsPage() {
  const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)

  const [filterOpen, setFilterOpen] = useState(true)
  const [loading, setLoading] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)
  const [search, setSearch] = useState('')

  const [filterRows, setFilterRows] = useState<AnyRow[]>([])
  const [rows, setRows] = useState<AnyRow[]>([])
  const [courseId, setCourseId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [editRow, setEditRow] = useState<AnyRow | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())

  const courses = useMemo(
    () => dedupeBy(filterRows, (r) => pickNum(r, ['fk_course_id', 'courseId'])),
    [filterRows],
  )
  const academicYears = useMemo(
    () =>
      dedupeBy(
        filterRows.filter((r) => pickNum(r, ['fk_course_id', 'courseId']) === Number(courseId)),
        (r) => pickNum(r, ['fk_academic_year_id', 'academicYearId']),
      ),
    [filterRows, courseId],
  )
  const exams = useMemo(
    () =>
      dedupeBy(
        filterRows.filter(
          (r) =>
            pickNum(r, ['fk_course_id', 'courseId']) === Number(courseId) &&
            pickNum(r, ['fk_academic_year_id', 'academicYearId']) === Number(academicYearId),
        ),
        (r) => pickNum(r, ['fk_exam_id', 'examId']),
      ),
    [filterRows, courseId, academicYearId],
  )

  useEffect(() => {
    async function init() {
      setLoading(true)
      try {
        const list = await getExamEvaluationSettingsFilters(employeeId).catch(() => [])
        const r = Array.isArray(list) ? list : []
        setFilterRows(r)
        if (r[0]) setCourseId(pickNum(r[0], ['fk_course_id', 'courseId']))
      } finally {
        setLoading(false)
      }
    }
    void init()
  }, [employeeId])

  useEffect(() => {
    if (academicYears[0]) setAcademicYearId(pickNum(academicYears[0], ['fk_academic_year_id', 'academicYearId']))
  }, [academicYears])
  useEffect(() => {
    if (exams[0]) setExamId(pickNum(exams[0], ['fk_exam_id', 'examId']))
  }, [exams])
  useEffect(() => {
    setRows([])
    setHasFetched(false)
  }, [courseId, academicYearId, examId])

  async function getList() {
    if (!examId) {
      toastError('Please select Exam.')
      return
    }
    setLoading(true)
    try {
      const list = await listExamEvaluationSettings(examId).catch(() => [])
      setRows(Array.isArray(list) ? list : [])
      setHasFetched(true)
    } finally {
      setLoading(false)
    }
  }

  function openAdd() {
    setEditRow(null)
    setForm(emptyForm())
    setModalOpen(true)
  }

  function openEdit(row: AnyRow) {
    setEditRow(row)
    setForm({
      minEvaluationTIme: String(row?.minEvaluationTIme ?? ''),
      evaluationStartDate: toYmd(row?.evaluationStartDate),
      evaluationEndDate: toYmd(row?.evaluationEndDate),
      maxNoOfEvaluationsAssign: String(row?.maxNoOfEvaluationsAssign ?? ''),
      maxNoOfReevaluationsAssign: String(row?.maxNoOfReevaluationsAssign ?? ''),
      noOfEvaluations: String(row?.noOfEvaluations ?? ''),
      noOfReEvaluations: String(row?.noOfReEvaluations ?? ''),
      marksDiffForModEvaluatoin: String(row?.marksDiffForModEvaluatoin ?? ''),
      noOfChiefEvaluations: String(row?.noOfChiefEvaluations ?? ''),
      noOfChiefReevaluations: String(row?.noOfChiefReevaluations ?? ''),
      isActive: Boolean(row?.isActive),
      reason: String(row?.reason ?? ''),
    })
    setModalOpen(true)
  }

  async function onSave() {
    if (!examId) {
      toastError('Please select Exam.')
      return
    }
    if (!form.noOfEvaluations || !form.noOfReEvaluations || !form.marksDiffForModEvaluatoin) {
      toastError('Please fill required fields.')
      return
    }
    const payload = {
      examId,
      minEvaluationTIme: Number(form.minEvaluationTIme || 0),
      evaluationStartDate: form.evaluationStartDate || null,
      evaluationEndDate: form.evaluationEndDate || null,
      maxNoOfEvaluationsAssign: Number(form.maxNoOfEvaluationsAssign || 0),
      maxNoOfReevaluationsAssign: Number(form.maxNoOfReevaluationsAssign || 0),
      noOfEvaluations: Number(form.noOfEvaluations || 0),
      noOfReEvaluations: Number(form.noOfReEvaluations || 0),
      marksDiffForModEvaluatoin: Number(form.marksDiffForModEvaluatoin || 0),
      noOfChiefEvaluations: Number(form.noOfChiefEvaluations || 0),
      noOfChiefReevaluations: Number(form.noOfChiefReevaluations || 0),
      isActive: form.isActive,
      reason: form.reason || null,
    }
    setLoading(true)
    try {
      if (editRow?.evaluationSettingId) {
        await updateExamEvaluationSetting(Number(editRow.evaluationSettingId), payload)
      } else {
        await createExamEvaluationSetting(payload)
      }
      toastSuccess('Saved successfully.')
      setModalOpen(false)
      await getList()
    } catch (error: any) {
      toastError(error?.message ?? 'Failed to save.')
    } finally {
      setLoading(false)
    }
  }

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((r) => Object.values(r).some((v) => String(v).toLowerCase().includes(term)))
  }, [rows, search])

  const cols = useMemo<ColDef[]>(
    () => [
      { headerName: 'SI.No', valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, width: 80 },
      {
        field: 'minEvaluationTIme',
        headerName: 'Evaluation Time',
        minWidth: 140,
        valueGetter: (p) => secondsToTime(Number(p.data?.minEvaluationTIme ?? 0)),
      },
      { field: 'maxNoOfEvaluationsAssign', headerName: 'Max No of Evaluations', minWidth: 160 },
      { field: 'maxNoOfReevaluationsAssign', headerName: 'Max No of Re-Evaluations', minWidth: 180 },
      { field: 'noOfChiefEvaluations', headerName: 'No of Chief Evaluations', minWidth: 170 },
      { field: 'noOfChiefReevaluations', headerName: 'No of Chief Re-Evaluations', minWidth: 185 },
      { field: 'noOfEvaluations', headerName: 'No Of Evaluations', minWidth: 140 },
      { field: 'noOfReEvaluations', headerName: 'No Of Re-Evaluations', minWidth: 160 },
      { field: 'marksDiffForModEvaluatoin', headerName: 'Marks Diff.For ModEvaluation', minWidth: 200 },
      { field: 'evaluationStartDate', headerName: 'Evaluation Start Date', minWidth: 160, valueGetter: (p) => toYmd(p.data?.evaluationStartDate) || '-' },
      { field: 'evaluationEndDate', headerName: 'Evaluation End Date', minWidth: 160, valueGetter: (p) => toYmd(p.data?.evaluationEndDate) || '-' },
      { field: 'isActive', headerName: 'Status', minWidth: 110, cellRenderer: statusRenderer },
      { headerName: 'Actions', minWidth: 110, cellRenderer: makeActionsRenderer(openEdit) },
    ],
    [],
  )

  return (
    <PageContainer className="space-y-5">
      <PageHeader title="Exam Evaluation Settings" subtitle="Configure evaluation parameters" />
      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between gap-2">
          <h2 className="text-[16px] font-semibold text-[hsl(var(--primary))]">Exam Evaluation Settings</h2>
          <Button type="button" variant="outline" size="sm" className="h-6 px-2.5 text-[12px]" onClick={() => setFilterOpen((v) => !v)} aria-expanded={filterOpen}>
            <Filter className="mr-1.5 h-3.5 w-3.5" />
            Filter
            <ChevronDown className={`ml-1.5 h-3.5 w-3.5 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
          </Button>
        </div>
        {filterOpen && (
          <div className="p-3 space-y-2 text-[13px]">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
              <div className="md:col-span-3">
                <Label className="text-[12px] text-muted-foreground">Course</Label>
                <Select
                  value={courseId ? String(courseId) : null}
                  onChange={(v) => setCourseId(v ? Number(v) : null)}
                  options={courses.map((c) => ({ value: String(pickNum(c, ['fk_course_id'])), label: pickText(c, ['course_code', 'course_name']) } as SelectOption))}
                  placeholder="Course"
                />
              </div>
              <div className="md:col-span-3">
                <Label className="text-[12px] text-muted-foreground">Academic Year</Label>
                <Select
                  value={academicYearId ? String(academicYearId) : null}
                  onChange={(v) => setAcademicYearId(v ? Number(v) : null)}
                  options={academicYears.map((a) => ({ value: String(pickNum(a, ['fk_academic_year_id'])), label: pickText(a, ['academic_year']) } as SelectOption))}
                  placeholder="Academic Year"
                />
              </div>
              <div className="md:col-span-5">
                <Label className="text-[12px] text-muted-foreground">Exam</Label>
                <Select
                  value={examId ? String(examId) : null}
                  onChange={(v) => setExamId(v ? Number(v) : null)}
                  options={exams.map((e) => ({ value: String(pickNum(e, ['fk_exam_id'])), label: pickText(e, ['exam_name']) } as SelectOption))}
                  placeholder="Exam"
                />
              </div>
              <div className="md:col-span-1">
                <Button className="h-8 px-3 text-[12px] w-full" onClick={() => void getList()} disabled={loading}>Get List</Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {hasFetched && (
        <div className="app-card overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="w-full max-w-sm">
                <SearchInput className="w-full" placeholder="Search" value={search} onChange={setSearch} />
              </div>
              <Button onClick={openAdd}>Add Evaluation Settings</Button>
            </div>
          </div>
          <div className="p-4">
            <DataTable rowData={filteredRows} columnDefs={cols} pagination loading={loading} />
          </div>
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-3xl pt-3 [&>button]:hidden">
          <DialogHeader className="pb-0">
            <DialogTitle className="text-[12px] leading-none font-semibold text-[hsl(var(--primary))]">
              {editRow ? 'Edit Existing Evaluation Settings' : 'Add New Evaluation Settings'} - {pickText(exams.find((e) => pickNum(e, ['fk_exam_id']) === Number(examId)), ['exam_name'])}
            </DialogTitle>
          </DialogHeader>
          <div className="-mx-6 border-b border-slate-200 mt-1" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input placeholder="Evaluation Time" type="number" value={form.minEvaluationTIme} onChange={(e) => setForm((p) => ({ ...p, minEvaluationTIme: e.target.value }))} />
            <Input placeholder="Evaluation Start Date" type="date" value={form.evaluationStartDate} onChange={(e) => setForm((p) => ({ ...p, evaluationStartDate: e.target.value }))} />
            <Input placeholder="Evaluation End Date" type="date" value={form.evaluationEndDate} onChange={(e) => setForm((p) => ({ ...p, evaluationEndDate: e.target.value }))} />
            <Input placeholder="Max No Of Evaluations" type="number" value={form.maxNoOfEvaluationsAssign} onChange={(e) => setForm((p) => ({ ...p, maxNoOfEvaluationsAssign: e.target.value }))} />
            <Input placeholder="Max No Of Re-Evaluations" type="number" value={form.maxNoOfReevaluationsAssign} onChange={(e) => setForm((p) => ({ ...p, maxNoOfReevaluationsAssign: e.target.value }))} />
            <Input placeholder="No Of Evaluations" type="number" value={form.noOfEvaluations} onChange={(e) => setForm((p) => ({ ...p, noOfEvaluations: e.target.value }))} />
            <Input placeholder="No Of Re-Evaluations" type="number" value={form.noOfReEvaluations} onChange={(e) => setForm((p) => ({ ...p, noOfReEvaluations: e.target.value }))} />
            <Input placeholder="Marks Diff.For ModEvaluatoin" type="number" value={form.marksDiffForModEvaluatoin} onChange={(e) => setForm((p) => ({ ...p, marksDiffForModEvaluatoin: e.target.value }))} />
            <Input placeholder="No of Chief Evaluations" type="number" value={form.noOfChiefEvaluations} onChange={(e) => setForm((p) => ({ ...p, noOfChiefEvaluations: e.target.value }))} />
            <Input placeholder="No of Chief Re-Evaluations" type="number" value={form.noOfChiefReevaluations} onChange={(e) => setForm((p) => ({ ...p, noOfChiefReevaluations: e.target.value }))} />
            <div className="flex items-center gap-2">
              <Checkbox checked={form.isActive} onCheckedChange={(v) => setForm((p) => ({ ...p, isActive: v === true }))} />
              <span className="text-[12px]">Active</span>
            </div>
            {!form.isActive && (
              <Input placeholder="Reason" value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={loading}>Close</Button>
            <Button onClick={() => void onSave()} disabled={loading}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}

