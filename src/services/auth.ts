/**
 * Authentication service layer.
 *
 * Wraps the Next.js /api/auth/* routes and the user-access proxy endpoint.
 * Client components must use these functions — never call fetch() with raw
 * auth URL strings directly.
 *
 * All paths are sourced from NEXT_API / AUTH_API constants.
 */

import { EMPLOYEE_API, EXAM_EVAL_API, NEXT_API, AUTH_API } from "@/config/constants/api";
import {
  isEvaluatorRole,
  isQuestionPaperSetterRole,
} from "@/config/constants/app";
import { clearStickyRoleFlagsFromLocalStorage } from "@/lib/employee-login-context";
import {
  isNewVcDashboardUserType,
  roleLooksLikeViceChancellor,
} from "@/lib/user-context";
import type { SessionUser, UserRoleEntry } from "@/types/user";
import { buildQuery, domainList, fetchDetails } from "./crud";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LoginCredentials {
  usernameOrEmail: string;
  password: string;
  /** Second-phase OTP for evaluator logins. Omit on the first (credentials) call. */
  otp?: string;
}

export interface LoginResult {
  /** Present when authentication completed (non-evaluator, or verified evaluator). */
  user?: SessionUser;
  /** Angular loginUser.userRoles — used for approval-page role filters. */
  userRoles?: UserRoleEntry[];
  /** True when an evaluator account still needs its OTP verified. */
  otpRequired?: boolean;
  /**
   * Angular `result.data.resetPwd === true` — student must change password
   * before a session is created.
   */
  resetPwdRequired?: boolean;
  /** Optional backend message shown when opening the change-password modal. */
  message?: string;
}

function persistUserRolesForApprovalPages(
  user?: SessionUser,
  userRoles?: UserRoleEntry[],
): void {
  if (typeof globalThis.window === "undefined") return;
  const storage = globalThis.localStorage;
  const roles = Array.isArray(userRoles) ? userRoles : [];

  // Always replace — leftover userDetails from a previous account must not
  // drive dashboard tabs or approval filters.
  try {
    storage.setItem("userDetails", JSON.stringify({ userRoles: roles }));
  } catch {
    // ignore quota / private mode
  }

  const lastRoleName = [...roles]
    .map((r) => String(r.roleName ?? "").trim())
    .filter(Boolean)
    .at(-1);
  if (lastRoleName) storage.setItem("roleName", lastRoleName);
  else if (user?.roleName) storage.setItem("roleName", user.roleName);

  if (user?.userTypeCode) storage.setItem("userTypeCode", user.userTypeCode);
  if (user?.userRole) storage.setItem("userRole", user.userRole);

  // Angular login: reset student-only keys before getEmployee / getStudent.
  storage.setItem("groupCode", "null");
  storage.setItem("courseGroupId", "null");
  storage.setItem("courseName", "null");
  storage.removeItem("courseYearName");

  // Angular login.component.ts resets these then sets true from userRoles[].
  const sticky = [
    "isHOD",
    "isHODDashboard",
    "isPRINCIPAL",
    "isMgnt",
    "isUnvDean",
    "isViceChancellor",
    "isRegistrar",
    "isFinanceOfficer",
    "isProVC",
    "isAdmin",
    "isDeprtAdmin",
    "isChairman",
    "isSecretary",
    "isLibrarian",
    "isVicePrincipal",
    "isAccountant",
    "isTC",
    "showNewVCDashboard",
  ] as const;
  for (const key of sticky) storage.setItem(key, "false");

  for (const role of roles) {
    const name = String(role.roleName ?? "").trim();
    if (name === "VICE PRINCIPAL") storage.setItem("isVicePrincipal", "true");
    if (name === "HOD" || name === "CHAIRPERSON") {
      storage.setItem("isHODDashboard", "true");
      storage.setItem("isHOD", "true");
    }
    if (name === "PRINCIPAL" || name === "DEAN") {
      storage.setItem("isPRINCIPAL", "true");
    }
    if (name === "ACCOUNTANT") storage.setItem("isAccountant", "true");
    if (name === "MANAGEMENT" || name === "MMANAGEMENT") {
      storage.setItem("isMgnt", "true");
    }
    if (name === "ADMIN" || name === "EXAMADMIN") {
      storage.setItem("isAdmin", "true");
    }
    if (name === "FINANCE OFFICER") storage.setItem("isFinanceOfficer", "true");
    if (name === "UNIVERSITY DEAN") storage.setItem("isUnvDean", "true");
    if (roleLooksLikeViceChancellor(name)) {
      storage.setItem("isViceChancellor", "true");
    }
    if (name === "REGISTRAR") storage.setItem("isRegistrar", "true");
    if (name === "PRO VICE CHANCELLOR") storage.setItem("isProVC", "true");
    if (name === "CHAIRMAN") storage.setItem("isChairman", "true");
    if (name === "SECRETARY") storage.setItem("isSecretary", "true");
    if (name === "LIBRARY ASSISTANT" || name === "Library Head") {
      storage.setItem("isLibrarian", "true");
    }
    if (name === "TC") storage.setItem("isTC", "true");
    if (name === "DEPTADMIN") storage.setItem("isDeprtAdmin", "true");
  }

  const showNewVc = isNewVcDashboardUserType(user?.userTypeCode);
  storage.setItem("showNewVCDashboard", showNewVc ? "true" : "false");
  if (Boolean(user?.isViceChancellor) || showNewVc) {
    if (user?.isViceChancellor || roleLooksLikeViceChancellor(user?.userTypeCode)) {
      storage.setItem("isViceChancellor", "true");
    }
  }
}

