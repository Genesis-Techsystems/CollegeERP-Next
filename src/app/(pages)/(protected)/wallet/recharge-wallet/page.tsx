'use client'

import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { BookMarked } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { Select } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { getErrorMessage } from '@/lib/errors'
import { toastSuccess } from '@/lib/toast'
import { initiateUnivWalletRecharge, listUnivPaymentWallets } from '@/services'
import type { UnivPaymentWallet } from '@/types/univ-wallet'

export default function RechargeWalletPage() {
  const [walletId, setWalletId] = useState(0)
  const [amount, setAmount] = useState('')

  const { data: wallets = [] } = useCrudList<UnivPaymentWallet>({
    queryKey: QK.univPaymentWallets.list(),
    queryFn: listUnivPaymentWallets,
  })

  const walletOptions = useMemo(
    () => wallets.map((w) => ({
      value: String(w.univPaymentWalletId),
      label: [w.collegeCode, w.studentCode, w.studentName].filter(Boolean).join(' / ') || String(w.univPaymentWalletId),
    })),
    [wallets],
  )

  const rechargeMutation = useMutation({
    mutationFn: async () => {
      const selected = wallets.find((w) => w.univPaymentWalletId === walletId)
      await initiateUnivWalletRecharge({
        univPaymentWalletId: walletId,
        amount: Number(amount),
        collegeId: selected?.collegeId,
        studentId: selected?.studentId,
      })
    },
    onSuccess: () => {
      toastSuccess('Payment initiated. Complete the transaction in the payment gateway.')
      setAmount('')
    },
  })

  return (
    <PageContainer className="space-y-4">
      <div className="app-card p-3 border-t-[3px] border-t-amber-300">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <BookMarked className="h-4 w-4 text-blue-700 shrink-0" aria-hidden />
          <h2 className="app-card-title">Recharge Wallet</h2>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[240px] flex-1">
            <Select
              label="Payment wallet"
              required
              value={walletId ? String(walletId) : null}
              onChange={(v) => setWalletId(v ? Number(v) : 0)}
              options={walletOptions}
              placeholder="Select wallet"
            />
          </div>
          <div className="min-w-[160px] flex-1 space-y-1.5">
            <Label>Amount</Label>
            <Input
              type="number"
              min="1"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
            />
          </div>
          <Button
            type="button"
            className="shrink-0 ml-auto"
            disabled={!walletId || !amount || rechargeMutation.isPending}
            onClick={() => rechargeMutation.mutate()}
          >
            {rechargeMutation.isPending ? 'Initiating…' : 'Recharge'}
          </Button>
        </div>
        {rechargeMutation.error ? (
          <p className="mt-3 text-sm text-destructive">{getErrorMessage(rechargeMutation.error)}</p>
        ) : null}
        <p className="mt-3 text-xs text-muted-foreground">
          Uses PayPhi university payment initiation (`PayPhi/univInitiatePayment`), same as Angular wallet recharge.
        </p>
      </div>
    </PageContainer>
  )
}
