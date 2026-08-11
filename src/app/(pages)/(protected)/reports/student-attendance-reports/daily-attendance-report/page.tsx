import { redirect } from "next/navigation";

/**
 * Angular `reports/.../daily-attendance-report` — Student Daily Attendance Report
 * (period matrix). Distinct from `student-daily-attendance-count-report`
 * ("Daily Attendance of Students").
 */
export default function DailyAttendanceReportAliasPage() {
  redirect("/reports/student-attendance-reports/daily-attendance-of-students");
}