let preferredUserAccessPath: string = `api/${AUTH_API.USER_ACCESS}`;

// ─── login ────────────────────────────────────────────────────────────────────

/**
 * Log the user in.
 *
 * POSTs credentials to the Next.js login route which sets the iron-session
 * cookie. Returns the parsed JSON body (including `user`) or throws on
 * non-OK responses.
 */
export async function login(
  credentials: LoginCredentials,
): Promise<LoginResult> {
  const res = await fetch(NEXT_API.AUTH.LOGIN, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      usernameOrEmail: credentials.usernameOrEmail,
      password: credentials.password,
      ...(credentials.otp ? { otp: credentials.otp } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? "Invalid username or password");
  }

  const result = (await res.json()) as LoginResult;
  persistUserRolesForApprovalPages(result.user, result.userRoles);
  if (typeof globalThis.window !== "undefined") {
    const { useNavigationStore } = await import("@/store/navigation-store");
    useNavigationStore.getState().resetNavItems();
    // Angular login getEvaluatorProfile() for Online Evaluator / QuestionPaperSetter / …
    void persistExamEvaluatorProfile(result.user, result.userRoles);
  }
  return result;
}

/**
 * Angular `getEvaluatorProfile` — domain ExamEvaluatorProfiles by user.userId.
 * Stores examEvaluatorProfileId + examEvaluatorRole for QP / evaluation pages.
 */
async function persistExamEvaluatorProfile(
  user?: SessionUser,
  userRoles?: UserRoleEntry[],
): Promise<void> {
  if (!user?.userId) return;
  const needsProfile =
    isQuestionPaperSetterRole(user.userRole, user.roleName, userRoles) ||
    isEvaluatorRole(user.userRole, user.roleName, userRoles);
  if (!needsProfile) return;

  try {
    const rows = await domainList<{
      examEvaluatorProfileId?: number;
      roleId?: number;
      role?: { roleId?: number };
    }>(
      EXAM_EVAL_API.EVALUATOR_PROFILES,
      buildQuery({ "user.userId": user.userId }),
    );
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row) return;
    const profileId = Number(row.examEvaluatorProfileId ?? 0);
    const roleId = Number(row.roleId ?? row.role?.roleId ?? 0);
    if (profileId > 0) {
      globalThis.localStorage.setItem(
        "examEvaluatorProfileId",
        String(profileId),
      );
    }
    if (roleId > 0) {
      globalThis.localStorage.setItem("examEvaluatorRole", String(roleId));
    }
  } catch {
    // Profile optional — QP pages fall back without it.
  }
}

