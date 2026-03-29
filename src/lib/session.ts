import { getIronSession } from 'iron-session'
import type { SessionOptions } from 'iron-session'
import { cookies } from 'next/headers'
import type { IronSessionData } from '@/types/user'

// iron-session v8 uses generics instead of module augmentation.
// Pass IronSessionData as the type arg wherever getIronSession is called.
export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET as string,
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
