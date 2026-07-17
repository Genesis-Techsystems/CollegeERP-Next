/**
 * Angular parity: regular-exam-fee-collection/exam-form — EXAM FORM HTML + iframe print.
 * Iframe print avoids AppShell @media print blank PDFs.
 */

import { fmtDate, semesterLabel } from './money'
import type { ExamFeePrintPayload } from './store'

type AnyRow = Record<string, any>

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const PRINT_CSS = `
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    background: #fff;
    color: #000;
    font-family: Arial, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .layout { width: 100%; max-width: 900px; margin: 0 auto; padding: 8px 12px; }
  h2 {
    text-align: center;
    text-transform: uppercase;
    font-weight: bold;
    margin: 15px 0 12px;
    font-size: 20px;
  }
  hr {
    clear: both;
    display: block;
    width: 100%;
    height: 1px;
    background: #000;
    border: none;
    margin: 15px 0;
  }
  .p-tag {
    font-size: 11px;
    margin-bottom: -8px;
    text-align: center;
    font-weight: bold;
  }
  .banner { width: 100%; height: auto; display: block; max-height: 90px; object-fit: contain; }
  #sigtable-1 {
    width: 100%;
    border: none;
    border-collapse: collapse;
    font-size: 15px;
    font-weight: 600;
    margin-bottom: 12px;
  }
  #sigtable-1 td {
    border: none;
    padding: 4px 0;
    text-align: center;
  }
  .faculty-details { margin: 12px 0 20px; }
  .course-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 16px;
    border: 1px solid #000;
  }
  .course-table th,
  .course-table td {
    border: 1px solid #000;
    padding: 5px;
    text-align: left;
    font-size: 14px;
  }
  .course-table th span { font-weight: 100; }
  .course-table .subj-cell { font-size: 12px; }
  .fee-title { font-weight: bold; margin: 8px 0; font-size: 13px; }
  .admit-card {
    border-top: 2px solid #000;
    border-bottom: 2px solid #000;
    width: 100%;
    margin: 0 auto;
  }
  .signatures-4 {
    display: flex;
    justify-content: space-between;
    margin: 5px;
    gap: 8px;
  }
  .signature-1 {
    width: 25%;
    text-align: center;
    font-size: smaller;
    font-weight: 500;
  }
  .printed-date { text-align: right; font-size: 12px; margin: 12px 0; }
  #sigtable {
    width: 100%;
    border: none;
    border-collapse: collapse;
    font-size: 13px;
    font-weight: 600;
    margin-top: 60px;
  }
  #sigtable td {
    border: none;
    text-align: center;
    padding: 0;
  }
  @media print {
    html, body { background: #fff !important; }
    tr { page-break-inside: avoid; }
    thead { display: table-header-group; }
  }
  @page { margin: 1cm; }
`

function subjectsFromPayload(data: ExamFeePrintPayload): AnyRow[] {
  const fromDto = data?.examStudentDTOs?.[0]?.examStudentDetailDTOs
  if (Array.isArray(fromDto) && fromDto.length > 0) return fromDto
  const fromReg = data?.examStdRegSubDTOs
  if (Array.isArray(fromReg) && fromReg.length > 0) return fromReg
  return []
}

