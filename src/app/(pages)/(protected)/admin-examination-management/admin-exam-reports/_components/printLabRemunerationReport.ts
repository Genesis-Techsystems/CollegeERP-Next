/**
 * Lab Remuneration Report — iframe print (avoids AppShell blank pages).
 * Mirrors Angular hall-ticket-wrapper print layout (per evaluator profile).
 */

type AnyRow = Record<string, unknown>;

export type LabRemunerationPrintProfile = {
  user_name?: string;
  evaluator_name?: string;
  phonenumber?: string;
  account_number?: string;
  bank_name?: string;
  ifsc_code?: string;
  bank_address?: string;
  pan_card_no?: string;
  no_of_days?: string | number;
  travel_allowance?: string | number;
  amount?: string | number;
  total_final_amount: number;
  subjects: Array<{
    subject_code?: string;
    subject_name?: string;
    evaluation_count?: string | number;
    amount?: string | number;
    final_amount?: string | number;
  }>;
};

export type LabRemunerationPrintMeta = {
  title?: string;
  examName?: string;
  collegeName?: string;
  universityCode?: string;
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
  .page {
    padding: 0;
    page-break-after: always;
  }
  .page:last-child { page-break-after: auto; }
  .report-shell {
    width: 100%;
    border: 1px solid #000;
    padding: 8px;
    box-sizing: border-box;
    font-family: "Times New Roman", serif;
  }
  .college-banner {
    display: block;
    width: 100%;
    height: auto;
  }
  .college-banner--mvsr {
    height: 90px;
    object-fit: fill;
  }
  .report-title {
    text-align: center;
    color: #000;
    font-size: 16px;
    font-weight: 700;
    margin-top: 18px;
    margin-bottom: -18px;
  }
  .exam-title {
    text-align: center;
    font-family: "Times New Roman", serif;
    color: #000;
    font-size: 14px;
    font-weight: 500;
  }
  .exam-header {
    font-family: Arial, sans-serif;
    font-size: 14px;
    line-height: 1.6;
    margin: 10px 0;
  }
  table.data {
    width: 100%;
    border-collapse: collapse;
    margin-top: 2%;
    margin-bottom: 3%;
    font-family: "Times New Roman", serif;
    font-size: 12px;
  }
  table.data th,
  table.data td {
    border: 1px solid #000;
    padding: 1px;
    text-align: center;
    vertical-align: middle;
  }
  table.data th {
    background: #fff;
    font-weight: 700;
  }
  .footer {
    font-family: Arial, sans-serif;
    font-size: 12px;
  }
  .note {
    font-family: Roboto, Arial, sans-serif;
    font-weight: 300;
    margin-top: 5%;
  }
  .sign {
    text-align: right;
    margin-top: 5%;
  }
  .generated-note {
    font-family: Roboto, Arial, sans-serif;
    font-weight: 300;
    margin-top: 5%;
  }
  @page { size: A4 portrait; margin: 8mm; }
`;

export function groupLabRemunerationByProfile(
  rows: AnyRow[],
): LabRemunerationPrintProfile[] {
  const map: Record<string, LabRemunerationPrintProfile> = {};
  for (const item of rows) {
    const key = String(
      item.pk_exam_evaluator_profile_id ?? item.evaluator_name ?? "",
    );
    if (!key) continue;
    if (!map[key]) {
      map[key] = {
        user_name: String(item.user_name ?? ""),
        evaluator_name: String(item.evaluator_name ?? ""),
        phonenumber: String(item.phonenumber ?? ""),
        account_number: String(item.account_number ?? ""),
        bank_name: String(item.bank_name ?? ""),
        ifsc_code: String(item.ifsc_code ?? ""),
        bank_address: String(item.bank_address ?? ""),
        pan_card_no: String(item.pan_card_no ?? ""),
        no_of_days: (item.no_of_days as string | number) ?? "",
        travel_allowance: (item.travel_allowance as string | number) ?? "",
        amount: (item.amount as string | number) ?? "",
        total_final_amount: 0,
        subjects: [],
      };
    }
    const finalAmount = Number(item.final_amount ?? 0);
    map[key].subjects.push({
      subject_code: String(item.subject_code ?? ""),
      subject_name: String(item.subject_name ?? ""),
      evaluation_count: (item.evaluation_count as string | number) ?? "",
      amount: (item.amount as string | number) ?? "",
      final_amount: (item.final_amount as string | number) ?? "",
    });
    map[key].total_final_amount += Number.isFinite(finalAmount)
      ? finalAmount
      : 0;
  }
  return Object.values(map);
}

export function printLabRemunerationReport(
  profiles: LabRemunerationPrintProfile[],
  meta: LabRemunerationPrintMeta = {},
): void {
  if (profiles.length === 0) return;

  const title = meta.title ?? "Lab Remuneration Report";
  const universityCode = (meta.universityCode ?? "").trim().toUpperCase();
  const isMvsr = universityCode === "MVSR";
  const bannerSrc = isMvsr
    ? "/assets/images/avatars/MVSR_BANNER.png"
    : "/assets/images/avatars/MECS_BANNER.png";
  const pages = profiles
    .map((report) => {
      const rows = report.subjects
        .map(
          (data, i) => `<tr>
            <td>${i + 1}</td>
            <td>${escapeHtml(String(data.subject_code ?? ""))}</td>
            <td>${escapeHtml(String(data.subject_name ?? ""))}</td>
            <td>${escapeHtml(String(data.evaluation_count ?? ""))}</td>
            <td>${escapeHtml(String(data.amount ?? ""))}</td>
            <td>${escapeHtml(String(data.final_amount ?? ""))}</td>
          </tr>`,
        )
        .join("");
      return `<div class="page">
        <div class="report-shell">
          <img class="college-banner${isMvsr ? " college-banner--mvsr" : ""}" src="${bannerSrc}" alt="${escapeHtml(meta.collegeName ?? "")}">
          <p class="report-title">${escapeHtml(title)}</p>
          <p class="exam-title">${escapeHtml(meta.examName ?? "")}</p>
          <div class="exam-header">
            <div>Evaluator ID : ${escapeHtml(String(report.user_name ?? ""))}</div>
            <div>Name of the Evaluator : ${escapeHtml(String(report.evaluator_name ?? ""))}</div>
            <div>Mobile : ${escapeHtml(String(report.phonenumber ?? ""))}</div>
            <div>Bank Account Number : ${escapeHtml(String(report.account_number ?? ""))}</div>
            <div>Bank Name : ${escapeHtml(String(report.bank_name ?? ""))}</div>
            <div>IFSC Code : ${escapeHtml(String(report.ifsc_code ?? ""))}</div>
            <div>Branch : ${escapeHtml(String(report.bank_address ?? ""))}</div>
            <div>PAN Card : ${escapeHtml(String(report.pan_card_no ?? ""))}</div>
            <div>No of Days : ${escapeHtml(String(report.no_of_days ?? ""))}</div>
            <div>Travel Allowance : ${escapeHtml(String(report.travel_allowance ?? ""))}</div>
          </div>
          <table class="data">
          <thead>
            <tr>
              <th>S.NO</th>
              <th>SUBJECT CODE</th>
              <th>NAME OF THE SUBJECT</th>
              <th>EVALUATION COUNT</th>
              <th>RATE FOR SCRIPT</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          </table>
          <div class="footer">
            <div>Total Amount Of : ${report.total_final_amount}/-</div>
            <div class="note">*Note :<br> Remuneration per script is ${escapeHtml(String(report.amount ?? ""))}/-</div>
            <div class="sign">Controller Of Examinations</div>
            <div class="generated-note">This is System generated bill, No signature is required</div>
          </div>
        </div>
      </div>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>${PRINT_CSS}</style>
</head>
<body>${pages}</body>
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
