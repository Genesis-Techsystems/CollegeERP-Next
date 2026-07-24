"use client";

/**
 * Angular `student-fees/fee-payment/student-print-receipt`
 * → `StudentFeeReceiptPrintComponent`.
 * Screen: one 60% preview. Print: iframe with Angular-sized Student + Department copies.
 */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { MINIO_URL } from "@/config/constants/api";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import {
  FEE_RECEIPT_PRINT_PATH,
  feeAmountInWords,
  formatInrAmount,
  printStudentFeeReceipt,
  readFeeReceiptPrint,
  type FeeReceiptPrintData,
} from "../_lib/fee-receipt-print";

const DEFAULT_LOGO = "/assets/images/avatars/default_logo.png";

function logoSrc(path?: string): string {
  const p = String(path ?? "").trim();
  if (!p) return DEFAULT_LOGO;
  if (/^https?:\/\//i.test(p)) return p;
  return `${MINIO_URL}${p.replace(/^\/+/, "")}`;
}

function formatReceiptDateTime(value?: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return format(d, "dd/MM/yyyy,HH:mm:ss");
}

function pick(data: FeeReceiptPrintData, ...keys: string[]): string {
  for (const key of keys) {
    const v = data[key];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return "";
}

/** On-screen preview — Angular `.First-Border` at 60% width. */
function ReceiptPreview({ data }: { data: FeeReceiptPrintData }) {
  const [logoError, setLogoError] = useState(false);
  const collegeName = pick(data, "college_name", "collegeName") || "College";
  const address = pick(data, "address", "college_address");
  const logo = logoSrc(pick(data, "logo_path", "logoPath"));
  const paymentType = pick(data, "payment_type", "paymentType");
  const paymentMode = pick(data, "payment_mode", "paymentMode");
  const cardName = pick(data, "card_name", "cardName");
  const amount = pick(data, "receipt_amount", "receiptAmount") || "0";
  const branch = [
    pick(data, "course_code", "courseCode"),
    (() => {
      const g = pick(data, "group_code", "groupCode");
      const s = pick(data, "section");
      if (!g && !s) return "";
      return `(${[g, s].filter(Boolean).join("-")})`;
    })(),
  ]
    .filter(Boolean)
    .join(" ");
  const paymentTypeLine = [
    paymentType,
    paymentMode ? `(${paymentMode}${cardName ? ` -${cardName}` : ""})` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="relative mx-auto w-[60%] min-w-[420px] max-w-[780px] border-2 border-black bg-white text-black [border-radius:10px]">
      {!logoError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo}
          alt=""
          className="pointer-events-none absolute left-[40%] top-[30%] h-[54%] w-[26%] -translate-x-1/2 object-contain opacity-20"
          onError={() => setLogoError(true)}
        />
      ) : null}

      <div className="relative z-[1]">
        <div className="flex items-center border-b-2 border-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoError ? DEFAULT_LOGO : logo}
            alt=""
            className="h-[100px] w-[110px] shrink-0 object-contain p-2.5"
            onError={() => setLogoError(true)}
          />
          <div className="min-w-0 flex-1 text-center">
            <h2 className="m-1 text-[26px] font-bold uppercase leading-tight">
              {collegeName}
            </h2>
            {address ? (
              <h4 className="m-1 text-sm font-bold">{address}</h4>
            ) : null}
          </div>
        </div>

        <h3 className="m-0 py-2 text-center text-base font-bold">
          FEE-RECEIPT
        </h3>
        <hr className="mx-auto w-[90%] border-0 border-t-2 border-black" />

        <div className="grid grid-cols-2 gap-3 px-4 py-3 font-[Arial,Helvetica,sans-serif] text-[12px]">
          <table className="w-full border-collapse">
            <tbody>
              <InfoRow
                label="Receipt No"
                value={pick(data, "payment_receipts_no", "paymentReceiptsNo")}
              />
              <InfoRow
                label="Student Name"
                value={pick(data, "student_name", "studentName", "firstName")}
              />
              <InfoRow
                label="HallTicket No"
                value={pick(
                  data,
                  "hallticket_number",
                  "hallTicketNo",
                  "rollNumber",
                )}
              />
              <InfoRow label="Branch" value={branch} />
            </tbody>
          </table>
          <table className="w-full border-collapse">
            <tbody>
              <InfoRow
                label="Date"
                value={formatReceiptDateTime(
                  pick(data, "receipt_date", "receiptDt"),
                )}
              />
              <InfoRow
                label="Father Name"
                value={pick(data, "father_name", "fatherName")}
              />
              <InfoRow
                label="Year"
                value={pick(data, "year_name", "yearName", "courseYearName")}
              />
              <InfoRow label="Payment Type" value={paymentTypeLine} />
              <InfoRow
                label="Merchant Ref.No"
                value={pick(
                  data,
                  "transaction_no",
                  "transactionNo",
                  "referenceNumber",
                )}
              />
            </tbody>
          </table>
        </div>

        <div className="mx-auto w-[60%] px-3 pb-2">
          <table className="w-full border-collapse border border-black font-[Arial,Helvetica,sans-serif] text-[12px]">
            <thead>
              <tr>
                <th className="border border-black px-2 py-1 text-center font-semibold">
                  Details
                </th>
                <th className="border border-black px-2 py-1 text-center font-semibold">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th className="border border-black px-2 py-1 text-left font-semibold">
                  Amount Paid
                </th>
                <td className="border border-black px-2 py-1 text-right font-semibold">
                  ₹{formatInrAmount(amount)}
                </td>
              </tr>
              <tr>
                <th className="border border-black px-2 py-1 text-left font-semibold">
                  Amount In Words
                </th>
                <td className="border border-black px-2 py-1 text-right font-semibold">
                  {feeAmountInWords(amount)} Only
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="px-4 pb-3 pt-2">
          <div className="mx-auto w-[90%] border border-black px-2.5 py-1.5 font-[Arial,Helvetica,sans-serif] text-[12px] font-semibold">
            <p className="m-0 text-left">NOTE: </p>
            <p className="m-0 mt-0.5 text-left">
              1. Please check the receipt before leaving the window
            </p>
            <p className="m-0 text-left">
              2. This is system generated receipt
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <th className="w-[32%] py-1 pr-1 text-left align-top text-[12px] font-medium">
        {label}
      </th>
      <td className="w-[5%] py-1 align-top text-[12px] font-semibold">:</td>
      <td className="py-1 pl-1 align-top text-[12px] font-semibold">{value}</td>
    </tr>
  );
}

