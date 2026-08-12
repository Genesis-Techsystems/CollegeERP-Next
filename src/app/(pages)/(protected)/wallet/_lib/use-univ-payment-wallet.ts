"use client";

import { useQuery } from "@tanstack/react-query";
import { QK } from "@/lib/query-keys";
import { listUnivPaymentWallets } from "@/services";
import type { UnivPaymentWallet } from "@/types/univ-wallet";

/** Angular: `listAllDetails(UnivPaymentWalletUrl)` → `paymentWalletDetails[0]`. */
export function useUnivPaymentWallet() {
  const walletQuery = useQuery({
    queryKey: QK.univPaymentWallets.list(),
    queryFn: async () => {
      const rows = await listUnivPaymentWallets();
      return rows[0] ?? null;
    },
  });

  return {
    wallet: walletQuery.data ?? null,
    isLoading: walletQuery.isLoading,
    refetchWallet: walletQuery.refetch,
  };
}

export function walletNumberLabel(
  wallet: { walletNumber?: string | null; univPaymentWalletId?: number } | null,
) {
  if (!wallet) return "—";
  return (
    wallet.walletNumber?.trim() ||
    (wallet.univPaymentWalletId != null
      ? String(wallet.univPaymentWalletId)
      : "—")
  );
}

export function walletBalanceAmount(wallet: UnivPaymentWallet | null) {
  if (!wallet) return null;
  const balance =
    wallet.walletAmount ?? wallet.walletBalance ?? wallet.availableBalance;
  return balance != null && !Number.isNaN(Number(balance))
    ? Number(balance)
    : null;
}

export function formatWalletBalance(wallet: UnivPaymentWallet | null) {
  const balance = walletBalanceAmount(wallet);
  if (balance == null) return "—";
  return balance.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
