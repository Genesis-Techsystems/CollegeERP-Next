// BFF logout route — destroys iron-session cookie
import { NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions } from '@/lib/session'
import type { IronSessionData } from '@/types/user'
import { clearCachedNav } from '@/lib/nav-cache'

export async function POST() {
  const session = await getIronSession<IronSessionData>(await cookies(), sessionOptions)
  if (session.user?.userId) {
    clearCachedNav(session.user.userId, session.issuedAt)
  }
  session.destroy()
  return NextResponse.json({ success: true })
}
