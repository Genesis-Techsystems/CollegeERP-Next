"use client";

/**
 * Angular `view-payment-note-request` MatDialog parity (width ~100%).
 */

import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, isValid, parseISO } from "date-fns";
import { EyeIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MINIO_URL } from "@/config/constants/api";
import { QK } from "@/lib/query-keys";
import { getPurchaseOrderById } from "@/services";
import type { InvPurchaseOrderRow } from "@/types/e-office";

function formatPoDate(value?: string | null): string {
  if (!value) return "";
  const d = parseISO(value.includes("T") ? value : `${value}T00:00:00`);
  const date = isValid(d) ? d : new Date(value);
  return isValid(date) ? format(date, "dd/MM/yyyy") : value;
}

/** Angular: `window.open(this.miniopath + path, '_blank', 'width=700,height=600')` */
function openDoc(path?: string | null) {
  const raw = path == null ? "" : String(path);
  const url = /^https?:\/\//i.test(raw) ? raw : `${MINIO_URL}${raw}`;
  window.open(url, "_blank", "width=700,height=600");
}

function MetaRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <tr>
      <th className="whitespace-nowrap py-1.5 pr-3 text-left align-top text-sm font-bold text-black">
        {label}
      </th>
      <td className="py-1.5 text-sm text-foreground">
        <span className="mr-1 text-muted-foreground">:</span>
        {children}
      </td>
    </tr>
  );
}

export function ViewPaymentNoteDialog({
  open,
  onClose,
  row,
}: {
  open: boolean;
  onClose: () => void;
  row: InvPurchaseOrderRow | null;
}) {
  const poId = row?.poId;

  // Always load full PO so document paths match Angular list→dialog data
  const { data: detail } = useQuery({
    queryKey: QK.eOffice.purchaseOrder(poId ?? 0),
    queryFn: () => getPurchaseOrderById(poId!),
    enabled: open && Boolean(poId),
  });

  const data = detail ?? row;
  const items = data?.invPoItems ?? row?.invPoItems ?? [];

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="flex max-h-[92vh] w-[min(96vw,1100px)] max-w-[1100px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[1100px]">
        <DialogHeader className="shrink-0 border-b border-border px-5 py-3">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold text-[hsl(var(--primary))]">
            Payment Note Request
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 text-sm">
          <div className="grid grid-cols-1 gap-x-8 gap-y-2 md:grid-cols-2">
            <table className="w-full border-collapse text-left">
              <tbody>
                <MetaRow label="Po Number">{data?.pono ?? "—"}</MetaRow>
                <MetaRow label="Po Date">
                  {formatPoDate(data?.poDate) || "—"}
                </MetaRow>
                <MetaRow label="Po Type">
                  {data?.potypeCatdetDisplayName ?? "—"}
                </MetaRow>
                <MetaRow label="PO Status">
                  {data?.poWorkFlowName ?? "—"}
                </MetaRow>
                <MetaRow label="PO Authorization Comments">
                  <Textarea
                    className="mt-0.5 min-h-[52px] max-w-md resize-none text-sm"
                    placeholder="Comments"
                    value={data?.authorizationComments ?? ""}
                    disabled
                    readOnly
                  />
                </MetaRow>
              </tbody>
            </table>

            <table className="w-full border-collapse text-left">
              <tbody>
                <MetaRow label="Supplier Name">
                  {data?.supplierName ?? "—"}
                </MetaRow>
                <MetaRow label="Payment Note">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-[hsl(var(--primary))]"
                    aria-label="View payment note"
                    onClick={() => openDoc(data?.wfDocumentPath)}
                  >
                    <EyeIcon className="h-4 w-4" />
                  </Button>
                </MetaRow>
                <MetaRow label="Comparitive Statement">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-[hsl(var(--primary))]"
                    aria-label="View comparative statement"
                    onClick={() => openDoc(data?.poRefFilePath1)}
                  >
                    <EyeIcon className="h-4 w-4" />
                  </Button>
                </MetaRow>
                <MetaRow label="Po Reference File">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-[hsl(var(--primary))]"
                    aria-label="View PO reference file"
                    onClick={() => openDoc(data?.poRefFilePath2)}
                  >
                    <EyeIcon className="h-4 w-4" />
                  </Button>
                </MetaRow>
              </tbody>
            </table>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-xs">
              <thead>
                <tr className="bg-sky-50">
                  <th className="border border-border px-2 py-2 text-left font-semibold">
                    Items
                  </th>
                  <th className="border border-border px-2 py-2 text-left font-semibold">
                    Unit Price
                  </th>
                  <th className="border border-border px-2 py-2 text-left font-semibold">
                    Quantity
                  </th>
                  <th className="border border-border px-2 py-2 text-left font-semibold">
                    Discount(%)
                  </th>
                  <th className="border border-border px-2 py-2 text-left font-semibold">
                    Total cost
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="border border-border px-2 py-3 text-center text-muted-foreground"
                    >
                      No items
                    </td>
                  </tr>
                ) : (
                  items.map((item, i) => (
                    <tr key={item.poItemId ?? i}>
                      <td className="border border-border px-2 py-1.5">
                        {item.itemName ?? "—"}
                      </td>
                      <td className="border border-border px-2 py-1.5">
                        {item.unitPrice ?? 0}
                      </td>
                      <td className="border border-border px-2 py-1.5">
                        {item.orderQuantity ?? 0}
                      </td>
                      <td className="border border-border px-2 py-1.5">
                        {item.itemTotalDiscountAmount ??
                          item.itemDiscountPercentage ??
                          0}
                      </td>
                      <td className="border border-border px-2 py-1.5">
                        {item.itemTotalCost ?? 0}
                      </td>
                    </tr>
                  ))
                )}
                <tr>
                  <td colSpan={3} className="border-0" />
                  <td className="border border-border px-2 py-1.5 text-right font-medium">
                    Gross Amt
                  </td>
                  <td className="border border-border px-2 py-1.5">
                    {data?.poActualAmount ?? 0}
                  </td>
                </tr>
                <tr>
                  <td colSpan={3} className="border-0" />
                  <td className="border border-border px-2 py-1.5 text-right font-medium">
                    GST %
                  </td>
                  <td className="border border-border px-2 py-1.5">
                    {data?.sgst ?? 0}
                  </td>
                </tr>
                <tr>
                  <td colSpan={3} className="border-0" />
                  <td className="border border-border px-2 py-1.5 text-right font-medium">
                    Shipping Charges
                  </td>
                  <td className="border border-border px-2 py-1.5">
                    {data?.shippingCharges ?? 0}
                  </td>
                </tr>
                <tr>
                  <td colSpan={3} className="border-0" />
                  <td className="border border-border px-2 py-1.5 text-right font-medium">
                    Other Charges
                  </td>
                  <td className="border border-border px-2 py-1.5">
                    {data?.otherCharges ?? 0}
                  </td>
                </tr>
                <tr>
                  <td colSpan={3} className="border-0" />
                  <td className="border border-border px-2 py-1.5 text-right font-medium">
                    Total Amt
                  </td>
                  <td className="border border-border px-2 py-1.5 font-bold">
                    {data?.poNetCost ?? 0}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t border-border px-5 py-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
