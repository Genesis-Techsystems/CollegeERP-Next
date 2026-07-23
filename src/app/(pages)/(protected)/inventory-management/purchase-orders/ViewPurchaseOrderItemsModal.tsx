"use client";

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
import { MINIO_URL } from "@/config/constants/api";
import type { InvPurchaseOrderListRow } from "@/types/inventory";

interface Props {
  open: boolean;
  onClose: () => void;
  data: InvPurchaseOrderListRow | null;
}

function formatPoDate(value?: string): string {
  if (!value) return "";
  const d = parseISO(value.includes("T") ? value : `${value}T00:00:00`);
  if (!isValid(d)) {
    const fallback = new Date(value);
    return isValid(fallback) ? format(fallback, "dd/MM/yyyy") : value;
  }
  return format(d, "dd/MM/yyyy");
}

function openMinioFile(path?: string) {
  if (!path) return;
  const base = MINIO_URL.replace(/\/$/, "");
  const file = path.startsWith("/") ? path : `/${path}`;
  window.open(`${base}${file}`, "_blank", "width=700,height=600");
}

export default function ViewPurchaseOrderItemsModal({
  open,
  onClose,
  data,
}: Props) {
  const items = data?.invPoItems ?? [];

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[hsl(var(--primary))] text-base font-semibold">
            Purchase Order Items
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <table className="w-full border-collapse">
              <tbody>
                <tr>
                  <th className="py-1 pr-2 text-left font-medium text-muted-foreground">
                    Po Number
                  </th>
                  <td className="py-1">: {data?.pono ?? ""}</td>
                </tr>
                <tr>
                  <th className="py-1 pr-2 text-left font-medium text-muted-foreground">
                    Po Date
                  </th>
                  <td className="py-1">: {formatPoDate(data?.poDate)}</td>
                </tr>
                <tr>
                  <th className="py-1 pr-2 text-left font-medium text-muted-foreground">
                    Po Type
                  </th>
                  <td className="py-1">
                    : {data?.potypeCatdetDisplayName ?? ""}
                  </td>
                </tr>
                <tr>
                  <th className="py-1 pr-2 text-left font-medium text-muted-foreground">
                    PO Status
                  </th>
                  <td className="py-1">: {data?.poWorkFlowName ?? ""}</td>
                </tr>
              </tbody>
            </table>
            <table className="w-full border-collapse">
              <tbody>
                <tr>
                  <th className="py-1 pr-2 text-left font-medium text-muted-foreground">
                    Supplier Name
                  </th>
                  <td className="py-1">: {data?.supplierName ?? ""}</td>
                </tr>
                <tr>
                  <th className="py-1 pr-2 text-left font-medium text-muted-foreground">
                    Payment Note
                  </th>
                  <td className="py-1">
                    :{" "}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      title="view Document"
                      disabled={!data?.wfDocumentPath}
                      onClick={() => openMinioFile(data?.wfDocumentPath)}
                    >
                      <EyeIcon className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
                <tr>
                  <th className="py-1 pr-2 text-left font-medium text-muted-foreground">
                    Comparitive Statement
                  </th>
                  <td className="py-1">
                    :{" "}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      title="view Document"
                      disabled={!data?.poRefFilePath1}
                      onClick={() => openMinioFile(data?.poRefFilePath1)}
                    >
                      <EyeIcon className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[640px] border-collapse text-xs">
              <thead>
                <tr className="bg-muted/50">
                  <th className="border-b px-2 py-2 text-left font-medium">
                    Items
                  </th>
                  <th className="border-b px-2 py-2 text-left font-medium">
                    Unit Price
                  </th>
                  <th className="border-b px-2 py-2 text-left font-medium">
                    Quantity
                  </th>
                  <th className="border-b px-2 py-2 text-left font-medium">
                    Discount(%)
                  </th>
                  <th className="border-b px-2 py-2 text-left font-medium">
                    Total cost
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-2 py-4 text-center text-muted-foreground"
                    >
                      No items
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => (
                    <tr key={`${item.itemName ?? "item"}-${idx}`}>
                      <td className="border-b px-2 py-1.5">
                        {item.itemName ?? ""}
                      </td>
                      <td className="border-b px-2 py-1.5">
                        {item.unitPrice ?? ""}
                      </td>
                      <td className="border-b px-2 py-1.5">
                        {item.orderQuantity ?? ""}
                      </td>
                      <td className="border-b px-2 py-1.5">
                        {item.itemTotalDiscountAmount ?? ""}
                      </td>
                      <td className="border-b px-2 py-1.5">
                        {item.itemTotalCost ?? ""}
                      </td>
                    </tr>
                  ))
                )}
                <tr>
                  <td colSpan={3} className="border-b px-2 py-1.5" />
                  <td className="border-b px-2 py-1.5 text-right font-medium">
                    Gross Amt
                  </td>
                  <td className="border-b px-2 py-1.5">
                    {data?.poActualAmount ?? ""}
                  </td>
                </tr>
                <tr>
                  <td colSpan={3} className="border-b px-2 py-1.5" />
                  <td className="border-b px-2 py-1.5 text-right font-medium">
                    GST %
                  </td>
                  <td className="border-b px-2 py-1.5">{data?.sgst ?? ""}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="border-b px-2 py-1.5" />
                  <td className="border-b px-2 py-1.5 text-right font-medium">
                    Shipping Charges
                  </td>
                  <td className="border-b px-2 py-1.5">
                    {data?.shippingCharges ?? ""}
                  </td>
                </tr>
                <tr>
                  <td colSpan={3} className="border-b px-2 py-1.5" />
                  <td className="border-b px-2 py-1.5 text-right font-medium">
                    Other Charges
                  </td>
                  <td className="border-b px-2 py-1.5">
                    {data?.otherCharges ?? ""}
                  </td>
                </tr>
                <tr>
                  <td colSpan={3} className="px-2 py-1.5" />
                  <td className="px-2 py-1.5 text-right font-medium">
                    Total Amt
                  </td>
                  <td className="px-2 py-1.5 font-bold">
                    {data?.poNetCost ?? ""}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
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
