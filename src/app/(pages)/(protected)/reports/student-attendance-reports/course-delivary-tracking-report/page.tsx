import { redirect } from "next/navigation";

/** Angular route alias → React page (Angular folder name typo kept). */
export default function CourseDeliveryTrackingReportAliasPage() {
  redirect("/reports/admin-attendance-reports/course-delivary-tracking-report");
}
