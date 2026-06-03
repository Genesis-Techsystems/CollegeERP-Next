'use client'

import { useQuery } from '@tanstack/react-query'
import { useSession } from '@/hooks/useSession'
import { QK } from '@/lib/query-keys'
import { getUnivPaymentWalletForStudent } from '@/services'

export function useUnivPaymentWallet() {
  const { user, isLoading: sessionLoading } = useSession()
  const studentId = user?.studentId ?? 0

  const walletQuery = useQuery({
    queryKey: QK.univPaymentWallets.byStudent(studentId),
    queryFn: () => getUnivPaymentWalletForStudent(studentId),
    enabled: !sessionLoading && studentId > 0,
  })

  return {
    user,
    studentId,
    wallet: walletQuery.data ?? null,
    isLoading: sessionLoading || walletQuery.isLoading,
    refetchWallet: walletQuery.refetch,
  }
}

export function walletNumberLabel(wallet: { walletNumber?: string | null; univPaymentWalletId?: number } | null) {
  if (!wallet) return '—'
  return wallet.walletNumber?.trim() || (wallet.univPaymentWalletId != null ? String(wallet.univPaymentWalletId) : '—')
}

export function walletBalanceAmount(wallet: { walletBalance?: number | null; availableBalance?: number | null } | null) {
  if (!wallet) return null
  const balance = wallet.walletBalance ?? wallet.availableBalance
  return balance != null && !Number.isNaN(Number(balance)) ? Number(balance) : null
}
