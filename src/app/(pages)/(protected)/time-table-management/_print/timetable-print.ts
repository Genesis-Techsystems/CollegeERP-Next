/**
 * Angular parity: view-timetable printPage() — iframe print.
 * Layout: centered filterNames line + day columns (stacked periods), portrait.
 */

import type {
  AngularStudentTimetable,
  TimetableDayColumn,
  TimetableDayTiming,
  TimetableSubBatch,
} from '@/services'

// ─── helpers ─────────────────────────────────────────────────────────────────

function tConvert(time: string): string {
  const m = time?.toString().match(/^([01]\d|2[0-3])(:)([0-5]\d)(:[0-5]\d)?$/)
  if (!m) return time ?? ''
  const parts = m.slice(1)
  const ampm = +parts[0] < 12 ? 'AM' : 'PM'
  const h = +parts[0] % 12 || 12
  return `${h}${parts[1]}${parts[2]} ${ampm}`
}

/** Angular PrintCalculateHeight — 90px per hour. */
function printHeight(startTime: string, endTime: string): number {
  const parseMins = (t: string) => {
    const mm = t?.trim().match(/(\d{1,2}):(\d{2})/)
    if (!mm) return 0
    let h = Number(mm[1])
    const min = Number(mm[2])
    if (/PM/i.test(t) && h < 12) h += 12
    if (/AM/i.test(t) && h === 12) h = 0
    return h * 60 + min
  }
  const dur = Math.max(0.25, (parseMins(endTime) - parseMins(startTime)) / 60)
  return Math.round(dur * 90)
}

function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ─── CSS (mirrors Angular view-timetable.component.scss print) ───────────────

const PRINT_CSS = `
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    background: #fff;
    color: #000;
    font-family: arial, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .filter-names {
    margin: 5px;
    font-size: large;
    font-family: 'Franklin Gothic Medium', 'Arial Narrow', Arial, sans-serif;
    text-align: center;
    display: flex;
    justify-content: center;
  }
  .days {
    display: flex;
    justify-content: center;
    flex-wrap: nowrap;
    width: 100%;
    margin-top: 8px;
  }
  .day-col {
    display: inline-table;
    border-collapse: collapse;
    font-size: 12px;
  }
  .day-col th,
  .day-col td {
    border: 1px solid #c5bec0;
    text-align: center;
    vertical-align: middle;
    font-family: arial, sans-serif;
  }
  .day-col th {
    background: #c3d9ff;
    font-weight: 500;
    font-size: 19px;
    text-transform: uppercase;
    padding: 15px 5px;
  }
  .day-col td {
    padding: 0;
  }
  .break {
    background: #efefef !important;
  }
  .sub-jct {
    font-weight: 500;
    font-size: 15px;
    text-transform: uppercase;
    margin: 0;
    padding: 0;
  }
  .stff {
    font-size: 10px;
    text-transform: uppercase;
    margin: 0;
    padding: 0;
  }
  .p-1 {
    display: grid;
    margin: 0;
    padding: 4px 2px;
    font-size: smaller;
  }
  p { margin: 0; padding: 0; }
  @page {
    size: A4 portrait;
    margin: 1cm;
  }
  @media print {
    html, body { background: #fff !important; }
    .day-col { page-break-inside: avoid; }
  }
`

// ─── HTML builder ────────────────────────────────────────────────────────────

function subBatchHtml(batch: TimetableSubBatch): string {
  const subject = batch.shortName || batch.subjectCode
  const batchPrefix =
    batch.studentBatchId && batch.studentBatchName
      ? `[${esc(batch.studentBatchName)}] `
      : ''
  return `
    <div>
      <p class="sub-jct">${batchPrefix}${subject ? esc(subject) : ''}</p>
      ${batch.staffName ? `<p class="stff">${esc(batch.staffName)}</p>` : ''}
      ${batch.roomName ? `<p class="stff">${esc(batch.roomName)}</p>` : ''}
    </div>`
}

function timingCellHtml(timing: TimetableDayTiming): string {
  const h = printHeight(timing.startTime, timing.endTime)
  // Angular print uses timing.color; React model stores colorCode
  const bg = timing.isBreak
    ? ''
    : timing.colorCode
      ? esc(timing.colorCode)
      : ''
  const timeStr = `(${tConvert(timing.startTime)} - ${tConvert(timing.endTime)})`
  const breakLabel =
    timing.isBreak && timing.classTimingName
      ? `<span>${esc(timing.classTimingName)}</span>`
      : ''
  const subBatches = timing.isBreak
    ? ''
    : (timing.subBatches ?? []).map(subBatchHtml).join('')

  return `
    <tr>
      <td class="${timing.isBreak ? 'break' : ''}"
          style="height:${h}px;${bg ? `background-color:${bg};` : ''}"
          ${timing.colspan > 1 ? `colspan="${timing.colspan}"` : ''}>
        ${subBatches}
        <p class="p-1">${breakLabel}${breakLabel ? ' ' : ''}${esc(timeStr)}</p>
      </td>
    </tr>`
}

function weekdayColHtml(weekday: TimetableDayColumn): string {
  const name = weekday.timings[0]?.weekdayName || weekday.weekdayName || ''
  const rows = (weekday.timings ?? []).map(timingCellHtml).join('')
  return `
    <table class="day-col">
      <thead>
        <tr><th>${esc(name)}</th></tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>`
}

export function buildTimetablePrintHtml(
  timetable: AngularStudentTimetable,
  headerLine: string,
): string {
  const cols = (timetable.weekdays ?? []).map(weekdayColHtml).join('')
  const body = `
    <p class="filter-names">${esc(headerLine)}</p>
    <div class="days">${cols}</div>`
  return `<!doctype html><html><head><meta charset="utf-8"><title>View Class Timetable</title><style>${PRINT_CSS}</style></head><body>${body}</body></html>`
}

// ─── print trigger ───────────────────────────────────────────────────────────

export function printClassTimetable(
  timetable: AngularStudentTimetable,
  headerLine: string,
): void {
  const html = buildTimetablePrintHtml(timetable, headerLine)

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

  setTimeout(() => {
    win.focus()
    win.print()
    setTimeout(cleanup, 1500)
  }, 150)
}
