/** Server-safe role checks for page redirects (no localStorage). */

export function roleNameIsSecretary(roleName?: string | null): boolean {
  const role = (roleName ?? "").toUpperCase().trim();
  return role === "SECRETARY" || role.includes("SECRETARY");
}

function readNavRoleName(): string {
  if (typeof globalThis.window === "undefined") return "";
  return (globalThis.localStorage.getItem("roleName") ?? "").trim();
}

function readNavUserRoles(): Array<{ roleName?: string } | string> {
  if (typeof globalThis.window === "undefined") return [];
  try {
    const raw = globalThis.localStorage.getItem("userDetails");
    if (!raw) return [];
    const parsed = JSON.parse(raw) as {
      userRoles?: Array<{ roleName?: string } | string>;
    };
    return parsed.userRoles ?? [];
  } catch {
    return [];
  }
}

/** Secretary login — active roleName or any entry in Angular userRoles[]. */
export function isSecretaryRole(
  roleName?: string | null,
  userRoles?: Array<{ roleName?: string } | string> | null,
): boolean {
  if (roleNameIsSecretary(roleName ?? readNavRoleName())) return true;
  const roles = userRoles ?? readNavUserRoles();
  return roles.some((entry) => {
    const name =
      typeof entry === "string" ? entry : String(entry?.roleName ?? "");
    return roleNameIsSecretary(name);
  });
}

export function isHodFacultyDetailsHref(href?: string): boolean {
  const hrefLower = (href ?? "").toLowerCase();
  return (
    hrefLower.includes("staff-faculty-details/faculty-details") ||
    (hrefLower.includes("staff-faculty-details") &&
      hrefLower.includes("faculty-details") &&
      !hrefLower.includes("leave-approvals") &&
      !hrefLower.includes("leave_approvals") &&
      !hrefLower.includes("performance") &&
      !hrefLower.includes("appraisal") &&
      !hrefLower.includes("salary") &&
      !hrefLower.includes("proxy"))
  );
}

export const HR_EMPLOYEE_LIST_ROUTE = "/hr-payroll/employee/employee-list";
export const EMPLOYEE_DETAIL_REPORT_ROUTE =
  "/reports/admin-hr-reports/employee-detail-report";

export function isHrEmployeeListHref(href?: string): boolean {
  const hrefLower = (href ?? "").toLowerCase();
  if (
    hrefLower.includes("employee-detail-report") ||
    hrefLower.includes("employee-details-report") ||
    hrefLower.includes("employee-list-by-campus")
  ) {
    return false;
  }
  return (
    hrefLower.includes("hr-payroll/employee/employee-list") ||
    hrefLower.includes("/apps/hr-payroll/employee/employee-list") ||
    hrefLower.endsWith("/employee/employee-list") ||
    hrefLower.endsWith("employee/employee-list") ||
    (hrefLower.includes("hr-payroll") &&
      hrefLower.includes("employee") &&
      hrefLower.includes("employee-list"))
  );
}

function normalizeNavLabelKey(label: string): string {
  return (label ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Reports → HR Reports → Employee Detail Report (not Faculty Details / employee list). */
export function isEmployeeDetailReportNav(
  href?: string,
  label?: string,
): boolean {
  const hrefLower = (href ?? "").toLowerCase();
  const labelKey = normalizeNavLabelKey(label ?? "");
  if (
    hrefLower.includes("employee-detail-report") ||
    hrefLower.includes("employee-details-report") ||
    hrefLower.includes("hr-reports/employee-detail")
  ) {
    return true;
  }
  return (
    labelKey.includes("employee") &&
    labelKey.includes("detail") &&
    labelKey.includes("report")
  );
}

function isHrEmployeeListNavLabel(labelKey: string): boolean {
  if (labelKey.includes("report")) return false;
  return (
    labelKey === "faculty details" ||
    labelKey === "faculty detail" ||
    labelKey === "employees details" ||
    labelKey === "employees detalis" ||
    labelKey === "employee details" ||
    labelKey === "employees detail" ||
    labelKey === "employee detail" ||
    labelKey === "employee list" ||
    (labelKey.includes("employee") && labelKey.includes("detail"))
  );
}

/**
 * Faculty Details / Employee Details sidebar — Angular `#/hr-payroll/employee/employee-list`
 * unless the menu href is explicitly the HOD `staff-faculty-details/faculty-details` page.
 */
export function resolveFacultyDetailsNavRoute(
  href?: string,
  label?: string,
  roleName?: string,
  userRoles?: Array<{ roleName?: string } | string> | null,
): string | null {
  if (isEmployeeDetailReportNav(href, label)) return null;

  const hrefLower = (href ?? "").toLowerCase();
  const labelKey = normalizeNavLabelKey(label ?? "");

  if (isHrEmployeeListHref(hrefLower)) {
    return HR_EMPLOYEE_LIST_ROUTE;
  }

  if (!isHrEmployeeListNavLabel(labelKey)) {
    return null;
  }

  if (isSecretaryRole(roleName, userRoles)) {
    return HR_EMPLOYEE_LIST_ROUTE;
  }

  if (isHodFacultyDetailsHref(hrefLower)) {
    return null;
  }

  return HR_EMPLOYEE_LIST_ROUTE;
}
