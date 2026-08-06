import { redirect } from "next/navigation";

/** Canonical Angular path is under Reports → admin-fee-reports. */
export default function FeeLedgerAccountsAliasPage() {
  redirect("/reports/admin-fee-reports/fee-ledger");
}
