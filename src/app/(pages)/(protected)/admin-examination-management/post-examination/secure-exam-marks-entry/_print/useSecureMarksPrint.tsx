'use client'

/**
 * Secure Exam Marks Entry — printable MARKS SHEET (Angular #printsection).
 *
 * Header: college logo + "Practical / Laboratory / Project / Viva Voce / Term
 * Paper" + "<exam> - MARKS SHEET"; faculty / programme / semester / batch /
 * date / time / course table; marks table (HallTicket No | Marks | Present /
 * Absent with P / Ab / Not Marked); Total Present / Total Absent; and the
 * Internal / External examiner signature block.
 */

import { type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'
import { usePrintMode } from '@/lib/print'

type AnyRow = Record<string, any>

const txt = (v: unknown) => (v == null ? '' : String(v))

// Angular SemisterList: course-year code → semester word.
const SEM_WORDS: Record<string, string> = {
  ISEM: 'FIRST',
  IISEM: 'SECOND',
  IIISEM: 'THIRD',
  IVSEM: 'FOURTH',
  VSEM: 'FIFTH',
  VISEM: 'SIXTH',
  VIISEM: 'SEVENTH',
  VIIISEM: 'EIGHTH',
}

const tConvert = (time?: string) => {
  const raw = txt(time).trim()
  const m = raw.match(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/)
  if (!m) return raw
  const h = Number(m[1])
  return `${h % 12 || 12}:${m[2]} ${h < 12 ? 'AM' : 'PM'}`
}

const fmtDate = (value?: string) => {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return txt(value)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}-${mm}-${d.getFullYear()}`
}

const cellTh: React.CSSProperties = { border: '1px solid #000', padding: '4px 8px', fontWeight: 700, fontSize: '12px', textAlign: 'left' }
const cellTd: React.CSSProperties = { border: '1px solid #000', padding: '3px 8px', fontSize: '12px', textAlign: 'left' }

export function useSecureMarksPrint(params: {
  students: AnyRow[]
  internalEvaluators: AnyRow[]
  externalEvaluators: AnyRow[]
  logoUrl: string | null
}): { printMode: 'marks' | null; printButton: ReactNode; printView: ReactNode } {
  const { students, internalEvaluators, externalEvaluators, logoUrl } = params
  const { mode: printMode, triggerPrint } = usePrintMode<'marks'>()

  const printButton = (
    <Button
      className="h-8 text-[12px]"
      variant="outline"
      disabled={students.length === 0}
      onClick={() => triggerPrint('marks')}
    >
      <Printer className="mr-1.5 h-3.5 w-3.5" />
      Print
    </Button>
  )

  let printView: ReactNode = null
  if (printMode === 'marks') {
    const head = students[0] ?? {}
    const totalPresents = students.filter((s) => s.isPresent === true).length
    const totalAbsents = students.filter((s) => s.isPresent !== true).length
    const semWord = SEM_WORDS[txt(head.courseYearCode ?? head.course_year_code).toUpperCase()] ?? txt(head.courseYearCode ?? head.course_year_code)
    const internalName = txt(internalEvaluators[0]?.evaluator_name)
    const externalName = txt(externalEvaluators[0]?.evaluator_name)

    printView = (
      <div
        className="text-black"
        style={{ fontFamily: 'Times New Roman, Times, serif', padding: '24px 28px', maxWidth: '900px', margin: '0 auto' }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl || '/assets/images/avatars/default_logo.png'}
            alt=""
            style={{ maxHeight: '90px', objectFit: 'contain' }}
            onError={(e) => {
              const img = e.currentTarget as HTMLImageElement
              if (!img.src.endsWith('default_logo.png')) img.src = '/assets/images/avatars/default_logo.png'
            }}
          />
        </div>

        <hr style={{ borderTop: '1px solid #000', margin: '14px 0' }} />

        <p style={{ textAlign: 'center', margin: '0 0 2px', fontSize: '12px' }}>
          Practical / Laboratory / Project / Viva Voce / Term Paper
        </p>
        <p style={{ textAlign: 'center', margin: '0 0 12px', fontSize: '13px', fontWeight: 700 }}>
          {txt(head.examName)} - MARKS SHEET
        </p>

        {/* Faculty / programme / batch */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }}>
          <tbody>
            <tr>
              <th style={{ ...cellTh, width: '130px' }}>Faculty :</th>
              <td style={cellTd} colSpan={2}>{txt(head.collegeName)}</td>
            </tr>
            <tr>
              <th style={cellTh}>Programme :</th>
              <td style={cellTd}>{txt(head.groupName)}</td>
              <td style={cellTd}>Semester : {semWord}</td>
            </tr>
            <tr>
              <th style={cellTh}>Batch :</th>
              <td style={cellTd} colSpan={2}>
                {txt(head.batchName)},&nbsp; Date : {fmtDate(head.examDate)}, &nbsp; Time :{' '}
                {tConvert(head.sessionStartTime)} TO {tConvert(head.sessionEndTime)}, &nbsp; Course Title with code :{' '}
                {txt(head.subjectName)}({txt(head.subjectCode)})
              </td>
            </tr>
          </tbody>
        </table>

        {/* Marks table */}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={cellTh}>HallTicket No</th>
              <th style={cellTh}>Marks</th>
              <th style={cellTh}>Present / Absent</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, i) => (
              <tr key={`${txt(s.hallticketNumber)}-${i}`}>
                <td style={cellTd}>{txt(s.hallticketNumber)}</td>
                <td style={cellTd}>{txt(s.marks)}</td>
                <td style={cellTd}>
                  {s.isPresent === true ? 'P' : s.isPresent === false ? 'Ab' : 'Not Marked'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: 'flex', justifyContent: 'space-between', margin: '12px 0', fontSize: '12px', fontWeight: 600 }}>
          <span>Total Present : {totalPresents}</span>
          <span>Total Absent : {totalAbsents}</span>
        </div>

        {/* Signatures */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '24px' }}>
          <tbody>
            <tr>
              <td style={{ ...cellTd, textAlign: 'center', fontWeight: 700 }}>Internal Examiner</td>
              <td style={{ ...cellTd, textAlign: 'center', fontWeight: 700 }}>External Examiner</td>
            </tr>
            <tr>
              <td style={{ ...cellTd, textAlign: 'center', height: '46px' }}>Name with Signature</td>
              <td style={{ ...cellTd, textAlign: 'center', height: '46px' }}>Name with Signature</td>
            </tr>
            <tr>
              <td style={{ ...cellTd, textAlign: 'center' }}>{internalName}</td>
              <td style={{ ...cellTd, textAlign: 'center' }}>{externalName}</td>
            </tr>
          </tbody>
        </table>
      </div>
    )
  }

  return { printMode, printButton, printView }
}
