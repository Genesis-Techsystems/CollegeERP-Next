"use client";

/**
 * Angular `ViewIndentItemsComponent` parity — view modal from list row data.
 */

import { format, isValid, parseISO } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { InvInternalIndentListRow } from "@/types/inventory";

interface Props {
  open: boolean;
  onClose: () => void;
  data: InvInternalIndentListRow | null;
}

/** Angular `{{ itemList?.indentDate | date: 'dd/MM/yyyy' }}` */
function formatIndentDate(value?: string): string {
  if (!value) return "";
  const d = parseISO(value.includes("T") ? value : `${value}T00:00:00`);
  if (!isValid(d)) {
    const fallback = new Date(value);
    return isValid(fallback) ? format(fallback, "dd/MM/yyyy") : value;
  }
  return format(d, "dd/MM/yyyy");
}

export default function ViewInternalIndentItemsModal({
  open,
  onClose,
  data,
}: Props) {
  const items = data?.invInternalIndentitems ?? [];
  const transTypeName =
    data?.invTranstypeCatdetIdDisplayName ??
    data?.invTranstypeCatdetDisplayName ??
    "";

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[hsl(var(--primary))] text-base font-semibold">
            Internal Indent Items
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-xs">
          <table className="w-full border-collapse">
            <tbody>
              <tr>
                <th className="py-1 pr-2 text-left font-medium text-muted-foreground w-[40%]">
                  Indent No
                </th>
                <td className="py-1">: &nbsp; {data?.internalIndNo ?? ""}</td>
              </tr>
              <tr>
                <th className="py-1 pr-2 text-left font-medium text-muted-foreground">
                  Date
                </th>
                <td className="py-1">
                  : &nbsp; {formatIndentDate(data?.indentDate)}
                </td>
              </tr>
              <tr>
                <th className="py-1 pr-2 text-left font-medium text-muted-foreground">
                  Store
                </th>
                <td className="py-1">: &nbsp; {data?.storeName ?? ""}</td>
              </tr>
              <tr>
                <th className="py-1 pr-2 text-left font-medium text-muted-foreground">
                  Transaction Type
                </th>
                <td className="py-1">: &nbsp; {transTypeName}</td>
              </tr>
              <tr>
                <th className="py-1 pr-2 text-left font-medium text-muted-foreground">
                  Status
                </th>
                <td className="py-1">
                  : &nbsp; {data?.internalIndWfStageName ?? ""}
                </td>
              </tr>
            </tbody>
          </table>

          <table className="w-full border-collapse border border-border text-xs">
            <thead>
              <tr className="bg-muted/40">
                <th className="border border-border px-2 py-1.5 text-left font-semibold uppercase">
                  Item
                </th>
                <th className="border border-border px-2 py-1.5 text-left font-semibold uppercase w-28">
                  Quantity
                </th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={2}
                    className="border border-border px-2 py-3 text-center text-muted-foreground"
                  >
                    No items
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => (
                  <tr key={item.interIndItemId ?? `${item.itemId}-${idx}`}>
                    <td className="border border-border px-2 py-1.5">
                      {item.itemName ?? ""}
                      {item.itemCode ? (
                        <span className="text-muted-foreground">
                          {" "}
                          ({item.itemCode})
                        </span>
                      ) : null}
                    </td>
                    {/* Angular view shows issuedQty, not indentQuantity */}
                    <td className="border border-border px-2 py-1.5">
                      {item.issuedQty ?? 0}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Comments</Label>
            <Textarea
              value={data?.purpose ?? ""}
              disabled
              readOnly
              rows={2}
              placeholder="Comments"
              className="min-h-[2.5rem] resize-none text-xs"
            />
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
