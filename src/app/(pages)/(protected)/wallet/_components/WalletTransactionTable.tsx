'use client'

import dynamic from 'next/dynamic'
import { useMemo } from 'react'
import type { UnivPaymentWalletTransaction } from '@/types/univ-wallet'
import { WalletPageLoading } from './WalletPageLoading'
import { buildWalletTransactionColumnDefs } from '../_lib/wallet-transaction-columns'

const DataTable = dynamic(
  () => import('@/common/components/table').then((m) => ({ default: m.DataTable })),
  { loading: () => <WalletPageLoading /> },
)

type WalletTransactionTableProps = {
  rowData: UnivPaymentWalletTransaction[]
  loading?: boolean
  title: string
  searchPlaceholder?: string
  pdfDocumentTitle?: string
  /** When true, omit outer app-card shell (for embedding inside a parent card). */
  embedded?: boolean
  /** Hide the duplicate title inside the DataTable toolbar (Angular passbook uses card header only). */
  hideToolbarTitle?: boolean
  /** Extra class on the table wrapper (e.g. wallet-passbook-table). */
  tableClassName?: string
  /** Flat layout — no inner bordered card around the grid. */
  flat?: boolean
}

export function WalletTransactionTable({
  rowData,
  loading = false,
  title,
  searchPlaceholder = 'Search…',
  pdfDocumentTitle,
  embedded = false,
  hideToolbarTitle = false,
  tableClassName,
  flat = false,
}: WalletTransactionTableProps) {
  const columnDefs = useMemo(() => buildWalletTransactionColumnDefs(), [])

  const innerShellClass = flat || !embedded
    ? 'overflow-hidden'
    : 'rounded-lg border border-border bg-card overflow-hidden'

  const table = (
    <div className={embedded ? 'px-0 pb-0' : 'px-0 pb-0'}>
      <div className={innerShellClass}>
        <div className={tableClassName}>
          <DataTable
            rowData={rowData}
            columnDefs={columnDefs}
            loading={loading}
            pagination
            paginationPageSize={10}
            toolbar={{
              search: true,
              searchPlaceholder,
              pdfDocumentTitle: pdfDocumentTitle ?? title,
            }}
            toolbarLeading={hideToolbarTitle ? undefined : <h2 className="app-card-title">{title}</h2>}
          />
        </div>
      </div>
    </div>
  )

  if (embedded) return table

  return (
    <div className="app-card overflow-hidden">
      {table}
    </div>
  )
}
