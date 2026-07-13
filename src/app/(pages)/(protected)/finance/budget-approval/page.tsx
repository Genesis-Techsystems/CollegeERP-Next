'use client'

import { useCallback, useMemo, useState } from 'react'
import type { ICellRendererParams } from 'ag-grid-community'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FilteredListPage } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { QK } from '@/lib/query-keys'
import { getErrorMessage } from '@/lib/errors'
import { bulkUpdateFinBudgetAllocations, fetchFinanceBudgetReport } from '@/services'
import type { FinBudgetReportRow } from '@/types/finance'
import { budgetReportColumnDefs } from '../_lib/budget-columns'
import { FinanceBudgetFilters } from '../_components/FinanceBudgetFilters'
import { useFinanceCascade } from '../_lib/use-finance-cascade'

function getRowId(row: FinBudgetReportRow): number {
  return Number(row.pk_finbudgetallocation_id ?? 0)
}

function getProposedValue(row: FinBudgetReportRow): number {
  const v = row.nextyr_proposed_amountt ?? row.nextyr_proposed_amount
  return v != null ? Number(v) : 0
}

export default function BudgetApprovalPage() {
  const cascade = useFinanceCascade()
  const queryClient = useQueryClient()
  const [loadKey, setLoadKey] = useState<string | null>(null)
  const [draft, setDraft] = useState<Record<number, number>>({})

  const { data: rows = [], isFetching, error } = useQuery({
    queryKey: QK.finBudgetReport('financial_budget_report', loadKey ? JSON.parse(loadKey) : {}),
    queryFn: () => fetchFinanceBudgetReport(JSON.parse(loadKey!)),
    enabled: loadKey != null,
  })

  const proposedRenderer = useCallback(
    (p: ICellRendererParams<FinBudgetReportRow>) => {
      const row = p.data
      if (!row) return null
      const id = getRowId(row)
      const value = draft[id] ?? getProposedValue(row)
      return (
        <Input
          type="number"
          className="h-8 text-xs"
          value={Number.isNaN(value) ? '' : value}
          onChange={(e) => {
            const n = Number(e.target.value)
            setDraft((d) => ({ ...d, [id]: Number.isNaN(n) ? 0 : n }))
          }}
        />
      )
    },
    [draft],
  )

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = rows
        .map((row) => {
          const id = getRowId(row)
          if (!id) return null
          return {
            finBudgetAllocationId: id,
            approvedAmount: draft[id] ?? getProposedValue(row),
          }
        })
        .filter((r): r is { finBudgetAllocationId: number; approvedAmount: number } => r != null)
      await bulkUpdateFinBudgetAllocations(payload)
    },
    onSuccess: async () => {
      setDraft({})
      if (loadKey) {
        await queryClient.invalidateQueries({
          queryKey: QK.finBudgetReport('financial_budget_report', JSON.parse(loadKey)),
        })
      }
    },
  })

  const columnDefs = useMemo(() => budgetReportColumnDefs(proposedRenderer), [proposedRenderer])

  return (
    <FilteredListPage
      title="Budget Approval"
      notice={error ? <p className="text-sm text-destructive">{getErrorMessage(error)}</p> : undefined}
      filters={(
        <FinanceBudgetFilters
          bare
          cascade={cascade}
          loadLabel="Load for approval"
          loading={isFetching}
          onLoad={() => {
            if (!cascade.filtersValid) return
            setDraft({})
            setLoadKey(JSON.stringify(cascade.toBudgetParams()))
          }}
        />
      )}
      rowData={loadKey ? rows : []}
      columnDefs={columnDefs}
      loading={isFetching}
      toolbar={{ search: true, searchPlaceholder: 'Search budget…' }}
      toolbarTrailing={loadKey ? (
        <Button
          size="sm"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || rows.length === 0}
        >
          {saveMutation.isPending ? 'Saving…' : 'Save approvals'}
        </Button>
      ) : undefined}
    />
  )
}
