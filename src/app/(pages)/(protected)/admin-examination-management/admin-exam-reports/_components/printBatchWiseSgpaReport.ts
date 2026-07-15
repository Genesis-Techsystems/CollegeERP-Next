/**
 * Batch Wise SGPA Report — iframe print (avoids AppShell blank pages).
 */

type AnyRow = Record<string, unknown>

export type SgpaSemesterCol = {
  course_year_code: string
  course_year_name: string
  pk_course_year_id?: number
}

export type SgpaPrintMeta = {
  title?: string
  collegeName?: string
  filterSummary?: string
  semesters: SgpaSemesterCol[]
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
    margin: 0; padding: 0; background: #fff; color: #000;
    font-family: Arial, Helvetica, sans-serif;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .wrap { padding: 12px 16px; width: 98%; }
  .college-name { text-align: center; font-size: 22px; font-weight: 700; margin: 8px 0 2px; }
  .title { text-align: center; font-size: 18px; font-weight: 600; margin: 4px 0 8px; }
  .exam { text-align: center; font-size: 13px; margin: 0 0 16px; }
  table.data { width: 100%; border-collapse: collapse; font-size: 11px; }
  table.data th, table.data td {
    border: 1px solid #333; padding: 3px 4px; text-align: center; vertical-align: middle;
  }
  table.data th { background: #f2f2f2; font-weight: 600; }
  .left { text-align: left !important; }
  @page { margin: 10mm; }
`

export function printBatchWiseSgpaReport(rows: AnyRow[], meta: SgpaPrintMeta): void {
  if (rows.length === 0) return

  const title = meta.title ?? 'Batch Wise SGPA Report'
  const collegeName = meta.collegeName
    ? `<div class="college-name">${escapeHtml(meta.collegeName)}</div>`
    : ''
  const exam = meta.filterSummary
    ? `<div class="exam">${escapeHtml(meta.filterSummary)}</div>`
    : ''

  const semHeads = meta.semesters
    .map((s) => `<th>${escapeHtml(s.course_year_name || s.course_year_code)}</th>`)
    .join('')

  const body = rows
    .map((row, i) => {
      const semCells = meta.semesters
        .map((s) => `<td>${escapeHtml(String(row[s.course_year_code] ?? ''))}</td>`)
        .join('')
      return `<tr>
        <td>${i + 1}</td>
        <td class="left">${escapeHtml(String(row.hallticket_number ?? ''))}</td>
        <td class="left">${escapeHtml(String(row.first_name ?? ''))}</td>
        ${semCells}
      </tr>`
    })
    .join('')

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><title>${escapeHtml(title)}</title><style>${PRINT_CSS}</style></head>
<body>
  <div class="wrap">
    ${collegeName}
    <div class="title">${escapeHtml(title)}</div>
    ${exam}
    <table class="data">
      <thead>
        <tr>
          <th>S.No</th>
          <th>ROLL NO</th>
          <th>NAME OF THE STUDENT</th>
          ${semHeads}
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
  </div>
</body>
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
  const cleanup = () => {
    try {
      document.body.removeChild(iframe)
    } catch {
      /* ignore */
    }
  }
  win.focus()
  setTimeout(() => {
    win.print()
    setTimeout(cleanup, 1000)
  }, 250)
}
