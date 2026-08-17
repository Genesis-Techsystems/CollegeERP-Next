"use client";

/**
 * Angular `apps/pay-status` + `pages/pay-status` — gateway return screen.
 * Loads PayPhi order details, then Done returns to `paymentRedirectUrl`
 * with orderStatus / paymentStatus query params.
 */
import { Suspense, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, XCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { getSecuredValue } from "@/common/generic-functions";
import { toastError } from "@/lib/toast";
import {
  getAdmissionStdPaymentOrderDetails,
  getDuePaymentOrderDetails,
  getUnivStdPaymentOrderDetails,
} from "@/services";

function pick(row: Record<string, unknown> | null | undefined, key: string) {
  if (!row) return "";
  const v = row[key];
  return v == null ? "" : String(v);
}

function formatAmount(value: unknown): string {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

function formatTxnDate(value: unknown): string {
  if (value == null || value === "") return "";
  try {
    const d =
      typeof value === "string" ? parseISO(value) : new Date(String(value));
    if (Number.isNaN(d.getTime())) {
      const fallback = new Date(String(value));
      if (Number.isNaN(fallback.getTime())) return String(value);
      return format(fallback, "d MMM, yyyy, h:mm:ss a");
    }
    return format(d, "d MMM, yyyy, h:mm:ss a");
  } catch {
    return String(value);
  }
}

function formatPrintDate(value: Date): string {
  return format(value, "dd/MM/yyyy");
}

function formatPrintTxnDate(value: unknown): string {
  if (value == null || value === "") return "";
  try {
    const d = new Date(String(value));
    if (Number.isNaN(d.getTime())) return String(value);
    return format(d, "EEEE, MMMM do yyyy, h:mm:ss a");
  } catch {
    return String(value);
  }
}

function PayStatusContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId") ?? "";
  const isUnivPayment = searchParams.get("isUnivPayment") ?? "";

  const {
    data: orderDetails,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["PayStatus", "order", orderId, isUnivPayment],
    queryFn: async () => {
      if (isUnivPayment === "treue") {
        return getUnivStdPaymentOrderDetails(orderId);
      }
      if (isUnivPayment === "true") {
        return getAdmissionStdPaymentOrderDetails(orderId);
      }
      return getDuePaymentOrderDetails(orderId);
    },
    enabled: Boolean(orderId),
  });

  const status = pick(orderDetails, "orderStatus");
  const isSuccess = status === "SUC";
  const isRejected = status === "REJ";

  const details = useMemo(() => {
    const row = orderDetails ?? {};
    return {
      amount: row.amount,
      collegeName: pick(row, "collegeName"),
      payerName: pick(row, "payerName"),
      studentRollNo: pick(row, "studentRollNo"),
      yearNo: pick(row, "yearNo"),
      examType: pick(row, "examType"),
      trackingId: pick(row, "trackingId"),
      bankRefNo: pick(row, "bankRefNo"),
      paymentMode: pick(row, "paymentMode"),
      paymentStatus: pick(row, "paymentStatus"),
      transDate: row.transDate,
      orderStatus: status,
    };
  }, [orderDetails, status]);

  useEffect(() => {
    if (isError) toastError(error, "Failed to load payment status");
  }, [isError, error]);

  function done() {
    const redirect = getSecuredValue<string>("paymentRedirectUrl");
    const stored = getSecuredValue<Record<string, string>>("payFeeDueDetails");
    if (!redirect) {
      router.push("/student-fees/fees-due");
      return;
    }
    const params = new URLSearchParams();
    if (stored && typeof stored === "object") {
      for (const [key, value] of Object.entries(stored)) {
        if (value != null && value !== "") params.set(key, String(value));
      }
    }
    params.set("orderId", orderId);
    if (details.paymentStatus)
      params.set("paymentStatus", details.paymentStatus);
    if (details.orderStatus) params.set("orderStatus", details.orderStatus);
    router.push(`${redirect}?${params.toString()}`);
  }

  function printReceipt() {
    const today = formatPrintDate(new Date());
    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Payment Receipt</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 16px; }
    .title { text-align: center; color: #000; font-size: 20px; margin: 10px; }
    .date { position: absolute; right: 12px; font-size: 14px; }
    table { margin-top: 45px; border-collapse: collapse; width: 100%; }
    td { padding: 6px 10px; border: 1px solid #ccc; }
  </style>
</head>
<body onload="window.print();window.close()">
  <div>
    <p class="title">Payment Receipt</p>
    <p class="title">${details.collegeName}</p>
    <p class="date">Date : ${today}</p>
    <table>
      <tbody>
        <tr><td>Student Name</td><td>${details.payerName}</td></tr>
        <tr><td>Roll No.</td><td>${details.studentRollNo}</td></tr>
        <tr><td>Payment For</td><td>${details.yearNo} Year</td></tr>
        <tr><td>Payment Amount</td><td>${details.amount ?? ""}</td></tr>
        <tr><td>Tracking Id</td><td>${details.trackingId}</td></tr>
        <tr><td>Payment Id</td><td>${details.bankRefNo}</td></tr>
        <tr><td>Payment Mode</td><td>${details.paymentMode}</td></tr>
        <tr><td>Payment Status</td><td>${details.paymentStatus}</td></tr>
        <tr><td>Transaction Date</td><td>${formatPrintTxnDate(details.transDate)}</td></tr>
      </tbody>
    </table>
  </div>
</body>
</html>`;
    const popup = window.open("?", "_blank", "");
    if (!popup) return;
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-[#f5f5f5] p-6">
      <div className="w-full max-w-md bg-white p-5 shadow-[0px_2px_1px_-1px_rgb(0_0_0_/_20%),0px_1px_1px_0px_rgb(0_0_0_/_14%),0px_1px_3px_0px_rgb(0_0_0_/_12%)]">
        {isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Loading payment status…
          </p>
        ) : (
          <table className="w-full text-[14px] leading-7">
            <tbody>
              <tr>
                <td colSpan={2} className="pb-2 text-center">
                  {isSuccess ? (
                    <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" />
                  ) : null}
                  {isRejected ? (
                    <XCircle className="mx-auto h-16 w-16 text-red-500" />
                  ) : null}
                </td>
              </tr>
              <tr>
                <td
                  colSpan={2}
                  className="text-center text-[20px] font-semibold"
                >
                  ₹{formatAmount(details.amount)}
                </td>
              </tr>
              <tr>
                <td colSpan={2} className="pb-3 text-center font-semibold">
                  {isSuccess
                    ? `Paid Successfully to ${details.collegeName}`
                    : isRejected
                      ? "Payment Cancelled."
                      : details.paymentStatus || "Payment status"}
                </td>
              </tr>
              <tr>
                <th className="pr-2 text-left font-normal">Student Name : </th>
                <td className="font-medium">
                  {details.payerName}
                  {details.studentRollNo ? ` (${details.studentRollNo})` : ""}
                </td>
              </tr>
              <tr>
                <th className="pr-2 text-left font-normal">Payment For : </th>
                <td className="font-medium">{details.yearNo} Year</td>
              </tr>
              {details.examType && details.examType !== "-" ? (
                <tr>
                  <th className="pr-2 text-left font-normal">Exam Type : </th>
                  <td className="font-medium">{details.examType}</td>
                </tr>
              ) : null}
              <tr>
                <th className="pr-2 text-left font-normal">Tracking Id : </th>
                <td className="font-medium">{details.trackingId}</td>
              </tr>
              {details.bankRefNo && details.bankRefNo !== "-" ? (
                <tr>
                  <th className="pr-2 text-left font-normal">Payment Id : </th>
                  <td className="font-medium">{details.bankRefNo}</td>
                </tr>
              ) : null}
              {details.paymentMode && details.paymentMode !== "-" ? (
                <tr>
                  <th className="pr-2 text-left font-normal">
                    Payment Mode :{" "}
                  </th>
                  <td className="font-medium">{details.paymentMode}</td>
                </tr>
              ) : null}
              <tr>
                <th className="pr-2 text-left font-normal">
                  Payment Status :{" "}
                </th>
                <td className="font-medium">{details.paymentStatus}</td>
              </tr>
              <tr>
                <th className="pr-2 text-left font-normal">
                  Transaction Date :{" "}
                </th>
                <td className="font-medium">
                  {formatTxnDate(details.transDate)}
                </td>
              </tr>
            </tbody>
          </table>
        )}

        <div className="mt-4 flex justify-center gap-5">
          <Button
            type="button"
            className="h-9 bg-[#1091ff] px-5 text-white hover:bg-[#0d7de0]"
            onClick={done}
          >
            Done
          </Button>
          <Button
            type="button"
            className="h-9 bg-[#fdd835] px-5 text-slate-900 hover:bg-[#f6cf2a]"
            onClick={printReceipt}
          >
            Print
          </Button>
        </div>
      </div>
    </div>
  );
}

export function PayStatusPage() {
  return (
    <Suspense fallback={null}>
      <PayStatusContent />
    </Suspense>
  );
}