export type ResetStudentPasswordPayload = {
  userName: string;
  newPassword: string;
  confirmPassword: string;
};

/**
 * Angular ChangePasswordModal `putUploadDetailsByRequest(resetStdPassword, …)`.
 * Completes student first-login password change. Does not create a session —
 * the student logs in again with the new password.
 */
export async function resetStudentPassword(
  payload: ResetStudentPasswordPayload,
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(NEXT_API.AUTH.UPDATE_PASSWORD, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const body = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    message?: string;
  };

  if (!res.ok || body.success === false) {
    throw new Error(body.message ?? "Password update failed");
  }

  return {
    success: true,
    message: body.message ?? "Password updated successfully",
  };
}

// ─── logout ───────────────────────────────────────────────────────────────────

/**
 * Log the current user out.
 *
 * POSTs to the Next.js logout route which clears the iron-session cookie.
 * Also clears sticky role flags (isHOD / isHODDashboard / …) so the next login
 * does not inherit HOD Dashboard from a previous browser session.
 * Returns void — errors are silently swallowed so the redirect always fires.
 */
export async function logout(): Promise<void> {
  try {
    await fetch(NEXT_API.AUTH.LOGOUT, { method: "POST" });
  } finally {
    clearStickyRoleFlagsFromLocalStorage();
    if (typeof globalThis.window !== "undefined") {
      const { useNavigationStore } = await import("@/store/navigation-store");
      useNavigationStore.getState().resetNavItems();
    }
  }
}

// ─── getUserAccess ────────────────────────────────────────────────────────────

/**
 * Fetch the current user's accessible modules/pages by userId.
 *
 * Returns the parsed JSON body (with `success` and `data.modules`) or throws
 * on non-OK responses.
 */
export async function getUserAccess(userId: string | number): Promise<any> {
  const query = new URLSearchParams({
    userId: String(userId),
    status: "true",
  }).toString();
  const primaryUrl = `${NEXT_API.PROXY(preferredUserAccessPath)}?${query}`;
  let res = await fetch(primaryUrl);

  // Some environments expose this endpoint as /useraccess while others use /api/useraccess.
  if (res.status === 404) {
    const fallbackPath =
      preferredUserAccessPath === AUTH_API.USER_ACCESS
        ? `api/${AUTH_API.USER_ACCESS}`
        : AUTH_API.USER_ACCESS;
    const fallbackUrl = `${NEXT_API.PROXY(fallbackPath)}?${query}`;
    res = await fetch(fallbackUrl);
    if (res.ok) {
      preferredUserAccessPath = fallbackPath;
    }
  }

  if (!res.ok) {
    throw new Error(`Failed to fetch user access for userId=${userId}`);
  }

  return res.json();
}

/**
 * Returns the currently authenticated session user from /api/auth/me.
 * Returns null when the session is unavailable/expired.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const res = await fetch(NEXT_API.AUTH.ME, { cache: "no-store" });
  if (!res.ok) return null;
  const body = (await res.json().catch(() => null)) as {
    user?: SessionUser;
  } | null;
  return body?.user ?? null;
}

/** Angular `login.component` → `employeedetailsbyid?userId=` → `localStorage.employeeId`. */
export async function getEmployeeIdByUserId(userId: number): Promise<number> {
  const ctx = await getEmployeeLoginContextByUserId(userId);
  return ctx?.employeeId ?? 0;
}

/** Full employee login context — Angular sets `isHOD`, `empDeptId`, `uName` from this call. */
export async function getEmployeeLoginContextByUserId(
  userId: number,
): Promise<import("@/lib/employee-login-context").EmployeeLoginContext | null> {
  if (!userId) return null;
  try {
    const data = await fetchDetails<Record<string, unknown>>(
      EMPLOYEE_API.DETAILS_BY_USER_ID,
      { userId },
    );
    const { parseEmployeeLoginContext, syncEmployeeLoginContextToStorage } =
      await import("@/lib/employee-login-context");
    const ctx = parseEmployeeLoginContext(data);
    if (ctx) syncEmployeeLoginContextToStorage(ctx);
    return ctx;
  } catch {
    return null;
  }
}
