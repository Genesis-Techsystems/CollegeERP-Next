/**
 * Group Wise Passed/Failed Result Sheets — iframe print.
 * Avoids AppShell blank-sheet issues from window.print() on the main document.
 * Angular parity: logo + college name header, then hall tickets in 4 columns.
 */

import { printHtmlInIframe } from "@/lib/print";

type AnyRow = Record<string, unknown>;

const DEFAULT_LOGO = "/assets/images/avatars/default_logo.png";

export type GroupWisePrintGroup = {
  groupCode: string;
  students: AnyRow[];
};

export type GroupWisePrintMeta = {
  title: string;
  examLabel?: string;
  courseGroupCode?: string;
  resultStatus: string;
  collegeName?: string;
  collegeLogo?: string;
  /** When true (Course Group = All), banner is `GROUP - Promoted (n)`. */
  includeGroupCode?: boolean;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function hallTicket(row: AnyRow): string {
  for (const key of [
    "hallticket_number",
    "hall_ticketno",
    "hallTicketNumber",
  ]) {
    const v = row?.[key];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return "";
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
  .header-row {
    display: flex;
    align-items: flex-start;
    width: 100%;
    margin-bottom: 8px;
  }
  .logo-col {
    width: 15%;
    flex: 0 0 15%;
    padding-right: 10px;
  }
  .logo-col img {
    max-width: 100%;
    max-height: 90px;
    width: auto;
    height: auto;
    display: block;
    object-fit: contain;
  }
  .title-col {
    width: 85%;
    flex: 1 1 85%;
    text-align: center;
    padding-top: 4px;
  }
  .college-name {
    text-align: center;
    font-size: 28px;
    font-weight: 700;
    margin: 12px 0 4px;
    color: #000;
  }
  .title {
    text-align: center;
    font-size: 23px;
    font-weight: 600;
    margin: 4px 0;
    color: #000;
  }
  .details {
    text-align: center;
    font-size: 18px;
    margin: 4px 0 16px;
    color: #000;
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
`;

function chunkTickets(tickets: string[], size = 4): string[][] {
  const rows: string[][] = [];
  for (let i = 0; i < tickets.length; i += size) {
    rows.push(tickets.slice(i, i + size));
  }
  return rows;
}

function buildDocument(
  groups: GroupWisePrintGroup[],
  meta: GroupWisePrintMeta,
): string {
  const title = escapeHtml(meta.title);
  const exam = escapeHtml(meta.examLabel ?? "");
  const courseGroup = escapeHtml(meta.courseGroupCode ?? "");
  const status = escapeHtml(meta.resultStatus);
  const collegeName = escapeHtml(meta.collegeName ?? "");
  const logoSrc = escapeHtml(meta.collegeLogo || DEFAULT_LOGO);

  const groupsHtml = groups
    .map((group) => {
      const tickets = group.students.map(hallTicket).filter(Boolean);
      const rows = chunkTickets(tickets)
        .map(
          (row) =>
            `<tr>${row
              .map((t) => `<td>${escapeHtml(t)}</td>`)
              .concat(Array(Math.max(0, 4 - row.length)).fill("<td></td>"))
              .join("")}</tr>`,
        )
        .join("");
      const banner =
        meta.includeGroupCode && group.groupCode
          ? `${escapeHtml(group.groupCode)} - ${status} (${tickets.length})`
          : `${status} (${tickets.length})`;
      return `
        <p class="group-head">${banner}</p>
        <hr />
        <table class="tickets" cellspacing="0" cellpadding="0">${rows}</table>
        <hr />
      `;
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
    <div class="header-row">
      <div class="logo-col"><img src="${logoSrc}" alt="College Logo" /></div>
      <div class="title-col">
        ${collegeName ? `<p class="college-name">${collegeName}</p>` : ""}
        <p class="title">${title}</p>
        ${exam ? `<p class="details">${exam}</p>` : ""}
      </div>
    </div>
    ${courseGroup ? `<p class="course-line">Course : ${courseGroup}</p>` : ""}
    ${groupsHtml}
  </div>
</body>
</html>`;
}

export function printGroupWiseResultSheets(
  groups: GroupWisePrintGroup[],
  meta: GroupWisePrintMeta,
): void {
  if (!groups.length) return;
  printHtmlInIframe(buildDocument(groups, meta));
}
