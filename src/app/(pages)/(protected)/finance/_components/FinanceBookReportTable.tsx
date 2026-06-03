'use client'

import type { ColDef } from 'ag-grid-community'
import { DataTable, TableCard } from '@/common/components/table'
import type { FinBudgetReportRow } from '@/types/finance'

type FinanceBookReportTableProps = {
  rows: FinBudgetReportRow[]
  columnDefs: ColDef<FinBudgetReportRow>[]
  loading?: boolean
}

export function FinanceBookReportTable({ rows, columnDefs, loading }: FinanceBookReportTableProps) {
  return (
    <TableCard withHeaderBorder={false}>
      <DataTable rowData={rows} columnDefs={columnDefs} loading={loading} />
    </TableCard>
  )
}
