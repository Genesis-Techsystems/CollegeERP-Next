// ─── Auth Guard — Layer 2 of 3 ───────────────────────────────────────────────
//
// Runs server-side before any protected page renders. Decrypts the iron-session
// cookie and verifies that both `user` and `jwt` are present and valid.
// Redirects to /login if not — this catches expired or tampered sessions that
// passed the cookie-presence check in Layer 1.
//
// Layer 1 → src/middleware.ts
//   Fast cookie-presence check on every request. No session decryption.
//
// Layer 3 → src/components/shared/RoleGuard.tsx
//   Client-side component. Hides UI sections from users who lack a required
//   role. Does NOT replace Layers 1 & 2 — it is UI-only, not a security boundary.
//
// Server Component — DO NOT add 'use client'
// NOTE: Next.js 16 requires Node >=20.9.0. If build fails, run: nvm use 20 (or node --version)

import { redirect } from "next/navigation";
import { SessionProvider } from "@/context/SessionContext";
import { AppShell } from "@/components/layout";
import { getSession } from "@/lib/session";
import { springGetUserDetails } from "@/integrations/spring-api";
import { buildNavTree } from "@/lib/navigation";
import { getCachedNav, setCachedNav } from "@/lib/nav-cache";
import type { NavItem } from "@/types/navigation";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session.user || !session.jwt) {
    redirect("/login");
  }

  // Prefer nav built at login from GET /api/authorization?isMobile=false.
  // Refresh should not wait on Spring again unless the server cache was lost.
  let navItems: NavItem[] = [];
  const cached =
    session.issuedAt != null
      ? getCachedNav(session.user.userId, session.issuedAt)
      : null;

  if (cached) {
    navItems = cached;
  } else {
    try {
      const userDto = await springGetUserDetails(session.jwt);
      navItems = buildNavTree(userDto.modules ?? [], userDto.pages ?? []);
      if (session.issuedAt != null) {
        setCachedNav(session.user.userId, session.issuedAt, navItems);
      }
    } catch {
      // nav will be empty but app won't crash
    }
  }

  return (
    <SessionProvider initialUser={session.user}>
      <AppShell initialNavItems={navItems}>{children}</AppShell>
    </SessionProvider>
  );
}
