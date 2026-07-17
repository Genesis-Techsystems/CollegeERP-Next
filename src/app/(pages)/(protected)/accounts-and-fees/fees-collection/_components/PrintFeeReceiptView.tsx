"use client";

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
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return format(d, "dd/MM/yyyy, HH:mm:ss");
}

function pick(data: FeeReceiptPrintData, ...keys: string[]): string {
  for (const key of keys) {
    const v = data[key];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return "";
}

function ReceiptDocument({
  data,
  copyLabel,
}: {
  data: FeeReceiptPrintData;
  copyLabel?: string;
}) {
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
    <div className="fee-receipt-doc relative mx-auto w-full max-w-[720px] border-2 border-black bg-white p-4 text-black">
      {/* watermark */}
      {!logoError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo}
          alt=""
          className="pointer-events-none absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 opacity-[0.08]"
          onError={() => setLogoError(true)}
        />
      ) : null}

      <div className="relative z-[1]">
        <div className="flex items-start gap-3 border-b-2 border-black pb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoError ? DEFAULT_LOGO : logo}
            alt=""
            className="h-16 w-16 shrink-0 rounded-full object-contain"
            onError={() => setLogoError(true)}
          />
          <div className="min-w-0 flex-1 text-center">
            <h2 className="font-serif text-xl font-bold tracking-wide md:text-2xl">
              {collegeName}
            </h2>
            {address ? <p className="mt-1 text-sm">{address}</p> : null}
          </div>
        </div>

        <div className="relative mt-3 flex items-center justify-center">
          <h3 className="text-center text-base font-bold underline underline-offset-4">
            FEE-RECEIPT
          </h3>
          {copyLabel ? (
            <span className="absolute right-0 text-xs text-slate-600">
              {copyLabel}
            </span>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 text-[13px] sm:grid-cols-2">
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
                label="Merchant Ref. No"
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

        <div className="mx-auto mt-5 w-full max-w-md">
          <table className="w-full border-collapse border border-black text-[13px]">
            <thead>
              <tr className="border-b border-black">
                <th className="border-r border-black px-3 py-2 text-center font-semibold">
                  Details
                </th>
                <th className="px-3 py-2 text-center font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-black">
                <th className="border-r border-black px-3 py-2 text-left font-semibold">
                  Amount Paid
                </th>
                <td className="px-3 py-2 text-right">
                  ₹{formatInrAmount(amount)}
                </td>
              </tr>
              <tr>
                <th className="border-r border-black px-3 py-2 text-left font-semibold">
                  Amount In Words
                </th>
                <td className="px-3 py-2 text-right">
                  {feeAmountInWords(amount)} Only
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-5 border border-black p-3 text-[12px]">
          <p className="font-semibold">NOTE:</p>
          <p className="mt-1">
            1. Please check the receipt before leaving the window
          </p>
          <p>2. This is system generated receipt</p>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <th className="py-1 pr-2 text-left font-semibold align-top whitespace-nowrap">
        {label}
      </th>
      <td className="py-1 px-1 align-top">:</td>
      <td className="py-1 pl-1 align-top">{value || "—"}</td>
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
      <style>{`
        .fee-receipt-print-only { display: none !important; }
        @media print {
          @page { size: A4 portrait; margin: 8mm; }
          body * { visibility: hidden !important; }
          .fee-receipt-print-area, .fee-receipt-print-area * { visibility: visible !important; }
          .fee-receipt-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 0 !important;
          }
          .fee-receipt-print-only { display: block !important; }
          .fee-receipt-copies {
            display: flex !important;
            flex-direction: column !important;
            gap: 4mm !important;
          }
          .fee-receipt-doc {
            max-width: none !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .fee-receipt-no-print { display: none !important; }
        }
      `}</style>

      {/* One page title only. data-no-page-name blocks AppShell's extra injected label. */}
      <div className="overflow-hidden" data-no-page-name>
        <div className="px-1 py-1">
          <h1 className="text-base font-semibold text-black">Fee-Receipt</h1>
        </div>

        <div className="fee-receipt-print-area py-3">
          <div className="fee-receipt-copies mx-auto flex max-w-[720px] flex-col gap-4">
            <ReceiptDocument data={data} copyLabel="Student Copy" />
            <div className="fee-receipt-print-only">
              <ReceiptDocument data={data} copyLabel="Department Copy" />
            </div>
          </div>
        </div>

        <div className="fee-receipt-no-print flex justify-end gap-2 px-1 py-3">
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
            onClick={() => window.print()}
          >
            Print
          </Button>
        </div>
      </div>

      {/* Keep path stable for deep links / refresh after store */}
      <span className="sr-only">{FEE_RECEIPT_PRINT_PATH}</span>
    </PageContainer>
  );
}
