"use client";

/**
 * Inventory Internal Issue add/edit — Angular `add-internal-issue` parity.
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
import { Checkbox } from "@/components/ui/checkbox";
import { QK } from "@/lib/query-keys";
import { toastError, toastSuccess } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import { toDateOnlyISO } from "@/common/generic-functions";
import {
  createInvInternalIssue,
  getInvInternalIssueById,
  listActiveIndentsForInternalIssue,
  searchEmployeesForInternalIssue,
  updateInvInternalIssue,
} from "@/services";
import type {
  InvInternalIndentItemRow,
  InvInternalIndentListRow,
  InvInternalIssueItemRow,
} from "@/types/inventory";

const ISSUE_LIST = "/inventory-management/internal-item-issue";

type IssueLine = InvInternalIssueItemRow & {
  key: string;
  dupChecked?: boolean;
};

function employeeLabel(row: Record<string, unknown>): string {
  const name = String(row.firstName ?? "").trim();
  const num = row.empNumber != null ? String(row.empNumber) : "";
  return num ? `${name} (${num})` : name || String(row.employeeId ?? "");
}

function mapIndentItems(items: InvInternalIndentItemRow[]): IssueLine[] {
  return items
    .filter((row) => row.isActive !== false)
    .map((row) => ({
      ...row,
      key: String(row.interIndItemId ?? row.itemId ?? crypto.randomUUID()),
      checked: false,
      dupChecked: true,
      unitPrice: (row as InvInternalIssueItemRow).unitPrice,
      issuedQty: row.issuedQty ?? 0,
      rejectedQty: (row as InvInternalIssueItemRow).rejectedQty ?? 0,
    }));
}

/** Angular `selectedIndent` merge with existing issue items on edit. */
function mergeEditItems(
  indentItems: IssueLine[],
  savedItems: InvInternalIssueItemRow[],
): IssueLine[] {
  return indentItems.map((row) => {
    const saved = savedItems.find((s) => s.itemId === row.itemId);
    if (!saved) return row;
    return {
      ...row,
      ...saved,
      key: row.key,
      checked: true,
      dupChecked: true,
      interIssueItemId: saved.interIssueItemId,
      createdDt: saved.createdDt,
    };
  });
}

