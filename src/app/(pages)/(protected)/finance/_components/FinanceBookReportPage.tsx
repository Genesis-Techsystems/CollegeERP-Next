'use client'

import { useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { useQuery } from '@tanstack/react-query'
import { format, startOfMonth } from 'date-fns'
import { PageContainer } from '@/components/layout'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { getErrorMessage } from '@/lib/errors'
import { fetchFinanceBookReport } from '@/services'
import type { FinBudgetReportRow } from '@/types/finance'
import { formatFinanceNumber, humanizeFieldKey } from '../_lib/finance-format'
import { useFinanceCascade } from '../_lib/use-finance-cascade'
import { FinanceReportFilters } from './FinanceReportFilters'

const FinanceBookReportTable = dynamic(
  () => import('./FinanceBookReportTable').then((m) => ({ default: m.FinanceBookReportTable })),
  { loading: () => <div className="p-4 text-sm text-muted-foreground">Loading table…</div> },
)

const HIDDEN_KEYS = new Set([
  'pk_fintransaction_id',
  'fk_college_id',
  'fk_acc_entity_id',
  'fk_financial_year_id',
])

function isNumericColumn(key: string, sample: unknown): boolean {
  if (typeof sample === 'number') return true
  return /amount|balance|debit|credit|total|amt/i.test(key)
}

function numberRenderer(p: ICellRendererParams) {
  return <span className="text-xs tabular-nums">{formatFinanceNumber(p.value)}</span>
}

function buildDynamicColumns(rows: FinBudgetReportRow[]): ColDef<FinBudgetReportRow>[] {
  if (!rows.length) return []
  const sample = rows[0]
  const keys = Object.keys(sample).filter((k) => !HIDDEN_KEYS.has(k) && !k.startsWith('fk_'))
  return [
    { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 },
    ...keys.map((key) => {
      const col: ColDef<FinBudgetReportRow> = {
        field: key,
        headerName: humanizeFieldKey(key),
        minWidth: 110,
        flex: 1,
      }
      if (isNumericColumn(key, sample[key])) {
        col.cellRenderer = numberRenderer
      }
      return col
    }),
  ]
}

type FinanceBookReportPageProps = {
  title: string
  reportFlag: string
  showAccountType?: boolean
}

export function FinanceBookReportPage({ title, reportFlag, showAccountType }: FinanceBookReportPageProps) {
  const cascade = useFinanceCascade({ withAccountType: showAccountType })
  const [fromDate, setFromDate] = useState(() => startOfMonth(new Date()))
  const [toDate, setToDate] = useState(() => new Date())
  const [loadKey, setLoadKey] = useState<string | null>(null)

  const { data: rows = [], isFetching, error } = useQuery({
    queryKey: QK.finBookReport(
      reportFlag,
      loadKey ? (JSON.parse(loadKey) as Record<string, string | number>) : {},
    ),
    queryFn: () => {
      const params = JSON.parse(loadKey!) as Record<string, string | number>
      return fetchFinanceBookReport(reportFlag, params)
    },
    enabled: loadKey != null,
  })

  const columnDefs = useMemo(() => buildDynamicColumns(rows), [rows])

  return (
    <PageContainer>
      <h2 className="app-card-title">{title}</h2>
      <FinanceReportFilters
        cascade={cascade}
        fromDate={fromDate}
        toDate={toDate}
        onFromDateChange={setFromDate}
        onToDateChange={setToDate}
        loading={isFetching}
        showAccountType={showAccountType}
        onGetReport={() => {
          if (!cascade.filtersValid) return
          setLoadKey(
            JSON.stringify(
              cascade.toBookParams(
                format(fromDate, 'yyyy-MM-dd'),
                format(toDate, 'yyyy-MM-dd'),
              ),
            ),
          )
        }}
      />
      {error ? <p className="text-sm text-destructive">{getErrorMessage(error)}</p> : null}
      {loadKey ? (
        <FinanceBookReportTable rows={rows} columnDefs={columnDefs} loading={isFetching} />
      ) : null}
    </PageContainer>
  )
}
