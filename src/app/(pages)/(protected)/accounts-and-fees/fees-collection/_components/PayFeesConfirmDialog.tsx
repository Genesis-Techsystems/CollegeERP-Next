"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { FeeStudentParticularRow } from "@/types/fees-collection";

export type PayFeesConfirmData = {
  firstName?: string;
  collegeCode?: string;
  academicYear?: string;
  courseCode?: string;
  groupCode?: string;
  courseYearName?: string;
  section?: string;
  courseYearNo?: string | number;
  receiptAmount: number;
  feeParticularwisePayments: FeeStudentParticularRow[];
};

export function PayFeesConfirmDialog({
  open,
  onClose,
  onConfirm,
  data,
  confirming,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  data: PayFeesConfirmData | null;
  confirming?: boolean;
}) {
  if (!data) return null;

  const lines = data.feeParticularwisePayments;
  const total = lines.reduce((sum, p) => sum + Number(p.amount ?? 0), 0);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Pay Details</DialogTitle>
          <DialogDescription className="sr-only">
            Confirm fee payment
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="space-y-1 rounded-md border bg-muted/30 px-3 py-2 text-[13px]">
            <p>
              <span className="text-muted-foreground">Student : </span>
              <span className="font-medium text-blue-700">
                {data.firstName}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">College : </span>
              <span className="font-medium text-blue-700">
                {data.collegeCode}
                {data.academicYear ? ` / (${data.academicYear})` : ""}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">Course Details : </span>
              <span className="font-medium text-blue-700">
                {[
                  data.courseCode,
                  data.groupCode,
                  data.courseYearName,
                  data.section ? `Section ${data.section}` : "",
                ]
                  .filter(Boolean)
                  .join(" / ")}
              </span>
            </p>
            {data.courseYearNo != null && data.courseYearNo !== "" ? (
              <p>
                <span className="text-muted-foreground">Payment For : </span>
                <span className="font-medium text-blue-700">
                  {data.courseYearNo} Year fees
                </span>
              </p>
            ) : null}
          </div>

          <div className="overflow-hidden rounded-md border">
            <table className="w-full text-[13px]">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">SI.No.</th>
                  <th className="px-3 py-2 text-left font-medium">
                    Particular
                  </th>
                  <th className="px-3 py-2 text-right font-medium">
                    Fee Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {lines.map((p, i) => (
                  <tr
                    key={`${p.feeCategoryId}-${p.feeParticularsId}-${i}`}
                    className="border-t"
                  >
                    <td className="px-3 py-1.5">{i + 1}</td>
                    <td className="px-3 py-1.5">
                      {[p.categoryName, p.particularsName]
                        .filter(Boolean)
                        .join(" - ")}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      {Number(p.amount ?? 0)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t bg-muted/30 font-medium">
                  <td colSpan={2} className="px-3 py-2 text-right">
                    Total Pay Amount
                  </td>
                  <td className="px-3 py-2 text-right">
                    {total || data.receiptAmount}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-[13px] font-medium text-red-600">
            Note : Please check the receipt before leaving the window.
          </p>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={confirming}
          >
            Close
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onConfirm}
            disabled={confirming}
          >
            {confirming ? "Paying…" : "Pay"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
