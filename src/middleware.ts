// ─── Auth Guard — Layer 1 of 3 ───────────────────────────────────────────────
//
// This is the FIRST line of auth protection. It runs on every matched request
// before any page or layout renders.
//
// What it checks: cookie presence only (fast, no DB or session decryption).
// What it does NOT check: whether the session is valid or the token is still
// alive — that is handled in Layer 2.
//
// Layer 2 → src/app/(pages)/(protected)/layout.tsx
//   Full session validation (decrypts iron-session, checks jwt + user fields).
//   Redirects to /login if the session is expired or tampered.
//
// Layer 3 → src/components/shared/RoleGuard.tsx
//   Client-side component. Hides UI sections from users who lack a required
//   role. Does NOT replace Layers 1 & 2 — it is UI-only, not a security boundary.
//
import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get(
    process.env.SESSION_COOKIE_NAME || 'college_erp_session',
  )

  if (!sessionCookie) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - /login          — public auth page
     * - /api/           — API routes handle auth internally
     * - /_next/static   — Next.js static assets
     * - /_next/image    — Next.js image optimization
     * - /favicon.ico, /robots.txt, /sitemap.xml — static files
     *
     * Route groups like (protected) are filesystem-only — they never
     * appear in actual request URLs, so `/(protected)/:path*` would never match.
     */
    '/((?!login|api|_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml).*)',
  ],
}
