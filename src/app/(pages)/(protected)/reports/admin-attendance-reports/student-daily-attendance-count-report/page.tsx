import { redirect } from "next/navigation";

/** Angular URL alias: `reports/admin-attendance-reports/student-daily-attendance-count-report` */
export default function StudentDailyAttendanceCountReportAliasPage() {
  redirect(
    "/reports/student-attendance-reports/student-daily-attendance-count-report",
  );
}
