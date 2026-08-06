import { redirect } from "next/navigation";

/** Angular path alias → React fee-reports page. */
export default function DayWiseFeeReportAliasPage() {
  redirect("/accounts-and-fees/fee-reports/daywise-fee-report");
}
