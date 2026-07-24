/**
 * Angular parity: user-management/examination-account
 *
 * List: domain/list/User?query=College.collegeId=={id}.and.Usertype.userTypeCode==EVALUATION.order(createdDt=desc)
 * Create: POST api/createuser (CMS path via CREATE_USER_CMS) — Angular addMasterDetails(createuserUrl)
 * Update: domain/update/User?query=userId=={id}
 * Roles: POST userrole (shared saveUserRoles)
 */

import { NEXT_API, USER_MANAGEMENT_API } from "@/config/constants/api";
import { AppError, parseApiError } from "@/lib/errors";
import type { ApiResponse } from "@/types/api";
import {
  domainList,
  domainListRawQuery,
  domainUpdate,
  fetchDetails,
} from "@/services/crud";
import { listActiveCollegesForGeneralSettings } from "./college";
import { listUserTypesByOrganization } from "./general-user-accounts";

const EVALUATION_USER_TYPE_CODE = "EVALUATION";

function asFiniteId(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function asText(v: unknown): string | undefined {
  if (typeof v === "string") {
    const t = v.trim();
    return t || undefined;
  }
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return undefined;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function toPasswordExpDateIso(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value === "string" && value.trim()) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return new Date().toISOString();
}

function examinationAccountsByCollegeQuery(collegeId: number): string {
  return `College.collegeId==${collegeId}.and.Usertype.userTypeCode==${EVALUATION_USER_TYPE_CODE}.order(createdDt=desc)`;
}

export async function resolveEvaluationUserTypeId(
  organizationId: number,
): Promise<number> {
  if (!organizationId) {
    throw new AppError(
      "VALIDATION",
      "Organization is required to resolve evaluation user type.",
    );
  }
  const types = await listUserTypesByOrganization(organizationId);
  const match = types.find(
    (t) =>
      String(t.userTypeCode ?? "").toUpperCase() ===
      EVALUATION_USER_TYPE_CODE.toUpperCase(),
  );
  if (!match?.userTypeId) {
    throw new AppError(
      "CONFIG",
      `No ${EVALUATION_USER_TYPE_CODE} user type is configured for this organization.`,
    );
  }
  return match.userTypeId;
}

export interface ExaminationAccount {
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

export interface ExaminationEmployeeOption {
  employeeId?: number;
  empNumber?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  mobile?: string;
  mobileNumber?: string;
}

function normalizeExaminationAccount(raw: unknown): ExaminationAccount | null {
  const row = asRecord(raw);
  if (!row) return null;
  const usertype =
    asRecord(row.Usertype) ?? asRecord(row.userType) ?? asRecord(row.usertype);
  const college = asRecord(row.College) ?? asRecord(row.college);
  const organization = asRecord(row.Organization) ?? asRecord(row.organization);
  const userId = asFiniteId(row.userId);
  if (!userId) return null;
  return {
    userId,
    userTypeId: asFiniteId(row.userTypeId ?? usertype?.userTypeId) || undefined,
    firstName: asText(row.firstName),
    lastName: asText(row.lastName),
    userName: asText(row.userName),
    email: asText(row.email),
    mobileNumber: asText(row.mobileNumber),
    password: asText(row.password),
    passwordExpDate:
      (row.passwordExpDate as string | Date | undefined) ?? undefined,
    employeeId: asFiniteId(row.employeeId) || undefined,
    departmentId: asFiniteId(row.departmentId) || undefined,
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

function buildExaminationUserWritePayload(
  data: Partial<ExaminationAccount>,
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

function asEmployeeRows(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  const rec = asRecord(data);
  if (!rec) return [];
  if (Array.isArray(rec.resultList))
    return rec.resultList as Record<string, unknown>[];
  if (Array.isArray(rec.data)) return rec.data as Record<string, unknown>[];
  return [];
}

export async function listExaminationAccountColleges() {
  return listActiveCollegesForGeneralSettings();
}

export async function listExaminationAccountsByCollege(
  collegeId: number,
): Promise<ExaminationAccount[]> {
  if (!collegeId) return [];
  const rows = await domainListRawQuery<unknown>(
    "User",
    examinationAccountsByCollegeQuery(collegeId),
  );
  return rows
    .map(normalizeExaminationAccount)
    .filter((row): row is ExaminationAccount => row != null);
}

export async function getExaminationAccountById(
  userId: number,
): Promise<ExaminationAccount | null> {
  const query = `userId==${userId}.and.Usertype.userTypeCode==${EVALUATION_USER_TYPE_CODE}`;
  const rows = await domainList<unknown>("User", query);
  return normalizeExaminationAccount(rows[0] ?? null);
}

/**
 * Angular add modal `getEmployeeData`:
 * employeedetails?collegeId=&empDeptId=
 */
export async function listEmployeesForExaminationAccount(
  collegeId: number,
  departmentId: number,
): Promise<ExaminationEmployeeOption[]> {
  if (!collegeId || !departmentId) return [];
  const data = await fetchDetails<unknown>("employeedetails", {
    collegeId,
    empDeptId: departmentId,
  });
  return asEmployeeRows(data).map((row) => ({
    employeeId: asFiniteId(row.employeeId) || undefined,
    empNumber: asText(row.empNumber),
    firstName: asText(row.firstName),
    lastName: asText(row.lastName),
    email: asText(row.email),
    mobile: asText(row.mobile ?? row.mobileNumber),
    mobileNumber: asText(row.mobileNumber ?? row.mobile),
  }));
}

export interface CreateExaminationAccountResult {
  account: ExaminationAccount | null;
  success: boolean;
  message?: string;
}

/**
 * Angular: addMasterDetails('api/createuser', details)
 * → POST /cms/api/createuser (CREATE_USER_CMS)
 */
export async function createExaminationAccount(
  data: Omit<ExaminationAccount, "userId">,
): Promise<CreateExaminationAccountResult> {
  const organizationId = asFiniteId(data.organizationId);
  if (!organizationId) {
    throw new AppError(
      "VALIDATION",
      "Organization is required to create an examination account.",
    );
  }
  if (!asFiniteId(data.collegeId)) {
    throw new AppError(
      "VALIDATION",
      "College is required to create an examination account.",
    );
  }
  if (!asFiniteId(data.employeeId)) {
    throw new AppError(
      "VALIDATION",
      "Employee is required to create an examination account.",
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

  const userTypeId = await resolveEvaluationUserTypeId(organizationId);
  const payload = buildExaminationUserWritePayload(data, userTypeId);
  payload.password = data.password;
  payload.passwordConfirm = data.passwordConfirm;

  const res = await fetch(NEXT_API.PROXY(USER_MANAGEMENT_API.CREATE_USER_CMS), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const body: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    throw parseApiError(res, body);
  }

  if (body && typeof body === "object" && "success" in body) {
    const env = body as ApiResponse<ExaminationAccount>;
    if (env.success === false) {
      return {
        account: null,
        success: false,
        message: asText(env.message) || "Could not create user",
      };
    }
    const normalized = normalizeExaminationAccount(env.data);
    return {
      account:
        normalized ??
        ({ userId: 0, ...data, userTypeId } as ExaminationAccount),
      success: true,
      message: asText(env.message),
    };
  }

  return {
    account: { userId: 0, ...data, userTypeId },
    success: true,
  };
}

export async function updateExaminationAccount(
  userId: number,
  data: Partial<ExaminationAccount>,
): Promise<ExaminationAccount> {
  const organizationId = asFiniteId(data.organizationId);
  if (!organizationId) {
    throw new AppError(
      "VALIDATION",
      "Organization is required to update an examination account.",
    );
  }
  const userTypeId =
    asFiniteId(data.userTypeId) ||
    (await resolveEvaluationUserTypeId(organizationId));
  const payload = buildExaminationUserWritePayload(data, userTypeId, userId);
  const updated = await domainUpdate<unknown>(
    "User",
    "userId",
    userId,
    payload,
  );
  return (
    normalizeExaminationAccount(updated) ??
    ({ userId, ...data, userTypeId } as ExaminationAccount)
  );
}
