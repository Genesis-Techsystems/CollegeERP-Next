/**
 * Re-Evaluation Comparision Report — iframe print (avoids AppShell blank pages).
 * Header matches Angular: logo + college name + title (+ SUK banner variant).
 * Footer matches Angular: Course/Semester meta + reportSummary table.
 */

type AnyRow = Record<string, unknown>;

export type ComparisionPrintMeta = {
  title?: string;
  examLabel?: string;
  universityName?: string;
  logoUrl?: string;
  orgCode?: string;
  courseCode?: string;
  courseYearCode?: string;
  reportSummary?: AnyRow[];
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
  .header-row {
    display: flex;
    align-items: center;
    width: 100%;
    gap: 16px;
    margin: 0 0 12px;
  }
  .logo-col {
    flex: 0 0 12%;
    width: 12%;
    display: flex;
    align-items: center;
    justify-content: flex-start;
  }
  .logo-col img {
    max-width: 100%;
    max-height: 90px;
    width: auto;
    height: auto;
    object-fit: contain;
    display: block;
  }
  .title-col {
    flex: 1 1 88%;
    text-align: center;
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
    text-align: center;
    font-size: 22px;
    font-weight: 700;
    margin: 0;
    text-transform: uppercase;
  }
  .title {
    text-align: center;
    font-size: 18px;
    font-weight: 600;
    margin: 4px 0 0;
  }
  .exam {
    text-align: center;
    font-size: 14px;
    margin: 4px 0 0;
  }
  .meta-line {
    text-align: left;
    font-size: 13px;
    margin: 2px 0;
    color: #000;
  }
  table.data {
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0 12px;
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
  table.summary {
    width: 100%;
    border-collapse: collapse;
    margin: 3% 0 8px;
    font-size: 12px;
  }
  table.summary td {
    border: 1px solid #333;
    padding: 6px 8px;
    text-align: left;
    vertical-align: middle;
  }
  @page { margin: 10mm; }
  @media print {
    html, body { background: #fff !important; }
    tr { page-break-inside: avoid; }
  }
`;

function buildBannerHtml(meta: ComparisionPrintMeta, title: string): string {
  const collegeName = meta.universityName
    ? `<p class="college-name">${escapeHtml(meta.universityName)}</p>`
    : "";
  const exam = meta.examLabel
    ? `<p class="exam">${escapeHtml(meta.examLabel)}</p>`
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
      ${exam}
    </div>`;
  }

  return `
    <div class="header-row">
      <div class="logo-col">
        <img src="${logoSrc}" alt="" />
      </div>
      <div class="title-col">
        ${collegeName}
        <p class="title">${escapeHtml(title)}</p>
        ${exam}
      </div>
    </div>`;
}

function buildSummaryHtml(reportSummary: AnyRow[] | undefined): string {
  const summary = reportSummary?.[0];
  if (!summary) return "";
  const applied = escapeHtml(
    cell(summary, [
      "No_of_students_applied_for_revaluation",
      "no_of_students_applied_for_revaluation",
    ]),
  );
  const benefited = escapeHtml(
    cell(summary, [
      "No_of_students_benefited_for_revaluation",
      "no_of_students_benefited_for_revaluation",
    ]),
  );
  const pct = escapeHtml(
    cell(summary, ["Percentage_of_change", "percentage_of_change"]),
  );
  return `
    <table class="summary">
      <tr>
        <td>No. of Students Applied for Revaluation</td>
        <td>${applied}</td>
      </tr>
      <tr>
        <td>No. of Students Benefitted in Revaluation</td>
        <td>${benefited}</td>
      </tr>
      <tr>
        <td>Percentage Change</td>
        <td>${pct}%</td>
      </tr>
    </table>`;
}

export function printReEvaluationComparisionReport(
  rows: AnyRow[],
  meta: ComparisionPrintMeta,
): void {
  if (rows.length === 0) return;

  const title = meta.title ?? "Re-Evaluation Comparision Result Report";
  const courseLine = meta.courseCode
    ? `<p class="meta-line">Course : ${escapeHtml(meta.courseCode)}</p>`
    : "";
  const semesterLine = meta.courseYearCode
    ? `<p class="meta-line">Semester : ${escapeHtml(meta.courseYearCode)}</p>`
    : "";

  const body = rows
    .map(
      (row, i) => `<tr>
      <td>${i + 1}</td>
      <td>${escapeHtml(cell(row, ["Subject_Code", "subject_code"]))}</td>
      <td>${escapeHtml(cell(row, ["Subject_Name", "subject_name"]))}</td>
      <td>${escapeHtml(cell(row, ["Total_Registered", "total_registered"]))}</td>
      <td>${escapeHtml(cell(row, ["Total_Appeared", "total_appeared"]))}</td>
      <td>${escapeHtml(cell(row, ["Pass_Before_RV", "pass_before_rv"]))}</td>
      <td>${escapeHtml(cell(row, ["Before_RV", "before_rv"]))}</td>
      <td>${escapeHtml(cell(row, ["Students_Applied_RV", "students_applied_rv"]))}</td>
      <td>${escapeHtml(cell(row, ["Students_Benefitted", "students_benefitted"]))}</td>
      <td>${escapeHtml(cell(row, ["Pass_After_RV", "pass_after_rv"]))}</td>
      <td>${escapeHtml(cell(row, ["Final_Pass", "final_pass"]))}</td>
    </tr>`,
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
    ${courseLine}
    ${semesterLine}
    <table class="data">
      <thead>
        <tr>
          <th colspan="5"></th>
          <th colspan="2">Result Before RV</th>
          <th colspan="2"></th>
          <th colspan="2">After RV</th>
        </tr>
        <tr>
          <th>S.No</th>
          <th>Subject Code</th>
          <th>Subject Name</th>
          <th>Registered</th>
          <th>Appeared</th>
          <th>Passed</th>
          <th>Pass %</th>
          <th>No.of Students Applied RV</th>
          <th>No.of Students Benefited</th>
          <th>Passed</th>
          <th>Pass %</th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
    ${buildSummaryHtml(meta.reportSummary)}
  </div>
</body>
</html>`;

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
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
