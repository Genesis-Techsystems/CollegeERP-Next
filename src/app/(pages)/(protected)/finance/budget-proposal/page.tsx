'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageContainer } from '@/components/layout'
import { DataTable, TableCard } from '@/common/components/table'
import { Select } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { QK } from '@/lib/query-keys'
import { getErrorMessage } from '@/lib/errors'
import {
  addFinBudgetAllocationList,
  fetchFinanceBudgetDetails,
  listFinCategoriesByCollegeAndAccountType,
  listFinSubCategoriesByCategory,
} from '@/services'
import { budgetReportColumnDefs } from '../_lib/budget-columns'
import { FinanceBudgetFilters } from '../_components/FinanceBudgetFilters'
import { useFinanceCascade } from '../_lib/use-finance-cascade'

export default function BudgetProposalPage() {
  const cascade = useFinanceCascade({ withAccountType: true })
  const queryClient = useQueryClient()
  const [loadKey, setLoadKey] = useState<string | null>(null)
  const [finCategoryId, setFinCategoryId] = useState(0)
  const [finSubCategoryId, setFinSubCategoryId] = useState(0)
  const [proposedAmount, setProposedAmount] = useState('')

  const { data: rows = [], isFetching, error } = useQuery({
    queryKey: QK.finBudgetReport('financial_budget_details', loadKey ? JSON.parse(loadKey) : {}),
    queryFn: () => fetchFinanceBudgetDetails(JSON.parse(loadKey!)),
    enabled: loadKey != null,
  })

  const { data: categories = [] } = useQuery({
    queryKey: QK.finCategories.byCollegeAccountType(cascade.collegeId, cascade.accountTypeId),
    queryFn: () => listFinCategoriesByCollegeAndAccountType(cascade.collegeId, cascade.accountTypeId),
    enabled: cascade.collegeId > 0 && cascade.accountTypeId > 0,
  })

  const { data: subCategories = [] } = useQuery({
    queryKey: QK.finSubCategories.byCategory(finCategoryId),
    queryFn: () => listFinSubCategoriesByCategory(finCategoryId),
    enabled: finCategoryId > 0,
  })

  const addMutation = useMutation({
    mutationFn: async () => {
      await addFinBudgetAllocationList([
        {
          accountEntityId: cascade.accountEntityId,
          financialYearId: cascade.financialYearId,
          accountTypeId: cascade.accountTypeId,
          finCategoryId,
          finSubCategoryId,
          nextyrProposedAmount: Number(proposedAmount),
          collegeId: cascade.collegeId,
        },
      ])
    },
    onSuccess: async () => {
      setProposedAmount('')
      setFinCategoryId(0)
      setFinSubCategoryId(0)
      if (loadKey) {
        await queryClient.invalidateQueries({
          queryKey: QK.finBudgetReport('financial_budget_details', JSON.parse(loadKey)),
        })
      }
    },
  })

  const columnDefs = useMemo(() => budgetReportColumnDefs(), [])

  return (
    <PageContainer>
      <h2 className="app-card-title">Budget Proposal</h2>
      <FinanceBudgetFilters
        cascade={cascade}
        showAccountType
        loadLabel="Load proposal"
        loading={isFetching}
        onLoad={() => {
          if (!cascade.filtersValid || !cascade.accountTypeId) return
          setLoadKey(JSON.stringify(cascade.toBudgetParams()))
        }}
      />
      {loadKey ? (
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <p className="text-sm font-medium">Add allocation line</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Select
              label="Category"
              value={finCategoryId || undefined}
              onChange={(v) => { setFinCategoryId(Number(v)); setFinSubCategoryId(0) }}
              options={categories.map((c) => ({ value: c.finCategoryId, label: c.categoryName }))}
            />
            <Select
              label="Sub category"
              value={finSubCategoryId || undefined}
              onChange={(v) => setFinSubCategoryId(Number(v))}
              options={subCategories.map((s) => ({ value: s.finSubCategoryId, label: s.subCategoryName }))}
              disabled={!finCategoryId}
            />
            <div className="space-y-1.5">
              <Label>Proposed amount</Label>
              <Input type="number" value={proposedAmount} onChange={(e) => setProposedAmount(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                onClick={() => addMutation.mutate()}
                disabled={addMutation.isPending || !finCategoryId || !proposedAmount}
              >
                {addMutation.isPending ? 'Adding…' : 'Add line'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      {error ? <p className="text-sm text-destructive">{getErrorMessage(error)}</p> : null}
      {loadKey ? (
        <TableCard withHeaderBorder={false}>
          <DataTable rowData={rows} columnDefs={columnDefs} />
        </TableCard>
      ) : null}
    </PageContainer>
  )
}
