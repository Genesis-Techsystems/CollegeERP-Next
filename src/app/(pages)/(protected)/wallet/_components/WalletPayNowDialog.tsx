'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getErrorMessage } from '@/lib/errors'
import { toastSuccess } from '@/lib/toast'
import { initiateUnivWalletRecharge } from '@/services'
import type { UnivPaymentWallet } from '@/types/univ-wallet'

type WalletPayNowDialogProps = {
  open: boolean
  onClose: () => void
  wallet: UnivPaymentWallet | null
  onSuccess?: () => void
}

export function WalletPayNowDialog({ open, onClose, wallet, onSuccess }: WalletPayNowDialogProps) {
  const [amount, setAmount] = useState('')

  const payMutation = useMutation({
    mutationFn: async () => {
      if (!wallet?.univPaymentWalletId) throw new Error('Wallet not found')
      await initiateUnivWalletRecharge({
        univPaymentWalletId: wallet.univPaymentWalletId,
        amount: Number(amount),
        collegeId: wallet.collegeId,
        studentId: wallet.studentId,
      })
    },
    onSuccess: () => {
      toastSuccess('Payment initiated. Complete the transaction in the payment gateway.')
      setAmount('')
      onSuccess?.()
      onClose()
    },
  })

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pay Now</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
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
          {payMutation.error ? (
            <p className="text-sm text-destructive">{getErrorMessage(payMutation.error)}</p>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={payMutation.isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!amount || payMutation.isPending || !wallet}
            onClick={() => payMutation.mutate()}
          >
            {payMutation.isPending ? 'Initiating…' : 'Pay Now'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
