/**
 * Batch Wise Detention Report — iframe print (avoids AppShell blank pages).
 * Header matches Angular: logo left + college name + title centered.
 */

type AnyRow = Record<string, unknown>;

export type DetentionPrintMeta = {
  title?: string;
  collegeName?: string;
  logoUrl?: string;
};

const DEFAULT_LOGO = "/assets/images/avatars/default_logo.png";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Relative `/assets/...` paths fail inside about:blank iframes — make absolute. */
function toAbsoluteLogoUrl(url: string): string {
  if (/^(https?:\/\/|data:|blob:)/i.test(url)) return url;
  if (typeof globalThis.location?.origin === "string") {
    return `${globalThis.location.origin}${url.startsWith("/") ? "" : "/"}${url}`;
  }
  return url;
}

function cell(row: AnyRow, keys: string[]): string {
  for (const key of keys) {
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
  .wrap { padding: 12px 16px; width: 98%; }
  .print-header {
    width: 100%;
    margin: 0 0 24px;
  }
  .header-row {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    width: 100%;
    gap: 16px;
  }
  .portrait-logo {
    width: 140px;
    height: auto;
    margin: 0;
    display: block;
    object-fit: contain;
  }
  .header-text {
    flex: 1;
    text-align: center;
  }
  .college-name {
    text-align: center;
    font-size: 24px;
    font-weight: 600;
    margin: 0;
    text-transform: uppercase;
    color: #000;
  }
  .title {
    text-align: center;
    font-size: 18px;
    font-weight: 600;
    margin: 2px 0 0;
    color: #000;
  }
  table.data {
    width: 100%;
    border-collapse: collapse;
  }
  table.data th,
  table.data td {
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
`;

function buildDocument(rows: AnyRow[], meta: DetentionPrintMeta): string {
  const title = escapeHtml(meta.title ?? "Detention Report");
  const college = meta.collegeName ? escapeHtml(meta.collegeName) : "";
  const logoUrl = escapeHtml(toAbsoluteLogoUrl(meta.logoUrl || DEFAULT_LOGO));

  const body = rows
    .map((r, i) => {
      const ht = escapeHtml(cell(r, ["hallticket_number", "hall_ticketno"]));
      const name = escapeHtml(cell(r, ["student_name", "studentName"]));
      const group = escapeHtml(cell(r, ["group_code", "groupCode"]));
      const year = escapeHtml(cell(r, ["course_year_code", "courseYearCode"]));
      const batch = escapeHtml(cell(r, ["batch_name", "batchName"]));
      return `<tr>
        <td class="center">${i + 1}</td>
        <td>${ht}</td>
        <td>${name}</td>
        <td>${group}</td>
        <td>${year}</td>
        <td>${batch}</td>
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
    <div class="print-header">
      <div class="header-row">
        <img class="portrait-logo" src="${logoUrl}" alt="" />
        <div class="header-text">
          ${college ? `<p class="college-name">${college}</p>` : ""}
          <p class="title">${title}</p>
        </div>
      </div>
    </div>
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

  const printFrame = () => {
    try {
      win.focus();
      win.print();
    } finally {
      setTimeout(() => {
        if (frame.parentNode) frame.remove();
      }, 1500);
    }
  };

  const waitForImagesThenPrint = () => {
    const imgs = Array.from(fdoc.images ?? []);
    if (imgs.length === 0) {
      setTimeout(printFrame, 250);
      return;
    }
    let remaining = imgs.length;
    let printed = false;
    const finish = () => {
      if (printed) return;
      remaining -= 1;
      if (remaining <= 0) {
        printed = true;
        setTimeout(printFrame, 100);
      }
    };
    for (const img of imgs) {
      if (img.complete) finish();
      else {
        img.addEventListener("load", finish, { once: true });
        img.addEventListener("error", finish, { once: true });
      }
    }
    setTimeout(() => {
      if (!printed) {
        printed = true;
        printFrame();
      }
    }, 3000);
  };

  if (win.document.readyState === "complete") {
    waitForImagesThenPrint();
  } else {
    frame.onload = () => waitForImagesThenPrint();
  }
}

export function printDetentionReport(
  rows: AnyRow[],
  meta: DetentionPrintMeta = {},
): void {
  if (!rows.length) return;
  printHtmlInIframe(buildDocument(rows, meta));
}
