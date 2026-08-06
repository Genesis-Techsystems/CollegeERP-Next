import { redirect } from "next/navigation";

/** Angular path under accounts-and-fees → canonical reports route. */
export default function MgtFeeCollectionsAccountsAliasPage() {
  redirect("/reports/admin-fee-reports/mgt-fee-collections");
}
