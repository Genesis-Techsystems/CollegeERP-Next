/**
 * Internal Marks Report — iframe print (avoids AppShell blank pages).
 * Banner layout matches Angular `internal-marks-entry-report` print section.
 */

type AnyRow = Record<string, unknown>;

export type SubjectCol = {
  subject_code: string;
  subject_name: string;
};

export type InternalMarksPrintMeta = {
  title?: string;
  filterSummary?: string;
  collegeName?: string;
  logoUrl?: string;
  orgCode?: string;
  subjectCols: SubjectCol[];
  maxMarksBySubject: Record<string, string | number>;
};

const DEFAULT_LOGO = "/assets/images/avatars/default_logo.png";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function findMarks(
  list: AnyRow[],
  subjectCode: string,
  markType: string,
): string | number {
  const subject = list.find(
    (item) => String(item.subject_code ?? "") === subjectCode,
  );
  if (!subject) return " ";
  const v = subject[markType];
  return v == null || String(v).trim() === "" ? " " : (v as string | number);
}

function rowTotal(list: AnyRow[], subjectCols: SubjectCol[]): number {
  return subjectCols.reduce((sum, col) => {
    const mark = Number(findMarks(list, col.subject_code, "marks"));
    return sum + (Number.isFinite(mark) ? mark : 0);
  }, 0);
}

const PRINT_CSS = `
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    background: #fff;
    color: #000;
    font-family: "Times New Roman", Times, serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .wrap { padding: 8px 12px; width: 98%; }
  .header-row {
    display: flex;
    align-items: center;
    width: 100%;
    margin: 0 0 4px;
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
    font-size: 24px;
    font-weight: 550;
    margin: 16px 0 -8px;
    color: #000;
  }
  .title {
    text-align: center;
    font-size: 21px;
    font-weight: 550;
    margin: 4px 0 0;
    color: #000;
  }
  .details {
    text-align: center;
    font-size: 19px;
    margin: 2px 0 10px;
    color: #000;
    font-weight: 400;
  }
  table.data {
    width: 100%;
    border-collapse: collapse;
    margin-top: 1%;
    margin-bottom: 12px;
    font-size: 12px;
  }
  table.data th,
  table.data td {
    border: 1px solid #000;
    padding: 4px 5px;
    text-align: center;
    vertical-align: middle;
  }
  table.data th {
    font-weight: 550;
  }
  .sub-code { font-size: 11px; font-weight: 600; }
  .sub-max { font-size: 10px; font-weight: 500; }
  .signatures {
    display: flex;
    justify-content: space-between;
    margin-top: 10%;
    padding: 0 40px;
    font-weight: 550;
  }
  @page { margin: 10mm; }
  @media print {
    html, body { background: #fff !important; }
    tr { page-break-inside: avoid; }
  }
`;

function buildBannerHtml(meta: InternalMarksPrintMeta, title: string): string {
  const collegeName = meta.collegeName
    ? `<p class="college-name">${escapeHtml(meta.collegeName)}</p>`
    : "";
  const details = meta.filterSummary
    ? `<p class="details">${escapeHtml(meta.filterSummary)}</p>`
    : "";
  const logoSrc = escapeHtml(meta.logoUrl || DEFAULT_LOGO);
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
        <img src="${logoSrc}" alt="" />
      </div>
      <div class="title-col">
        ${collegeName}
        <p class="title">${escapeHtml(title)}</p>
        ${details}
      </div>
    </div>`;
}

export function printInternalMarksReport(
  mainList: AnyRow[][],
  meta: InternalMarksPrintMeta,
): void {
  if (mainList.length === 0) return;

  const title = meta.title ?? "Internal Marks Report";

  const subjectHeaders = meta.subjectCols
    .map((col) => {
      const max = meta.maxMarksBySubject[col.subject_code] ?? " ";
      return `<th>
        <div>${escapeHtml(col.subject_code)}</div>
        <div class="sub-code">(${escapeHtml(col.subject_name)})</div>
        <div class="sub-max">Max Marks(${escapeHtml(String(max))})</div>
      </th>`;
    })
    .join("");

  const body = mainList
    .map((list, i) => {
      const first = list[0] ?? {};
      const subjectCells = meta.subjectCols
        .map(
          (col) =>
            `<td>${escapeHtml(String(findMarks(list, col.subject_code, "marks")))}</td>`,
        )
        .join("");
      return `<tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(String(first.roll_number ?? ""))}</td>
        ${subjectCells}
        <td>${rowTotal(list, meta.subjectCols)}</td>
        <td>${escapeHtml(String(first.total_max_marks ?? ""))}</td>
        <td>${escapeHtml(String(first.total_percentage ?? ""))}</td>
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
    ${buildBannerHtml(meta, title)}
    <table class="data">
      <thead>
        <tr>
          <th>S.No</th>
          <th>Hall Ticket No.</th>
          ${subjectHeaders}
          <th>Total Marks Scored</th>
          <th>Total Maximum Marks</th>
          <th>Percentage (%)</th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
    <div class="signatures">
      <div>HOD</div>
      <div>Principal</div>
    </div>
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
  const cleanup = () => {
    try {
      document.body.removeChild(iframe);
    } catch {
      /* ignore */
    }
  };
  win.focus();
  setTimeout(() => {
    win.print();
    setTimeout(cleanup, 1000);
  }, 250);
}
