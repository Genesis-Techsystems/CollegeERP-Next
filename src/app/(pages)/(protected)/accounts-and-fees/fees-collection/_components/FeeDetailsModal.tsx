"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { ClipboardList, Printer } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toastError } from "@/lib/toast";
import {
  getFeeStudentData,
  listStudentFeeReceiptDetails,
  printFeeReceiptById,
} from "@/services";
import type {
  FeeReceiptRow,
  FeeStudentParticularRow,
  StudentFeeSearchRow,
  StudentFeeStructureRow,
} from "@/types/fees-collection";

export type FeeDetailsModalProps = {
  open: boolean;
  onClose: () => void;
  row: StudentFeeStructureRow | null;
  student: StudentFeeSearchRow | null;
  collegeCode?: string;
  collegeId: number;
};

function pick(
  row: Record<string, unknown> | null | undefined,
  keys: string[],
): string {
  if (!row) return "";
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return "";
}

function formatReceiptDateTime(value: unknown): string {
  if (value == null || value === "") return "—";
  const raw = String(value);
  try {
    const d = raw.includes("T") ? parseISO(raw) : new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return format(d, "dd/MM/yyyy, hh:mm:ss a");
  } catch {
    return raw;
  }
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2 text-sm sm:grid-cols-[140px_1fr]">
      <p className="text-muted-foreground">{label} :</p>
      <p className="font-medium text-blue-700">{value || "—"}</p>
    </div>
  );
}

/**
 * Angular `FeeDetailsModalComponent` parity — header + particulars + fee receipts.
 */
