/**
 * Academic Year Curriculum Report — iframe print (avoids AppShell blank pages).
 */

type AnyRow = Record<string, unknown>

export type CurriculumPrintMeta = {
  title?: string
  filterSummary?: string
  collegeName?: string
  columns: string[]
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function cell(row: AnyRow, key: string): string {
  const v = row?.[key]
  if (v == null || String(v).trim() === '') return ''
  return String(v)
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
    text-align: left;
    font-size: 22px;
    font-weight: 700;
    margin: 8px 0 2px;
  }
  .title {
    text-align: left;
    font-size: 18px;
    font-weight: 600;
    margin: 4px 0 8px;
  }
  .exam {
    text-align: left;
    font-size: 13px;
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
    text-align: left;
    vertical-align: middle;
  }
  table.data th {
    background: #f2f2f2;
    font-weight: 600;
  }
  @page { margin: 10mm; }
`

export function printAcademicYearCurriculumReport(
  rows: AnyRow[],
  meta: CurriculumPrintMeta,
): void {
  if (rows.length === 0 || meta.columns.length === 0) return

  const title = meta.title ?? 'Academic Year Curriculum Report'
  const collegeName = meta.collegeName
    ? `<div class="college-name">${escapeHtml(meta.collegeName)}</div>`
    : ''
  const exam = meta.filterSummary
    ? `<div class="exam">${escapeHtml(meta.filterSummary)}</div>`
    : ''

  const head = `<th>S.No</th>${meta.columns.map((c) => `<th>${escapeHtml(c)}</th>`).join('')}`
  const body = rows
    .map(
      (row, i) =>
        `<tr><td>${i + 1}</td>${meta.columns
          .map((c) => `<td>${escapeHtml(cell(row, c))}</td>`)
          .join('')}</tr>`,
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
      <thead><tr>${head}</tr></thead>
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
