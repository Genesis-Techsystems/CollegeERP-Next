'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { PlusIcon, GraduationCap } from 'lucide-react'
import { useCollegeFilters } from '@/hooks/useCollegeFilters'
import { CollegeFilterPanel } from '@/common/components/forms'
import { getExamGrades, deleteExamGrade } from '@/services/exam-grade'
import type { ExamGrade } from '@/types/exam-grade'
import { PageContainer, PageHeader } from '@/components/layout'
import { DataTable } from '@/common/components/table'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/common/components/feedback'
import { StatusBadge } from '@/common/components/data-display'
import GradeSetupModal from './GradeSetupModal'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GradeSetupPage() {
  const queryClient = useQueryClient()

  // ── Filter cascade ──────────────────────────────────────────────────────
  const filters = useCollegeFilters({ withRegulations: true })
  const [isForDisabled, setIsForDisabled] = useState(false)

  // ── Modal / confirm state ───────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<ExamGrade | null>(null)
  const [deleteItem, setDeleteItem] = useState<ExamGrade | null>(null)

  // ── Query key ───────────────────────────────────────────────────────────
  const gradesQueryKey = useMemo(
    () => ['exam-grades', filters.selectedCourseId, filters.selectedRegulationId, isForDisabled],
    [filters.selectedCourseId, filters.selectedRegulationId, isForDisabled],
  )

  // ── Data ────────────────────────────────────────────────────────────────
  const { data = [], isLoading } = useQuery({
    queryKey: gradesQueryKey,
    queryFn: () =>
      getExamGrades({
        courseId: filters.selectedCourseId!,
        regulationId: filters.selectedRegulationId!,
        isForDisabled,
      }),
    enabled: filters.selectedCourseId != null && filters.selectedRegulationId != null,
  })

  // ── Delete mutation ──────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteExamGrade(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gradesQueryKey })
      setDeleteItem(null)
    },
    onError: () => {
      setDeleteItem(null)
    },
  })

  // ── Columns ──────────────────────────────────────────────────────────────
  const columnDefs = useMemo<ColDef<ExamGrade>[]>(
    () => [
      {
        headerName: 'SI.No',
        valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
        width: 80,
        flex: 0,
        sortable: false,
        filter: false,
      },
      { field: 'gradeCode', headerName: 'Grade Code', width: 130 },
      { field: 'gradeName', headerName: 'Grade Name', width: 130 },
      {
        headerName: 'Score Range (%)',
        minWidth: 150,
        valueGetter: (p) => `${p.data?.minScorePercent ?? 0} – ${p.data?.maxScorePercent ?? 0}`,
      },
      {
        headerName: 'Points Range',
        minWidth: 130,
        valueGetter: (p) => `${p.data?.minPoints ?? 0} – ${p.data?.maxPoints ?? 0}`,
      },
      { field: 'creditPoints', headerName: 'Credit Points', width: 130 },
      {
        field: 'isActive',
        headerName: 'Status',
        width: 110,
        cellRenderer: (p: ICellRendererParams<ExamGrade>) => (
          <StatusBadge status={p.value as boolean} />
        ),
      },
      {
        headerName: 'Actions',
        width: 160,
        sortable: false,
        filter: false,
        cellRenderer: (p: ICellRendererParams<ExamGrade>) => (
          <div className="flex items-center gap-2 h-full">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditItem(p.data ?? null)
                setModalOpen(true)
              }}
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => setDeleteItem(p.data ?? null)}
            >
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [],
  )

  // ── Render ───────────────────────────────────────────────────────────────
  const canSearch = filters.selectedCourseId != null && filters.selectedRegulationId != null

  return (
    <PageContainer>
      <PageHeader
        title="Grade Setup"
        subtitle="Configure grade thresholds — e.g. A+ = 90–100%, used in result processing"
        action={
          <Button
            size="sm"
            disabled={!canSearch}
            onClick={() => {
              setEditItem(null)
              setModalOpen(true)
            }}
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Grade
          </Button>
        }
      />

      <CollegeFilterPanel
        universities={filters.universities}
        selectedUniversityId={filters.selectedUniversityId}
        onUniversityChange={filters.setUniversityId}
        courses={filters.courses}
        selectedCourseId={filters.selectedCourseId}
        onCourseChange={filters.setCourseId}
        regulations={filters.regulations}
        selectedRegulationId={filters.selectedRegulationId}
        onRegulationChange={(id) => filters.setRegulationId(id)}
        isForDisabled={isForDisabled}
        onIsForDisabledChange={setIsForDisabled}
        isLoading={filters.isLoading}
      />

      {canSearch && (
        <>
          <DataTable
            rowData={data}
            columnDefs={columnDefs}
            loading={isLoading}
            pagination
            paginationPageSize={10}
          />
          {!isLoading && data.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <GraduationCap className="h-10 w-10 mb-3 opacity-40" />
              <p className="text-sm">No records found</p>
            </div>
          )}
        </>
      )}

      <GradeSetupModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditItem(null)
        }}
        editData={editItem}
        context={{
          universityId: filters.selectedUniversityId,
          courseId: filters.selectedCourseId,
          regulationId: filters.selectedRegulationId,
          isForDisabled,
        }}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: gradesQueryKey })}
      />

      <ConfirmDialog
        open={!!deleteItem}
        title="Delete Grade"
        description={`Delete grade "${deleteItem?.gradeName}"? This cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={() => deleteItem && deleteMutation.mutate(deleteItem.examGradesId)}
        onCancel={() => setDeleteItem(null)}
        isLoading={deleteMutation.isPending}
      />
    </PageContainer>
  )
}