export function InternalIssueForm({
  interIssueId,
  listPath = ISSUE_LIST,
}: {
  interIssueId?: number;
  listPath?: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = Boolean(interIssueId && interIssueId > 0);

  const [indentId, setIndentId] = useState<string | null>(null);
  const [indent, setIndent] = useState<InvInternalIndentListRow | null>(null);
  const [toEmployeeId, setToEmployeeId] = useState<string | null>(null);
  const [employeeOptions, setEmployeeOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [employeeSearchLoading, setEmployeeSearchLoading] = useState(false);
  const [internalIssueNo, setInternalIssueNo] = useState("");
  const [issueDate, setIssueDate] = useState<Date | null>(new Date());
  const [itemList, setItemList] = useState<IssueLine[]>([]);
  const [fieldErrors, setFieldErrors] = useState<{
    indentId?: string;
    toEmployeeId?: string;
    items?: string;
  }>({});
  const [seededEdit, setSeededEdit] = useState(false);

  const { data: indents = [], isLoading: loadingIndents } = useQuery({
    queryKey: [...QK.invInternalIssues.all, "indents"],
    queryFn: listActiveIndentsForInternalIssue,
  });

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: QK.invInternalIssues.detail(interIssueId ?? 0),
    queryFn: () => getInvInternalIssueById(interIssueId!),
    enabled: isEdit,
  });

  const indentOptions = useMemo(
    () =>
      indents.map((ind) => ({
        value: String(ind.internalIndId),
        label: ind.internalIndNo ?? String(ind.internalIndId),
      })),
    [indents],
  );

  /** Angular `selectedIndent(internalIndId)` — uses list row nested items. */
  const applyIndent = useCallback(
    (internalIndId: number, mergeSaved?: InvInternalIssueItemRow[]) => {
      const row =
        indents.find((x) => x.internalIndId === internalIndId) ?? null;
      setIndent(row);
      let items = mapIndentItems(row?.invInternalIndentitems ?? []);
      if (mergeSaved?.length) {
        items = mergeEditItems(items, mergeSaved);
      }
      setItemList(items);
    },
    [indents],
  );

  useEffect(() => {
    if (!existing || seededEdit || loadingIndents) return;
    setSeededEdit(true);
    setInternalIssueNo(existing.internalIssueNo ?? "");
    setIndentId(existing.internalIndId ? String(existing.internalIndId) : null);
    setToEmployeeId(
      existing.toEmployeeId ? String(existing.toEmployeeId) : null,
    );
    if (existing.issueDate) {
      const d = new Date(existing.issueDate);
      if (!Number.isNaN(d.getTime())) setIssueDate(d);
    }
    if (existing.toEmpName && existing.toEmployeeId) {
      setEmployeeOptions([
        {
          value: String(existing.toEmployeeId),
          label: existing.toEmpName,
        },
      ]);
      // Angular also re-searches by name when editing
      void searchEmployeesForInternalIssue(existing.toEmpName).then((rows) => {
        if (rows.length === 0) return;
        setEmployeeOptions(
          rows.map((r) => ({
            value: String(r.employeeId),
            label: employeeLabel(r),
          })),
        );
      });
    }
    if (existing.internalIndId) {
      applyIndent(
        existing.internalIndId,
        existing.invInternalIssueItemDTOs ?? [],
      );
    }
  }, [existing, seededEdit, loadingIndents, applyIndent]);

  function onIndentChange(value: string | null) {
    setIndentId(value);
    setFieldErrors((e) => ({ ...e, indentId: undefined }));
    if (!value) {
      setIndent(null);
      setItemList([]);
      return;
    }
    applyIndent(Number(value));
  }

  async function onEmployeeSearch(term: string) {
    const q = term.trim();
    if (q.length < 4) {
      if (!q) setEmployeeOptions([]);
      return;
    }
    setEmployeeSearchLoading(true);
    try {
      const rows = await searchEmployeesForInternalIssue(q);
      setEmployeeOptions(
        rows.map((row) => ({
          value: String(row.employeeId),
          label: employeeLabel(row),
        })),
      );
    } catch {
      setEmployeeOptions([]);
    } finally {
      setEmployeeSearchLoading(false);
    }
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
      if (!indentId || !indent) errors.indentId = "Indent No. is required";
      if (!toEmployeeId) errors.toEmployeeId = "Employee is required";
      setFieldErrors(errors);
      if (Object.keys(errors).length > 0) {
        throw new Error("Please fill required fields");
      }

      /**
       * Angular `saveOrder`:
       * - set returnedQty = orderQuantity on every line
       * - include lines with interIssueItemId (checked=true keep, else isActive=false)
       * - include new lines only when checked
       */
      const invInternalIssueItemDTOs: InvInternalIssueItemRow[] = [];
      for (const row of itemList) {
        const { key: _key, dupChecked: _dup, ...rest } = row;
        const line: InvInternalIssueItemRow = {
          ...rest,
          /** Angular: `il['returnedQty'] = il.orderQuantity` */
          returnedQty: row.orderQuantity ?? 0,
        };

        if (row.interIssueItemId) {
          invInternalIssueItemDTOs.push({
            ...line,
            isActive: row.checked ? true : false,
          });
        } else if (row.checked) {
          invInternalIssueItemDTOs.push(line);
        }
      }

      if (invInternalIssueItemDTOs.length === 0) {
        setFieldErrors((e) => ({
          ...e,
          items: "Select at least one item to issue.",
        }));
        throw new Error("Please fill required fields");
      }

      const payload: Record<string, unknown> = {
        internalIndId: Number(indentId),
        toEmployeeId: Number(toEmployeeId),
        issueDate: issueDate ? toDateOnlyISO(issueDate) : undefined,
        poId: indent!.poId,
        storeId: indent!.storeId,
        invTranstypeCatdetId: indent!.invTranstypeCatdetId,
        invInternalIssueItemDTOs,
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

      if (isEdit && interIssueId) {
        payload.interIssueId = interIssueId;
        payload.createdDt = existing?.createdDt;
        payload.isActive = existing?.isActive ?? true;
        await updateInvInternalIssue(payload);
      } else {
        await createInvInternalIssue(payload);
      }
    },
    onSuccess: async () => {
      toastSuccess(
        isEdit ? "Internal issue updated." : "Internal issue created.",
      );
      await queryClient.invalidateQueries({
        queryKey: QK.invInternalIssues.all,
      });
      router.push(listPath);
    },
    onError: (err) => {
      if (err instanceof Error && err.message === "Please fill required fields")
        return;
      toastError(getErrorMessage(err));
    },
  });

  const title = isEdit ? "Edit Internal Issue" : "New Internal Issue";
  const transTypeName =
    indent?.invTranstypeCatdetIdDisplayName ??
    indent?.invTranstypeCatdetDisplayName ??
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
                  <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-x-3">
                    <Label className="text-sm font-medium">Indent No.</Label>
                    <Select
                      value={indentId}
                      onChange={onIndentChange}
                      options={indentOptions}
                      placeholder="Indent No."
                      searchable
                      disabled={isEdit}
                      isLoading={loadingIndents}
                      error={fieldErrors.indentId}
                    />
                  </div>
                  <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-x-3">
                    <Label className="text-sm font-medium">To Employee</Label>
                    <Select
                      value={toEmployeeId}
                      onChange={(v) => {
                        setToEmployeeId(v);
                        setFieldErrors((e) => ({
                          ...e,
                          toEmployeeId: undefined,
                        }));
                      }}
                      options={employeeOptions}
                      placeholder="Employee"
                      searchable
                      onSearch={(term) => void onEmployeeSearch(term)}
                      isLoading={employeeSearchLoading}
                      error={fieldErrors.toEmployeeId}
                    />
                  </div>
                  {indent ? (
                    <>
                      <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-x-3 text-sm">
                        <span className="font-medium text-foreground">
                          Store
                        </span>
                        <span className="font-semibold text-[hsl(var(--primary))]">
                          {indent.storeName ?? "—"}
                        </span>
                      </div>
                      <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-x-3 text-sm">
                        <span className="font-medium text-foreground">
                          Trans. Type
                        </span>
                        <span className="font-semibold text-[hsl(var(--primary))]">
                          {transTypeName}
                        </span>
                      </div>
                    </>
                  ) : null}
                </div>

                <div className="space-y-3">
                  {isEdit ? (
                    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-x-3">
                      <Label className="text-sm font-medium">Issue No.</Label>
                      <Input
                        value={internalIssueNo}
                        disabled
                        placeholder="Internal Issue No."
                        className="h-9 bg-muted/30"
                      />
                    </div>
                  ) : null}
                  <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-x-3">
                    <Label className="text-sm font-medium">Issue Date</Label>
                    <DatePicker
                      value={issueDate}
                      onChange={setIssueDate}
                      placeholder="Issue Date"
                      displayFormat="dd/MM/yyyy"
                    />
                  </div>
                </div>
              </div>

              {/* Angular: items table only when itemList.length > 0 */}
              {itemList.length > 0 ? (
                <div className="max-w-3xl space-y-2">
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
