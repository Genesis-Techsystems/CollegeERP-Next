'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PrinterIcon } from 'lucide-react'
import { FilteredListPage } from '@/components/layout'
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
    <FilteredListPage
      title="Budget Estimation Report"
      notice={error ? <p className="text-sm text-destructive">{getErrorMessage(error)}</p> : null}
      filters={(
        <FinanceBudgetFilters
          cascade={cascade}
          loadLabel="Generate report"
          loading={isFetching}
          bare
          onLoad={() => {
            if (!cascade.filtersValid) return
            setLoadKey(JSON.stringify(cascade.toBudgetParams()))
          }}
        />
      )}
      rowData={loadKey ? rows : []}
      columnDefs={columnDefs}
      loading={isFetching}
      toolbar={{
        search: true,
        searchPlaceholder: 'Search report…',
        pdfDocumentTitle: 'Budget Estimation Report',
      }}
      toolbarTrailing={
        loadKey && rows.length > 0 ? (
          <Button size="sm" variant="outline" onClick={() => globalThis.print()}>
            <PrinterIcon className="h-4 w-4 mr-1" /> Print
          </Button>
        ) : null
      }
    />
  )
}
