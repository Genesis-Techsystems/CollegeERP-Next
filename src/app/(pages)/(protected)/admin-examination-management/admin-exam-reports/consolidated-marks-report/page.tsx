import { redirect } from "next/navigation";

/** Alias → Angular Reports URL. */
export default function ConsolidatedMarksReportAliasPage() {
  redirect("/reports/admin-exam-reports/consolidated-marks-report");
}
