'use client'

import type { ReactNode } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { rowIndexGetter } from '@/lib/utils'
import type { FinBudgetReportRow } from '@/types/finance'
import { formatFinanceNumber } from './finance-format'

function amountRenderer(p: ICellRendererParams<FinBudgetReportRow>) {
  return <span className="text-xs tabular-nums">{formatFinanceNumber(p.value)}</span>
}

export const BUDGET_REPORT_COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<FinBudgetReportRow>,
  accounttype_name: { field: 'accounttype_name', headerName: 'Account type', minWidth: 130, flex: 1 } as ColDef<FinBudgetReportRow>,
  fin_category_name: { field: 'fin_category_name', headerName: 'Category', minWidth: 130, flex: 1 } as ColDef<FinBudgetReportRow>,
  sub_category_name: { field: 'sub_category_name', headerName: 'Sub category', minWidth: 130, flex: 1 } as ColDef<FinBudgetReportRow>,
  actuals_for_the_prv_yr: {
    field: 'actuals_for_the_prv_yr',
    headerName: 'Previous year actuals',
    minWidth: 120,
    flex: 0.8,
    cellRenderer: amountRenderer,
  } as ColDef<FinBudgetReportRow>,
  approved_amount: {
    field: 'approved_amount',
    headerName: 'Approved amount',
    minWidth: 110,
    flex: 0.8,
    cellRenderer: amountRenderer,
  } as ColDef<FinBudgetReportRow>,
  actual_amount: {
    field: 'actual_amount',
    headerName: 'Actual amount',
    minWidth: 110,
    flex: 0.8,
    cellRenderer: amountRenderer,
  } as ColDef<FinBudgetReportRow>,
  actual_tilldate: {
    field: 'actual_tilldate',
    headerName: 'Actual till date',
    minWidth: 110,
    flex: 0.8,
    cellRenderer: amountRenderer,
  } as ColDef<FinBudgetReportRow>,
  probablesfornext_n_months: {
    field: 'probablesfornext_n_months',
    headerName: 'Probables (next months)',
    minWidth: 130,
    flex: 0.9,
    cellRenderer: amountRenderer,
  } as ColDef<FinBudgetReportRow>,
  nextyr_proposed_amount: {
    field: 'nextyr_proposed_amount',
    headerName: 'Proposed (next year)',
    minWidth: 120,
    flex: 0.8,
    cellRenderer: amountRenderer,
  } as ColDef<FinBudgetReportRow>,
}

const PROPOSED_FIELD = 'nextyr_proposed_amountt' as const

export function budgetReportColumnDefs(
  editableProposed?: (p: ICellRendererParams<FinBudgetReportRow>) => ReactNode,
): ColDef<FinBudgetReportRow>[] {
  return [
    BUDGET_REPORT_COL_DEFS.siNo,
    BUDGET_REPORT_COL_DEFS.accounttype_name,
    BUDGET_REPORT_COL_DEFS.fin_category_name,
    BUDGET_REPORT_COL_DEFS.sub_category_name,
    BUDGET_REPORT_COL_DEFS.actuals_for_the_prv_yr,
    BUDGET_REPORT_COL_DEFS.approved_amount,
    BUDGET_REPORT_COL_DEFS.actual_tilldate,
    BUDGET_REPORT_COL_DEFS.probablesfornext_n_months,
    editableProposed
      ? ({
          field: PROPOSED_FIELD,
          headerName: 'Proposed amount',
          minWidth: 130,
          flex: 0.9,
          cellRenderer: editableProposed,
        } as ColDef<FinBudgetReportRow>)
      : ({
          field: PROPOSED_FIELD,
          headerName: 'Proposed amount',
          minWidth: 120,
          flex: 0.8,
          cellRenderer: amountRenderer,
        } as ColDef<FinBudgetReportRow>),
  ]
}
