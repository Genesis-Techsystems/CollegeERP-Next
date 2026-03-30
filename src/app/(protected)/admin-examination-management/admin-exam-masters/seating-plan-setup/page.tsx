'use client'

import { useState, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { format } from 'date-fns'
import { Plus, Pencil, Trash2 } from 'lucide-react'
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
import { distinct } from '@/lib/utils'
import {
  getSeatingPlanRows,
  deleteSeatingPlanRow,
} from '@/services/seating-plan.service'
import { domainList, buildQuery } from '@/services/crud.service'
import type { ExamMaster, CollegeWiseFilterRow } from '@/types/exam-master'
import type { ExamRoomAllotment } from '@/types/seating-plan'
import type { ExamTimetable } from '@/types/exam-timetable'
import SeatingPlanModal from './SeatingPlanModal'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SeatingPlanSetupPage() {
  const { user } = useSessionContext()
  const queryClient = useQueryClient()

  // ── Filter State ──────────────────────────────────────────────────────
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null)
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<number | null>(null)
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null)

  // ── Modal / Confirm State ─────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRow, setEditingRow] = useState<ExamRoomAllotment | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ExamRoomAllotment | null>(null)

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

  // ── Timetable slots (for modal dropdown) ─────────────────────────────
  const { data: timetableSlots = [] } = useQuery({
    queryKey: ['exam-timetable-slots', selectedExamId],
    queryFn: () => {
      if (!selectedExamId) return []
      const query = buildQuery(
        { 'examMaster.examId': selectedExamId, isActive: true },
        { field: 'examDate', direction: 'ASC' },
      )
      return domainList<ExamTimetable>('ExamTimetable', query)
    },
    enabled: !!selectedExamId,
  })

  // ── Seating Plan Rows ─────────────────────────────────────────────────
  const { data: rows = [], isLoading: loadingRows } = useQuery({
    queryKey: ['seating-plan', selectedExamId],
    queryFn: () => getSeatingPlanRows(selectedExamId!),
    enabled: !!selectedExamId,
  })

  // ── Delete Mutation ───────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSeatingPlanRow(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seating-plan'] })
      setDeleteTarget(null)
    },
  })

  // ── Column Definitions ────────────────────────────────────────────────
  const columnDefs = useMemo<ColDef<ExamRoomAllotment>[]>(
    () => [
      { field: 'examRoomAllotmentId', headerName: '#', width: 70 },
      {
        headerName: 'Exam Date',
        field: 'examDate',
        valueFormatter: ({ value }) =>
          value ? format(new Date(value), 'dd/MM/yyyy') : '—',
        width: 130,
      },
      { field: 'examSessionName', headerName: 'Session', width: 140 },
      { field: 'roomCode', headerName: 'Room Code', width: 130 },
      { field: 'totalRows', headerName: 'Rows', width: 80 },
      { field: 'totalColumns', headerName: 'Columns', width: 90 },
      { field: 'roomStrength', headerName: 'Capacity', width: 100 },
      { field: 'bookedSeats', headerName: 'Booked', width: 90 },
      { field: 'blockedSeats', headerName: 'Blocked', width: 90 },
      { field: 'availableSeats', headerName: 'Available', width: 100 },
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
        cellRenderer: ({ data }: ICellRendererParams<ExamRoomAllotment>) =>
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
                className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
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
    queryClient.invalidateQueries({ queryKey: ['seating-plan'] })
  }, [queryClient])

  // ── Filter cascade resets ─────────────────────────────────────────────
  const handleCourseChange = (val: string) => {
    setSelectedCourseId(Number(val))
    setSelectedAcademicYearId(null)
    setSelectedExamId(null)
  }

  const handleAcademicYearChange = (val: string) => {
    setSelectedAcademicYearId(Number(val))
    setSelectedExamId(null)
  }

  return (
    <PageContainer>
      <PageHeader
        title="Seating Plan Setup"
        subtitle="Assign exam rooms and configure seating capacity for each exam session"
        action={
          selectedExamId ? (
            <Button onClick={handleAddNew} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Room Allotment
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
            onValueChange={(val) => setSelectedExamId(Number(val))}
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
      </div>

      {/* ── Table ───────────────────────────────────────────────────── */}
      {selectedExamId ? (
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
      ) : (
        <div className="flex items-center justify-center h-40 border border-dashed rounded-lg text-muted-foreground text-sm">
          Select a course, academic year, and exam to view the seating plan.
        </div>
      )}

      {/* ── Modal ───────────────────────────────────────────────────── */}
      {modalOpen && selectedExamId && (
        <SeatingPlanModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          row={editingRow}
          examId={selectedExamId}
          timetableSlots={timetableSlots}
          onSaved={handleSaved}
        />
      )}

      {/* ── Delete Confirm ───────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Remove Room Allotment"
        description={
          deleteTarget
            ? `Remove room "${deleteTarget.roomCode ?? deleteTarget.roomId}" from this exam slot? This action cannot be undone.`
            : ''
        }
        confirmLabel="Remove"
        confirmVariant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() =>
          deleteTarget && deleteMutation.mutate(deleteTarget.examRoomAllotmentId)
        }
        onCancel={() => setDeleteTarget(null)}
      />
    </PageContainer>
  )
}
