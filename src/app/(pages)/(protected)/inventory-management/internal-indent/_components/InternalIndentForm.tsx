"use client";

/**
 * Inventory Internal Indent add/edit — Angular `add-internal-indent-items` parity.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BookIcon, PlusIcon, XIcon } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DatePicker } from "@/common/components/date-picker";
import { Select } from "@/common/components/select";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { QK } from "@/lib/query-keys";
import { toastError, toastSuccess } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import { toDateOnlyISO } from "@/common/generic-functions";
import {
  createInvInternalIndent,
  getEOfficeContextIds,
  getInvInternalIndentById,
  listInvItemsMaster,
  listInvStoresMaster,
  listTransTypesForInternalIndent,
  updateInvInternalIndent,
} from "@/services";
import type { InvInternalIndentItemRow } from "@/types/inventory";

const INDENT_LIST = "/inventory-management/internal-indent";

type ItemLine = InvInternalIndentItemRow & { key: string };

/** Angular default itemList row (receivedQty: 2). */
function newLine(): ItemLine {
  return {
    key: crypto.randomUUID(),
    isActive: true,
    itemCode: "TEST",
    itemId: undefined,
    indentQuantity: 0,
    orderQuantity: 0,
    receivedQty: 2,
    isReqTracking: true,
    itemTotalActualAmount: 0,
    itemDiscountPercentage: 0,
    itemTaxPercentage: 0,
    itemTotalDiscountAmount: 0,
    itemTotalCost: 0,
  };
}