export function FeeDetailsModal({
  open,
  onClose,
  row,
  student,
  collegeCode,
  collegeId,
}: FeeDetailsModalProps) {
  const [loading, setLoading] = useState(false);
  const [particulars, setParticulars] = useState<FeeStudentParticularRow[]>([]);
  const [receipts, setReceipts] = useState<FeeReceiptRow[]>([]);
  const [printingId, setPrintingId] = useState<number | null>(null);

  useEffect(() => {
    if (!open || !row) return;

    const sid = Number(row.studentId ?? student?.studentId ?? 0);
    const cid = Number(row.collegeId ?? student?.collegeId ?? collegeId ?? 0);
    const ay = Number(row.academicYearId ?? 0);
    const fs = Number(row.feeStructureId ?? 0);
    const courseYearId = Number(row.courseYearId ?? 0);

    if (!sid || !cid || !ay || !fs) {
      setParticulars([]);
      setReceipts([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setParticulars([]);
    setReceipts([]);

    void (async () => {
      try {
        const [data, receiptRows] = await Promise.all([
          getFeeStudentData({
            collegeId: cid,
            academicYearId: ay,
            studentId: sid,
            feeStructureId: fs,
          }),
          listStudentFeeReceiptDetails({
            collegeId: cid,
            academicYearId: ay,
            studentId: sid,
            courseYearId,
          }),
        ]);
        if (cancelled) return;
        setParticulars(data?.feeStudentDataParticulars ?? []);
        setReceipts(Array.isArray(receiptRows) ? receiptRows : []);
      } catch (e) {
        if (!cancelled) toastError(e, "Failed to load fee details");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, row, student, collegeId]);

  async function onPrint(receipt: FeeReceiptRow) {
    const id = Number(
      receipt.feeReceiptsId ??
        receipt.fee_receipts_id ??
        receipt.pk_fee_receipts_id ??
        0,
    );
    if (!id) {
      toastError(new Error("Receipt id missing"), "Unable to print receipt");
      return;
    }
    setPrintingId(id);
    try {
      await printFeeReceiptById(id);
    } catch (e) {
      toastError(e, "Unable to print receipt");
    } finally {
      setPrintingId(null);
    }
  }

  const collegeLine = [
    collegeCode ||
      pick(row as Record<string, unknown>, ["collegeCode"]) ||
      pick(student as Record<string, unknown> | null, ["collegeCode"]),
    pick(row as Record<string, unknown>, ["academicYear"]) ||
      student?.academicYear,
  ]
    .filter(Boolean)
    .join(" / ");

  const courseLine = [
    pick(row as Record<string, unknown>, ["courseName", "courseCode"]) ||
      student?.courseCode,
    pick(row as Record<string, unknown>, ["groupName", "groupCode"]) ||
      student?.groupCode,
    pick(row as Record<string, unknown>, ["courseYearName"]) ||
      student?.courseYearName,
    (() => {
      const sec =
        pick(row as Record<string, unknown>, ["section"]) || student?.section;
      return sec ? `section - ${sec}` : "";
    })(),
  ]
    .filter(Boolean)
    .join(" / ");

  const structureName = pick(row as Record<string, unknown>, [
    "structureName",
    "classGroupName",
  ]);
  const studentName =
    pick(row as Record<string, unknown>, ["firstName"]) ||
    student?.firstName ||
    "";
  const rollNo =
    pick(row as Record<string, unknown>, [
      "rollNo",
      "rollNumber",
      "hallticketNumber",
    ]) ||
    student?.rollNumber ||
    student?.hallticketNumber ||
    "";

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent
        className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-5xl"
        closeOnOutsideClick={false}
        hasDescription
      >
        <DialogHeader className="shrink-0 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" aria-hidden />
            <DialogTitle>Fee Details</DialogTitle>
          </div>
          <DialogDescription className="sr-only">
            Fee particulars and receipts
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-2">
          <div className="space-y-2 rounded-md border p-3">
            <DetailRow label="College" value={collegeLine} />
            <DetailRow label="Course" value={courseLine} />
            <DetailRow label="Fee Structure" value={structureName} />
            <DetailRow
              label="Student"
              value={
                studentName
                  ? `${studentName}${rollNo ? ` (${rollNo})` : ""}`
                  : "—"
              }
            />
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <>
              <div className="overflow-auto rounded-md border">
                <table className="w-full min-w-[900px] text-left text-xs">
                  <thead className="bg-muted/40">
                    <tr className="border-b">
                      <th className="px-2 py-2">SI.No</th>
                      <th className="px-2 py-2">Particular</th>
                      <th className="px-2 py-2">Gross Amt</th>
                      <th className="px-2 py-2">Dis Amt</th>
                      <th className="px-2 py-2">LateFee</th>
                      <th className="px-2 py-2">RTF Hold Amt</th>
                      <th className="px-2 py-2">RTF Amt</th>
                      <th className="px-2 py-2">Net Amt</th>
                      <th className="px-2 py-2">Paid Amt</th>
                      <th className="px-2 py-2">Bal Amt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {particulars.length === 0 ? (
                      <tr>
                        <td
                          colSpan={10}
                          className="px-2 py-3 text-muted-foreground"
                        >
                          No particulars found.
                        </td>
                      </tr>
                    ) : (
                      particulars.map((r, i) => (
                        <tr
                          key={String(
                            r.feeStdDataParticularsId ??
                              r.feeParticularsId ??
                              i,
                          )}
                          className="border-b border-muted/40"
                        >
                          <td className="px-2 py-1.5 text-center">{i + 1}</td>
                          <td className="px-2 py-1.5">
                            {[r.categoryName, r.particularsName]
                              .filter(Boolean)
                              .join(" - ") || "—"}
                          </td>
                          <td className="px-2 py-1.5">
                            {String(r.grossAmount ?? "—")}
                          </td>
                          <td className="px-2 py-1.5">
                            {String(r.discountAmount ?? "—")}
                          </td>
                          <td className="px-2 py-1.5">
                            {String(r.fineAmount ?? "—")}
                          </td>
                          <td className="px-2 py-1.5">
                            {String(r.scholarshipHoldAmount ?? "—")}
                          </td>
                          <td className="px-2 py-1.5">
                            {String(r.scholarshipAmount ?? "—")}
                          </td>
                          <td className="px-2 py-1.5">
                            {String(r.netAmount ?? "—")}
                          </td>
                          <td className="px-2 py-1.5">
                            {String(r.paidAmount ?? "—")}
                          </td>
                          <td className="px-2 py-1.5">
                            {String(r.balanceAmount ?? "—")}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {receipts.length > 0 ? (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Fee Receipts</h3>
                  <div className="overflow-auto rounded-md border">
                    <table className="w-full min-w-[800px] text-left text-xs">
                      <thead className="bg-muted/40">
                        <tr className="border-b">
                          <th className="px-2 py-2">SI No.</th>
                          <th className="px-2 py-2">Receipt No.</th>
                          <th className="px-2 py-2">Payment Date</th>
                          <th className="px-2 py-2">Payment Mode</th>
                          <th className="px-2 py-2">Payment Type</th>
                          <th className="px-2 py-2">Merchant Ref No.</th>
                          <th className="px-2 py-2 text-right">Amount (₹)</th>
                          <th className="px-2 py-2">Print</th>
                        </tr>
                      </thead>
                      <tbody>
                        {receipts.map((feeReceipt, i) => {
                          const rec = feeReceipt as Record<string, unknown>;
                          const receiptId = Number(
                            feeReceipt.feeReceiptsId ??
                              rec.fee_receipts_id ??
                              rec.pk_fee_receipts_id ??
                              0,
                          );
                          return (
                            <tr
                              key={String(receiptId || i)}
                              className="border-b border-muted/40"
                            >
                              <td className="px-2 py-1.5">{i + 1}</td>
                              <td className="px-2 py-1.5">
                                {pick(rec, [
                                  "payment_receipts_no",
                                  "paymentReceiptsNo",
                                ]) || "—"}
                              </td>
                              <td className="px-2 py-1.5">
                                {formatReceiptDateTime(
                                  rec.receipt_date ??
                                    rec.receiptDt ??
                                    feeReceipt.createdDt,
                                )}
                              </td>
                              <td className="px-2 py-1.5">
                                {pick(rec, ["payment_mode", "paymentMode"]) ||
                                  "—"}
                              </td>
                              <td className="px-2 py-1.5">
                                {pick(rec, ["payment_type", "paymentType"]) ||
                                  "—"}
                              </td>
                              <td className="px-2 py-1.5">
                                {pick(rec, [
                                  "transaction_no",
                                  "transactionNo",
                                ]) || "—"}
                              </td>
                              <td className="px-2 py-1.5 text-right">
                                {pick(rec, [
                                  "receipt_amount",
                                  "receiptAmount",
                                ]) || "—"}
                              </td>
                              <td className="px-2 py-1.5">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                  title="Print Receipt"
                                  disabled={
                                    !receiptId || printingId === receiptId
                                  }
                                  onClick={() => void onPrint(feeReceipt)}
                                >
                                  <Printer className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t border-border/60 pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 min-w-[5.5rem]"
            onClick={onClose}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
