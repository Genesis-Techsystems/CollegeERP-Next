// Catch-all proxy route to Spring Boot backend
// SECURITY: validates session before forwarding; JWT is NEVER returned in any response body
import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions } from '@/lib/session'
import type { IronSessionData } from '@/types/user'

type Context = { params: Promise<{ path: string[] }> }

async function proxyRequest(request: NextRequest, context: Context): Promise<NextResponse> {
  // 1. Validate session — get jwt server-side only
  const session = await getIronSession<IronSessionData>(await cookies(), sessionOptions)
  if (!session.jwt || !session.user) {
    return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Session expired' }, { status: 401 })
  }

  // 2. Build target URL
  const { path } = await context.params
  const queryString = request.nextUrl.search
  const targetUrl = `${process.env.SPRING_API_URL}/${path.join('/')}${queryString}`

  // 3. Forward request with same method and body; inject Authorization header
  const method = request.method
  const hasBody = method === 'POST' || method === 'PUT' || method === 'PATCH'
  const incomingContentType = request.headers.get('content-type') ?? ''
  const isMultipart = incomingContentType.includes('multipart/form-data')

  // For multipart forward Content-Type as-is (must preserve boundary param);
  // for everything else, force application/json.
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

  // 5. If Spring Boot returns 401 → destroy session and surface 401
  if (upstreamRes.status === 401) {
    session.destroy()
    return NextResponse.json({ message: 'Session expired' }, { status: 401 })
  }

  // 4. Return Spring Boot response body as-is — jwt is never in response body
  const data = await upstreamRes.json().catch(() => null)
  // TEMP DEBUG (remove): inspect exam_center_bycode group shapes
  try {
    if (path.join('/').includes('exam_center_bycode')) {
      const flag = request.nextUrl.searchParams.get('in_flag')
      const result = (data as { data?: { result?: unknown[] } })?.data?.result
      const groups = Array.isArray(result) ? result : []
      const summary = groups.map((g, i) =>
        Array.isArray(g)
          ? { i, len: g.length, flag: (g[0] as Record<string, unknown>)?.flag, keys: Object.keys((g[0] as object) ?? {}).slice(0, 18) }
          : { i, type: typeof g },
      )
      console.log('[DEBUG exam_center_bycode] in_flag=', flag, 'groups', groups.length, JSON.stringify(summary))
    }
  } catch {}
  return NextResponse.json(data, { status: upstreamRes.status })
}

export const GET = proxyRequest
export const POST = proxyRequest
export const PUT = proxyRequest
export const DELETE = proxyRequest
