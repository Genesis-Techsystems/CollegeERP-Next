/**
 * BFF — POST /api/auth/update-password
 *
 * Angular ChangePasswordModal (student first-login):
 * PUT `{SPRING_API_URL}/api/auth/updatePassword` with encrypted FormData.
 * No session exists yet, so this cannot go through `/api/proxy`.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { APP_CONFIG } from "@/config/constants/app";
import { springUpdateStudentPassword } from "@/integrations/spring-api";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const bodySchema = z.object({
  userName: z.string().min(1),
  newPassword: z.string().min(1),
  confirmPassword: z.string().min(1),
});

export async function POST(request: NextRequest) {
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

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }

  const { userName, newPassword, confirmPassword } = parsed.data;
  if (newPassword !== confirmPassword) {
    return NextResponse.json(
      { message: "New Password and Confirm Password should be same." },
      { status: 400 },
    );
  }

  try {
    const result = await springUpdateStudentPassword({
      userName,
      newPassword,
      confirmPassword,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Error && err.message
        ? err.message
        : "Password update failed";
    return NextResponse.json({ message }, { status: 400 });
  }
}
