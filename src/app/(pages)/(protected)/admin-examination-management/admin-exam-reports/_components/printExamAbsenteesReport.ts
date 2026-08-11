/**
 * Exam Absentees Report — iframe print (avoids AppShell blank pages).
 * Header matches sibling exam reports: logo + college name + title.
 */

type AnyRow = Record<string, unknown>;

export type AbsenteesPrintMeta = {
  title?: string;
  examLabel?: string;
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
  .print-header-container {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    width: 100%;
    gap: 20px;
    margin: 0 0 12px;
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
  table.data {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 12px;
    font-size: 12px;
  }
  table.data th,
  table.data td {
    border: 1px solid #333;
    padding: 4px 6px;
    text-align: center;
    vertical-align: middle;
  }
  table.data th {
    background: #f2f2f2;
    font-weight: 600;
  }
  @page { margin: 12mm; }
`;

export function printExamAbsenteesReport(
  rows: AnyRow[],
  meta: AbsenteesPrintMeta,
): void {
  if (rows.length === 0) return;

  const title = meta.title ?? "Exam Absentees Report";
  const logoUrl = escapeHtml(meta.logoUrl || DEFAULT_LOGO);
  const collegeName = meta.collegeName
    ? `<p class="college-name">${escapeHtml(meta.collegeName)}</p>`
    : "";
  const exam = meta.examLabel
    ? `<p class="exam">${escapeHtml(meta.examLabel)}</p>`
    : "";

  const body = rows
    .map((row, i) => {
      const subjectName = cell(row, ["subject_name", "subjectName"]);
      const subjectCode = cell(row, ["subject_code", "subjectCode"]);
      const subject =
        subjectName && subjectCode
          ? `${subjectName} (${subjectCode})`
          : subjectName || subjectCode;
      return `<tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(cell(row, ["college_code", "collegeCode"]))}</td>
        <td>${escapeHtml(cell(row, ["group_code", "groupCode"]))}</td>
        <td>${escapeHtml(cell(row, ["course_year_code", "courseYearCode"]))}</td>
        <td>${escapeHtml(cell(row, ["exam_date", "examDate"]))}</td>
        <td>${escapeHtml(subject)}</td>
        <td>${escapeHtml(cell(row, ["hallticket_number", "hall_ticketno"]))}</td>
      </tr>`;
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
    <div class="print-header-container">
      <div class="logo-container">
        <img class="portrait-logo" src="${logoUrl}" alt="" />
      </div>
      <div class="text-section">
        ${collegeName}
        <p class="title">${escapeHtml(title)}</p>
        ${exam}
      </div>
    </div>
    <table class="data">
      <thead>
        <tr>
          <th>SI.No</th>
          <th>College Code</th>
          <th>Group Code</th>
          <th>Course Year Code</th>
          <th>Exam Date</th>
          <th>Subject Name (Subject Code)</th>
          <th>Hallticket Number</th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
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

  if (iframe.contentWindow?.document.readyState === "complete") {
    setTimeout(printFrame, 250);
  } else {
    iframe.onload = () => setTimeout(printFrame, 250);
  }
}
