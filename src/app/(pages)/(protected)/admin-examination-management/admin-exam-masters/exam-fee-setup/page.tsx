'use client'

import { PageContainer, PageHeader } from '@/components/layout'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSessionContext } from '@/context/SessionContext'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTable } from '@/common/components/table'
import { TableCard } from '@/common/components/table'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { StatusBadge } from '@/common/components/data-display'
import { distinct } from '@/lib/utils'
import { buildQuery } from '@/services/crud'
import {
  createExamFeeStructure,
  getCollegeFilters,
  listExamFeeStructures,
  listExamMasters,
  updateExamFeeStructure,
} from '@/services/examination'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ChevronDown, Filter, Pencil, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { Alert } from 'antd'
import { getErrorMessage } from '@/lib/errors'

// ── Pure renderer ─────────────────────────────────────────────────────────────
function statusRenderer(p: ICellRendererParams) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function toYMDOrNull(value: string): string | null {
  const raw = value.trim()
  if (!raw) return null
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? raw : format(d, 'yyyy-MM-dd')
}

function getSuppleFeeText(row: Record<string, unknown>): string {
  const asText = (value: unknown): string => {
    if (value === null || value === undefined) return ''
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value)
    return ''
  }
  const direct = row.suppleFee ?? row.supplyFee
  const subjectFees = [
    row.subject1Fee,
    row.subject2Fee,
    row.subject3Fee,
    row.subject4Fee,
    row.subject5Fee,
    row.subject6Fee,
    row.subject7Fee,
  ]
  const parts = subjectFees
    .map((value, idx) => ({ idx: idx + 1, value }))
    .map((x) => ({ ...x, text: asText(x.value).trim() }))
    .filter((x) => x.text !== '')
    .map((x) => `Subject-${x.idx} - ${x.text}`)

  if (parts.length > 0) return parts.join(', ')
  const directText = asText(direct).trim()
  if (directText !== '') return directText
  return '—'
}

