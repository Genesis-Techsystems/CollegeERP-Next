export type HrPayrollPageKind = 'hub' | 'list' | 'report' | 'form' | 'view'

export type HrPayrollPageConfig = {
  slug: string
  title: string
  kind: HrPayrollPageKind
  description?: string
}

export const HR_PAYROLL_HUB_SECTIONS: {
  title: string
  cards: { label: string; href: string; description?: string }[]
}[] = [
  {
    title: 'HR',
    cards: [
      { label: 'HR Dashboard', href: '/hr-payroll/hr-dashboard', description: 'Overview and shortcuts' },
      { label: 'Employee List', href: '/hr-payroll/employee/employee-list' },
      { label: 'Employee Enrolment', href: '/hr-payroll/employee/employee-enrollement' },
      { label: 'Department Heads', href: '/hr-payroll/department-heads' },
      { label: 'Reporting Manager', href: '/hr-payroll/employee/reporting-manager' },
      { label: 'Biometric Employees', href: '/hr-payroll/employee/biometric-employees' },
      { label: 'Attendance Monitor', href: '/hr-payroll/employee/attendance-monitor' },
    ],
  },
  {
    title: 'Leave',
    cards: [
      { label: 'Leave Types', href: '/hr-payroll/leave-management/leave-type' },
      { label: 'Leave Entitlement', href: '/hr-payroll/leave-management/leave-entitlement' },
      { label: 'Employee Leave Allotment', href: '/hr-payroll/leave-management/employee-leave-allotment' },
      { label: 'Apply Leave', href: '/hr-payroll/leave-management/applye-leave' },
      { label: 'Leave Applications', href: '/hr-payroll/leave-management/leave-application' },
      { label: 'Biometric Attendance', href: '/hr-payroll/leave-management/biometric-attendance' },
    ],
  },
  {
    title: 'Payroll',
    cards: [
      { label: 'Payroll Category', href: '/hr-payroll/payroll/payroll-category' },
      { label: 'Payroll Settings', href: '/hr-payroll/payroll/payroll-settings' },
      { label: 'Payroll Groups', href: '/hr-payroll/payroll/payroll-group' },
      { label: 'Payslip For Employees', href: '/hr-payroll/payroll/payslip-for-employees' },
      { label: 'Monthly Payslip', href: '/hr-payroll/payroll/monthly-playslip' },
      { label: 'Pre Payroll Audit', href: '/hr-payroll/payroll/pre-payroll-audit-report' },
      { label: 'Monthly Payroll Report', href: '/hr-payroll/payroll/monthly-payroll-report' },
      { label: 'Enter Loss Of Pay', href: '/hr-payroll/payroll/enter-loss-of-pay' },
      { label: 'Payroll Reports', href: '/hr-payroll/payroll-reports' },
    ],
  },
  {
    title: 'Service Book',
    cards: [
      { label: 'Service Book Entries', href: '/hr-payroll/service-book/service-book-entries' },
      { label: 'Employee Wallet', href: '/hr-payroll/service-book/employee-wallet' },
    ],
  },
]

const LIST_SLUGS: Record<string, string> = {
  'department-heads': 'Department Heads',
  'payroll-reports': 'Payroll Reports',
  'employee/employee-list': 'Employee List',
  'employee/employee-enrollement': 'Employee Enrolment',
  'employee/reporting-manager': 'Reporting Manager',
  'employee/biometric-employees': 'Biometric Employees',
  'employee/attendance-monitor': 'Attendance Monitor',
  'employee/employees-recruitment': 'Employee Recruitment',
  'employee/performance-assessment': 'Performance Assessment',
  'employee/self-appraisal': 'Self Appraisal',
  'employee/id-cards': 'Employee ID Cards',
  'employee/employee-dashboard': 'Employee Dashboard',
  'leave-management/leave-type': 'Leave Types',
  'leave-management/leave-entitlement': 'Leave Entitlement',
  'leave-management/employee-leave-allotment': 'Employee Leave Allotment',
  'leave-management/applye-leave': 'Apply Leave',
  'leave-management/leave-application': 'Leave Applications',
  'leave-management/biometric-attendance': 'Biometric Attendance',
  'payroll/payroll-category': 'Payroll Category',
  'payroll/payroll-settings': 'Payroll Settings',
  'payroll/payroll-group': 'Payroll Groups',
  'payroll/payslip-for-employees': 'Payslip For Employees',
  'payroll/monthly-playslip': 'Monthly Payslip',
  'payroll/pre-payroll-audit-report': 'Pre Payroll Audit Report',
  'payroll/monthly-payroll-report': 'Monthly Payroll Report',
  'payroll/enter-loss-of-pay': 'Enter Loss Of Pay',
  'service-book/service-book-entries': 'Service Book Entries',
  'service-book/employee-wallet': 'Employee Wallet',
}

