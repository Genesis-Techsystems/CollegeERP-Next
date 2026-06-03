'use client'

/**
 * Exam Forms — three print views, faithful to Angular:
 *  - Print Form-A : print-form-a (FORM - A: appearing/absent/malpractice halltickets + totals)
 *  - Print D Forms: print-dforms (SUBJECT WISE D-FORM: hallticket grid + totals)
 *  - Print Forms  : print-exam-form (EXAM FORM: per-student answer-book-serial sheet)
 *
 * All three render from the already-loaded OMR students (exam_OMR_students), the
 * same `subjectModerationStudents` Angular passes to the print routes.
 */

import { type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'
import { usePrintMode } from '@/lib/print'

type AnyRow = Record<string, any>
type ExamFormsPrintMode = 'form-a' | 'd-form' | 'form'

const g = (r: AnyRow, keys: string[]): string => {
  for (const k of keys) {
    const v = r?.[k]
    if (v != null && String(v).trim() !== '') return String(v)
  }
  return ''
}

function fmtDate(v: unknown, style: 'dd/MM/yyyy' | 'MMM d, y'): string {
  const s = v ? String(v).slice(0, 10) : ''
  if (!s) return ''
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return String(v ?? '')
  if (style === 'dd/MM/yyyy') {
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    return `${dd}/${mm}/${d.getFullYear()}`
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const HT = (r: AnyRow) => g(r, ['hallticket_number', 'hallticketNumber'])
const NAME = (r: AnyRow) => g(r, ['student_name', 'studentName', 'StudentName'])
const SERIAL = (r: AnyRow) => g(r, ['omr_serial_no', 'omrSerialNo'])
const presentVal = (r: AnyRow) => r?.is_present ?? r?.isPresent ?? null
const isUfm = (r: AnyRow) => r?.isUfm ?? r?.is_ufm ?? false

const TD = { border: '1px solid #000', padding: '4px 6px' } as const
const THL = { border: '1px solid #000', padding: '4px 6px', textAlign: 'left' as const }

export function useExamFormsPrint(
  students: AnyRow[],
  meta: { courseYear: string; examName: string },
): { printMode: ExamFormsPrintMode | null; printButtons: ReactNode; printView: ReactNode } {
  const { mode: printMode, triggerPrint } = usePrintMode<ExamFormsPrintMode>()

  const head = students[0] ?? {}
  const collegeName = g(head, ['college_name', 'collegeName'])
  const groupCode = g(head, ['group_code', 'groupCode'])
  const subjectName = g(head, ['subject_name', 'subjectName'])
  const subjectCode = g(head, ['subject_code', 'subjectCode'])
  const examName = g(head, ['exam_name', 'examName']) || meta.examName
  const examDate = head.exam_date ?? head.examDate
  const sessinTime = g(head, ['sessin_time', 'sessinTime'])
  const sessionName = g(head, ['exam_session_name', 'examSessionName'])
  const courseYear = meta.courseYear

  const printButtons = (
    <div className="flex flex-wrap gap-2">
      <Button type="button" className="h-8 text-[12px]" disabled={students.length === 0} onClick={() => triggerPrint('form-a')}>
        <Printer className="mr-1.5 h-3.5 w-3.5" /> Print Form-A
      </Button>
      <Button type="button" className="h-8 text-[12px]" disabled={students.length === 0} onClick={() => triggerPrint('d-form')}>
        <Printer className="mr-1.5 h-3.5 w-3.5" /> Print D Forms
      </Button>
      <Button type="button" className="h-8 text-[12px]" disabled={students.length === 0} onClick={() => triggerPrint('form')}>
        <Printer className="mr-1.5 h-3.5 w-3.5" /> Print Forms
      </Button>
    </div>
  )

  function Banner() {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/college-banner.png"
        alt=""
        style={{ maxHeight: 70, margin: '0 auto 6px', display: 'block' }}
        onError={(e) => {
          ;(e.currentTarget as HTMLImageElement).style.display = 'none'
        }}
      />
    )
  }

  let printView: ReactNode = null

  // ── FORM - A ────────────────────────────────────────────────────────────────
  if (printMode === 'form-a') {
    const appearing = students.filter((s) => presentVal(s) == null)
    const presentStudents = students.filter((s) => presentVal(s) === true)
    const absentStudents = students.filter((s) => presentVal(s) === false)
    const malpractice = students.filter((s) => isUfm(s) === true)
    const htGrid = (rows: AnyRow[], key: string) => (
      <div style={{ display: 'flex', flexWrap: 'wrap', width: '100%' }}>
        {rows.map((d, i) => (
          <div
            key={`${key}-${i}`}
            style={{ width: '16.666%', textAlign: 'center', padding: '2px 0', fontSize: '13px', boxSizing: 'border-box' }}
          >
            {HT(d)}
          </div>
        ))}
      </div>
    )
    printView = (
      <div className="text-black" style={{ fontFamily: 'Times New Roman, Times, serif', padding: '20px' }}>
        <Banner />
        <p style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '16px', margin: 0 }}>FORM - A</p>
        <p style={{ textAlign: 'center', fontSize: '14px', margin: '4px 0 0 0' }}>{examName}</p>
        <p style={{ textAlign: 'center', fontSize: '12px', margin: '2px 0 8px 0' }}>Exam Date : {fmtDate(examDate, 'dd/MM/yyyy')}</p>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '8px' }}>
          <tbody>
            <tr>
              <th style={THL}>College</th>
              <th style={THL}>{collegeName}</th>
            </tr>
            <tr>
              <th style={THL}>Course Group</th>
              <th style={THL}>{groupCode}</th>
            </tr>
            <tr>
              <th style={THL}>Semester</th>
              <th style={THL}>{courseYear}</th>
            </tr>
            <tr>
              <th style={THL}>Subject title with Code</th>
              <th style={THL}>
                {subjectName}&nbsp;({subjectCode})
              </th>
            </tr>
          </tbody>
        </table>

        {appearing.length > 0 && htGrid(appearing, 'app')}
        {presentStudents.length > 0 && htGrid(presentStudents, 'pre')}

        <hr style={{ margin: '10px 0' }} />
        <p style={{ fontSize: '14px', margin: '4px 0' }}>
          <b>HallTicket No of Absentees : </b>
          {absentStudents.map((d, i) => (
            <span key={`abs-${i}`} style={{ paddingLeft: '10px', fontWeight: 400 }}>
              {HT(d)}
            </span>
          ))}
        </p>
        <p style={{ fontSize: '14px', margin: '4px 0' }}>
          <b>HallTicket No of Malpractice : </b>
          {malpractice.map((d, i) => (
            <span key={`mal-${i}`} style={{ paddingLeft: '10px', fontWeight: 400 }}>
              {HT(d)}
            </span>
          ))}
        </p>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginTop: '8px' }}>
          <tbody>
            <tr>
              <th style={THL}>Total number of students appearance</th>
              <th style={THL}>{students.length}</th>
            </tr>
            <tr>
              <th style={THL}>Total number of students present</th>
              <th style={THL}>{presentStudents.length > 0 ? presentStudents.length : ''}</th>
            </tr>
            <tr>
              <th style={THL}>Total number of students absent</th>
              <th style={THL}>{absentStudents.length > 0 ? absentStudents.length : ''}</th>
            </tr>
            <tr>
              <th style={THL}>Malpractice Case</th>
              <th style={THL}>{malpractice.length > 0 ? malpractice.length : ''}</th>
            </tr>
            <tr>
              <th style={THL}>Total number of answer scripts dispatched</th>
              <th style={THL}></th>
            </tr>
          </tbody>
        </table>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '48px', fontSize: '12px' }}>
          <div>Signature of Chief Superintendent (CS) :</div>
          <div>Signature of Dy.Chief Superintendent (DCS) :</div>
        </div>
      </div>
    )
  }

  // ── SUBJECT WISE D-FORM ───────────────────────────────────────────────────────
  else if (printMode === 'd-form') {
    printView = (
      <div className="text-black" style={{ fontFamily: 'Times New Roman, Times, serif', padding: '20px' }}>
        <Banner />
        <h2 style={{ textAlign: 'center', fontSize: '20px', margin: '0 0 8px 0' }}>
          <b>{collegeName}</b>
        </h2>
        <table style={{ width: '100%', fontSize: '13px', marginBottom: '6px' }}>
          <tbody>
            <tr>
              <td>Course: &nbsp;{groupCode}</td>
              <td style={{ textAlign: 'center', fontWeight: 'bold' }}>SUBJECT WISE D-FORM</td>
              <td></td>
            </tr>
          </tbody>
        </table>
        <hr />
        <table style={{ width: '100%', fontSize: '13px', margin: '6px 0' }}>
          <tbody>
            <tr>
              <td>Exam Date : &nbsp;{fmtDate(examDate, 'MMM d, y')}</td>
              <td>Exam Time : &nbsp;{sessinTime}</td>
              <td>Exam Session : &nbsp;{sessionName}</td>
            </tr>
          </tbody>
        </table>
        <hr />
        <table style={{ width: '100%', fontSize: '13px', margin: '6px 0' }}>
          <tbody>
            <tr>
              <td>
                Subject Name: &nbsp;{subjectName}-{subjectCode}
              </td>
            </tr>
          </tbody>
        </table>
        <hr />
        <div style={{ display: 'flex', flexWrap: 'wrap', width: '100%' }}>
          {students.map((d, i) => (
            <div key={`d-${i}`} style={{ width: '25%', padding: '3px 0', fontSize: '13px', boxSizing: 'border-box' }}>
              {HT(d)}
            </div>
          ))}
        </div>
        <hr />
        <table style={{ width: '100%', fontSize: '13px', margin: '6px 0' }}>
          <tbody>
            <tr>
              <td>Total : {students.length}</td>
              <td>No.of Additions :</td>
              <td>No. of Present :</td>
              <td>No. of Absent :</td>
            </tr>
          </tbody>
        </table>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '48px', fontSize: '12px' }}>
          <div>Signature of Invigilator</div>
          <div>Signature of Exam Superintendent with seal</div>
        </div>
      </div>
    )
  }

  // ── EXAM FORM ─────────────────────────────────────────────────────────────────
  else if (printMode === 'form') {
    printView = (
      <div className="text-black" style={{ fontFamily: 'Times New Roman, Times, serif', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <Banner />
        </div>
        <p style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '16px', margin: 0 }}>{collegeName}</p>
        <p style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '15px', margin: '4px 0 10px 0' }}>EXAM FORM</p>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '8px' }}>
          <tbody>
            <tr>
              <th style={THL}>COURSE:</th>
              <td style={TD}>{groupCode}</td>
              <th style={THL}>SEMESTER:</th>
              <td style={TD}>{courseYear}</td>
            </tr>
            <tr>
              <th style={THL}>SUBJECT:</th>
              <td style={TD}>
                {subjectName}&nbsp;({subjectCode})
              </td>
              <th style={THL}>PAPER CODE:</th>
              <td style={TD}></td>
            </tr>
            <tr>
              <th style={THL}>EXAM DATE &amp; TIME:</th>
              <td style={TD}>{fmtDate(examDate, 'dd/MM/yyyy')}</td>
              <th style={THL}>SCHEME:</th>
              <td style={TD}></td>
            </tr>
          </tbody>
        </table>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr>
              <th style={THL}>S.No</th>
              <th style={THL}>Hall Ticket Number</th>
              <th style={THL}>Student Name</th>
              <th style={THL}>Answer Book Serial Number</th>
              <th style={THL}>Signature</th>
              <th style={THL} colSpan={2}>
                Record Attendence for Absent and Malpractice Only
              </th>
            </tr>
          </thead>
          <tbody>
            {students.map((d, i) => (
              <tr key={`f-${i}`}>
                <td style={TD}>{i + 1}</td>
                <td style={TD}>{HT(d)}</td>
                <td style={TD}>{NAME(d)}</td>
                <td style={TD}>{SERIAL(d)}</td>
                <td style={TD}></td>
                <td style={TD}>
                  &nbsp;<input type="radio" name={`status-${i}`} />
                  &nbsp;Absent
                </td>
                <td style={TD}>
                  &nbsp;<input type="radio" name={`status-${i}`} />
                  &nbsp;Malpractice
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p style={{ fontSize: '12px', margin: '8px 0' }}>
          Please darken the circle Absent or Malpractice again Hall ticket number, if any.
        </p>
        <table style={{ width: '100%', fontSize: '12px' }}>
          <tbody>
            <tr>
              <td>Total no. of students in this sheet: {students.length}</td>
              <td>Total no. of Malpractice cases in this sheet:</td>
            </tr>
            <tr>
              <td>Total no. of Absent students in this sheet:</td>
              <td>Total no. of Malpractice cases in this sheet:</td>
            </tr>
          </tbody>
        </table>
        <table style={{ width: '100%', fontSize: '12px', marginTop: '10px' }}>
          <tbody>
            <tr>
              <td>Signature of Invigilator</td>
              <td style={{ textAlign: 'end' }}>Signature of Exam Superintendent with seal</td>
            </tr>
          </tbody>
        </table>
      </div>
    )
  }

  return { printMode, printButtons, printView }
}
