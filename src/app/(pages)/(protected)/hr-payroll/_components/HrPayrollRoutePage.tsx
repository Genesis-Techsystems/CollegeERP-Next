"use client";

import type React from "react";
import { getHrPayrollConfig } from "../_lib/route-config";
import { DepartmentHeadsPage } from "./DepartmentHeadsPage";
import { EmployeeListPage } from "./EmployeeListPage";
import { HrDashboardPage } from "./HrDashboardPage";
import { HrPayrollPlaceholder } from "./HrPayrollPlaceholder";
import { LeaveApplicationsPage } from "./LeaveApplicationsPage";
import { LeaveTypesPage } from "./LeaveTypesPage";
import { LeaveEntitlementPage } from "./LeaveEntitlementPage";
import { EmployeeLeaveAllotmentPage } from "./EmployeeLeaveAllotmentPage";
import { PayrollCategoryPage } from "./PayrollCategoryPage";
import { PayrollCategoryFormPage } from "./PayrollCategoryFormPage";
import { PayrollGroupPage } from "./PayrollGroupPage";
import { PayrollGroupFormPage } from "./PayrollGroupFormPage";
import { PayslipSettingsPage } from "./PayslipSettingsPage";
import { EnterLossOfPayPage } from "./EnterLossOfPayPage";
import { PayslipForEmployeesPage } from "@/app/(pages)/(protected)/hr-payroll/_components/PayslipForEmployeesPage";
import { MonthlyPayslipPage } from "./MonthlyPayslipPage";
import { ViewMonthlyPayslipPage } from "./ViewMonthlyPayslipPage";
import { PrePayrollAuditReportPage } from "./PrePayrollAuditReportPage";
import { MonthlyPayrollReportPage } from "./MonthlyPayrollReportPage";
import { PayrollReportsPage } from "./PayrollReportsPage";
import { AddPerformanceAssessmentPage } from "./AddPerformanceAssessmentPage";
import { AssignReportingManagerPage } from "./AssignReportingManagerPage";
import { PerformanceAssessmentPage } from "./PerformanceAssessmentPage";
import { ReportingManagerPage } from "./ReportingManagerPage";
import { SelfAppraisalPage } from "./SelfAppraisalPage";
import { BiometricEmployeesPage } from "./BiometricEmployeesPage";
import { AssignEmployeeToGroupPage } from "./AssignEmployeeToGroupPage";
import { EmployeePayrollAssignPage } from "./EmployeePayrollAssignPage";
import { EditAssignedEmployeePage } from "./EditAssignedEmployeePage";
import { EmployeeEnrollmentPage } from "./EmployeeEnrollmentPage";
import { EmployeeIdCardsPage } from "./EmployeeIdCardsPage";

const LIST_PAGES: Record<string, () => React.ReactElement> = {
  "department-heads": () => <DepartmentHeadsPage />,
  "employee/employee-list": () => <EmployeeListPage />,
  "employee/reporting-manager": () => <ReportingManagerPage />,
  "payroll/payroll-category": () => <PayrollCategoryPage />,
  "payroll/payroll-group": () => <PayrollGroupPage />,
  "payroll/payroll-settings": () => <PayslipSettingsPage />,
  "payroll/enter-loss-of-pay": () => <EnterLossOfPayPage />,
  "payroll/payslip-for-employees": () => <PayslipForEmployeesPage />,
  "payroll/monthly-playslip": () => <MonthlyPayslipPage />,
  "payroll/pre-payroll-audit-report": () => <PrePayrollAuditReportPage />,
  "payroll/monthly-payroll-report": () => <MonthlyPayrollReportPage />,
  "payroll-reports": () => <PayrollReportsPage />,
  "leave-management/leave-type": () => <LeaveTypesPage />,
  "leave-management/leave-entitlement": () => <LeaveEntitlementPage />,
  "leave-management/employee-leave-allotment": () => (
    <EmployeeLeaveAllotmentPage />
  ),
  "leave-management/leave-application": () => <LeaveApplicationsPage />,
};

type HrPayrollRoutePageProps = { slug: string };

export function HrPayrollRoutePage({ slug }: HrPayrollRoutePageProps) {
  const config = getHrPayrollConfig(slug);

  if (config.kind === "hub" || slug === "hr-dashboard") {
    return <HrDashboardPage />;
  }

  if (slug === "employee/assign-reporting-manager") {
    return <AssignReportingManagerPage />;
  }

  if (slug === "employee/performance-assessment") {
    return <PerformanceAssessmentPage />;
  }

  if (slug === "employee/performance-assessment/add-performance") {
    return <AddPerformanceAssessmentPage />;
  }

  if (slug === "employee/self-appraisal") {
    return <SelfAppraisalPage />;
  }

  if (slug === "employee/biometric-employees") {
    return <BiometricEmployeesPage />;
  }

  if (slug === "employee/id-cards") {
    return <EmployeeIdCardsPage />;
  }

  if (slug === "employee/employee-enrollement") {
    return <EmployeeEnrollmentPage mode="create" />;
  }

  if (slug === "employee/edit-enrollement") {
    return <EmployeeEnrollmentPage mode="edit" />;
  }

  if (slug === "payroll/add-payroll-category") {
    return <PayrollCategoryFormPage mode="add" />;
  }

  if (slug === "payroll/edit-payroll-category") {
    return <PayrollCategoryFormPage mode="edit" />;
  }

  if (slug === "payroll/payroll-group/add-payroll-group") {
    return <PayrollGroupFormPage mode="add" />;
  }

  if (slug === "payroll/payroll-group/edit-payroll-group") {
    return <PayrollGroupFormPage mode="edit" />;
  }

  if (slug === "payroll/payroll-group/assigned-employees/add-employee") {
    return <AssignEmployeeToGroupPage />;
  }

  if (
    slug === "payroll/payroll-group/assigned-employees/add-employee/emp-payroll"
  ) {
    return <EmployeePayrollAssignPage />;
  }

  if (slug === "payroll/payroll-group/assigned-employees/edit-employee") {
    return <EditAssignedEmployeePage />;
  }

  if (slug === "payroll/monthly-playslip/view-monthly-payslip") {
    return <ViewMonthlyPayslipPage />;
  }

  if (slug === "payroll/payslip-for-employees/view-employee-payslip") {
    return <ViewMonthlyPayslipPage backMode="history" />;
  }

  const ListPage = LIST_PAGES[slug];
  if (ListPage) {
    return <ListPage />;
  }

  return <HrPayrollPlaceholder slug={slug} />;
}
