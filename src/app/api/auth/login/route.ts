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
 *   4. Call Spring Boot GET /api/authorization?isMobile=false -> UserDTO
 *   5. Build SessionUser with derived privilege flags
 *   6. Build sidenav once (buildNavTree) and cache server-side; store { jwt, user, issuedAt } in Iron Session
 *   7. Return slim SessionUser to client (no JWT, no modules/pages)
 */
import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { z } from "zod";
import { sessionOptions } from "@/lib/session";
import {
  springLogin,
  springGetUserDetails,
  springGetEmployeeByUserId,
  springGetStudentByUserId,
} from "@/integrations/spring-api";
import type { IronSessionData, SessionUser, UserDTO } from "@/types/user";
import {
  APP_CONFIG,
  isChiefEvaluatorRole,
  resolveDefaultDashboardPath,
} from "@/config/constants/app";
import { setCachedNav } from "@/lib/nav-cache";
import { ROLE_FLAGS_VERSION, deriveRoleFlagsFromDto } from "@/lib/user-context";

// In-memory rate limiter: max 10 requests per minute per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const loginSchema = z.object({
  usernameOrEmail: z.string().min(1),
  password: z.string().min(1),
  // Present only on the second (verify) phase of an evaluator OTP login.
  otp: z.string().optional(),
});

