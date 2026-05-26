'use client'

import { useCallback, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { PencilIcon, PlusIcon } from 'lucide-react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { DataTable, TableCard } from '@/common/components/table'
import { StatusBadge } from '@/common/components/data-display'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { QK } from '@/lib/query-keys'
import { getErrorMessage } from '@/lib/errors'
import { DATE_FORMATS } from '@/config/constants/app'
import { listLeaveTypes } from '@/services'
import { rowIndexGetter } from '@/lib/utils'
import { LeaveTypeModal } from './LeaveTypeModal'

type LeaveRow = Record<string, unknown>

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<LeaveRow>,
  leaveName: { field: 'leaveName', headerName: 'Leave', minWidth: 140 } as ColDef<LeaveRow>,
  leaveCode: { field: 'leaveCode', headerName: 'Leave Code', minWidth: 110 } as ColDef<LeaveRow>,
  leaveCount: { field: 'leaveCount', headerName: 'Leave Count', minWidth: 100, flex: 0 } as ColDef<LeaveRow>,
  orgCode: { field: 'orgCode', headerName: 'Organization', minWidth: 120 } as ColDef<LeaveRow>,
  validFrom: { field: 'validFrom', headerName: 'Valid From', minWidth: 120 } as ColDef<LeaveRow>,
  validTo: { field: 'validTo', headerName: 'Valid To', minWidth: 120 } as ColDef<LeaveRow>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 100, flex: 0 } as ColDef<LeaveRow>,
  actions: { headerName: 'Actions', minWidth: 90, flex: 0, width: 90 } as ColDef<LeaveRow>,
}

function dateFormatter(value: unknown): string {
  if (value == null || value === '') return ''
  const d = new Date(String(value))
  if (Number.isNaN(d.getTime())) return String(value)
  return format(d, DATE_FORMATS.DISPLAY)
}

function statusRenderer(p: ICellRendererParams<LeaveRow>) {
  return <StatusBadge status={p.data?.isActive !== false} />
}

function makeActionsRenderer(onEdit: (row: LeaveRow) => void) {
  return (p: ICellRendererParams<LeaveRow>) => {
    const row = p.data
    if (!row) return null
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        aria-label="Edit leave type"
        onClick={() => onEdit(row)}
      >
        <PencilIcon className="h-3.5 w-3.5" />
      </Button>
    )
  }
}

export function LeaveTypesPage() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRow, setEditingRow] = useState<LeaveRow | null>(null)

  const { data: rows = [], isFetching, error } = useQuery({
    queryKey: QK.hrPayroll.leaveTypes(),
    queryFn: listLeaveTypes,
  })

  const onEdit = useCallback((row: LeaveRow) => {
    setEditingRow(row)
    setModalOpen(true)
  }, [])

  const columnDefs = useMemo<ColDef<LeaveRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.leaveName,
      COL_DEFS.leaveCode,
      COL_DEFS.leaveCount,
      COL_DEFS.orgCode,
      { ...COL_DEFS.validFrom, valueFormatter: (p) => dateFormatter(p.value) },
      { ...COL_DEFS.validTo, valueFormatter: (p) => dateFormatter(p.value) },
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(onEdit) },
    ],
    [onEdit],
  )

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: QK.hrPayroll.leaveTypes() })
  }

  function openAdd() {
    setEditingRow(null)
    setModalOpen(true)
  }

  return (
    <PageContainer className="space-y-5">
      {error ? <p className="text-sm text-destructive px-1">{getErrorMessage(error)}</p> : null}

      <TableCard withHeaderBorder={false}>
        <DataTable
          rowData={rows}
          columnDefs={columnDefs}
          loading={isFetching}
          pagination
          toolbar={{
            search: true,
            searchPlaceholder: 'Search leave types…',
            pdfDocumentTitle: 'Leave Types',
          }}
          toolbarTrailing={(
            <Button type="button" size="sm" className="h-8 gap-1" onClick={openAdd}>
              <PlusIcon className="h-3.5 w-3.5" />
              Add Leave Type
            </Button>
          )}
        />
      </TableCard>

      <LeaveTypeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        row={editingRow}
        onSaved={invalidate}
      />
    </PageContainer>
  )
}
