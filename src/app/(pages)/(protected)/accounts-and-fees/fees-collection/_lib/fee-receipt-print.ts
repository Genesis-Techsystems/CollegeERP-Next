/** Session key for Angular-parity fee receipt print page. */
import { MINIO_URL } from "@/config/constants/api";

export const FEE_RECEIPT_PRINT_KEY = "feeReceiptPrint";

export const FEE_RECEIPT_PRINT_PATH =
  "/accounts-and-fees/fees-collection/payment/pay-fees/print-fee-receipt";

/** Angular `fees-collection/fee-receipts/print-reciept`. */
export const FEE_RECEIPTS_PRINT_PATH =
  "/accounts-and-fees/fees-collection/fee-receipts/print-reciept";

export const FEE_RECEIPTS_LIST_PATH =
  "/accounts-and-fees/fees-collection/fee-receipts";

export type FeeReceiptPrintData = {
  payment_receipts_no?: string;
  receipt_date?: string;
  payment_mode?: string;
  payment_type?: string;
  card_name?: string;
  transaction_no?: string;
  receipt_amount?: number | string;
  college_name?: string;
  address?: string;
  logo_path?: string;
  student_name?: string;
  hallticket_number?: string;
  course_code?: string;
  group_code?: string;
  section?: string;
  father_name?: string;
  year_name?: string;
  fk_student_id?: number | string;
  collegeId?: number;
  /** Optional return path for Back (e.g. Fee Receipts list). */
  returnPath?: string;
  [key: string]: unknown;
};

export function storeFeeReceiptPrint(data: FeeReceiptPrintData): void {
  try {
    sessionStorage.setItem(FEE_RECEIPT_PRINT_KEY, JSON.stringify(data));
  } catch {
    // ignore storage failures
  }
}

export function readFeeReceiptPrint(): FeeReceiptPrintData | null {
  try {
    const raw = sessionStorage.getItem(FEE_RECEIPT_PRINT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as FeeReceiptPrintData;
  } catch {
    return null;
  }
}

/** Indian currency grouping without symbol (Angular currencySymbol). */
export function formatInrAmount(input: unknown): string {
  const n = Number(input);
  if (!Number.isFinite(n)) return "0";
  const result = n.toString().split(".");
  let lastThree = result[0].substring(result[0].length - 3);
  const otherNumbers = result[0].substring(0, result[0].length - 3);
  if (otherNumbers !== "") lastThree = `,${lastThree}`;
  let output = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree;
  if (result.length > 1) output += `.${result[1]}`;
  return output;
}

/** Angular numToWords for fee receipt amount. */
export function feeAmountInWords(num: unknown): string {
  const a = [
    "",
    "One ",
    "Two ",
    "Three ",
    "Four ",
    "Five ",
    "Six ",
    "Seven ",
    "Eight ",
    "Nine ",
    "Ten ",
    "Eleven ",
    "Twelve ",
    "Thirteen ",
    "Fourteen ",
    "Fifteen ",
    "Sixteen ",
    "Seventeen ",
    "Eighteen ",
    "Nineteen ",
  ];
  const b = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];
  const raw = String(Math.floor(Math.abs(Number(num) || 0)));
  if (raw.length > 9) return "overflow";
  const n = `000000000${raw}`
    .slice(-9)
    .match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return "";
  let str = "";
  str +=
    Number(n[1]) !== 0
      ? `${a[Number(n[1])] || `${b[Number(n[1][0])]} ${a[Number(n[1][1])]}`}Crore `
      : "";
  str +=
    Number(n[2]) !== 0
      ? `${a[Number(n[2])] || `${b[Number(n[2][0])]} ${a[Number(n[2][1])]}`}Lakh `
      : "";
  str +=
    Number(n[3]) !== 0
      ? `${a[Number(n[3])] || `${b[Number(n[3][0])]} ${a[Number(n[3][1])]}`}Thousand `
      : "";
  str +=
    Number(n[4]) !== 0
      ? `${a[Number(n[4])] || `${b[Number(n[4][0])]} ${a[Number(n[4][1])]}`}Hundred `
      : "";
  str +=
    Number(n[5]) !== 0
      ? `${str !== "" ? "and " : ""}${a[Number(n[5])] || `${b[Number(n[5][0])]} ${a[Number(n[5][1])]}`}`
      : "";
  return str.trim();
}

const DEFAULT_PRINT_LOGO = "/assets/images/avatars/default_logo.png";

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function pickPrint(data: FeeReceiptPrintData, ...keys: string[]): string {
  for (const key of keys) {
    const v = data[key];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return "";
}

function printLogoUrl(data: FeeReceiptPrintData): string {
  const path = pickPrint(data, "logo_path", "logoPath");
  if (!path) return DEFAULT_PRINT_LOGO;
  if (/^https?:\/\//i.test(path)) return path;
  return `${MINIO_URL}${path.replace(/^\/+/, "")}`;
}

function formatPrintDateTime(value?: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy},${hh}:${min}:${ss}`;
}

/**
 * Angular `student-fee-receipt-print.component.scss` — print sheet CSS.
 * Nearly full A4 width/height: Student + Department, minimal white space.
 */
const STUDENT_FEE_RECEIPT_PRINT_CSS = `
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
    flex: 0 0 55%;
    text-align: right;
  }
  .title-row .title-right {
    flex: 0 0 45%;
    text-align: right;
    padding: 17px;
    font-size: 13px;
  }
  .title-row h3 {
    text-align: center;
    font-weight: bold;
    margin: 0;
    font-size: 16px;
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
      height: 289mm; /* A4 297mm − ~8mm total margin */
    }
    .First-Border {
      page-break-inside: avoid;
      height: calc((289mm - 12px) / 2);
      max-height: calc((289mm - 12px) / 2);
    }
  }
