/**
 * Angular parity: print-regular-exam-fee-receipt — EXAM FEE-RECEIPT HTML + iframe print.
 * Prints Student Copy + Department Copy (dashed cut line), matching Angular #print-section.
 * Iframe print avoids AppShell @media print blank PDFs.
 */

import { MINIO_URL } from '@/config/constants/api'
import { currencySymbol, fmtDate, numToWords } from './money'
import type { ExamFeePrintPayload } from './store'

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const DEFAULT_LOGO = '/images/avatars/default_logo.png'

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
  .page {
    width: 100%;
    max-width: 780px;
    margin: 0 auto;
    padding: 8px 12px;
  }
  .receipt {
    width: 100%;
    border: 1px solid #000;
    padding: 10px 12px;
  }
  .header {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    border-bottom: 2px solid #000;
    padding-bottom: 8px;
    margin-bottom: 4px;
  }
  .h-logo { height: 64px; width: 64px; object-fit: contain; }
  .header-text { flex: 1; text-align: center; }
  .header-text h2 {
    margin: 0;
    font-size: 18px;
    font-weight: bold;
    text-transform: uppercase;
  }
  .header-text h4 { margin: 4px 0 0; font-size: 12px; font-weight: normal; }
  .title-row {
    display: flex;
    align-items: center;
    margin: 4px 0 6px;
  }
  .title-row h3 {
    flex: 1;
    margin: 0;
    text-align: center;
    font-size: 16px;
    font-weight: bold;
    text-decoration: underline;
  }
  .copy-label {
    flex: 0 0 38%;
    text-align: right;
    font-size: 13px;
    padding-right: 4px;
  }
  .line {
    border: none;
    border-top: 1px solid #000;
    margin: 0 0 10px;
  }
  .main-card {
    display: flex;
    gap: 16px;
    margin-bottom: 12px;
    font-size: 13px;
  }
  .main-card .col { flex: 1; }
  .main-card table { width: 100%; border-collapse: collapse; }
  .main-card th {
    text-align: left;
    font-weight: 600;
    padding: 2px 6px 2px 0;
    white-space: nowrap;
    vertical-align: top;
  }
  .main-card td { padding: 2px 0; vertical-align: top; }
  .dots { width: 12px; text-align: center; }
  .fee-table {
    width: 100%;
    max-width: 420px;
    margin: 0 auto 12px;
    border-collapse: collapse;
    font-size: 13px;
  }
  .fee-table th, .fee-table td {
    border: 1px solid #000;
    padding: 6px 8px;
  }
  .fee-table th { font-weight: 600; text-align: left; }
  .fee-table th.center { text-align: center; }
  .fee-table td.amt { text-align: right; }
  .fee-table tr.paid th,
  .fee-table tr.paid td {
    border-top: 2px solid #000;
  }
  .note {
    border: 1px solid #000;
    padding: 10px 12px;
    font-size: 12px;
    text-align: left;
  }
  .note p { margin: 0 0 4px; }
  .cut-line {
    border: none;
    border-top: 2px dashed #000;
    margin: 14px 0;
  }
  @media print {
    html, body { background: #fff !important; }
    tr { page-break-inside: avoid; }
    .receipt { page-break-inside: avoid; }
  }
  @page { margin: 1cm; }
`

function logoUrl(data: ExamFeePrintPayload): string {
  const path = data.orgLogo ? String(data.orgLogo) : ''
  if (!path) return DEFAULT_LOGO
  if (/^https?:\/\//i.test(path)) return path
  return `${MINIO_URL}${path}`
}

function paymentTypeLabel(data: ExamFeePrintPayload): string {
  const code = data.paymentModeCatCode ?? data.paymentModeCatDisplayName ?? ''
  let extra = ''
  if (data.paymentMode != null && String(data.paymentMode) !== '') {
    extra = ` (${data.paymentMode}`
    if (data.cardName != null && String(data.cardName) !== '') {
      extra += ` -${data.cardName}`
    }
    extra += ')'
  }
  return `${code}${extra}`
}

function buildOneCopyHtml(
  data: ExamFeePrintPayload,
  copyLabel: 'Student Copy' | 'Department Copy',
): string {
  const e = escapeHtml
  const logo = logoUrl(data)
  const branch = `${data.courseCode ?? ''} (${data.groupCode ?? ''}${
    data.section ? `-${data.section}` : ''
  })`
  const examType =
    data.examtypeCatDisplayName != null &&
    String(data.examtypeCatDisplayName) !== ''
      ? ` (${data.examtypeCatDisplayName})`
      : ''
  const total =
    data.examTotalAmount != null
      ? `₹${currencySymbol(data.examTotalAmount)}`
      : ''
  const words =
    data.examTotalAmount != null
      ? `${numToWords(data.examTotalAmount)} Only`
      : ''

  return `
    <div class="receipt">
      <div class="header">
        <img class="h-logo" src="${e(logo)}" alt="logo"
          onerror="this.onerror=null;this.src='${DEFAULT_LOGO}';" />
        <div class="header-text">
          <h2>${e(data.collegeName ?? '')}</h2>
          <h4>${e(data.address ?? '')}</h4>
        </div>
      </div>
      <div class="title-row">
        <h3>EXAM FEE-RECEIPT</h3>
        <div class="copy-label">${e(copyLabel)}</div>
      </div>
      <hr class="line" />
      <div class="main-card">
        <div class="col">
          <table>
            <tr><th>Receipt No</th><td class="dots">:</td><td>${e(data.feeReceiptNo ?? '')}</td></tr>
            <tr><th>Student Name</th><td class="dots">:</td><td>${e(data.stdName ?? '')}</td></tr>
            <tr><th>HallTicket No</th><td class="dots">:</td><td>${e(data.stdRollNumber ?? '')}</td></tr>
            <tr><th>Branch</th><td class="dots">:</td><td>${e(branch)}</td></tr>
          </table>
        </div>
        <div class="col">
          <table>
            <tr><th>Date</th><td class="dots">:</td><td>${e(fmtDate(data.receiptDate, true))}</td></tr>
            <tr><th>Father Name</th><td class="dots">:</td><td>${e(data.stdFatherName ?? '')}</td></tr>
            <tr><th>Year</th><td class="dots">:</td><td>${e(data.courseYearName ?? '')}</td></tr>
            <tr><th>Payment Type</th><td class="dots">:</td><td>${e(paymentTypeLabel(data))}</td></tr>
            <tr><th>Merchant Ref.No</th><td class="dots">:</td><td>${e(data.transactionNo ?? '')}</td></tr>
          </table>
        </div>
      </div>
      <table class="fee-table">
        <tr>
          <th class="center">Details</th>
          <th class="center">Amount</th>
        </tr>
        <tr>
          <th>Exam Fee${e(examType)}</th>
          <td class="amt">${data.examFeeAmount != null ? e(data.examFeeAmount) : ''}</td>
        </tr>
        <tr>
          <th>Add. Fee</th>
          <td class="amt">${data.examAddtFee != null ? e(data.examAddtFee) : ''}</td>
        </tr>
        <tr>
          <th>LateFee</th>
          <td class="amt">${data.examFineAmount != null ? e(data.examFineAmount) : ''}</td>
        </tr>
        <tr class="paid">
          <th>Amount Paid</th>
          <td class="amt">${e(total)}</td>
        </tr>
        <tr>
          <th>Amount In Words</th>
          <td>${e(words)}</td>
        </tr>
      </table>
      <div class="note">
        <p><strong>NOTE:</strong></p>
        <p>1. Please check the receipt before leaving the window</p>
        <p>2. This is system generated receipt</p>
      </div>
    </div>
  `
}

export function buildExamFeeReceiptHtml(data: ExamFeePrintPayload): string {
  // Angular #print-section: Student Copy + dashed cut + Department Copy
  const body = `
    <div class="page">
      ${buildOneCopyHtml(data, 'Student Copy')}
      <hr class="cut-line" />
      ${buildOneCopyHtml(data, 'Department Copy')}
    </div>
  `

  return `<!doctype html><html><head><meta charset="utf-8"><title>EXAM FEE-RECEIPT</title><style>${PRINT_CSS}</style></head><body>${body}</body></html>`
}

export function printExamFeeReceipt(data: ExamFeePrintPayload): void {
  const html = buildExamFeeReceiptHtml(data)

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
