'use client'

/**
 * Exam Subject Barcode — print modes (mirrors Angular exam-subject-barcode-generation):
 *
 *  - 'stickers'              Angular Stickers()            — hallticket (USN) only
 *  - 'stickers-with-bn'      Angular StickersWithBn()      — USN + barcode (OMR serial) no
 *  - 'stickers-without-usn'  Angular StickersHallTicketNo() — OMR serial only
 *  - 'omr-sheets'            Angular omrpage() → omr-sheets-design (ANSWER SHEET page/student)
 *  - 'answer-sheets'         Angular omrSinglePage() → omr-single-page-design (barcode page/student)
 *
 * The per-row "View OMR Page" / "View Answer Page" icons print the same layouts
 * for a single student (Angular Print(student) / printbarCode(student)).
 * Angular navigated to dedicated print routes; here the layouts render in-page
 * via usePrintMode (the AppShell @media print rules hide the app chrome).
 */

import { useCallback, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronDown, Printer } from 'lucide-react'
import { usePrintMode } from '@/lib/print'

type AnyRow = Record<string, any>

export type BarcodePrintMode =
  | 'stickers'
  | 'stickers-with-bn'
  | 'stickers-without-usn'
  | 'omr-sheets'
  | 'answer-sheets'

const STICKER_FLAGS: Record<string, { showHallticket: boolean; showSerial: boolean }> = {
  'stickers': { showHallticket: true, showSerial: false },
  'stickers-with-bn': { showHallticket: true, showSerial: true },
  'stickers-without-usn': { showHallticket: false, showSerial: true },
}

const txt = (v: unknown) => (v == null ? '' : String(v))
const barcodeOf = (r: AnyRow) => {
  const b = txt(r.omr_barcode ?? r.omrBarcode)
  return b && b !== '-' ? b : ''
}

