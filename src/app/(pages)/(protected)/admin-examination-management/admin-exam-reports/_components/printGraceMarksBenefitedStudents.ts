/**
 * Grace Marks Benefited Students — iframe print (avoids AppShell blank pages).
 * Mirrors Angular grace-benefited-students-report print layout (logo + college + title).
 */

type AnyRow = Record<string, unknown>;

export type GraceMarksPrintGroup = {
  courseGroup: string;
  subjects: AnyRow[];
};

export type GraceMarksPrintMeta = {
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

function toAbsoluteLogoUrl(url: string): string {
  if (/^(https?:\/\/|data:|blob:)/i.test(url)) return url;
  if (typeof globalThis.location?.origin === "string") {
    return `${globalThis.location.origin}${url.startsWith("/") ? "" : "/"}${url}`;
  }
  return url;
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
    align-items: flex-start;
    width: 100%;
    margin: 0 0 8px;
  }
  .logo-col {
    flex: 0 0 15%;
    width: 15%;
    padding-right: 8px;
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
    flex: 1 1 85%;
    width: 85%;
    text-align: center;
    padding-top: 4px;
  }
  .college-name {
    text-align: center;
    font-size: 26px;
    font-weight: 700;
    margin: 8px 0 2px;
  }
  .title {
    text-align: center;
    font-size: 22px;
    font-weight: 600;
    margin: 4px 0;
  }
  .details {
    text-align: center;
    font-size: 16px;
    margin: 4px 0 16px;
  }
  .group-head {
    text-align: left;
    color: #000;
    font-weight: 600;
    margin: 12px 0 6px;
    font-size: 14px;
  }
  table.data {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 12px;
  }
  table.data th, table.data td {
    border: 1px solid #333;
    padding: 5px 8px;
    font-size: 12px;
  }
  table.data th {
    background: #f2f2f2;
    text-align: left;
    font-weight: 700;
  }
  table.data td.center { text-align: center; }
  @page { margin: 1cm; }
  @media print {
    html, body { background: #fff !important; }
    tr { page-break-inside: avoid; }
  }
`;

function buildDocument(
  groups: GraceMarksPrintGroup[],
  meta: GraceMarksPrintMeta,
): string {
  const title = escapeHtml(meta.title ?? "Grace Marks Benefited Students Data");
  const exam = escapeHtml(meta.examLabel ?? "");
  const college = escapeHtml(meta.collegeName ?? "");
  const logoSrc = escapeHtml(toAbsoluteLogoUrl(meta.logoUrl || DEFAULT_LOGO));

  const body = groups
    .map((group) => {
      const rows = group.subjects
        .map((s, i) => {
          const ht = escapeHtml(
            cell(s, ["hallticket_number", "hall_ticketno"]),
          );
          const subject = escapeHtml(cell(s, ["subject_name", "subject"]));
          const afterMod = escapeHtml(cell(s, ["ext_marks"]));
          const grace = escapeHtml(cell(s, ["grace_marks_added"]));
          const final = escapeHtml(cell(s, ["ext_grace_total"]));
          return `<tr>
            <td class="center">${i + 1}</td>
            <td>${ht}</td>
            <td>${subject}</td>
            <td>${afterMod}</td>
            <td>${grace}</td>
            <td class="center">${final}</td>
          </tr>`;
        })
        .join("");
      return `
        <p class="group-head">Course Group : ${escapeHtml(group.courseGroup)}</p>
        <table class="data" cellspacing="0" cellpadding="0">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Hall Ticket No.</th>
              <th>Subject</th>
              <th>After Moderation Marks</th>
              <th>Grace Marks</th>
              <th>Final Marks</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>`;
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
      <div class="logo-col">
        <img src="${logoSrc}" alt="" />
      </div>
      <div class="title-col">
        ${college ? `<p class="college-name">${college}</p>` : ""}
        <p class="title">${title}</p>
        ${exam ? `<p class="details">${exam}</p>` : ""}
      </div>
    </div>
    ${body}
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

  const cleanup = () => frame.remove();
  win.addEventListener("afterprint", cleanup);

  setTimeout(() => {
    win.focus();
    win.print();
    setTimeout(cleanup, 1500);
  }, 300);
}

export function printGraceMarksBenefitedStudents(
  groups: GraceMarksPrintGroup[],
  meta: GraceMarksPrintMeta = {},
): void {
  if (!groups.length) return;
  printHtmlInIframe(buildDocument(groups, meta));
}
