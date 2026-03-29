// SERVER ONLY — never import this in client components
import type { UserDTO } from '@/types/user'
import type { ApiResponse } from '@/types/api'

/**
 * Calls Spring Boot login endpoint, returns JWT string on success.
 * Throws a generic error on failure — never exposes backend details.
 */
export async function springLogin(
  usernameOrEmail: string,
  password: string,
): Promise<string> {
  const url = `${process.env.SPRING_API_URL}/api/auth/login`

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
  const url = `${process.env.SPRING_API_URL}/api/authorization?isMobile=false`

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
