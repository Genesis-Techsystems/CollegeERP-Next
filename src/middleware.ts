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
  matcher: ['/(protected)/:path*', '/dashboard/:path*'],
}
