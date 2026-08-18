import type { SessionUser, UserRoleEntry } from "@/types/user";

export type EmployeeLoginContext = {
  employeeId: number;
  empDeptId: number;
  isHod: boolean;
  uName: string;
  empNumber: string;
  /** Angular login: `localStorage.deptName` — toolbar `(empNumber / deptName)`. */
  deptName: string;
  /** Angular login: `localStorage.empStatusCode` — 'ACTV' gates staff pages. */
  empStatusCode: string;
  /** Angular login: `localStorage.empCategoryName` — 'Teaching' / 'Non Teaching'. */
  empCategoryName: string;
};

function positiveId(...candidates: unknown[]): number {
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function truthyFlag(value: unknown): boolean {
  if (value === true || value === 1) return true;
  const s = String(value ?? "")
    .trim()
    .toLowerCase();
  return s === "true" || s === "y" || s === "yes" || s === "1";
}

function unwrapEmployeeRow(data: unknown): Record<string, unknown> | null {
  if (data == null) return null;
  if (Array.isArray(data)) {
    const first = data[0];
    return first && typeof first === "object"
      ? (first as Record<string, unknown>)
      : null;
  }
  if (typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  if (Array.isArray(o.resultList) && o.resultList[0]) {
    return o.resultList[0] as Record<string, unknown>;
  }
  if (o.data && typeof o.data === "object" && !Array.isArray(o.data)) {
    return o.data as Record<string, unknown>;
  }
  return o;
}

function readUserRolesFromStorage(): UserRoleEntry[] {
  if (typeof globalThis.window === "undefined") return [];
  try {
    const raw = globalThis.localStorage.getItem("userDetails");
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { userRoles?: UserRoleEntry[] };
    return Array.isArray(parsed.userRoles) ? parsed.userRoles : [];
  } catch {
    return [];
  }
}

function roleNameLooksLikeHod(roleName: unknown): boolean {
  const s = String(roleName ?? "").toUpperCase();
  return (
    s.includes("HOD") || s.includes("HEAD OF") || s.includes("CHAIRPERSON")
  );
}

/** Parse Angular `employeedetailsbyid` row into login context fields. */
export function parseEmployeeLoginContext(
  data: unknown,
): EmployeeLoginContext | null {
  const row = unwrapEmployeeRow(data);
  if (!row) return null;

  const nestedEmp =
    row.employeeDetail && typeof row.employeeDetail === "object"
      ? (row.employeeDetail as Record<string, unknown>)
      : null;
  const nestedDept =
    row.department && typeof row.department === "object"
      ? (row.department as Record<string, unknown>)
      : null;

  const employeeId = positiveId(
    row.employeeId,
    row.pk_emp_id,
    row.emp_id,
    row.employee_id,
    nestedEmp?.employeeId,
  );
  if (!employeeId) return null;

  const empDeptId = positiveId(
    row.empDeptId,
    row.departmentId,
    row.deptId,
    row.emp_dept_id,
    nestedDept?.departmentId,
    nestedEmp?.empDeptId,
    nestedEmp?.departmentId,
  );

  const isHod =
    truthyFlag(row.isHOD) ||
    truthyFlag(row.isHod) ||
    truthyFlag(row.hod) ||
    truthyFlag(row.isDeptHead) ||
    truthyFlag(row.departmentHead) ||
    truthyFlag(row.isHODDashboard) ||
    truthyFlag(row.hodDashboard) ||
    truthyFlag(nestedEmp?.isHOD) ||
    truthyFlag(nestedEmp?.isHod);

  const empNumber = String(
    row.empNumber ?? row.employeeCode ?? nestedEmp?.empNumber ?? "",
  ).trim();
  const deptName = String(
    row.deptName ??
      row.departmentName ??
      nestedDept?.deptName ??
      nestedDept?.departmentName ??
      nestedEmp?.deptName ??
      "",
  ).trim();
  const uName = String(
    row.uName ?? row.userName ?? row.firstName ?? nestedEmp?.uName ?? empNumber,
  ).trim();
  const empStatusCode = String(
    row.empStatusCode ??
      row.empstatusCatCode ??
      row.employeeStatusCode ??
      row.empStatus ??
      nestedEmp?.empStatusCode ??
      "",
  ).trim();
  const empCategoryName = String(
    row.empCategoryName ??
      row.empcategoryCatDisplayName ??
      row.empCatName ??
      row.employeeCategoryName ??
      nestedEmp?.empCategoryName ??
      "",
  ).trim();

  return {
    employeeId,
    empDeptId,
    isHod,
    uName,
    empNumber,
    deptName,
    empStatusCode,
    empCategoryName,
  };
}

export function readStorageFlag(key: string): boolean {
  if (typeof globalThis.window === "undefined") return false;
  return globalThis.localStorage.getItem(key) === "true";
}

export function readStorageId(key: string): number {
  if (typeof globalThis.window === "undefined") return 0;
  return positiveId(globalThis.localStorage.getItem(key));
}

/** Role flags that leak across logins if not cleared (dashboard tabs, filters). */
const STICKY_ROLE_STORAGE_KEYS = [
  "isHOD",
  "isHODDashboard",
  "isPRINCIPAL",
  "isMgnt",
  "isDeprtAdmin",
  "isViceChancellor",
  "isRegistrar",
  "isFinanceOfficer",
  "isProVC",
  "isChairman",
  "isSecretary",
  "isLibrarian",
  "isVicePrincipal",
  "isAccountant",
  "isTC",
  "isUnvDean",
  "showNewVCDashboard",
  "userDetails",
  "DASHBOARD",
] as const;

/** Call on logout so a prior HOD session cannot show HOD Dashboard after admin login. */
export function clearStickyRoleFlagsFromLocalStorage(): void {
  if (typeof globalThis.window === "undefined") return;
  const storage = globalThis.localStorage;
  for (const key of STICKY_ROLE_STORAGE_KEYS) {
    storage.removeItem(key);
  }
}

/**
 * Angular login localStorage keys used by assignments / employee search.
 * Writes the resolved HOD outcome (true or false). Call only after
 * employeedetailsbyid + EmpDeptHeads have settled for this login.
 */
export function syncEmployeeLoginContextToStorage(
  ctx: EmployeeLoginContext,
): void {
  if (typeof globalThis.window === "undefined") return;
  const storage = globalThis.localStorage;
  if (ctx.employeeId > 0) storage.setItem("employeeId", String(ctx.employeeId));
  if (ctx.empDeptId > 0) storage.setItem("empDeptId", String(ctx.empDeptId));
  storage.setItem("isHOD", ctx.isHod ? "true" : "false");
  storage.setItem("isHODDashboard", ctx.isHod ? "true" : "false");
  if (ctx.uName) storage.setItem("uName", ctx.uName);
  if (ctx.empNumber) {
    storage.setItem("empNumber", ctx.empNumber);
    storage.setItem("uNumber", ctx.empNumber);
  }
  if (ctx.deptName) storage.setItem("deptName", ctx.deptName);
  // Staff login must not keep a previous student's group/year in the toolbar.
  storage.setItem("groupCode", "null");
  storage.removeItem("courseYearName");
  if (ctx.empStatusCode) storage.setItem("empStatusCode", ctx.empStatusCode);
  if (ctx.empCategoryName)
    storage.setItem("empCategoryName", ctx.empCategoryName);
}

/** Angular assignments: `localStorage.isHOD === 'true'` (+ role / EmpDeptHeads). */
export function resolveStaffIsHod(
  user: SessionUser | null | undefined,
  ctx?: EmployeeLoginContext | null,
): boolean {
  if (Boolean(user?.isHod) || Boolean(ctx?.isHod)) return true;
  if (readStorageFlag("isHOD") || readStorageFlag("isHODDashboard"))
    return true;
  if (
    roleNameLooksLikeHod(user?.roleName) ||
    roleNameLooksLikeHod(user?.userRole)
  ) {
    return true;
  }
  const roles = readUserRolesFromStorage();
  if (roles.some((r) => roleNameLooksLikeHod(r.roleName))) return true;
  return false;
}

export function resolveStaffDeptId(ctx?: EmployeeLoginContext | null): number {
  return positiveId(
    ctx?.empDeptId,
    readStorageId("empDeptId"),
    // Angular pages commonly read `departmentId` directly from localStorage.
    readStorageId("departmentId"),
  );
}

/** Match EmpDeptHeads row to login employee (Angular department-head → isHOD). */
export function isEmployeeDepartmentHead(
  employeeId: number,
  heads: Array<Record<string, unknown>>,
): { isHod: boolean; empDeptId: number } {
  if (!employeeId) return { isHod: false, empDeptId: 0 };
  for (const row of heads) {
    if (row.isActive === false) continue;
    const headEmpId = positiveId(
      row.employeeId,
      row.empId,
      (row.employeeDetail as Record<string, unknown> | undefined)?.employeeId,
    );
    if (headEmpId !== employeeId) continue;
    const empDeptId = positiveId(
      row.departmentId,
      row.empDeptId,
      (row.department as Record<string, unknown> | undefined)?.departmentId,
    );
    return { isHod: true, empDeptId };
  }
  return { isHod: false, empDeptId: 0 };
}