export function useBarcodeStickerPrint(
  rows: AnyRow[],
  examName: string,
  collegeName?: string,
): {
  printMode: BarcodePrintMode | null
  printButton: ReactNode
  printView: ReactNode
  printOmrFor: (row: AnyRow) => void
  printAnswerFor: (row: AnyRow) => void
} {
  const { mode: printMode, triggerPrint } = usePrintMode<BarcodePrintMode>()
  // When set, omr-sheets / answer-sheets print only this student (row icons).
  const [singleRow, setSingleRow] = useState<AnyRow | null>(null)

  const startBulk = useCallback(
    (mode: BarcodePrintMode) => {
      setSingleRow(null)
      triggerPrint(mode)
    },
    [triggerPrint],
  )

  const printOmrFor = useCallback(
    (row: AnyRow) => {
      setSingleRow(row)
      triggerPrint('omr-sheets')
    },
    [triggerPrint],
  )

  const printAnswerFor = useCallback(
    (row: AnyRow) => {
      setSingleRow(row)
      triggerPrint('answer-sheets')
    },
    [triggerPrint],
  )

  const printButton = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-[30px] px-3 text-[12px]"
          disabled={rows.length === 0}
        >
          <Printer className="mr-1.5 h-3.5 w-3.5" />
          Print
          <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuItem className="text-[12px]" onClick={() => startBulk('stickers')}>
          Print Stickers
        </DropdownMenuItem>
        <DropdownMenuItem className="text-[12px]" onClick={() => startBulk('stickers-with-bn')}>
          Print Stickers With Barcode No
        </DropdownMenuItem>
        <DropdownMenuItem className="text-[12px]" onClick={() => startBulk('stickers-without-usn')}>
          Print Stickers Without USN
        </DropdownMenuItem>
        <DropdownMenuItem className="text-[12px]" onClick={() => startBulk('omr-sheets')}>
          Print OMR Sheets
        </DropdownMenuItem>
        <DropdownMenuItem className="text-[12px]" onClick={() => startBulk('answer-sheets')}>
          Print Answer Sheets
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  // ── Sticker layout (4-up cells under a room/exam header) ──────────────────

  function StickerCell({ data, showHallticket, showSerial }: { data: AnyRow; showHallticket: boolean; showSerial: boolean }) {
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
          {showHallticket ? <span>{txt(data.hallticket_number ?? data.hallticketNumber)}</span> : null}
          {showSerial && txt(data.omr_serial_no ?? data.omrSerialNo) ? (
            <>
              &nbsp;&nbsp;<span>{txt(data.omr_serial_no ?? data.omrSerialNo)}</span>
            </>
          ) : null}
        </div>
        {barcodeOf(data) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`data:image/jpg;base64,${barcodeOf(data)}`} style={{ height: '30px', width: '180px' }} alt="" />
        ) : null}
        <div style={{ display: 'flex', justifyContent: 'center', fontSize: '7px', marginTop: '1px' }}>
          {txt(data.exam_date ?? data.examDate)} &nbsp;&nbsp; {txt(data.subject_code ?? data.subjectCode)}
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
          <span>{txt(row?.exam_date)}</span> &nbsp;
          <span>{txt(row?.exam_session_name ?? row?.session_name)}</span>
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

  // ── OMR "ANSWER SHEET" page (Angular omr-sheets-design) ───────────────────

  function OmrSheetPage({ data, breakBefore }: { data: AnyRow; breakBefore: boolean }) {
    const detail: Array<[string, string]> = [
      ['Examination :', txt(data.exam_name ?? examName)],
      ['Hall Ticket Number :', txt(data.hallticket_number ?? data.hallticketNumber)],
      ['Center Code :', txt(data.examcenter ?? data.exam_center)],
      ['Seating Number :', txt(data.room_number ?? data.roomNumber)],
      ['Subject :', `${txt(data.subject_name ?? data.subjectName)} (${txt(data.subject_code ?? data.subjectCode)})`],
      ['Exam Date :', txt(data.exam_date ?? data.examDate)],
      ['Full Name :', txt(data.StudentName ?? data.student_name ?? data.studentName)],
      ['Gender :', txt(data.gender)],
      ['Aadhar Number :', txt(data.aadhar_card_no ?? data.aadharCardNo)],
    ]
    return (
      <div style={{ pageBreakBefore: breakBefore ? 'always' : undefined, padding: '24px 28px', minHeight: '1000px' }}>
        <div style={{ textAlign: 'center', marginBottom: '18px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>{collegeName ?? ''}</h2>
          <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '6px 0 0' }}>ANSWER SHEET</h3>
        </div>
        <table style={{ fontSize: '13px', borderCollapse: 'collapse' }}>
          <tbody>
            {detail.map(([label, value]) => (
              <tr key={label}>
                <th style={{ textAlign: 'left', padding: '4px 18px 4px 0', whiteSpace: 'nowrap' }}>{label}</th>
                <td style={{ padding: '4px 0' }}>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: '22px', marginLeft: '20px', fontSize: '11px' }}>
          <p style={{ margin: '0 0 2px 10px' }}>{txt(data.omr_serial_no ?? data.omrSerialNo)}</p>
          {barcodeOf(data) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`data:image/jpg;base64,${barcodeOf(data)}`} style={{ height: '30px', width: '382px' }} alt="" />
          ) : null}
        </div>
      </div>
    )
  }

  // ── Answer page (Angular omr-single-page-design): barcode + serial only ───

  function AnswerSheetPage({ data, breakBefore }: { data: AnyRow; breakBefore: boolean }) {
    return (
      <div style={{ pageBreakBefore: breakBefore ? 'always' : undefined, padding: '24px 28px', minHeight: '1000px' }}>
        <div style={{ marginLeft: '20px', fontSize: '11px' }}>
          {barcodeOf(data) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`data:image/jpg;base64,${barcodeOf(data)}`} style={{ height: '40px', width: '400px' }} alt="" />
          ) : null}
          <p style={{ textAlign: 'center', margin: 0, width: '400px' }}>{txt(data.omr_serial_no ?? data.omrSerialNo)}</p>
        </div>
      </div>
    )
  }

  // ── Render the active print layout ─────────────────────────────────────────

  let printView: ReactNode = null
  const targetRows = singleRow ? [singleRow] : rows

  if (printMode && printMode in STICKER_FLAGS) {
    const { showHallticket, showSerial } = STICKER_FLAGS[printMode]
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
                    <StickerCell key={`stk-${gi}-${ci}`} data={stu} showHallticket={showHallticket} showSerial={showSerial} />
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>
    )
  } else if (printMode === 'omr-sheets') {
    printView = (
      <div className="text-black" style={{ fontFamily: 'Times New Roman, Times, serif' }}>
        {targetRows.map((stu, i) => (
          <OmrSheetPage key={`omr-${i}`} data={stu} breakBefore={i > 0} />
        ))}
      </div>
    )
  } else if (printMode === 'answer-sheets') {
    printView = (
      <div className="text-black" style={{ fontFamily: 'Times New Roman, Times, serif' }}>
        {targetRows.map((stu, i) => (
          <AnswerSheetPage key={`ans-${i}`} data={stu} breakBefore={i > 0} />
        ))}
      </div>
    )
  }

  return { printMode, printButton, printView, printOmrFor, printAnswerFor }
}