export async function POST(request: NextRequest) {
  // 1. Rate limit check
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (entry) {
    if (now < entry.resetAt) {
      if (entry.count >= APP_CONFIG.LOGIN_RATE_LIMIT) {
        return NextResponse.json(
          { message: "Too many requests" },
          { status: 429 },
        );
      }
      entry.count++;
    } else {
      rateLimitMap.set(ip, {
        count: 1,
        resetAt: now + APP_CONFIG.RATE_LIMIT_WINDOW_MS,
      });
    }
  } else {
    rateLimitMap.set(ip, {
      count: 1,
      resetAt: now + APP_CONFIG.RATE_LIMIT_WINDOW_MS,
    });
  }

  // 2. Parse + validate body with Zod
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Invalid credentials" },
      { status: 401 },
    );
  }

  const parsed = loginSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid credentials" },
      { status: 401 },
    );
  }

  const { usernameOrEmail, password, otp } = parsed.data;

  try {
    // 3. Call springLogin(). The backend is two-phase for 2FA accounts:
    //    - password only → it sends an OTP and returns { otp_required } (no token)
    //    - password + otp → it validates the code and returns the JWT
    // The browser re-sends the credentials with the code on the verify phase.
    const loginResult = await springLogin(usernameOrEmail, password, otp);
    if (loginResult.status === "otp_required") {
      // Backend sent an OTP → prompt for it. No session is created yet.
      return NextResponse.json({ otpRequired: true });
    }
    if (loginResult.status === "reset_pwd_required") {
      // Student first-login — Angular opens Change Password and does not
      // store a token. No session is created until they log in again.
      return NextResponse.json({
        resetPwdRequired: true,
        message: loginResult.message,
      });
    }
    const jwt = loginResult.jwt;

    // 4. Call springGetUserDetails(jwt) → UserDTO
    const userDto = await springGetUserDetails(jwt);

    // 5. Build SessionUser with derived flags
    const userRole = userDto.userRole ?? "";
    const roleName = userDto.roleName ?? "";
    const userTypeCode = userDto.userTypeCode ?? "";

    const dto = userDto as UserDTO & Record<string, unknown>;
    const nestedAy = (dto.academicYear ?? dto.AcademicYear) as
      | { academicYearId?: number; academicYear?: string }
      | string
      | undefined;
    const academicYearId =
      Number(dto.academicYearId ?? 0) ||
      (nestedAy && typeof nestedAy === "object"
        ? Number(nestedAy.academicYearId ?? 0)
        : 0);
    const academicYearLabel =
      typeof dto.academicYear === "string"
        ? dto.academicYear
        : nestedAy && typeof nestedAy === "object"
          ? String(nestedAy.academicYear ?? "")
          : typeof nestedAy === "string"
            ? nestedAy
            : "";

    const nestedCollege = (dto.college ?? dto.College) as
      | {
          collegeId?: number;
          collegeCode?: string;
          collegeName?: string;
          universityId?: number;
          universityCode?: string;
        }
      | undefined;
    const collegeId =
      Number(dto.collegeId ?? 0) || Number(nestedCollege?.collegeId ?? 0) || 0;

    const nestedUniversity = (dto.university ?? dto.University) as
      | { universityId?: number; universityCode?: string }
      | undefined;
    const universityId =
      Number(userDto.universityId ?? 0) ||
      Number(nestedUniversity?.universityId ?? 0) ||
      Number(nestedCollege?.universityId ?? 0) ||
      0;
    const universityCode =
      userDto.universityCode ||
      nestedUniversity?.universityCode ||
      nestedCollege?.universityCode ||
      "";

    const roleUpper = userRole.toUpperCase();
    const roleNameUpper = roleName.toUpperCase();
    const hasAdminRole = (userDto.userRoles ?? []).some(
      (r) =>
        r.isActive !== false &&
        String(r.roleName ?? "").toUpperCase() === "ADMIN",
    );
    // Angular login: localStorage.isDeprtAdmin = true when userRoles has DEPTADMIN
    const isDeptAdmin = (userDto.userRoles ?? []).some(
      (r) =>
        r.isActive !== false &&
        String(r.roleName ?? "").toUpperCase() === "DEPTADMIN",
    );

    const roleFlags = deriveRoleFlagsFromDto(
      { ...userDto, roleName, userTypeCode },
      { roleName, userTypeCode },
    );

    const sessionUser: SessionUser = {
      userId: userDto.userId,
      userName: userDto.userName,
      firstName: userDto.firstName,
      lastName: userDto.lastName,
      userRole,
      userTypeCode,
      roleName,
      collegeId,
      collegeCode: userDto.collegeCode ?? nestedCollege?.collegeCode ?? "",
      collegeName: userDto.collegeName ?? nestedCollege?.collegeName ?? "",
      collegeLogo: userDto.collegeLogo,
      academicYearId,
      academicYear: academicYearLabel || userDto.academicYear,
      employeeId: userDto.employeeId,
      studentId: userDto.studentId,
      organizationId: userDto.organizationId,
      organizationCode: userDto.organizationCode,
      universityId: universityId || undefined,
      universityCode: universityCode || undefined,
      isAdmin:
        roleUpper === "ADMIN" ||
        roleUpper === "SUPERADMIN" ||
        roleNameUpper === "SKOLOADMIN" ||
        hasAdminRole,
      isPrincipal: roleFlags.isPrincipal,
      isHod: roleFlags.isHod,
      isManagement: roleFlags.isManagement,
      isViceChancellor: roleFlags.isViceChancellor,
      isDeptAdmin,
      isChiefEvaluator: isChiefEvaluatorRole(
        userRole,
        roleName,
        userDto.userRoles,
      ),
      // Angular parity: evaluators → /evaluator, students → /student-dashboard,
      // Admin/Staff/others → /dashboard.
      defaultDashboardPath: resolveDefaultDashboardPath(userRole, roleName),
    };

    // /api/authorization returns employeeId=null. Angular login getEmployee()
    // resolves it via employeedetailsbyid?userId=<id> for staff-type users.
    // Skip for students/parents (they have no employee record).
    const role = userRole.toUpperCase();
    const isStudentLike =
      role === "STUDENT" || role === "MSTUDENT" || role === "PARENT";
    if (!sessionUser.employeeId && userDto.userId && !isStudentLike) {
      const emp = await springGetEmployeeByUserId(
        jwt,
        Number(userDto.userId),
      ).catch(() => null);
      const empId = Number(emp?.employeeId ?? 0);
      if (empId > 0) sessionUser.employeeId = empId;
    }

    // Angular login getStudent() — authorization DTO often omits studentId.
    if (isStudentLike && !sessionUser.studentId && userDto.userId) {
      const student = await springGetStudentByUserId(
        jwt,
        Number(userDto.userId),
      ).catch(() => null);
      const sid = Number(student?.studentId ?? 0);
      if (sid > 0) sessionUser.studentId = sid;
    }

    // 6. Store { jwt, user, issuedAt } in Iron Session — JWT never leaves the server.
    // modules/pages stay out of the cookie (~4KB limit). Build the sidenav once
    // from this authorization response and cache it server-side (Angular keeps
    // loginUser.modules/pages in memory/localStorage for the same reason).
    // Dynamic import keeps /api/auth/login free of the heavy navigation graph so
    // failed/slow first compiles do not freeze the whole login request.
    const issuedAt = Date.now();
    try {
      const { buildNavTree } = await import("@/lib/navigation");
      const navItems = buildNavTree(userDto.modules ?? [], userDto.pages ?? []);
      setCachedNav(sessionUser.userId, issuedAt, navItems);
    } catch {
      // Layout rebuilds nav on cache miss — login must still succeed.
    }

    const session = await getIronSession<IronSessionData>(
      await cookies(),
      sessionOptions,
    );
    session.jwt = jwt;
    session.user = sessionUser;
    session.issuedAt = issuedAt;
    session.roleFlagsVersion = ROLE_FLAGS_VERSION;
    await session.save();

    // 7. Return slim user to client — modules/pages excluded (nav from cache/layout)
    return NextResponse.json({
      user: sessionUser,
      userRoles: userDto.userRoles ?? [],
    });
  } catch {
    // 8. Never expose backend error details. When an OTP was supplied the failure
    // is a bad/expired code — keep the client on the OTP step with a fitting message.
    if (otp) {
      return NextResponse.json(
        { message: "Invalid or expired verification code", otpRequired: true },
        { status: 401 },
      );
    }
    return NextResponse.json(
      { message: "Invalid credentials" },
      { status: 401 },
    );
  }
}
