"use client";

/**
 * Angular `student-reevaluation-registration/print-re-evaluation-receipt`.
 */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { MINIO_URL } from "@/config/constants/api";
import {
  currencySymbol,
  numToWords,
} from "@/app/(pages)/(protected)/admin-examination-management/pre-examination/student-exam-fee-registration/_print/money";
import { loadReEvalReceiptPrintPayload } from "../_print/store";

const DEFAULT_LOGO = "/assets/images/avatars/default_logo.png";

function pick(data: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const val = String(data[key] ?? "").trim();
    if (val) return val;
  }
  return "";
}

function fmtDateTime(value: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy},${hh}:${mi}:${ss}`;
}

function logoSrc(data: Record<string, unknown>): string {
  const path = pick(data, ["u_logo_filename", "uLogoFilename", "logoPath"]);
  if (!path) return DEFAULT_LOGO;
  if (/^https?:\/\//i.test(path)) return path;
  return `${MINIO_URL}${path}`;
}

function ReceiptCopy({
  data,
  copyLabel,
}: {
  data: Record<string, unknown>;
  copyLabel?: string;
}) {
  const logo = logoSrc(data);
  const total = data.exam_total_amount ?? data.examTotalAmount;
  const fee = data.exam_fee_amount ?? data.examFeeAmount;
  const addt = data.exam_addt_fee ?? data.examAddtFee;
  const late = data.exam_fine_amount ?? data.examFineAmount;
  const examType = pick(data, ["exam_type_name", "examTypeName"]);
  const payment = pick(data, ["payment_mode", "paymentMode"]);
  const branch = `${pick(data, ["course_code", "courseCode"])} (${pick(data, ["group_code", "groupCode"])}-${pick(data, ["section"])})`;

  return (
    <div className="reeval-print-copy">
      <div className="flex w-full items-center border-b-2 border-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logo}
          alt=""
          className="h-[90px] w-[100px] object-contain p-2"
          onError={(e) => {
            (e.target as HTMLImageElement).src = DEFAULT_LOGO;
          }}
        />
        <div className="flex-1 px-3 text-center">
          <h2 className="m-1 text-[22px] font-bold uppercase">
            {pick(data, ["college_name", "collegeName"])}
          </h2>
          <h4 className="m-1 text-[13px]">
            {pick(data, ["u_address", "address"])}
          </h4>
        </div>
      </div>
      <div className="flex items-center">
        <h3 className="m-0 flex-1 text-center text-[16px] font-bold">
          EXAM FEE-RECEIPT
        </h3>
        {copyLabel ? (
          <span className="w-[38%] p-4 text-right text-[13px]">
            {copyLabel}
          </span>
        ) : null}
      </div>
      <hr className="mx-auto mb-2 h-px w-[90%] border-0 bg-black" />
      <div className="grid grid-cols-2 gap-4 p-4 text-[13px]">
        <table>
          <tbody>
            <tr>
              <th className="w-[40%] text-left font-medium">Receipt No</th>
              <td>:</td>
              <td>{pick(data, ["fee_receipt_no", "feeReceiptNo"])}</td>
            </tr>
            <tr>
              <th className="text-left font-medium">Student Name</th>
              <td>:</td>
              <td>{pick(data, ["student_name", "studentName"])}</td>
            </tr>
            <tr>
              <th className="text-left font-medium">HallTicket No</th>
              <td>:</td>
              <td>{pick(data, ["hallticket_number", "hallticketNumber"])}</td>
            </tr>
            <tr>
              <th className="text-left font-medium">Branch</th>
              <td>:</td>
              <td>{branch}</td>
            </tr>
          </tbody>
        </table>
        <table>
          <tbody>
            <tr>
              <th className="w-[40%] text-left font-medium">Date</th>
              <td>:</td>
              <td>
                {fmtDateTime(pick(data, ["receipt_date", "receiptDate"]))}
              </td>
            </tr>
            <tr>
              <th className="text-left font-medium">Father Name</th>
              <td>:</td>
              <td>{pick(data, ["father_name", "fatherName"])}</td>
            </tr>
            <tr>
              <th className="text-left font-medium">Year</th>
              <td>:</td>
              <td>{pick(data, ["course_year_code", "courseYearCode"])}</td>
            </tr>
            <tr>
              <th className="text-left font-medium">Payment Type</th>
              <td>:</td>
              <td>
                {payment}
                {payment ? ` (${payment})` : ""}
              </td>
            </tr>
            <tr>
              <th className="text-left font-medium">Merchant Ref.No</th>
              <td>:</td>
              <td>{pick(data, ["transaction_no", "transactionNo"])}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="mx-auto mb-3 w-[60%]">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              <th className="border border-black p-1 text-center">Details</th>
              <th className="border border-black p-1 text-center">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th className="border border-black p-1 text-left font-semibold">
                Exam Fee{examType ? ` (${examType})` : ""}
              </th>
              <td className="border border-black p-1">
                {fee == null || fee === "" ? "" : String(fee)}
              </td>
            </tr>
            <tr>
              <th className="border border-black p-1 text-left font-semibold">
                Add. Fee
              </th>
              <td className="border border-black p-1">
                {addt == null || addt === "" ? "" : String(addt)}
              </td>
            </tr>
            <tr>
              <th className="border border-black p-1 text-left font-semibold">
                LateFee
              </th>
              <td className="border border-black p-1">
                {late == null || late === "" ? "" : String(late)}
              </td>
            </tr>
            <tr>
              <th className="border border-black p-1 text-left font-semibold">
                Amount Paid
              </th>
              <td className="border border-black p-1">
                {total == null || total === ""
                  ? ""
                  : `₹${currencySymbol(total)}`}
              </td>
            </tr>
            <tr>
              <th className="border border-black p-1 text-left font-semibold">
                Amount In Words
              </th>
              <td className="border border-black p-1">
                {total == null || total === ""
                  ? ""
                  : `${numToWords(total)} Only`}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="border border-black p-2.5 text-[13px]">
        <p className="m-0">NOTE:</p>
        <p className="mt-1">
          1. Please check the receipt before leaving the window
        </p>
        <p className="mt-1">2. This is system generated receipt</p>
      </div>
    </div>
  );
}

export default function PrintReEvaluationReceiptPage() {
  const router = useRouter();
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const payload = loadReEvalReceiptPrintPayload();
    if (!payload) {
      router.replace("/examination-section/student-reevaluation-registration");
      return;
    }
    setData(payload);
  }, [router]);

  const screenCopy = useMemo(() => data, [data]);

  if (!screenCopy) {
    return (
      <PageContainer>
        <p className="text-sm text-muted-foreground">Loading receipt…</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="app-card overflow-hidden" data-no-page-name>
        <div className="flex items-center gap-2 border-b-2 border-[#ffcf46] px-6 py-3.5">
          <span className="material-icons text-[20px] text-[#042956]">
            ballot
          </span>
          <strong className="text-[16px] font-medium text-[#042956]">
            Exam Fee-Receipt
          </strong>
        </div>
        <div className="flex justify-center p-4">
          <div className="w-full max-w-[820px]">
            <ReceiptCopy data={screenCopy} />
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 print:hidden">
          <Button
            variant="outline"
            onClick={() =>
              router.push(
                "/examination-section/student-reevaluation-registration",
              )
            }
          >
            Back
          </Button>
          <Button
            className="bg-[#042956] text-white hover:bg-[#031f40]"
            onClick={() => window.print()}
          >
            Print
          </Button>
        </div>
      </div>

      <div className="hidden print:block">
        <ReceiptCopy data={screenCopy} copyLabel="Student Copy" />
        <div className="my-3 border-t border-dashed border-black" />
        <ReceiptCopy data={screenCopy} copyLabel="Department Copy" />
      </div>
    </PageContainer>
  );
}
