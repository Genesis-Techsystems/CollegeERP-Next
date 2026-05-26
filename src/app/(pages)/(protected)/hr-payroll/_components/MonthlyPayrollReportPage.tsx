'use client'

import { PayrollStaffReportPage } from './PayrollStaffReportPage'

export function MonthlyPayrollReportPage() {
  return (
    <PayrollStaffReportPage
      title="Monthly Payroll Report"
      reportFlag="monthly_payroll"
      usePeriod
      exportFileName="Monthly_Payroll_Report"
    />
  )
}