`;

function buildOneStudentFeeReceiptHtml(
  data: FeeReceiptPrintData,
  copyLabel: "Student Copy" | "Department Copy",
): string {
  const e = escapeHtml;
  const logo = printLogoUrl(data);
  const college = pickPrint(data, "college_name", "collegeName") || "College";
  const address = pickPrint(data, "address", "college_address");
  const amount = pickPrint(data, "receipt_amount", "receiptAmount") || "0";
  const g = pickPrint(data, "group_code", "groupCode");
  const s = pickPrint(data, "section");
  const branchParts = [
    pickPrint(data, "course_code", "courseCode"),
    g || s ? `(${[g, s].filter(Boolean).join("-")})` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const paymentType = pickPrint(data, "payment_type", "paymentType");
  const paymentMode = pickPrint(data, "payment_mode", "paymentMode");
  const cardName = pickPrint(data, "card_name", "cardName");
  const paymentTypeLine = [
    paymentType,
    paymentMode ? `(${paymentMode}${cardName ? ` -${cardName}` : ""})` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const txn = pickPrint(
    data,
    "transaction_no",
    "transactionNo",
    "referenceNumber",
  );

  return `
    <div class="First-Border">
      <div class="firstborder">
        <img class="h-logo" src="${e(logo)}" alt=""
          onerror="this.onerror=null;this.src='${DEFAULT_PRINT_LOGO}';" />
        <div class="college-wrap">
          <h2>${e(college)}</h2>
          <h4>${e(address)}</h4>
        </div>
      </div>
      <div class="title-row">
        <div class="title-left"><h3>FEE-RECEIPT</h3></div>
        <div class="title-right"><span>${e(copyLabel)}</span></div>
      </div>
      <hr class="line" />
      <div class="main-card">
        <img class="img-2" src="${e(logo)}" alt=""
          onerror="this.style.display='none'" />
        <div class="col">
          <table>
            <tr><th>Receipt No</th><td class="dots">:</td><td>${e(pickPrint(data, "payment_receipts_no", "paymentReceiptsNo"))}</td></tr>
            <tr><th>Student Name</th><td class="dots">:</td><td>${e(pickPrint(data, "student_name", "studentName", "firstName"))}</td></tr>
            <tr><th>HallTicket No</th><td class="dots">:</td><td>${e(pickPrint(data, "hallticket_number", "hallTicketNo", "rollNumber"))}</td></tr>
            <tr><th>Branch</th><td class="dots">:</td><td>${e(branchParts)}</td></tr>
          </table>
        </div>
        <div class="col">
          <table>
            <tr><th>Date</th><td class="dots">:</td><td>${e(formatPrintDateTime(pickPrint(data, "receipt_date", "receiptDt")))}</td></tr>
            <tr><th>Father Name</th><td class="dots">:</td><td>${e(pickPrint(data, "father_name", "fatherName"))}</td></tr>
            <tr><th>Year</th><td class="dots">:</td><td>${e(pickPrint(data, "year_name", "yearName", "courseYearName"))}</td></tr>
            <tr><th>Payment Type</th><td class="dots">:</td><td>${e(paymentTypeLine)}</td></tr>
            <tr><th>Merchant Ref.No</th><td class="dots">:</td><td>${e(txn)}</td></tr>
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
            <th>Amount Paid</th>
            <td>₹${e(formatInrAmount(amount))}</td>
          </tr>
          <tr>
            <th>Amount In Words</th>
            <td>${e(feeAmountInWords(amount))} Only</td>
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

/** Angular `#print-section`: Student Copy + dashed cut + Department Copy. */
export function buildStudentFeeReceiptPrintHtml(
  data: FeeReceiptPrintData,
): string {
  const body = `
    <div id="print-section">
      ${buildOneStudentFeeReceiptHtml(data, "Student Copy")}
      <div class="cut-line"></div>
      ${buildOneStudentFeeReceiptHtml(data, "Department Copy")}
    </div>
  `;
  return `<!doctype html><html><head><meta charset="utf-8"><title>FEE-RECEIPT</title><style>${STUDENT_FEE_RECEIPT_PRINT_CSS}</style></head><body>${body}</body></html>`;
}

/**
 * Iframe print (same pattern as exam fee receipt) — avoids AppShell print
 * chrome and matches Angular student-fee-receipt-print size on one page.
 */
export function printStudentFeeReceipt(data: FeeReceiptPrintData): void {
  const html = buildStudentFeeReceiptPrintHtml(data);
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
