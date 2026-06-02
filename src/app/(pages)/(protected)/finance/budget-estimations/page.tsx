'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PrinterIcon } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout'
import { DataTable, TableCard } from '@/common/components/table'
import { Button } from '@/components/ui/button'
import { QK } from '@/lib/query-keys'
import { getErrorMessage } from '@/lib/errors'
import { fetchFinanceBudgetReport } from '@/services'
import { budgetReportColumnDefs } from '../_lib/budget-columns'
import { FinanceBudgetFilters } from '../_components/FinanceBudgetFilters'
import { useFinanceCascade } from '../_lib/use-finance-cascade'

export default function BudgetEstimationReportPage() {
  const cascade = useFinanceCascade()
  const [loadKey, setLoadKey] = useState<string | null>(null)

  const { data: rows = [], isFetching, error } = useQuery({
    queryKey: QK.finBudgetReport('financial_budget_report_est', loadKey ? JSON.parse(loadKey) : {}),
    queryFn: () => fetchFinanceBudgetReport(JSON.parse(loadKey!)),
    enabled: loadKey != null,
  })

  const columnDefs = useMemo(() => budgetReportColumnDefs(), [])

  return (
    <PageContainer>
      <h2 className="app-card-title">Budget Estimation Report</h2>
      <PageHeader
        title="Budget Estimation Report"
        action={
          loadKey && rows.length > 0 ? (
            <Button size="sm" variant="outline" onClick={() => globalThis.print()}>
              <PrinterIcon className="h-4 w-4 mr-1" /> Print
            </Button>
          ) : null
        }
      />
      <FinanceBudgetFilters
        cascade={cascade}
        loadLabel="Generate report"
        loading={isFetching}
        onLoad={() => {
          if (!cascade.filtersValid) return
          setLoadKey(JSON.stringify(cascade.toBudgetParams()))
        }}
      />
      {error ? <p className="text-sm text-destructive">{getErrorMessage(error)}</p> : null}
      {loadKey ? (
        <TableCard withHeaderBorder={false}>
          <DataTable rowData={rows} columnDefs={columnDefs} loading={isFetching} />
        </TableCard>
      ) : null}
    </PageContainer>
  )
}
