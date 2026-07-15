/**
 * Batch Wise Detention Report — iframe print (avoids AppShell blank pages).
 */

type AnyRow = Record<string, unknown>

export type DetentionPrintMeta = {
  title?: string
  collegeName?: string
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
  .wrap { padding: 12px 16px; }
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
  }
  table.data th, table.data td {
    border: 1px solid #333;
    padding: 5px 8px;
    font-size: 12px;
    text-align: left;
  }
  table.data th {
    background: #f2f2f2;
    font-weight: 700;
  }
  table.data td.center { text-align: center; }
  @page { margin: 1cm; }
  @media print {
    html, body { background: #fff !important; }
    tr { page-break-inside: avoid; }
  }
`

function buildDocument(rows: AnyRow[], meta: DetentionPrintMeta): string {
  const title = escapeHtml(meta.title ?? 'Detention Report')
  const college = escapeHtml(meta.collegeName ?? '')

  const body = rows
    .map((r, i) => {
      const ht = escapeHtml(cell(r, ['hallticket_number', 'hall_ticketno']))
      const name = escapeHtml(cell(r, ['student_name', 'studentName']))
      const group = escapeHtml(cell(r, ['group_code', 'groupCode']))
      const year = escapeHtml(cell(r, ['course_year_code', 'courseYearCode']))
      const batch = escapeHtml(cell(r, ['batch_name', 'batchName']))
      return `<tr>
        <td class="center">${i + 1}</td>
        <td>${ht}</td>
        <td>${name}</td>
        <td>${group}</td>
        <td>${year}</td>
        <td>${batch}</td>
      </tr>`
    })
    .join('')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>${PRINT_CSS}</style>
</head>
<body>
  <div class="wrap">
    ${college ? `<p class="college-name">${college}</p>` : ''}
    <p class="title">${title}</p>
    <table class="data" cellspacing="0" cellpadding="0">
      <thead>
        <tr>
          <th>SI.No</th>
          <th>Hall Ticket NO</th>
          <th>Student Name</th>
          <th>Group Code</th>
          <th>Course Year Code</th>
          <th>Batch Name</th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
  </div>
</body>
</html>`
}

function printHtmlInIframe(html: string): void {
  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;'
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

  setTimeout(() => {
    win.focus()
    win.print()
    setTimeout(cleanup, 1500)
  }, 300)
}

export function printDetentionReport(rows: AnyRow[], meta: DetentionPrintMeta = {}): void {
  if (!rows.length) return
  printHtmlInIframe(buildDocument(rows, meta))
}