function titleFromSlug(slug: string): string {
  return (
    LIST_SLUGS[slug] ??
    slug
      .split('/')
      .pop()!
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
  )
}

export const HR_PAYROLL_PAGE_CONFIG: Record<string, HrPayrollPageConfig> = {
  'hr-dashboard': { slug: 'hr-dashboard', title: 'HR Dashboard', kind: 'hub' },
  ...Object.fromEntries(
    Object.keys(LIST_SLUGS).map((slug) => [
      slug,
      { slug, title: titleFromSlug(slug), kind: 'list' as const },
    ]),
  ),
  'employee/edit-enrollement': { slug: 'employee/edit-enrollement', title: 'Edit Enrolment', kind: 'form' },
  'employee/assign-reporting-manager': {
    slug: 'employee/assign-reporting-manager',
    title: 'Assign Reporting Manager',
    kind: 'form',
  },
  'employee/performance-assessment/add-performance': {
    slug: 'employee/performance-assessment/add-performance',
    title: 'Take Performance Assessment',
    kind: 'form',
  },
  'payroll/add-payroll-category': { slug: 'payroll/add-payroll-category', title: 'Add Payroll Category', kind: 'form' },
  'payroll/edit-payroll-category': { slug: 'payroll/edit-payroll-category', title: 'Edit Payroll Category', kind: 'form' },
  'payroll/payroll-group/add-payroll-group': {
    slug: 'payroll/payroll-group/add-payroll-group',
    title: 'Add Payroll Group',
    kind: 'form',
  },
  'payroll/payroll-group/edit-payroll-group': {
    slug: 'payroll/payroll-group/edit-payroll-group',
    title: 'Edit Payroll Group',
    kind: 'form',
  },
  'payroll/payroll-group/assigned-employees': {
    slug: 'payroll/payroll-group/assigned-employees',
    title: 'Assigned Employees',
    kind: 'view',
  },
  'payroll/payroll-group/assigned-employees/add-employee': {
    slug: 'payroll/payroll-group/assigned-employees/add-employee',
    title: 'Add Employee To Group',
    kind: 'form',
  },
  'payroll/payroll-group/assigned-employees/add-employee/emp-payroll': {
    slug: 'payroll/payroll-group/assigned-employees/add-employee/emp-payroll',
    title: 'Employee Payroll',
    kind: 'form',
  },
  'payroll/payroll-group/assigned-employees/edit-employee': {
    slug: 'payroll/payroll-group/assigned-employees/edit-employee',
    title: 'Edit Assigned Employee',
    kind: 'form',
  },
  'payroll/payroll-group/employees-loss-of-pay': {
    slug: 'payroll/payroll-group/employees-loss-of-pay',
    title: 'Employees Loss Of Pay',
    kind: 'view',
  },
  'payroll/payslip-for-employees/view-employee-payslip': {
    slug: 'payroll/payslip-for-employees/view-employee-payslip',
    title: 'View Employee Payslip',
    kind: 'view',
  },
  'payroll/payslip-for-employees/generate-payslip': {
    slug: 'payroll/payslip-for-employees/generate-payslip',
    title: 'Generate Payslip',
    kind: 'form',
  },
  'payroll/payslip-for-employees/view-payslip': {
    slug: 'payroll/payslip-for-employees/view-payslip',
    title: 'View Payslip',
    kind: 'view',
  },
  'payroll/monthly-playslip/view-monthly-payslip': {
    slug: 'payroll/monthly-playslip/view-monthly-payslip',
    title: 'View Monthly Payslip',
    kind: 'view',
  },
}

export function getHrPayrollConfig(slug: string): HrPayrollPageConfig {
  return (
    HR_PAYROLL_PAGE_CONFIG[slug] ?? {
      slug,
      title: titleFromSlug(slug),
      kind: 'view',
    }
  )
}
