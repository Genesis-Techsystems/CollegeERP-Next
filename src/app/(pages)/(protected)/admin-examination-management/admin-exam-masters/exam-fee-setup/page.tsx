'use client'

import { PageContainer } from '@/components/layout'
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
import {
  computeCascadeFromRows,
  deriveExamOptions,
  sortAcademicYearsDesc,
} from '@/lib/univ-exam-filter-cascade'
import { buildQuery } from '@/services/crud'
import {
  createExamFeeStructure,
  getUnivExamFiltersForExamFeeSetup,
  listExamFeeStructures,
  resolveExamLoginEmpId,
  updateExamFeeStructure,
} from '@/services'
import { Select } from '@/common/components/select'
import { GlobalFilterBar, GlobalFilterBarRow, GlobalFilterField } from '@/common/components/forms'
import { Building2, Calendar, GraduationCap, ScrollText, Eye, Pencil, Plus } from 'lucide-react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { NoticeAlert } from '@/common/components/feedback'
import { getErrorMessage } from '@/lib/errors'
import ViewExamFeeStructureModal, { type ExamFeeStructureViewData } from './ViewExamFeeStructureModal'

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
  // Modal (add/edit)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [viewOpen, setViewOpen] = useState(false)
  const [viewing, setViewing] = useState<ExamFeeStructureViewData | null>(null)
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
      const empId = resolveExamLoginEmpId(user?.employeeId)
      const rows = await getUnivExamFiltersForExamFeeSetup(empId)
      const list = Array.isArray(rows) ? rows : []
      setFiltersData(list)

      const unis = distinct(
        list.filter((r: any) => r && r.fk_university_id != null && r.fk_university_id !== ''),
        (r: any) => r.fk_university_id,
      )
      setUniversities(unis)

      if (unis.length > 0) {
        const uniId = unis[0].fk_university_id
        setSelectedUniversityId(uniId)
        const c = computeCascadeFromRows(uniId, list)
        setCourses(c.courses)
        setSelectedCourseId(c.firstCourse)
        setAcademicYears(c.academicYears)
        setSelectedAcademicYearId(c.firstAy)
        setExamMasters(c.exams)
        setSelectedExamId(c.firstExam)
      } else {
        setSelectedUniversityId(null)
        setCourses([])
        setSelectedCourseId(null)
        setAcademicYears([])
        setSelectedAcademicYearId(null)
        setExamMasters([])
        setSelectedExamId(null)
      }
      setRows([])
      setHasFetched(false)
    } finally {
      setLoadingFilters(false)
    }
  }, [user?.employeeId])

  useEffect(() => {
    fetchFilters()
  }, [fetchFilters])

  function handleUniversityChange(universityId: number, filtersRef = filtersData) {
    setSelectedUniversityId(universityId)
    setSelectedCourseId(null)
    setSelectedAcademicYearId(null)
    setSelectedExamId(null)
    setRows([])
    setHasFetched(false)

    const ref = filtersRef ?? []
    const c = computeCascadeFromRows(universityId, ref)
    setCourses(c.courses)
    setSelectedCourseId(c.firstCourse)
    setAcademicYears(c.academicYears)
    setSelectedAcademicYearId(c.firstAy)
    setExamMasters(c.exams)
    setSelectedExamId(c.firstExam)
  }

  function handleCourseChange(courseId: number) {
    if (!selectedUniversityId) return
    setSelectedCourseId(courseId)
    setSelectedAcademicYearId(null)
    setSelectedExamId(null)
    setRows([])
    setHasFetched(false)

    const ref = filtersData
    const aySource = ref.filter(
      (r: any) =>
        r &&
        Number(r.fk_university_id) === Number(selectedUniversityId) &&
        Number(r.fk_course_id) === Number(courseId),
    )
    const ayDistinct = sortAcademicYearsDesc(
      distinct(aySource, (r: any) => r.fk_academic_year_id).filter((r: any) => r.fk_academic_year_id != null),
    )
    setAcademicYears(ayDistinct)
    const firstAy = ayDistinct[0]?.fk_academic_year_id ?? null
    setSelectedAcademicYearId(firstAy)
    if (firstAy != null) {
      const examOpts = deriveExamOptions(ref, selectedUniversityId, courseId, firstAy)
      setExamMasters(examOpts)
      setSelectedExamId(examOpts[0]?.examId ?? null)
    } else {
      setExamMasters([])
      setSelectedExamId(null)
    }
  }

  function handleAcademicYearChange(ayId: number) {
    if (!selectedUniversityId || !selectedCourseId) return
    setSelectedAcademicYearId(ayId)
    setSelectedExamId(null)
    setRows([])
    setHasFetched(false)
    const examOpts = deriveExamOptions(filtersData, selectedUniversityId, selectedCourseId, ayId)
    setExamMasters(examOpts)
    setSelectedExamId(examOpts[0]?.examId ?? null)
  }

  async function handleGetList() {
    if (!selectedExamId) return
    setHasFetched(true)
    setLoadingList(true)
    try {
      // NOTE: field paths depend on Spring entity mappings; we include the most common ones.
      const query = buildQuery({
        'examMaster.examId': selectedExamId,
        isActive: true,
      })
      const data = await listExamFeeStructures(query)
      setRows(Array.isArray(data) ? data : [])
    } finally {
      setLoadingList(false)
    }
  }

  const cols = useMemo<ColDef<any>[]>(() => [
    { headerName: 'SI.No', valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, width: 56, minWidth: 56, flex: 0 },
    { field: 'examFeeStructureName', headerName: 'Exam Fee Structure', minWidth: 170 },
    {
      headerName: 'Exam Master',
      minWidth: 220,
      flex: 1,
      autoHeight: true,
      cellRenderer: (p: ICellRendererParams) => {
        const text =
          p.data?.examMaster?.examName ??
          p.data?.examMasterName ??
          p.data?.examName ??
          '—'
        return (
          <span className="whitespace-normal leading-snug line-clamp-2">
            {text}
          </span>
        )
      },
      tooltipValueGetter: (p) =>
        p.data?.examMaster?.examName ??
        p.data?.examMasterName ??
        p.data?.examName ??
        '—',
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
      minWidth: 260,
      flex: 1,
      autoHeight: true,
      cellRenderer: (p: ICellRendererParams) => (
        <span className="whitespace-normal leading-snug line-clamp-2">
          {getSuppleFeeText((p.data ?? {}) as Record<string, unknown>)}
        </span>
      ),
      tooltipValueGetter: (p) => getSuppleFeeText((p.data ?? {}) as Record<string, unknown>),
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
      minWidth: 110,
      cellRenderer: (p: any) => (
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            aria-label="View exam fee structure"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              const uni = universities.find((u) => u.fk_university_id === selectedUniversityId)
              const course = courses.find((c) => c.fk_course_id === selectedCourseId)
              const ay = academicYears.find((a) => a.fk_academic_year_id === selectedAcademicYearId)
              const exam = examMasters.find((ex) => (ex.examId ?? ex.id) === selectedExamId)
              setViewing({
                ...(p.data ?? {}),
                collegeCode: p.data?.collegeCode ?? uni?.university_code ?? '',
                courseCode: p.data?.courseCode ?? course?.course_code ?? course?.course_name ?? '',
                examYear: p.data?.examYear ?? ay?.academic_year ?? '',
                examName: p.data?.examName ?? p.data?.examMaster?.examName ?? exam?.examName ?? '',
                regFee: p.data?.regFee ?? p.data?.regularFee,
                supplyFee: p.data?.supplyFee ?? p.data?.suppleFee,
              })
              setViewOpen(true)
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
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
        </div>
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
    <PageContainer className="space-y-4">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">Exam Fee Structures</h2>
      {notice && (
        <NoticeAlert
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
      <GlobalFilterBar
        leading={(
          <RadioGroup
            value={mode}
            onValueChange={(v) => setMode(v as 'university' | 'college')}
            className="flex items-center gap-10"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="university" id="feeModeUniversity" />
              <Label htmlFor="feeModeUniversity" className="text-[13px] font-medium cursor-pointer">Is For University</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="college" id="feeModeCollege" />
              <Label htmlFor="feeModeCollege" className="text-[13px] font-medium cursor-pointer">Is For College</Label>
            </div>
          </RadioGroup>
        )}
      >
        <GlobalFilterBarRow>
          <GlobalFilterField label="University" icon={Building2}>
            <Select
              value={selectedUniversityId != null ? String(selectedUniversityId) : null}
              onChange={(v) => { if (v) handleUniversityChange(Number(v)) }}
              options={universities.map((u) => ({
                value: String(u.fk_university_id),
                label: String(u.university_code ?? u.university_name ?? '—'),
              }))}
              disabled={loadingFilters}
              placeholder={loadingFilters ? 'Loading…' : 'All universities'}
              isLoading={loadingFilters}
            />
          </GlobalFilterField>
          <GlobalFilterField label="Course" icon={GraduationCap}>
            <Select
              value={selectedCourseId != null ? String(selectedCourseId) : null}
              onChange={(v) => { if (v) handleCourseChange(Number(v)) }}
              options={courses.map((c) => ({
                value: String(c.fk_course_id),
                label: String(c.course_code ?? c.course_name ?? '—'),
              }))}
              disabled={courses.length === 0}
              placeholder="All courses"
            />
          </GlobalFilterField>
          <GlobalFilterField label="Exam Year" icon={Calendar}>
            <Select
              value={selectedAcademicYearId != null ? String(selectedAcademicYearId) : null}
              onChange={(v) => { if (v) handleAcademicYearChange(Number(v)) }}
              options={academicYears.map((a) => ({
                value: String(a.fk_academic_year_id),
                label: String(a.academic_year ?? '—'),
              }))}
              disabled={academicYears.length === 0}
              placeholder="All exam years"
            />
          </GlobalFilterField>
          <GlobalFilterField label="Exam Master" icon={ScrollText}>
            <Select
              value={selectedExamId != null ? String(selectedExamId) : null}
              onChange={(v) => {
                setSelectedExamId(v != null ? Number(v) : null)
                setRows([])
                setHasFetched(false)
              }}
              options={examMasters.map((e) => ({
                value: String(e.examId ?? e.id),
                label: String(e.examName ?? '—'),
              }))}
              disabled={examMasters.length === 0}
              placeholder="All exam masters"
            />
          </GlobalFilterField>
          <GlobalFilterField label="Action" className="global-filter-field--shrink global-filter-field--action">
            <Button onClick={handleGetList} disabled={!selectedExamId || loadingList} className="h-[30px] px-3 text-[12px] shrink-0">
              Get List
            </Button>
          </GlobalFilterField>
        </GlobalFilterBarRow>
      </GlobalFilterBar>

      {hasFetched && (
      <>
      <div className="app-card p-3 flex items-center gap-2">
        <span className="text-[13px] font-medium text-slate-800">Exam Fee Structure :</span>
        <span className="text-[13px] text-[hsl(var(--primary))] font-semibold truncate">{titleLine || '—'}</span>
      </div>

      <TableCard withHeaderBorder={false}>
        <DataTable
          rowData={rows}
          columnDefs={cols}
          loading={loadingList}
          pagination
          toolbar={{
            search: true,
            searchPlaceholder: 'Search exam fee structures…',
            pdfDocumentTitle: 'Exam fee structures',
          }}
          toolbarTrailing={(
            <Button
              size="sm"
              className="h-[30px] px-3 text-[12px]"
              onClick={() => {
                if (!selectedExamId) return
                const uni = universities.find((u) => u.fk_university_id === selectedUniversityId)
                const course = courses.find((c) => c.fk_course_id === selectedCourseId)
                const ay = academicYears.find((a) => a.fk_academic_year_id === selectedAcademicYearId)
                const exam = examMasters.find((e) => (e.examId ?? e.id) === selectedExamId)
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
                })
                router.push(`/admin-examination-management/admin-exam-masters/exam-fee-setup/create?${qp.toString()}`)
              }}
              disabled={!selectedExamId}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Exam Fee Structure
            </Button>
          )}
        />
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
                <label className="flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-3">
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

      <ViewExamFeeStructureModal
        open={viewOpen}
        onClose={() => { setViewOpen(false); setViewing(null) }}
        data={viewing}
      />
    </PageContainer>
  )
}

