'use client'

import { useMemo } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { useQuery } from '@tanstack/react-query'
import { DataTable, TableCard } from '@/common/components/table'
import { StatusBadge } from '@/common/components/data-display'
import { PageContainer, PageHeader } from '@/components/layout'
import { QK } from '@/lib/query-keys'
import { getErrorMessage } from '@/lib/errors'
import { listLeaveApplications } from '@/services'
import { rowIndexGetter } from '@/lib/utils'
import { formatDate } from '@/common/generic-functions'

type LeaveAppRow = Record<string, unknown>

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<LeaveAppRow>,
  empName: { field: 'employeeName', headerName: 'Employee', minWidth: 140 } as ColDef<LeaveAppRow>,
  leaveType: { field: 'leaveTypeName', headerName: 'Leave Type', minWidth: 120 } as ColDef<LeaveAppRow>,
  fromDate: { field: 'fromDate', headerName: 'From', minWidth: 100 } as ColDef<LeaveAppRow>,
  toDate: { field: 'toDate', headerName: 'To', minWidth: 100 } as ColDef<LeaveAppRow>,
  status: { field: 'leaveStatus', headerName: 'Status', minWidth: 110 } as ColDef<LeaveAppRow>,
  isActive: { field: 'isActive', headerName: 'Active', minWidth: 90, flex: 0 } as ColDef<LeaveAppRow>,
}

function activeRenderer(p: ICellRendererParams<LeaveAppRow>) {
  return <StatusBadge status={p.data?.isActive !== false} />
}

function formatDateCell(value: unknown): string {
  if (value == null || value === '') return ''
  return formatDate(String(value))
}

export function LeaveApplicationsPage() {
  const { data: rows = [], isFetching, error } = useQuery({
    queryKey: QK.hrPayroll.leaveApplications(),
    queryFn: listLeaveApplications,
  })

  const columnDefs = useMemo<ColDef<LeaveAppRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.empName,
      COL_DEFS.leaveType,
      { ...COL_DEFS.fromDate, valueFormatter: (p) => formatDateCell(p.value) },
      { ...COL_DEFS.toDate, valueFormatter: (p) => formatDateCell(p.value) },
      COL_DEFS.status,
      { ...COL_DEFS.isActive, cellRenderer: activeRenderer },
    ],
    [],
  )

  return (
    <PageContainer>
      <PageHeader title="Leave Applications" />
      {error ? <p className="text-sm text-destructive px-1">{getErrorMessage(error)}</p> : null}
      <TableCard withHeaderBorder={false}>
        <DataTable rowData={rows} columnDefs={columnDefs} loading={isFetching} />
      </TableCard>
    </PageContainer>
  )
}
