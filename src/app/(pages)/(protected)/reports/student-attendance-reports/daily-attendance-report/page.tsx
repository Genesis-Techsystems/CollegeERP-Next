import { redirect } from "next/navigation";

/**
 * Menu "Daily Attendance Report" maps to Angular
 * `student-daily-attendance-count-report` (College / AY / Course / Date only).
 */
export default function DailyAttendanceReportAliasPage() {
  redirect(
    "/reports/student-attendance-reports/student-daily-attendance-count-report",
  );
}
