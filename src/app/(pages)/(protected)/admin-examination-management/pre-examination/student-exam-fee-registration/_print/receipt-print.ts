/**
 * Angular parity: print-regular-exam-fee-receipt — EXAM FEE-RECEIPT HTML + iframe print.
 * Layout/CSS mirrors working student fee receipt print (full A4, two copies, one page).
 */

import { MINIO_URL } from "@/config/constants/api";
import { currencySymbol, fmtDate, numToWords } from "./money";
import type { ExamFeePrintPayload } from "./store";

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Angular assets/images/avatars/default_logo.png */
export const DEFAULT_EXAM_FEE_LOGO = "/assets/images/avatars/default_logo.png";

function absUrl(src: string): string {
  if (!src) return "";
  if (/^(https?:\/\/|data:)/i.test(src)) return src;
  if (typeof window !== "undefined") {
    return `${window.location.origin}${src.startsWith("/") ? src : `/${src}`}`;
  }
  return src.startsWith("/") ? src : `/${src}`;
}

/** Resolve org/college logo for screen + iframe print (absolute URL). */
export function resolveExamFeeLogo(
  data: ExamFeePrintPayload | null | undefined,
): string {
  const raw =
    data?.orgLogo ??
    data?.org_logo ??
    data?.collegeLogo ??
    data?.college_logo ??
    data?.logoPath ??
    data?.logo_path ??
    data?.logo ??
    "";
  const path = String(raw ?? "").trim();
  if (!path) return absUrl(DEFAULT_EXAM_FEE_LOGO);
  if (/^(https?:\/\/|data:)/i.test(path)) return path;
  if (path.startsWith("/")) return absUrl(path);
  const minioBase = String(MINIO_URL ?? "");
  const joined = `${minioBase}${path.replace(/^\/+/, "")}`;
  if (/^(https?:\/\/)/i.test(joined)) return joined;
  return absUrl(joined.startsWith("/") ? joined : `/${joined}`);
}

/**
 * Same sheet chrome as accounts fee-receipt print (proven one-page layout),
 * with Angular exam-fee-receipt fonts / First-Border / #table2 styling.
 */
