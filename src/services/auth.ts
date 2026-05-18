/**
 * Authentication service layer.
 *
 * Wraps the Next.js /api/auth/* routes and the user-access proxy endpoint.
 * Client components must use these functions — never call fetch() with raw
 * auth URL strings directly.
 *
 * All paths are sourced from NEXT_API / AUTH_API constants.
 */

import { AUTH_API, EMPLOYEE_API, NEXT_API } from '@/config/constants/api'
import type { SessionUser } from '@/types/user'
import { fetchDetails } from './crud'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LoginCredentials {
  usernameOrEmail: string
  password: string
}

let preferredUserAccessPath: string = `api/${AUTH_API.USER_ACCESS}`

// ─── login ────────────────────────────────────────────────────────────────────

/**
 * Log the user in.
 *
 * POSTs credentials to the Next.js login route which sets the iron-session
 * cookie. Returns the parsed JSON body (including `user`) or throws on
 * non-OK responses.
 */
export async function login(credentials: LoginCredentials): Promise<any> {
  const res = await fetch(NEXT_API.AUTH.LOGIN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usernameOrEmail: credentials.usernameOrEmail, password: credentials.password }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message ?? 'Invalid username or password')
  }

  return res.json()
}

// ─── logout ───────────────────────────────────────────────────────────────────

/**
 * Log the current user out.
 *
 * POSTs to the Next.js logout route which clears the iron-session cookie.
 * Returns void — errors are silently swallowed so the redirect always fires.
 */
export async function logout(): Promise<void> {
  await fetch(NEXT_API.AUTH.LOGOUT, { method: 'POST' })
}

// ─── getUserAccess ────────────────────────────────────────────────────────────

/**
 * Fetch the current user's accessible modules/pages by userId.
 *
 * Returns the parsed JSON body (with `success` and `data.modules`) or throws
 * on non-OK responses.
 */
export async function getUserAccess(userId: string | number): Promise<any> {
  const query = new URLSearchParams({ userId: String(userId), status: 'true' }).toString()
  const primaryUrl = `${NEXT_API.PROXY(preferredUserAccessPath)}?${query}`
  let res = await fetch(primaryUrl)

  // Some environments expose this endpoint as /useraccess while others use /api/useraccess.
  if (res.status === 404) {
    const fallbackPath =
      preferredUserAccessPath === AUTH_API.USER_ACCESS
        ? `api/${AUTH_API.USER_ACCESS}`
        : AUTH_API.USER_ACCESS
    const fallbackUrl = `${NEXT_API.PROXY(fallbackPath)}?${query}`
    res = await fetch(fallbackUrl)
    if (res.ok) {
      preferredUserAccessPath = fallbackPath
    }
  }

  if (!res.ok) {
    throw new Error(`Failed to fetch user access for userId=${userId}`)
  }

  return res.json()
}

/**
 * Returns the currently authenticated session user from /api/auth/me.
 * Returns null when the session is unavailable/expired.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const res = await fetch(NEXT_API.AUTH.ME, { cache: 'no-store' })
  if (!res.ok) return null
  const body = (await res.json().catch(() => null)) as { user?: SessionUser } | null
  return body?.user ?? null
}

/** Angular `login.component` → `employeedetailsbyid?userId=` → `localStorage.employeeId`. */
export async function getEmployeeIdByUserId(userId: number): Promise<number> {
  if (!userId) return 0
  try {
    const data = await fetchDetails<Record<string, unknown>>(EMPLOYEE_API.DETAILS_BY_USER_ID, {
      userId,
    })
    const row = data && typeof data === 'object' ? data : {}
    for (const key of ['employeeId', 'pk_emp_id', 'emp_id', 'employee_id'] as const) {
      const n = Number(row[key])
      if (Number.isFinite(n) && n > 0) return n
    }
  } catch {
    return 0
  }
  return 0
}
