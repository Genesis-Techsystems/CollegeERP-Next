'use client'

import { format } from 'date-fns'
import { DatePicker } from '@/common/components/date-picker'
import { Select } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import type { useFinanceCascade } from '../_lib/use-finance-cascade'

type Cascade = ReturnType<typeof useFinanceCascade>

type FinanceReportFiltersProps = {
  cascade: Cascade
  fromDate: Date
  toDate: Date
  onFromDateChange: (d: Date) => void
  onToDateChange: (d: Date) => void
  onGetReport: () => void
  loading?: boolean
  showAccountType?: boolean
}

export function FinanceReportFilters({
  cascade,
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  onGetReport,
  loading,
  showAccountType,
}: FinanceReportFiltersProps) {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <Select
          label="College"
          value={cascade.collegeId || undefined}
          onChange={(v) => cascade.setCollegeId(Number(v))}
          options={cascade.colleges}
          placeholder="Select college"
          isLoading={cascade.isLoading}
        />
        <Select
          label="Entity"
          value={cascade.accountEntityId || undefined}
          onChange={(v) => cascade.setAccountEntityId(Number(v))}
          options={cascade.entities}
          placeholder="Select entity"
          disabled={!cascade.collegeId}
        />
        <Select
          label="Financial year"
          value={cascade.financialYearId || undefined}
          onChange={(v) => cascade.setFinancialYearId(Number(v))}
          options={cascade.years}
          placeholder="Select year"
          disabled={!cascade.accountEntityId}
        />
        {showAccountType ? (
          <Select
            label="Account type"
            value={cascade.accountTypeId || undefined}
            onChange={(v) => cascade.setAccountTypeId(Number(v))}
            options={cascade.accountTypes}
            placeholder="Select account type"
            disabled={!cascade.financialYearId}
          />
        ) : null}
        <div className="space-y-1.5">
          <span className="text-sm font-medium">From date</span>
          <DatePicker value={fromDate} onChange={(d) => d && onFromDateChange(d)} />
        </div>
        <div className="space-y-1.5">
          <span className="text-sm font-medium">To date</span>
          <DatePicker value={toDate} onChange={(d) => d && onToDateChange(d)} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>
          Period: {format(fromDate, 'dd MMM yyyy')} — {format(toDate, 'dd MMM yyyy')}
        </span>
      </div>
      <Button
        type="button"
        onClick={onGetReport}
        disabled={!cascade.filtersValid || loading}
      >
        {loading ? 'Loading…' : 'Get report'}
      </Button>
    </div>
  )
}
