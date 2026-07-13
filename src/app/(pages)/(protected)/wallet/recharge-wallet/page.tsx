'use client'

import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { FilteredPage } from '@/components/layout'
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
    <FilteredPage
      title="Recharge Wallet"
      filtersCollapsible={false}
      filters={(
        <div className="flex flex-wrap items-end gap-3">
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
      )}
    >
      {rechargeMutation.error ? (
        <p className="text-sm text-destructive">{getErrorMessage(rechargeMutation.error)}</p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Uses PayPhi university payment initiation (`PayPhi/univInitiatePayment`), same as Angular wallet recharge.
      </p>
    </FilteredPage>
  )
}
