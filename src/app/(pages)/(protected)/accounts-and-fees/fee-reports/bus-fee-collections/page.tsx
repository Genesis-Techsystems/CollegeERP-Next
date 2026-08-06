import { redirect } from "next/navigation";

/** Angular path under accounts-and-fees → canonical reports route. */
export default function BusFeeCollectionsAccountsAliasPage() {
  redirect("/reports/admin-fee-reports/bus-fee-collections");
}
