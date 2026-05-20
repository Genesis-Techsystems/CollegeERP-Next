'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { PlusIcon, PencilIcon, TrashIcon } from 'lucide-react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { PageContainer, PageHeader } from '@/components/layout'
import { DataTable } from '@/common/components/table'
import { ConfirmDialog } from '@/common/components/feedback'
import { StatusBadge } from '@/common/components/data-display'
import { Button } from '@/components/ui/button'
import {
  getInvigilatorRemunerations,
  deleteInvigilatorRemuneration,
} from '@/services/invigilator-remuneration'
import { domainList } from '@/services/crud'
import type { InvigilatorRemuneration } from '@/types/invigilator-remuneration'
import InvigilatorRemunerationModal from './InvigilatorRemunerationModal'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'

// ─── College type for the modal ───────────────────────────────────────────────

interface CollegeOption {
  collegeId: number
  collegeName: string
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InvigilatorRemunerationPage() {
  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editData, setEditData] = useState<InvigilatorRemuneration | null>(null)

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState<InvigilatorRemuneration | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // ── Data fetchers ────────────────────────────────────────────────────────

  const { data: records, isLoading: loading, invalidate: invalidateRecords } = useCrudList({
    queryKey: QK.invigilatorRemuneration.list(),
    queryFn: getInvigilatorRemunerations,
  })

  // Active colleges for the modal dropdown
  const { data: colleges = [] } = useQuery({
    queryKey: ['College', 'active'],
    queryFn: () => domainList<CollegeOption>('College', 'isActive==true'),
  })

  // ── Delete handler ───────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await deleteInvigilatorRemuneration(deleteTarget.examInvgRemunerationId)
      setDeleteTarget(null)
      await invalidateRecords()
    } finally {
      setIsDeleting(false)
    }
  }

  // ── Column definitions ───────────────────────────────────────────────────

  const columnDefs = useMemo<ColDef<InvigilatorRemuneration>[]>(
    () => [
      {
        headerName: 'SI.No',
        valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
        width: 70,
        flex: 0,
      },
      {
        field: 'collegeName',
        headerName: 'College',
        minWidth: 160,
        valueGetter: (p) => p.data?.collegeName ?? p.data?.collegeCode ?? '—',
      },
      {
        field: 'invgdesignationCatDisplayName',
        headerName: 'Designation / Role',
        minWidth: 180,
        valueGetter: (p) =>
          p.data?.invgdesignationCatDisplayName ?? p.data?.invgdesignationCatCode ?? '—',
      },
      {
        field: 'amount',
        headerName: 'Pay Amount',
        minWidth: 120,
        valueFormatter: (p) =>
          p.value != null ? `₹ ${Number(p.value).toFixed(2)}` : '—',
      },
      {
        field: 'fromDate',
        headerName: 'From Date',
        minWidth: 110,
        valueFormatter: (p) => (p.value ? format(new Date(p.value), 'dd/MM/yyyy') : '—'),
      },
      {
        field: 'toDate',
        headerName: 'To Date',
        minWidth: 110,
        valueFormatter: (p) => (p.value ? format(new Date(p.value), 'dd/MM/yyyy') : '—'),
      },
      {
        field: 'isActive',
        headerName: 'Status',
        minWidth: 100,
        cellRenderer: (p: ICellRendererParams<InvigilatorRemuneration>) => (
          <StatusBadge status={p.data?.isActive ?? false} />
        ),
      },
      {
        headerName: 'Actions',
        minWidth: 150,
        flex: 0,
        width: 150,
        cellRenderer: (p: ICellRendererParams<InvigilatorRemuneration>) => (
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
        title="Invigilator Remuneration"
        subtitle="Configure pay rates for exam invigilators by designation"
        action={
          <Button
            onClick={() => {
              setEditData(null)
              setModalOpen(true)
            }}
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Rate
          </Button>
        }
      />

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <DataTable
          rowData={records}
          columnDefs={columnDefs}
          loading={loading}
          exportCsv
          pagination
        />
      </div>

      {/* Add / Edit modal */}
      <InvigilatorRemunerationModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditData(null)
        }}
        editData={editData}
        colleges={colleges}
        onSuccess={invalidateRecords}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Remuneration Rate"
        description={
          deleteTarget
            ? `Remove pay rate for "${deleteTarget.invgdesignationCatDisplayName ?? deleteTarget.invgdesignationCatCode ?? 'this designation'}" at ${deleteTarget.collegeName ?? 'selected college'}? This cannot be undone.`
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
