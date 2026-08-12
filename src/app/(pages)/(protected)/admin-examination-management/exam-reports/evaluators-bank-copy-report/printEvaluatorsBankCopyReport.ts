/**
 * Evaluators Bank Copy Report — iframe print (Angular hall-ticket-wrapper parity).
 * One page per evaluator profile with subject breakdown + grand total.
 */

import { printHtmlInIframe } from "@/lib/print";
import type { BankCopyProfileReport } from "@/services/evaluators-bank-copy-report";

export type EvaluatorsBankCopyPrintMeta = {
  examName?: string;
  /** Angular `universityCode` from selected course — MECS / MVSR banner. */
  universityCode?: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function absUrl(src: string): string {
  if (typeof window === "undefined") return src;
  if (/^https?:\/\//i.test(src)) return src;
  return `${window.location.origin}${src.startsWith("/") ? src : `/${src}`}`;
}

function payableTotal(total: number): number {
  return total > 500 ? total : 500;
}

function bannerHtml(universityCode: string): string {
  if (universityCode === "MECS") {
    return `<img src="${escapeHtml(absUrl("/assets/images/avatars/MECS_BANNER.png"))}" alt="" class="college-banner" />`;
  }
  if (universityCode === "MVSR") {
    return `<img src="${escapeHtml(absUrl("/assets/images/avatars/MVSR_BANNER.png"))}" alt="" class="college-banner-2" />`;
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
  .hall-ticket-wrapper {
    font-family: Arial, sans-serif;
    font-size: 12px;
    color: #000;
    width: 98%;
    margin: 0 auto;
  }
  .page-align {
    border: 1px solid #000;
    padding: 8px;
    font-family: "Times New Roman", Times, serif;
    page-break-after: always;
    page-break-inside: avoid;
  }
  .page-align:last-child { page-break-after: auto; }
  .college-banner { width: 100%; height: auto; display: block; }
  .college-banner-2 { width: 100%; height: 90px; object-fit: contain; display: block; }
  .collegeName {
    text-align: center;
    font-weight: 500;
    font-size: 22px;
    margin: 18px 5px -18px;
    margin-bottom: 5px;
    color: #000;
  }
  .title {
    font-weight: 500;
    text-align: center;
    font-size: 18px;
    color: #000;
    margin: 8px 0 0;
  }
  .exam-header {
    font-family: Arial, sans-serif;
    font-size: 14px;
    margin: 10px 0;
    line-height: 1.6;
  }
  .subject-table-refined {
    width: 100%;
    border-collapse: collapse;
    margin: 2% 0 3%;
    font-family: "Times New Roman", Times, serif;
    font-size: 12px;
  }
  .subject-table-refined th,
  .subject-table-refined td {
    border: 1px solid #000;
    padding: 6px;
    text-align: center;
    vertical-align: middle;
  }
  .subject-table-refined th { font-weight: bold; }
  .subject-table-refined td:nth-child(2),
  .subject-table-refined td:nth-child(3) {
    text-align: left;
    padding-left: 10px;
    padding-right: 10px;
  }
  .light-text {
    font-family: Roboto, Arial, sans-serif;
    font-weight: 200;
    margin-top: 5%;
  }
  @page { margin: 8mm; }
  @media print {
    tr { page-break-inside: avoid; }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
  }
`;

/** Angular `printPage()` — per-profile remuneration bill layout. */
export function printEvaluatorsBankCopyReport(
  profiles: BankCopyProfileReport[],
  meta: EvaluatorsBankCopyPrintMeta = {},
): void {
  if (!profiles.length) return;

  const universityCode = (meta.universityCode ?? "").trim().toUpperCase();
  const examName = meta.examName ?? "";
  const title = "Evaluator Remuneration Report";

  const pages = profiles
    .map((report) => {
      const panCard = String(report.pan_card ?? report.pan_card_no ?? "");
      const ratePerScript = Number(report.amount) || 0;
      const grandTotal = Number(report.total_final_amount) || 0;
      const payable = payableTotal(grandTotal);

      const subjectRows = report.subjects
        .map(
          (data, i) => `<tr>
            <td>${i + 1}</td>
            <td>${escapeHtml(String(data.subject_code ?? ""))}</td>
            <td>${escapeHtml(String(data.subject_name ?? ""))}</td>
            <td>${Number(data.no_of_evaluations_completed) || 0}</td>
            <td>${Number(data.amount) || 0}</td>
            <td>${Number(data.final_amount) || 0}</td>
          </tr>`,
        )
        .join("");

      return `<div class="page-align">
        ${bannerHtml(universityCode)}
        <div>
          <p class="collegeName">${escapeHtml(title)}</p>
          <p class="title">${escapeHtml(examName)}</p>
        </div>
        <div>
          <div class="exam-header">
            <div>Evaluator ID : ${escapeHtml(String(report.user_name ?? ""))}</div>
            <div>Name of the Evaluator : ${escapeHtml(String(report.evaluator_name ?? ""))}</div>
            <div>Mobile : ${escapeHtml(String(report.phonenumber ?? ""))}</div>
            <div>Bank Account Number : ${escapeHtml(String(report.account_number ?? ""))}</div>
            <div>Bank Name : ${escapeHtml(String(report.bank_name ?? ""))}</div>
            <div>IFSC Code : ${escapeHtml(String(report.ifsc_code ?? ""))}</div>
            <div>Branch : ${escapeHtml(String(report.bank_address ?? ""))}</div>
            <div>PAN Card : ${escapeHtml(panCard)}</div>
          </div>
          <table class="subject-table-refined">
            <thead>
              <tr>
                <th>S.NO</th>
                <th>SUBJECT CODE</th>
                <th>NAME OF THE SUBJECT</th>
                <th>NO. OF SCRIPTS EVALUATED</th>
                <th>RATE FOR SCRIPT</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>${subjectRows}</tbody>
            <tfoot>
              <tr>
                <td colspan="3" style="text-align:right"><b>Grand Total</b></td>
                <td>${Number(report.total_scripts) || 0}</td>
                <td></td>
                <td style="text-align:center">${grandTotal}</td>
              </tr>
            </tfoot>
          </table>
          <div class="exam-header">
            <div>Total Amount Of : ${payable}/-</div>
            <div class="light-text">*Note :<br> Remuneration per script is ${ratePerScript}/- and minimum amount to be paid is 500/-</div>
            <div style="text-align:right;margin-top:5%">Controller Of Examinations</div>
            <div class="light-text">This is System generated bill,No signature is required</div>
          </div>
        </div>
      </div>`;
    })
    .join("");

  printHtmlInIframe(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>${PRINT_CSS}</style>
</head>
<body>
  <div class="hall-ticket-wrapper">${pages}</div>
</body>
</html>`);
}
