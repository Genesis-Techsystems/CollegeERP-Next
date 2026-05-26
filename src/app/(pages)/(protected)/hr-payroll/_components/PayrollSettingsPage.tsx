'use client'

import { useMemo } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { useQuery } from '@tanstack/react-query'
import { DataTable, TableCard } from '@/common/components/table'
import { StatusBadge } from '@/common/components/data-display'
import { PageContainer, PageHeader } from '@/components/layout'
import { QK } from '@/lib/query-keys'
import { getErrorMessage } from '@/lib/errors'
import { listPayslipSettings } from '@/services'
import { rowIndexGetter } from '@/lib/utils'

type SettingRow = Record<string, unknown>

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<SettingRow>,
  group: { field: 'groupName', headerName: 'Group', minWidth: 120 } as ColDef<SettingRow>,
  field: { field: 'fieldName', headerName: 'Field', minWidth: 140 } as ColDef<SettingRow>,
  college: { field: 'collegeName', headerName: 'College', minWidth: 120 } as ColDef<SettingRow>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 100, flex: 0 } as ColDef<SettingRow>,
}

function statusRenderer(p: ICellRendererParams<SettingRow>) {
  return <StatusBadge status={p.data?.isActive !== false} />
}

export function PayrollSettingsPage() {
  const { data: rows = [], isFetching, error } = useQuery({
    queryKey: QK.hrPayroll.payslipSettings(),
    queryFn: listPayslipSettings,
  })

  const columnDefs = useMemo<ColDef<SettingRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.group,
      COL_DEFS.field,
      COL_DEFS.college,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
    ],
    [],
  )

  return (
    <PageContainer>
      <PageHeader title="Payroll Settings" />
      {error ? <p className="text-sm text-destructive px-1">{getErrorMessage(error)}</p> : null}
      <TableCard withHeaderBorder={false}>
        <DataTable rowData={rows} columnDefs={columnDefs} loading={isFetching} />
      </TableCard>
    </PageContainer>
  )
}
