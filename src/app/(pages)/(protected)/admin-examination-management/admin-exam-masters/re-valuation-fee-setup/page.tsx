'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSessionContext } from '@/context/SessionContext'
import { Button } from '@/components/ui/button'
import { TableCard, DataTable } from '@/common/components/table'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { StatusBadge } from '@/common/components/data-display'
import { Select } from '@/common/components/select'
import { distinct } from '@/lib/utils'
import {
  computeCascadeFromRows,
  deriveExamOptions,
  sortAcademicYearsDesc,
} from '@/lib/univ-exam-filter-cascade'
import { buildQuery } from '@/services/crud'
import {
  getUnivExamFiltersForExamFeeSetup,
  getUnivExamRestCollegesForRevaluationFee,
  listExamFeeStructures,
  resolveExamLoginEmpId,
} from '@/services'
import { Pencil, Plus, Filter, ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { PageContainer } from '@/components/layout'
import { format } from 'date-fns'

function statusRenderer(p: ICellRendererParams) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function formatExamMasterLabel(e: {
  examName: string
  fromDate?: unknown
  toDate?: unknown
  isInternalExam?: boolean
  isRegularExam?: boolean
  isSupplyExam?: boolean
}): string {
  let datePart = ''
  try {
    const fd = e.fromDate ? new Date(String(e.fromDate)) : null
    const td = e.toDate ? new Date(String(e.toDate)) : null
    if (fd && !Number.isNaN(fd.getTime()) && td && !Number.isNaN(td.getTime())) {
      datePart = ` (${format(fd, 'dd MMM, yyyy')} - ${format(td, 'dd MMM, yyyy')})`
    }
  } catch {
    datePart = ''
  }
  let tags = ''
  if (e.isInternalExam) tags += ' (Internal)'
  if (e.isRegularExam) tags += ' (Regular)'
  if (e.isSupplyExam) tags += ' (Supple)'
  return `${e.examName}${datePart}${tags}`.trim()
}

function getSuppleFeeText(row: Record<string, unknown>): string {
  const asText = (value: unknown): string => {
    if (value === null || value === undefined) return ''
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value)
    return ''
  }
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
  const direct = asText(row.suppleFee ?? row.supplyFee).trim()
  return direct !== '' ? direct : '—'
}

