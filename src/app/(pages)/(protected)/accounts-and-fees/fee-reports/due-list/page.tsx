import { redirect } from "next/navigation";

/** Canonical Angular path is under Reports → admin-fee-reports. */
export default function FeeDueListAccountsAliasPage() {
  redirect("/reports/admin-fee-reports/due-list");
}
