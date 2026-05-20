'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { format } from 'date-fns'
import { useSessionContext } from '@/context/SessionContext'
import {
  getExamFilters,
  fetchFeeStructuresByExam,
  fetchFeeStructuresByExamAndCollege,
  deleteFeeStructure,
} from '@/services/exam-fee-setup'
import { getCollegeFilters } from '@/services/exam-master'
import { distinct } from '@/lib/utils'
import { getErrorMessage } from '@/lib/errors'
import { QK } from '@/lib/query-keys'
import type { ExamFeeStructure } from '@/types/exam-fee-setup'
import type { ExamFilterRow } from '@/services/exam-fee-setup'
import type { CollegeWiseFilterRow } from '@/types/exam-master'
import { PlusIcon, PencilIcon, TrashIcon } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout'
import { DataTable } from '@/common/components/table'
import { ConfirmDialog } from '@/common/components/feedback'
import { StatusBadge } from '@/common/components/data-display'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import ExamFeeSetupModal from './ExamFeeSetupModal'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExamFeeSetupPage() {
  const { user } = useSessionContext()
  const queryClient = useQueryClient()

  // ── Mode: 1 = university-wide, 2 = college-specific ────────────────────
  const [mode, setMode] = useState<1 | 2>(1)

  // ── Filter state ────────────────────────────────────────────────────────
  const [allFilterRows, setAllFilterRows] = useState<ExamFilterRow[]>([])
  const [universities, setUniversities] = useState<ExamFilterRow[]>([])
  const [selectedUniversityId, setSelectedUniversityId] = useState<number | null>(null)
  const [courses, setCourses] = useState<ExamFilterRow[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null)
  const [academicYears, setAcademicYears] = useState<ExamFilterRow[]>([])
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<number | null>(null)
  const [exams, setExams] = useState<ExamFilterRow[]>([])
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null)
  const [colleges, setColleges] = useState<CollegeWiseFilterRow[]>([])
  const [selectedCollegeId, setSelectedCollegeId] = useState<number | null>(null)
  // College filter rows — loaded separately for college-specific mode
  const [collegeFilterRows, setCollegeFilterRows] = useState<CollegeWiseFilterRow[]>([])

  // ── Modal / confirm ─────────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRow, setEditingRow] = useState<ExamFeeStructure | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ExamFeeStructure | null>(null)

  // ── Query key ───────────────────────────────────────────────────────────
  const feeQueryKey = useMemo(
    () => ['exam-fee-structure', selectedExamId, mode === 2 ? selectedCollegeId : null],
    [selectedExamId, selectedCollegeId, mode],
  )

  // ── Load exam filters ───────────────────────────────────────────────────
  const { isLoading: loadingFilters, data: filtersResult } = useQuery({
    queryKey: QK.examFeeSetup.filters(user?.employeeId ?? 0),
    queryFn: () => getExamFilters(user?.employeeId ?? 0),
    enabled: !!user,
  })

  // Load college list for college-specific mode (uses same proc as exam-master page)
  const { data: collegeFiltersResult } = useQuery({
    queryKey: QK.collegeFilters.byUser(user?.organizationId ?? 0, user?.employeeId ?? 0),
    queryFn: () => getCollegeFilters(user?.organizationId ?? 0, user?.employeeId ?? 0),
    enabled: !!user,
  })

  useEffect(() => {
    if (collegeFiltersResult) {
      const rows = collegeFiltersResult.filtersData
      setCollegeFilterRows(rows)
      // Re-populate college dropdown if already in college mode with a selected course
      if (mode === 2 && selectedCourseId != null) {
        const filtered = rows.filter((r) => r.fk_course_id === selectedCourseId)
        setColleges(distinct(filtered, (r) => r.fk_college_id))
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collegeFiltersResult])

  // Seed state once filter data arrives
  useEffect(() => {
    if (!filtersResult) return
    const { filterRows } = filtersResult
    setAllFilterRows(filterRows)
    const unis = distinct(filterRows, (r) => r.fk_university_id)
    setUniversities(unis)
    if (unis.length > 0) {
      handleUniversityChange(unis[0].fk_university_id, filterRows)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersResult])

  // ── Load fee structures ─────────────────────────────────────────────────
  const {
    data: feeList = [],
    isLoading: loadingFees,
    error: feesError,
  } = useQuery({
    queryKey: feeQueryKey,
    queryFn: () => {
      if (mode === 1) {
        return fetchFeeStructuresByExam(selectedExamId!)
      }
      return fetchFeeStructuresByExamAndCollege(selectedExamId!, selectedCollegeId!)
    },
    enabled:
      selectedExamId != null && (mode === 1 || (mode === 2 && selectedCollegeId != null)),
  })

  // ── Delete mutation ─────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteFeeStructure(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feeQueryKey })
      setDeleteTarget(null)
    },
  })

  // ── Filter cascade handlers ─────────────────────────────────────────────
  function handleUniversityChange(universityId: number, rowsRef = allFilterRows) {
    setSelectedUniversityId(universityId)
    setSelectedCourseId(null)
    setSelectedAcademicYearId(null)
    setSelectedExamId(null)
    setSelectedCollegeId(null)
    setCourses([])
    setAcademicYears([])
    setExams([])
    setColleges([])

    const filtered = rowsRef.filter((r) => r.fk_university_id === universityId)
    const distinctCourses = distinct(filtered, (r) => r.fk_course_id)
    setCourses(distinctCourses)

    if (distinctCourses.length > 0) {
      handleCourseChange(distinctCourses[0].fk_course_id, universityId, rowsRef)
    }
  }

  function handleCourseChange(
    courseId: number,
    universityId = selectedUniversityId!,
    rowsRef = allFilterRows,
  ) {
    setSelectedCourseId(courseId)
    setSelectedAcademicYearId(null)
    setSelectedExamId(null)
    setSelectedCollegeId(null)
    setAcademicYears([])
    setExams([])
    setColleges([])

    const filtered = rowsRef.filter(
      (r) => r.fk_university_id === universityId && r.fk_course_id === courseId,
    )
    const distinctAY = distinct(filtered, (r) => r.fk_academic_year_id)
    // sort by academic_year DESC, current AY first
    const sorted = [...distinctAY].sort((a, b) => (b.is_curr_ay ?? 0) - (a.is_curr_ay ?? 0))
    const displayList = [...distinctAY].sort((a, b) => {
      return parseInt(b.academic_year ?? '0', 10) - parseInt(a.academic_year ?? '0', 10)
    })
    setAcademicYears(displayList)

    const currentAY = sorted[0]
    if (currentAY?.fk_academic_year_id) {
      handleAcademicYearChange(currentAY.fk_academic_year_id, universityId, courseId, rowsRef)
    }
  }

  function handleAcademicYearChange(
    ayId: number,
    universityId = selectedUniversityId!,
    courseId = selectedCourseId!,
    rowsRef = allFilterRows,
  ) {
    setSelectedAcademicYearId(ayId)
    setSelectedExamId(null)
    setSelectedCollegeId(null)
    setExams([])
    setColleges([])

    const filtered = rowsRef.filter(
      (r) =>
        r.fk_university_id === universityId &&
        r.fk_course_id === courseId &&
        r.fk_academic_year_id === ayId,
    )
    const distinctExams = distinct(filtered, (r) => r.fk_exam_id)
    setExams(distinctExams)

    if (distinctExams.length > 0) {
      handleExamChange(distinctExams[0].fk_exam_id, rowsRef, courseId)
    }
  }

  function handleExamChange(examId: number, _rowsRef = allFilterRows, courseId = selectedCourseId!) {
    setSelectedExamId(examId)
    setSelectedCollegeId(null)
    setColleges([])

    if (mode === 2) {
      // Populate college list from college filter rows (courseId-filtered)
      const filtered = collegeFilterRows.filter((r) => r.fk_course_id === courseId)
      const distinctColleges = distinct(filtered, (r) => r.fk_college_id)
      setColleges(distinctColleges)
    }
  }

  function handleModeChange(newMode: 1 | 2) {
    setMode(newMode)
    setSelectedCollegeId(null)
    setColleges([])
    // Re-run college population when switching to college mode
    if (selectedExamId != null && newMode === 2) {
      const filtered = collegeFilterRows.filter((r) => r.fk_course_id === selectedCourseId)
      const distinctColleges = distinct(filtered, (r) => r.fk_college_id)
      setColleges(distinctColleges)
    }
  }

  // ── Column definitions ──────────────────────────────────────────────────
  const columnDefs = useMemo<ColDef<ExamFeeStructure>[]>(
    () => [
      {
        headerName: 'SI.No',
        valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
        width: 70,
        flex: 0,
      },
      { field: 'examFeeStructureName', headerName: 'Fee Structure Name', minWidth: 200 },
      {
        field: 'regFee',
        headerName: 'Reg Fee (₹)',
        minWidth: 110,
        valueFormatter: (p) => (p.value != null ? `₹${p.value}` : '—'),
      },
      {
        field: 'supplyFee',
        headerName: 'Supply Fee (₹)',
        minWidth: 120,
        valueFormatter: (p) => (p.value != null ? `₹${p.value}` : '—'),
      },
      {
        field: 'collectionStartDate',
        headerName: 'Start Date',
        minWidth: 110,
        valueFormatter: (p) =>
          p.value ? format(new Date(p.value), 'dd/MM/yyyy') : '—',
      },
      {
        field: 'collectionEndDate',
        headerName: 'End Date',
        minWidth: 110,
        valueFormatter: (p) =>
          p.value ? format(new Date(p.value), 'dd/MM/yyyy') : '—',
      },
      {
        field: 'isActive',
        headerName: 'Status',
        minWidth: 100,
        cellRenderer: (p: ICellRendererParams<ExamFeeStructure>) => (
          <StatusBadge status={p.data?.isActive ?? false} />
        ),
      },
      {
        headerName: 'Actions',
        minWidth: 140,
        flex: 0,
        width: 140,
        cellRenderer: (p: ICellRendererParams<ExamFeeStructure>) => (
          <div className="flex gap-1 items-center h-full">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              title="Edit"
              onClick={() => {
                setEditingRow(p.data ?? null)
                setModalOpen(true)
              }}
            >
              <PencilIcon className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
              title="Delete"
              onClick={() => setDeleteTarget(p.data ?? null)}
            >
              <TrashIcon className="h-3.5 w-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    [],
  )

  const canAddFee = selectedExamId != null && (mode === 1 || selectedCollegeId != null)
  const tableVisible = selectedExamId != null && (mode === 1 || selectedCollegeId != null)

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <PageContainer>
      <PageHeader
        title="Exam Fee Setup"
        subtitle="Configure registration and per-subject fees for exams"
        action={
          <Button
            size="sm"
            disabled={!canAddFee}
            onClick={() => {
              setEditingRow(null)
              setModalOpen(true)
            }}
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Fee Structure
          </Button>
        }
      />

      {/* Filter panel */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 mb-5 space-y-4">
        {/* Mode toggle */}
        <RadioGroup
          value={String(mode)}
          onValueChange={(v) => handleModeChange(Number(v) as 1 | 2)}
          className="flex gap-6"
        >
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <RadioGroupItem value="1" />
            <span>University Wide</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <RadioGroupItem value="2" />
            <span>College Specific</span>
          </label>
        </RadioGroup>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* University */}
          <div className="space-y-1">
            <Label>University</Label>
            <Select
              value={selectedUniversityId != null ? String(selectedUniversityId) : undefined}
              onValueChange={(v) => handleUniversityChange(Number(v))}
              disabled={loadingFilters}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select University" />
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

          {/* Course */}
          <div className="space-y-1">
            <Label>Course</Label>
            <Select
              value={selectedCourseId != null ? String(selectedCourseId) : undefined}
              onValueChange={(v) => handleCourseChange(Number(v))}
              disabled={courses.length === 0}
            >
              <SelectTrigger>
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

          {/* Academic Year */}
          <div className="space-y-1">
            <Label>Academic Year</Label>
            <Select
              value={selectedAcademicYearId != null ? String(selectedAcademicYearId) : undefined}
              onValueChange={(v) =>
                handleAcademicYearChange(Number(v))
              }
              disabled={academicYears.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Academic Year" />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map((ay) => (
                  <SelectItem key={ay.fk_academic_year_id} value={String(ay.fk_academic_year_id)}>
                    {ay.academic_year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Exam */}
          <div className="space-y-1">
            <Label>Exam</Label>
            <Select
              value={selectedExamId != null ? String(selectedExamId) : undefined}
              onValueChange={(v) => handleExamChange(Number(v))}
              disabled={exams.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Exam" />
              </SelectTrigger>
              <SelectContent>
                {exams.map((e) => (
                  <SelectItem key={e.fk_exam_id} value={String(e.fk_exam_id)}>
                    {e.exam_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* College — mode 2 only */}
          {mode === 2 && (
            <div className="space-y-1">
              <Label>College</Label>
              <Select
                value={selectedCollegeId != null ? String(selectedCollegeId) : undefined}
                onValueChange={(v) => setSelectedCollegeId(Number(v))}
                disabled={colleges.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select College" />
                </SelectTrigger>
                <SelectContent>
                  {colleges.map((c) => (
                    <SelectItem key={c.fk_college_id} value={String(c.fk_college_id!)}>
                      {c.college_code ?? c.college_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {feesError && (
        <p className="text-sm text-destructive mb-4">{getErrorMessage(feesError)}</p>
      )}

      {/* Table */}
      {tableVisible ? (
        feeList.length === 0 && !loadingFees ? (
          <div className="flex flex-col items-center justify-center h-40 rounded-xl border border-dashed border-slate-200 bg-white text-muted-foreground gap-2">
            <PlusIcon className="h-8 w-8 opacity-30" />
            <p className="text-sm">No fee structures found. Click &ldquo;Add Fee Structure&rdquo; to create one.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <DataTable
              rowData={feeList}
              columnDefs={columnDefs}
              loading={loadingFees}
              pagination
            />
          </div>
        )
      ) : (
        <div className="flex items-center justify-center h-40 rounded-xl border border-dashed border-slate-200 bg-white text-muted-foreground text-sm">
          Select an exam above to view or manage fee structures.
        </div>
      )}

      {/* Add/Edit modal */}
      <ExamFeeSetupModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditingRow(null)
        }}
        row={editingRow}
        context={{
          examId: selectedExamId,
          collegeId: mode === 2 ? selectedCollegeId : null,
          universityId: selectedUniversityId,
        }}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: feeQueryKey })
        }}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleteTarget != null}
        title="Delete Fee Structure"
        description={`Are you sure you want to delete "${deleteTarget?.examFeeStructureName}"? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget?.examFeeStructureId != null) {
            deleteMutation.mutate(deleteTarget.examFeeStructureId)
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </PageContainer>
  )
}
