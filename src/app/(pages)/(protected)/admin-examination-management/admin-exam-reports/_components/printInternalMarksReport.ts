/**
 * Internal Marks Report — iframe print (avoids AppShell blank pages).
 */

type AnyRow = Record<string, unknown>

export type SubjectCol = {
  subject_code: string
  subject_name: string
}

export type InternalMarksPrintMeta = {
  title?: string
  filterSummary?: string
  collegeName?: string
  subjectCols: SubjectCol[]
  maxMarksBySubject: Record<string, string | number>
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function findMarks(list: AnyRow[], subjectCode: string, markType: string): string | number {
  const subject = list.find((item) => String(item.subject_code ?? '') === subjectCode)
  if (!subject) return ' '
  const v = subject[markType]
  return v == null || String(v).trim() === '' ? ' ' : (v as string | number)
}

function rowTotal(list: AnyRow[], subjectCols: SubjectCol[]): number {
  return subjectCols.reduce((sum, col) => {
    const mark = Number(findMarks(list, col.subject_code, 'marks'))
    return sum + (Number.isFinite(mark) ? mark : 0)
  }, 0)
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
  .sub-code { font-size: 10px; font-weight: 400; }
  .sub-max { font-size: 9px; font-weight: 400; }
  .signatures {
    display: flex;
    justify-content: space-between;
    margin-top: 48px;
    padding: 0 40px;
    font-weight: 600;
  }
  @page { margin: 10mm; }
`

export function printInternalMarksReport(
  mainList: AnyRow[][],
  meta: InternalMarksPrintMeta,
): void {
  if (mainList.length === 0) return

  const title = meta.title ?? 'Internal Marks Report'
  const collegeName = meta.collegeName
    ? `<div class="college-name">${escapeHtml(meta.collegeName)}</div>`
    : ''
  const exam = meta.filterSummary
    ? `<div class="exam">${escapeHtml(meta.filterSummary)}</div>`
    : ''

  const subjectHeaders = meta.subjectCols
    .map((col) => {
      const max = meta.maxMarksBySubject[col.subject_code] ?? ' '
      return `<th>
        <div>${escapeHtml(col.subject_code)}</div>
        <div class="sub-code">(${escapeHtml(col.subject_name)})</div>
        <div class="sub-max">Max Marks(${escapeHtml(String(max))})</div>
      </th>`
    })
    .join('')

  const body = mainList
    .map((list, i) => {
      const first = list[0] ?? {}
      const subjectCells = meta.subjectCols
        .map(
          (col) =>
            `<td>${escapeHtml(String(findMarks(list, col.subject_code, 'marks')))}</td>`,
        )
        .join('')
      return `<tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(String(first.roll_number ?? ''))}</td>
        ${subjectCells}
        <td>${rowTotal(list, meta.subjectCols)}</td>
        <td>${escapeHtml(String(first.total_max_marks ?? ''))}</td>
        <td>${escapeHtml(String(first.total_percentage ?? ''))}</td>
      </tr>`
    })
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
          ${subjectHeaders}
          <th>Total Marks Scored</th>
          <th>Total Maximum Marks</th>
          <th>Percentage (%)</th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
    <div class="signatures">
      <div>HOD</div>
      <div>Principal</div>
    </div>
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
