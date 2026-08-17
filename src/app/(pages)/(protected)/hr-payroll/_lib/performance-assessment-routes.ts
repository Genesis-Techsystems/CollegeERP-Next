/** Keep list/form navigation inside the module the user opened. */
export function performanceAssessmentListHref(pathname: string): string {
  return pathname.includes("staff-faculty-details")
    ? "/staff-faculty-details/performance-assessment"
    : "/hr-payroll/employee/performance-assessment";
}

export function performanceAssessmentFormHref(pathname: string): string {
  return pathname.includes("staff-faculty-details")
    ? "/staff-faculty-details/performance-assessment/add-performance"
    : "/hr-payroll/employee/performance-assessment/add-performance";
}