export default function ExamFeeSetupPage() {
  const { user } = useSessionContext()
  const router = useRouter()

  // Mode: University vs College
  const [mode, setMode] = useState<'university' | 'college'>('university')

  // Filter data
  const [loadingFilters, setLoadingFilters] = useState(true)
  const [filtersData, setFiltersData] = useState<any[]>([])
  const [academicData, setAcademicData] = useState<any[]>([])

  const [universities, setUniversities] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [academicYears, setAcademicYears] = useState<any[]>([])
  const [examMasters, setExamMasters] = useState<any[]>([])

  const [selectedUniversityId, setSelectedUniversityId] = useState<number | null>(null)
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null)
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<number | null>(null)
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null)

  // Grid
  const [rows, setRows] = useState<any[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)
  const [q, setQ] = useState('')
  const [filterOpen, setFilterOpen] = useState(true)

  // Modal (add/edit)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [form, setForm] = useState({
    examFeeStructureName: '',
    collectionStartDate: '',
    collectionEndDate: '',
    regularFee: '',
    suppleFee: '',
    isActive: true,
  })

  const fetchFilters = useCallback(async () => {
    setLoadingFilters(true)
    try {
      const orgId = user?.organizationId ?? 0
      const empId = user?.employeeId ?? 0
      const { filtersData: filters, academicData: academic } = await getCollegeFilters(orgId, empId)

      setFiltersData(filters as any[])
      setAcademicData(academic as any[])

      const unis = distinct(filters as any[], (r) => r.fk_university_id)
      setUniversities(unis)

      if (unis.length > 0) {
        const uniId = unis[0].fk_university_id
        handleUniversityChange(uniId, filters as any[], academic as any[])
      }
    } finally {
      setLoadingFilters(false)
    }
  }, [user?.organizationId, user?.employeeId])

  useEffect(() => {
    fetchFilters()
  }, [fetchFilters])

  function handleUniversityChange(universityId: number, filtersRef = filtersData, academicRef = academicData) {
    setSelectedUniversityId(universityId)
    setSelectedCourseId(null)
    setSelectedAcademicYearId(null)
    setSelectedExamId(null)
    setRows([])
    setHasFetched(false)

    const filtered = (filtersRef ?? []).filter((r: any) => r.fk_university_id === universityId)
    const distinctCourses = distinct(filtered, (r: any) => r.fk_course_id)
    setCourses(distinctCourses)

    // Academic years are per-university in the proc output
    const years = distinct((academicRef ?? []).filter((a: any) => a.fk_university_id === universityId), (a: any) => a.fk_academic_year_id)
    setAcademicYears(years)

    if (distinctCourses.length > 0) {
      setSelectedCourseId(distinctCourses[0].fk_course_id)
    }
    if (years.length > 0) {
      setSelectedAcademicYearId(years[0].fk_academic_year_id)
    }
  }

  useEffect(() => {
    async function loadExamMasters() {
      setExamMasters([])
      setSelectedExamId(null)
      setRows([])
      setHasFetched(false)
      if (!selectedCourseId || !selectedAcademicYearId) return

      const query = buildQuery({
        'Course.courseId': selectedCourseId,
        'AcademicYear.academicYearId': selectedAcademicYearId,
        isActive: true,
      })

      const exams = await listExamMasters(query)
      const list = Array.isArray(exams) ? exams : []
      setExamMasters(list)
      if (list.length > 0) setSelectedExamId(list[0].examId ?? list[0].id ?? null)
    }
    loadExamMasters()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourseId, selectedAcademicYearId])

  async function handleGetList() {
    if (!selectedExamId) return
    setHasFetched(true)
    setLoadingList(true)
    try {
      // NOTE: field paths depend on Spring entity mappings; we include the most common ones.
      const query = buildQuery({
        'ExamMaster.examId': selectedExamId,
        isActive: true,
      })
      const data = await listExamFeeStructures(query)
      setRows(Array.isArray(data) ? data : [])
    } finally {
      setLoadingList(false)
    }
  }

  const filteredRows = useMemo(() => {
    if (!q.trim()) return rows
    const lower = q.toLowerCase()
    return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(lower))
  }, [q, rows])

  const cols = useMemo<ColDef<any>[]>(() => [
    { headerName: 'SI.No', valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, width: 56, minWidth: 56, flex: 0 },
    { field: 'examFeeStructureName', headerName: 'Exam Fee Structure', minWidth: 170 },
    {
      headerName: 'Exam Master',
      minWidth: 170,
      valueGetter: (p) => p.data?.examMaster?.examName ?? p.data?.examMasterName ?? p.data?.examName ?? '—',
    },
    {
      headerName: 'Collection Start Date',
      minWidth: 125,
      valueGetter: (p) => {
        const v = p.data?.collectionStartDate ?? p.data?.collectionStartOn ?? p.data?.fromDate
        if (!v) return '—'
        const d = new Date(v)
        return isNaN(d.getTime()) ? String(v) : format(d, 'dd MMM, yyyy')
      },
    },
    {
      headerName: 'Collection End Date',
      minWidth: 125,
      valueGetter: (p) => {
        const v = p.data?.collectionEndDate ?? p.data?.collectionEndOn ?? p.data?.toDate
        if (!v) return '—'
        const d = new Date(v)
        return isNaN(d.getTime()) ? String(v) : format(d, 'dd MMM, yyyy')
      },
    },
    {
      headerName: 'Regular Fee',
      minWidth: 90,
      valueGetter: (p) => p.data?.regularFee ?? p.data?.regFee ?? '—',
    },
    {
      headerName: 'Supple Fee',
      minWidth: 90,
      valueGetter: (p) => getSuppleFeeText((p.data ?? {}) as Record<string, unknown>),
    },
    {
      field: 'isActive',
      headerName: 'Status',
      width: 76,
      flex: 0,
      cellRenderer: statusRenderer,
    },
    {
      headerName: 'Actions',
      minWidth: 80,
      cellRenderer: (p: any) => (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            if (!selectedExamId) return
            const uni = universities.find((u) => u.fk_university_id === selectedUniversityId)
            const course = courses.find((c) => c.fk_course_id === selectedCourseId)
            const ay = academicYears.find((a) => a.fk_academic_year_id === selectedAcademicYearId)
            const exam = examMasters.find((ex) => (ex.examId ?? ex.id) === selectedExamId)
            const qp = new URLSearchParams({
              check: mode === 'college' ? '2' : '1',
              universityId: String(selectedUniversityId ?? 0),
              universityCode: String(uni?.university_code ?? ''),
              courseId: String(selectedCourseId ?? 0),
              courseName: String(course?.course_code ?? course?.course_name ?? ''),
              academicYearId: String(selectedAcademicYearId ?? 0),
              academicYear: String(ay?.academic_year ?? ''),
              examId: String(selectedExamId ?? 0),
              examName: String(exam?.examName ?? ''),
              fromDate: String(exam?.fromDate ?? ''),
              toDate: String(exam?.toDate ?? ''),
              examFeeStructureId: String(p.data?.examFeeStructureId ?? p.data?.id ?? 0),
            })
            router.push(`/admin-examination-management/admin-exam-masters/exam-fee-setup/create?${qp.toString()}`)
          }}
          disabled={!selectedExamId}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      ),
    },
  ], [selectedExamId, universities, selectedUniversityId, courses, selectedCourseId, academicYears, selectedAcademicYearId, examMasters, mode, router])

  const titleLine = useMemo(() => {
    const uni = universities.find((u) => u.fk_university_id === selectedUniversityId)
    const course = courses.find((c) => c.fk_course_id === selectedCourseId)
    const ay = academicYears.find((a) => a.fk_academic_year_id === selectedAcademicYearId)
    const exam = examMasters.find((e) => (e.examId ?? e.id) === selectedExamId)
    const uniLabel = uni?.university_code ?? uni?.university_name ?? ''
    const courseLabel = course?.course_code ?? course?.course_name ?? ''
    const ayLabel = ay?.academic_year ?? ''
    const examLabel = exam?.examName ?? ''
    return [uniLabel, ayLabel, courseLabel, examLabel].filter(Boolean).join(' / ')
  }, [academicYears, courses, examMasters, selectedAcademicYearId, selectedCourseId, selectedExamId, selectedUniversityId, universities])

  const openAdd = useCallback(() => {
    setEditing(null)
    setForm({
      examFeeStructureName: '',
      collectionStartDate: '',
      collectionEndDate: '',
      regularFee: '',
      suppleFee: '',
      isActive: true,
    })
    setModalOpen(true)
  }, [])

  const openEdit = useCallback((row: any) => {
    setEditing(row)
    setForm({
      examFeeStructureName: row?.examFeeStructureName ?? '',
      collectionStartDate: String(row?.collectionStartDate ?? ''),
      collectionEndDate: String(row?.collectionEndDate ?? ''),
      regularFee: String(row?.regularFee ?? row?.regFee ?? ''),
      suppleFee: String(row?.suppleFee ?? row?.supplyFee ?? ''),
      isActive: row?.isActive !== undefined ? !!row.isActive : true,
    })
    setModalOpen(true)
  }, [])

  function closeModal() {
    setModalOpen(false)
    setEditing(null)
    setSaving(false)
  }

  async function save(e: any) {
    e.preventDefault()
    if (!selectedExamId) return

    setSaving(true)
    setNotice(null)
    try {
      const payload: Record<string, unknown> = {
        examFeeStructureName: form.examFeeStructureName,
        collectionStartDate: toYMDOrNull(form.collectionStartDate),
        collectionEndDate: toYMDOrNull(form.collectionEndDate),
        // Keep both naming styles to match legacy Angular + current APIs.
        regularFee: form.regularFee === '' ? null : Number(form.regularFee),
        regFee: form.regularFee === '' ? null : Number(form.regularFee),
        suppleFee: form.suppleFee === '' ? null : Number(form.suppleFee),
        supplyFee: form.suppleFee === '' ? null : Number(form.suppleFee),
        isActive: form.isActive,
        // Relationship hints
        examId: selectedExamId,
        examMaster: { examId: selectedExamId },
      }

      const id = editing?.examFeeStructureId ?? editing?.id
      if (id != null) await updateExamFeeStructure(Number(id), { ...payload, examFeeStructureId: Number(id) })
      else await createExamFeeStructure(payload)

      setNotice({ type: 'success', message: `Exam fee structure ${id != null ? 'updated' : 'created'} successfully.` })
      closeModal()
      await handleGetList()
    } catch (error: unknown) {
      setNotice({ type: 'error', message: getErrorMessage(error) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageContainer className="space-y-5">
      <PageHeader title="Exam Fee Structures" subtitle="Configure fee structures per exam" />
      {notice && (
        <Alert
          type={notice.type}
          title={notice.message}
          showIcon
          action={(
            <Button type="button" size="sm" variant="outline" className="h-7 text-[12px]" onClick={() => setNotice(null)}>
              Close
            </Button>
          )}
        />
      )}
      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between gap-2">
          <h2 className="text-[16px] font-semibold text-[hsl(var(--card-title))]">Exam Fee Structures</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-6 px-2.5 text-[12px]"
            onClick={() => setFilterOpen((v) => !v)}
            aria-expanded={filterOpen}
          >
            <Filter className="mr-1.5 h-3.5 w-3.5" />
            Filter
            <ChevronDown className={`ml-1.5 h-3.5 w-3.5 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
          </Button>
        </div>
        {filterOpen && (
        <>
        <div className="px-3 py-3">
      <div className="flex items-center gap-8">
        <RadioGroup
          value={mode}
          onValueChange={(v) => setMode(v as any)}
          className="flex items-center gap-10"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="university" id="feeModeUniversity" />
            <Label htmlFor="feeModeUniversity">Is For University</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="college" id="feeModeCollege" />
            <Label htmlFor="feeModeCollege">Is For College</Label>
          </div>
        </RadioGroup>
      </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
          <div className="space-y-1">
            <Label>University *</Label>
            <Select
              value={selectedUniversityId != null ? String(selectedUniversityId) : undefined}
              onValueChange={(v) => handleUniversityChange(Number(v))}
              disabled={loadingFilters}
            >
              <SelectTrigger className="h-8 text-[12px]">
                <SelectValue placeholder={loadingFilters ? 'Loading…' : 'Select University'} />
              </SelectTrigger>
              <SelectContent>
                {universities.map((u) => (
                  <SelectItem key={u.fk_university_id} value={String(u.fk_university_id)}>
                    {u.university_code ?? u.university_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Course *</Label>
            <Select
              value={selectedCourseId != null ? String(selectedCourseId) : undefined}
              onValueChange={(v) => setSelectedCourseId(Number(v))}
              disabled={courses.length === 0}
            >
              <SelectTrigger className="h-8 text-[12px]">
                <SelectValue placeholder="Select Course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.fk_course_id} value={String(c.fk_course_id)}>
                    {c.course_code ?? c.course_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Exam Year *</Label>
            <Select
              value={selectedAcademicYearId != null ? String(selectedAcademicYearId) : undefined}
              onValueChange={(v) => setSelectedAcademicYearId(Number(v))}
              disabled={academicYears.length === 0}
            >
              <SelectTrigger className="h-8 text-[12px]">
                <SelectValue placeholder="Select Exam Year" />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map((a) => (
                  <SelectItem key={a.fk_academic_year_id} value={String(a.fk_academic_year_id)}>
                    {a.academic_year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1 lg:col-span-2">
            <Label>Exam Master *</Label>
            <Select
              value={selectedExamId != null ? String(selectedExamId) : undefined}
              onValueChange={(v) => { setSelectedExamId(Number(v)); setRows([]) }}
              disabled={examMasters.length === 0}
            >
              <SelectTrigger className="h-8 text-[12px]">
                <SelectValue placeholder="Select Exam Master" />
              </SelectTrigger>
              <SelectContent>
                {examMasters.map((e) => (
                  <SelectItem key={e.examId ?? e.id} value={String(e.examId ?? e.id)}>
                    {e.examName ?? '—'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="lg:col-span-1 flex items-end justify-end">
            <Button onClick={handleGetList} disabled={!selectedExamId || loadingList} className="h-8 px-3 text-[12px]">
              Get List
            </Button>
          </div>
        </div>
      </div>
      </>
      )}
      </div>

      {hasFetched && (
      <>
      <div className="app-card p-3 flex items-center gap-2">
        <span className="text-[13px] font-medium text-slate-800">Exam Fee Structure :</span>
        <span className="text-[13px] text-[hsl(var(--primary))] font-semibold truncate">{titleLine || '—'}</span>
      </div>

      <TableCard
        headerLeft={
          <Input
            className="h-9 max-w-sm text-[12px]"
            placeholder="Search…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            disabled={rows.length === 0}
          />
        }
        headerRight={
          <Button
            size="sm"
            onClick={() => {
              if (!selectedExamId) return
              const uni = universities.find((u) => u.fk_university_id === selectedUniversityId)
              const course = courses.find((c) => c.fk_course_id === selectedCourseId)
              const ay = academicYears.find((a) => a.fk_academic_year_id === selectedAcademicYearId)
              const exam = examMasters.find((e) => (e.examId ?? e.id) === selectedExamId)
              const qp = new URLSearchParams({
                universityId: String(selectedUniversityId ?? 0),
                universityCode: String(uni?.university_code ?? ''),
                courseId: String(selectedCourseId ?? 0),
                courseName: String(course?.course_code ?? course?.course_name ?? ''),
                academicYearId: String(selectedAcademicYearId ?? 0),
                academicYear: String(ay?.academic_year ?? ''),
                examId: String(selectedExamId ?? 0),
                examName: String(exam?.examName ?? ''),
                fromDate: String(exam?.fromDate ?? ''),
                toDate: String(exam?.toDate ?? ''),
              })
              router.push(`/admin-examination-management/admin-exam-masters/exam-fee-setup/create?${qp.toString()}`)
            }}
            disabled={!selectedExamId}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Exam Fee Structure
          </Button>
        }
      >
        <DataTable rowData={filteredRows} columnDefs={cols} loading={loadingList} pagination />
      </TableCard>
      </>
      )}

      <Dialog open={modalOpen} onOpenChange={(v) => { if (!v) closeModal() }}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          <DialogHeader className="px-7 pt-6 pb-4 border-b bg-gradient-to-r from-slate-50 to-white">
            <DialogTitle className="text-[20px] font-semibold tracking-tight text-[hsl(var(--primary))]">
              {editing ? 'Edit Exam Fee Structure' : 'Add Exam Fee Structure'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={save} className="px-7 py-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[12px] text-slate-600">Exam Fee Structure</Label>
                <Input
                  value={form.examFeeStructureName}
                  onChange={(e) => setForm((s) => ({ ...s, examFeeStructureName: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] text-slate-600">Regular Fee</Label>
                <Input
                  inputMode="numeric"
                  value={form.regularFee}
                  onChange={(e) => setForm((s) => ({ ...s, regularFee: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] text-slate-600">Collection Start Date</Label>
                <Input
                  placeholder="YYYY-MM-DD"
                  value={form.collectionStartDate}
                  onChange={(e) => setForm((s) => ({ ...s, collectionStartDate: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] text-slate-600">Collection End Date</Label>
                <Input
                  placeholder="YYYY-MM-DD"
                  value={form.collectionEndDate}
                  onChange={(e) => setForm((s) => ({ ...s, collectionEndDate: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] text-slate-600">Supple Fee</Label>
                <Input
                  inputMode="numeric"
                  value={form.suppleFee}
                  onChange={(e) => setForm((s) => ({ ...s, suppleFee: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] text-slate-600">Status</Label>
                <label className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((s) => ({ ...s, isActive: e.target.checked }))}
                  />
                  <span className="text-[13px] text-slate-700">Active</span>
                </label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeModal} disabled={saving}>
                Close
              </Button>
              <Button type="submit" disabled={saving}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}

