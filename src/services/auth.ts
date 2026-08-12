/**
 * Authentication service layer.
 *
 * Wraps the Next.js /api/auth/* routes and the user-access proxy endpoint.
 * Client components must use these functions — never call fetch() with raw
 * auth URL strings directly.
 *
 * All paths are sourced from NEXT_API / AUTH_API constants.
 */

import { EMPLOYEE_API, NEXT_API, AUTH_API } from "@/config/constants/api";
import { clearStickyRoleFlagsFromLocalStorage } from "@/lib/employee-login-context";
import type { SessionUser, UserRoleEntry } from "@/types/user";
import { fetchDetails } from "./crud";

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
}

function persistUserRolesForApprovalPages(userRoles?: UserRoleEntry[]): void {
  if (typeof globalThis.window === "undefined" || !userRoles?.length) return;
  try {
    globalThis.localStorage.setItem(
      "userDetails",
      JSON.stringify({ userRoles }),
    );
  } catch {
    // ignore quota / private mode
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
  persistUserRolesForApprovalPages(result.userRoles);
  return result;
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
