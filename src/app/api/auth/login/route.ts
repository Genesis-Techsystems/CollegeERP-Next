/**
 * BFF Login Route — POST /api/auth/login
 *
 * Authenticates the user against the Spring Boot backend and creates an
 * Iron Session cookie. The JWT is stored server-side in the session and
 * NEVER returned to the browser.
 *
 * Flow:
 *   1. Rate-limit check (in-memory, per IP)
 *   2. Validate request body with Zod
 *   3. Call Spring Boot POST /api/auth/login -> JWT
 *   4. Call Spring Boot GET /api/authorization -> UserDTO
 *   5. Build SessionUser with derived privilege flags
 *   6. Store { jwt, user, issuedAt } in Iron Session
 *   7. Return slim SessionUser to client (no JWT, no modules/pages)
 */
import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { sessionOptions } from '@/lib/session'
import { springLogin, springGetUserDetails } from '@/integrations/spring-api'
import { pickEmployeeIdFromUserDto } from '@/lib/user-context'
import type { IronSessionData, SessionUser } from '@/types/user'
import { APP_CONFIG } from '@/config/constants/app'

// In-memory rate limiter: max 10 requests per minute per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

const loginSchema = z.object({
  usernameOrEmail: z.string().min(1),
  password: z.string().min(1),
})

export async function POST(request: NextRequest) {
  // 1. Rate limit check
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (entry) {
    if (now < entry.resetAt) {
      if (entry.count >= APP_CONFIG.LOGIN_RATE_LIMIT) {
        return NextResponse.json({ message: 'Too many requests' }, { status: 429 })
      }
      entry.count++
    } else {
      rateLimitMap.set(ip, { count: 1, resetAt: now + APP_CONFIG.RATE_LIMIT_WINDOW_MS })
    }
  } else {
    rateLimitMap.set(ip, { count: 1, resetAt: now + APP_CONFIG.RATE_LIMIT_WINDOW_MS })
  }

  // 2. Parse + validate body with Zod
  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 })
  }

  const parsed = loginSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 })
  }

  const { usernameOrEmail, password } = parsed.data

  try {
    // 3. Call springLogin() → JWT
    const jwt = await springLogin(usernameOrEmail, password)

    // 4. Call springGetUserDetails(jwt) → UserDTO
    const userDto = await springGetUserDetails(jwt)

    // 5. Build SessionUser with derived flags
    const userRole = userDto.userRole ?? ''
    const roleName = userDto.roleName ?? ''
    const userTypeCode = userDto.userTypeCode ?? ''

    const sessionUser: SessionUser = {
      userId: userDto.userId,
      userName: userDto.userName,
      firstName: userDto.firstName,
      lastName: userDto.lastName,
      userRole,
      userTypeCode,
      roleName,
      collegeId: userDto.collegeId,
      collegeCode: userDto.collegeCode,
      collegeName: userDto.collegeName,
      academicYearId: userDto.academicYearId,
      academicYear: userDto.academicYear,
      employeeId: pickEmployeeIdFromUserDto(userDto),
      studentId: userDto.studentId,
      organizationId: userDto.organizationId,
      universityId: userDto.universityId,
      universityCode: userDto.universityCode,
      isAdmin: userRole === 'ADMIN' || userRole === 'SUPERADMIN',
      isPrincipal: roleName.toUpperCase().includes('PRINCIPAL'),
      isManagement:
        userTypeCode.toUpperCase().includes('MGNT') ||
        roleName.toUpperCase().includes('MANAGEMENT'),
      defaultDashboardPath: '/dashboard',
    }

    // 6. Store { jwt, user, issuedAt } in Iron Session — JWT never leaves the server
    // Note: modules/pages are NOT stored here (cookie size limit ~4KB) — fetched fresh via /api/auth/me
    const session = await getIronSession<IronSessionData>(await cookies(), sessionOptions)
    session.jwt = jwt
    session.user = sessionUser
    session.issuedAt = Date.now()
    await session.save()

    // 7. Return slim user to client — modules/pages excluded (nav built server-side in layout)
    return NextResponse.json({ user: sessionUser })
  } catch {
    // 8. Never expose backend error details
    return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 })
  }
}
