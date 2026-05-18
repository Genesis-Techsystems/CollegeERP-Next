import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import path from 'path'
import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { sessionOptions } from '@/lib/session'
import { buildStudentFeeView, unwrapFeeLedgerRows } from '@/services/student-fee'
import type { ApiResponse } from '@/types/api'
import type { IronSessionData } from '@/types/user'

function unwrapProcPayload(body: ApiResponse<unknown> & { result?: unknown; resultList?: unknown }): unknown {
  if (body.data != null) return body.data
  if (body.resultList != null) return body.resultList
  if (body.result != null) return body.result
  return body
}

/** Dev-only: capture live fee rows from the browser for debugging parser mismatches. */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = (await req.json()) as {
    studentId?: number
    source?: string
    rows?: unknown
  }

  let rows = unwrapFeeLedgerRows(body.rows ?? [])

  if (rows.length === 0 && body.studentId) {
    const session = await getIronSession<IronSessionData>(await cookies(), sessionOptions)
    if (session.jwt) {
      const targetUrl = `${process.env.SPRING_API_URL}/getAllRecords/s_fee_std_ledger?in_std_id=${body.studentId}`
      const res = await fetch(targetUrl, { headers: { Authorization: `Bearer ${session.jwt}` } })
      if (res.ok) {
        const apiBody = (await res.json()) as ApiResponse<unknown> & {
          result?: unknown
          resultList?: unknown
        }
        rows = unwrapFeeLedgerRows(unwrapProcPayload(apiBody))
      }
    }
  }
  const view = buildStudentFeeView(rows)

  const digest = rows.map((r) => {
    const o = r as Record<string, unknown>
    const amounts: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(o)) {
      if (/amount|gross|net|paid|due|rtf|college|fee|year/i.test(k)) amounts[k] = v
    }
    return amounts
  })

  const out = {
    at: new Date().toISOString(),
    studentId: body.studentId,
    source: body.source,
    rowCount: rows.length,
    allKeys: rows[0] ? Object.keys(rows[0] as object) : [],
    digest,
    viewRows: view.rows,
    rawRows: rows,
  }

  const filePath = path.join(process.cwd(), 'fee-debug-live.json')
  await writeFile(filePath, JSON.stringify(out, null, 2), 'utf8')

  return NextResponse.json({ ok: true, filePath, rowCount: rows.length, viewRows: view.rows })
}
