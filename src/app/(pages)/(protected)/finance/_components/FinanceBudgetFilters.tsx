'use client'

import type { ReactNode } from 'react'
import { Select, type SelectOption } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import type { useFinanceCascade } from '../_lib/use-finance-cascade'

type Cascade = ReturnType<typeof useFinanceCascade>

type FinanceBudgetFiltersProps = {
  cascade: Cascade
  onLoad: () => void
  loading?: boolean
  loadLabel?: string
  showAccountType?: boolean
  children?: ReactNode
}

function toSelectOptions(items: { value: number; label: string }[]): SelectOption[] {
  return items.map((item) => ({ value: String(item.value), label: item.label }))
}

export function FinanceBudgetFilters({
  cascade,
  onLoad,
  loading,
  loadLabel = 'Load',
  showAccountType,
  children,
}: FinanceBudgetFiltersProps) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[180px] flex-1">
          <Select
            label="College"
            value={cascade.collegeId ? String(cascade.collegeId) : null}
            onChange={(v) => cascade.setCollegeId(v ? Number(v) : 0)}
            options={toSelectOptions(cascade.colleges)}
            placeholder="Select college"
            isLoading={cascade.isLoading}
          />
        </div>
        <div className="min-w-[180px] flex-1">
          <Select
            label="Entity"
            value={cascade.accountEntityId ? String(cascade.accountEntityId) : null}
            onChange={(v) => cascade.setAccountEntityId(v ? Number(v) : 0)}
            options={toSelectOptions(cascade.entities)}
            placeholder="Select entity"
            disabled={!cascade.collegeId}
          />
        </div>
        <div className="min-w-[180px] flex-1">
          <Select
            label="Financial year"
            value={cascade.financialYearId ? String(cascade.financialYearId) : null}
            onChange={(v) => cascade.setFinancialYearId(v ? Number(v) : 0)}
            options={toSelectOptions(cascade.years)}
            placeholder="Select year"
            disabled={!cascade.accountEntityId}
          />
        </div>
        {showAccountType ? (
          <div className="min-w-[180px] flex-1">
            <Select
              label="Account type"
              value={cascade.accountTypeId ? String(cascade.accountTypeId) : null}
              onChange={(v) => cascade.setAccountTypeId(v ? Number(v) : 0)}
              options={toSelectOptions(cascade.accountTypes)}
              placeholder="Select account type"
              disabled={!cascade.financialYearId}
            />
          </div>
        ) : null}
        {children}
        <Button
          type="button"
          className="shrink-0 ml-auto"
          onClick={onLoad}
          disabled={!cascade.filtersValid || loading}
        >
          {loading ? 'Loading…' : loadLabel}
        </Button>
      </div>
    </div>
  )
}
