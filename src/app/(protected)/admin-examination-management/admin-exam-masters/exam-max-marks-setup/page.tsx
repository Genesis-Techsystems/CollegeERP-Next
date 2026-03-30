'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { PlusIcon, FileSpreadsheet } from 'lucide-react'
import { useCollegeFilters } from '@/hooks/useCollegeFilters'
import { CollegeFilterPanel } from '@/components/forms/CollegeFilterPanel'
import { fetchMarksSetup } from '@/services/exam-max-marks.service'
import { domainSoftDelete } from '@/services/crud.service'
import { EXAM_MASTERS_API } from '@/config/constants/api'
import { getErrorMessage } from '@/lib/errors'
import type { ExamMarksSetup } from '@/types/exam-max-marks'
import { PageContainer } from '@/components/shared/PageContainer'
import PageHeader from '@/components/layout/PageHeader'
import DataTable from '@/components/data-table/DataTable'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { Button } from '@/components/ui/button'
import ExamMaxMarksModal from './ExamMaxMarksModal'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExamMaxMarksSetupPage() {
  const queryClient = useQueryClient()

  // ── Filter cascade ──────────────────────────────────────────────────────
  const filters = useCollegeFilters({ withRegulations: true })
  const [isForDisabled, setIsForDisabled] = useState(false)

  // ── Modal / confirm state ───────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRow, setEditingRow] = useState<ExamMarksSetup | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ExamMarksSetup | null>(null)

  // ── Query key ───────────────────────────────────────────────────────────
  const marksQueryKey = useMemo(
    () => [
      'exam-marks-setup',
      filters.selectedCourseId,
      filters.selectedRegulationId,
      isForDisabled,
    ],
    [filters.selectedCourseId, filters.selectedRegulationId, isForDisabled],
  )

  // ── Data ────────────────────────────────────────────────────────────────
  const {
    data: marksList = [],
    isLoading: loadingMarks,
    error: marksError,
  } = useQuery({
    queryKey: marksQueryKey,
    queryFn: () =>
      fetchMarksSetup(filters.selectedCourseId!, filters.selectedRegulationId!, isForDisabled),
    enabled: filters.selectedCourseId != null && filters.selectedRegulationId != null,
  })

  // ── Delete mutation ─────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      domainSoftDelete(EXAM_MASTERS_API.EXAM_MARKS_SETUP_ENTITY, 'markssetupId', id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marksQueryKey })
      setDeleteTarget(null)
    },
  })

  // ── Column definitions ──────────────────────────────────────────────────
  const columnDefs = useMemo<ColDef<ExamMarksSetup>[]>(
    () => [
      {
        headerName: 'SI.No',
        valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
        width: 70,
        flex: 0,
      },
      { field: 'marksSetupName', headerName: 'Setup Name', minWidth: 180 },
      { field: 'internalMarks', headerName: 'Internal Marks', minWidth: 130 },
      { field: 'externalMarks', headerName: 'External Marks', minWidth: 130 },
      {
        field: 'passPercentage',
        headerName: 'Internal Pass %',
        minWidth: 130,
        valueFormatter: (p) => (p.value != null ? `${p.value}%` : '—'),
      },
      {
        field: 'externalPassPercentage',
        headerName: 'External Pass %',
        minWidth: 130,
        valueFormatter: (p) => (p.value != null ? `${p.value}%` : '—'),
      },
      {
        field: 'finalIntPercentage',
        headerName: 'Final Int %',
        minWidth: 120,
        valueFormatter: (p) => (p.value != null ? `${p.value}%` : '—'),
      },
      {
        field: 'finalExtPercentage',
        headerName: 'Final Ext %',
        minWidth: 120,
        valueFormatter: (p) => (p.value != null ? `${p.value}%` : '—'),
      },
      {
        field: 'isActive',
        headerName: 'Status',
        minWidth: 100,
        cellRenderer: (p: ICellRendererParams<ExamMarksSetup>) => (
          <StatusBadge status={p.data?.isActive ?? false} />
        ),
      },
      {
        headerName: 'Actions',
        minWidth: 140,
        flex: 0,
        width: 140,
        cellRenderer: (p: ICellRendererParams<ExamMarksSetup>) => (
          <div className="flex gap-2 items-center h-full">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditingRow(p.data ?? null)
                setModalOpen(true)
              }}
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => setDeleteTarget(p.data ?? null)}
            >
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [],
  )

  // ── Render ──────────────────────────────────────────────────────────────
  const canSearch = filters.selectedCourseId != null && filters.selectedRegulationId != null

  return (
    <PageContainer>
      <PageHeader
        title="Exam Marks Setup"
        subtitle="Configure internal and external marks for subject categories"
        action={
          <Button
            size="sm"
            disabled={!canSearch}
            onClick={() => {
              setEditingRow(null)
              setModalOpen(true)
            }}
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Marks Setup
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

      {marksError && (
        <p className="text-sm text-destructive mb-4">{getErrorMessage(marksError)}</p>
      )}

      {canSearch && (
        <>
          <DataTable
            rowData={marksList}
            columnDefs={columnDefs}
            loading={loadingMarks}
            showSearch
            pagination
            paginationPageSize={20}
          />
          {!loadingMarks && marksList.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <FileSpreadsheet className="h-10 w-10 mb-3 opacity-40" />
              <p className="text-sm">No records found</p>
            </div>
          )}
        </>
      )}

      <ExamMaxMarksModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditingRow(null)
        }}
        row={editingRow}
        context={{
          universityId: filters.selectedUniversityId,
          courseId: filters.selectedCourseId,
          regulationId: filters.selectedRegulationId,
          isForDisabled,
        }}
        onSaved={() => queryClient.invalidateQueries({ queryKey: marksQueryKey })}
        queryKey={marksQueryKey}
      />

      <ConfirmDialog
        open={deleteTarget != null}
        title="Delete Marks Setup"
        description={`Are you sure you want to delete "${deleteTarget?.marksSetupName}"? This cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget?.markssetupId != null) {
            deleteMutation.mutate(deleteTarget.markssetupId)
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </PageContainer>
  )
}
