// SERVER ONLY — never import this in client components
import type { UserDTO } from '@/types/user'
import type { ApiResponse } from '@/types/api'
import { AUTH_API } from '@/config/constants/api'

/**
 * Calls Spring Boot login endpoint, returns JWT string on success.
 * Throws a generic error on failure — never exposes backend details.
 */
export async function springLogin(
  usernameOrEmail: string,
  password: string,
): Promise<string> {
  const url = `${process.env.SPRING_API_URL}/${AUTH_API.LOGIN}`

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernameOrEmail, password, isMobile: false }),
    })
  } catch {
    throw new Error('Login service unavailable')
  }

  if (!res.ok) {
    throw new Error('Authentication failed')
  }

  let body: ApiResponse<string>
  try {
    body = await res.json()
  } catch {
    throw new Error('Authentication failed')
  }

  if (!body.success || !body.data) {
    throw new Error('Authentication failed')
  }

  return body.data
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

  return body.data
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
