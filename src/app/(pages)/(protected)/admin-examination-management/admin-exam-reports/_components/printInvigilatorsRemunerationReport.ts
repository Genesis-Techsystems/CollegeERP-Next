/**
 * Invigilator Remuneration Report — iframe print (avoids AppShell blank pages).
 */

import { MINIO_URL } from "@/config/constants/api";

type AnyRow = Record<string, unknown>;

export type InvigilatorsRemunerationPrintMeta = {
  title?: string;
  collegeName?: string;
  collegeLogo?: string;
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

function logoUrl(path: string | undefined): string {
  const raw = String(path ?? "").trim();
  if (!raw) return "/assets/images/avatars/default_logo.png";
  if (
    /^(?:https?:)?\/\//i.test(raw) ||
    raw.startsWith("data:") ||
    raw.startsWith("/assets/")
  ) {
    return raw;
  }
  const base = MINIO_URL.replace(/\/$/, "");
  return `${base}${raw.startsWith("/") ? raw : `/${raw}`}`;
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
  .wrap { padding: 0; width: 98%; }
  .report-header {
    display: flex;
    width: 100%;
    align-items: center;
    page-break-after: avoid;
    page-break-inside: avoid;
  }
  .logo-column {
    flex: 0 0 15%;
    padding: 4px;
    text-align: center;
  }
  .logo-column img {
    display: inline-block;
    width: 90px;
    height: 90px;
    object-fit: contain;
  }
  .heading-column {
    flex: 0 0 85%;
    text-align: center;
  }
  .college-name {
    text-align: center;
    font-size: 24px;
    font-weight: 550;
    margin: 10px 0 0;
  }
  .title {
    text-align: center;
    font-size: 21px;
    font-weight: 550;
    margin: 4px 0;
  }
  .details {
    text-align: center;
    font-size: 16px;
    margin: 0 0 10px;
  }
  table.data {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
    font-family: "Times New Roman", Times, serif;
    font-size: 12px;
  }
  table.data th,
  table.data td {
    border: 1px solid #000;
    padding: 4px;
    text-align: center;
    vertical-align: middle;
  }
  table.data th {
    background: #fff;
    font-weight: 600;
  }
  @page { margin: 10mm; }
`;

export function printInvigilatorsRemunerationReport(
  rows: AnyRow[],
  meta: InvigilatorsRemunerationPrintMeta,
): void {
  if (rows.length === 0 || meta.columns.length === 0) return;

  const title = meta.title ?? "Invigilator Remuneration Report";
  const logo = logoUrl(meta.collegeLogo);
  const header = meta.columns
    .map((col) => `<th>${escapeHtml(col)}</th>`)
    .join("");
  const body = rows
    .map((row, i) => {
      const cells = meta.columns
        .map((col) => `<td>${escapeHtml(String(row[col] ?? ""))}</td>`)
        .join("");
      return `<tr><td>${i + 1}</td>${cells}</tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>${PRINT_CSS}</style>
</head>
<body>
  <div class="wrap">
    <div class="report-header">
      <div class="logo-column"><img src="${escapeHtml(logo)}" alt=""></div>
      <div class="heading-column">
        <div class="college-name">${escapeHtml(meta.collegeName ?? "")}</div>
        <div class="title">${escapeHtml(title)}</div>
        ${meta.filterSummary ? `<div class="details">${escapeHtml(meta.filterSummary)}</div>` : ""}
      </div>
    </div>
    <table class="data">
      <thead>
        <tr><th>S.No</th>${header}</tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
  </div>
</body>
</html>`;

  const iframe = document.createElement("iframe");
  iframe.setAttribute(
    "style",
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;",
  );
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  const win = iframe.contentWindow;
  if (!win) {
    document.body.removeChild(iframe);
    return;
  }
  const openPrintDialog = () => {
    win.focus();
    win.print();
    setTimeout(() => document.body.removeChild(iframe), 1000);
  };
  const images = Array.from(doc.images);
  if (images.every((image) => image.complete)) {
    setTimeout(openPrintDialog, 100);
    return;
  }
  Promise.all(
    images.map(
      (image) =>
        new Promise<void>((resolve) => {
          image.onload = () => resolve();
          image.onerror = () => resolve();
        }),
    ),
  ).then(() => setTimeout(openPrintDialog, 100));
}