const PRINT_CSS = `
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    background: #fff;
    color: #000;
    font-family: Arial, Helvetica, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  #print-section {
    width: 100% !important;
    height: 100%;
    min-height: 100vh;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
  }
  .First-Border {
    width: 100% !important;
    flex: 1 1 0;
    min-height: 0;
    border: 2px solid #000 !important;
    border-radius: 10px !important;
    margin: 0 !important;
    position: relative;
    overflow: hidden;
    background: #fff;
    display: flex;
    flex-direction: column;
  }
  .firstborder {
    display: flex;
    align-items: center;
    border-bottom: 2px solid #000;
    width: 100%;
    flex-shrink: 0;
  }
  .h-logo {
    height: 100px !important;
    width: 110px !important;
    padding: 10px !important;
    object-fit: contain;
  }
  .college-wrap {
    flex: 1;
    text-align: center;
    padding-right: 12px;
  }
  .college-wrap h2 {
    text-align: center;
    font-weight: bold;
    font-size: 26px;
    margin: 5px !important;
    text-transform: uppercase;
  }
  .college-wrap h4 {
    text-align: center;
    font-weight: bold;
    margin: 5px !important;
    font-size: 14px;
  }
  .title-row {
    display: flex;
    align-items: center;
    width: 100%;
    flex-shrink: 0;
  }
  .title-row .title-left {
    flex: 0 0 62%;
    text-align: right;
  }
  .title-row .title-right {
    flex: 0 0 38%;
    text-align: right;
    padding: 17px;
    font-size: 13px;
  }
  .title-row h3 {
    text-align: center;
    font-weight: bold;
    margin: 0;
    font-size: 16px;
    text-decoration: underline;
  }
  .line {
    background-color: #000;
    height: 1px;
    width: 90%;
    margin: 0 auto;
    border: none;
    flex-shrink: 0;
  }
  .main-card {
    padding: 15px !important;
    position: relative;
    display: flex;
    gap: 8px;
    flex: 1 1 auto;
    align-items: flex-start;
    min-height: 0;
  }
  .img-2 {
    width: 40%;
    height: 55%;
    max-height: 160px;
    opacity: 0.2;
    position: absolute;
    left: 50%;
    top: 45%;
    transform: translate(-50%, -50%);
    margin: 0;
    object-fit: contain;
    pointer-events: none;
    z-index: 0;
  }
  .main-card .col {
    flex: 1;
    position: relative;
    z-index: 1;
  }
  .main-card table {
    width: 100%;
    border-collapse: collapse;
    font-family: Arial, sans-serif;
    font-size: 13px !important;
    border: none !important;
  }
  .main-card th {
    font-family: Arial, sans-serif;
    font-size: 12px !important;
    border: none !important;
    width: 30% !important;
    text-align: left !important;
    font-weight: 500;
    vertical-align: top;
    padding: 3px 0;
  }
  .main-card td {
    font-family: Arial, sans-serif;
    font-size: 12px !important;
    text-align: left !important;
    border: none !important;
    font-weight: 600;
    vertical-align: top;
    padding: 3px 0;
  }
  .main-card .dots {
    width: 5% !important;
    font-weight: 600 !important;
    text-align: center !important;
  }
  .amount-wrap {
    display: flex;
    justify-content: center;
    padding: 4px 10px 8px;
    flex-shrink: 0;
  }
  #table2 {
    width: 60%;
    border: 1px solid black !important;
    border-spacing: 0;
    border-collapse: collapse;
    font-family: Arial, sans-serif;
    font-size: 12px;
  }
  #table2 th {
    text-align: left !important;
    border: 1px solid black !important;
    padding: 4px 8px !important;
    font-weight: 600;
  }
  #table2 th.center {
    text-align: center !important;
  }
  #table2 td {
    text-align: right !important;
    border: 1px solid black !important;
    font-weight: 550;
    padding: 4px 8px !important;
  }
  .note-wrap {
    padding: 10px 12px 14px !important;
    margin-top: auto;
    flex-shrink: 0;
  }
  .border {
    border: 1px solid black;
    width: 90%;
    margin: auto;
  }
  .border p {
    margin-left: 10px !important;
    margin-top: 0;
    margin-bottom: 0;
    font-size: smaller;
    font-weight: 600;
    text-align: left !important;
  }
  .border p + p {
    margin-top: 2px !important;
  }
  .cut-line {
    border-top: 1px dashed #000 !important;
    margin: 6px 0 !important;
    height: 0;
    flex: 0 0 auto;
  }
  @page {
    size: A4 portrait;
    margin: 4mm;
  }
  @media print {
    html, body {
      background: #fff !important;
      margin: 0 !important;
      padding: 0 !important;
      width: 100%;
      height: 100%;
    }
    #print-section {
      min-height: 0;
      height: 289mm;
      max-height: 289mm;
      overflow: hidden;
    }
    .First-Border {
      page-break-inside: avoid;
      break-inside: avoid;
      height: calc((289mm - 12px) / 2);
      max-height: calc((289mm - 12px) / 2);
    }
  }
`;

function paymentTypeLabel(data: ExamFeePrintPayload): string {
  const code = data.paymentModeCatCode ?? data.paymentModeCatDisplayName ?? "";
  let extra = "";
  if (data.paymentMode != null && String(data.paymentMode) !== "") {
    extra = ` (${data.paymentMode}`;
    if (data.cardName != null && String(data.cardName) !== "") {
      extra += ` -${data.cardName}`;
    }
    extra += ")";
  }
  return `${code}${extra}`;
}

