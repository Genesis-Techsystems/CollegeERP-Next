import { redirect } from "next/navigation";

export default function StudentAttendanceCountReportAliasPage() {
  redirect(
    "/reports/admin-attendance-reports/day-wise-attendance-count-report",
  );
}
