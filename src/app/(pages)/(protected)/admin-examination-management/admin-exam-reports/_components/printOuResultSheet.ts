/**
 * OU Result Report — iframe print (avoids AppShell blank pages).
 */

type AnyRow = Record<string, unknown>;

export type OuResultSheetPrintMeta = {
  title?: string;
  collegeName?: string;
  filterSummary?: string;
  columns: string[];
};

function escapeHtml(value: string): string {
  return value
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
    background: #fff;
    color: #000;
    font-family: Arial, Helvetica, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .wrap { padding: 12px 16px; width: 98%; }
  .college-name {
    text-align: center;
    font-size: 22px;
    font-weight: 700;
    margin: 8px 0 2px;
  }
  .title {
    text-align: center;
    font-size: 18px;
    font-weight: 600;
    margin: 4px 0 8px;
  }
  .details {
    text-align: center;
    font-size: 13px;
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
  @page { margin: 10mm; }
`;

export function printOuResultSheet(
  rows: AnyRow[],
  meta: OuResultSheetPrintMeta,
): void {
  if (rows.length === 0 || meta.columns.length === 0) return;

  const title = meta.title ?? "OU Result Report";
  const header = [
    "<th>S.No</th>",
    ...meta.columns.map((col) => `<th>${escapeHtml(col)}</th>`),
  ].join("");
  const body = rows
    .map((row, i) => {
      const cells = meta.columns
        .map((col) => `<td>${escapeHtml(String(row[col] ?? ""))}</td>`)
        .join("");
      return `<tr><td>${i + 1}</td>${cells}</tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${escapeHtml(title)}</title><style>${PRINT_CSS}</style></head><body>
    <div class="wrap">
      ${meta.collegeName ? `<p class="college-name">${escapeHtml(meta.collegeName)}</p>` : ""}
      <p class="title">${escapeHtml(title)}</p>
      ${meta.filterSummary ? `<p class="details">${escapeHtml(meta.filterSummary)}</p>` : ""}
      <table class="data"><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>
    </div>
  </body></html>`;

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!doc) {
    iframe.remove();
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  iframe.contentWindow?.focus();
  setTimeout(() => {
    iframe.contentWindow?.print();
    setTimeout(() => iframe.remove(), 500);
  }, 250);
}
