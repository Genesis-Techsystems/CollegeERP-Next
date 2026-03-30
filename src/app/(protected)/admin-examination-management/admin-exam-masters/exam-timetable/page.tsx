'use client'

import { useState, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { format } from 'date-fns'
import { Plus, Pencil, Trash2, CalendarSearch } from 'lucide-react'
import { useSessionContext } from '@/context/SessionContext'
import { PageContainer } from '@/components/shared/PageContainer'
import PageHeader from '@/components/layout/PageHeader'
import DataTable from '@/components/data-table/DataTable'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { getCollegeFilters } from '@/services/exam-master.service'
import { getExamTimetables, deleteExamTimetable } from '@/services/exam-timetable.service'
import { domainList, buildQuery } from '@/services/crud.service'
import { distinct } from '@/lib/utils'
import type { ExamMaster, CollegeWiseFilterRow, CourseYear } from '@/types/exam-master'
import type { ExamTimetable } from '@/types/exam-timetable'
import ExamTimetableModal from './ExamTimetableModal'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExamTimetablePage() {
  const { user } = useSessionContext()
  const queryClient = useQueryClient()

  // ── Filter State ──────────────────────────────────────────────────────
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null)
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<number | null>(null)
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null)
  const [selectedCourseYearId, setSelectedCourseYearId] = useState<number | null>(null)

  // ── Modal / Confirm State ─────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRow, setEditingRow] = useState<ExamTimetable | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ExamTimetable | null>(null)

  // ── College Filters ───────────────────────────────────────────────────
  const { data: filterResult, isLoading: loadingFilters } = useQuery({
    queryKey: ['college-filters', user?.organizationId, user?.employeeId],
    queryFn: () => getCollegeFilters(user?.organizationId ?? 0, user?.employeeId ?? 0),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  })

  const courses = useMemo(() => {
    if (!filterResult) return []
    return distinct(filterResult.filtersData, (r) => r.fk_course_id)
  }, [filterResult])

  const academicYears = useMemo(() => {
    if (!filterResult) return []
    return distinct(filterResult.academicData, (r) => r.fk_academic_year_id ?? 0).filter(
      (r) => r.fk_academic_year_id,
    )
  }, [filterResult])

  // ── Exam List ─────────────────────────────────────────────────────────
  const { data: exams = [], isLoading: loadingExams } = useQuery({
    queryKey: ['exam-master-list', selectedCourseId, selectedAcademicYearId],
    queryFn: () => {
      if (!selectedCourseId || !selectedAcademicYearId) return []
      const query = buildQuery(
        {
          'Course.courseId': selectedCourseId,
          'AcademicYear.academicYearId': selectedAcademicYearId,
          isActive: true,
        },
        { field: 'createdDt', direction: 'DESC' },
      )
      return domainList<ExamMaster>('ExamMaster', query)
    },
    enabled: !!selectedCourseId && !!selectedAcademicYearId,
  })

  // ── Course Years ──────────────────────────────────────────────────────
  const { data: courseYears = [] } = useQuery({
    queryKey: ['course-years', selectedCourseId],
    queryFn: () =>
      domainList<CourseYear>(
        'CourseYear',
        buildQuery(
          { 'Course.courseId': selectedCourseId!, isActive: true },
          { field: 'sortOrder', direction: 'ASC' },
        ),
      ),
    enabled: !!selectedCourseId,
    staleTime: 5 * 60 * 1000,
  })

  // ── Timetable Rows ────────────────────────────────────────────────────
  const { data: rows = [], isLoading: loadingRows } = useQuery({
    queryKey: ['exam-timetable', selectedExamId, selectedCourseYearId, selectedCourseId],
    queryFn: () =>
      getExamTimetables(selectedExamId!, selectedCourseYearId ?? undefined, selectedCourseId ?? undefined),
    enabled: !!selectedExamId,
  })

  // ── Delete Mutation ───────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteExamTimetable(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-timetable'] })
      setDeleteTarget(null)
    },
  })

  // ── Column Definitions ────────────────────────────────────────────────
  const columnDefs = useMemo<ColDef<ExamTimetable>[]>(
    () => [
      { field: 'examTimetableId', headerName: '#', width: 70 },
      { field: 'groupCode', headerName: 'Group', width: 110 },
      { field: 'regulationCode', headerName: 'Regulation', width: 120 },
      { field: 'subjectCode', headerName: 'Subject Code', width: 130 },
      { field: 'subjectName', headerName: 'Subject', flex: 1, minWidth: 160 },
      { field: 'examTypeCatCode', headerName: 'Exam Type', width: 120 },
      {
        headerName: 'Exam Date',
        field: 'examDate',
        valueFormatter: ({ value }) =>
          value ? format(new Date(value), 'dd/MM/yyyy') : '—',
        width: 130,
      },
      { field: 'examSessionName', headerName: 'Session', width: 140 },
      { field: 'courseYearCode', headerName: 'Year', width: 80 },
      {
        headerName: 'Status',
        field: 'isActive',
        width: 100,
        cellRenderer: ({ value }: ICellRendererParams) => (
          <StatusBadge status={value as boolean} />
        ),
      },
      {
        headerName: 'Actions',
        width: 120,
        sortable: false,
        cellRenderer: ({ data }: ICellRendererParams<ExamTimetable>) =>
          data ? (
            <div className="flex items-center gap-2 py-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => {
                  setEditingRow(data)
                  setModalOpen(true)
                }}
                title="Edit"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                onClick={() => setDeleteTarget(data)}
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : null,
      },
    ],
    [],
  )

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleAddNew = useCallback(() => {
    setEditingRow(null)
    setModalOpen(true)
  }, [])

  const handleSaved = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['exam-timetable'] })
  }, [queryClient])

  const handleCourseChange = (val: string) => {
    setSelectedCourseId(Number(val))
    setSelectedAcademicYearId(null)
    setSelectedExamId(null)
    setSelectedCourseYearId(null)
  }

  const handleAcademicYearChange = (val: string) => {
    setSelectedAcademicYearId(Number(val))
    setSelectedExamId(null)
  }

  const handleExamChange = (val: string) => {
    setSelectedExamId(Number(val))
    setSelectedCourseYearId(null)
  }

  return (
    <PageContainer>
      <PageHeader
        title="Exam Timetable"
        subtitle="Schedule subject exams with dates and sessions for each exam"
        action={
          selectedExamId ? (
            <Button onClick={handleAddNew} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Entry
            </Button>
          ) : undefined
        }
      />

      {/* ── Filters ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-4 mb-6">
        {/* Course */}
        <div className="space-y-1 min-w-[180px]">
          <Label>Course</Label>
          <Select
            value={selectedCourseId?.toString() ?? ''}
            onValueChange={handleCourseChange}
            disabled={loadingFilters}
          >
            <SelectTrigger>
              <SelectValue placeholder={loadingFilters ? 'Loading…' : 'Select course'} />
            </SelectTrigger>
            <SelectContent>
              {courses.map((c) => (
                <SelectItem key={c.fk_course_id} value={c.fk_course_id.toString()}>
                  {c.course_code} — {c.course_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Academic Year */}
        <div className="space-y-1 min-w-[160px]">
          <Label>Academic Year</Label>
          <Select
            value={selectedAcademicYearId?.toString() ?? ''}
            onValueChange={handleAcademicYearChange}
            disabled={!selectedCourseId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select academic year" />
            </SelectTrigger>
            <SelectContent>
              {academicYears.map((ay) => (
                <SelectItem
                  key={ay.fk_academic_year_id}
                  value={(ay.fk_academic_year_id ?? '').toString()}
                >
                  {ay.academic_year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Exam */}
        <div className="space-y-1 min-w-[220px]">
          <Label>Exam</Label>
          <Select
            value={selectedExamId?.toString() ?? ''}
            onValueChange={handleExamChange}
            disabled={!selectedAcademicYearId || loadingExams}
          >
            <SelectTrigger>
              <SelectValue placeholder={loadingExams ? 'Loading…' : 'Select exam'} />
            </SelectTrigger>
            <SelectContent>
              {exams.map((exam) => (
                <SelectItem key={exam.examId} value={exam.examId.toString()}>
                  {exam.examName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Course Year (optional filter) */}
        {selectedExamId && courseYears.length > 0 && (
          <div className="space-y-1 min-w-[140px]">
            <Label>Course Year</Label>
            <Select
              value={selectedCourseYearId?.toString() ?? 'all'}
              onValueChange={(val) => setSelectedCourseYearId(val === 'all' ? null : Number(val))}
            >
              <SelectTrigger>
                <SelectValue placeholder="All years" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All years</SelectItem>
                {courseYears.map((cy) => (
                  <SelectItem key={cy.courseYearId} value={cy.courseYearId.toString()}>
                    {cy.courseYearName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* ── Table ───────────────────────────────────────────────────── */}
      {selectedExamId ? (
        <>
          <DataTable
            rowData={rows}
            columnDefs={columnDefs}
            loading={loadingRows}
            height="500px"
            pagination
            paginationPageSize={20}
            showSearch
            exportCsv
          />
          {!loadingRows && rows.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 h-36 border border-dashed rounded-lg text-muted-foreground mt-2">
              <CalendarSearch className="h-8 w-8 opacity-40" />
              <p className="text-sm">No timetable entries found for the selected exam.</p>
              <p className="text-xs">Use &ldquo;Add Entry&rdquo; above to create the first entry.</p>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 h-40 border border-dashed rounded-lg text-muted-foreground">
          <CalendarSearch className="h-8 w-8 opacity-40" />
          <p className="text-sm">Select a course, academic year, and exam to view the timetable.</p>
        </div>
      )}

      {/* ── Modal ───────────────────────────────────────────────────── */}
      {modalOpen && selectedExamId && selectedCourseId && (
        <ExamTimetableModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          row={editingRow}
          examId={selectedExamId}
          courseId={selectedCourseId}
          onSaved={handleSaved}
        />
      )}

      {/* ── Delete Confirm ───────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Remove Timetable Entry"
        description={
          deleteTarget
            ? `Remove the timetable entry for "${deleteTarget.subjectCode ?? deleteTarget.subjectId}" on ${
                deleteTarget.examDate
                  ? format(new Date(deleteTarget.examDate), 'dd/MM/yyyy')
                  : '—'
              }? This action cannot be undone.`
            : ''
        }
        confirmLabel="Remove"
        confirmVariant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() =>
          deleteTarget && deleteMutation.mutate(deleteTarget.examTimetableId)
        }
        onCancel={() => setDeleteTarget(null)}
      />
    </PageContainer>
  )
}
