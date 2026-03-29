// BFF /me route — returns current session user data (nav is built server-side in layout, not here)
import { NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions } from '@/lib/session'
import type { IronSessionData } from '@/types/user'
import { SESSION_MAX_AGE_MS } from '@/config/constants'

export async function GET() {
  const session = await getIronSession<IronSessionData>(await cookies(), sessionOptions)

  if (!session.user || !session.issuedAt || !session.jwt) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  if (Date.now() - session.issuedAt > SESSION_MAX_AGE_MS) {
    session.destroy()
    return NextResponse.json({ message: 'Session expired' }, { status: 401 })
  }

  // Return session user only — modules/pages are never included (nav tree built server-side)
  return NextResponse.json({ user: session.user })
}
