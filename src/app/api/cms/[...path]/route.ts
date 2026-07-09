// CMS BFF route — forwards to Spring Boot (SPRING_API_URL already includes /cms).
import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions } from '@/lib/session'
import type { IronSessionData } from '@/types/user'

type Context = { params: Promise<{ path: string[] }> }

async function cmsRequest(request: NextRequest, context: Context): Promise<NextResponse> {
  const session = await getIronSession<IronSessionData>(await cookies(), sessionOptions)
  if (!session.jwt || !session.user) {
    return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Session expired' }, { status: 401 })
  }

  const { path } = await context.params
  const queryString = request.nextUrl.search
  const targetUrl = `${process.env.SPRING_API_URL}/${path.join('/')}${queryString}`

  const method = request.method
  const hasBody = method === 'POST' || method === 'PUT' || method === 'PATCH'
  const incomingContentType = request.headers.get('content-type') ?? ''
  const isMultipart = incomingContentType.includes('multipart/form-data')

  const forwardHeaders: Record<string, string> = {
    Authorization: `Bearer ${session.jwt}`,
    ...(isMultipart
      ? { 'Content-Type': incomingContentType }
      : { 'Content-Type': 'application/json' }),
  }

  let upstreamRes: Response
  try {
    upstreamRes = await fetch(targetUrl, {
      method,
      headers: forwardHeaders,
      ...(hasBody
        ? { body: isMultipart ? await request.arrayBuffer() : await request.text() }
        : {}),
    })
  } catch {
    return NextResponse.json({ message: 'Service unavailable' }, { status: 502 })
  }

  if (upstreamRes.status === 401) {
    session.destroy()
    return NextResponse.json({ message: 'Session expired' }, { status: 401 })
  }

  const data = await upstreamRes.json().catch(() => null)
  return NextResponse.json(data, { status: upstreamRes.status })
}

export const GET = cmsRequest
export const POST = cmsRequest
export const PUT = cmsRequest
export const DELETE = cmsRequest
