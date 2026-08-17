/** Server-safe role checks for page redirects (no localStorage). */

export function roleNameIsSecretary(roleName?: string | null): boolean {
  const role = (roleName ?? "").toUpperCase().trim();
  return role === "SECRETARY" || role.includes("SECRETARY");
}

export function roleNameIsChairman(roleName?: string | null): boolean {
  const role = (roleName ?? "").toUpperCase().trim();
  return (
    role === "CHAIRMAN" ||
    role === "CHAIRPERSON" ||
    role.includes("CHAIRMAN") ||
    role.includes("CHAIRPERSON")
  );
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

function readNavIsManagement(): boolean {
  const roleName = readNavRoleName().toUpperCase();
  if (roleName.includes("MANAGEMENT")) return true;
  return readNavUserRoles().some((entry) => {
    const name = (
      typeof entry === "string" ? entry : String(entry?.roleName ?? "")
    )
      .toUpperCase()
      .trim();
    return name === "MANAGEMENT" || name === "MMANAGEMENT";
  });
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

export function roleNameIsChancellor(roleName?: string | null): boolean {
  const compact = (roleName ?? "").toUpperCase().replace(/[\s_-]+/g, "");
  return compact.includes("CHANCELLOR");
}

/** Pro Vice Chancellor / Vice Chancellor / Chancellor — Angular Faculty List login. */
export function isChancellorRole(
  roleName?: string | null,
  userRoles?: Array<{ roleName?: string } | string> | null,
): boolean {
  if (roleNameIsChancellor(roleName ?? readNavRoleName())) return true;
  const roles = userRoles ?? readNavUserRoles();
  return roles.some((entry) => {
    const name =
      typeof entry === "string" ? entry : String(entry?.roleName ?? "");
    return roleNameIsChancellor(name);
  });
}

/** Chairman / Chairperson — active roleName or any entry in Angular userRoles[]. */
export function isChairmanRole(
  roleName?: string | null,
  userRoles?: Array<{ roleName?: string } | string> | null,
): boolean {
  if (roleNameIsChairman(roleName ?? readNavRoleName())) return true;
  const roles = userRoles ?? readNavUserRoles();
  return roles.some((entry) => {
    const name =
      typeof entry === "string" ? entry : String(entry?.roleName ?? "");
    return roleNameIsChairman(name);
  });
}

/** Angular management dashboard roles — Secretary, Chairman, or MANAGEMENT/MMANAGEMENT. */
export function isManagementNavRole(
  roleName?: string | null,
  userRoles?: Array<{ roleName?: string } | string> | null,
  isManagement?: boolean,
): boolean {
  if (isManagement ?? readNavIsManagement()) return true;
  return (
    isSecretaryRole(roleName, userRoles) || isChairmanRole(roleName, userRoles)
  );
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
export const HOD_FACULTY_DETAILS_ROUTE =
  "/staff-faculty-details/faculty-details";
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
    labelKey === "faculty list" ||
    labelKey === "employees details" ||
    labelKey === "employees detalis" ||
    labelKey === "employee details" ||
    labelKey === "employees detail" ||
    labelKey === "employee detail" ||
    labelKey === "employee list" ||
    (labelKey.includes("employee") && labelKey.includes("detail"))
  );
}

function isAngularFacultyListNavLabel(labelKey: string): boolean {
  return (
    labelKey === "faculty details" ||
    labelKey === "faculty detail" ||
    labelKey === "faculty list"
  );
}

/**
 * Faculty Details / Employee Details sidebar:
 * - Secretary / HR → Angular `#/hr-payroll/employee/employee-list`
 * - HOD / Principal / Pro Vice Chancellor → Angular `#/staff-faculty-details/faculty-details`
 *
 * Angular Fuse: collapsable module rows have no `url` — only leaf `page_*` items get
 * routerLinkActive. Do not remap label-only collapsable parents to the HR employee list.
 */
export function resolveFacultyDetailsNavRoute(
  href?: string,
  label?: string,
  roleName?: string,
  userRoles?: Array<{ roleName?: string } | string> | null,
  isManagement?: boolean,
  hasChildren?: boolean,
): string | null {
  if (isEmployeeDetailReportNav(href, label)) return null;

  const hrefLower = (href ?? "").toLowerCase();
  const labelKey = normalizeNavLabelKey(label ?? "");
  const facultyListLabel = isHrEmployeeListNavLabel(labelKey);
  const angularFacultyList =
    isAngularFacultyListNavLabel(labelKey) ||
    (labelKey === "college list" &&
      hrefLower.includes("staff-faculty-details"));
  const chancellor = isChancellorRole(roleName, userRoles);

  if (
    isHodFacultyDetailsHref(hrefLower) &&
    !isSecretaryRole(roleName, userRoles)
  ) {
    return HOD_FACULTY_DETAILS_ROUTE;
  }

  if (chancellor && angularFacultyList) {
    return HOD_FACULTY_DETAILS_ROUTE;
  }

  if (isHrEmployeeListHref(hrefLower)) {
    return HR_EMPLOYEE_LIST_ROUTE;
  }

  // Angular `#/staff-faculty-details/faculty-details` — keep this module URL.
  // Do not send it to HR `employee-list` (secretary / non-HOD logins included).
  if (isHodFacultyDetailsHref(hrefLower)) {
    return null;
  }

  if (!isHrEmployeeListNavLabel(labelKey)) {
    return null;
  }

  // staff-faculty-details collapsable tree — never remap to HR employee list.
  if (
    hrefLower.includes("staff-faculty-details") ||
    hrefLower.includes("staff-faculty-leaves")
  ) {
    return null;
  }

  // Angular collapsable module parent (no url) — no forced route / no active highlight.
  if (hasChildren && !hrefLower) {
    return null;
  }

  // Angular management/chairman/secretary: flat pages[] Faculty Details leaf (HR) only.
  if (isManagementNavRole(roleName, userRoles, isManagement)) {
    if (isHrEmployeeListHref(hrefLower) || hrefLower.includes("hr-payroll")) {
      return HR_EMPLOYEE_LIST_ROUTE;
    }
    return null;
  }

  if (!hrefLower) {
    return null;
  }

  return HR_EMPLOYEE_LIST_ROUTE;
}
