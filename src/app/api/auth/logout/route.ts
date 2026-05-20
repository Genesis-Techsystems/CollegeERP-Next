// BFF logout route — destroys iron-session cookie
import { NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions } from '@/lib/session'
import type { IronSessionData } from '@/types/user'

export async function POST() {
  const session = await getIronSession<IronSessionData>(await cookies(), sessionOptions)
  session.destroy()
  return NextResponse.json({ success: true })
}
