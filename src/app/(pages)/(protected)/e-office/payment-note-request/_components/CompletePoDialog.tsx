"use client";

/**
 * Angular `complete-po` MatDialog parity (width ~60%).
 */

import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format, isValid, parseISO } from "date-fns";
import { EyeIcon } from "lucide-react";
import { FormModal } from "@/common/components/feedback";
import { Select } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { MINIO_URL } from "@/config/constants/api";
import { toastError, toastSuccess } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import { QK } from "@/lib/query-keys";
import { completePurchaseOrder, getPurchaseOrderById } from "@/services";
import type { InvPurchaseOrderRow } from "@/types/e-office";

const STATUS_OPTIONS = [
  { value: "332", label: "Complete" },
  { value: "333", label: "Reject" },
];

function formatPoDate(value?: string | null): string {
  if (!value) return "";
  const d = parseISO(value.includes("T") ? value : `${value}T00:00:00`);
  const date = isValid(d) ? d : new Date(value);
  return isValid(date) ? format(date, "dd/MM/yyyy") : value;
}

function formatInrPlain(value?: number | null): string {
  if (value == null || Number.isNaN(Number(value))) return "";
  return Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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

export function CompletePoDialog({
  open,
  onClose,
  row,
  onCompleted,
}: {
  open: boolean;
  onClose: () => void;
  row: InvPurchaseOrderRow | null;
  onCompleted: () => void;
}) {
  const [statusId, setStatusId] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | undefined>();

  const poId = row?.poId;

  const { data: detail } = useQuery({
    queryKey: QK.eOffice.purchaseOrder(poId ?? 0),
    queryFn: () => getPurchaseOrderById(poId!),
    enabled: open && Boolean(poId),
  });

  const data = detail ?? row;
  const items = data?.invPoItems ?? row?.invPoItems ?? [];

  useEffect(() => {
    if (!open) {
      setStatusId(null);
      setStatusError(undefined);
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!data?.poId) throw new Error("PO is required");
      if (!statusId) {
        setStatusError("Update Status is required");
        throw new Error("VALIDATION");
      }
      await completePurchaseOrder(data.poId, Number(statusId));
    },
    onSuccess: () => {
      toastSuccess("Purchase order updated.");
      onCompleted();
      onClose();
      setStatusId(null);
      setStatusError(undefined);
    },
    onError: (err) => {
      if (err instanceof Error && err.message === "VALIDATION") return;
      toastError(getErrorMessage(err));
    },
  });

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Complete Purchase Order"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
      isSubmitting={mutation.isPending}
      submitLabel="Save"
      cancelLabel="Cancel"
      size="xl"
      formClassName="space-y-4"
    >
      <table className="w-full max-w-xl border-collapse text-left">
        <tbody>
          <MetaRow label="PO No">{data?.pono ?? "—"}</MetaRow>
          <MetaRow label="Date">{formatPoDate(data?.poDate) || "—"}</MetaRow>
          <MetaRow label="Store">{data?.storeName ?? "—"}</MetaRow>
          <MetaRow label="Transaction Type">
            {data?.invTranstypeCatdetCode ??
              data?.invTranstypeCatdetDisplayName ??
              "—"}
          </MetaRow>
          <MetaRow label="Status">{data?.poWorkFlowName ?? "—"}</MetaRow>
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
        </tbody>
      </table>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-xs">
          <thead>
            <tr className="bg-sky-50">
              <th className="border border-border px-2 py-2 text-left font-semibold">
                Item
              </th>
              <th className="border border-border px-2 py-2 text-left font-semibold">
                Quantity
              </th>
              <th className="border border-border px-2 py-2 text-left font-semibold">
                Unit Price
              </th>
              <th className="border border-border px-2 py-2 text-left font-semibold">
                Discount(%)
              </th>
              <th className="border border-border px-2 py-2 text-left font-semibold">
                Total Cost
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
                    {item.itemCode ? (
                      <span className="text-muted-foreground">
                        ({item.itemCode})
                      </span>
                    ) : null}
                  </td>
                  <td className="border border-border px-2 py-1.5">
                    {item.orderQuantity ?? 0}
                  </td>
                  <td className="border border-border px-2 py-1.5">
                    {item.unitPrice ?? 0}
                  </td>
                  <td className="border border-border px-2 py-1.5">
                    {item.itemDiscountPercentage ?? 0}
                  </td>
                  <td className="border border-border px-2 py-1.5">
                    {formatInrPlain(item.itemTotalCost)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <hr className="border-border" />

      <div className="max-w-xs sm:max-w-sm">
        <Select
          label="Update Status"
          required
          value={statusId}
          onChange={(v) => {
            setStatusId(v);
            setStatusError(undefined);
          }}
          options={STATUS_OPTIONS}
          placeholder="Update Status"
          error={statusError}
          searchable={false}
        />
      </div>
    </FormModal>
  );
}
