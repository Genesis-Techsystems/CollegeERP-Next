import { redirect } from "next/navigation";

/** Angular path alias → Reports fee-reports page. */
export default function ConcessionListAccountsAliasPage() {
  redirect("/reports/admin-fee-reports/concession-list");
}
