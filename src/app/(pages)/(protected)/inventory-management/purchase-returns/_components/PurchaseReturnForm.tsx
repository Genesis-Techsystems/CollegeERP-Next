"use client";

/**
 * Inventory Purchase Return add/edit — Angular `add-purchase-return` parity.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDownIcon, FileTextIcon } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { DatePicker } from "@/common/components/date-picker";
import { Select } from "@/common/components/select";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { QK } from "@/lib/query-keys";
import { toastError, toastSuccess } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import { toDateOnlyISO } from "@/common/generic-functions";
import {
  createInvPurchaseReturn,
  getInvPurchaseReturnById,
  getInvSrvById,
  listActiveSrvsForPurchaseReturn,
  updateInvPurchaseReturn,
} from "@/services";
import type {
  InvPurchaseReturnItemRow,
  InvStockReceiptVoucher,
  InvSrvItemRow,
} from "@/types/inventory";

const PR_LIST = "/inventory-management/purchase-returns";

/** Angular-style file picker (UI only — not sent on save). */
function FileChooseField({
  label,
  accept,
  file,
  onChange,
}: {
  label: string;
  accept?: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-wrap items-center text-sm">
      <span className="mr-4 shrink-0 font-medium text-foreground">{label}</span>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      <Button
        type="button"
        size="sm"
        className="h-8 bg-[hsl(var(--primary))] px-3 text-xs text-primary-foreground hover:bg-[hsl(var(--primary))]/90"
        onClick={() => inputRef.current?.click()}
      >
        Choose File
      </Button>
      <span className="ml-2 truncate text-xs text-muted-foreground">
        {file?.name ?? "No file chosen"}
      </span>
    </div>
  );
}

function recalcTotals(items: InvPurchaseReturnItemRow[]) {
  let grossAmt = 0;
  let disAmt = 0;
  let netAmt = 0;
  for (const row of items) {
    if (!row.checked || row.isActive === false) continue;
    const unit = Number(row.itemUnitAmount ?? row.unitPrice) || 0;
    const qty = Number(row.orderQuantity) || 0;
    const discPct = Number(row.itemDiscountPercentage) || 0;
    grossAmt += unit * qty;
    disAmt += (unit * qty * discPct) / 100;
    netAmt += Number(row.itemTotalCost) || 0;
  }
  return { grossAmt, disAmt, netAmt };
}

function mapSrvItemsToReturnItems(
  items: InvSrvItemRow[],
): InvPurchaseReturnItemRow[] {
  return items
    .filter((row) => row.isActive !== false)
    .map((row) => {
      const unit = Number(row.itemUnitAmount ?? row.unitPrice) || 0;
      const qty = Number(row.returnedQty ?? row.orderQuantity) || 0;
      const discPct = Number(row.itemDiscountPercentage) || 0;
      const discAmt = (unit * qty * discPct) / 100;
      return {
        ...row,
        itemUnitAmount: unit,
        orderQuantity: qty,
        itemDiscountPercentage: discPct,
        itemTotalDiscountAmount: discAmt,
        itemTotalCost: unit * qty - discAmt,
        checked: false,
        isActive: true,
      };
    });
}

