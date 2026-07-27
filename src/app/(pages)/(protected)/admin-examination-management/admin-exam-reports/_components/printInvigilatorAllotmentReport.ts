import { printHtmlInIframe } from "@/lib/print";

type AnyRow = Record<string, unknown>;

const REPORT_TITLE = "Invigilator Allotment Report";

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
  .wrap { width: 100%; padding: 8px 12px 12px; }
  .header-row {
    display: flex;
    align-items: flex-start;
    width: 100%;
    margin-bottom: 4px;
  }
  .logo-col {
    width: 15%;
    flex: 0 0 15%;
    padding-right: 8px;
  }
  .logo-col img {
    max-width: 100%;
    height: auto;
    display: block;
  }
  .title-col {
    width: 85%;
    flex: 1 1 85%;
    text-align: center;
    padding-top: 8px;
  }
  .collegeName {
    text-align: center;
    font-size: 23px;
    font-weight: 550;
    margin: 0 0 2px;
    color: #000;
  }
  .title {
    text-align: center;
    font-size: 20px;
    font-weight: 550;
    margin: 0 0 8px;
    color: #000;
  }
  .meta {
    display: flex;
    justify-content: space-between;
    width: 100%;
    margin: 0 0 8px;
    color: #000;
    font-size: 13px;
  }
  .meta p { margin: 0; }
  table.mar {
    width: 100%;
    border-collapse: separate;
    border-spacing: 1px;
  }
  th.table-th {
    padding: 5px;
    background: #c3d9ff;
    font-weight: 500;
    text-align: left;
  }
  td.table-td {
    padding: 8px;
    text-align: left;
    font-weight: 400;
    vertical-align: top;
    word-break: break-word;
  }
  td.sno { text-align: center !important; }
  .inv-type { color: #0000ff; }
  tr { break-inside: avoid; page-break-inside: avoid; }
  thead { display: table-header-group; }
  @page { margin: 10mm; }
`;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function txt(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

function parseMaybeDate(v: unknown): string {
  const s = txt(v);
  if (!s) return "";
  try {
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      const d = new Date(s.slice(0, 10) + "T00:00:00");
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
    return new Date(s).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return s;
  }
}

function tConvert(time: unknown): string {
  const s = txt(time).trim();
  if (!s) return "";
  const m = s.match(/^([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/);
  if (!m) return s;
  let h = Number(m[1]);
  const min = m[2];
  const ampm = h < 12 ? "AM" : "PM";
  h = h % 12 || 12;
  return `${h}:${min} ${ampm}`;
}

export function printInvigilatorAllotmentReport(args: {
  collegeName: string;
  collegeLogo: string;
  courseGroupCode: string;
  courseYearCode: string;
  rows: AnyRow[];
}): void {
  const bodyRows = args.rows
    .map((r, i) => {
      const name = txt(r.invigilator_name ?? r.invigilatorName);
      const type = txt(r.invigilator_type ?? r.invigilatorType);
      const inv = type
        ? `${escapeHtml(name)} <span class="inv-type">(${escapeHtml(type)})</span>`
        : escapeHtml(name);
      const start = tConvert(r.session_start_time ?? r.sessionStartTime);
      const end = tConvert(r.session_end_time ?? r.sessionEndTime);
      const timings = start && end ? `${start} - ${end}` : start || end;
      return `<tr>
        <td class="table-td sno">${i + 1}</td>
        <td class="table-td">${inv || "—"}</td>
        <td class="table-td">${escapeHtml(txt(r.exam_name ?? r.examName) || "—")}</td>
        <td class="table-td">${escapeHtml(parseMaybeDate(r.exam_date ?? r.examDate) || "—")}</td>
        <td class="table-td">${escapeHtml(txt(r.exam_session_name ?? r.session_name ?? r.examSessionName) || "—")}</td>
        <td class="table-td">${escapeHtml(timings || "—")}</td>
        <td class="table-td">${escapeHtml(txt(r.search_String ?? r.search_string ?? r.room_details) || "—")}</td>
      </tr>`;
    })
    .join("");

  const logoSrc = args.collegeLogo || "/assets/images/avatars/default_logo.png";
  const metaParts: string[] = [];
  if (args.courseGroupCode) {
    metaParts.push(
      `<p style="width:50%;text-align:left">Course : ${escapeHtml(args.courseGroupCode)}</p>`,
    );
  }
  if (args.courseYearCode) {
    metaParts.push(
      `<p style="width:50%;text-align:right">Semester : ${escapeHtml(args.courseYearCode)}</p>`,
    );
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(REPORT_TITLE)}</title>
  <style>${PRINT_CSS}</style>
</head>
<body>
  <div class="wrap">
    <div class="header-row">
      <div class="logo-col">
        <img src="${escapeHtml(logoSrc)}" alt="" />
      </div>
      <div class="title-col">
        ${args.collegeName ? `<p class="collegeName">${escapeHtml(args.collegeName)}</p>` : ""}
        <p class="title">${escapeHtml(REPORT_TITLE)}</p>
      </div>
    </div>
    ${metaParts.length ? `<div class="meta">${metaParts.join("")}</div>` : ""}
    <table class="mar">
      <thead>
        <tr>
          <th class="table-th">S.No</th>
          <th class="table-th">Invigilator</th>
          <th class="table-th">Exam</th>
          <th class="table-th">Exam Date</th>
          <th class="table-th">Session</th>
          <th class="table-th">Exam Timings</th>
          <th class="table-th">Room Details</th>
        </tr>
      </thead>
      <tbody>${bodyRows}</tbody>
    </table>
  </div>
</body>
</html>`;

  printHtmlInIframe(html);
}
