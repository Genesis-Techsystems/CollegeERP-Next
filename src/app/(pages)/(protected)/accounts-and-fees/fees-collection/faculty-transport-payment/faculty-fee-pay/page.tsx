"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import { Printer } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DatePicker } from "@/common/components/date-picker";
import { ConfirmDialog } from "@/common/components/feedback";
import { Select } from "@/common/components/select";
import { FilteredPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DATE_FORMATS } from "@/config/constants/app";
import { QK } from "@/lib/query-keys";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import {
  formatTransportTime,
  referenceFieldForPaymentMode,
} from "../../_lib/pay-fees-mode";
import {
  getFeePaymentLookups,
  listFeeReceiptsForEmployee,
  listTransportFeePayments,
  printFeeReceiptById,
  submitTransportPayment,
} from "@/services";
import type {
  FeeReceiptRow,
  TransportFeePaymentRow,
  TransportPaymentPayload,
} from "@/types/fees-collection";

const DEFAULT_PHOTO = "/assets/images/avatars/default_Student.png";
const DEFAULT_PAYMENT_MODE_ID = 131;
const LIST_HREF =
  "/accounts-and-fees/fees-collection/faculty-transport-payment";

function isEmptyParams(qs: URLSearchParams): boolean {
  return qs.toString().trim() === "";
}

function money(n: number | undefined | null): string {
  return Number(n ?? 0).toFixed(2);
}

function formatReceiptDate(value?: string): string {
  if (!value) return "—";
  try {
    const d = value.includes("T") ? parseISO(value) : new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return format(d, DATE_FORMATS.DISPLAY);
  } catch {
    return value;
  }
}

function receiptRef(row: FeeReceiptRow): string {
  return (
    String(
      row.referenceNumber ??
        row.transactionNo ??
        row.ddno ??
        row.chequeNo ??
        "",
    ) || "—"
  );
}

function buildPaymentFor(qs: URLSearchParams): string {
  const pickup = qs.get("routePickupPlace") ?? "";
  const drop = qs.get("routeDropPlace") ?? "";
  const code = qs.get("routeCode") ?? "";
  const pickTime = formatTransportTime(qs.get("pickTime") ?? undefined);
  const dropTime = formatTransportTime(qs.get("dropTime") ?? undefined);
  if (!pickup && !drop && !code) return "Transport";
  return `Transport (${pickup} ${pickTime} - ${drop} ${dropTime} / ${code})`;
}

function FacultyFeePayContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const collegeId = Number(searchParams.get("collegeId") ?? 0);
  const employeeId = Number(searchParams.get("employeeId") ?? 0);
  const academicYearId = Number(searchParams.get("academicYearId") ?? 0);
  const transportAllocationId = Number(
    searchParams.get("transportAllocationId") ?? 0,
  );

  const [paymentModeId, setPaymentModeId] = useState<number | null>(
    DEFAULT_PAYMENT_MODE_ID,
  );
  const [paymentTypeId, setPaymentTypeId] = useState<number | null>(null);
  const [receiptDt, setReceiptDt] = useState<Date | null>(new Date());
  const [paymentFor, setPaymentFor] = useState("");
  const [fineReason, setFineReason] = useState("");
  const [amount, setAmount] = useState(0);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [transactionNo, setTransactionNo] = useState("");
  const [chequeNo, setChequeNo] = useState("");
  const [ddno, setDdno] = useState("");
  const [otherPaymentNumber, setOtherPaymentNumber] = useState("");
  const [rows, setRows] = useState<TransportFeePaymentRow[]>([]);
  const [canPay, setCanPay] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [paying, setPaying] = useState(false);

  const lookupsQuery = useQuery({
    queryKey: QK.feesCollection.payLookups(),
    queryFn: getFeePaymentLookups,
  });

  const paymentsQuery = useQuery({
    queryKey: QK.feesCollection.transportFeePayments(
      transportAllocationId,
      employeeId,
    ),
    queryFn: () =>
      listTransportFeePayments({ transportAllocationId, employeeId }),
    enabled: transportAllocationId > 0 && employeeId > 0,
  });

  const receiptsQuery = useQuery({
    queryKey: QK.feesCollection.employeeFeeReceipts(
      collegeId,
      employeeId,
      academicYearId,
    ),
    queryFn: () =>
      listFeeReceiptsForEmployee({ collegeId, employeeId, academicYearId }),
    enabled: collegeId > 0 && employeeId > 0 && academicYearId > 0,
  });

  useEffect(() => {
    if (paymentsQuery.isError) {
      toastError(paymentsQuery.error, "Failed to load transport fee payment");
    }
  }, [paymentsQuery.isError, paymentsQuery.error]);

  useEffect(() => {
    if (receiptsQuery.isError) {
      toastError(receiptsQuery.error, "Failed to load fee receipts");
    }
  }, [receiptsQuery.isError, receiptsQuery.error]);

  useEffect(() => {
    const list = paymentsQuery.data ?? [];
    setRows(list.map((r) => ({ ...r, amount: undefined })));
    if (list.length > 0 && Number(list[0].balanceAmount ?? 0) > 0) {
      setCanPay(false);
      setPaymentFor(buildPaymentFor(searchParams));
    } else {
      setCanPay(true);
    }
  }, [paymentsQuery.data, searchParams]);

  const modeOptions = useMemo(
    () =>
      (lookupsQuery.data?.paymentModes ?? []).map((m) => ({
        value: String(m.generalDetailId),
        label: String(m.generalDetailDisplayName ?? m.generalDetailCode ?? ""),
      })),
    [lookupsQuery.data?.paymentModes],
  );

  const typeOptions = useMemo(
    () =>
      (lookupsQuery.data?.paymentTypes ?? []).map((t) => ({
        value: String(t.generalDetailId),
        label: String(t.generalDetailDisplayName ?? t.generalDetailCode ?? ""),
      })),
    [lookupsQuery.data?.paymentTypes],
  );

  const refField = referenceFieldForPaymentMode(paymentModeId);
  const hasBalance =
    rows.length > 0 && Number(rows[0]?.balanceAmount ?? 0) > 0;
  const feeReceipts = receiptsQuery.data ?? [];

  function onRowAmountChange(index: number, raw: string) {
    const nextAmount = Number(raw);
    setRows((prev) => {
      const copy = [...prev];
      const item = { ...copy[index] };
      let value = Number.isFinite(nextAmount) ? nextAmount : 0;
      const bal = Number(item.balanceAmount ?? 0);
      if (value > bal) {
        toastInfo("Pay amount should be less than balance amount.");
        value =
          Number(item.grossAmount ?? 0) -
          Number(item.discountAmount ?? item.discount ?? 0) -
          Number(item.paidAmount ?? 0);
      }
      item.amount = value;
      copy[index] = item;

      if (value > 0) {
        setCanPay(true);
        setPaymentFor(buildPaymentFor(searchParams));
      } else {
        setCanPay(false);
      }
      return copy;
    });
  }

  function clearForm() {
    setPaymentModeId(DEFAULT_PAYMENT_MODE_ID);
    setChequeNo("");
    setReferenceNumber("");
    setOtherPaymentNumber("");
    setTransactionNo("");
    setDdno("");
    setPaymentTypeId(null);
    setAmount(0);
    setPaymentFor("");
    setFineReason("");
    setReceiptDt(new Date());
  }

  function goBack() {
    const back = new URLSearchParams();
    if (employeeId) back.set("employeeId", String(employeeId));
    if (collegeId) back.set("collegeId", String(collegeId));
    const firstName = searchParams.get("firstName");
    if (firstName) back.set("empName", firstName);
    const qs = back.toString();
    router.push(qs ? `${LIST_HREF}?${qs}` : LIST_HREF);
  }

  function preparePay() {
    if (!canPay || !paymentTypeId || !paymentModeId) {
      toastInfo("Please complete payment details and pay amount.");
      return;
    }
    if (!(Number(amount) > 0)) {
      toastInfo("Enter payment amount.");
      return;
    }
    setConfirmOpen(true);
  }

  async function confirmPay() {
    if (!paymentTypeId || !paymentModeId) return;
    setPaying(true);
    try {
      let notes = paymentFor;
      if (fineReason.trim()) {
        notes = `${notes} - ${fineReason.trim()}`;
      }

      const payerTypeId = (lookupsQuery.data?.payerTypes ?? []).find(
        (p) => String(p.generalDetailCode ?? "").toUpperCase() === "EMP",
      )?.generalDetailId;

      const payload: TransportPaymentPayload = {
        paymentFor: notes,
        fineReason: fineReason || undefined,
        receiptDt: receiptDt ? format(receiptDt, "yyyy-MM-dd") : undefined,
        amount: Number(amount),
        paymentTypeId: Number(paymentTypeId),
        paymentModeId: Number(paymentModeId),
        transactionNo: transactionNo || undefined,
        otherPaymentNumber: otherPaymentNumber || undefined,
        referenceNumber: referenceNumber || undefined,
        ddno: ddno || undefined,
        chequeNo: chequeNo || undefined,
        collegeId,
        academicYearId,
        employeeId,
        receiptAmount: Number(amount),
        allocationId: transportAllocationId,
        revertbByEmployeeId:
          globalThis?.localStorage?.getItem("employeeId") ?? undefined,
        payerTypeId: payerTypeId ? Number(payerTypeId) : undefined,
        collegeCode: searchParams.get("collegeCode") ?? undefined,
        firstName: searchParams.get("firstName") ?? undefined,
        payerName: searchParams.get("firstName") ?? undefined,
      };

      await submitTransportPayment(payload);
      toastSuccess("Payment successful.");
      setConfirmOpen(false);
      clearForm();
      setCanPay(false);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: QK.feesCollection.transportFeePayments(
            transportAllocationId,
            employeeId,
          ),
        }),
        queryClient.invalidateQueries({
          queryKey: QK.feesCollection.employeeFeeReceipts(
            collegeId,
            employeeId,
            academicYearId,
          ),
        }),
      ]);
    } catch (e) {
      toastError(e, "Payment failed");
    } finally {
      setPaying(false);
    }
  }

  async function onPrint(row: FeeReceiptRow) {
    const receiptId = Number(row.feeReceiptsId ?? 0);
    if (!receiptId) {
      toastInfo("Receipt id not available.");
      return;
    }
    try {
      await printFeeReceiptById(receiptId);
    } catch (e) {
      toastError(e, "Unable to print receipt");
    }
  }

  if (isEmptyParams(searchParams)) {
    return (
      <FilteredPage
        title="Transport Fee Payment"
        filters={<p className="text-sm text-muted-foreground">No parameters.</p>}
        body={
          <Button type="button" onClick={goBack}>
            Back
          </Button>
        }
      />
    );
  }

  const profile = (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-sm border bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={searchParams.get("photoPath") || DEFAULT_PHOTO}
            alt=""
            className="h-full w-full object-cover"
            onError={(e) => {
              const img = e.currentTarget;
              if (!img.src.endsWith("default_Student.png")) {
                img.src = DEFAULT_PHOTO;
              }
            }}
          />
        </div>
        <div className="space-y-0.5 text-sm">
          <p className="font-medium text-slate-900">
            {searchParams.get("firstName")}
          </p>
          <p className="text-muted-foreground">
            {searchParams.get("empNumber")}
          </p>
          <p className="text-muted-foreground">
            {[searchParams.get("collegeCode"), searchParams.get("deptName")]
              .filter(Boolean)
              .join(" / ")}
          </p>
          <p className="text-muted-foreground">{searchParams.get("mobile")}</p>
        </div>
      </div>
      <div className="rounded-md bg-[#c3d9ff] px-3 py-2 text-sm font-medium text-slate-900">
        Payment for {[searchParams.get("collegeCode"), searchParams.get("deptName")]
          .filter(Boolean)
          .join(" / ")}
      </div>
    </div>
  );

  return (
    <>
      <FilteredPage
        title="Transport Fee Payment"
        filtersCollapsible={false}
        filters={profile}
        body={
          <div className="space-y-5">
            {hasBalance ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                  <Select
                    label="Pay Mode"
                    required
                    value={
                      paymentModeId != null ? String(paymentModeId) : null
                    }
                    onChange={(v) => {
                      setPaymentModeId(v ? Number(v) : null);
                      setReferenceNumber("");
                      setTransactionNo("");
                      setChequeNo("");
                      setDdno("");
                      setOtherPaymentNumber("");
                    }}
                    options={modeOptions}
                    placeholder="Select pay mode"
                    isLoading={lookupsQuery.isLoading}
                  />
                  <Select
                    label="Payment Type"
                    required
                    value={
                      paymentTypeId != null ? String(paymentTypeId) : null
                    }
                    onChange={(v) =>
                      setPaymentTypeId(v ? Number(v) : null)
                    }
                    options={typeOptions}
                    placeholder="Select payment type"
                    isLoading={lookupsQuery.isLoading}
                  />
                  {refField ? (
                    <div className="space-y-1.5">
                      <Label>{refField.label}</Label>
                      <Input
                        value={
                          refField.key === "referenceNumber"
                            ? referenceNumber
                            : refField.key === "transactionNo"
                              ? transactionNo
                              : refField.key === "chequeNo"
                                ? chequeNo
                                : refField.key === "ddno"
                                  ? ddno
                                  : otherPaymentNumber
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          if (refField.key === "referenceNumber")
                            setReferenceNumber(val);
                          else if (refField.key === "transactionNo")
                            setTransactionNo(val);
                          else if (refField.key === "chequeNo")
                            setChequeNo(val);
                          else if (refField.key === "ddno") setDdno(val);
                          else setOtherPaymentNumber(val);
                        }}
                      />
                    </div>
                  ) : null}
                  <div className="space-y-1.5">
                    <Label>Payment Amount</Label>
                    <Input
                      type="number"
                      min={0}
                      className="h-11 text-xl font-bold"
                      value={Number.isFinite(amount) ? amount : 0}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      onFocus={() => setAmount(0)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                  <DatePicker
                    label="Payment Date"
                    required
                    value={receiptDt}
                    onChange={setReceiptDt}
                    clearable={false}
                    displayFormat="dd/MM/yyyy"
                  />
                  <div className="space-y-1.5 md:col-span-1">
                    <Label>Payment Notes</Label>
                    <Input
                      value={paymentFor}
                      onChange={(e) => setPaymentFor(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>LateFee Reason</Label>
                    <Input
                      value={fineReason}
                      onChange={(e) => setFineReason(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      className="h-9 w-full bg-[#f0c040] text-slate-900 hover:bg-[#e5b535]"
                      disabled={!canPay || paying}
                      onClick={preparePay}
                    >
                      Pay fees
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

            {rows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50 text-left">
                      <th className="px-2 py-2">SI No</th>
                      <th className="px-2 py-2">Pay For</th>
                      <th className="px-2 py-2 text-right">Gross Amt (₹)</th>
                      <th className="px-2 py-2 text-right">Dis Amt (₹)</th>
                      <th className="px-2 py-2 text-right">LateFee (₹)</th>
                      <th className="px-2 py-2 text-right">Paid Amt (₹)</th>
                      <th className="px-2 py-2 text-right">Bal Amt (₹)</th>
                      <th className="px-2 py-2 text-right">Pay Amt (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((particular, i) => {
                      const bal = Number(particular.balanceAmount ?? 0);
                      return (
                        <tr
                          key={String(
                            particular.transportFeePaymentId ?? i,
                          )}
                          className="border-b"
                        >
                          <td className="px-2 py-2">{i + 1}</td>
                          <td className="px-2 py-2 font-medium">
                            Transport (
                            {searchParams.get("routePickupPlace")} -{" "}
                            {searchParams.get("routeDropPlace")}) /{" "}
                            {searchParams.get("routeCode")}
                          </td>
                          <td className="px-2 py-2 text-right">
                            {money(particular.grossAmount)}
                          </td>
                          <td className="px-2 py-2 text-right">
                            {money(particular.discountAmount)}
                          </td>
                          <td className="px-2 py-2 text-right">
                            {money(particular.fineAmount)}
                          </td>
                          <td className="px-2 py-2 text-right">
                            {money(particular.paidAmount)}
                          </td>
                          <td className="px-2 py-2 text-right">
                            {money(particular.balanceAmount)}
                          </td>
                          <td className="px-2 py-2 text-right">
                            {bal > 0 ? (
                              <div className="relative inline-block">
                                <Input
                                  type="number"
                                  min={0}
                                  className="h-8 w-28 text-right"
                                  value={
                                    particular.amount != null
                                      ? String(particular.amount)
                                      : ""
                                  }
                                  onChange={(e) =>
                                    onRowAmountChange(i, e.target.value)
                                  }
                                />
                                <span className="absolute -right-2 -top-1 text-red-600">
                                  *
                                </span>
                              </div>
                            ) : (
                              <span className="font-medium text-emerald-700">
                                Paid
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}

            {feeReceipts.length > 0 ? (
              <div>
                <h2 className="mb-2 text-sm font-semibold">Fee Receipts</h2>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead>
                      <tr className="border-b bg-slate-50 text-left">
                        <th className="px-2 py-2">SI No.</th>
                        <th className="px-2 py-2">Receipt No.</th>
                        <th className="px-2 py-2">Payment Date</th>
                        <th className="px-2 py-2">Payment Notes</th>
                        <th className="px-2 py-2">Payment Mode</th>
                        <th className="px-2 py-2">Payment Type</th>
                        <th className="px-2 py-2">Reference No.</th>
                        <th className="px-2 py-2 text-right">Amount (₹)</th>
                        <th className="px-2 py-2">Print</th>
                      </tr>
                    </thead>
                    <tbody>
                      {feeReceipts.map((feeReceipt, i) => (
                        <tr
                          key={String(feeReceipt.feeReceiptsId ?? i)}
                          className="border-b"
                        >
                          <td className="px-2 py-2">{i + 1}</td>
                          <td className="px-2 py-2">
                            {feeReceipt.paymentReceiptsNo}
                          </td>
                          <td className="px-2 py-2">
                            {formatReceiptDate(
                              String(
                                feeReceipt.receiptDt ??
                                  feeReceipt.createdDt ??
                                  "",
                              ),
                            )}
                          </td>
                          <td className="px-2 py-2">
                            {feeReceipt.paymentFor}
                          </td>
                          <td className="px-2 py-2">
                            {String(feeReceipt.paymentModeName ?? "")}
                          </td>
                          <td className="px-2 py-2">
                            {String(feeReceipt.paymentTypeName ?? "")}
                          </td>
                          <td className="px-2 py-2">{receiptRef(feeReceipt)}</td>
                          <td className="px-2 py-2 text-right">
                            {money(feeReceipt.receiptAmount)}
                          </td>
                          <td className="px-2 py-2">
                            <button
                              type="button"
                              className="inline-flex text-slate-700 hover:text-slate-900"
                              title="Print Receipt"
                              onClick={() => void onPrint(feeReceipt)}
                            >
                              <Printer className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            <div className="flex justify-end">
              <Button
                type="button"
                className="h-9 min-w-[88px] bg-[#f0c040] px-5 text-[13px] font-medium text-slate-900 hover:bg-[#e5b535]"
                onClick={goBack}
              >
                Back
              </Button>
            </div>
          </div>
        }
      />

      <ConfirmDialog
        open={confirmOpen}
        title="Confirmation"
        description="Sure, you want to confirm ?"
        confirmLabel="Ok"
        cancelLabel="Close"
        confirmVariant="default"
        confirmFirst
        isLoading={paying}
        onCancel={() => {
          if (!paying) setConfirmOpen(false);
        }}
        onConfirm={() => void confirmPay()}
      />
    </>
  );
}

export default function FacultyFeePayPage() {
  return (
    <Suspense fallback={null}>
      <FacultyFeePayContent />
    </Suspense>
  );
}
