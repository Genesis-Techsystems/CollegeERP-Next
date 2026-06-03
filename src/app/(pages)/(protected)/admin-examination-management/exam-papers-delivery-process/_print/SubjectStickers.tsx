'use client'

/**
 * Shared sticker layout for exam-papers-delivery print pages.
 * Mirrors the Angular `print-exam-center-barcodes`, `scan-bundles-print-stickers`,
 * `print-exam-seatno-stickers` (+ GU variants) layout:
 *
 *   ┌─ Header (group code | exam center | exam date | subject) ─┐
 *   │ [seat_no](hallticket)   [seat_no](hallticket)   …          │
 *   │  base64 barcode img       base64 barcode img               │
 *   │  exam_date(session)code   exam_date(session)code           │
 *   └────────────────────────────────────────────────────────────┘
 *
 * `marginX` matches the Angular style (`margin:0px 4px` regular vs `0px 35px` GU).
 */

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Printer } from 'lucide-react'

export type StickerRow = Record<string, unknown>

export interface StickerConfig {
  /** Field used to group rows (e.g. 'subjectId', 'fk_univ_exam_scan_bundle_id'). */
  groupBy: string | ((row: StickerRow) => string | number)
  /** Header lines for each group (4 rows max). */
  header: (first: StickerRow, queryGroupCode: string) => Array<string | null | undefined>
  /** Top line in each sticker cell — usually `{seat}({hallticket})`. */
  cellTop: (row: StickerRow) => string
  /** Bottom line in each sticker cell — usually `{date}{subject_code}` or with session_time. */
  cellBottom: (row: StickerRow) => string
  /** Which row field holds the base64 barcode. */
  barcodeField?: string
  /** Sticker row horizontal margin in pixels (4 = default, 35 = GU). */
  marginX?: number
  /** Where the Back button should navigate. */
  backHref: string
  /** When set, append the listed search-param keys (taken from the current URL) to backHref. */
  backParamKeys?: string[]
}

function pickGroupKey(cfg: StickerConfig, row: StickerRow): string {
  const v =
    typeof cfg.groupBy === 'function'
      ? cfg.groupBy(row)
      : (row[cfg.groupBy] as string | number | undefined)
  return v == null ? '__nogroup__' : String(v)
}

export function SubjectStickers({ config }: { readonly config: StickerConfig }) {
  const router = useRouter()
  const params = useSearchParams()
  const [groups, setGroups] = useState<[string, StickerRow[]][]>([])
  const queryGroupCode = params?.get('examGroupCode') ?? ''

  useEffect(() => {
    const raw = params?.get('data')
    if (!raw) {
      setGroups([])
      return
    }
    let parsed: StickerRow[] = []
    try {
      const v = JSON.parse(raw)
      if (Array.isArray(v)) parsed = v as StickerRow[]
    } catch {
      parsed = []
    }
    const map = new Map<string, StickerRow[]>()
    for (const r of parsed) {
      const key = pickGroupKey(config, r)
      const arr = map.get(key) ?? []
      arr.push(r)
      map.set(key, arr)
    }
    setGroups(Array.from(map.entries()))
  }, [params, config])

  const marginX = config.marginX ?? 4
  const barcodeField = config.barcodeField ?? 'omr_barcode'

  function onBack() {
    let href = config.backHref
    const keys = config.backParamKeys ?? []
    if (keys.length && params) {
      const sp = new URLSearchParams()
      for (const k of keys) {
        const v = params.get(k)
        if (v != null && v !== '') sp.set(k, v)
      }
      const qs = sp.toString()
      if (qs) href = `${href}?${qs}`
    }
    router.push(href)
  }

  return (
    <div className="print-page bg-white text-black" style={{ fontFamily: 'Times New Roman, Times, serif' }}>
      <div className="no-print flex justify-end gap-2 p-3">
        <Button type="button" variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <Button type="button" size="sm" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-1" /> Print
        </Button>
      </div>

      {groups.length === 0 ? (
        <p className="text-[11px] text-center py-6">No data to print.</p>
      ) : (
        groups.map(([gKey, rows], gi) => {
          const head = rows[0] ?? {}
          const headLines = config.header(head, queryGroupCode).filter((s) => s != null && s !== '')
          return (
            <div key={gKey} className={gi !== 0 ? 'page-break' : ''} style={{ marginBottom: '18px' }}>
              <table id="table-print" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <td
                      className="header-cell"
                      style={{
                        border: '1px solid #000',
                        padding: '6px',
                        textAlign: 'center',
                        fontSize: '11px',
                        fontWeight: 'bold',
                      }}
                    >
                      {headLines.map((line, i) => (
                        <span key={i} style={{ display: 'block', fontSize: i === 0 ? '14px' : '11px' }}>
                          {line}
                        </span>
                      ))}
                    </td>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ margin: `0px ${marginX}px`, display: 'block' }}>
                    {rows.map((row, ri) => {
                      const barcode = row[barcodeField] as string | undefined
                      return (
                        <td
                          key={ri}
                          className="sticker-td"
                          style={{
                            display: 'inline-block',
                            padding: '4px 6px',
                            margin: '2px',
                            textAlign: 'center',
                            verticalAlign: 'top',
                            pageBreakInside: 'avoid',
                            breakInside: 'avoid',
                          }}
                        >
                          <span style={{ display: 'flex', justifyContent: 'center', marginBottom: '-3px', fontSize: '12px' }}>
                            <span>
                              <b>{config.cellTop(row)}</b>
                            </span>
                          </span>
                          {barcode ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={`data:image/jpg;base64,${barcode}`}
                              alt=""
                              style={{ height: '30px', width: '180px' }}
                            />
                          ) : null}
                          <span style={{ display: 'flex', justifyContent: 'center', fontSize: '6.5px', marginTop: '1px' }}>
                            {config.cellBottom(row)}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          )
        })
      )}

      <div className="no-print flex justify-end gap-2 p-3">
        <Button type="button" variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <Button type="button" size="sm" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-1" /> Print
        </Button>
      </div>
    </div>
  )
}

export function txt(v: unknown): string {
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return ''
}
