/**
 * Lab Remuneration Report — iframe print (avoids AppShell blank pages).
 * Mirrors Angular hall-ticket-wrapper print layout (per evaluator profile).
 */

type AnyRow = Record<string, unknown>

export type LabRemunerationPrintProfile = {
  user_name?: string
  evaluator_name?: string
  phonenumber?: string
  account_number?: string
  bank_name?: string
  ifsc_code?: string
  bank_address?: string
  pan_card_no?: string
  amount?: string | number
  total_final_amount: number
  subjects: Array<{
    subject_code?: string
    subject_name?: string
    evaluation_count?: string | number
    amount?: string | number
    final_amount?: string | number
  }>
}

export type LabRemunerationPrintMeta = {
  title?: string
  examName?: string
}

function escapeHtml(value: string): string {
  return value
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
    font-family: Arial, Helvetica, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page {
    padding: 16px 20px;
    page-break-after: always;
  }
  .page:last-child { page-break-after: auto; }
  .college-name {
    text-align: center;
    font-size: 22px;
    font-weight: 700;
    margin: 0 0 4px;
  }
  .title {
    text-align: center;
    font-size: 14px;
    font-weight: 600;
    margin: 0 0 16px;
  }
  .exam-header {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px 24px;
    font-size: 12px;
    margin-bottom: 14px;
  }
  table.data {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 14px;
    font-size: 11px;
  }
  table.data th,
  table.data td {
    border: 1px solid #333;
    padding: 4px 6px;
    text-align: center;
    vertical-align: middle;
  }
  table.data th {
    background: #f2f2f2;
    font-weight: 600;
  }
  .footer {
    font-size: 12px;
    margin-top: 10px;
  }
  .note {
    font-weight: 200;
    margin-top: 8px;
  }
  .sign {
    text-align: right;
    margin-top: 48px;
  }
  @page { margin: 10mm; }
`

export function groupLabRemunerationByProfile(rows: AnyRow[]): LabRemunerationPrintProfile[] {
  const map: Record<string, LabRemunerationPrintProfile> = {}
  for (const item of rows) {
    const key = String(item.pk_exam_evaluator_profile_id ?? item.evaluator_name ?? '')
    if (!key) continue
    if (!map[key]) {
      map[key] = {
        user_name: String(item.user_name ?? ''),
        evaluator_name: String(item.evaluator_name ?? ''),
        phonenumber: String(item.phonenumber ?? ''),
        account_number: String(item.account_number ?? ''),
        bank_name: String(item.bank_name ?? ''),
        ifsc_code: String(item.ifsc_code ?? ''),
        bank_address: String(item.bank_address ?? ''),
        pan_card_no: String(item.pan_card_no ?? ''),
        amount: (item.amount as string | number) ?? '',
        total_final_amount: 0,
        subjects: [],
      }
    }
    const finalAmount = Number(item.final_amount ?? 0)
    map[key].subjects.push({
      subject_code: String(item.subject_code ?? ''),
      subject_name: String(item.subject_name ?? ''),
      evaluation_count: (item.evaluation_count as string | number) ?? '',
      amount: (item.amount as string | number) ?? '',
      final_amount: (item.final_amount as string | number) ?? '',
    })
    map[key].total_final_amount += Number.isFinite(finalAmount) ? finalAmount : 0
  }
  return Object.values(map)
}

export function printLabRemunerationReport(
  profiles: LabRemunerationPrintProfile[],
  meta: LabRemunerationPrintMeta = {},
): void {
  if (profiles.length === 0) return

  const title = meta.title ?? 'Lab Remuneration Report'
  const pages = profiles
    .map((report) => {
      const rows = report.subjects
        .map(
          (data, i) => `<tr>
            <td>${i + 1}</td>
            <td>${escapeHtml(String(data.subject_code ?? ''))}</td>
            <td>${escapeHtml(String(data.subject_name ?? ''))}</td>
            <td>${escapeHtml(String(data.evaluation_count ?? ''))}</td>
            <td>${escapeHtml(String(data.amount ?? ''))}</td>
            <td>${escapeHtml(String(data.final_amount ?? ''))}</td>
          </tr>`,
        )
        .join('')
      return `<div class="page">
        <p class="college-name">${escapeHtml(title)}</p>
        <p class="title">${escapeHtml(meta.examName ?? '')}</p>
        <div class="exam-header">
          <div>Evaluator ID : ${escapeHtml(String(report.user_name ?? ''))}</div>
          <div>Name of the Evaluator : ${escapeHtml(String(report.evaluator_name ?? ''))}</div>
          <div>Mobile : ${escapeHtml(String(report.phonenumber ?? ''))}</div>
          <div>Bank Account Number : ${escapeHtml(String(report.account_number ?? ''))}</div>
          <div>Bank Name : ${escapeHtml(String(report.bank_name ?? ''))}</div>
          <div>IFSC Code : ${escapeHtml(String(report.ifsc_code ?? ''))}</div>
          <div>Branch : ${escapeHtml(String(report.bank_address ?? ''))}</div>
          <div>PAN Card : ${escapeHtml(String(report.pan_card_no ?? ''))}</div>
        </div>
        <table class="data">
          <thead>
            <tr>
              <th>S.NO</th>
              <th>SUBJECT CODE</th>
              <th>NAME OF THE SUBJECT</th>
              <th>EVALUATION COUNT</th>
              <th>RATE FOR SCRIPT</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="footer">
          <div>Total Amount Of : ${report.total_final_amount}/-</div>
          <div class="note">*Note :<br> Remuneration per script is ${escapeHtml(String(report.amount ?? ''))}/-</div>
          <div class="sign">Controller Of Examinations</div>
          <div class="note">This is System generated bill, No signature is required</div>
        </div>
      </div>`
    })
    .join('')

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>${PRINT_CSS}</style>
</head>
<body>${pages}</body>
</html>`

  const iframe = document.createElement('iframe')
  iframe.setAttribute('style', 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;')
  document.body.appendChild(iframe)
  const doc = iframe.contentDocument ?? iframe.contentWindow?.document
  if (!doc) {
    document.body.removeChild(iframe)
    return
  }
  doc.open()
  doc.write(html)
  doc.close()
  const win = iframe.contentWindow
  if (!win) {
    document.body.removeChild(iframe)
    return
  }
  win.focus()
  setTimeout(() => {
    win.print()
    setTimeout(() => document.body.removeChild(iframe), 1000)
  }, 250)
}
