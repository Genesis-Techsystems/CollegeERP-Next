/**
 * Group Wise Passed/Failed Result Sheets — iframe print.
 * Avoids AppShell blank-sheet issues from window.print() on the main document.
 */

type AnyRow = Record<string, unknown>

export type GroupWisePrintGroup = {
  groupCode: string
  students: AnyRow[]
}

export type GroupWisePrintMeta = {
  title: string
  examLabel?: string
  courseGroupCode?: string
  resultStatus: string
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function hallTicket(row: AnyRow): string {
  for (const key of ['hallticket_number', 'hall_ticketno', 'hallTicketNumber']) {
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
    font-size: 28px;
    font-weight: 700;
    margin: 12px 0 4px;
  }
  .title {
    text-align: center;
    font-size: 23px;
    font-weight: 600;
    margin: 4px 0;
  }
  .details {
    text-align: center;
    font-size: 18px;
    margin: 4px 0 16px;
  }
  .course-line {
    text-align: left;
    font-size: 16px;
    font-weight: 500;
    margin: 0 0 10px;
  }
  .group-head {
    text-align: left;
    font-size: 15px;
    font-weight: 600;
    margin: 12px 0 4px;
  }
  hr {
    border: none;
    border-top: 1px solid #000;
    margin: 6px 0;
  }
  .tickets {
    width: 100%;
    border-collapse: collapse;
  }
  .tickets td {
    width: 25%;
    padding: 4px 6px;
    text-align: left;
    font-size: 13px;
    vertical-align: top;
    border: none;
  }
  @page { margin: 1cm; }
  @media print {
    html, body { background: #fff !important; }
  }
`

function chunkTickets(tickets: string[], size = 4): string[][] {
  const rows: string[][] = []
  for (let i = 0; i < tickets.length; i += size) {
    rows.push(tickets.slice(i, i + size))
  }
  return rows
}

function buildDocument(groups: GroupWisePrintGroup[], meta: GroupWisePrintMeta): string {
  const title = escapeHtml(meta.title)
  const exam = escapeHtml(meta.examLabel ?? '')
  const courseGroup = escapeHtml(meta.courseGroupCode ?? '')
  const status = escapeHtml(meta.resultStatus)

  const groupsHtml = groups
    .map((group) => {
      const tickets = group.students.map(hallTicket).filter(Boolean)
      const rows = chunkTickets(tickets)
        .map(
          (row) =>
            `<tr>${row
              .map((t) => `<td>${escapeHtml(t)}</td>`)
              .concat(Array(Math.max(0, 4 - row.length)).fill('<td></td>'))
              .join('')}</tr>`,
        )
        .join('')
      return `
        <p class="group-head">${escapeHtml(group.groupCode)} - ${status} (${tickets.length})</p>
        <hr />
        <table class="tickets" cellspacing="0" cellpadding="0">${rows}</table>
        <hr />
      `
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
    <p class="title">${title}</p>
    ${exam ? `<p class="details">${exam}</p>` : ''}
    ${courseGroup ? `<p class="course-line">Course : ${courseGroup}</p>` : ''}
    ${groupsHtml}
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

export function printGroupWiseResultSheets(
  groups: GroupWisePrintGroup[],
  meta: GroupWisePrintMeta,
): void {
  if (!groups.length) return
  printHtmlInIframe(buildDocument(groups, meta))
}
