'use client'

/**
 * Angular `staff-grievance/new-suggestion` → `NewSuggestionComponent`.
 */

import { useCallback, useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { format } from 'date-fns'
import { Eye, Pencil, Plus } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ListPage } from '@/components/layout'
import { StatusBadge } from '@/common/components/data-display'
import { Button } from '@/components/ui/button'
import { useSession } from '@/hooks/useSession'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  createCollegeSuggestion,
  listCollegeSuggestionsByUser,
  updateCollegeSuggestion,
} from '@/services'
import {
  NewSuggestionModal,
  SuggestionDetailsModal,
} from './NewSuggestionModal'

type AnyRow = Record<string, unknown>

function positiveId(...candidates: unknown[]): number {
  for (const c of candidates) {
    const n = Number(c)
    if (Number.isFinite(n) && n > 0) return n
  }
  return 0
}

function formatDate(value: unknown): string {
  if (value == null || value === '') return '—'
  const d = new Date(String(value))
  if (Number.isNaN(d.getTime())) return String(value)
  return format(d, 'MMM d, yyyy')
}

export function NewSuggestionsPage() {
  const queryClient = useQueryClient()
  const { user, isLoading: sessionLoading } = useSession()
  const userId = positiveId(user?.userId)
  const organizationId = positiveId(user?.organizationId)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AnyRow | null>(null)
  const [detailsRow, setDetailsRow] = useState<AnyRow | null>(null)
  const [saving, setSaving] = useState(false)

  const ready = userId > 0 && !sessionLoading

  const listQuery = useQuery({
    queryKey: QK.staffSuggestions.byUser(userId),
    queryFn: () => listCollegeSuggestionsByUser(userId),
    enabled: ready,
  })

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: QK.staffSuggestions.byUser(userId),
    })
  }, [queryClient, userId])

  const handleSave = useCallback(
    async (payload: AnyRow) => {
      setSaving(true)
      try {
        const suggestionId = positiveId(payload.suggestionId)
        if (suggestionId > 0) {
          await updateCollegeSuggestion(suggestionId, payload)
          toastSuccess('Suggestion updated successfully.')
        } else {
          await createCollegeSuggestion({
            ...payload,
            organizationId,
          })
          toastSuccess('Suggestion created successfully.')
        }
        setModalOpen(false)
        setEditing(null)
        invalidate()
      } catch (err) {
        toastError(err, 'Failed to save suggestion')
        throw err
      } finally {
        setSaving(false)
      }
    },
    [organizationId, invalidate],
  )

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      {
        headerName: 'SI.No',
        valueGetter: rowIndexGetter,
        width: 70,
        flex: 0,
      },
      {
        field: 'suggestionSubject',
        headerName: 'Suggestion',
        minWidth: 160,
        flex: 1.2,
      },
      {
        field: 'suggestiontypeCatCode',
        headerName: 'Suggestion Type',
        minWidth: 130,
        flex: 1,
      },
      {
        field: 'suggestionforCatCode',
        headerName: 'Suggestion For',
        minWidth: 130,
        flex: 1,
      },
      {
        headerName: 'Suggestion Date',
        minWidth: 130,
        flex: 1,
        valueGetter: (p) => formatDate(p.data?.createdDt),
      },
      {
        headerName: 'Acknowledgement Date',
        minWidth: 150,
        flex: 1,
        valueGetter: (p) => formatDate(p.data?.ackDate),
      },
      {
        headerName: 'Status',
        minWidth: 100,
        flex: 0.8,
        cellRenderer: (p: ICellRendererParams<AnyRow>) => (
          <StatusBadge status={p.data?.isActive !== false} />
        ),
      },
      {
        headerName: 'Actions',
        width: 90,
        flex: 0,
        sortable: false,
        filter: false,
        cellRenderer: (p: ICellRendererParams<AnyRow>) => {
          const row = p.data
          if (!row) return null
          const acknowledged = Boolean(row.isAcknowledged)
          if (acknowledged) {
            return (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => setDetailsRow(row)}
                title="Suggestion Details"
              >
                <Eye className="h-3.5 w-3.5" />
              </Button>
            )
          }
          return (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() => {
                setEditing(row)
                setModalOpen(true)
              }}
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )
        },
      },
    ],
    [],
  )

  return (
    <ListPage
      rowData={listQuery.data ?? []}
      columnDefs={columnDefs}
      loading={!ready || listQuery.isLoading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: 'Search',
      }}
      toolbarTrailing={
        <Button
          size="sm"
          onClick={() => {
            setEditing(null)
            setModalOpen(true)
          }}
        >
          <Plus className="mr-1 h-4 w-4" />
          New Suggestion
        </Button>
      }
    >
      <NewSuggestionModal
        open={modalOpen}
        row={editing}
        userId={userId}
        onClose={() => {
          setModalOpen(false)
          setEditing(null)
        }}
        isSubmitting={saving}
        onSubmit={handleSave}
      />

      <SuggestionDetailsModal
        open={detailsRow !== null}
        row={detailsRow}
        onClose={() => setDetailsRow(null)}
      />
    </ListPage>
  )
}
