/**
 * Re-Evaluation Comparision Report — iframe print (avoids AppShell blank pages).
 */

type AnyRow = Record<string, unknown>

export type ComparisionPrintMeta = {
  title?: string
  examLabel?: string
  universityName?: string
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function cell(row: AnyRow, keys: string[]): string {
  for (const key of keys) {
    const v = row?.[key]
    if (v != null && String(v).trim() !== '') return String(v)
  }
  return ''
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
  .wrap { padding: 12px 16px; width: 98%; }
  .college-name {
    text-align: center;
    font-size: 26px;
    font-weight: 700;
    margin: 8px 0 2px;
  }
  .title {
    text-align: center;
    font-size: 22px;
    font-weight: 600;
    margin: 4px 0 8px;
  }
  .exam {
    text-align: center;
    font-size: 14px;
    margin: 0 0 16px;
  }
  table.data {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 12px;
    font-size: 11px;
  }
  table.data th,
  table.data td {
    border: 1px solid #333;
    padding: 3px 4px;
    text-align: center;
    vertical-align: middle;
  }
  table.data th {
    background: #f2f2f2;
    font-weight: 600;
  }
  @page { margin: 10mm; }
`

export function printReEvaluationComparisionReport(
  rows: AnyRow[],
  meta: ComparisionPrintMeta,
): void {
  if (rows.length === 0) return

  const title = meta.title ?? 'Re-Evaluation Comparision Result Report'
  const collegeName = meta.universityName
    ? `<div class="college-name">${escapeHtml(meta.universityName)}</div>`
    : ''
  const exam = meta.examLabel
    ? `<div class="exam">${escapeHtml(meta.examLabel)}</div>`
    : ''

  const body = rows
    .map(
      (row, i) => `<tr>
      <td>${i + 1}</td>
      <td>${escapeHtml(cell(row, ['Subject_Code', 'subject_code']))}</td>
      <td>${escapeHtml(cell(row, ['Subject_Name', 'subject_name']))}</td>
      <td>${escapeHtml(cell(row, ['Total_Registered', 'total_registered']))}</td>
      <td>${escapeHtml(cell(row, ['Total_Appeared', 'total_appeared']))}</td>
      <td>${escapeHtml(cell(row, ['Pass_Before_RV', 'pass_before_rv']))}</td>
      <td>${escapeHtml(cell(row, ['Before_RV', 'before_rv']))}</td>
      <td>${escapeHtml(cell(row, ['Students_Applied_RV', 'students_applied_rv']))}</td>
      <td>${escapeHtml(cell(row, ['Students_Benefitted', 'students_benefitted']))}</td>
      <td>${escapeHtml(cell(row, ['Pass_After_RV', 'pass_after_rv']))}</td>
      <td>${escapeHtml(cell(row, ['Final_Pass', 'final_pass']))}</td>
    </tr>`,
    )
    .join('')

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>${PRINT_CSS}</style>
</head>
<body>
  <div class="wrap">
    ${collegeName}
    <div class="title">${escapeHtml(title)}</div>
    ${exam}
    <table class="data">
      <thead>
        <tr>
          <th colspan="5"></th>
          <th colspan="2">Result Before RV</th>
          <th colspan="2"></th>
          <th colspan="2">After RV</th>
        </tr>
        <tr>
          <th>S.No</th>
          <th>Subject Code</th>
          <th>Subject Name</th>
          <th>Registered</th>
          <th>Appeared</th>
          <th>Passed</th>
          <th>Pass %</th>
          <th>No.of Students Applied RV</th>
          <th>No.of Students Benefited</th>
          <th>Passed</th>
          <th>Pass %</th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
  </div>
</body>
</html>`

  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = 'none'
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument ?? iframe.contentWindow?.document
  if (!doc) {
    document.body.removeChild(iframe)
    return
  }

  doc.open()
  doc.write(html)
  doc.close()

  const printFrame = () => {
    try {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
    } finally {
      setTimeout(() => {
        if (iframe.parentNode) document.body.removeChild(iframe)
      }, 1000)
    }
  }

  if (iframe.contentWindow?.document.readyState === 'complete') {
    setTimeout(printFrame, 250)
  } else {
    iframe.onload = () => setTimeout(printFrame, 250)
  }
}
