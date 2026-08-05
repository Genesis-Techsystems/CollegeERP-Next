"use client";

/**
 * Angular `view-payment-note` MatDialog — payment note preview from add/edit form.
 */

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type PaymentNotePreviewData = {
  subjectText?: string;
  requestText?: string;
  requestText2?: string;
  paymentNoteFlag?: number;
  subjectTextCode?: string;
  budgetAlloted?: number;
  soFarExpenditure?: number;
  balance?: number;
  currentExpenditure?: number;
  balanceAvailable?: number;
};

function rs(n: number | undefined): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return "0";
  return String(v);
}

export function PaymentNotePreviewDialog({
  open,
  onClose,
  data,
}: {
  open: boolean;
  onClose: () => void;
  data: PaymentNotePreviewData | null;
}) {
  const flag = data?.paymentNoteFlag ?? 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[hsl(var(--primary))] text-base font-semibold">
            Payment Note
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <p>
            <b>Sub:-</b> {data?.subjectText ?? ""}
          </p>
          <p>1. &nbsp; {data?.requestText ?? ""}</p>
          {flag === 2 ? (
            <p>
              2. &nbsp; Above payment can be met from Special fee account under{" "}
              {data?.subjectTextCode ?? ""} head of account.
            </p>
          ) : (
            <>
              <p>2. &nbsp; {data?.requestText2 ?? ""}</p>
              <table className="mt-2 w-full max-w-md border-collapse text-xs">
                <tbody>
                  <tr>
                    <th className="py-1 pr-4 text-left font-bold text-black">
                      Budget Allocated
                    </th>
                    <td className="py-1 text-right text-neutral-600">
                      Rs.{rs(data?.budgetAlloted)}/-
                    </td>
                  </tr>
                  <tr>
                    <th className="py-1 pr-4 text-left font-bold text-black">
                      So far Expenditure
                    </th>
                    <td className="py-1 text-right text-neutral-600">
                      Rs.{rs(data?.soFarExpenditure)}/-
                    </td>
                  </tr>
                  <tr>
                    <th className="py-1 pr-4 text-left font-bold text-black">
                      Balance
                    </th>
                    <td className="py-1 text-right text-neutral-600">
                      Rs.{rs(data?.balance)}/-
                    </td>
                  </tr>
                  <tr>
                    <th className="py-1 pr-4 text-left font-bold text-black">
                      Current Expenditure
                    </th>
                    <td className="py-1 text-right text-neutral-600">
                      Rs.{rs(data?.currentExpenditure)}/-
                    </td>
                  </tr>
                  <tr>
                    <th className="py-1 pr-4 text-left font-bold text-black">
                      Balance Available
                    </th>
                    <td className="py-1 text-right text-neutral-600">
                      Rs.{rs(data?.balanceAvailable)}/-
                    </td>
                  </tr>
                </tbody>
              </table>
            </>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
