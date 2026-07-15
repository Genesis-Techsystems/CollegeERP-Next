/**
 * Grade And Grade Points Report — iframe print (avoids AppShell blank pages).
 */

type AnyRow = Record<string, unknown>

export type GradePointStudentRow = AnyRow[]

export type GradePointPrintMeta = {
  title?: string
  collegeName?: string
  subjectCodes: string[]
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function cell(row: AnyRow | undefined, keys: string[]): string {
  if (!row) return ''
  for (const key of keys) {
    const v = row?.[key]
    if (v != null && String(v).trim() !== '') return String(v)
  }
  return ''
}

function findMarks(list: AnyRow[], subjectCode: string, field: string): string {
  const item = list.find((x) => String(x?.subject_code ?? '') === subjectCode)
  if (!item) return ' '
  const v = item[field]
  return v == null || String(v).trim() === '' ? ' ' : String(v)
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
    margin: 4px 0 16px;
  }
  table.data {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 12px;
    font-size: 12px;
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
  @page { margin: 12mm; }
`

function buildTableHtml(mainList: GradePointStudentRow[], subjectCodes: string[]): string {
  const topHeads = subjectCodes
    .map((code) => `<th colspan="2">${escapeHtml(code)}</th>`)
    .join('')
  const subHeads = subjectCodes.map(() => '<th>Points</th><th>Grade</th>').join('')
  const head = `
    <tr>
      <th rowspan="2">ROLL NO</th>
      ${topHeads}
      <th rowspan="2">SGPA</th>
      <th rowspan="2">Fail Count</th>
      <th rowspan="2">Failed Subjects</th>
    </tr>
    <tr>${subHeads}</tr>`

  const body = mainList
    .map((list) => {
      const first = list[0] ?? {}
      const subjectCells = subjectCodes
        .map(
          (code) =>
            `<td>${escapeHtml(findMarks(list, code, 'grade_points'))}</td><td>${escapeHtml(findMarks(list, code, 'grade'))}</td>`,
        )
        .join('')
      return `<tr>
        <td>${escapeHtml(cell(first, ['hallticket_number', 'hall_ticketno']))}</td>
        ${subjectCells}
        <td>${escapeHtml(cell(first, ['sgpa']))}</td>
        <td>${escapeHtml(cell(first, ['total_fail_subjects']))}</td>
        <td>${escapeHtml(cell(first, ['failed_subjects']))}</td>
      </tr>`
    })
    .join('')

  return `<table class="data"><thead>${head}</thead><tbody>${body}</tbody></table>`
}

export function printStudentWiseGradePointReport(
  mainList: GradePointStudentRow[],
  meta: GradePointPrintMeta,
): void {
  if (mainList.length === 0) return

  const title = meta.title ?? 'Grade And Grade Points Report'
  const collegeName = meta.collegeName ? `<div class="college-name">${escapeHtml(meta.collegeName)}</div>` : ''

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
    ${buildTableHtml(mainList, meta.subjectCodes)}
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
