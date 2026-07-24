"use client";

/**
 * Inventory Internal Item Return add/edit — Angular `add-internal-item-return` parity.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BookIcon } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DatePicker } from "@/common/components/date-picker";
import { Select } from "@/common/components/select";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { QK } from "@/lib/query-keys";
import { toastError, toastSuccess } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import { toDateOnlyISO } from "@/common/generic-functions";
import {
  createInvInternalReturn,
  getInvInternalReturnById,
  listActiveIssuesForInternalReturn,
  updateInvInternalReturn,
} from "@/services";
import type {
  InvInternalIssue,
  InvInternalIssueItemRow,
  InvInternalReturnItemRow,
} from "@/types/inventory";

const RETURN_LIST = "/inventory-management/internal-item-return";

type ReturnLine = InvInternalReturnItemRow & {
  key: string;
  dupChecked?: boolean;
  unitPrice?: number;
  issuedQty?: number;
  rejectedQty?: number;
};

function mapIssueItems(items: InvInternalIssueItemRow[]): ReturnLine[] {
  return items
    .filter((row) => row.isActive !== false)
    .map((row) => ({
      ...row,
      key: String(row.interIssueItemId ?? row.itemId ?? crypto.randomUUID()),
      checked: false,
      dupChecked: true,
    }));
}

/** Angular `selectedInternalIssue` merge with existing return items on edit. */
function mergeEditReturnItems(
  issueItems: ReturnLine[],
  savedItems: InvInternalReturnItemRow[],
): ReturnLine[] {
  return issueItems.map((row) => {
    const saved = savedItems.find((s) => s.itemId === row.itemId);
    if (!saved) return row;
    return {
      ...row,
      ...saved,
      key: row.key,
      checked: true,
      dupChecked: true,
      interReturnItemId: saved.interReturnItemId,
      interIssueItemId: row.interIssueItemId ?? saved.interIssueItemId,
      createdDt: saved.createdDt,
    };
  });
}

