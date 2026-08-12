import {
  formatWalletBalance,
  walletNumberLabel,
} from "../_lib/use-univ-payment-wallet";
import type { UnivPaymentWallet } from "@/types/univ-wallet";

type WalletBalancePanelProps = {
  wallet: UnivPaymentWallet | null;
};

/** Angular university payment wallet balance inset panel. */
export function WalletBalancePanel({ wallet }: WalletBalancePanelProps) {
  const balanceLabel = formatWalletBalance(wallet);
  const displayBalance = balanceLabel === "—" ? "0.00" : balanceLabel;

  return (
    <div className="wallet-balance-panel">
      <p className="text-sm font-medium text-[#64748b]">Wallet Balance</p>
      <p className="mt-4 text-[2.5rem] font-normal leading-none text-[#f59e0b]">
        <span aria-hidden>₹</span>
        <span className="tabular-nums">{displayBalance}</span>
      </p>
      <p className="mt-8 text-xs text-[#64748b]">Wallet Number</p>
      <p className="mt-1 text-sm font-medium tabular-nums text-[#334155]">
        {walletNumberLabel(wallet)}
      </p>
    </div>
  );
}
