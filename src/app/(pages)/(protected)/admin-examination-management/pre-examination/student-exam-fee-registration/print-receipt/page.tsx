"use client";

/**
 * Angular parity: print-regular-exam-fee-receipt — EXAM FEE-RECEIPT print view.
 * Screen preview shows Student Copy only; Print outputs Student + Department on one page.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  clearExamFeePrintPayload,
  clearExamFeePrintReturnHref,
  examFeeCollectionReturnHref,
  loadExamFeePrintPayload,
  type ExamFeePrintPayload,
} from "../_print/store";
import { currencySymbol, fmtDate, numToWords } from "../_print/money";
import {
  DEFAULT_EXAM_FEE_LOGO,
  printExamFeeReceipt,
  resolveExamFeeLogo,
} from "../_print/receipt-print";

function ReceiptCopy({
  data,
  copyLabel,
}: {
  data: ExamFeePrintPayload;
  copyLabel: "Student Copy" | "Department Copy";
}) {
  const logoSrc = resolveExamFeeLogo(data);

  const paymentType = `${data.paymentModeCatCode ?? data.paymentModeCatDisplayName ?? ""}${
    data.paymentMode
      ? ` (${data.paymentMode}${data.cardName ? ` -${data.cardName}` : ""})`
      : ""
  }`;

  const branch = `${data.courseCode ?? ""} (${data.groupCode ?? ""}${
    data.section ? `-${data.section}` : ""
  })`;

  return (
    <div className="relative overflow-hidden rounded-[10px] border-2 border-black bg-white font-[Arial,Helvetica,sans-serif] text-black">
      <div className="flex w-full items-center border-b-2 border-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          alt="logo"
          className="h-[100px] w-[110px] shrink-0 object-contain p-2.5"
          onError={(e) => {
            (e.target as HTMLImageElement).src = DEFAULT_EXAM_FEE_LOGO;
          }}
        />
        <div className="min-w-0 flex-1 px-3 text-center">
          <h2 className="m-1 text-[26px] font-bold uppercase leading-tight">
            {data.collegeName ?? ""}
          </h2>
          <h4 className="m-1 text-[14px] font-bold">{data.address ?? ""}</h4>
        </div>
      </div>

      <div className="flex w-full items-center">
        <div className="w-[62%] text-right">
          <h3 className="m-0 text-center text-[16px] font-bold underline">
            EXAM FEE-RECEIPT
          </h3>
        </div>
        <div className="w-[38%] p-[17px] text-right text-[13px]">
          {copyLabel}
        </div>
      </div>

      <hr className="mx-auto mb-1 h-px w-[90%] border-0 bg-black" />

      <div className="relative flex gap-2 p-[15px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          alt=""
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[45%] z-0 h-[55%] max-h-[160px] w-[40%] -translate-x-1/2 -translate-y-1/2 object-contain opacity-20"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
        <div className="relative z-[1] min-w-0 flex-1">
          <table className="w-full border-collapse text-[13px]">
            <tbody>
              <tr>
                <th className="w-[30%] py-0.5 text-left text-[12px] font-medium">
                  Receipt No
                </th>
                <td className="w-[5%] text-center font-semibold">:</td>
                <td className="py-0.5 text-left font-semibold">
                  {data.feeReceiptNo ?? ""}
                </td>
              </tr>
              <tr>
                <th className="py-0.5 text-left text-[12px] font-medium">
                  Student Name
                </th>
                <td className="text-center font-semibold">:</td>
                <td className="py-0.5 font-semibold">{data.stdName ?? ""}</td>
              </tr>
              <tr>
                <th className="py-0.5 text-left text-[12px] font-medium">
                  HallTicket No
                </th>
                <td className="text-center font-semibold">:</td>
                <td className="py-0.5 font-semibold">
                  {data.stdRollNumber ?? ""}
                </td>
              </tr>
              <tr>
                <th className="py-0.5 text-left text-[12px] font-medium">
                  Branch
                </th>
                <td className="text-center font-semibold">:</td>
                <td className="py-0.5 font-semibold">{branch}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="relative z-[1] min-w-0 flex-1">
          <table className="w-full border-collapse text-[13px]">
            <tbody>
              <tr>
                <th className="w-[30%] py-0.5 text-left text-[12px] font-medium">
                  Date
                </th>
                <td className="w-[5%] text-center font-semibold">:</td>
                <td className="py-0.5 font-semibold">
                  {fmtDate(data.receiptDate, true)}
                </td>
              </tr>
              <tr>
                <th className="py-0.5 text-left text-[12px] font-medium">
                  Father Name
                </th>
                <td className="text-center font-semibold">:</td>
                <td className="py-0.5 font-semibold">
                  {data.stdFatherName ?? ""}
                </td>
              </tr>
              <tr>
                <th className="py-0.5 text-left text-[12px] font-medium">
                  Year
                </th>
                <td className="text-center font-semibold">:</td>
                <td className="py-0.5 font-semibold">
                  {data.courseYearName ?? ""}
                </td>
              </tr>
              <tr>
                <th className="py-0.5 text-left text-[12px] font-medium">
                  Payment Type
                </th>
                <td className="text-center font-semibold">:</td>
                <td className="py-0.5 font-semibold">{paymentType}</td>
              </tr>
              <tr>
                <th className="py-0.5 text-left text-[12px] font-medium">
                  Merchant Ref.No
                </th>
                <td className="text-center font-semibold">:</td>
                <td className="py-0.5 font-semibold">
                  {data.transactionNo ?? ""}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-center px-2 pb-2">
        <table className="w-[60%] border-collapse border border-black text-[12px]">
          <tbody>
            <tr>
              <th className="border border-black px-2 py-0.5 text-center font-semibold">
                Details
              </th>
              <th className="border border-black px-2 py-0.5 text-center font-semibold">
                Amount
              </th>
            </tr>
            <tr>
              <th className="border border-black px-1.5 py-0.5 text-left font-semibold">
                Exam Fee
                {data.examtypeCatDisplayName
                  ? ` (${data.examtypeCatDisplayName})`
                  : ""}
              </th>
              <td className="border border-black px-1.5 py-0.5 text-right font-medium">
                {data.examFeeAmount ?? ""}
              </td>
            </tr>
            <tr>
              <th className="border border-black px-1.5 py-0.5 text-left font-semibold">
                Add. Fee
              </th>
              <td className="border border-black px-1.5 py-0.5 text-right font-medium">
                {data.examAddtFee ?? ""}
              </td>
            </tr>
            <tr>
              <th className="border border-black px-1.5 py-0.5 text-left font-semibold">
                LateFee
              </th>
              <td className="border border-black px-1.5 py-0.5 text-right font-medium">
                {data.examFineAmount ?? ""}
              </td>
            </tr>
            <tr>
              <th className="border border-black px-1.5 py-0.5 text-left font-semibold">
                Amount Paid
              </th>
              <td className="border border-black px-1.5 py-0.5 text-right font-medium">
                {data.examTotalAmount != null
                  ? `₹${currencySymbol(data.examTotalAmount)}`
                  : ""}
              </td>
            </tr>
            <tr>
              <th className="border border-black px-1.5 py-0.5 text-left font-semibold">
                Amount In Words
              </th>
              <td className="border border-black px-1.5 py-0.5 text-left font-medium">
                {data.examTotalAmount != null
                  ? `${numToWords(data.examTotalAmount)} Only`
                  : ""}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="px-[15px] pb-[15px]">
        <div className="mx-auto w-[90%] border border-black">
          <p className="mb-0 ml-2.5 mt-0 text-left text-[12px] font-semibold">
            NOTE:
          </p>
          <p className="mb-0 ml-2.5 mt-0 text-left text-[12px] font-semibold">
            1. Please check the receipt before leaving the window
          </p>
          <p className="mb-0 ml-2.5 mt-0 text-left text-[12px] font-semibold">
            2. This is system generated receipt
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PrintExamFeeReceiptPage() {
  const router = useRouter();
  const [data, setData] = useState<ExamFeePrintPayload | null>(null);

  useEffect(() => {
    const payload = loadExamFeePrintPayload();
    if (!payload) {
      router.replace(examFeeCollectionReturnHref(null));
      return;
    }
    setData(payload);
  }, [router]);

  function goBack() {
    const href = examFeeCollectionReturnHref(data);
    clearExamFeePrintPayload();
    clearExamFeePrintReturnHref();
    router.replace(href);
  }

  function onPrint() {
    if (!data) return;
    printExamFeeReceipt(data);
  }

  if (!data) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Loading receipt…</div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-4" data-print-root>
      {/* Screen: Student Copy only. Print button uses iframe with both copies. */}
      <div id="printsection" className="space-y-0">
        <ReceiptCopy data={data} copyLabel="Student Copy" />
      </div>

      <div className="mt-4 flex justify-end gap-2 print:hidden">
        <Button type="button" variant="outline" onClick={goBack}>
          Back
        </Button>
        <Button type="button" onClick={onPrint}>
          Print
        </Button>
      </div>
    </div>
  );
}
