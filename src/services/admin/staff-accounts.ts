import { AppError } from "@/lib/errors";
import { domainCreate, domainList, domainUpdate } from "@/services/crud";
import { listActiveCollegesForGeneralSettings } from "./college";
import { listUserTypesByOrganization } from "./general-user-accounts";

const STAFF_USER_TYPE_CODE = "STAFF";

/**
 * Same filter as Angular `user-accounts.component.ts` staff grid:
 * `listDetailsByTwoIdsWithSort(userCrudUrl, collegeId, 'STAFF', 'desc', getDetailsByCollegeIdUrl, 'Usertype.userTypeCode', 'createdDt')`
 * → `College.collegeId=={collegeId}.and.Usertype.userTypeCode==STAFF.order(createdDt=desc)`
 *
 * Uses `domain/list/User` via {@link domainList} (same as general user accounts). Avoids a second
 * `cms/` segment when `SPRING_API_URL` already ends with `/cms`.
 */
function staffUsersByCollegeQuery(collegeId: number): string {
  return `College.collegeId==${collegeId}.and.Usertype.userTypeCode==${STAFF_USER_TYPE_CODE}.order(createdDt=desc)`;
}

function asFiniteId(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function asText(value: unknown): string | undefined {
  if (typeof value === "string") return value.trim() || undefined;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

function nestedRecord(
  row: Record<string, unknown>,
  ...keys: string[]
): Record<string, unknown> | null {
  for (const key of keys) {
    const value = row[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
  }
  return null;
}

/** Resolve STAFF `userTypeId` for the college’s organization (never hard-code). */
export async function resolveStaffUserTypeId(
  organizationId: number,
): Promise<number> {
  if (!organizationId) {
    throw new AppError(
      "VALIDATION",
      "Organization is required to resolve staff user type.",
    );
  }
  const types = await listUserTypesByOrganization(organizationId);
  const match = types.find(
    (t) => String(t.userTypeCode ?? "").toUpperCase() === STAFF_USER_TYPE_CODE,
  );
  if (!match?.userTypeId) {
    throw new AppError(
      "CONFIG",
      `No ${STAFF_USER_TYPE_CODE} user type is configured for this organization.`,
    );
  }
  return match.userTypeId;
}

function toPasswordExpDateIso(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  const fallback = new Date();
  fallback.setFullYear(fallback.getFullYear() + 1);
  return fallback.toISOString();
}

/**
 * Spring User rows often nest College / Organization / Usertype / EmployeeDetail.
 * Flatten the fields the Staff Accounts grid and search rely on.
 */
export function normalizeStaffAccount(raw: unknown): StaffAccount | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const college = nestedRecord(row, "College", "college");
  const organization = nestedRecord(row, "Organization", "organization");
  const usertype = nestedRecord(
    row,
    "Usertype",
    "usertype",
    "UserType",
    "userType",
  );
  const employee = nestedRecord(
    row,
    "EmployeeDetail",
    "employeeDetail",
    "Employee",
    "employee",
  );
  const department = nestedRecord(
    row,
    "Department",
    "department",
    "EmployeeDepartment",
    "employeeDepartment",
  );

  const userId = asFiniteId(row.userId ?? row.user_id);
  if (!userId) return null;

  return {
    userId,
    userTypeId:
      asFiniteId(
        row.userTypeId ?? usertype?.userTypeId ?? usertype?.usertypeId,
      ) || undefined,
    firstName: asText(row.firstName ?? employee?.firstName),
    lastName: asText(row.lastName ?? employee?.lastName),
    userName: asText(row.userName ?? row.username),
    email: asText(row.email ?? employee?.email),
    mobileNumber: asText(
      row.mobileNumber ??
        row.mobile ??
        employee?.mobileNumber ??
        employee?.mobile,
    ),
    password: asText(row.password),
    passwordConfirm: asText(row.passwordConfirm),
    passwordExpDate:
      (row.passwordExpDate as string | Date | undefined) ?? undefined,
    employeeId: asFiniteId(row.employeeId ?? employee?.employeeId) || undefined,
    departmentId:
      asFiniteId(row.departmentId ?? department?.departmentId) || undefined,
    collegeId: asFiniteId(row.collegeId ?? college?.collegeId) || undefined,
    collegeCode: asText(row.collegeCode ?? college?.collegeCode),
    organizationId:
      asFiniteId(row.organizationId ?? organization?.organizationId) ||
      undefined,
    organizationCode: asText(
      row.organizationCode ??
        organization?.organizationCode ??
        organization?.orgCode,
    ),
    isActive: row.isActive === undefined ? true : Boolean(row.isActive),
    isEditable:
      row.isEditable === undefined ? undefined : Boolean(row.isEditable),
    isReset: row.isReset === undefined ? undefined : Boolean(row.isReset),
    reason: asText(row.reason),
  };
}

function buildStaffUserWritePayload(
  data: Partial<StaffAccount>,
  userTypeId: number,
  userId?: number,
): Record<string, unknown> {
  const collegeId = asFiniteId(data.collegeId);
  const organizationId = asFiniteId(data.organizationId);
  const departmentId = asFiniteId(data.departmentId);
  const employeeId = asFiniteId(data.employeeId);
  const isActive = data.isActive !== false;

  const payload: Record<string, unknown> = {
    userTypeId,
    firstName: asText(data.firstName) ?? "",
    lastName: asText(data.lastName) ?? "",
    userName: asText(data.userName) ?? "",
    email: asText(data.email) ?? "",
    passwordExpDate: toPasswordExpDateIso(data.passwordExpDate),
    isActive,
    isEditable: Boolean(data.isEditable),
    isReset: Boolean(data.isReset),
    reason: asText(data.reason) || (isActive ? "active" : "inactive"),
    collegeId,
    organizationId,
  };

  const password = asText(data.password);
  if (password) {
    payload.password = password;
    payload.passwordConfirm = asText(data.passwordConfirm) ?? password;
  }

  const mobile = asText(data.mobileNumber);
  if (mobile) payload.mobileNumber = mobile;
  if (departmentId) payload.departmentId = departmentId;
  if (employeeId) payload.employeeId = employeeId;
  if (userId) payload.userId = userId;

  return payload;
}

export interface StaffAccount {
  userId: number;
  userTypeId?: number;
  firstName?: string;
  lastName?: string;
  userName?: string;
  email?: string;
  mobileNumber?: string;
  password?: string;
  passwordConfirm?: string;
  passwordExpDate?: string | Date;
  employeeId?: number;
  departmentId?: number;
  collegeId?: number;
  collegeCode?: string;
  organizationId?: number;
  organizationCode?: string;
  isActive?: boolean;
  isEditable?: boolean;
  isReset?: boolean;
  reason?: string;
}

export async function listStaffAccountColleges() {
  return listActiveCollegesForGeneralSettings();
}

export async function listStaffAccountsByCollege(
  collegeId: number,
): Promise<StaffAccount[]> {
  const rows = await domainList<unknown>(
    "User",
    staffUsersByCollegeQuery(collegeId),
  );
  return rows
    .map(normalizeStaffAccount)
    .filter((row): row is StaffAccount => row != null);
}

export async function getStaffAccountById(
  userId: number,
): Promise<StaffAccount | null> {
  const query = `userId==${userId}.and.Usertype.userTypeCode==${STAFF_USER_TYPE_CODE}`;
  const rows = await domainList<unknown>("User", query);
  return normalizeStaffAccount(rows[0]) ?? null;
}

/**
 * Angular user-accounts create pre-check / conflict toast:
 * `snotifyService.info('User already exists', 'Info!')`
 * Spring domain create often returns only the generic "Unable to process…" message
 * for unique/FK conflicts, so we detect the existing row and surface Angular’s copy.
 */
export const STAFF_USER_ALREADY_EXISTS_MESSAGE = "User already exists";

async function findUserByQueries(
  queries: string[],
): Promise<StaffAccount | null> {
  for (const query of queries) {
    try {
      const rows = await domainList<unknown>("User", query);
      const match = rows
        .map(normalizeStaffAccount)
        .find((row): row is StaffAccount => row != null);
      if (match) return match;
    } catch {
      // try next query shape
    }
  }
  return null;
}

/** Angular `listDetailsById(User, employeeId, 'employeeId')` — employee already linked to a login. */
export async function findExistingUserByEmployeeId(
  employeeId: number,
): Promise<StaffAccount | null> {
  if (!employeeId) return null;
  return findUserByQueries([
    `employeeId==${employeeId}`,
    `EmployeeDetail.employeeId==${employeeId}`,
    `employeeDetail.employeeId==${employeeId}`,
  ]);
}

/** Username collision check (any user type — Spring unique constraint on userName). */
export async function findExistingUserByUserName(
  userName: string,
): Promise<StaffAccount | null> {
  const name = asText(userName);
  if (!name) return null;
  return findUserByQueries([`userName==${name}`]);
}

export async function assertStaffUserNotAlreadyExists(params: {
  employeeId: number;
  userName: string;
}): Promise<void> {
  const byEmployee = await findExistingUserByEmployeeId(params.employeeId);
  if (byEmployee) {
    throw new AppError("ALREADY_EXISTS", STAFF_USER_ALREADY_EXISTS_MESSAGE);
  }
  const byUserName = await findExistingUserByUserName(params.userName);
  if (byUserName) {
    throw new AppError("ALREADY_EXISTS", STAFF_USER_ALREADY_EXISTS_MESSAGE);
  }
}

export async function createStaffAccount(
  data: Omit<StaffAccount, "userId">,
): Promise<StaffAccount> {
  const organizationId = asFiniteId(data.organizationId);
  if (!organizationId) {
    throw new AppError(
      "VALIDATION",
      "Organization is required to create a staff account.",
    );
  }
  if (!asFiniteId(data.collegeId)) {
    throw new AppError(
      "VALIDATION",
      "College is required to create a staff account.",
    );
  }
  if (!asFiniteId(data.employeeId)) {
    throw new AppError(
      "VALIDATION",
      "Employee is required to create a staff account.",
    );
  }
  if (!asText(data.userName)) {
    throw new AppError("VALIDATION", "User name is required.");
  }
  if (!asText(data.password) || data.password !== data.passwordConfirm) {
    throw new AppError(
      "VALIDATION",
      "Password and confirm password must match.",
    );
  }

  await assertStaffUserNotAlreadyExists({
    employeeId: asFiniteId(data.employeeId),
    userName: asText(data.userName) ?? "",
  });

  const userTypeId = await resolveStaffUserTypeId(organizationId);
  const payload = buildStaffUserWritePayload(data, userTypeId);
  // Create always requires password fields
  payload.password = data.password;
  payload.passwordConfirm = data.passwordConfirm;
  try {
    const created = await domainCreate<unknown>("User", payload);
    return (
      normalizeStaffAccount(created) ??
      ({ userId: 0, ...data, userTypeId } as StaffAccount)
    );
  } catch (error) {
    // Race / Spring generic failure: re-check and show Angular’s Info message
    const byEmployee = await findExistingUserByEmployeeId(
      asFiniteId(data.employeeId),
    ).catch(() => null);
    const byUserName =
      byEmployee ??
      (await findExistingUserByUserName(asText(data.userName) ?? "").catch(
        () => null,
      ));
    if (byUserName) {
      throw new AppError("ALREADY_EXISTS", STAFF_USER_ALREADY_EXISTS_MESSAGE);
    }
    throw error;
  }
}

export async function updateStaffAccount(
  userId: number,
  data: Partial<StaffAccount>,
): Promise<StaffAccount> {
  const organizationId = asFiniteId(data.organizationId);
  if (!organizationId) {
    throw new AppError(
      "VALIDATION",
      "Organization is required to update a staff account.",
    );
  }
  const userTypeId =
    asFiniteId(data.userTypeId) ||
    (await resolveStaffUserTypeId(organizationId));
  const payload = buildStaffUserWritePayload(data, userTypeId, userId);
  const updated = await domainUpdate<unknown>(
    "User",
    "userId",
    userId,
    payload,
  );
  return (
    normalizeStaffAccount(updated) ??
    ({ userId, ...data, userTypeId } as StaffAccount)
  );
}
