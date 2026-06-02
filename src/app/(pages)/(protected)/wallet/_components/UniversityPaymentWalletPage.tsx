'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { IndianRupee, Wallet } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { listUnivPaymentWalletTransactions } from '@/services'
import { WalletPayNowDialog } from '../_components/WalletPayNowDialog'
import { WalletPassbookHeader } from '../_components/WalletPassbookHeader'
import { WalletTransactionTable } from '../_components/WalletTransactionTable'
import { WalletPageLoading } from '../_components/WalletPageLoading'
import { useUnivPaymentWallet, walletBalanceAmount, walletNumberLabel } from '../_lib/use-univ-payment-wallet'

export function UniversityPaymentWalletPage() {
  const router = useRouter()
  const [payOpen, setPayOpen] = useState(false)
  const { wallet, isLoading, refetchWallet } = useUnivPaymentWallet()
  const balance = walletBalanceAmount(wallet)

  const { data: transactions = [], isLoading: txLoading, invalidate } = useCrudList({
    queryKey: QK.univPaymentWalletTransactions.list(wallet?.univPaymentWalletId),
    queryFn: () => listUnivPaymentWalletTransactions(wallet?.univPaymentWalletId),
    enabled: !!wallet?.univPaymentWalletId,
  })

  if (isLoading) return <WalletPageLoading />

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="border-b bg-[hsl(var(--primary))] px-4 py-2.5 text-white">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 shrink-0" aria-hidden />
            <h2 className="text-sm font-semibold">University Payment Wallet</h2>
          </div>
        </div>

        <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-stretch">
          <div className="flex min-h-[180px] min-w-[220px] flex-col items-center justify-center rounded-xl border bg-card px-6 py-8 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">Wallet Balance</p>
            <div className="mt-4 flex items-center gap-1 text-3xl font-semibold text-orange-500">
              <IndianRupee className="h-8 w-8" aria-hidden />
              <span className="tabular-nums">
                {balance != null ? balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
              </span>
            </div>
            <p className="mt-6 text-xs text-muted-foreground">Wallet Number</p>
            <p className="mt-1 text-sm font-medium tabular-nums">{walletNumberLabel(wallet)}</p>
          </div>

          <div className="flex flex-col justify-center gap-3 lg:min-w-[160px]">
            <Button
              type="button"
              className="h-10 min-w-[140px]"
              disabled={!wallet}
              onClick={() => setPayOpen(true)}
            >
              Pay Now
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-10 min-w-[140px] bg-amber-400 text-black hover:bg-amber-500"
              onClick={() => router.push('/wallet/university-payment-wallet-transactions')}
            >
              Pass Book
            </Button>
          </div>
        </div>
      </div>

      <div className="app-card overflow-hidden shadow-sm">
        <WalletPassbookHeader title="Recent Transactions" />
        <div className="p-4 pt-3">
          <WalletTransactionTable
            rowData={wallet ? transactions : []}
            loading={txLoading}
            title="Recent Transactions"
            searchPlaceholder="Search"
            pdfDocumentTitle="Recent Wallet Transactions"
            hideToolbarTitle
            embedded
            flat
            tableClassName="wallet-passbook-table"
          />
        </div>
      </div>

      <WalletPayNowDialog
        open={payOpen}
        onClose={() => setPayOpen(false)}
        wallet={wallet}
        onSuccess={() => {
          void refetchWallet()
          void invalidate()
        }}
      />
    </PageContainer>
  )
}

export function UniversityPaymentWalletTransactionsPage() {
  const { wallet, isLoading } = useUnivPaymentWallet()

  const { data: transactions = [], isLoading: txLoading } = useCrudList({
    queryKey: QK.univPaymentWalletTransactions.list(wallet?.univPaymentWalletId),
    queryFn: () => listUnivPaymentWalletTransactions(wallet?.univPaymentWalletId),
    enabled: !!wallet?.univPaymentWalletId,
  })

  if (isLoading) return <WalletPageLoading />

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden shadow-sm">
        <WalletPassbookHeader title="Wallet Transactions" />

        <div className="p-4 pt-3">
          <WalletTransactionTable
            rowData={wallet ? transactions : []}
            loading={txLoading}
            title="Wallet Transactions"
            searchPlaceholder="Search"
            pdfDocumentTitle="University Payment Wallet Transactions"
            hideToolbarTitle
            embedded
            flat
            tableClassName="wallet-passbook-table"
          />
        </div>
      </div>
    </PageContainer>
  )
}
