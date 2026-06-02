'use client'

import dynamic from 'next/dynamic'
import { FinancePageLoading } from '../_components/FinancePageLoading'

const FinanceBookReportPage = dynamic(
  () => import('../_components/FinanceBookReportPage').then((m) => ({ default: m.FinanceBookReportPage })),
  { loading: () => <FinancePageLoading /> },
)

export default function BankBookPage() {
  return <FinanceBookReportPage title="Bank Book" reportFlag="fin_bank_book" showAccountType />
}
