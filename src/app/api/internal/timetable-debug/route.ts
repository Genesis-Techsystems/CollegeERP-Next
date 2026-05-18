import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { sessionOptions } from '@/lib/session'
import { buildStudentTimetableGrid, normalizeTimetableRows } from '@/services/student-timetable'
import type { ApiResponse } from '@/types/api'
import type { IronSessionData } from '@/types/user'

function unwrapPayload(body: ApiResponse<unknown> & { result?: unknown; resultList?: unknown }): unknown {
  if (body.data != null) return body.data
  if (Array.isArray(body.resultList)) return body.resultList
  if (body.result != null) return body.result
  return body
}

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const session = await getIronSession<IronSessionData>(await cookies(), sessionOptions)
  if (!session.jwt) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const sp = req.nextUrl.searchParams
  const collegeId = sp.get('collegeId') ?? '17'
  const academicYearId = sp.get('academicYearId') ?? '101'
  const groupSectionId = sp.get('groupSectionId') ?? '1353'

  const query = new URLSearchParams({
    'College.collegeId': collegeId,
    'AcademicYear.academicYearId': academicYearId,
    groupSectionId,
  })

  const targetUrl = `${process.env.SPRING_API_URL}/timetablescurr?${query}`
  const res = await fetch(targetUrl, {
    headers: { Authorization: `Bearer ${session.jwt}` },
  })
  const body = (await res.json()) as ApiResponse<unknown> & { result?: unknown; resultList?: unknown }

  const payload = unwrapPayload(body)
  const rows = normalizeTimetableRows(payload)
  const grid = buildStudentTimetableGrid(rows)

  const sample =
    Array.isArray(payload) && payload[0] && typeof payload[0] === 'object'
      ? Object.keys(payload[0] as object)
      : payload && typeof payload === 'object' && !Array.isArray(payload)
        ? Object.keys(payload as object)
        : []

  const dump = {
    status: res.status,
    success: body.success,
    message: body.message,
    query: Object.fromEntries(query.entries()),
    payloadType: Array.isArray(payload) ? 'array' : typeof payload,
    payloadLength: Array.isArray(payload) ? payload.length : null,
    topLevelKeys: sample,
    parsedRowCount: rows.length,
    gridDayCount: grid.dayLabels.length,
    gridRowCount: grid.rows.length,
    firstParsedRow: rows[0] ?? null,
    firstRawRow: Array.isArray(payload) ? payload[0] ?? null : null,
    payload,
  }

  try {
    const dir = join(process.cwd(), 'tmp')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'timetable-dump.json'), JSON.stringify(dump, null, 2), 'utf8')
  } catch {
    // ignore write errors in dev
  }

  return NextResponse.json({
    status: res.status,
    success: body.success,
    message: body.message,
    payloadType: dump.payloadType,
    payloadLength: dump.payloadLength,
    topLevelKeys: sample,
    parsedRowCount: rows.length,
    gridDayCount: grid.dayLabels.length,
    gridRowCount: grid.rows.length,
    firstParsedRow: rows[0] ?? null,
    rawSample: JSON.stringify(payload).slice(0, 4000),
  })
}
