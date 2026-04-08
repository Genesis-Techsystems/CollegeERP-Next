import { getIronSession } from 'iron-session'
import type { SessionOptions } from 'iron-session'
import { cookies } from 'next/headers'
import type { IronSessionData } from '@/types/user'

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (secret && secret.length >= 32) return secret

  // In dev, keep the app runnable even if env isn't configured yet.
  if (process.env.NODE_ENV !== 'production') {
    return 'dev-only-session-secret-change-me-32-chars+'
  }

  throw new Error(
    'Missing SESSION_SECRET env var (must be at least 32 characters) required by iron-session.'
  )
}

// iron-session v8 uses generics instead of module augmentation.
// Pass IronSessionData as the type arg wherever getIronSession is called.
export const sessionOptions: SessionOptions = {
  password: getSessionSecret(),
  cookieName: process.env.SESSION_COOKIE_NAME || 'college_erp_session',
  // ttl (seconds): iron-session auto-sets cookie max-age to ttl - 60s
  ttl: 21600, // 360 minutes
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  },
}

// Convenience wrapper — cookies() is async in Next.js 15+
export async function getSession() {
  return getIronSession<IronSessionData>(await cookies(), sessionOptions)
}