function buildOneCopyHtml(
  data: ExamFeePrintPayload,
  copyLabel: "Student Copy" | "Department Copy",
): string {
  const e = escapeHtml;
  const logo = resolveExamFeeLogo(data);
  const fallback = e(absUrl(DEFAULT_EXAM_FEE_LOGO));
  // Angular: courseCode (groupCode-section)
  const branch = `${data.courseCode ?? ""} (${data.groupCode ?? ""}${
    data.section ? `-${data.section}` : ""
  })`;
  const examType =
    data.examtypeCatDisplayName != null &&
    String(data.examtypeCatDisplayName) !== ""
      ? ` (${data.examtypeCatDisplayName})`
      : "";
  const total =
    data.examTotalAmount != null
      ? `₹${currencySymbol(data.examTotalAmount)}`
      : "";
  const words =
    data.examTotalAmount != null
      ? `${numToWords(data.examTotalAmount)} Only`
      : "";

  return `
    <div class="First-Border">
      <div class="firstborder">
        <img class="h-logo" src="${e(logo)}" alt=""
          onerror="this.onerror=null;this.src='${fallback}';" />
        <div class="college-wrap">
          <h2>${e(data.collegeName ?? "")}</h2>
          <h4>${e(data.address ?? "")}</h4>
        </div>
      </div>
      <div class="title-row">
        <div class="title-left"><h3>EXAM FEE-RECEIPT</h3></div>
        <div class="title-right"><span>${e(copyLabel)}</span></div>
      </div>
      <hr class="line" />
      <div class="main-card">
        <img class="img-2" src="${e(logo)}" alt=""
          onerror="this.style.display='none'" />
        <div class="col">
          <table>
            <tr><th>Receipt No</th><td class="dots">:</td><td>${e(data.feeReceiptNo ?? "")}</td></tr>
            <tr><th>Student Name</th><td class="dots">:</td><td>${e(data.stdName ?? "")}</td></tr>
            <tr><th>HallTicket No</th><td class="dots">:</td><td>${e(data.stdRollNumber ?? "")}</td></tr>
            <tr><th>Branch</th><td class="dots">:</td><td>${e(branch)}</td></tr>
          </table>
        </div>
        <div class="col">
          <table>
            <tr><th>Date</th><td class="dots">:</td><td>${e(fmtDate(data.receiptDate, true))}</td></tr>
            <tr><th>Father Name</th><td class="dots">:</td><td>${e(data.stdFatherName ?? "")}</td></tr>
            <tr><th>Year</th><td class="dots">:</td><td>${e(data.courseYearName ?? "")}</td></tr>
            <tr><th>Payment Type</th><td class="dots">:</td><td>${e(paymentTypeLabel(data))}</td></tr>
            <tr><th>Merchant Ref.No</th><td class="dots">:</td><td>${e(data.transactionNo ?? "")}</td></tr>
          </table>
        </div>
      </div>
      <div class="amount-wrap">
        <table id="table2">
          <tr>
            <th class="center">Details</th>
            <th class="center">Amount</th>
          </tr>
          <tr>
            <th>Exam Fee${e(examType)}</th>
            <td>${data.examFeeAmount != null ? e(data.examFeeAmount) : ""}</td>
          </tr>
          <tr>
            <th>Add. Fee</th>
            <td>${data.examAddtFee != null ? e(data.examAddtFee) : ""}</td>
          </tr>
          <tr>
            <th>LateFee</th>
            <td>${data.examFineAmount != null ? e(data.examFineAmount) : ""}</td>
          </tr>
          <tr>
            <th>Amount Paid</th>
            <td>${e(total)}</td>
          </tr>
          <tr>
            <th>Amount In Words</th>
            <td style="text-align:left !important;">${e(words)}</td>
          </tr>
        </table>
      </div>
      <div class="note-wrap">
        <div class="border">
          <p>NOTE: </p>
          <p>1. Please check the receipt before leaving the window</p>
          <p>2. This is system generated receipt</p>
        </div>
      </div>
    </div>
  `;
}

export function buildExamFeeReceiptHtml(data: ExamFeePrintPayload): string {
  const body = `
    <div id="print-section">
      ${buildOneCopyHtml(data, "Student Copy")}
      <div class="cut-line"></div>
      ${buildOneCopyHtml(data, "Department Copy")}
    </div>
  `;
  return `<!doctype html><html><head><meta charset="utf-8"><title>EXAM FEE-RECEIPT</title><style>${PRINT_CSS}</style></head><body>${body}</body></html>`;
}

export function printExamFeeReceipt(data: ExamFeePrintPayload): void {
  const html = buildExamFeeReceiptHtml(data);

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

  const imgs = Array.from(fdoc.images);
  const waitForImages = imgs.length
    ? Promise.all(
        imgs.map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete) {
                resolve();
                return;
              }
              img.onload = () => resolve();
              img.onerror = () => resolve();
            }),
        ),
      )
    : Promise.resolve();

  void waitForImages.then(() => {
    setTimeout(() => {
      win.focus();
      win.print();
      setTimeout(cleanup, 1500);
    }, 100);
  });
}
