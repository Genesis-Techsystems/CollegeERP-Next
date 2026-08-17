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

export function isHrEmployeeListHref(href?: string): boolean {
  const hrefLower = (href ?? "").toLowerCase();
  if (hrefLower.includes("employee-list-by-campus")) return false;
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

function isHrEmployeeListNavLabel(labelKey: string): boolean {
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
 */
export function resolveFacultyDetailsNavRoute(
  href?: string,
  label?: string,
  roleName?: string,
  userRoles?: Array<{ roleName?: string } | string> | null,
): string | null {
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

  if (!facultyListLabel) {
    return null;
  }

  return HR_EMPLOYEE_LIST_ROUTE;
}
