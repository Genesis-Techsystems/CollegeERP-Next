/**
 * Re-Evaluation Exam Report — iframe print (avoids AppShell blank pages).
 */

type AnyRow = Record<string, unknown>

export type ReEvaluationPrintMeta = {
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

export function printReEvaluationExamReport(rows: AnyRow[], meta: ReEvaluationPrintMeta): void {
  if (rows.length === 0) return

  const title = meta.title ?? 'Re-Evaluation Exam Report'
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
      <td>${escapeHtml(cell(row, ['hallticket_number', 'hall_ticketno']))}</td>
      <td>${escapeHtml(cell(row, ['course_year_code', 'courseYearCode']))}</td>
      <td>${escapeHtml(cell(row, ['subject_name', 'subjectName']))}</td>
      <td>${escapeHtml(cell(row, ['cie']))}</td>
      <td>${escapeHtml(cell(row, ['see']))}</td>
      <td>${escapeHtml(cell(row, ['rv1']))}</td>
      <td>${escapeHtml(cell(row, ['rv2']))}</td>
      <td>${escapeHtml(cell(row, ['rv3']))}</td>
      <td>${escapeHtml(cell(row, ['avg_marks']))}</td>
      <td>${escapeHtml(cell(row, ['moderation_marks']))}</td>
      <td>${escapeHtml(cell(row, ['final_marks']))}</td>
      <td>${escapeHtml(cell(row, ['final_total_marks']))}</td>
      <td>${escapeHtml(cell(row, ['grade_old']))}</td>
      <td>${escapeHtml(cell(row, ['grade']))}</td>
      <td>${escapeHtml(cell(row, ['Result', 'result']))}</td>
      <td>${escapeHtml(cell(row, ['Grade_Result', 'grade_result']))}</td>
      <td>${escapeHtml(cell(row, ['group_code', 'groupCode']))}</td>
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
          <th>S.No</th>
          <th>Hall Ticket No.</th>
          <th>Course Year</th>
          <th>Subject</th>
          <th>CIE</th>
          <th>SEE</th>
          <th>RV1</th>
          <th>RV2</th>
          <th>RV3</th>
          <th>Average of RV1,RV2,RV3</th>
          <th>Moderation Marks</th>
          <th>Final Marks</th>
          <th>Total Marks</th>
          <th>Original Grade</th>
          <th>Final Grade</th>
          <th>Marks Result</th>
          <th>Grade Result</th>
          <th>Branch</th>
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
