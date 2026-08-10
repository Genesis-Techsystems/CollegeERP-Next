import { redirect } from "next/navigation";

/** Angular route alias → React page. */
export default function EnquirersReportAliasPage() {
  redirect("/reports/admin-student-reports/enquiries-report");
}
