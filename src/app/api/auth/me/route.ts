// BFF /me route — returns current session user data (nav is built server-side in layout, not here)
import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions } from "@/lib/session";
import type { IronSessionData } from "@/types/user";
import {
  APP_CONFIG,
  resolveDefaultDashboardPath,
} from "@/config/constants/app";
import {
  springGetEmployeeByUserId,
  springGetStudentByUserId,
} from "@/integrations/spring-api";

export async function GET() {
  const session = await getIronSession<IronSessionData>(
    await cookies(),
    sessionOptions,
  );

  if (!session.user || !session.issuedAt || !session.jwt) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (Date.now() - session.issuedAt > APP_CONFIG.SESSION_MAX_AGE_MS) {
    session.destroy();
    return NextResponse.json({ message: "Session expired" }, { status: 401 });
  }

  // Backfill employeeId (one-time) for sessions created before it was resolved
  // at login — /api/authorization returns it null; employeedetailsbyid has it.
  const role = String(session.user.userRole ?? "").toUpperCase();
  const studentLike =
    role === "STUDENT" || role === "MSTUDENT" || role === "PARENT";
  if (!session.user.employeeId && session.user.userId && !studentLike) {
    const emp = await springGetEmployeeByUserId(
      session.jwt,
      Number(session.user.userId),
    ).catch(() => null);
    const empId = Number(emp?.employeeId ?? 0);
    if (empId > 0) {
      session.user.employeeId = empId;
      await session.save();
    }
  }

  // Backfill studentId for student portal sessions — Angular login getStudent().
  if (studentLike && !session.user.studentId && session.user.userId) {
    const student = await springGetStudentByUserId(
      session.jwt,
      Number(session.user.userId),
    ).catch(() => null);
    const sid = Number(student?.studentId ?? 0);
    if (sid > 0) {
      session.user.studentId = sid;
      await session.save();
    }
  }

  // Keep role home path current for sessions created before student-dashboard routing.
  const nextHome = resolveDefaultDashboardPath(
    session.user.userRole,
    session.user.roleName,
  );
  if (session.user.defaultDashboardPath !== nextHome) {
    session.user.defaultDashboardPath = nextHome;
    await session.save();
  }

  // Return session user only — modules/pages are never included (nav tree built server-side)
  return NextResponse.json({ user: session.user });
}