export function PrintFeeReceiptView() {
  const router = useRouter();
  const [data, setData] = useState<FeeReceiptPrintData | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readFeeReceiptPrint();
    setData(stored);
    setReady(true);
    if (!stored) {
      router.replace("/accounts-and-fees/fees-collection/payment/fee-payment");
    }
  }, [router]);

  const backHref = useMemo(() => {
    const fallback = "/accounts-and-fees/fees-collection/payment/fee-payment";
    if (!data) return fallback;
    const returnPath = pick(data, "returnPath");
    if (returnPath.startsWith("/")) return returnPath;

    const qs = new URLSearchParams();
    const sid = pick(data, "fk_student_id", "studentId");
    const roll = pick(data, "hallticket_number", "hallTicketNo", "rollNumber");
    if (sid) qs.set("studentId", sid);
    if (roll) qs.set("rollNumber", roll);
    const collegeId = pick(data, "collegeId");
    if (collegeId) qs.set("collegeId", collegeId);
    const q = qs.toString();
    return q ? `${fallback}?${q}` : fallback;
  }, [data]);

  if (!ready || !data) return null;

  return (
    <PageContainer className="space-y-4">
      <div className="overflow-hidden" data-no-page-name data-print-hide>
        <div className="px-1 py-1">
          <h1 className="text-base font-semibold text-black">Fee-Receipt</h1>
        </div>

        <div className="py-3">
          <ReceiptPreview data={data} />
        </div>

        <div className="flex justify-end gap-2 px-1 py-3">
          <Button
            type="button"
            className="h-9 min-w-[88px] bg-[#f0c040] px-5 text-[13px] font-medium text-slate-900 hover:bg-[#e5b535]"
            onClick={() => router.push(backHref)}
          >
            Back
          </Button>
          <Button
            type="button"
            className="h-9 min-w-[88px] bg-[#1565c0] px-5 text-[13px] font-medium text-white hover:bg-[#0d47a1]"
            onClick={() => printStudentFeeReceipt(data)}
          >
            Print
          </Button>
        </div>
      </div>

      <span className="sr-only">{FEE_RECEIPT_PRINT_PATH}</span>
    </PageContainer>
  );
}