export default function RevaluationFeeSetupPage() {
  const { user } = useSessionContext()
  const router = useRouter()

  const [loadingFilters, setLoadingFilters] = useState(true)
  const [filtersData, setFiltersData] = useState<any[]>([])
  const [filterOpen, setFilterOpen] = useState(true)

  const [universities, setUniversities] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [academicYears, setAcademicYears] = useState<any[]>([])
  const [examMasters, setExamMasters] = useState<any[]>([])
  const [colleges, setColleges] = useState<any[]>([])

  const [selectedUniversityId, setSelectedUniversityId] = useState<number | null>(null)
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null)
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<number | null>(null)
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null)
  const [selectedCollegeId, setSelectedCollegeId] = useState<number | null>(null)

  const [rows, setRows] = useState<any[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [loadingColleges, setLoadingColleges] = useState(false)

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
      setColleges([])
      setSelectedCollegeId(null)
      setRows([])
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
    setSelectedCollegeId(null)
    setColleges([])
    setRows([])

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
    setSelectedCollegeId(null)
    setColleges([])
    setRows([])

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
    setSelectedCollegeId(null)
    setColleges([])
    setRows([])
    const examOpts = deriveExamOptions(filtersData, selectedUniversityId, selectedCourseId, ayId)
    setExamMasters(examOpts)
    setSelectedExamId(examOpts[0]?.examId ?? null)
  }

  function handleExamChange(examId: number | null) {
    setSelectedExamId(examId)
    setSelectedCollegeId(null)
    setColleges([])
    setRows([])
  }

  useEffect(() => {
    if (!selectedUniversityId || !selectedCourseId || !selectedAcademicYearId || !selectedExamId) {
      setColleges([])
      setSelectedCollegeId(null)
      return
    }
    let cancelled = false
    ;(async () => {
      setLoadingColleges(true)
      try {
        const empId = resolveExamLoginEmpId(user?.employeeId)
        const raw = await getUnivExamRestCollegesForRevaluationFee({
          employeeId: empId,
          universityId: selectedUniversityId,
          courseId: selectedCourseId,
          examId: selectedExamId,
          academicYearId: selectedAcademicYearId,
        })
        if (cancelled) return
        const list = distinct(Array.isArray(raw) ? raw : [], (r: any) => Number(r.fk_college_id))
        setColleges(list)
        // No default college — user must choose; table shows only after selection (Angular parity).
        setSelectedCollegeId(null)
      } catch {
        if (cancelled) return
        setColleges([])
        setSelectedCollegeId(null)
      } finally {
        if (!cancelled) setLoadingColleges(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selectedUniversityId, selectedCourseId, selectedAcademicYearId, selectedExamId, user?.employeeId])

  const loadFeeStructures = useCallback(async () => {
    if (!selectedExamId || !selectedCollegeId) return
    setLoadingList(true)
    try {
      const query = buildQuery({
        'examMaster.examId': selectedExamId,
        'College.collegeId': selectedCollegeId,
        isActive: true,
      })
      const data = await listExamFeeStructures(query)
      setRows(Array.isArray(data) ? data : [])
    } finally {
      setLoadingList(false)
    }
  }, [selectedExamId, selectedCollegeId])

  useEffect(() => {
    if (!selectedExamId || !selectedCollegeId) {
      setRows([])
      return
    }
    void loadFeeStructures()
  }, [selectedExamId, selectedCollegeId, loadFeeStructures])

  const titleLine = useMemo(() => {
    const col = colleges.find((c) => Number(c.fk_college_id) === Number(selectedCollegeId))
    const ay = academicYears.find((a) => Number(a.fk_academic_year_id) === Number(selectedAcademicYearId))
    const course = courses.find((c) => Number(c.fk_course_id) === Number(selectedCourseId))
    const exam = examMasters.find((e) => Number(e.examId ?? e.id) === Number(selectedExamId))
    const parts = [
      col?.college_code ?? col?.college_name,
      ay?.academic_year,
      course?.course_code ?? course?.course_name,
      exam ? formatExamMasterLabel(exam) : null,
    ].filter(Boolean)
    return parts.join(' / ')
  }, [
    colleges,
    selectedCollegeId,
    academicYears,
    selectedAcademicYearId,
    courses,
    selectedCourseId,
    examMasters,
    selectedExamId,
  ])

  const examSelectOptions = useMemo(
    () =>
      examMasters.map((e) => ({
        value: String(e.examId ?? e.id),
        label: formatExamMasterLabel(e),
      })),
    [examMasters],
  )

  const cols = useMemo<ColDef<any>[]>(() => [
    { headerName: 'SI.No', valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, width: 80 },
    { field: 'examFeeStructureName', headerName: 'Re-Valuation Fee Structure', minWidth: 260 },
    {
      headerName: 'Exam Master',
      minWidth: 260,
      valueGetter: (p) => p.data?.examMaster?.examName ?? p.data?.examMasterName ?? p.data?.examName ?? '—',
    },
    {
      headerName: 'Collection Start Date',
      minWidth: 170,
      valueGetter: (p) => {
        const v = p.data?.collectionStartDate ?? p.data?.collectionStartOn ?? p.data?.fromDate
        if (!v) return '—'
        const d = new Date(v)
        return Number.isNaN(d.getTime()) ? String(v) : format(d, 'dd MMM, yyyy')
      },
    },
    {
      headerName: 'Collection End Date',
      minWidth: 170,
      valueGetter: (p) => {
        const v = p.data?.collectionEndDate ?? p.data?.collectionEndOn ?? p.data?.toDate
        if (!v) return '—'
        const d = new Date(v)
        return Number.isNaN(d.getTime()) ? String(v) : format(d, 'dd MMM, yyyy')
      },
    },
    { headerName: 'Regular Fee', minWidth: 130, valueGetter: (p) => p.data?.regularFee ?? p.data?.regFee ?? '—' },
    {
      headerName: 'Supple Fee',
      minWidth: 130,
      valueGetter: (p) => getSuppleFeeText((p.data ?? {}) as Record<string, unknown>),
    },
    { field: 'isActive', headerName: 'Status', minWidth: 110, cellRenderer: statusRenderer },
    {
      headerName: 'Actions',
      minWidth: 110,
      cellRenderer: (p: any) => (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            openEdit(p.data)
          }}
          disabled={!selectedExamId}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      ),
    },
  ], [selectedExamId, colleges, selectedCollegeId, examMasters, courses, academicYears, selectedCourseId, selectedAcademicYearId, router])

  function openEdit(row: any) {
    const selectedExam = examMasters.find((e: any) => Number(e.examId ?? e.id) === Number(selectedExamId))
    const selectedCourse = courses.find((c: any) => Number(c.fk_course_id) === Number(selectedCourseId))
    const selectedYear = academicYears.find((a: any) => Number(a.fk_academic_year_id) === Number(selectedAcademicYearId))
    const id = Number(row?.examFeeStructureId ?? row?.id ?? 0)
    if (!id) return
    const col = colleges.find((c) => Number(c.fk_college_id) === Number(selectedCollegeId))
    const params = new URLSearchParams({
      examFeeStructureId: String(id),
      collegeId: String(selectedCollegeId ?? ''),
      collegeName: String(col?.college_code ?? col?.college_name ?? ''),
      courseId: String(selectedCourseId ?? ''),
      academicYearId: String(selectedAcademicYearId ?? ''),
      examId: String(selectedExamId ?? ''),
      courseName: String(selectedCourse?.course_name ?? selectedCourse?.course_code ?? ''),
      academicYear: String(selectedYear?.academic_year ?? ''),
      examName: String(selectedExam?.examName ?? ''),
      fromDate: String(selectedExam?.fromDate ?? ''),
      toDate: String(selectedExam?.toDate ?? ''),
    })
    router.push(`/admin-examination-management/admin-exam-masters/re-valuation-fee-setup/create?${params.toString()}`)
  }

  function openAdd() {
    const selectedExam = examMasters.find((e: any) => Number(e.examId ?? e.id) === Number(selectedExamId))
    const selectedCourse = courses.find((c: any) => Number(c.fk_course_id) === Number(selectedCourseId))
    const selectedYear = academicYears.find((a: any) => Number(a.fk_academic_year_id) === Number(selectedAcademicYearId))
    const col = colleges.find((c) => Number(c.fk_college_id) === Number(selectedCollegeId))
    const params = new URLSearchParams({
      collegeId: String(selectedCollegeId ?? ''),
      collegeName: String(col?.college_code ?? col?.college_name ?? ''),
      universityId: String(selectedUniversityId ?? ''),
      courseId: String(selectedCourseId ?? ''),
      academicYearId: String(selectedAcademicYearId ?? ''),
      examId: String(selectedExamId ?? ''),
      courseName: String(selectedCourse?.course_name ?? selectedCourse?.course_code ?? ''),
      academicYear: String(selectedYear?.academic_year ?? ''),
      examName: String(selectedExam?.examName ?? ''),
      fromDate: String(selectedExam?.fromDate ?? ''),
      toDate: String(selectedExam?.toDate ?? ''),
    })
    router.push(`/admin-examination-management/admin-exam-masters/re-valuation-fee-setup/create?${params.toString()}`)
  }

  return (
    <PageContainer className="space-y-4">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">
        Exam Re-Valuation Fee Setup
      </h2>
      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center justify-between gap-2">
          <h2 className="app-card-title">Exam Re-Valuation Fee Setup</h2>
          <button
            type="button"
            className="inline-flex shrink-0 items-center gap-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => setFilterOpen((v) => !v)}
            aria-label="Toggle filters"
            aria-expanded={filterOpen}
          >
            <Filter className="h-3.5 w-3.5" aria-hidden />
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${filterOpen ? 'rotate-180' : ''}`} aria-hidden />
          </button>
        </div>
        {filterOpen ? (
          <div className="px-3 py-3 bg-card">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
              <div className="min-w-0 lg:col-span-2">
                <Select
                  label="University"
                  required
                  className="[&_button]:h-8 [&_button]:text-[12px]"
                  value={selectedUniversityId != null ? String(selectedUniversityId) : null}
                  onChange={(v) => {
                    if (!v) return
                    handleUniversityChange(Number(v))
                  }}
                  options={universities.map((u) => ({
                    value: String(u.fk_university_id),
                    label: String(u.university_code ?? u.university_name ?? '—'),
                  }))}
                  disabled={loadingFilters}
                  placeholder={loadingFilters ? 'Loading…' : 'Select University'}
                />
              </div>
              <div className="min-w-0 lg:col-span-2">
                <Select
                  label="Course"
                  required
                  className="[&_button]:h-8 [&_button]:text-[12px]"
                  value={selectedCourseId != null ? String(selectedCourseId) : null}
                  onChange={(v) => {
                    if (!v) return
                    handleCourseChange(Number(v))
                  }}
                  options={courses.map((c) => ({
                    value: String(c.fk_course_id),
                    label: String(c.course_code ?? c.course_name ?? '—'),
                  }))}
                  disabled={courses.length === 0}
                  placeholder="Select Course"
                />
              </div>
              <div className="min-w-0 lg:col-span-2">
                <Select
                  label="Exam Year"
                  required
                  className="[&_button]:h-8 [&_button]:text-[12px]"
                  value={selectedAcademicYearId != null ? String(selectedAcademicYearId) : null}
                  onChange={(v) => {
                    if (!v) return
                    handleAcademicYearChange(Number(v))
                  }}
                  options={academicYears.map((a) => ({
                    value: String(a.fk_academic_year_id),
                    label: String(a.academic_year ?? '—'),
                  }))}
                  disabled={academicYears.length === 0}
                  placeholder="Select Exam Year"
                />
              </div>
              <div className="min-w-0 lg:col-span-4">
                <Select
                  label="Exam Master"
                  required
                  searchable
                  className="[&_button]:h-8 [&_button]:text-[12px]"
                  value={selectedExamId != null ? String(selectedExamId) : null}
                  onChange={(v) => handleExamChange(v != null ? Number(v) : null)}
                  options={examSelectOptions}
                  disabled={examMasters.length === 0}
                  placeholder="Select Exam Master"
                />
              </div>
              <div className="min-w-0 lg:col-span-2">
                <Select
                  label="College"
                  clearable
                  className="[&_button]:h-8 [&_button]:text-[12px]"
                  value={selectedCollegeId != null ? String(selectedCollegeId) : null}
                  onChange={(v) => {
                    setSelectedCollegeId(v != null ? Number(v) : null)
                    setRows([])
                  }}
                  options={colleges.map((c) => ({
                    value: String(c.fk_college_id),
                    label: String(c.college_code ?? c.college_name ?? '—'),
                  }))}
                  disabled={colleges.length === 0 || loadingColleges}
                  placeholder={loadingColleges ? 'Loading…' : colleges.length === 0 ? 'No colleges' : 'Select College'}
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {selectedCollegeId != null && (
        <>
          <div className="app-card p-3 flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-medium text-slate-800">Re-Valuation Fee Structure :</span>
            <span className="text-[13px] text-[hsl(var(--primary))] font-semibold">{titleLine || '—'}</span>
          </div>

          <TableCard withHeaderBorder={false}>
            <DataTable
              rowData={rows}
              columnDefs={cols}
              loading={loadingList}
              pagination
              paginationPageSize={10}
              toolbar={{
                search: true,
                searchPlaceholder: 'Search re-valuation fee structures…',
                pdfDocumentTitle: 'Re-valuation fee structures',
              }}
              toolbarTrailing={(
                <Button
                  size="sm"
                  onClick={openAdd}
                  disabled={!selectedExamId || !selectedCollegeId}
                  className="h-[30px] px-3 text-[12px]"
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add Exam Fee Structure
                </Button>
              )}
            />
          </TableCard>
        </>
      )}
    </PageContainer>
  )
}
