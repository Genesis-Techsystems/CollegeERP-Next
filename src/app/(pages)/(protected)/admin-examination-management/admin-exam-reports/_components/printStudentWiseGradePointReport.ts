/**
 * Grade And Grade Points Report — iframe print (avoids AppShell blank pages).
 */

type AnyRow = Record<string, unknown>;

export type GradePointStudentRow = AnyRow[];

export type GradePointPrintMeta = {
  title?: string;
  collegeName?: string;
  logoUrl?: string;
  details?: string;
  branchLabel?: string;
  subjectCodes: string[];
  analysisRows?: AnyRow[];
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

function findMarks(list: AnyRow[], subjectCode: string, field: string): string {
  const item = list.find((x) => String(x?.subject_code ?? "") === subjectCode);
  if (!item) return " ";
  const v = item[field];
  return v == null || String(v).trim() === "" ? " " : String(v);
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
    padding: 6px 8px;
    width: 100%;
    max-width: 100%;
    overflow: hidden;
  }
  .header-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    margin-bottom: 6px;
  }
  .logo-col {
    width: 70px;
    min-width: 70px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .logo-col img {
    max-width: 64px;
    max-height: 64px;
    object-fit: contain;
  }
  .title-col {
    flex: 1;
    text-align: center;
    
  }
  .college-name {
    text-align: center;
    font-size: 22px;
    font-weight: 700;
    margin: 4px 0 2px;
  }
  .title {
    text-align: center;
    font-size: 20px;
    font-weight: 600;
    margin: 2px 0 8px;
  }
  .details {
    text-align: center;
    font-size: 15px;
    font-weight: 600;
    margin: -4px 0 8px;
  }
  .branch {
    font-size: 12px;
    font-weight: 600;
    margin: 0 0 8px;
  }
  /* Wide grade matrix — fit page; last column must stay readable */
  table.data {
    width: 100%;
    max-width: 100%;
    border-collapse: collapse;
    margin-bottom: 10px;
    font-size: 8px;
    table-layout: fixed;
  }
  table.data th,
  table.data td {
    border: 1px solid #333;
    padding: 1px 2px;
    text-align: center;
    vertical-align: middle;
    overflow-wrap: anywhere;
    word-break: break-word;
  }
  table.data th {
    background: #f2f2f2;
    font-weight: 600;
    font-size: 7.5px;
  }
  table.data .col-roll {
    width: 7.5%;
    font-size: 7px;
  }
  table.data .col-sgpa,
  table.data .col-fail-count {
    width: 3.5%;
  }
  /* Failed Subjects — reserve space + wrap codes so they are not clipped */
  table.data .col-failed {
    width: 12%;
    min-width: 72px;
    text-align: left;
    font-size: 7px;
    line-height: 1.25;
    white-space: normal;
    word-break: break-all;
  }
  .analysis-title {
    text-align: center;
    font-size: 14px;
    font-weight: 700;
    margin: 14px 0 8px;
  }
  /* Portrait clips this wide table; landscape matches usable print width */
  @page {
    size: A4 landscape;
    margin: 6mm;
  }
`;

function buildTableHtml(
  mainList: GradePointStudentRow[],
  subjectCodes: string[],
): string {
  const topHeads = subjectCodes
    .map((code) => `<th colspan="2">${escapeHtml(code)}</th>`)
    .join("");
  const subHeads = subjectCodes
    .map(() => "<th>Points</th><th>Grade</th>")
    .join("");
  const head = `
    <tr>
      <th rowspan="2" class="col-roll">ROLL NO</th>
      ${topHeads}
      <th rowspan="2" class="col-sgpa">SGPA</th>
      <th rowspan="2" class="col-fail-count">Fail Count</th>
      <th rowspan="2" class="col-failed">Failed Subjects</th>
    </tr>
    <tr>${subHeads}</tr>`;

  const body = mainList
    .map((list) => {
      const first = list[0] ?? {};
      const subjectCells = subjectCodes
        .map(
          (code) =>
            `<td>${escapeHtml(findMarks(list, code, "grade_points"))}</td><td>${escapeHtml(findMarks(list, code, "grade"))}</td>`,
        )
        .join("");
      return `<tr>
        <td class="col-roll">${escapeHtml(cell(first, ["hallticket_number", "hall_ticketno"]))}</td>
        ${subjectCells}
        <td class="col-sgpa">${escapeHtml(cell(first, ["sgpa"]))}</td>
        <td class="col-fail-count">${escapeHtml(cell(first, ["total_fail_subjects"]))}</td>
        <td class="col-failed">${escapeHtml(cell(first, ["failed_subjects"]))}</td>
      </tr>`;
    })
    .join("");

  return `<table class="data"><thead>${head}</thead><tbody>${body}</tbody></table>`;
}

function buildAnalysisHtml(rows: AnyRow[]): string {
  if (rows.length === 0) return "";

  const body = rows
    .map(
      (row) => `<tr>
        <td>${escapeHtml(String(row.subject_name ?? ""))}</td>
        <td>${escapeHtml(String(row.TotalFailures ?? ""))}</td>
        <td>${escapeHtml(String(row["Pass%age"] ?? ""))}%</td>
        <td>${escapeHtml(String(row.Absent ?? ""))}</td>
        <td>${escapeHtml(String(row["B/w75%-100%(10pts-8pts)"] ?? ""))}</td>
        <td>${escapeHtml(String(row["B/w60%-75%(7pts-6pts)"] ?? ""))}</td>
        <td>${escapeHtml(String(row["B/w40%-60%(5pts-4pts)"] ?? ""))}</td>
        <td>${escapeHtml(String(row["<40%(Lessthan4pts)"] ?? ""))}</td>
      </tr>`,
    )
    .join("");

  return `
    <div class="analysis-title">Subject Wise Analysis</div>
    <table class="data">
      <thead>
        <tr>
          <th>Subject Name</th>
          <th>Total Failures</th>
          <th>Pass %</th>
          <th>Absent</th>
          <th>75% - 100%</th>
          <th>60% - 75%</th>
          <th>40% - 60%</th>
          <th>&lt; 40%</th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>`;
}

export function printStudentWiseGradePointReport(
  mainList: GradePointStudentRow[],
  meta: GradePointPrintMeta,
): void {
  if (mainList.length === 0) return;

  const title = meta.title ?? "Grade And Grade Points Report";
  const logoUrl = meta.logoUrl || "/assets/images/avatars/default_logo.png";
  const collegeName = meta.collegeName
    ? `<div class="college-name">${escapeHtml(meta.collegeName)}</div>`
    : "";
  const details = meta.details
    ? `<div class="details">${escapeHtml(meta.details)}</div>`
    : "";
  const branchLabel = meta.branchLabel
    ? `<div class="branch">Branch : ${escapeHtml(meta.branchLabel)}</div>`
    : "";
  const analysis = buildAnalysisHtml(meta.analysisRows ?? []);

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>${PRINT_CSS}</style>
</head>
<body>
  <div class="wrap">
    <div class="header-row">
      <div class="logo-col">
        <img src="${escapeHtml(logoUrl)}" alt="" />
      </div>
      <div class="title-col">
        ${collegeName}
        <div class="title">${escapeHtml(title)}</div>
      </div>
    </div>
    ${details}
    ${branchLabel}
    ${buildTableHtml(mainList, meta.subjectCodes)}
    ${analysis}
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
