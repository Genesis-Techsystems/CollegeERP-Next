import { redirect } from "next/navigation";

/** Nicer alias (no typo) → canonical Angular-parity route. */
export default function CourseDeliveryTrackingAliasPage() {
  redirect("/reports/admin-attendance-reports/course-delivary-tracking-report");
}
