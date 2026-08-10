import { redirect } from "next/navigation";

export default function EmployeeAttendanceSummaryReportAliasPage() {
  redirect(
    "/reports/admin-attendance-reports/employee-attendance-summary-report",
  );
}
