'use client'

import { PayrollStaffReportPage } from './PayrollStaffReportPage'

export function PrePayrollAuditReportPage() {
  return (
    <PayrollStaffReportPage
      title="Pre Payroll Audit Report"
      reportFlag="payroll_audit"
      usePeriod={false}
      exportFileName="Pre_Payroll_Audit_Report"
    />
  )
}
