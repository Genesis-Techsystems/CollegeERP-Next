/**
 * Academic Year Curriculum Report — iframe print (avoids AppShell blank pages).
 * Matches Angular: logo + college name + title (+ SUK banner) + Course/Course Year meta.
 */

type AnyRow = Record<string, unknown>;

export type CurriculumPrintMeta = {
  title?: string;
  filterSummary?: string;
  collegeName?: string;
  logoUrl?: string;
  orgCode?: string;
  courseGroup?: string;
  courseYear?: string;
  columns: string[];
};

const DEFAULT_LOGO = "/assets/images/avatars/default_logo.png";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toAbsoluteLogoUrl(url: string): string {
  if (/^(https?:\/\/|data:|blob:)/i.test(url)) return url;
  if (typeof globalThis.location?.origin === "string") {
    return `${globalThis.location.origin}${url.startsWith("/") ? "" : "/"}${url}`;
  }
  return url;
}

function cell(row: AnyRow, key: string): string {
  const v = row?.[key];
  if (v == null || String(v).trim() === "") return "";
  return String(v);
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
  .header-row {
    display: flex;
    align-items: center;
    width: 100%;
    gap: 16px;
    margin: 0 0 8px;
  }
  .logo-col {
    flex: 0 0 15%;
    width: 15%;
    display: flex;
    align-items: center;
    justify-content: flex-start;
  }
  .logo-col img {
    max-width: 90%;
    max-height: 90px;
    width: auto;
    height: auto;
    object-fit: contain;
    display: block;
  }
  .title-col {
    flex: 1 1 85%;
    text-align: left;
  }
  .suk-banner {
    width: 100%;
    text-align: center;
    margin: 0 0 4px;
  }
  .suk-banner img {
    width: 100%;
    max-width: 1200px;
    height: auto;
    display: block;
    margin: 0 auto;
  }
  .suk-header {
    text-align: center;
    margin: 0 0 8px;
  }
  .college-name {
    text-align: left;
    font-size: 22px;
    font-weight: 700;
    margin: 0;
  }
  .suk-header .college-name { text-align: center; }
  .title {
    text-align: left;
    font-size: 18px;
    font-weight: 600;
    margin: 4px 0 0;
  }
  .suk-header .title { text-align: center; }
  .details {
    text-align: left;
    font-size: 13px;
    margin: 4px 0 0;
  }
  .suk-header .details { text-align: center; }
  .meta-row {
    display: flex;
    width: 100%;
    margin: 8px 0 12px;
    font-size: 13px;
    color: #000;
  }
  .meta-row .left { width: 50%; text-align: left; }
  .meta-row .right { width: 50%; text-align: right; }
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
    text-align: left;
    vertical-align: middle;
  }
  table.data th {
    background: #f2f2f2;
    font-weight: 600;
  }
  @page { margin: 10mm; }
  @media print {
    html, body { background: #fff !important; }
    tr { page-break-inside: avoid; }
  }
`;

function buildBannerHtml(meta: CurriculumPrintMeta, title: string): string {
  const collegeName = meta.collegeName
    ? `<p class="college-name">${escapeHtml(meta.collegeName)}</p>`
    : "";
  const details = meta.filterSummary
    ? `<p class="details">${escapeHtml(meta.filterSummary)}</p>`
    : "";
  const logoSrc = escapeHtml(toAbsoluteLogoUrl(meta.logoUrl || DEFAULT_LOGO));
  const isSuk =
    String(meta.orgCode ?? "")
      .trim()
      .toUpperCase() === "SUK";

  if (isSuk) {
    return `
    <div class="suk-banner">
      <img src="${logoSrc}" alt="" />
    </div>
    <div class="suk-header">
      ${collegeName}
      <p class="title">${escapeHtml(title)}</p>
      ${details}
    </div>`;
  }

  return `
    <div class="header-row">
      <div class="logo-col">
        <img src="${logoSrc}" alt="" class="portraitLogo" />
      </div>
      <div class="title-col">
        ${collegeName}
        <p class="title">${escapeHtml(title)}</p>
        ${details}
      </div>
    </div>`;
}

export function printAcademicYearCurriculumReport(
  rows: AnyRow[],
  meta: CurriculumPrintMeta,
): void {
  if (rows.length === 0 || meta.columns.length === 0) return;

  const title = meta.title ?? "Academic Year Curriculum Report";
  const courseLine = meta.courseGroup
    ? `<div class="left">Course : ${escapeHtml(meta.courseGroup)}</div>`
    : `<div class="left"></div>`;
  const yearLine = meta.courseYear
    ? `<div class="right">Course Year : ${escapeHtml(meta.courseYear)}</div>`
    : `<div class="right"></div>`;
  const metaRow =
    meta.courseGroup || meta.courseYear
      ? `<div class="meta-row">${courseLine}${yearLine}</div>`
      : "";

  const head = `<th>S.No</th>${meta.columns.map((c) => `<th>${escapeHtml(c)}</th>`).join("")}`;
  const body = rows
    .map(
      (row, i) =>
        `<tr><td>${i + 1}</td>${meta.columns
          .map((c) => `<td>${escapeHtml(cell(row, c))}</td>`)
          .join("")}</tr>`,
    )
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
    ${buildBannerHtml(meta, title)}
    ${metaRow}
    <table class="data">
      <thead><tr>${head}</tr></thead>
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

  const printFrame = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      setTimeout(() => {
        if (iframe.parentNode) document.body.removeChild(iframe);
      }, 1000);
    }
  };

  const waitForImagesThenPrint = () => {
    const imgs = Array.from(doc.images ?? []);
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

  if (iframe.contentWindow?.document.readyState === "complete") {
    waitForImagesThenPrint();
  } else {
    iframe.onload = () => waitForImagesThenPrint();
  }
}
