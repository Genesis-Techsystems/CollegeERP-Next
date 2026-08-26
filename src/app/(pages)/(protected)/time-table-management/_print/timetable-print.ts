/**
 * Angular parity: view-timetable printPage() — iframe print of #table2.
 * Portrait A4, full-width black-border grid, no cell/header fills
 * (Angular relies on Chrome "Background graphics" off).
 */

import type {
  AngularStudentTimetable,
  TimetableDayColumn,
  TimetableDayTiming,
  TimetableSubBatch,
} from "@/services";

// ─── helpers ─────────────────────────────────────────────────────────────────

function tConvert(time: string): string {
  const m = time?.toString().match(/^([01]\d|2[0-3])(:)([0-5]\d)(:[0-5]\d)?$/);
  if (!m) return time ?? "";
  const parts = m.slice(1);
  const ampm = +parts[0] < 12 ? "AM" : "PM";
  const h = +parts[0] % 12 || 12;
  return `${h}${parts[1]}${parts[2]} ${ampm}`;
}

/** Angular PrintCalculateHeight — 90px per hour. */
function printHeight(startTime: string, endTime: string): number {
  const parseMins = (t: string) => {
    const mm = t?.trim().match(/(\d{1,2}):(\d{2})/);
    if (!mm) return 0;
    let h = Number(mm[1]);
    const min = Number(mm[2]);
    if (/PM/i.test(t) && h < 12) h += 12;
    if (/AM/i.test(t) && h === 12) h = 0;
    return h * 60 + min;
  };
  const dur = Math.max(0.25, (parseMins(endTime) - parseMins(startTime)) / 60);
  return Math.round(dur * 90);
}

function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function titleCaseDay(name: string): string {
  const s = name.trim();
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

// ─── CSS (mirrors Angular #table2 print, without forced background colors) ───

const PRINT_CSS = `
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    width: 100%;
    background: #fff;
    color: #000;
    font-family: arial, sans-serif;
  }
  .filter-names {
    margin: 5px 0 8px 0;
    font-size: large;
    font-family: 'Franklin Gothic Medium', 'Arial Narrow', Arial, sans-serif;
    font-weight: 600;
    text-align: left;
  }
  #table2 {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-family: arial, sans-serif;
    font-size: 12px;
  }
  #table2 th,
  #table2 td {
    border: 1px solid #000;
    text-align: center;
    vertical-align: middle;
    background: #fff;
  }
  #table2 th {
    font-weight: 500;
    font-size: 19px;
    padding: 8px 5px;
    text-transform: none;
  }
  #table2 td {
    padding: 8px 4px;
  }
  .sub-jct {
  height: 100%;
    font-weight: 500;
    font-size: 15px;
    margin: 0;
    padding: 0;
  }
  .stff {
    font-size: 10px;
    margin: 0;
    padding: 0;
  }
  .p-1 {
    display: grid;
    margin: 0;
    padding: 4px 2px 0;
    font-size: smaller;
  }
  p { margin: 0; padding: 0; }
  @page {
    size: A4 portrait;
    margin: 12mm;
  }
`;

// ─── HTML builder ────────────────────────────────────────────────────────────

function subBatchHtml(batch: TimetableSubBatch): string {
  const subject = batch.subjectCode || batch.shortName;
  const batchPrefix =
    batch.studentBatchId && batch.studentBatchName
      ? `[${esc(batch.studentBatchName)}] `
      : "";
  return `
    <div>
      <p class="sub-jct">${batchPrefix}${subject ? esc(subject) : ""}</p>
      ${batch.staffName ? `<p class="stff">${esc(batch.staffName)}</p>` : ""}
      ${batch.roomName ? `<p class="stff">${esc(batch.roomName)}</p>` : ""}
    </div>`;
}

function timingCellHtml(timing: TimetableDayTiming): string {
  const h = printHeight(timing.startTime, timing.endTime);
  const timeStr = `(${tConvert(timing.startTime)} - ${tConvert(timing.endTime)})`;
  const breakLabel =
    timing.isBreak && timing.classTimingName
      ? `<span>${esc(timing.classTimingName)}</span>`
      : "";
  const subBatches = timing.isBreak
    ? ""
    : (timing.subBatches ?? []).map(subBatchHtml).join("");

  return `
    <td style="height:${h}px">
      ${subBatches}
      <p class="p-1">${breakLabel}${breakLabel ? " " : ""}${esc(timeStr)}</p>
    </td>`;
}

function weekdayHeaders(weekdays: TimetableDayColumn[]): string {
  return weekdays
    .map((day) => {
      const name = day.timings[0]?.weekdayName || day.weekdayName || "";
      return `<th>${esc(titleCaseDay(name))}</th>`;
    })
    .join("");
}

function gridRows(weekdays: TimetableDayColumn[]): string {
  const rowCount = Math.max(0, ...weekdays.map((d) => d.timings?.length ?? 0));
  const rows: string[] = [];
  for (let i = 0; i < rowCount; i++) {
    const cells = weekdays
      .map((day) => {
        const timing = day.timings?.[i];
        return timing ? timingCellHtml(timing) : "<td></td>";
      })
      .join("");
    rows.push(`<tr>${cells}</tr>`);
  }
  return rows.join("");
}

export function buildTimetablePrintHtml(
  timetable: AngularStudentTimetable,
  headerLine: string,
): string {
  const weekdays = timetable.weekdays ?? [];
  const body = `
    <p class="filter-names">${esc(headerLine)}</p>
    <table id="table2">
      <thead>
        <tr>${weekdayHeaders(weekdays)}</tr>
      </thead>
      <tbody>
        ${gridRows(weekdays)}
      </tbody>
    </table>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>View Class Timetable</title><style>${PRINT_CSS}</style></head><body>${body}</body></html>`;
}

// ─── print trigger ───────────────────────────────────────────────────────────

export function printClassTimetable(
  timetable: AngularStudentTimetable,
  headerLine: string,
): void {
  const html = buildTimetablePrintHtml(timetable, headerLine);

  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  // Size to A4 so the table lays out at page width (0×0 iframes shrink-wrap).
  frame.style.cssText =
    "position:fixed;left:0;top:0;width:210mm;height:297mm;border:0;opacity:0;pointer-events:none;";
  document.body.appendChild(frame);

  const fdoc = frame.contentDocument;
  const win = frame.contentWindow;
  if (!fdoc || !win) {
    frame.remove();
    return;
  }

  fdoc.open();
  fdoc.write(html);
  fdoc.close();

  const cleanup = () => {
    if (frame.parentNode) frame.remove();
  };
  win.addEventListener("afterprint", cleanup);

  setTimeout(() => {
    win.focus();
    win.print();
    setTimeout(cleanup, 1500);
  }, 150);
}