export function InternalItemReturnForm({
  interReturnId,
  listPath = RETURN_LIST,
}: {
  interReturnId?: number;
  listPath?: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = Boolean(interReturnId && interReturnId > 0);

  const [issueId, setIssueId] = useState<string | null>(null);
  const [issue, setIssue] = useState<InvInternalIssue | null>(null);
  const [internalReturnNo, setInternalReturnNo] = useState("");
  const [returnDate, setReturnDate] = useState<Date | null>(new Date());
  const [returnPurpose, setReturnPurpose] = useState("");
  const [itemList, setItemList] = useState<ReturnLine[]>([]);
  const [fieldErrors, setFieldErrors] = useState<{
    issueId?: string;
    items?: string;
  }>({});
  const [seededEdit, setSeededEdit] = useState(false);

  const { data: issues = [], isLoading: loadingIssues } = useQuery({
    queryKey: [...QK.invInternalReturns.all, "issues"],
    queryFn: listActiveIssuesForInternalReturn,
  });

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: QK.invInternalReturns.detail(interReturnId ?? 0),
    queryFn: () => getInvInternalReturnById(interReturnId!),
    enabled: isEdit,
  });

  const issueOptions = useMemo(
    () =>
      issues.map((row) => ({
        value: String(row.interIssueId),
        label: row.internalIssueNo ?? String(row.interIssueId),
      })),
    [issues],
  );

  /** Angular `selectedInternalIssue(interIssueId)` — uses list row nested items. */
  const applyIssue = useCallback(
    (interIssueId: number, mergeSaved?: InvInternalReturnItemRow[]) => {
      const row = issues.find((x) => x.interIssueId === interIssueId) ?? null;
      setIssue(row);
      let items = mapIssueItems(row?.invInternalIssueItemDTOs ?? []);
      if (mergeSaved?.length) {
        items = mergeEditReturnItems(items, mergeSaved);
      }
      setItemList(items);
    },
    [issues],
  );

  useEffect(() => {
    if (!existing || seededEdit || loadingIssues) return;
    setSeededEdit(true);
    setInternalReturnNo(existing.internalReturnNo ?? "");
    setIssueId(existing.interIssueId ? String(existing.interIssueId) : null);
    setReturnPurpose(existing.returnPurpose ?? "");
    if (existing.returnDate) {
      const d = new Date(existing.returnDate);
      if (!Number.isNaN(d.getTime())) setReturnDate(d);
    }
    if (existing.interIssueId) {
      applyIssue(
        existing.interIssueId,
        existing.invInternalReturnItemDTOs ?? [],
      );
    }
  }, [existing, seededEdit, loadingIssues, applyIssue]);

  function onIssueChange(value: string | null) {
    setIssueId(value);
    setFieldErrors((e) => ({ ...e, issueId: undefined }));
    if (!value) {
      setIssue(null);
      setItemList([]);
      return;
    }
    applyIssue(Number(value));
  }

  function toggleItem(key: string, checked: boolean) {
    setItemList((prev) =>
      prev.map((row) =>
        row.key === key ? { ...row, checked, dupChecked: checked } : row,
      ),
    );
    setFieldErrors((e) => ({ ...e, items: undefined }));
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const errors: typeof fieldErrors = {};
      if (!issueId || !issue) errors.issueId = "Issue No. is required";
      setFieldErrors(errors);
      if (Object.keys(errors).length > 0) {
        throw new Error("Please fill required fields");
      }

      /**
       * Angular `saveOrder`:
       * - returnedQty = orderQuantity on every line
       * - include lines with interIssueItemId (checked keep, else isActive=false)
       * - include lines without interIssueItemId only when checked
       * - fromEmployeeId = issue.toEmployeeId
       */
      const invInternalReturnItemDTOs: InvInternalReturnItemRow[] = [];
      for (const row of itemList) {
        const {
          key: _key,
          dupChecked: _dup,
          unitPrice: _u,
          issuedQty: _i,
          rejectedQty: _r,
          ...rest
        } = row;
        const line: InvInternalReturnItemRow = {
          ...rest,
          returnedQty: row.orderQuantity ?? 0,
        };

        if (row.interIssueItemId) {
          invInternalReturnItemDTOs.push({
            ...line,
            isActive: row.checked ? true : false,
          });
        } else if (row.checked) {
          invInternalReturnItemDTOs.push(line);
        }
      }

      if (!itemList.some((row) => row.checked && row.isActive !== false)) {
        setFieldErrors((e) => ({
          ...e,
          items: "Select at least one item to return.",
        }));
        throw new Error("Please fill required fields");
      }

      const payload: Record<string, unknown> = {
        interIssueId: Number(issueId),
        returnDate: returnDate ? toDateOnlyISO(returnDate) : undefined,
        returnPurpose,
        poId: issue!.poId,
        storeId: issue!.storeId,
        fromEmployeeId: issue!.toEmployeeId,
        invTranstypeCatdetId: issue!.invTranstypeCatdetId,
        invInternalReturnItemDTOs,
        igst: 0,
        poActualAmount: 0,
        poTotalCost: 0,
        sgst: 0,
        shippingCharges: 0,
        otherCharges: 0,
        termsconditions: "",
        poComments: "",
        totalTax: 0,
        poNetCost: 0,
      };

      if (isEdit && interReturnId) {
        payload.interReturnId = interReturnId;
        payload.createdDt = existing?.createdDt;
        payload.isActive = existing?.isActive ?? true;
        await updateInvInternalReturn(payload);
      } else {
        await createInvInternalReturn(payload);
      }
    },
    onSuccess: async () => {
      toastSuccess(
        isEdit ? "Internal return updated." : "Internal return created.",
      );
      await queryClient.invalidateQueries({
        queryKey: QK.invInternalReturns.all,
      });
      router.push(listPath);
    },
    onError: (err) => {
      if (err instanceof Error && err.message === "Please fill required fields")
        return;
      toastError(getErrorMessage(err));
    },
  });

  const title = isEdit ? "Edit Internal Return" : "New Internal Return";
  const transTypeName =
    issue?.invTranstypeCatdetDisplayName ??
    issue?.invTranstypeCatdetIdDisplayName ??
    "—";

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
              <div className="grid grid-cols-1 gap-x-10 gap-y-4 lg:grid-cols-2">
                <div className="space-y-3">
                  <div className="grid grid-cols-[7rem_minmax(0,1fr)] items-center gap-x-3">
                    <Label className="text-sm font-medium">Issue No.</Label>
                    <Select
                      value={issueId}
                      onChange={onIssueChange}
                      options={issueOptions}
                      placeholder="Issue No."
                      searchable
                      disabled={isEdit}
                      isLoading={loadingIssues}
                      error={fieldErrors.issueId}
                    />
                  </div>
                  {issue ? (
                    <>
                      <div className="grid grid-cols-[7rem_minmax(0,1fr)] items-center gap-x-3 text-sm">
                        <span className="font-medium">Store</span>
                        <span className="font-semibold text-[hsl(var(--primary))]">
                          {issue.storeName ?? issue.storeCode ?? "—"}
                        </span>
                      </div>
                      <div className="grid grid-cols-[7rem_minmax(0,1fr)] items-center gap-x-3 text-sm">
                        <span className="font-medium">From Employee</span>
                        <span className="font-semibold text-[hsl(var(--primary))]">
                          {issue.toEmpName ?? "—"}
                        </span>
                      </div>
                      <div className="grid grid-cols-[7rem_minmax(0,1fr)] items-center gap-x-3 text-sm">
                        <span className="font-medium">Trans. Type</span>
                        <span className="font-semibold text-[hsl(var(--primary))]">
                          {transTypeName}
                        </span>
                      </div>
                    </>
                  ) : null}
                </div>

                <div className="space-y-3">
                  {isEdit ? (
                    <div className="grid grid-cols-[7rem_minmax(0,1fr)] items-center gap-x-3">
                      <Label className="text-sm font-medium">Return No.</Label>
                      <Input
                        value={internalReturnNo}
                        disabled
                        placeholder="Internal Return No."
                        className="h-9 bg-muted/30"
                      />
                    </div>
                  ) : null}
                  <div className="grid grid-cols-[7rem_minmax(0,1fr)] items-center gap-x-3">
                    <Label className="text-sm font-medium">Return Date</Label>
                    <DatePicker
                      value={returnDate}
                      onChange={setReturnDate}
                      placeholder="Return Date"
                      displayFormat="dd/MM/yyyy"
                    />
                  </div>
                </div>
              </div>

              {itemList.length > 0 ? (
                <div className="max-w-3xl space-y-3">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr>
                          <th className="w-12 border border-border bg-[hsl(var(--primary)/0.06)] px-2 py-2" />
                          <th className="border border-border bg-[hsl(var(--primary)/0.06)] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[hsl(var(--app-table-header-color))]">
                            Items
                          </th>
                          <th className="w-36 border border-border bg-[hsl(var(--primary)/0.06)] px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-[hsl(var(--app-table-header-color))]">
                            Quantity
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {itemList.map((row) =>
                          row.isActive !== false ? (
                            <tr key={row.key}>
                              <td className="border border-border px-2 py-2 text-center align-middle">
                                <Checkbox
                                  checked={Boolean(row.checked)}
                                  onCheckedChange={(v) =>
                                    toggleItem(row.key, v === true)
                                  }
                                />
                              </td>
                              <td className="border border-border px-3 py-2 align-middle">
                                {row.itemName ?? row.itemCode ?? "—"}
                              </td>
                              <td className="border border-border px-3 py-2 text-right align-middle tabular-nums">
                                {row.indentQuantity ?? 0}
                              </td>
                            </tr>
                          ) : null,
                        )}
                      </tbody>
                    </table>
                  </div>
                  {fieldErrors.items ? (
                    <p className="text-xs text-destructive">
                      {fieldErrors.items}
                    </p>
                  ) : null}

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="returnPurpose"
                      className="text-sm font-medium"
                    >
                      Return Purpose
                    </Label>
                    <Textarea
                      id="returnPurpose"
                      className="min-h-[100px] resize-y"
                      placeholder="Return Purpose"
                      value={returnPurpose}
                      onChange={(e) => setReturnPurpose(e.target.value)}
                    />
                  </div>

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
                </div>
              ) : (
                <div className="flex justify-end border-t border-border pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 min-w-[6rem]"
                    onClick={() => router.push(listPath)}
                  >
                    Back
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
