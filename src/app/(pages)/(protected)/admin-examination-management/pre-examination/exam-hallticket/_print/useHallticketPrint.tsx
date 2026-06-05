'use client'

/**
 * Exam Hallticket — printable HALL TICKET documents (Angular exam-hallticket
 * print section). Rows are grouped by student (hallticket_number); each group
 * prints one hall-ticket page: college banner, exam header + regulation box,
 * student info with photo / attestation boxes, registered-subjects table,
 * signatures, cut line and candidate instructions.
 *
 * The MECS layout (current tenant) is ported 1:1; other university codes get
 * the generic Angular fallback layout (no banner, 3 signature labels).
 */

import { type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'
import { usePrintMode } from '@/lib/print'
import { MINIO_URL } from '@/config/constants/api'

type AnyRow = Record<string, any>

const txt = (v: unknown) => (v == null ? '' : String(v))

const tConvert = (time?: string) => {
  const raw = String(time ?? '').trim()
  const m = raw.match(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/)
  if (!m) return ''
  const hour24 = Number(m[1])
  const mins = m[2]
  const ampm = hour24 >= 12 ? 'PM' : 'AM'
  const hour12 = hour24 % 12 || 12
  return `${hour12}:${mins} ${ampm}`
}

const fmtDate = (value?: string) => {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return txt(value)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${d.getFullYear()}`
}

function groupByStudent(rows: AnyRow[]): AnyRow[][] {
  const groups = new Map<string, AnyRow[]>()
  for (const r of rows) {
    const key = txt(r.hallticket_number ?? r.hallticketNumber ?? r.student_id ?? r.studentId)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(r)
  }
  return Array.from(groups.values())
}

function studentPhotoSrc(row: AnyRow): string {
  const path = txt(row.student_photo_path ?? row.studentPhotoPath)
  if (!path) return '/assets/images/avatars/default_Student.png'
  if (/^https?:\/\//i.test(path)) return path
  return `${MINIO_URL}${path.replace(/^\/+/, '')}`
}

const INSTRUCTIONS = [
  'Hall ticket should be preserved till the declaration of results.',
  'The candidates are held responsible for obtaining correct question paper from the Invigilator as per the Paper Title and Question Paper Code given against in the Hall Ticket. Answering a wrong Question Paper may lead to cancellation of examination of that paper.',
  'University reserves the right to cancel the admission of the candidates at any stage, when it is detected that his/her admission to the examination or the college is against the rules.',
  'Candidates should occupy their seats at least 15 minutes before the commencement of the examination.',
  'Candidates are prohibited from bringing and using printed/written material of any kind into the Exam Hall.',
  'Candidates are prohibited from bringing Mathematical Tables, however, if required will be supplied by the Controller of Examiner. Students of Mathematics, Science and Engineering are allowed to bring their own non programmable calculator.',
  'No Electronic gadgets/Mobiles are permitted in the exam Hall. If found in the exam hall booked under malpractice.',
  'Candidates if found in copying/communicating with others or indulging in any malpractice will be expelled from the examination Hall and will not be allowed to appear for the remaining papers/subjects.',
  'Candidates are required to bring their Hall Ticket and ID cards every day.',
  'Candidate should not write anything except his / her hall ticket number on Question Paper.',
  'Student will not be allowed to leave the examination hall during the first two hours of the examination.',
]

const cell: React.CSSProperties = { fontWeight: 550, padding: '3px 6px', fontSize: '12px', verticalAlign: 'top' }
const th: React.CSSProperties = {
  border: '1px solid #000',
  padding: '4px 6px',
  fontSize: '11.5px',
  fontWeight: 700,
  textAlign: 'left',
}
const td: React.CSSProperties = { border: '1px solid #000', padding: '4px 6px', fontSize: '11.5px' }

function SubjectTable({ rows }: { rows: AnyRow[] }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
      <thead>
        <tr>
          <th style={th}>Subject Code</th>
          <th style={th}>Registered Subjects</th>
          <th style={th}>Date of Exam</th>
          <th style={th}>Time</th>
          <th style={th}>Invigilator Sign</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((d, i) => (
          <tr key={`${txt(d.subject_code)}-${i}`}>
            <td style={td}>{txt(d.subject_code)}</td>
            <td style={td}>{txt(d.subject_name)}</td>
            <td style={td}>{fmtDate(d.exam_date)}</td>
            <td style={td}>
              {d.session_start_time && d.session_end_time
                ? `${tConvert(txt(d.session_start_time))} - ${tConvert(txt(d.session_end_time))}`
                : ''}
            </td>
            <td style={{ ...td, width: '110px' }} />
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function CutLine() {
  return <div style={{ borderTop: '2px dashed #444', margin: '14px 0 10px' }} />
}

function Instructions() {
  return (
    <div style={{ fontSize: '10.5px', lineHeight: 1.45 }}>
      <h4 style={{ fontSize: '11px', fontWeight: 700, margin: '0 0 4px' }}>
        Hall ticket should be preserved till the end of the examinations
      </h4>
      <p style={{ margin: '0 0 2px', fontWeight: 700 }}>INSTRUCTIONS TO THE CANDIDATES</p>
      <p style={{ margin: '0 0 6px', fontWeight: 700 }}>
        NOTE : CANDIDATES ARE NOT ALLOWED AFTER COMMENCEMENT OF EXAM
      </p>
      <ol style={{ margin: 0, paddingLeft: '18px' }}>
        {INSTRUCTIONS.map((line) => (
          <li key={line.slice(0, 32)} style={{ marginBottom: '2px' }}>
            {line}
          </li>
        ))}
      </ol>
    </div>
  )
}

function PhotoCell({ head }: { head: AnyRow }) {
  return (
    <td rowSpan={5} style={{ width: '250px', verticalAlign: 'top', padding: '3px 6px' }}>
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={studentPhotoSrc(head)}
          alt="Student"
          style={{ height: '100px', width: '90px', objectFit: 'cover', border: '1px solid #000' }}
          onError={(e) => {
            const img = e.currentTarget as HTMLImageElement
            if (!img.src.endsWith('default_Student.png')) img.src = '/assets/images/avatars/default_Student.png'
          }}
        />
        <div
          style={{
            height: '100px',
            width: '110px',
            border: '1px dashed #000',
            fontSize: '9px',
            padding: '6px 4px',
            textAlign: 'center',
          }}
        >
          Affix latest photo of the candidate
          <br />
          duly attested by the HOD
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px' }}>
        <div style={{ height: '34px', width: '90px', border: '1px solid #000' }} />
        <div style={{ height: '34px', width: '110px', border: '1px solid #000' }} />
      </div>
    </td>
  )
}

function MecsHallticket({ group }: { group: AnyRow[] }) {
  const head = group[0] ?? {}
  return (
    <div
      style={{
        border: '1.5px solid #000',
        padding: '14px 16px',
        margin: '0 auto 18px',
        maxWidth: '780px',
        pageBreakAfter: 'always',
        fontFamily: 'Times New Roman, Times, serif',
        color: '#000',
      }}
    >
      {/* Header banner */}
      <div style={{ textAlign: 'center' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/images/avatars/MECS_BANNER.png"
          alt=""
          style={{ width: '100%', maxHeight: '92px', objectFit: 'contain' }}
          onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
        />
      </div>

      {/* Exam header + regulation box */}
      <div style={{ position: 'relative', margin: '6px 0' }}>
        <h4 style={{ textAlign: 'center', fontSize: '13px', fontWeight: 700, margin: 0 }}>
          {txt(head.exam_label_name ?? head.exam_name)}
        </h4>
        {head.regulation_code ? (
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: '-2px',
              border: '1px solid #000',
              padding: '2px 8px',
              fontSize: '11px',
              fontWeight: 700,
            }}
          >
            {txt(head.regulation_code)}
          </div>
        ) : null}
      </div>

      {/* Title bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          border: '1px solid #000',
          background: '#e8e8e8',
          padding: '3px 8px',
          fontSize: '12px',
          fontWeight: 700,
        }}
      >
        <div>HALL TICKET</div>
        <div>
          {txt(head.course_code)}. ({txt(head.group_name ?? head.group_code).toUpperCase()})
        </div>
      </div>

      {/* Student info */}
      <table style={{ width: '100%', marginTop: '8px', borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td style={{ ...cell, width: '140px' }}>Hall Ticket No&nbsp;&nbsp;:</td>
            <td style={cell}>{txt(head.hallticket_number)}</td>
            <PhotoCell head={head} />
          </tr>
          <tr>
            <td style={cell}>Student Name&nbsp;&nbsp;:</td>
            <td style={cell}>{txt(head.first_name ?? head.student_name)}</td>
          </tr>
          <tr>
            <td style={cell}>Father Name&nbsp;&nbsp;:</td>
            <td style={cell}>{txt(head.father_name)}</td>
          </tr>
          <tr>
            <td style={cell}>
              Center Name&nbsp;&nbsp;:
              <br />
              &amp; Address
            </td>
            <td style={cell}>{txt(head.examcenter_name ?? head.examcenter)}</td>
          </tr>
        </tbody>
      </table>

      <SubjectTable rows={group} />

      {/* Signatures */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '26px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700 }}>Signature of HOD</div>
        <div style={{ textAlign: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/images/avatars/MECS_EXAMINATION_SIGN.png"
            alt=""
            style={{ maxHeight: '40px', display: 'block', margin: '0 auto 2px' }}
            onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
          />
          <div style={{ fontSize: '11px', fontWeight: 700 }}>Controller of Examinations</div>
        </div>
      </div>

      <CutLine />
      <Instructions />
    </div>
  )
}

function GenericHallticket({ group }: { group: AnyRow[] }) {
  const head = group[0] ?? {}
  return (
    <div
      style={{
        border: '1.5px solid #000',
        padding: '14px 16px',
        margin: '0 auto 18px',
        maxWidth: '780px',
        pageBreakAfter: 'always',
        fontFamily: 'Times New Roman, Times, serif',
        color: '#000',
      }}
    >
      <h4 style={{ textAlign: 'center', fontSize: '13px', fontWeight: 700, margin: '0 0 6px' }}>
        {txt(head.exam_label_name ?? head.exam_name)}
      </h4>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          border: '1px solid #000',
          background: '#e8e8e8',
          padding: '3px 8px',
          fontSize: '12px',
          fontWeight: 700,
        }}
      >
        <div>HALL TICKET</div>
        <div>
          {txt(head.course_code)}. ({txt(head.group_name ?? head.group_code).toUpperCase()})
        </div>
      </div>
      <table style={{ width: '100%', marginTop: '8px', borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td style={{ ...cell, width: '140px' }}>Hall Ticket No&nbsp;&nbsp;:</td>
            <td style={cell}>{txt(head.hallticket_number)}</td>
            <td rowSpan={4} style={{ width: '110px', verticalAlign: 'top', textAlign: 'right' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={studentPhotoSrc(head)}
                alt="Student"
                style={{ height: '100px', width: '90px', objectFit: 'cover', border: '1px solid #000' }}
                onError={(e) => {
                  const img = e.currentTarget as HTMLImageElement
                  if (!img.src.endsWith('default_Student.png')) img.src = '/assets/images/avatars/default_Student.png'
                }}
              />
            </td>
          </tr>
          <tr>
            <td style={cell}>Student Name&nbsp;&nbsp;:</td>
            <td style={cell}>{txt(head.first_name ?? head.student_name)}</td>
          </tr>
          <tr>
            <td style={cell}>Father Name&nbsp;&nbsp;:</td>
            <td style={cell}>{txt(head.father_name)}</td>
          </tr>
          <tr>
            <td style={cell}>
              Center Name&nbsp;&nbsp;:
              <br />
              &amp; Address
            </td>
            <td style={cell}>{txt(head.examcenter_name ?? head.examcenter)}</td>
          </tr>
        </tbody>
      </table>
      <SubjectTable rows={group} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px', fontSize: '11px', fontWeight: 700 }}>
        <div>Signature of the Student</div>
        <div>Controller of Examinations</div>
        <div>Principal</div>
      </div>
      <CutLine />
      <Instructions />
    </div>
  )
}

export function useHallticketPrint(
  rows: AnyRow[],
  universityCode: string,
): { printMode: 'hallticket' | null; printButton: (label: string) => ReactNode; printView: ReactNode } {
  const { mode: printMode, triggerPrint } = usePrintMode<'hallticket'>()

  const printButton = (label: string) => (
    <Button
      type="button"
      size="sm"
      className="h-[30px] px-3 text-[12px]"
      disabled={rows.length === 0}
      onClick={() => triggerPrint('hallticket')}
    >
      <Printer className="mr-1.5 h-3.5 w-3.5" />
      {label}
    </Button>
  )

  let printView: ReactNode = null
  if (printMode === 'hallticket') {
    const groups = groupByStudent(rows)
    const isMecs = universityCode.toUpperCase() === 'MECS' || universityCode === ''
    printView = (
      <div className="text-black">
        {groups.length === 0 ? (
          <p className="text-[11px] text-center py-6">No hallticket rows to print.</p>
        ) : (
          groups.map((group, i) =>
            isMecs ? (
              <MecsHallticket key={`ht-${i}`} group={group} />
            ) : (
              <GenericHallticket key={`ht-${i}`} group={group} />
            ),
          )
        )}
      </div>
    )
  }

  return { printMode, printButton, printView }
}
