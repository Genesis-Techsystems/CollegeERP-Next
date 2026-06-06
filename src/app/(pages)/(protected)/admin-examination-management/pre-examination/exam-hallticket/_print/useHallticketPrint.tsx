'use client'

/**
 * Exam Hallticket — printable HALL TICKET documents, ported 1:1 from the
 * Angular exam-hallticket print section (gold-dev3). Rows are grouped per
 * student (hallticket_number); each group prints one page (`.page-align`).
 *
 * Layouts are selected by university code, exactly like Angular:
 *   MECS  → MECS_BANNER + "Signature of HOD / Controller of Examinations"
 *   MVSR  → MVSR-NEW-BANNER + LAB time shows "-" + MVSR_COE-SIGN
 *   other → no banner, 3 plain signature labels
 * All styles below mirror exam-hallticket.component.scss.
 */

import { type CSSProperties, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'
import { usePrintMode } from '@/lib/print'
import { MINIO_URL } from '@/config/constants/api'

type AnyRow = Record<string, any>

const txt = (v: unknown) => (v == null ? '' : String(v))

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
  return `${dd}/${mm}/${d.getFullYear()}`
}

const DEFAULT_STUDENT = '/assets/images/avatars/default_Student.png'

function studentPhotoSrc(row: AnyRow): string {
  const path = txt(row.student_photo_path ?? row.studentPhotoPath)
  if (!path) return DEFAULT_STUDENT
  if (/^https?:\/\//i.test(path)) return path
  return `${MINIO_URL}${path.replace(/^\/+/, '')}`
}

/**
 * One printed page per (student, course_year_code) — mirrors Angular:
 *   single Print()   → groupedHallTickets keyed by course_year_code
 *   bulk  printBulk() → bulkGroupedHallTickets: per student, then per year
 * Keying on hallticket + course_year_code covers both: a single student with
 * subjects across two semesters prints two pages (like Angular), and in section
 * mode each student's years are split into their own pages.
 */
function groupByStudentAndYear(rows: AnyRow[]): AnyRow[][] {
  const groups = new Map<string, AnyRow[]>()
  for (const r of rows) {
    const student = txt(r.hallticket_number ?? r.hallticketNumber ?? r.student_id ?? r.studentId)
    const year = txt(r.course_year_code ?? r.courseYearCode)
    const key = `${student}__${year}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(r)
  }
  return Array.from(groups.values())
}

// 11-point MECS instructions; MVSR/generic drop the last "first two hours" line.
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

// ── styles (exam-hallticket.component.scss) ─────────────────────────────────
const S = {
  pageAlign: {
    border: '1px solid black',
    minHeight: '100vh',
    padding: '8px',
    fontFamily: "'Times New Roman', serif",
    boxSizing: 'border-box',
    pageBreakAfter: 'always',
    color: '#000',
  } as CSSProperties,
  examHeader: { display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', marginTop: '5px', marginBottom: '2px' } as CSSProperties,
  examTitle: { textAlign: 'center', fontWeight: 700, margin: 0, fontSize: '15px' } as CSSProperties,
  regulationBox: {
    position: 'absolute', right: 0, bottom: '2px', border: '1px solid #000', padding: '2px 10px',
    fontSize: '13px', fontWeight: 700, background: '#fff', height: '22px', display: 'flex',
    justifyContent: 'center', alignItems: 'center', textTransform: 'uppercase', minWidth: '45px',
  } as CSSProperties,
  titleBar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#b6b5b5',
    border: '1px solid black', padding: '3px 3px', fontFamily: "'Times New Roman', Times, serif",
    fontWeight: 700, fontSize: '12px', marginTop: '3px', marginBottom: '1.4%', textTransform: 'uppercase',
  } as CSSProperties,
  infoTable: { width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '10px' } as CSSProperties,
  infoLabelTd: { padding: '4px 6px', verticalAlign: 'middle', whiteSpace: 'nowrap', width: '180px', fontWeight: 550, border: 'none' } as CSSProperties,
  infoValTd: { padding: '4px 6px', verticalAlign: 'middle', whiteSpace: 'normal', fontWeight: 550, border: 'none' } as CSSProperties,
  photoCell: { textAlign: 'center', verticalAlign: 'top', width: '210px', border: 'none', padding: '4px 6px' } as CSSProperties,
  photoLayout: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' } as CSSProperties,
  photoRow: { display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '5px' } as CSSProperties,
  photoContainer: { border: '1px solid #000', width: '90px', height: '110px', display: 'flex', justifyContent: 'center', alignItems: 'center' } as CSSProperties,
  studentPhoto: { width: '100%', height: '100%', objectFit: 'cover' } as CSSProperties,
  attachBox: { border: '1px dotted #000', width: '90px', height: '110px', fontSize: '10px', color: '#555', display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '2px' } as CSSProperties,
  signatureRow: { display: 'flex', justifyContent: 'center', gap: '8px' } as CSSProperties,
  signatureBox: { width: '100px', height: '35px', border: '1px solid #000', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center' } as CSSProperties,
  subjTable: { width: '100%', borderCollapse: 'collapse', marginTop: '1%', fontFamily: "'Times New Roman', Times, serif", fontSize: '12px' } as CSSProperties,
  subjTh: { border: '1px solid black', padding: '4px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 700 } as CSSProperties,
  subjTdCenter: { border: '1px solid black', padding: '4px', textAlign: 'center', verticalAlign: 'middle' } as CSSProperties,
  subjTdLeft: { border: '1px solid black', padding: '4px 8px', textAlign: 'left', verticalAlign: 'middle' } as CSSProperties,
  signaturesNew: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '2%', padding: '0 20px', fontWeight: 700 } as CSSProperties,
  sigBlock: { textAlign: 'center', width: '30%' } as CSSProperties,
  sigImage: { width: '120px', height: '30px', marginBottom: '5px' } as CSSProperties,
  sigLabel: { fontSize: '13px' } as CSSProperties,
  cutLine: { display: 'flex', alignItems: 'flex-start', marginTop: '2%' } as CSSProperties,
  leftLine: { width: '1px', height: '20px', background: '#000', marginRight: '2px' } as CSSProperties,
  dashedLine: { flexGrow: 1, borderTop: '2px dashed #000', height: '2px' } as CSSProperties,
  instructions: { marginTop: '-2.5%', marginBottom: '15px' } as CSSProperties,
  instrH4: { textAlign: 'center', textDecoration: 'underline', marginBottom: '5px', fontSize: '13px' } as CSSProperties,
  instrOl: { margin: 0, paddingLeft: '18px', fontSize: '12px' } as CSSProperties,
}

type UniKind = 'MECS' | 'MVSR' | 'OTHER'

function PhotoCell({ head }: { head: AnyRow }) {
  return (
    <td rowSpan={5} style={S.photoCell}>
      <div style={S.photoLayout}>
        <div style={S.photoRow}>
          <div style={S.photoContainer}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={studentPhotoSrc(head)}
              alt="Student"
              style={S.studentPhoto}
              onError={(e) => {
                const img = e.currentTarget as HTMLImageElement
                if (!img.src.endsWith('default_Student.png')) img.src = DEFAULT_STUDENT
              }}
            />
          </div>
          <div style={S.attachBox}>
            Affix latest photo of the candidate <br /> duly attested by the HOD
          </div>
        </div>
        <div style={S.signatureRow}>
          <div style={S.signatureBox} />
          <div style={S.signatureBox} />
        </div>
      </div>
    </td>
  )
}

function SubjectTable({ rows, kind }: { rows: AnyRow[]; kind: UniKind }) {
  return (
    <table style={S.subjTable}>
      <thead>
        <tr>
          <th style={S.subjTh}>Subject Code</th>
          <th style={S.subjTh}>Registered Subjects</th>
          <th style={S.subjTh}>Date of Exam</th>
          <th style={S.subjTh}>Time</th>
          <th style={S.subjTh}>Invigilator Sign</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((d, i) => {
          const isLab = txt(d.subjecttype ?? d.subject_type).toUpperCase() === 'LAB'
          const time =
            kind === 'MVSR' && isLab
              ? '-'
              : d.session_start_time && d.session_end_time
                ? `${tConvert(txt(d.session_start_time))} - ${tConvert(txt(d.session_end_time))}`
                : ''
          return (
            <tr key={`${txt(d.subject_code)}-${i}`}>
              <td style={S.subjTdCenter}>{txt(d.subject_code)}</td>
              <td style={S.subjTdLeft}>{txt(d.subject_name)}</td>
              <td style={S.subjTdLeft}>{fmtDate(d.exam_date)}</td>
              <td style={S.subjTdLeft}>{time}</td>
              <td style={S.subjTdCenter} />
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function Instructions({ kind }: { kind: UniKind }) {
  // MECS prints all 11; MVSR/other drop the last "first two hours" line.
  const items = kind === 'MECS' ? INSTRUCTIONS : INSTRUCTIONS.slice(0, 10)
  return (
    <div style={S.instructions}>
      <h4 style={S.instrH4}>Hall ticket should be preserved till the end of the examinations</h4>
      <ol style={{ ...S.instrOl, listStyleType: 'none', paddingLeft: 0 }}>
        <li>INSTRUCTIONS TO THE CANDIDATES</li>
        <li>NOTE : CANDIDATES ARE NOT ALLOWED AFTER COMMENCEMENT OF EXAM</li>
      </ol>
      <ol style={S.instrOl}>
        {items.map((line) => (
          <li key={line.slice(0, 28)} style={{ marginBottom: '2px' }}>
            {line}
          </li>
        ))}
      </ol>
    </div>
  )
}

function HallTicketPage({ group, kind }: { group: AnyRow[]; kind: UniKind }) {
  const head = group[0] ?? {}
  const banner =
    kind === 'MECS'
      ? '/assets/images/avatars/MECS_BANNER.png'
      : kind === 'MVSR'
        ? '/assets/images/avatars/MVSR-NEW-BANNER.png'
        : ''
  const bannerHeight = kind === 'MVSR' ? '90px' : '105px'

  return (
    <div style={S.pageAlign}>
      {banner ? (
        <div style={{ textAlign: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={banner}
            alt=""
            style={{ width: '100%', height: bannerHeight, objectFit: 'contain' }}
            onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
          />
        </div>
      ) : null}

      <div style={S.examHeader}>
        <h4 style={S.examTitle}>{txt(head.exam_label_name ?? head.exam_name)}</h4>
        {head.regulation_code ? <div style={S.regulationBox}>{txt(head.regulation_code)}</div> : null}
      </div>

      <div style={S.titleBar}>
        <div>HALL TICKET</div>
        <div>
          {txt(head.course_code)}. ({txt(head.group_name ?? head.group_code).toUpperCase()})
        </div>
      </div>

      <table style={S.infoTable}>
        <tbody>
          <tr>
            <td style={S.infoLabelTd}>Hall Ticket No&nbsp;&nbsp;:</td>
            <td style={S.infoValTd}>{txt(head.hallticket_number)}</td>
            <PhotoCell head={head} />
          </tr>
          <tr>
            <td style={S.infoLabelTd}>Student Name&nbsp;&nbsp;:</td>
            <td style={S.infoValTd}>{txt(head.first_name ?? head.student_name)}</td>
          </tr>
          <tr>
            <td style={S.infoLabelTd}>Father Name&nbsp;&nbsp;:</td>
            <td style={S.infoValTd}>{txt(head.father_name)}</td>
          </tr>
          <tr>
            <td style={S.infoLabelTd}>
              Center Name&nbsp;&nbsp;:<br />&amp; Address
            </td>
            <td style={S.infoValTd}>{txt(head.examcenter_name ?? head.examcenter)}</td>
          </tr>
        </tbody>
      </table>

      <SubjectTable rows={group} kind={kind} />

      {kind === 'OTHER' ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8%', fontWeight: 700, padding: '0 10px' }}>
          <div>Signature of the Student</div>
          <div>Controller of Examinations</div>
          <div>Principal</div>
        </div>
      ) : (
        <div style={S.signaturesNew}>
          <div style={S.sigBlock}>
            <div style={S.sigLabel}>Signature of HOD</div>
          </div>
          <div style={S.sigBlock}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={kind === 'MVSR' ? '/assets/images/avatars/MVSR_COE-SIGN.jpg' : '/assets/images/avatars/MECS_EXAMINATION_SIGN.png'}
              alt=""
              style={S.sigImage}
              onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
            />
            <div style={S.sigLabel}>Controller of Examinations</div>
          </div>
        </div>
      )}

      <div style={S.cutLine}>
        <div style={S.leftLine} />
        <div style={S.dashedLine} />
      </div>

      <Instructions kind={kind} />
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
    const code = universityCode.toUpperCase()
    const kind: UniKind = code === 'MECS' || code === '' ? 'MECS' : code === 'MVSR' ? 'MVSR' : 'OTHER'
    const groups = groupByStudentAndYear(rows)
    printView = (
      <div className="hall-ticket-wrapper text-black" style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px' }}>
        {groups.length === 0 ? (
          <p className="text-[11px] text-center py-6">No hallticket rows to print.</p>
        ) : (
          groups.map((group, i) => <HallTicketPage key={`ht-${i}`} group={group} kind={kind} />)
        )}
      </div>
    )
  }

  return { printMode, printButton, printView }
}
