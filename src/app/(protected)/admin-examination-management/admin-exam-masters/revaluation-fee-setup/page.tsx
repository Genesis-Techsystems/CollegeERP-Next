'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { format } from 'date-fns'
import { PlusIcon, PencilIcon, TrashIcon } from 'lucide-react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { PageContainer } from '@/components/shared/PageContainer'
import PageHeader from '@/components/layout/PageHeader'
import DataTable from '@/components/data-table/DataTable'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { Button } from '@/components/ui/button'
import { getRevaluationFees, deleteRevaluationFee } from '@/services/revaluation-fee.service'
import { domainList } from '@/services/crud.service'
import type { RevaluationFee } from '@/types/revaluation-fee'
import type { ExamMaster } from '@/types/exam-master'
import RevaluationFeeModal from './RevaluationFeeModal'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RevaluationFeeSetupPage() {
  const [records, setRecords] = useState<RevaluationFee[]>([])
  const [loading, setLoading] = useState(true)
  const [exams, setExams] = useState<ExamMaster[]>([])

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editData, setEditData] = useState<RevaluationFee | null>(null)

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState<RevaluationFee | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // ── Data fetchers ────────────────────────────────────────────────────────

  const loadRecords = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getRevaluationFees()
      setRecords(data)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch active exams for the modal dropdown
  const loadExams = useCallback(async () => {
    try {
      const data = await domainList<ExamMaster>(
        'ExamMaster',
        'isActive==true.order(examName=ASC)',
      )
      setExams(data)
    } catch {
      setExams([])
    }
  }, [])

  useEffect(() => {
    loadRecords()
    loadExams()
  }, [loadRecords, loadExams])

  // ── Delete handler ───────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteTarget?.examFeeStructureId) return
    setIsDeleting(true)
    try {
      await deleteRevaluationFee(deleteTarget.examFeeStructureId)
      setDeleteTarget(null)
      await loadRecords()
    } finally {
      setIsDeleting(false)
    }
  }

  // ── Column definitions ───────────────────────────────────────────────────

  const columnDefs = useMemo<ColDef<RevaluationFee>[]>(
    () => [
      {
        headerName: 'SI.No',
        valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
        width: 70,
        flex: 0,
      },
      {
        field: 'examFeeStructureName',
        headerName: 'Fee Structure Name',
        minWidth: 200,
      },
      {
        field: 'examName',
        headerName: 'Exam',
        minWidth: 180,
        valueGetter: (p) => p.data?.examName ?? '—',
      },
      {
        field: 'collectionStartDate',
        headerName: 'Start Date',
        minWidth: 110,
        valueFormatter: (p) => (p.value ? format(new Date(p.value), 'dd/MM/yyyy') : '—'),
      },
      {
        field: 'collectionEndDate',
        headerName: 'End Date',
        minWidth: 110,
        valueFormatter: (p) => (p.value ? format(new Date(p.value), 'dd/MM/yyyy') : '—'),
      },
      {
        field: 'regFee',
        headerName: 'Regular Fee (₹)',
        minWidth: 130,
        valueFormatter: (p) =>
          p.value != null ? `₹ ${Number(p.value).toFixed(2)}` : '—',
      },
      {
        field: 'supplyFee',
        headerName: 'Supply Fee (₹)',
        minWidth: 130,
        valueFormatter: (p) =>
          p.value != null ? `₹ ${Number(p.value).toFixed(2)}` : '—',
      },
      {
        field: 'isActive',
        headerName: 'Status',
        minWidth: 100,
        cellRenderer: (p: ICellRendererParams<RevaluationFee>) => (
          <StatusBadge status={p.data?.isActive ?? false} />
        ),
      },
      {
        headerName: 'Actions',
        minWidth: 150,
        flex: 0,
        width: 150,
        cellRenderer: (p: ICellRendererParams<RevaluationFee>) => (
          <div className="flex gap-1 items-center h-full">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              title="Edit"
              onClick={() => { setEditData(p.data!); setModalOpen(true) }}
            >
              <PencilIcon className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
              title="Delete"
              onClick={() => setDeleteTarget(p.data!)}
            >
              <TrashIcon className="h-3.5 w-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    [setEditData, setModalOpen, setDeleteTarget],
  )

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <PageContainer>
      <PageHeader
        title="Revaluation Fee Setup"
        subtitle="Configure fee amounts for exam paper revaluation and re-checking"
        action={
          <Button
            size="sm"
            onClick={() => {
              setEditData(null)
              setModalOpen(true)
            }}
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Fee Setup
          </Button>
        }
      />

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <DataTable
          rowData={records}
          columnDefs={columnDefs}
          loading={loading}
          showSearch
          exportCsv
        />
      </div>

      {/* Add / Edit modal */}
      <RevaluationFeeModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditData(null)
        }}
        editData={editData}
        exams={exams}
        onSuccess={loadRecords}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Revaluation Fee Setup"
        description={
          deleteTarget
            ? `Remove fee setup "${deleteTarget.examFeeStructureName}"? This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isLoading={isDeleting}
      />
    </PageContainer>
  )
}
