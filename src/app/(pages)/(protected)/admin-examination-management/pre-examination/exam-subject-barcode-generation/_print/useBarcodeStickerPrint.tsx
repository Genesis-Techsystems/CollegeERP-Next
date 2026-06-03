'use client'

/**
 * Exam Subject Barcode — "Print Stickers".
 *
 * Same barcode-sticker layout as the Exam Seating Plan Setup page: 4-up sticker
 * cells, each showing the hallticket number + OMR serial and the base64 barcode
 * image (`omr_barcode`), grouped under a room/exam header. Data comes from the
 * already-loaded OMR student rows (exam_OMR_students), so no extra fetch.
 */

import { type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'
import { usePrintMode } from '@/lib/print'

type AnyRow = Record<string, any>

export function useBarcodeStickerPrint(
  rows: AnyRow[],
  examName: string,
): { printMode: 'stickers' | null; printButton: ReactNode; printView: ReactNode } {
  const { mode: printMode, triggerPrint } = usePrintMode<'stickers'>()

  const printButton = (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="h-[30px] px-3 text-[12px]"
      disabled={rows.length === 0}
      onClick={() => triggerPrint('stickers')}
    >
      <Printer className="mr-1.5 h-3.5 w-3.5" />
      Print Stickers
    </Button>
  )

  function StickerCell({ data }: { data: AnyRow }) {
    return (
      <div
        style={{
          width: '25%',
          boxSizing: 'border-box',
          padding: '27px 0 9px 0',
          textAlign: 'center',
          float: 'left',
          pageBreakInside: 'avoid',
          breakInside: 'avoid',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '-3px', fontSize: '12px' }}>
          <span>{data.hallticket_number ?? data.hallticketNumber ?? ''}</span>
          {data.omr_serial_no ?? data.omrSerialNo ? (
            <>
              &nbsp;&nbsp;<span>{data.omr_serial_no ?? data.omrSerialNo}</span>
            </>
          ) : null}
        </div>
        {data.omr_barcode ?? data.omrBarcode ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`data:image/jpg;base64,${data.omr_barcode ?? data.omrBarcode}`} style={{ height: '30px', width: '180px' }} alt="" />
        ) : null}
        <div style={{ display: 'flex', justifyContent: 'center', fontSize: '7px', marginTop: '1px' }}>
          {data.exam_date ?? data.examDate ?? ''} &nbsp;&nbsp; {data.subject_code ?? data.subjectCode ?? ''}
        </div>
      </div>
    )
  }

  function StickerHeader({ row }: { row: AnyRow }) {
    return (
      <div
        style={{
          border: '1px solid #000',
          padding: '25px 0 9px 0',
          textAlign: 'center',
          fontSize: '10px',
          fontWeight: 'bold',
          marginBottom: '8px',
          pageBreakAfter: 'avoid',
          breakAfter: 'avoid',
        }}
      >
        <div style={{ fontSize: '10px', fontWeight: 'bold' }}>{row?.exam_name ?? examName}</div>
        <div>|{row?.university_code ?? '—'}|</div>
        <div>
          <span>{row?.exam_date ?? ''}</span> &nbsp;
          <span>{row?.exam_session_name ?? row?.session_name ?? ''}</span>
        </div>
        <div>
          <span>Room: {row?.room_name ?? '—'}</span>
          {row?.subject_code ? (
            <>
              {' '}
              | <span>Subject: {row.subject_code}</span>
            </>
          ) : null}
        </div>
      </div>
    )
  }

  let printView: ReactNode = null
  if (printMode === 'stickers') {
    // Group by room (falls back to a single group when subject barcodes have no room yet).
    const byRoom = new Map<string, AnyRow[]>()
    for (const s of rows) {
      const key = String(s.room_id ?? s.room_name ?? 'all')
      if (!byRoom.has(key)) byRoom.set(key, [])
      byRoom.get(key)!.push(s)
    }
    const groups = Array.from(byRoom.values())
    printView = (
      <div className="text-black" style={{ fontFamily: 'Times New Roman, Times, serif', padding: '20px', maxWidth: '990px', margin: '0 auto' }}>
        {groups.length === 0 || rows.length === 0 ? (
          <p className="text-[11px] text-center py-6">No students with barcodes to print.</p>
        ) : (
          groups.map((groupStudents, gi) => {
            const head = groupStudents[0]
            return (
              <div key={`stk-${gi}`} className={gi > 0 ? 'page-break' : ''} style={{ marginBottom: '20px' }}>
                <StickerHeader row={head} />
                <div style={{ overflow: 'auto', margin: '0 4px' }}>
                  {groupStudents.map((stu, ci) => (
                    <StickerCell key={`stk-${gi}-${ci}`} data={stu} />
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>
    )
  }

  return { printMode, printButton, printView }
}
