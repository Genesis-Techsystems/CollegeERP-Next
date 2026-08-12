import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type WalletPassbookHeaderProps = {
  title: string;
  icon?: ReactNode;
  className?: string;
};

/** Angular wallet / passbook card title row — blue icon + title + gold underline. */
export function WalletPassbookHeader({
  title,
  icon,
  className,
}: WalletPassbookHeaderProps) {
  return (
    <div className={cn("border-b-2 border-[#ffcf46] px-6 py-3.5", className)}>
      <div className="flex items-center gap-2 text-[#0c51a4]">
        {icon ?? (
          <span className="material-icons text-[20px] leading-none" aria-hidden>
            account_balance_wallet
          </span>
        )}
        <h2 className="text-lg font-medium leading-tight">{title}</h2>
      </div>
    </div>
  );
}
