'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ColDef, ICellRendererParams, CellClickedEvent } from 'ag-grid-community'
import { PlusIcon, CalendarClock } from 'lucide-react'
import { useSessionContext } from '@/context/SessionContext'
import { PageContainer } from '@/components/shared/PageContainer'
import PageHeader from '@/components/layout/PageHeader'
import DataTable from '@/components/data-table/DataTable'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { getExamSessions, deleteExamSession } from '@/services/exam-session.service'
import type { ExamSession } from '@/types/exam-session'
import ExamSessionModal from './ExamSessionModal'

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Format "HH:mm:ss" or "HH:mm" to "HH:MM AM/PM" for display */
function formatTime(val: string | undefined | null): string {
  if (!val) return '—'
  const [hStr, mStr] = val.split(':')
  const h = parseInt(hStr, 10)
  const m = parseInt(mStr, 10)
  if (isNaN(h) || isNaN(m)) return val
  const period = h >= 12 ? 'PM' : 'AM'
  const display12 = h % 12 || 12
  return `${String(display12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExamSessionPage() {
  const { user } = useSessionContext()
  const queryClient = useQueryClient()

  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<ExamSession | null>(null)
  const [deleteItem, setDeleteItem] = useState<ExamSession | null>(null)

  // ── Data ────────────────────────────────────────────────────────────────
  const { data = [], isLoading } = useQuery({
    queryKey: ['exam-sessions'],
    queryFn: () => getExamSessions(),
    enabled: !!user,
  })

  // ── Delete mutation ──────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteExamSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-sessions'] })
      setDeleteItem(null)
    },
    onError: () => {
      setDeleteItem(null)
    },
  })

  // ── Columns ──────────────────────────────────────────────────────────────
  const columnDefs = useMemo<ColDef<ExamSession>[]>(
    () => [
      {
        headerName: 'SI.No',
        valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
        width: 80,
        flex: 0,
        sortable: false,
        filter: false,
      },
      {
        field: 'universityCode',
        headerName: 'University Code',
        minWidth: 150,
      },
      {
        field: 'examSessionName',
        headerName: 'Session Name',
        minWidth: 200,
      },
      {
        field: 'examsessioninCatCode',
        headerName: 'Session In',
        minWidth: 130,
      },
      {
        field: 'sessionStartTime',
        headerName: 'Start Time',
        width: 130,
        valueFormatter: (p) => formatTime(p.value as string),
      },
      {
        field: 'sessionEndTime',
        headerName: 'End Time',
        width: 130,
        valueFormatter: (p) => formatTime(p.value as string),
      },
      {
        field: 'isActive',
        headerName: 'Status',
        width: 110,
        cellRenderer: (p: ICellRendererParams<ExamSession>) => (
          <StatusBadge status={p.value as boolean} />
        ),
      },
      {
        headerName: 'Actions',
        width: 160,
        sortable: false,
        filter: false,
        cellRenderer: (p: ICellRendererParams<ExamSession>) => (
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
    []
  )

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <PageContainer>
      <PageHeader
        title="Exam Sessions"
        subtitle="Manage exam time slots (e.g. Morning 9AM–12PM, Afternoon 2PM–5PM)"
        action={
          <Button
            size="sm"
            onClick={() => {
              setEditItem(null)
              setModalOpen(true)
            }}
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Session
          </Button>
        }
      />

      <DataTable
        rowData={data}
        columnDefs={columnDefs}
        loading={isLoading}
        showSearch
        pagination
        paginationPageSize={20}
      />
      {!isLoading && data.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <CalendarClock className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm">No records found</p>
        </div>
      )}

      <ExamSessionModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditItem(null)
        }}
        editData={editItem}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['exam-sessions'] })}
      />

      <ConfirmDialog
        open={!!deleteItem}
        title="Delete Exam Session"
        description={`Delete "${deleteItem?.examSessionName}"? This cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={() => deleteItem && deleteMutation.mutate(deleteItem.examSessionId)}
        onCancel={() => setDeleteItem(null)}
        isLoading={deleteMutation.isPending}
      />
    </PageContainer>
  )
}
