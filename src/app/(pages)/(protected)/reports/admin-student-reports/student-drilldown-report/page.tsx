import { redirect } from "next/navigation";

/** Angular route alias → React page. */
export default function StudentDrilldownReportAliasPage() {
  redirect("/reports/admin-student-reports/studentcount-drilldown-report");
}
