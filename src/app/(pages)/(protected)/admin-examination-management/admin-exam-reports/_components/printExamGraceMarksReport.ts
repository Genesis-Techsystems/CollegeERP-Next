import { printHtmlInIframe } from "@/lib/print";

type AnyRow = Record<string, unknown>;

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

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Angular: int_marks + ext_grace_total */
function totalMarks(row: AnyRow): number {
  return num(row.int_marks) + num(row.ext_grace_total);
}

const PRINT_CSS = `
  * { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0; background: #fff; color: #000;
    font-family: Arial, Helvetica, sans-serif;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .wrap { width: 100%; padding: 8px 12px 12px; }
  .header-row { display: flex; align-items: flex-start; width: 100%; margin-bottom: 4px; }
  .logo-col { width: 12%; flex: 0 0 12%; padding-right: 8px; }
  .logo-col img { max-width: 100%; height: auto; display: block; }
  .title-col { width: 88%; flex: 1 1 88%; text-align: center; padding-top: 4px; }
  .collegeName {
    text-align: center; font-size: 26px; font-weight: 550;
    margin: 20px 0 -10px; color: #000;
  }
  .title {
    text-align: center; font-size: 23px; font-weight: 550;
    margin: 0 0 4px; color: #000;
  }
  .details {
    text-align: center; font-size: 19px; margin: 0 0 8px; color: #000;
  }
  .meta { display: flex; justify-content: space-between; width: 100%; margin: 0 0 8px; font-size: 13px; color: #000; }
  .meta p { margin: 0; }
  table.mar {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid #333;
  }
  th.table-th, td.table-td {
    border: 1px solid #333;
  }
  th.table-th {
    padding: 8px 5px; background: #c3d9ff; font-weight: 550; text-align: left;
  }
  td.table-td {
    padding: 5px 8px; text-align: left; font-weight: 400;
    vertical-align: top; word-break: break-word;
  }
  td.center { text-align: center !important; }
  tr { break-inside: avoid; page-break-inside: avoid; }
  thead { display: table-header-group; }
  @page { margin: 10mm; }
`;

export function printExamGraceMarksReport(args: {
  collegeName: string;
  collegeLogo: string;
  examLabel: string;
  courseGroupCode: string;
  courseYearCode: string;
  rows: AnyRow[];
}): void {
  const bodyRows = args.rows
    .map((r, i) => {
      return `<tr>
        <td class="table-td center">${i + 1}</td>
        <td class="table-td">${escapeHtml(txt(r.hallticket_number) || "—")}</td>
        <td class="table-td">${escapeHtml(txt(r.course_year_code) || "—")}</td>
        <td class="table-td">${escapeHtml(txt(r.subject_name) || "—")}</td>
        <td class="table-td center">${escapeHtml(txt(r.int_marks) || "—")}</td>
        <td class="table-td center">${escapeHtml(txt(r.ext_marks) || "—")}</td>
        <td class="table-td center">${escapeHtml(txt(r.grace_marks_added) || "—")}</td>
        <td class="table-td center">${escapeHtml(txt(r.ext_grace_total) || "—")}</td>
        <td class="table-td center">${totalMarks(r)}</td>
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
  <title>Grace Marks Report</title>
  <style>${PRINT_CSS}</style>
</head>
<body>
  <div class="wrap">
    <div class="header-row">
      <div class="logo-col"><img src="${escapeHtml(logoSrc)}" alt="" /></div>
      <div class="title-col">
        ${args.collegeName ? `<p class="collegeName">${escapeHtml(args.collegeName)}</p>` : ""}
        <p class="title">Grace Marks Report</p>
        ${args.examLabel ? `<p class="details">${escapeHtml(args.examLabel)}</p>` : ""}
      </div>
    </div>
    ${metaParts.length ? `<div class="meta">${metaParts.join("")}</div>` : ""}
    <table class="mar">
      <thead>
        <tr>
          <th class="table-th">S.No</th>
          <th class="table-th">Hall Ticket No</th>
          <th class="table-th">Semester</th>
          <th class="table-th">Subject Name</th>
          <th class="table-th">Internal Marks</th>
          <th class="table-th">External Marks</th>
          <th class="table-th">Grace Marks</th>
          <th class="table-th">Final External Marks</th>
          <th class="table-th">Total Marks</th>
        </tr>
      </thead>
      <tbody>${bodyRows}</tbody>
    </table>
  </div>
</body>
</html>`;

  printHtmlInIframe(html);
}
