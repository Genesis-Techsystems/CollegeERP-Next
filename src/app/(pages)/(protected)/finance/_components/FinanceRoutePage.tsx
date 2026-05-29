'use client'

import dynamic from 'next/dynamic'
import type { ComponentType, ReactElement } from 'react'
import { FinancePageLoading } from './FinancePageLoading'
import { getFinanceConfig } from '../_lib/route-config'
import { FinanceDashboardPage } from './FinanceDashboardPage'
import { FinancePlaceholder } from './FinancePlaceholder'

const lazy = (loader: () => Promise<{ default: ComponentType }>) =>
  dynamic(loader, { loading: () => <FinancePageLoading /> })

const AccountsPage = lazy(() => import('../accounts/page'))
const AccountTypesPage = lazy(() => import('../acoounts-types/page'))
const FinanceCategoryPage = lazy(() => import('../finance-category/page'))
const FinanceSubCategoryPage = lazy(() => import('../finance-subcategory/page'))
const BankAccountsPage = lazy(() => import('../bank-accounts/page'))
const ChequeBookPage = lazy(() => import('../check-book/page'))
const TransactionPage = lazy(() => import('../transaction/page'))
const JournalBookPage = lazy(() => import('../journal-book/page'))
const BankBookPage = lazy(() => import('../bank-book/page'))
const CashBookPage = lazy(() => import('../cash-book/page'))
const BudgetMidYearPage = lazy(() => import('../budget/page'))
const BudgetProposalPage = lazy(() => import('../budget-proposal/page'))
const BudgetApprovalPage = lazy(() => import('../budget-approval/page'))
const BudgetEstimationReportPage = lazy(() => import('../budget-estimations/page'))

type FinanceRoutePageProps = { slug: string }

const PAGE_MAP: Record<string, () => ReactElement> = {
  accounts: () => <AccountsPage />,
  'acoounts-types': () => <AccountTypesPage />,
  'finance-category': () => <FinanceCategoryPage />,
  'finance-subcategory': () => <FinanceSubCategoryPage />,
  'bank-accounts': () => <BankAccountsPage />,
  'check-book': () => <ChequeBookPage />,
  transaction: () => <TransactionPage />,
  'journal-book': () => <JournalBookPage />,
  'bank-book': () => <BankBookPage />,
  'cash-book': () => <CashBookPage />,
  budget: () => <BudgetMidYearPage />,
  'budget-proposal': () => <BudgetProposalPage />,
  'budget-approval': () => <BudgetApprovalPage />,
  'budget-estimations': () => <BudgetEstimationReportPage />,
}

export function FinanceRoutePage({ slug }: FinanceRoutePageProps) {
  const config = getFinanceConfig(slug)

  if (config.kind === 'hub' || slug === '' || slug === 'finance-dashboard') {
    return <FinanceDashboardPage />
  }

  const Page = PAGE_MAP[slug]
  if (Page) return <Page />

  return <FinancePlaceholder slug={slug} />
}
