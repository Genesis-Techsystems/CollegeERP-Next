"use client";

/**
 * Angular `view-item-request` MatDialog parity — list-row data (+ detail fetch when items missing).
 */

import { useQuery } from "@tanstack/react-query";
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
import { QK } from "@/lib/query-keys";
import { getInternalIndentById } from "@/services";
import type { InvInternalIndentRow } from "@/types/e-office";

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

export function ViewItemRequestDialog({
  open,
  onClose,
  row,
}: {
  open: boolean;
  onClose: () => void;
  row: InvInternalIndentRow | null;
}) {
  const id = row?.internalIndId;
  const listHasItems = (row?.invInternalIndentitems?.length ?? 0) > 0;

  const { data: detail } = useQuery({
    queryKey: QK.eOffice.internalIndent(id ?? 0),
    queryFn: () => getInternalIndentById(id!),
    enabled: open && Boolean(id) && !listHasItems,
  });

  const data = detail ?? row;
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
          {/* Angular lastTable — labels + values sit on the left, not stretched right */}
          <table className="w-auto max-w-full border-collapse text-left">
            <tbody>
              <tr>
                <th className="whitespace-nowrap py-1 pr-3 text-left text-sm font-bold text-black">
                  Indent No
                </th>
                <td className="py-1 text-sm font-normal text-neutral-600">
                  :&nbsp;{data?.internalIndNo ?? ""}
                </td>
              </tr>
              <tr>
                <th className="whitespace-nowrap py-1 pr-3 text-left text-sm font-bold text-black">
                  Date
                </th>
                <td className="py-1 text-sm font-normal text-neutral-600">
                  :&nbsp;{formatIndentDate(data?.indentDate)}
                </td>
              </tr>
              <tr>
                <th className="whitespace-nowrap py-1 pr-3 text-left text-sm font-bold text-black">
                  Store
                </th>
                <td className="py-1 text-sm font-normal text-neutral-600">
                  :&nbsp;{data?.storeName ?? ""}
                </td>
              </tr>
              <tr>
                <th className="whitespace-nowrap py-1 pr-3 text-left text-sm font-bold text-black">
                  Transaction Type
                </th>
                <td className="py-1 text-sm font-normal text-neutral-600">
                  :&nbsp;{transTypeName}
                </td>
              </tr>
              <tr>
                <th className="whitespace-nowrap py-1 pr-3 text-left text-sm font-bold text-black">
                  Status
                </th>
                <td className="py-1 text-sm font-normal text-neutral-600">
                  :&nbsp;{data?.internalIndWfStageName ?? ""}
                </td>
              </tr>
            </tbody>
          </table>

          <table className="w-full border-collapse border border-border text-xs">
            <thead>
              <tr>
                <th className="border border-border bg-[hsl(var(--primary)/0.06)] px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[hsl(var(--app-table-header-color))]">
                  Item
                </th>
                <th className="w-28 border border-border bg-[hsl(var(--primary)/0.06)] px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[hsl(var(--app-table-header-color))]">
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
                    {/* Angular view shows issuedQty */}
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