export function InternalIndentForm({
  indentId,
  listPath = INDENT_LIST,
}: {
  indentId?: number;
  listPath?: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = Boolean(indentId && indentId > 0);
  const ctx = getEOfficeContextIds();

  const [storeId, setStoreId] = useState<string | null>(null);
  const [transTypeId, setTransTypeId] = useState<string | null>(null);
  const [indentDate, setIndentDate] = useState<Date | null>(new Date());
  const [internalIndNo, setInternalIndNo] = useState("");
  const [purpose, setPurpose] = useState("");
  const [lines, setLines] = useState<ItemLine[]>([newLine()]);
  /** Existing items from get-by-id (for Angular editOrder itemId matching). */
  const [existingItems, setExistingItems] = useState<
    InvInternalIndentItemRow[]
  >([]);
  const [fieldErrors, setFieldErrors] = useState<{
    storeId?: string;
    transTypeId?: string;
    items?: string;
  }>({});

  const { data: stores = [] } = useQuery({
    queryKey: [...QK.invInternalIndents.all, "stores"],
    queryFn: listInvStoresMaster,
  });
  const { data: items = [] } = useQuery({
    queryKey: [...QK.invInternalIndents.all, "items"],
    queryFn: listInvItemsMaster,
  });
  const { data: transTypes = [] } = useQuery({
    queryKey: [...QK.invInternalIndents.all, "transTypes"],
    queryFn: listTransTypesForInternalIndent,
  });

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: QK.invInternalIndents.detail(indentId ?? 0),
    queryFn: () => getInvInternalIndentById(indentId!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!existing) return;
    setStoreId(existing.storeId ? String(existing.storeId) : null);
    setTransTypeId(
      existing.invTranstypeCatdetId
        ? String(existing.invTranstypeCatdetId)
        : null,
    );
    setInternalIndNo(existing.internalIndNo ?? "");
    setPurpose(existing.purpose ?? "");
    if (existing.indentDate) {
      const d = new Date(existing.indentDate);
      if (!Number.isNaN(d.getTime())) setIndentDate(d);
    }
    const rawItems = existing.invInternalIndentitems ?? [];
    setExistingItems(rawItems);
    const active = rawItems.filter((it) => it.isActive !== false);
    setLines(
      active.length > 0
        ? active.map((it) => ({
            ...it,
            key: String(it.interIndItemId ?? crypto.randomUUID()),
            isActive: true,
          }))
        : [newLine()],
    );
  }, [existing]);

  /** Prefer Angular default selection: Internal Indent when creating. */
  useEffect(() => {
    if (isEdit || transTypeId || transTypes.length === 0) return;
    const internal = transTypes.find((t) => {
      const code = String(t.generalDetailCode ?? "").toUpperCase();
      const name = String(t.generalDetailDisplayName ?? "").toUpperCase();
      return code === "INTERNAL INDENT" || name === "INTERNAL INDENT";
    });
    const pick = internal ?? transTypes[0];
    if (pick?.generalDetailId != null) {
      setTransTypeId(String(pick.generalDetailId));
    }
  }, [isEdit, transTypeId, transTypes]);

  const storeOptions = useMemo(
    () =>
      stores.map((s) => ({
        value: String(s.storeId),
        label: s.storeCode ?? s.storeName ?? String(s.storeId),
        title: s.storeName,
      })),
    [stores],
  );

  const itemOptions = useMemo(
    () =>
      items.map((it) => ({
        value: String(it.itemId),
        label: `${it.itemName ?? ""} (${it.itemCode ?? ""})`.trim(),
      })),
    [items],
  );

  const transTypeOptions = useMemo(
    () =>
      transTypes.map((t) => ({
        value: String(t.generalDetailId),
        label: String(t.generalDetailDisplayName ?? t.generalDetailId ?? ""),
      })),
    [transTypes],
  );

  const updateLine = useCallback((key: string, patch: Partial<ItemLine>) => {
    setLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, ...patch } : l)),
    );
  }, []);

  const removeLine = useCallback((key: string) => {
    setLines((prev) => {
      const next = prev.filter((l) => l.key !== key);
      return next.length > 0 ? next : [newLine()];
    });
  }, []);

  const validate = useCallback(() => {
    const errors: typeof fieldErrors = {};
    if (!storeId) errors.storeId = "Store is required";
    if (!transTypeId) errors.transTypeId = "Transaction Type is required";
    const activeLines = lines.filter((l) => l.isActive !== false && l.itemId);
    if (activeLines.length === 0)
      errors.items = "At least one item is required";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [storeId, transTypeId, lines]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!validate()) throw new Error("Please fill required fields");

      const sid = Number(storeId);
      const tid = Number(transTypeId);
      const dateStr = indentDate ? toDateOnlyISO(indentDate) : undefined;

      if (isEdit) {
        /**
         * Angular `editOrder`: only items whose itemId still matches an original
         * list item get `interIndItemId`; soft-deleted originals are not sent.
         */
        const updateItems: Record<string, unknown>[] = [];
        for (const orig of existingItems) {
          const match = lines.find(
            (l) =>
              l.isActive !== false &&
              l.itemId != null &&
              Number(l.itemId) === Number(orig.itemId),
          );
          if (match && orig.interIndItemId) {
            updateItems.push({
              interIndItemId: orig.interIndItemId,
              itemId: Number(match.itemId),
              indentQuantity: Number(match.indentQuantity) || 0,
              storeId: sid,
            });
          }
        }

        await updateInvInternalIndent({
          internalIndId: indentId,
          storeId: sid,
          invTranstypeCatdetId: tid,
          indentDate: dateStr,
          purpose,
          invInternalIndentitems: updateItems,
          isActive: true,
        });
        return;
      }

      /** Angular `saveOrder` create payload. */
      const invInternalIndentitems = lines
        .filter((l) => l.isActive !== false && l.itemId)
        .map((l) => {
          const master = items.find((m) => m.itemId === Number(l.itemId));
          return {
            isActive: true,
            itemCode: master?.itemCode ?? l.itemCode ?? "code",
            itemId: Number(l.itemId),
            indentQuantity: Number(l.indentQuantity) || 0,
            orderQuantity: Number(l.orderQuantity) || 0,
            receivedQty: Number(l.receivedQty) || 2,
            isReqTracking: true,
            itemTotalActualAmount: 0,
            itemDiscountPercentage: 0,
            itemTaxPercentage: 0,
            itemTotalDiscountAmount: 0,
            itemTotalCost: 0,
            issuedQty: 0,
            storeId: sid,
          };
        });

      await createInvInternalIndent({
        storeId: sid,
        invTranstypeCatdetId: tid,
        indentDate: dateStr,
        invInternalIndentitems,
        igst: 0,
        poActualAmount: 0,
        poTotalCost: 0,
        sgst: 0,
        shippingCharges: 0,
        otherCharges: 0,
        purpose,
        poComments: "",
        totalTax: 0,
        poNetCost: 0,
        collegeId: ctx.collegeId || undefined,
        authEmployeeId: ctx.employeeId || undefined,
        indentRaisedEmpId: ctx.employeeId || undefined,
        destDeptId: ctx.empDeptId || undefined,
        destinationEmpId: ctx.employeeId || undefined,
      });
    },
    onSuccess: async () => {
      toastSuccess(isEdit ? "Indent updated." : "Indent created.");
      await queryClient.invalidateQueries({
        queryKey: QK.invInternalIndents.all,
      });
      router.push(listPath);
    },
    onError: (err) => {
      if (err instanceof Error && err.message === "Please fill required fields")
        return;
      toastError(getErrorMessage(err));
    },
  });

  const title = isEdit
    ? "Edit Internal Requisition"
    : "New Internal Requisition";
  const canSave = lines.some((l) => l.isActive !== false);
  const activeLines = lines.filter((l) => l.isActive !== false);

  return (
    <PageContainer className="space-y-5">
      <div className="app-card overflow-hidden">
        <div className="space-y-5 p-4 md:p-6">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <BookIcon
              className="h-4 w-4 text-[hsl(var(--primary))]"
              aria-hidden
            />
            <h1 className="text-[15px] font-semibold text-[hsl(var(--card-title))]">
              {title}
            </h1>
          </div>

          {loadingExisting && isEdit ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <>
              {/* Angular: two-column label|field tables — Store/Trans left, Date right */}
              <div className="grid grid-cols-1 gap-x-10 gap-y-4 lg:grid-cols-2">
                <div className="space-y-3">
                  <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1">
                    <Label className="text-sm font-medium text-foreground">
                      Store
                    </Label>
                    <div className="min-w-0">
                      <Select
                        value={storeId}
                        onChange={(v) => {
                          setStoreId(v);
                          setFieldErrors((e) => ({ ...e, storeId: undefined }));
                        }}
                        options={storeOptions}
                        searchable
                        placeholder="Store"
                        error={fieldErrors.storeId}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1">
                    <Label className="text-sm font-medium text-foreground">
                      Trans. Type
                    </Label>
                    <div className="min-w-0">
                      <Select
                        value={transTypeId}
                        onChange={(v) => {
                          setTransTypeId(v);
                          setFieldErrors((e) => ({
                            ...e,
                            transTypeId: undefined,
                          }));
                        }}
                        options={transTypeOptions}
                        searchable
                        placeholder="Transaction Type"
                        error={fieldErrors.transTypeId}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {isEdit ? (
                    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-x-3">
                      <Label className="text-sm font-medium text-foreground">
                        Indent No.
                      </Label>
                      <Input
                        value={internalIndNo}
                        disabled
                        placeholder="Indent Number"
                        className="h-9 bg-muted/30"
                      />
                    </div>
                  ) : null}
                  <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-x-3">
                    <Label className="text-sm font-medium text-foreground">
                      Date
                    </Label>
                    <DatePicker
                      value={indentDate}
                      onChange={setIndentDate}
                      placeholder="Indent Date"
                      displayFormat="dd/MM/yyyy"
                    />
                  </div>
                </div>
              </div>

              {/* Angular items table ~50% width on desktop */}
              <div className="max-w-3xl space-y-2">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr>
                        <th className="border border-border bg-[hsl(var(--primary)/0.06)] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[hsl(var(--app-table-header-color))]">
                          Items
                        </th>
                        <th className="w-40 border border-border bg-[hsl(var(--primary)/0.06)] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[hsl(var(--app-table-header-color))]">
                          Quantity
                        </th>
                        <th
                          className="w-12 border border-border bg-[hsl(var(--primary)/0.06)] px-2 py-2"
                          aria-hidden
                        />
                      </tr>
                    </thead>
                    <tbody>
                      {activeLines.map((line) => (
                        <tr key={line.key}>
                          <td className="border border-border px-2 py-2 align-middle">
                            <Select
                              value={line.itemId ? String(line.itemId) : null}
                              onChange={(v) => {
                                const id = v ? Number(v) : undefined;
                                const master = items.find(
                                  (m) => m.itemId === id,
                                );
                                updateLine(line.key, {
                                  itemId: id,
                                  itemCode: master?.itemCode ?? line.itemCode,
                                  itemName: master?.itemName,
                                });
                                setFieldErrors((e) => ({
                                  ...e,
                                  items: undefined,
                                }));
                              }}
                              options={itemOptions}
                              searchable
                              placeholder="Item"
                            />
                          </td>
                          <td className="border border-border px-2 py-2 align-middle">
                            <Input
                              type="number"
                              step="any"
                              min={0}
                              className="h-9 text-right tabular-nums"
                              placeholder="Indent Quantity"
                              value={line.indentQuantity ?? 0}
                              onChange={(e) =>
                                updateLine(line.key, {
                                  indentQuantity: Number(e.target.value) || 0,
                                })
                              }
                            />
                          </td>
                          <td className="border border-border px-1 py-2 text-center align-middle">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              aria-label="Remove row"
                              onClick={() => removeLine(line.key)}
                            >
                              <XIcon className="h-4 w-4" strokeWidth={2.5} />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* + under Items column, left-aligned (create only) */}
                  {!isEdit ? (
                    <div className="mt-2 flex justify-start">
                      <Button
                        type="button"
                        size="icon"
                        className="h-9 w-9 shrink-0 rounded-md shadow-sm"
                        aria-label="Add item row"
                        title="Add item"
                        onClick={() => setLines((p) => [...p, newLine()])}
                      >
                        <PlusIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : null}
                </div>
                {fieldErrors.items ? (
                  <p className="text-xs text-destructive">
                    {fieldErrors.items}
                  </p>
                ) : null}

                <div className="space-y-1.5 pt-3">
                  <Label
                    htmlFor="indent-purpose"
                    className="text-sm font-medium"
                  >
                    Purpose
                  </Label>
                  <Textarea
                    id="indent-purpose"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="Purpose"
                    className="min-h-[100px] resize-y"
                  />
                </div>
              </div>

              {canSave ? (
                <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 min-w-[6rem]"
                    onClick={() => router.push(listPath)}
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    className="h-9 min-w-[6rem]"
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending || loadingExisting}
                  >
                    {saveMutation.isPending ? "Saving…" : "Save"}
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
