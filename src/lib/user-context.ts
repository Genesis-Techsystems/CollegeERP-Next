import type { SessionUser, UserDTO } from "@/types/user";

function positiveId(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** Read employee id from browser storage (Angular login parity). */
export function readEmployeeIdFromStorage(): number {
  if (typeof globalThis === "undefined" || !("localStorage" in globalThis))
    return 0;
  const storage = globalThis.localStorage;
  for (const key of ["employeeId", "empId", "loginuser_empid"] as const) {
    const id = positiveId(storage.getItem(key));
    if (id) return id;
  }
  return 0;
}

/** Resolve login employee id for stored-proc `in_loginuser_empid`. */
export function resolveLoginEmployeeId(user?: SessionUser | null): number {
  const fromUser = positiveId(user?.employeeId);
  if (fromUser) return fromUser;
  return readEmployeeIdFromStorage();
}

export function readOrganizationIdFromStorage(): number {
  if (typeof globalThis === "undefined" || !("localStorage" in globalThis))
    return 0;
  const storage = globalThis.localStorage;
  for (const key of ["organizationId", "orgId", "orgID"] as const) {
    const id = positiveId(storage.getItem(key));
    if (id) return id;
  }
  return 0;
}

export function resolveOrganizationId(user?: SessionUser | null): number {
  const fromUser = positiveId(user?.organizationId);
  if (fromUser) return fromUser;
  return readOrganizationIdFromStorage();
}

/** Map employee id from authorization UserDTO (field names vary by environment). */
export function pickEmployeeIdFromUserDto(dto: UserDTO): number | undefined {
  const row = dto as UserDTO & Record<string, unknown>;
  for (const key of [
    "employeeId",
    "profileEmployeeId",
    "empId",
    "fk_employee_id",
    "employee_id",
  ] as const) {
    const id = positiveId(row[key]);
    if (id) return id;
  }
  return undefined;
}

/** Persist session fields used by filter procs (Angular localStorage keys). */
export function syncSessionUserToStorage(user: SessionUser): void {
  if (typeof globalThis === "undefined" || !("localStorage" in globalThis))
    return;
  const storage = globalThis.localStorage;
  const employeeId = resolveLoginEmployeeId(user);
  if (employeeId > 0) storage.setItem("employeeId", String(employeeId));
  const orgId = resolveOrganizationId(user);
  if (orgId > 0) storage.setItem("organizationId", String(orgId));
  // Angular login.component: localStorage.orgCode = organizationCode
  if (user.organizationCode) storage.setItem("orgCode", user.organizationCode);
  if (user.universityCode)
    storage.setItem("universityCode", user.universityCode);
  if (user.academicYearId)
    storage.setItem("academicYearId", String(user.academicYearId));
  if (user.collegeId) storage.setItem("collegeId", String(user.collegeId));
  if (user.collegeName) {
    storage.setItem("collegeName", user.collegeName);
    storage.setItem("currentCollege", user.collegeName);
  }
  if (user.universityId)
    storage.setItem("universityId", String(user.universityId));
}

/** Merge iron-session user with fresh authorization UserDTO. */
export function mergeSessionUserFromDto(
  sessionUser: SessionUser,
  dto: UserDTO,
): SessionUser {
  const employeeId = sessionUser.employeeId ?? pickEmployeeIdFromUserDto(dto);
  const dtoRow = dto as UserDTO & Record<string, unknown>;
  const nestedCollege = (dtoRow.college ?? dtoRow.College) as
    | { collegeId?: number }
    | undefined;
  const collegeId =
    positiveId(sessionUser.collegeId) ||
    positiveId(dto.collegeId) ||
    positiveId(nestedCollege?.collegeId);
  const nestedAy = (dtoRow.academicYear ?? dtoRow.AcademicYear) as
    | { academicYearId?: number }
    | undefined;
  const academicYearId =
    positiveId(sessionUser.academicYearId) ||
    positiveId(dto.academicYearId) ||
    positiveId(nestedAy?.academicYearId);
  return {
    ...sessionUser,
    employeeId: employeeId ?? sessionUser.employeeId,
    organizationId: sessionUser.organizationId ?? dto.organizationId,
    universityId: sessionUser.universityId ?? dto.universityId,
    universityCode: sessionUser.universityCode ?? dto.universityCode,
    collegeId: collegeId || sessionUser.collegeId,
    academicYearId: academicYearId || sessionUser.academicYearId,
  };
}
