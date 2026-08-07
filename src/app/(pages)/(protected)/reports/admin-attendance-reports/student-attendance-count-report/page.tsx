import { redirect } from "next/navigation";

export default function StudentAttendanceCountReportAdminAliasPage() {
  redirect(
    "/reports/admin-attendance-reports/day-wise-attendance-count-report",
  );
}
