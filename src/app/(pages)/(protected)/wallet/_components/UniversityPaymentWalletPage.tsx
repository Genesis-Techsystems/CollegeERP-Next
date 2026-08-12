"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCrudList } from "@/hooks/useCrudList";
import { QK } from "@/lib/query-keys";
import { listUnivPaymentWalletTransactions } from "@/services";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { WalletPayNowDialog } from "./WalletPayNowDialog";
import { WalletPassbookHeader } from "./WalletPassbookHeader";
import { WalletBalancePanel } from "./WalletBalancePanel";
import { WalletTransactionTable } from "./WalletTransactionTable";
import { WalletPageLoading } from "./WalletPageLoading";
import { useUnivPaymentWallet } from "../_lib/use-univ-payment-wallet";

const WALLET_ACTION_BTN =
  "h-10 min-w-[140px] rounded-sm text-sm font-medium shadow-none";

export function UniversityPaymentWalletPage() {
  const router = useRouter();
  const [payOpen, setPayOpen] = useState(false);
  const { wallet, isLoading, refetchWallet } = useUnivPaymentWallet();

  const {
    data: transactions = [],
    isLoading: txLoading,
    invalidate,
  } = useCrudList({
    queryKey: QK.univPaymentWalletTransactions.list(
      wallet?.univPaymentWalletId,
    ),
    queryFn: () =>
      listUnivPaymentWalletTransactions(wallet?.univPaymentWalletId),
    enabled: !!wallet?.univPaymentWalletId,
  });

  if (isLoading) return <WalletPageLoading />;

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden" data-page-first-card="">
        <WalletPassbookHeader title="University Payment Wallet" />

        <div className="flex flex-col items-stretch gap-6 p-6 lg:flex-row lg:items-center">
          <WalletBalancePanel wallet={wallet} />

          <div className="flex flex-col justify-center gap-3 lg:min-w-[160px]">
            <Button
              type="button"
              className={`${WALLET_ACTION_BTN} bg-[#0c51a4] text-white hover:bg-[#0a4488]`}
              disabled={!wallet}
              onClick={() => setPayOpen(true)}
            >
              Pay Now
            </Button>
            <Button
              type="button"
              className={`${WALLET_ACTION_BTN} bg-[#ffcf46] text-black hover:bg-[#f5c638]`}
              onClick={() =>
                router.push("/wallet/university-payment-wallet-transactions")
              }
            >
              Pass Book
            </Button>
          </div>
        </div>
      </div>

      <div className="app-card overflow-hidden">
        <WalletPassbookHeader
          title="Recent Transactions"
          icon={
            <span
              className="material-icons text-[20px] leading-none"
              aria-hidden
            >
              grid_view
            </span>
          }
        />
        <div className="px-6 pb-4 pt-3">
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
          void refetchWallet();
          void invalidate();
        }}
      />
    </PageContainer>
  );
}

export function UniversityPaymentWalletTransactionsPage() {
  const { wallet, isLoading } = useUnivPaymentWallet();

  const { data: transactions = [], isLoading: txLoading } = useCrudList({
    queryKey: QK.univPaymentWalletTransactions.list(
      wallet?.univPaymentWalletId,
    ),
    queryFn: () =>
      listUnivPaymentWalletTransactions(wallet?.univPaymentWalletId),
    enabled: !!wallet?.univPaymentWalletId,
  });

  if (isLoading) return <WalletPageLoading />;

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden" data-page-first-card="">
        <WalletPassbookHeader
          title="Wallet Transactions"
          icon={
            <span
              className="material-icons text-[20px] leading-none"
              aria-hidden
            >
              grid_view
            </span>
          }
        />

        <div className="px-6 pb-4 pt-3">
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
  );
}
