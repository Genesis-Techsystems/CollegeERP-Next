import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { sessionOptions } from '@/lib/session'
import {
  buildStudentFeeView,
  normalizeCourseFeeYearKey,
  unwrapFeeLedgerRows,
} from '@/services/student-fee'
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

  const studentId = req.nextUrl.searchParams.get('studentId') ?? '10678'
  const targetUrl = `${process.env.SPRING_API_URL}/getAllRecords/s_fee_std_ledger?in_std_id=${studentId}`
  const res = await fetch(targetUrl, {
    headers: { Authorization: `Bearer ${session.jwt}` },
  })
  const body = (await res.json()) as ApiResponse<unknown> & { result?: unknown; resultList?: unknown }
  const payload = unwrapPayload(body)
  const rows = unwrapFeeLedgerRows(payload)
  const view = buildStudentFeeView(rows)

  const keys =
    rows[0] && typeof rows[0] === 'object' ? Object.keys(rows[0]) : payload && typeof payload === 'object' && !Array.isArray(payload) ? Object.keys(payload) : []

  const rowDigest = rows.map((r) => {
    const o = r as Record<string, unknown>
    const amountFields: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(o)) {
      if (/gross|net|paid|due|amount|rtf|college/i.test(k)) amountFields[k] = v
    }
    return {
      yearKey: normalizeCourseFeeYearKey(r),
      yearLabel: o.P_Year_Name ?? o.P_year_name ?? o.year ?? o.Year,
      isHead: Boolean(o.fee_category_name ?? o.fee_head_name ?? o.Fee_Category_Name),
      amountFields,
    }
  })

  return NextResponse.json({
    status: res.status,
    success: body.success,
    message: body.message,
    payloadType: Array.isArray(payload) ? 'array' : typeof payload,
    rowCount: rows.length,
    firstRowKeys: keys,
    rowDigest,
    yearKeys: rows.map((r) => normalizeCourseFeeYearKey(r)),
    viewRows: view.rows,
    rawSample: JSON.stringify(payload).slice(0, 12000),
  })
}
