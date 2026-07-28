/**
 * Student Backlog Data — iframe print (avoids AppShell blank pages).
 */

type AnyRow = Record<string, unknown>;

export type BacklogStudentRow = AnyRow[];

export type BacklogPrintMeta = {
  title?: string;
  collegeName?: string;
  logoUrl?: string;
  courseYearCodes: string[];
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cell(row: AnyRow | undefined, keys: string[]): string {
  if (!row) return "";
  for (const key of keys) {
    const v = row?.[key];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return "";
}

function findMarks(
  list: AnyRow[],
  courseYearCode: string,
  field: string,
): string {
  const item = list.find(
    (x) => String(x?.course_year_code ?? "") === courseYearCode,
  );
  if (!item) return "-";
  const v = item[field];
  return v == null || String(v).trim() === "" ? "-" : String(v);
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
  .wrap {
    width: 98%;
    margin: 0 auto;
    padding: 0;
  }
  .print-header-container {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    width: 100%;
    gap: 20px;
    margin: 0 0 8px;
    padding: 0;
  }
  .logo-container {
    width: 140px;
    text-align: left;
    flex: 0 0 140px;
  }
  .portrait-logo {
    width: 120px;
    height: auto;
    margin: 0;
    display: block;
    object-fit: contain;
  }
  .text-section {
    flex: 1;
    text-align: center;
    margin: 0;
  }
  .college-name {
    font-size: 24px;
    font-weight: 700;
    margin: 0;
    text-transform: uppercase;
    color: #000;
  }
  .title {
    font-size: 18px;
    font-weight: 600;
    margin: 2px 0 0;
    color: #000;
  }
  table.data {
    width: 100%;
    border-collapse: collapse;
    margin-top: 6px;
    font-family: "Times New Roman", serif;
  }
  table.data th,
  table.data td {
    border: 1px solid #000;
    padding: 3px;
    font-size: 10px;
    text-align: left;
    vertical-align: middle;
  }
  table.data th {
    background: #f2f2f2;
    font-weight: 700;
    text-align: center;
  }
  table.data td.center { text-align: center; }
  table.data td:nth-child(2),
  table.data td:nth-child(3) {
    padding-left: 10px;
    padding-right: 10px;
  }
  @page { margin: 6mm 8mm 10mm 8mm; }
  @media print {
    html, body { background: #fff !important; }
    tr { page-break-inside: avoid; }
  }
`;

function buildDocument(
  rows: BacklogStudentRow[],
  meta: BacklogPrintMeta,
): string {
  const title = escapeHtml(meta.title ?? "Student Backlog Data");
  const college = escapeHtml(meta.collegeName ?? "");
  const logoUrl = escapeHtml(
    meta.logoUrl ?? "/assets/images/avatars/default_logo.png",
  );
  const codes = meta.courseYearCodes;

  const semesterHeads = codes
    .map((c) => `<th colspan="2">${escapeHtml(c)}</th>`)
    .join("");
  const semesterSubHeads = codes
    .map(() => `<th>Count</th><th>Subjects</th>`)
    .join("");

  const body = rows
    .map((list, i) => {
      const first = list[0] ?? {};
      const ht = escapeHtml(
        cell(first, ["hallticket_number", "hall_ticketno"]),
      );
      const group = escapeHtml(cell(first, ["group_code", "groupCode"]));
      const total = escapeHtml(cell(first, ["total_failed_count"]));
      const semCells = codes
        .map((code) => {
          const count = escapeHtml(
            findMarks(list, code, "semester_failed_count"),
          );
          const subjects = escapeHtml(findMarks(list, code, "failed_subjects"));
          return `<td class="center">${count}</td><td>${subjects}</td>`;
        })
        .join("");
      return `<tr>
        <td class="center">${i + 1}</td>
        <td>${ht}</td>
        <td>${group}</td>
        ${semCells}
        <td class="center">${total || "-"}</td>
      </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>${PRINT_CSS}</style>
</head>
<body>
  <div class="wrap">
    <div class="print-header-container">
      <div class="logo-container">
        <img class="portrait-logo" src="${logoUrl}" alt="" />
      </div>
      <div class="text-section">
        ${college ? `<p class="college-name">${college}</p>` : ""}
        <p class="title">${title}</p>
      </div>
    </div>
    <table class="data" cellspacing="0" cellpadding="0">
      <thead>
        <tr>
          <th rowspan="2">S.No</th>
          <th rowspan="2">Hall Ticket No</th>
          <th rowspan="2">Group Code</th>
          ${semesterHeads}
          <th rowspan="2">Total Failed</th>
        </tr>
        <tr>${semesterSubHeads}</tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
  </div>
</body>
</html>`;
}

function printHtmlInIframe(html: string): void {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
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

  const cleanup = () => frame.remove();
  win.addEventListener("afterprint", cleanup);

  setTimeout(() => {
    win.focus();
    win.print();
    setTimeout(cleanup, 1500);
  }, 300);
}

export function printStudentBacklogReport(
  rows: BacklogStudentRow[],
  meta: BacklogPrintMeta,
): void {
  if (!rows.length) return;
  printHtmlInIframe(buildDocument(rows, meta));
}