export function PurchaseReturnForm({
  purchaseReturnId,
  listPath = PR_LIST,
}: {
  purchaseReturnId?: number;
  listPath?: string;
}) {
  const router = useRouter();
  const isEdit = Boolean(purchaseReturnId && purchaseReturnId > 0);

  const [srvId, setSrvId] = useState<string | null>(null);
  const [srv, setSrv] = useState<InvStockReceiptVoucher | null>(null);
  const [itemList, setItemList] = useState<InvPurchaseReturnItemRow[]>([]);
  const [purchaseReturnNo, setPurchaseReturnNo] = useState("");
  const [purchaseReturnDate, setPurchaseReturnDate] = useState<Date | null>(
    new Date(),
  );
  const [refFile1, setRefFile1] = useState<File | null>(null);
  const [refFile2, setRefFile2] = useState<File | null>(null);
  /** Angular mat-expansion-panel [expanded]="false" */
  const [itemsOpen, setItemsOpen] = useState(false);
  const [seeded, setSeeded] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    srvId?: string;
    purchaseReturnNo?: string;
  }>({});
  const [headerTotals, setHeaderTotals] = useState<{
    grossAmt?: number;
    disAmt?: number;
    netAmt?: number;
  } | null>(null);

  const { data: srvList = [] } = useQuery({
    queryKey: [...QK.invStockReceiptVouchers.list(), "forPurchaseReturn"],
    queryFn: listActiveSrvsForPurchaseReturn,
  });

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: QK.invPurchaseReturns.detail(purchaseReturnId ?? 0),
    queryFn: () => getInvPurchaseReturnById(purchaseReturnId!),
    enabled: isEdit,
  });

  const srvOptions = useMemo(
    () =>
      srvList.map((s) => ({
        value: String(s.srvId),
        label: s.srvNo ?? String(s.srvId),
      })),
    [srvList],
  );

  const liveTotals = useMemo(() => recalcTotals(itemList), [itemList]);
  // On edit load, Angular shows header totals until checkbox click; then live calc
  const { grossAmt, disAmt, netAmt } = headerTotals ?? liveTotals;

  const loadSrv = useCallback(
    async (id: number, mergeEditItems?: InvPurchaseReturnItemRow[]) => {
      const full = await getInvSrvById(id);
      if (!full) return;
      setSrv(full);
      let items = mapSrvItemsToReturnItems(full.invSrvItemDTOs ?? []);
      if (mergeEditItems?.length) {
        items = items.map((row) => {
          const saved = mergeEditItems.find((m) => m.itemId === row.itemId);
          if (!saved) return row;
          const unit = Number(saved.itemUnitAmount ?? row.itemUnitAmount) || 0;
          const qty = Number(saved.orderQuantity ?? row.orderQuantity) || 0;
          const discPct =
            Number(
              saved.itemDiscountPercentage ?? row.itemDiscountPercentage,
            ) || 0;
          const discAmt = (unit * qty * discPct) / 100;
          return {
            ...row,
            checked: true,
            orderQuantity: qty,
            itemUnitAmount: unit,
            itemDiscountPercentage: discPct,
            itemTotalDiscountAmount: discAmt,
            itemTotalCost: unit * qty - discAmt,
            prItemId: saved.prItemId,
            createdDt: saved.createdDt,
          };
        });
      }
      setItemList(items);
    },
    [],
  );

  useEffect(() => {
    if (!existing || seeded) return;
    setPurchaseReturnNo(existing.purchaseReturnNo ?? "");
    setSrvId(existing.srvId ? String(existing.srvId) : null);
    if (existing.purchaseReturnDate) {
      const d = new Date(existing.purchaseReturnDate);
      if (!Number.isNaN(d.getTime())) setPurchaseReturnDate(d);
    }
    setHeaderTotals({
      grossAmt: existing.returnActualAmount,
      disAmt: existing.returnDiscount,
      netAmt: existing.returnAmount,
    });
    if (existing.srvId) {
      void loadSrv(existing.srvId, existing.purchaseReturnItem ?? []);
    }
    setSeeded(true);
  }, [existing, seeded, loadSrv]);

  useEffect(() => {
    if (!srvId) {
      if (!isEdit) {
        setSrv(null);
        setItemList([]);
      }
      return;
    }
    if (isEdit && seeded && Number(existing?.srvId) === Number(srvId)) return;
    const id = Number(srvId);
    if (!id) return;
    setHeaderTotals(null);
    void loadSrv(id).catch((err) => toastError(getErrorMessage(err)));
  }, [srvId, isEdit, seeded, existing?.srvId, loadSrv]);

  function toggleItem(index: number, checked: boolean) {
    setHeaderTotals(null);
    setItemList((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], checked };
      return next;
    });
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const nextErrors: typeof fieldErrors = {};
      if (!srvId) nextErrors.srvId = "S.R.V Number is required";
      if (!purchaseReturnNo.trim())
        nextErrors.purchaseReturnNo = "P.R. Number is required";
      setFieldErrors(nextErrors);
      if (Object.keys(nextErrors).length > 0) throw new Error("VALIDATION");
      if (!srv) throw new Error("Please select an S.R.V.");

      const purchaseReturnItem: InvPurchaseReturnItemRow[] = [];
      for (const row of itemList) {
        const line = { ...row, returnedQty: row.orderQuantity };
        if (row.prItemId) {
          purchaseReturnItem.push({
            ...line,
            isActive: row.checked ? true : false,
          });
        } else if (row.checked) {
          purchaseReturnItem.push(line);
        }
      }

      const totals = recalcTotals(itemList);
      const payload: Record<string, unknown> = {
        purchaseReturnNo: purchaseReturnNo.trim(),
        srvId: Number(srvId),
        purchaseReturnDate: purchaseReturnDate
          ? toDateOnlyISO(purchaseReturnDate)
          : undefined,
        poId: srv.poId,
        storeId: srv.storeId,
        supplierId: srv.supplierId,
        invTranstypeCatdetId: srv.invTranstypeCatdetId,
        returnActualAmount: totals.grossAmt,
        returnAmount: totals.netAmt,
        returnDiscount: totals.disAmt,
        purchaseReturnItem,
      };

      if (isEdit && purchaseReturnId) {
        payload.purchasereturnId = purchaseReturnId;
        payload.isActive = existing?.isActive ?? true;
        payload.createdDt = existing?.createdDt;
        await updateInvPurchaseReturn(payload);
      } else {
        await createInvPurchaseReturn(payload);
      }

      void refFile1;
      void refFile2;
    },
    onSuccess: () => {
      toastSuccess(
        isEdit ? "Purchase return updated." : "Purchase return created.",
      );
      router.push(listPath);
    },
    onError: (err) => {
      if (getErrorMessage(err) === "VALIDATION") return;
      toastError(getErrorMessage(err));
    },
  });

  const title = isEdit ? "Edit Purchase Return" : "New Purchase Return";

  return (
    <PageContainer className="space-y-5">
      <div className="app-card overflow-hidden">
        <div className="space-y-4 p-4 md:p-5">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <FileTextIcon
              className="h-4 w-4 text-[hsl(var(--primary))]"
              aria-hidden
            />
            <h1 className="text-[15px] font-semibold text-[hsl(var(--card-title))]">
              {title}
            </h1>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <Select
                label="S.R.V Number *"
                value={srvId}
                onChange={(v) => {
                  setFieldErrors((e) => ({ ...e, srvId: undefined }));
                  setSrvId(v);
                }}
                options={srvOptions}
                placeholder="S.R.V"
                searchable
                error={fieldErrors.srvId}
              />
              {srv && (
                <>
                  <div className="grid grid-cols-[120px_1fr] gap-2 text-xs">
                    <span className="text-muted-foreground">Store</span>
                    <span className="font-semibold text-[#3F51B5]">
                      {srv.storeName ?? ""}
                    </span>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] gap-2 text-xs">
                    <span className="text-muted-foreground">Supplier</span>
                    <span className="font-semibold text-[#3F51B5]">
                      {srv.supplierName ?? ""}
                    </span>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] gap-2 text-xs">
                    <span className="text-muted-foreground">Trans. Type</span>
                    <span className="font-semibold text-[#3F51B5]">
                      {srv.invTranstypeCatdetDisplayName ?? ""}
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-3">
              <div className="space-y-0.5">
                <Label className="text-xs">P.R. Number *</Label>
                <Input
                  className="h-8 text-xs"
                  value={purchaseReturnNo}
                  onChange={(e) => {
                    setFieldErrors((err) => ({
                      ...err,
                      purchaseReturnNo: undefined,
                    }));
                    setPurchaseReturnNo(e.target.value);
                  }}
                  placeholder="P.R. Number"
                  aria-invalid={Boolean(fieldErrors.purchaseReturnNo)}
                />
                {fieldErrors.purchaseReturnNo && (
                  <p className="text-xs text-destructive" role="alert">
                    {fieldErrors.purchaseReturnNo}
                  </p>
                )}
              </div>
              <DatePicker
                label="Date"
                placeholder="P.R. Date"
                value={purchaseReturnDate}
                onChange={setPurchaseReturnDate}
              />
            </div>
          </div>

          {/* Angular Return Items — mat-expansion-panel [expanded]="false" */}
          <div className="overflow-hidden rounded-md border border-border bg-card">
            <button
              type="button"
              className={cn(
                "flex w-full items-center gap-2 bg-muted/40 px-3 py-2.5 text-left",
                "border-t-2 border-t-[hsl(var(--primary))]",
                itemsOpen && "border-b border-border",
              )}
              aria-expanded={itemsOpen}
              onClick={() => setItemsOpen((o) => !o)}
            >
              <ChevronDownIcon
                className={cn(
                  "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300",
                  itemsOpen ? "rotate-0" : "-rotate-90",
                )}
                aria-hidden
              />
              <FileTextIcon
                className="h-4 w-4 text-[hsl(var(--primary))]"
                aria-hidden
              />
              <span className="text-sm font-semibold text-[hsl(var(--primary))]">
                Return Items
              </span>
            </button>
            <div
              className={cn(
                "grid transition-[grid-template-rows] duration-300 ease-in-out",
                itemsOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              )}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="overflow-x-auto p-3">
                  <table className="w-full min-w-[640px] border-collapse text-xs">
                    <thead>
                      <tr>
                        <th className="w-10 border border-border bg-[hsl(var(--primary)/0.06)] px-2 py-2" />
                        <th className="border border-border bg-[hsl(var(--primary)/0.06)] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[hsl(var(--app-table-header-color))]">
                          Items
                        </th>
                        <th className="border border-border bg-[hsl(var(--primary)/0.06)] px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-[hsl(var(--app-table-header-color))]">
                          Unit Price
                        </th>
                        <th className="border border-border bg-[hsl(var(--primary)/0.06)] px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-[hsl(var(--app-table-header-color))]">
                          Quantity
                        </th>
                        <th className="border border-border bg-[hsl(var(--primary)/0.06)] px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-[hsl(var(--app-table-header-color))]">
                          Discount
                        </th>
                        <th className="border border-border bg-[hsl(var(--primary)/0.06)] px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-[hsl(var(--app-table-header-color))]">
                          Total cost
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemList.map((row, idx) =>
                        row.isActive !== false ? (
                          <tr key={row.itemId ?? row.prItemId ?? idx}>
                            <td className="border border-border px-2 py-2 align-middle">
                              <Checkbox
                                checked={Boolean(row.checked)}
                                onCheckedChange={(v) =>
                                  toggleItem(idx, v === true)
                                }
                              />
                            </td>
                            <td className="border border-border px-3 py-2">
                              {row.itemName ?? row.itemCode ?? ""}
                            </td>
                            <td className="border border-border px-3 py-2 text-right">
                              {row.itemUnitAmount ?? row.unitPrice ?? ""}
                            </td>
                            <td className="border border-border px-3 py-2 text-right">
                              {row.orderQuantity ?? ""}
                            </td>
                            <td className="border border-border px-3 py-2 text-right">
                              {row.itemTotalDiscountAmount ?? ""}
                            </td>
                            <td className="border border-border px-3 py-2 text-right">
                              {row.itemTotalCost ?? ""}
                            </td>
                          </tr>
                        ) : null,
                      )}
                      <tr>
                        <td colSpan={4} className="border-0" />
                        <td className="border border-border px-3 py-2 text-right font-medium">
                          Gross Amt
                        </td>
                        <td className="border border-border px-3 py-2 text-right">
                          {grossAmt ?? ""}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={4} className="border-0" />
                        <td className="border border-border px-3 py-2 text-right font-medium">
                          Discount Amt
                        </td>
                        <td className="border border-border px-3 py-2 text-right">
                          {disAmt ?? ""}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={4} className="border-0" />
                        <td className="border border-border px-3 py-2 text-right font-medium">
                          Total Amt
                        </td>
                        <td className="border border-border px-3 py-2 text-right">
                          {netAmt ?? ""}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-10">
            <FileChooseField
              label="P.R. Ref. File 1"
              accept=".png,.jpg,.jpeg,.pdf,.doc"
              file={refFile1}
              onChange={setRefFile1}
            />
            <FileChooseField
              label="P.R. Ref. File 2"
              accept=".png,.jpg,.jpeg,.pdf,.doc"
              file={refFile2}
              onChange={setRefFile2}
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <Button
              type="button"
              variant="outline"
              className="h-9 min-w-[5.5rem]"
              onClick={() => router.push(listPath)}
            >
              Back
            </Button>
            {itemList.length > 0 && (
              <Button
                type="button"
                className="h-9 min-w-[5.5rem]"
                disabled={saveMutation.isPending || loadingExisting}
                onClick={() => saveMutation.mutate()}
              >
                {saveMutation.isPending ? "Saving…" : "Save"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