export function buildExamFeeExamFormHtml(
  data: ExamFeePrintPayload,
  opts?: { orgCode?: string; printedDate?: Date },
): string {
  const e = escapeHtml
  const orgCode = opts?.orgCode ?? ''
  const printed = opts?.printedDate ?? new Date()
  const subjects = subjectsFromPayload(data)
  const semester =
    semesterLabel(data.courseYearCode ?? data.course_year_code) ||
    String(data.courseYearName ?? '')

  const sukBanner =
    orgCode === 'SUK'
      ? `<div class="layout">
          <img class="banner" src="/images/avatars/SUK_BANNER_NEW.jpg" alt="SUK" />
          <p class="p-tag">KALABURAGI-585103, KARNATAKA, INDIA</p>
        </div>`
      : ''

  const subjectRows =
    subjects.length === 0
      ? `<tr><td colspan="2" style="text-align:center;">No subjects</td></tr>`
      : subjects
          .map(
            (s) => `<tr>
              <td class="subj-cell">${e(s.subjectCode ?? s.Subject_code ?? '')}</td>
              <td class="subj-cell">${e(s.subjectName ?? s.Subject_name ?? s.shortName ?? '')}</td>
            </tr>`,
          )
          .join('')

  const body = `
    ${sukBanner}
    <hr />
    <div class="layout">
      <h2>EXAM FORM</h2>
      <table id="sigtable-1">
        <tr>
          <td>Application Id : ${e(data.otherPaymentNumber ?? '')}</td>
          <td>${e(data.examName ?? '')}</td>
        </tr>
      </table>
    </div>
    <div class="faculty-details layout">
      <table class="course-table">
        <tr>
          <th colspan="2">USN :<span> ${e(data.stdRollNumber ?? '')}</span></th>
          <th colspan="2">Student Name :<span> ${e(data.stdName ?? '')}</span></th>
        </tr>
        <tr>
          <th colspan="2">Father Name :<span> ${e(data.stdFatherName ?? '')}</span></th>
          <th colspan="2">Student Type :<span> ${e(data.studentType ?? '')}</span></th>
        </tr>
        <tr>
          <th colspan="4">Faculty :<span> ${e(data.collegeName ?? '')}</span></th>
        </tr>
        <tr>
          <th colspan="2">Programme :<span> ${e(data.courseCode ?? '')} - ${e(data.groupCode ?? '')}</span></th>
          <td colspan="2"><span style="font-weight:550;">Semester :</span> ${e(semester)}</td>
        </tr>
      </table>
      <table class="course-table">
        <thead>
          <tr>
            <th style="text-align:center;">Course Code</th>
            <th style="text-align:center;">Course Title</th>
          </tr>
        </thead>
        <tbody>${subjectRows}</tbody>
      </table>
    </div>
    <div class="layout">
      <p class="fee-title">FEE Details</p>
      <div class="admit-card">
        <div class="signatures-4">
          <div class="signature-1"><label>Receipt No : </label></div>
          <div class="signature-1"><label>Date : ${e(fmtDate(data.receiptDate))}</label></div>
          <div class="signature-1"><label>UTR No : ${e(data.transactionNo ?? '')}</label></div>
          <div class="signature-1"><label>Total : ${e(data.examTotalAmount ?? '')}</label></div>
        </div>
      </div>
    </div>
    <div class="layout">
      <p class="printed-date">Printed Date : ${e(fmtDate(printed))}</p>
      <table id="sigtable">
        <tr>
          <td>Student Name &amp; Signature :</td>
          <td>Chairperson Signature :</td>
        </tr>
      </table>
    </div>
  `

  return `<!doctype html><html><head><meta charset="utf-8"><title>EXAM FORM</title><style>${PRINT_CSS}</style></head><body>${body}</body></html>`
}

export function printExamFeeExamForm(
  data: ExamFeePrintPayload,
  opts?: { orgCode?: string },
): void {
  const html = buildExamFeeExamFormHtml(data, {
    orgCode: opts?.orgCode,
    printedDate: new Date(),
  })

  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.cssText =
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0;'
  document.body.appendChild(frame)

  const fdoc = frame.contentDocument
  const win = frame.contentWindow
  if (!fdoc || !win) {
    frame.remove()
    return
  }

  fdoc.open()
  fdoc.write(html)
  fdoc.close()

  const cleanup = () => frame.remove()
  win.addEventListener('afterprint', cleanup)

  const imgs = Array.from(fdoc.images)
  const waitForImages = imgs.length
    ? Promise.all(
        imgs.map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete) {
                resolve()
                return
              }
              img.onload = () => resolve()
              img.onerror = () => resolve()
            }),
        ),
      )
    : Promise.resolve()

  void waitForImages.then(() => {
    setTimeout(() => {
      win.focus()
      win.print()
      setTimeout(cleanup, 1500)
    }, 100)
  })
}
