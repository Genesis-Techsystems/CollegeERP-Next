import { redirect } from "next/navigation";

/**
 * Angular `reports/student-attendance-reports/daily-attendance-report`
 * (College / AY / Course / Group / Year / Section / Date).
 * Implemented on the period-wise day-attendance page (same API & filters).
 */
export default function DailyAttendanceReportAliasPage() {
  redirect(
    "/reports/student-attendance-reports/daily-attendance-period-wise-report",
  );
}
