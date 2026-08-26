/**
 * Re-Evaluation Exam Report — iframe print (avoids AppShell blank pages).
 * Header matches Angular: logo + college name + title (+ SUK banner variant).
 * Footer matches Angular: resultStats summary table + signature row.
 */

type AnyRow = Record<string, unknown>;

export type ReEvaluationPrintMeta = {
  title?: string;
  examLabel?: string;
  universityName?: string;
  logoUrl?: string;
  orgCode?: string;
  courseCode?: string;
  courseYearCode?: string;
  resultStats?: AnyRow[];
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
    font-size: 16px;
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
    font-size: 16px;
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
  table.stats {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0 8px;
    font-size: 12px;
  }
  table.stats th,
  table.stats td {
    border: 1px solid #333;
    padding: 6px 8px;
    text-align: left;
    vertical-align: middle;
  }
  table.stats th {
    background: #f2f2f2;
    font-weight: 600;
  }
  .signature-row {
    display: flex;
    justify-content: space-between;
    width: 100%;
    margin-top: 8%;
    text-align: center;
    font-weight: 600;
    font-size: 16px;
  }
  .sig-box {
    flex: 1;
    text-align: center;
  }
  @page { margin: 10mm; }
  @media print {
    html, body { background: #fff !important; }
    tr { page-break-inside: avoid; }
    .signature-row {
      display: flex;
      justify-content: space-between;
      width: 100%;
      margin-top: 8% !important;
      text-align: center;
      font-weight: 600;
      font-size: 16px;
    }
  }
`;

function buildBannerHtml(meta: ReEvaluationPrintMeta, title: string): string {
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

function buildStatsHtml(resultStats: AnyRow[] | undefined): string {
  const stats = resultStats?.[0];
  if (!stats) return "";
  return `
    <table class="stats">
      <thead>
        <tr>
          <th>Total No.of Scripts Registered</th>
          <th>No.of Scripts Result Change</th>
          <th>% of Change</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${escapeHtml(cell(stats, ["total_scripts_registered"]))}</td>
          <td>${escapeHtml(cell(stats, ["no_of_scripts_result_change"]))}</td>
          <td>${escapeHtml(cell(stats, ["percent_change"]))}</td>
        </tr>
      </tbody>
    </table>`;
}

export function printReEvaluationExamReport(
  rows: AnyRow[],
  meta: ReEvaluationPrintMeta,
): void {
  if (rows.length === 0) return;

  const title = meta.title ?? "Re-Evaluation Exam Report";
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
      <td>${escapeHtml(cell(row, ["hallticket_number", "hall_ticketno"]))}</td>
      <td>${escapeHtml(cell(row, ["course_year_code", "courseYearCode"]))}</td>
      <td>${escapeHtml(cell(row, ["subject_name", "subjectName"]))}</td>
      <td>${escapeHtml(cell(row, ["cie"]))}</td>
      <td>${escapeHtml(cell(row, ["see"]))}</td>
      <td>${escapeHtml(cell(row, ["rv1"]))}</td>
      <td>${escapeHtml(cell(row, ["rv2"]))}</td>
      <td>${escapeHtml(cell(row, ["rv3"]))}</td>
      <td>${escapeHtml(cell(row, ["avg_marks"]))}</td>
      <td>${escapeHtml(cell(row, ["moderation_marks"]))}</td>
      <td>${escapeHtml(cell(row, ["final_marks"]))}</td>
      <td>${escapeHtml(cell(row, ["final_total_marks"]))}</td>
      <td>${escapeHtml(cell(row, ["grade_old"]))}</td>
      <td>${escapeHtml(cell(row, ["grade"]))}</td>
      <td>${escapeHtml(cell(row, ["Result", "result"]))}</td>
      <td>${escapeHtml(cell(row, ["Grade_Result", "grade_result"]))}</td>
      <td>${escapeHtml(cell(row, ["group_code", "groupCode"]))}</td>
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
          <th>S.No</th>
          <th>Hall Ticket No.</th>
          <th>Course Year</th>
          <th>Subject</th>
          <th>CIE</th>
          <th>SEE</th>
          <th>RV1</th>
          <th>RV2</th>
          <th>RV3</th>
          <th>Average of RV1,RV2,RV3</th>
          <th>Moderation Marks</th>
          <th>Final Marks</th>
          <th>Total Marks</th>
          <th>Original Grade</th>
          <th>Final Grade</th>
          <th>Marks Result</th>
          <th>Grade Result</th>
          <th>Branch</th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
    ${buildStatsHtml(meta.resultStats)}
    <div class="signature-row">
      <div class="sig-box">Controller of Examinations</div>
      <div class="sig-box">Principal</div>
      <div class="sig-box">ACoE-P1, OU</div>
    </div>
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

  // Wait for logo images so they appear in the print preview
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
