/** Session key for Angular-parity fee receipt print page. */
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
