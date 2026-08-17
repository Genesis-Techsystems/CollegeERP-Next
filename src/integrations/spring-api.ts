// SERVER ONLY — never import this in client components
import type { UserDTO, UserRoleEntry } from '@/types/user'
import type { Module, Page } from '@/types/navigation'
import type { ApiResponse } from '@/types/api'
import { AUTH_API } from '@/config/constants/api'
import { getEncryptedValue } from '@/common/generic-functions'

function asArray<T>(...candidates: unknown[]): T[] {
  for (const value of candidates) {
    if (Array.isArray(value)) return value as T[]
  }
  return []
}

/** Spring field names vary; Angular reads `modules` / `pages` / `userRoles`. */
function normalizeAuthorizationDto(data: UserDTO): UserDTO {
  const row = data as UserDTO & Record<string, unknown>
  return {
    ...data,
    userRole: String(row.userRole ?? row.UserRole ?? data.userRole ?? ''),
    userTypeCode: String(
      row.userTypeCode ?? row.UserTypeCode ?? data.userTypeCode ?? '',
    ),
    roleName: String(row.roleName ?? row.RoleName ?? data.roleName ?? ''),
    userRoles: asArray<UserRoleEntry>(
      row.userRoles,
      row.UserRoles,
      row.userRoleList,
    ),
    modules: asArray<Module>(row.modules, row.Modules, row.moduleList),
    pages: asArray<Page>(row.pages, row.Pages, row.pageList),
  }
}

/**
 * Result of the Spring `/api/auth/login` call. The backend's login is two-phase
 * for 2FA accounts: a password-only call sends an OTP and returns
 * `data: { twoFactorRequired: true }` (no token); a password + `otp` call
 * validates the code and returns the JWT string in `data`. Non-2FA accounts get
 * a JWT straight from the password call.
 *
 * Student first-login (`resetPwd: true`) returns no JWT — Angular opens
 * Change Password instead of completing the session.
 */
export type SpringLoginResult =
  | { status: 'authenticated'; jwt: string }
  | { status: 'otp_required' }
  | { status: 'reset_pwd_required'; message?: string }

/**
 * Calls the Spring Boot login endpoint. Pass `otp` to complete the second
 * (verify) phase for a 2FA account. Returns a discriminated result; throws a
 * generic error on failure — never exposes backend details.
 */
export async function springLogin(
  usernameOrEmail: string,
  password: string,
  otp?: string,
): Promise<SpringLoginResult> {
  const url = `${process.env.SPRING_API_URL}/${AUTH_API.LOGIN}`
  const payload: Record<string, unknown> = { usernameOrEmail, password, isMobile: false }
  if (otp) payload.otp = otp

  let res: Response
  try {
    // Spring can be slow on cold start; abort so the BFF never hangs forever.
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30_000),
    })
  } catch {
    throw new Error('Login service unavailable')
  }

  if (!res.ok) {
    throw new Error('Authentication failed')
  }

  let body: ApiResponse<unknown>
  try {
    body = await res.json()
  } catch {
    throw new Error('Authentication failed')
  }

  if (!body.success) {
    throw new Error('Authentication failed')
  }

  // 2FA challenge / student first-login password reset (no token yet).
  if (body.data && typeof body.data === 'object') {
    const data = body.data as { twoFactorRequired?: boolean; resetPwd?: boolean }
    if (data.twoFactorRequired === true) {
      return { status: 'otp_required' }
    }
    if (data.resetPwd === true) {
      return {
        status: 'reset_pwd_required',
        message: typeof body.message === 'string' ? body.message : undefined,
      }
    }
  }

  // A JWT comes back as a non-empty string in `data`.
  if (typeof body.data === 'string' && body.data.length > 0) {
    return { status: 'authenticated', jwt: body.data }
  }

  throw new Error('Authentication failed')
}

/**
 * Calls Spring Boot /api/authorization, returns UserDTO.
 * Throws a generic error on failure — never exposes backend details.
 */
export async function springGetUserDetails(jwt: string): Promise<UserDTO> {
  const url = `${process.env.SPRING_API_URL}/${AUTH_API.AUTHORIZATION}?isMobile=false`

  let res: Response
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
    })
  } catch {
    throw new Error('User details service unavailable')
  }

  if (!res.ok) {
    throw new Error('Failed to retrieve user details')
  }

  let body: ApiResponse<UserDTO>
  try {
    body = await res.json()
  } catch {
    throw new Error('Failed to retrieve user details')
  }

  if (!body.success || !body.data) {
    throw new Error('Failed to retrieve user details')
  }

  return normalizeAuthorizationDto(body.data)
}

/**
 * Resolve the employee record for a user — Angular login getEmployee():
 * GET employeedetailsbyid?userId=<id>. The /api/authorization response does NOT
 * include employeeId (it's null there); this endpoint provides it. Returns null
 * if the user has no employee record (e.g. students) or on any error.
 */
export async function springGetEmployeeByUserId(
  jwt: string,
  userId: number,
): Promise<Record<string, unknown> | null> {
  if (!userId) return null
  const url = `${process.env.SPRING_API_URL}/employeedetailsbyid?userId=${userId}`
  let res: Response
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
    })
  } catch {
    return null
  }
  if (!res.ok) return null
  const body = (await res.json().catch(() => null)) as
    | { success?: boolean; data?: Record<string, unknown> }
    | null
  if (!body?.success || !body.data) return null
  return body.data
}

/**
 * Resolve the student record for a user — Angular login getStudent():
 * GET studentdetail?userId=<id>. The /api/authorization response often omits
 * studentId; this endpoint provides it for student/parent portal users.
 */
export async function springGetStudentByUserId(
  jwt: string,
  userId: number,
): Promise<Record<string, unknown> | null> {
  if (!userId) return null
  const url = `${process.env.SPRING_API_URL}/studentdetail?userId=${userId}`
  let res: Response
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
    })
  } catch {
    return null
  }
  if (!res.ok) return null
  const body = (await res.json().catch(() => null)) as
    | { success?: boolean; data?: Record<string, unknown> | Record<string, unknown>[] }
    | null
  if (!body?.success || !body.data) return null
  if (Array.isArray(body.data)) {
    return (body.data[0] as Record<string, unknown> | undefined) ?? null
  }
  return body.data as Record<string, unknown>
}

/**
 * Angular ChangePasswordModal → PUT `{MAINAPI}api/auth/updatePassword`
 * with FormData `data` = double-AES ciphertext of
 * `{ userName, newPassword, confirmPassword }`.
 *
 * Called before a session exists (student first-login), so no JWT is sent —
 * Angular also has no token stored yet (`Bearer null`).
 */
export async function springUpdateStudentPassword(payload: {
  userName: string
  newPassword: string
  confirmPassword: string
}): Promise<{ success: boolean; message: string }> {
  const url = `${process.env.SPRING_API_URL}/${AUTH_API.RESET_STD_PASSWORD}`
  const formData = new FormData()
  formData.append('data', getEncryptedValue(payload))

  let res: Response
  try {
    res = await fetch(url, {
      method: 'PUT',
      body: formData,
      signal: AbortSignal.timeout(30_000),
    })
  } catch {
    throw new Error('Password update service unavailable')
  }

  let body: ApiResponse<unknown> | null = null
  try {
    body = (await res.json()) as ApiResponse<unknown>
  } catch {
    throw new Error('Password update failed')
  }

  const message =
    typeof body?.message === 'string' && body.message.trim()
      ? body.message
      : res.ok
        ? 'Password updated successfully'
        : 'Password update failed'

  if (!res.ok || !body?.success) {
    throw new Error(message)
  }

  return { success: true, message }
}
