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
import { springLogin, springGetUserDetails, springGetEmployeeByUserId, springGetStudentByUserId } from '@/integrations/spring-api'
import type { IronSessionData, SessionUser } from '@/types/user'
import { APP_CONFIG, isEvaluatorRole } from '@/config/constants/app'

// In-memory rate limiter: max 10 requests per minute per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

const loginSchema = z.object({
  usernameOrEmail: z.string().min(1),
  password: z.string().min(1),
  // Present only on the second (verify) phase of an evaluator OTP login.
  otp: z.string().optional(),
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

  const { usernameOrEmail, password, otp } = parsed.data

  try {
    // 3. Call springLogin(). The backend is two-phase for 2FA accounts:
    //    - password only → it sends an OTP and returns { otp_required } (no token)
    //    - password + otp → it validates the code and returns the JWT
    // The browser re-sends the credentials with the code on the verify phase.
    const loginResult = await springLogin(usernameOrEmail, password, otp)
    if (loginResult.status === 'otp_required') {
      // Backend sent an OTP → prompt for it. No session is created yet.
      return NextResponse.json({ otpRequired: true })
    }
    const jwt = loginResult.jwt

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
      collegeLogo: userDto.collegeLogo,
      academicYearId: userDto.academicYearId,
      academicYear: userDto.academicYear,
      employeeId: userDto.employeeId,
      studentId: userDto.studentId,
      organizationId: userDto.organizationId,
      organizationCode: userDto.organizationCode,
      universityId: userDto.universityId,
      universityCode: userDto.universityCode,
      isAdmin: userRole === 'ADMIN' || userRole === 'SUPERADMIN',
      isPrincipal: roleName.toUpperCase().includes('PRINCIPAL'),
      isHod:
        roleName.toUpperCase().includes('HOD') ||
        roleName.toUpperCase().includes('HEAD OF'),
      isManagement:
        userTypeCode.toUpperCase().includes('MGNT') ||
        roleName.toUpperCase().includes('MANAGEMENT'),
      // Evaluator accounts (which cleared the OTP step above) land on the
      // dedicated evaluator portal; everyone else on the standard dashboard.
      defaultDashboardPath: isEvaluatorRole(userRole, roleName) ? '/evaluator' : '/dashboard',
    }

    // /api/authorization returns employeeId=null. Angular login getEmployee()
    // resolves it via employeedetailsbyid?userId=<id> for staff-type users.
    // Skip for students/parents (they have no employee record).
    const role = userRole.toUpperCase()
    const isStudentLike = role === 'STUDENT' || role === 'MSTUDENT' || role === 'PARENT'
    if (!sessionUser.employeeId && userDto.userId && !isStudentLike) {
      const emp = await springGetEmployeeByUserId(jwt, Number(userDto.userId)).catch(() => null)
      const empId = Number(emp?.employeeId ?? 0)
      if (empId > 0) sessionUser.employeeId = empId
    }

    // Angular login getStudent() — authorization DTO often omits studentId.
    if (isStudentLike && !sessionUser.studentId && userDto.userId) {
      const student = await springGetStudentByUserId(jwt, Number(userDto.userId)).catch(() => null)
      const sid = Number(student?.studentId ?? 0)
      if (sid > 0) sessionUser.studentId = sid
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
    // 8. Never expose backend error details. When an OTP was supplied the failure
    // is a bad/expired code — keep the client on the OTP step with a fitting message.
    if (otp) {
      return NextResponse.json(
        { message: 'Invalid or expired verification code', otpRequired: true },
        { status: 401 },
      )
    }
    return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 })
  }
}
