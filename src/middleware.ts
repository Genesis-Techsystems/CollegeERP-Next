// Next.js middleware — protects routes, redirects unauthenticated users to /login
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
