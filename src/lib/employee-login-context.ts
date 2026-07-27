import type { SessionUser } from "@/types/user";

export type EmployeeLoginContext = {
  employeeId: number;
  empDeptId: number;
  isHod: boolean;
  uName: string;
  empNumber: string;
};

function positiveId(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function truthyFlag(value: unknown): boolean {
  if (value === true || value === 1) return true;
  const s = String(value ?? "").trim().toLowerCase();
  return s === "true" || s === "y" || s === "yes" || s === "1";
}

/** Parse Angular `employeedetailsbyid` row into login context fields. */
export function parseEmployeeLoginContext(
  data: unknown,
): EmployeeLoginContext | null {
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;

  const employeeId = positiveId(
    row.employeeId,
    row.pk_emp_id,
    row.emp_id,
    row.employee_id,
  );
  if (!employeeId) return null;

  const empDeptId = positiveId(
    row.empDeptId,
    row.departmentId,
    row.deptId,
    row.emp_dept_id,
  );

  const isHod =
    truthyFlag(row.isHOD) ||
    truthyFlag(row.isHod) ||
    truthyFlag(row.hod) ||
    truthyFlag(row.isDeptHead) ||
    truthyFlag(row.departmentHead) ||
    truthyFlag(row.isHODDashboard) ||
    truthyFlag(row.hodDashboard);

  const empNumber = String(row.empNumber ?? row.employeeCode ?? "").trim();
  const uName = String(row.uName ?? row.userName ?? empNumber).trim();

  return { employeeId, empDeptId, isHod, uName, empNumber };
}

export function readStorageFlag(key: string): boolean {
  if (typeof globalThis.window === "undefined") return false;
  return globalThis.localStorage.getItem(key) === "true";
}

export function readStorageId(key: string): number {
  if (typeof globalThis.window === "undefined") return 0;
  return positiveId(globalThis.localStorage.getItem(key));
}

/** Angular login localStorage keys used by assignments / employee search. */
export function syncEmployeeLoginContextToStorage(
  ctx: EmployeeLoginContext,
): void {
  if (typeof globalThis.window === "undefined") return;
  const storage = globalThis.localStorage;
  if (ctx.employeeId > 0) storage.setItem("employeeId", String(ctx.employeeId));
  if (ctx.empDeptId > 0) storage.setItem("empDeptId", String(ctx.empDeptId));
  storage.setItem("isHOD", ctx.isHod ? "true" : "false");
  if (ctx.isHod) storage.setItem("isHODDashboard", "true");
  if (ctx.uName) storage.setItem("uName", ctx.uName);
  if (ctx.empNumber) storage.setItem("empNumber", ctx.empNumber);
}

export function resolveStaffIsHod(
  user: SessionUser | null | undefined,
  ctx?: EmployeeLoginContext | null,
): boolean {
  return (
    Boolean(user?.isHod) ||
    Boolean(ctx?.isHod) ||
    readStorageFlag("isHOD") ||
    readStorageFlag("isHODDashboard")
  );
}

export function resolveStaffDeptId(ctx?: EmployeeLoginContext | null): number {
  return positiveId(ctx?.empDeptId, readStorageId("empDeptId"));
}
