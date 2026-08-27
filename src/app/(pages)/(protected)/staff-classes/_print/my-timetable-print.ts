/**
 * Angular `staff-classes/my-timetable` print — iframe HTML so AppShell
 * `@media print` does not blank the preview.
 */

import {
  tConvert,
  type MyTimetableSchedule,
  type MyTimetableTiming,
} from "@/services";

function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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
  .print-wrap {
    padding: 12px 16px;
  }
  .college {
    text-align: center;
    font-size: 23px;
    margin: 0 0 4px;
    color: #000;
  }
  .title {
    text-align: center;
    font-size: 20px;
    margin: 0 0 8px;
    color: #000;
  }
  .emp {
    text-align: right;
    font-size: 18px;
    margin: 0 0 8px;
    color: #000;
  }
  table.week {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid #000;
    table-layout: auto;
  }
  table.week th,
  table.week td {
    border: 1px solid #000;
    background: #fff !important;
    color: #000;
    vertical-align: top;
    text-align: left;
    padding: 8px 6px;
  }
  table.week th {
    font-weight: 500;
    text-transform: uppercase;
    white-space: nowrap;
    width: 52px;
  }
  .batch { margin: 0 0 6px; }
  .batch:last-child { margin-bottom: 0; }
  .sub {
    font-weight: 500;
    font-size: 15px;
    margin: 0;
    color: #000;
  }
  .meta {
    font-size: 10px;
    margin: 2px 0 0;
    color: #000;
  }
  .time {
    font-size: 12px;
    font-weight: 600;
    margin: 2px 0 0;
    color: blue !important;
  }
  .break-label {
    font-size: 13px;
    margin: 0;
  }
  @page {
    size: A4 portrait;
    margin: 10mm;
  }
`;

function cellHtml(timing: MyTimetableTiming): string {
  const colspan = Math.max(1, Number(timing.colspan ?? 1) || 1);
  const subBatches = Array.isArray(timing.subBatches) ? timing.subBatches : [];
  const resources = Array.isArray(timing.subjectResource)
    ? timing.subjectResource
    : [];

  let inner = "";
  if (subBatches.length > 0) {
    inner = subBatches
      .map((batch) => {
        const batchPrefix =
          batch.studentBatchId != null
            ? `[${esc(batch.studentBatchName ?? "")}] `
            : "";
        const subjectLine =
          batch.shortName != null
            ? `${esc(batch.subjectName ?? "")} - ${esc(batch.shortName)}`
            : `${esc(batch.subjectName ?? "")} - ${esc(batch.subjectCode ?? "")}`;
        const meta = `${esc(timing.collegeCode ?? "")} / ${esc(timing.academicYearName ?? "")} / ${esc(timing.courseName ?? "")} / ${esc(timing.groupName ?? "")} / ${esc(timing.courseYearName ?? "")} / Section - ${esc(timing.groupSectionName ?? "")}`;
        const time = `${esc(tConvert(timing.startTime))} - ${esc(tConvert(timing.endTime))}`;
        return `<div class="batch">
          <p class="sub">${batchPrefix}${subjectLine}</p>
          <p class="meta">${meta}</p>
          <p class="time">${time}</p>
        </div>`;
      })
      .join("");
  } else if (resources.length === 0) {
    inner = `<p class="break-label">${esc(timing.classTimingName ?? "")}</p>`;
  }

  return `<td colspan="${colspan}">${inner}</td>`;
}

export function buildStaffMyTimetablePrintHtml(params: {
  collegeName: string;
  employeeName: string;
  schedule: MyTimetableSchedule;
}): string {
  const rows = (params.schedule.weekdays ?? [])
    .map((weekday) => {
      const cells = (weekday.timings ?? []).map(cellHtml).join("");
      return `<tr><th>${esc(weekday.weekdayName)}</th>${cells}</tr>`;
    })
    .join("");

  const body = `
    <div class="print-wrap">
      <p class="college">${esc(params.collegeName)}</p>
      <p class="title">Employee Week Timetable</p>
      <p class="emp">Employee: ${esc(params.employeeName)}</p>
      <table class="week">
        <tbody>${rows}</tbody>
      </table>
    </div>`;

  const docTitle = params.collegeName
    ? `${params.collegeName} - Employee Week Timetable`
    : "Employee Week Timetable";

  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(docTitle)}</title><style>${PRINT_CSS}</style></head><body>${body}</body></html>`;
}

export function printStaffMyTimetable(params: {
  collegeName: string;
  employeeName: string;
  schedule: MyTimetableSchedule;
}): void {
  if (typeof document === "undefined") return;
  if (!params.schedule.weekdays?.length) return;

  const html = buildStaffMyTimetablePrintHtml(params);
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  // Size to page so table lays out at print width (0×0 iframes shrink-wrap).
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
