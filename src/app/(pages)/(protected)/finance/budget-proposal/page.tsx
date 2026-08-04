"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ChevronDownIcon, PencilIcon, SaveIcon, XIcon } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { DataTable } from "@/common/components/table";
import { Select, type SelectOption } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter, cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/errors";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import {
  createFinBudgetAllocation,
  fetchFinanceBudgetDetails,
  listFinCategoriesByCollegeAndAccountType,
  listFinSubCategoriesByCategory,
  putUpdateFinBudgetAllocation,
} from "@/services";
import type { FinBudgetReportRow } from "@/types/finance";
import { formatFinanceNumber } from "../_lib/finance-format";
import { FinanceBudgetFilters } from "../_components/FinanceBudgetFilters";
import { useFinanceCascade } from "../_lib/use-finance-cascade";

function toSelectOptions(
  items: { value: number; label: string }[],
): SelectOption[] {
  return items.map((item) => ({
    value: String(item.value),
    label: item.label,
  }));
}

function amt(value: unknown): string {
  // Angular currencySymbol / non-currency columns: null → blank; 0 → "0"
  if (value == null || value === "") return "";
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  return formatFinanceNumber(n);
}

/** Angular `currency:'INR':''` — always 2 fraction digits (e.g. 0.00). */
function amtCurrency(value: unknown): string {
  const n = value == null || value === "" ? 0 : Number(value);
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function draftValue(value: unknown): string {
  // Angular ngModel: keep blank when null/undefined (do not coerce to "0")
  if (value == null || value === "") return "";
  return String(value);
}

function toInt(value: unknown): number {
  const n = parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(n) ? n : 0;
}

function getTotal(row: FinBudgetReportRow, draftProbables?: string): number {
  const raw =
    draftProbables !== undefined
      ? draftProbables
      : row.probablesfornext_n_months;
  const probables = raw == null || raw === "" ? 0 : Number(raw);
  return (
    Number(row.actual_amount ?? 0) +
    (Number.isFinite(probables) ? probables : 0)
  );
}

function getRowId(row: FinBudgetReportRow): number {
  return Number(row.pk_finbudgetallocation_id ?? 0);
}

function formatDay(raw?: string): string {
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return String(raw);
  return format(d, "dd-MM-yyyy");
}

type FormState = {
  accountTypeId: number;
  finCategoryId: number;
  finSubCategoryId: number;
  approvedAmount: string;
  proposedAmount: string;
  nextyrProposedAmount: string;
};

type RowDraft = {
  probablesfornext_n_months: string;
  nextyr_proposed_amount: string;
};

type FormErrors = {
  accountTypeId?: string;
  finCategoryId?: string;
  finSubCategoryId?: string;
};

const emptyForm = (): FormState => ({
  accountTypeId: 0,
  finCategoryId: 0,
  finSubCategoryId: 0,
  approvedAmount: "",
  proposedAmount: "",
  nextyrProposedAmount: "",
});

export default function BudgetProposalPage() {
  const cascade = useFinanceCascade({
    withAccountType: true,
    withTransactionType: true,
  });
  const queryClient = useQueryClient();
  const [loadKey, setLoadKey] = useState<string | null>(null);
  const [selectedData, setSelectedData] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [editingIds, setEditingIds] = useState<Set<number>>(new Set());
  const [drafts, setDrafts] = useState<Record<number, RowDraft>>({});
  const emptyToastKey = useRef<string | null>(null);

  const liveSelectedData = useMemo(() => {
    const college =
      cascade.colleges.find((c) => c.value === cascade.collegeId)?.label ??
      (cascade.collegeId ? String(cascade.collegeId) : "");
    const entity =
      cascade.entities.find((e) => e.value === cascade.accountEntityId)
        ?.label ?? "";
    const year =
      cascade.years.find((y) => y.value === cascade.financialYearId)?.label ??
      "";
    return [college, entity, year].filter(Boolean).join("/");
  }, [cascade]);

  const formTitle = `Add Budget Allocation - ${selectedData || liveSelectedData}`;

  const {
    data: rows = [],
    isFetching,
    error,
    isSuccess,
  } = useQuery({
    queryKey: QK.finBudgetReport(
      "financial_budget_details",
      loadKey ? JSON.parse(loadKey) : {},
    ),
    queryFn: () => fetchFinanceBudgetDetails(JSON.parse(loadKey!)),
    enabled: loadKey != null,
  });

  const { data: categories = [] } = useQuery({
    queryKey: QK.finCategories.byCollegeAccountType(
      cascade.collegeId,
      form.accountTypeId,
    ),
    queryFn: () =>
      listFinCategoriesByCollegeAndAccountType(
        cascade.collegeId,
        form.accountTypeId,
      ),
    enabled: formOpen && cascade.collegeId > 0 && form.accountTypeId > 0,
  });

  const { data: subCategories = [] } = useQuery({
    queryKey: QK.finSubCategories.byCategory(form.finCategoryId),
    queryFn: () => listFinSubCategoriesByCategory(form.finCategoryId),
    enabled: formOpen && form.finCategoryId > 0,
  });

  useEffect(() => {
    if (!formOpen || !form.accountTypeId || !categories.length) return;
    if (
      form.finCategoryId &&
      categories.some((c) => c.finCategoryId === form.finCategoryId)
    )
      return;
    setForm((f) => ({
      ...f,
      finCategoryId: categories[0]!.finCategoryId,
      finSubCategoryId: 0,
    }));
    setFormErrors((e) => ({ ...e, finCategoryId: undefined }));
  }, [formOpen, form.accountTypeId, form.finCategoryId, categories]);

  useEffect(() => {
    if (!formOpen || !form.finCategoryId || !subCategories.length) return;
    if (
      form.finSubCategoryId &&
      subCategories.some((s) => s.finSubCategoryId === form.finSubCategoryId)
    )
      return;
    setForm((f) => ({
      ...f,
      finSubCategoryId: subCategories[0]!.finSubCategoryId ?? 0,
    }));
    setFormErrors((e) => ({ ...e, finSubCategoryId: undefined }));
  }, [formOpen, form.finCategoryId, form.finSubCategoryId, subCategories]);

  useEffect(() => {
    if (!loadKey || isFetching) return;
    if (emptyToastKey.current === loadKey) return;
    const emptySuccess = isSuccess && rows.length === 0;
    const emptyError =
      !!error && /no\s+record(?:\(s\)|s)?/i.test(getErrorMessage(error));
    if (!emptySuccess && !emptyError) return;
    emptyToastKey.current = loadKey;
    toastInfo(emptyError ? getErrorMessage(error) : "No Record(s) found.");
  }, [loadKey, isSuccess, isFetching, rows.length, error]);

  const meta = useMemo(() => {
    const first = rows[0];
    return {
      prYr: first?.Pr_Yr != null ? String(first.Pr_Yr) : "",
      financialYear:
        first?.financial_year != null ? String(first.financial_year) : "",
      from8: formatDay(
        first?.cr_fin_startdate != null
          ? String(first.cr_fin_startdate)
          : undefined,
      ),
      to8: formatDay(
        first?.estimation_fromdate != null
          ? String(first.estimation_fromdate)
          : undefined,
      ),
      from3: formatDay(
        first?.estimation_fromdate != null
          ? String(first.estimation_fromdate)
          : undefined,
      ),
      to3: formatDay(
        first?.estimation_todate != null
          ? String(first.estimation_todate)
          : undefined,
      ),
    };
  }, [rows]);

  const clearForm = useCallback(() => {
    setForm(emptyForm());
    setFormErrors({});
  }, []);

  function validateForm(): boolean {
    const next: FormErrors = {};
    if (!form.accountTypeId) next.accountTypeId = "Account is required";
    if (!form.finCategoryId) next.finCategoryId = "Category is required";
    if (!form.finSubCategoryId)
      next.finSubCategoryId = "Sub Category is required";
    setFormErrors(next);
    return Object.keys(next).length === 0;
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!cascade.filtersValid) return;
      // Angular SaveProposal → addDetails(FinBudgetAllocationUrl, Obj)
      await createFinBudgetAllocation({
        accountEntityId: cascade.accountEntityId,
        financialYearId: cascade.financialYearId,
        finCategoryId: form.finCategoryId || null,
        finSubCategoryId: form.finSubCategoryId || null,
        actualAmount: null,
        approvedAmount: form.approvedAmount
          ? Number(form.approvedAmount)
          : null,
        nextyrProposedAmount: form.nextyrProposedAmount
          ? Number(form.nextyrProposedAmount)
          : null,
        accountTypeId: form.accountTypeId,
        actualTillDate: null,
        proposedAmount: form.proposedAmount
          ? Number(form.proposedAmount)
          : null,
        isActive: true,
        reason: null,
      });
    },
    onSuccess: async () => {
      toastSuccess("Saved successfully.");
      setFormOpen(false);
      clearForm();
      if (loadKey) {
        await queryClient.invalidateQueries({
          queryKey: QK.finBudgetReport(
            "financial_budget_details",
            JSON.parse(loadKey),
          ),
        });
      }
    },
    onError: (err) => toastError(err, "Save failed"),
  });

  function handleSaveForm() {
    if (!validateForm()) return;
    saveMutation.mutate();
  }

  const rowUpdateMutation = useMutation({
    mutationFn: async (row: FinBudgetReportRow) => {
      const id = getRowId(row);
      const draft = drafts[id];
      const payload = [
        {
          finBudgetAllocationId: id,
          nextyrProposedAmount: toInt(
            draft?.nextyr_proposed_amount ?? row.nextyr_proposed_amount,
          ),
        },
        {
          finBudgetMidyrEstimationId: row.pk_finbudgetmidyrestimation_id,
          estimatedAmount: toInt(
            draft?.probablesfornext_n_months ?? row.probablesfornext_n_months,
          ),
          nextyrProposedAmount: toInt(
            draft?.nextyr_proposed_amount ?? row.nextyr_proposed_amount,
          ),
        },
      ];
      await putUpdateFinBudgetAllocation(payload);
    },
    onSuccess: async () => {
      toastSuccess("Updated successfully.");
      if (loadKey) {
        await queryClient.invalidateQueries({
          queryKey: QK.finBudgetReport(
            "financial_budget_details",
            JSON.parse(loadKey),
          ),
        });
      }
      setEditingIds(new Set());
      setDrafts({});
    },
    onError: (err) => toastError(err, "Update failed"),
  });

  const bulkSaveMutation = useMutation({
    mutationFn: async () => {
      // Angular bulkUpdate — only rows currently in edit mode
      const payload: Record<string, unknown>[] = [];
      for (const row of rows) {
        const id = getRowId(row);
        if (!id || !editingIds.has(id)) continue;
        const draft = drafts[id];
        payload.push(
          {
            finBudgetAllocationId: id,
            nextyrProposedAmount: toInt(
              draft?.nextyr_proposed_amount ?? row.nextyr_proposed_amount,
            ),
          },
          {
            finBudgetMidyrEstimationId: row.pk_finbudgetmidyrestimation_id,
            estimatedAmount: toInt(
              draft?.probablesfornext_n_months ?? row.probablesfornext_n_months,
            ),
            nextyrProposedAmount: toInt(
              draft?.nextyr_proposed_amount ?? row.nextyr_proposed_amount,
            ),
          },
        );
      }
      if (!payload.length) return;
      await putUpdateFinBudgetAllocation(payload);
    },
    onSuccess: async () => {
      toastSuccess("Saved successfully.");
      if (loadKey) {
        await queryClient.invalidateQueries({
          queryKey: QK.finBudgetReport(
            "financial_budget_details",
            JSON.parse(loadKey),
          ),
        });
      }
      setEditingIds(new Set());
      setDrafts({});
    },
    onError: (err) => toastError(err, "Save failed"),
  });

  function handleGetList() {
    if (!cascade.filtersValid) return;
    const college =
      cascade.colleges.find((c) => c.value === cascade.collegeId)?.label ?? "";
    const entity =
      cascade.entities.find((e) => e.value === cascade.accountEntityId)
        ?.label ?? "";
    const year =
      cascade.years.find((y) => y.value === cascade.financialYearId)?.label ??
      "";
    setSelectedData(`${college}/${entity}/${year}`);
    setEditingIds(new Set());
    setDrafts({});
    clearForm();
    setFormOpen(false);
    emptyToastKey.current = null;
    setLoadKey(
      JSON.stringify(
        cascade.toBudgetParams({
          in_budgetdate: format(new Date(), "yyyy-MM-dd"),
          in_account_type_id: 0,
          in_major_accounttype: cascade.majorAccountTypeCatId,
        }),
      ),
    );
  }

  function startEdit(row: FinBudgetReportRow) {
    const id = getRowId(row);
    if (!id) return;
    setEditingIds((prev) => new Set(prev).add(id));
    setDrafts((d) => ({
      ...d,
      [id]: {
        probablesfornext_n_months: draftValue(row.probablesfornext_n_months),
        nextyr_proposed_amount: draftValue(row.nextyr_proposed_amount),
      },
    }));
  }

  function cancelEdit(row: FinBudgetReportRow) {
    const id = getRowId(row);
    setEditingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setDrafts((d) => {
      const next = { ...d };
      delete next[id];
      return next;
    });
  }

  const columnDefs = useMemo<ColDef<FinBudgetReportRow>[]>(() => {
    const amountCell = (field: keyof FinBudgetReportRow) =>
      ((p: ICellRendererParams<FinBudgetReportRow>) => (
        <span className="text-xs tabular-nums">{amt(p.data?.[field])}</span>
      )) as ColDef<FinBudgetReportRow>["cellRenderer"];

    return [
      {
        headerName: "SI.No",
        valueGetter: rowIndexGetter,
        width: 70,
        flex: 0,
      },
      {
        field: "accounttype_name",
        headerName: "Account Type",
        minWidth: 140,
        flex: 1,
      },
      {
        field: "fin_category_name",
        headerName: "Category",
        minWidth: 120,
        flex: 1,
      },
      {
        field: "sub_category_name",
        headerName: "Sub Category",
        minWidth: 120,
        flex: 1,
      },
      {
        field: "actuals_for_the_prv_yr",
        headerName: `Actuals For Previous Year (${meta.prYr})`,
        minWidth: 150,
        flex: 1,
        cellRenderer: amountCell("actuals_for_the_prv_yr"),
      },
      {
        field: "approved_amount",
        headerName: `Approval Budget For Current Year (${meta.financialYear})`,
        minWidth: 160,
        flex: 1,
        cellRenderer: amountCell("approved_amount"),
      },
      {
        field: "actual_amount",
        headerName: `Actuals To End Of First 8 Months (${meta.from8} - ${meta.to8})`,
        minWidth: 180,
        flex: 1.1,
        cellRenderer: amountCell("actual_amount"),
      },
      {
        headerName: `Probables For Next 3 Months (${meta.from3} - ${meta.to3})`,
        minWidth: 180,
        flex: 1.1,
        cellRenderer: (p: ICellRendererParams<FinBudgetReportRow>) => {
          const row = p.data;
          if (!row) return null;
          const id = getRowId(row);
          const editing = editingIds.has(id);
          if (!editing) {
            return (
              <span className="text-xs tabular-nums">
                {amtCurrency(row.probablesfornext_n_months)}
              </span>
            );
          }
          return (
            <Input
              className="h-8 text-xs"
              placeholder=""
              value={drafts[id]?.probablesfornext_n_months ?? ""}
              onChange={(e) =>
                setDrafts((d) => ({
                  ...d,
                  [id]: {
                    probablesfornext_n_months: e.target.value,
                    nextyr_proposed_amount: d[id]?.nextyr_proposed_amount ?? "",
                  },
                }))
              }
            />
          );
        },
      },
      {
        headerName: "Total",
        minWidth: 100,
        flex: 0.7,
        cellRenderer: (p: ICellRendererParams<FinBudgetReportRow>) => {
          const row = p.data;
          if (!row) return null;
          const id = getRowId(row);
          const draftProbables = editingIds.has(id)
            ? drafts[id]?.probablesfornext_n_months
            : undefined;
          return (
            <span className="text-xs tabular-nums">
              {amtCurrency(getTotal(row, draftProbables))}
            </span>
          );
        },
      },
      {
        headerName: "Next Year Proposal Amount",
        minWidth: 150,
        flex: 1,
        cellRenderer: (p: ICellRendererParams<FinBudgetReportRow>) => {
          const row = p.data;
          if (!row) return null;
          const id = getRowId(row);
          const editing = editingIds.has(id);
          if (!editing) {
            return (
              <span className="text-xs tabular-nums">
                {amt(row.nextyr_proposed_amount)}
              </span>
            );
          }
          return (
            <Input
              className="h-8 text-xs"
              placeholder=""
              value={drafts[id]?.nextyr_proposed_amount ?? ""}
              onChange={(e) =>
                setDrafts((d) => ({
                  ...d,
                  [id]: {
                    probablesfornext_n_months:
                      d[id]?.probablesfornext_n_months ?? "",
                    nextyr_proposed_amount: e.target.value,
                  },
                }))
              }
            />
          );
        },
      },
      {
        headerName: "Actions",
        minWidth: 110,
        width: 110,
        flex: 0,
        cellRenderer: (p: ICellRendererParams<FinBudgetReportRow>) => {
          const row = p.data;
          if (!row) return null;
          const id = getRowId(row);
          const editing = editingIds.has(id);
          if (!editing) {
            return (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-blue-600"
                title="Edit"
                onClick={() => startEdit(row)}
              >
                <PencilIcon className="h-3.5 w-3.5" />
              </Button>
            );
          }
          return (
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-blue-600"
                title="Save"
                onClick={() => rowUpdateMutation.mutate(row)}
              >
                <SaveIcon className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-red-600"
                title="Cancel"
                onClick={() => cancelEdit(row)}
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </div>
          );
        },
      },
    ];
  }, [meta, editingIds, drafts, rowUpdateMutation]);

  const notice = (
    <>
      {cascade.isError ? (
        <p className="text-sm text-destructive">
          {getErrorMessage(cascade.error)}
        </p>
      ) : null}
      {error && !/no\s+record(?:\(s\)|s)?/i.test(getErrorMessage(error)) ? (
        <p className="text-sm text-destructive">{getErrorMessage(error)}</p>
      ) : null}
    </>
  );

  return (
    <PageContainer className="space-y-5">
      {notice}

      <div className="app-card space-y-4 p-4">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Budget Allocation
        </h2>
        <FinanceBudgetFilters
          cascade={cascade}
          showTransactionType
          loadLabel="Get List"
          loading={isFetching}
          bare
          onLoad={handleGetList}
        />
      </div>

      <div className="app-card p-4">
        <Collapsible open={formOpen} onOpenChange={setFormOpen}>
          <CollapsibleTrigger className="flex w-full cursor-pointer items-center justify-between gap-2 text-left">
            <span className="text-sm font-semibold text-foreground">
              {formTitle}
            </span>
            <ChevronDownIcon
              className={cn(
                "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                formOpen && "rotate-180",
              )}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="sm:col-span-2 lg:col-span-3">
                <Select
                  label="Account"
                  required
                  value={form.accountTypeId ? String(form.accountTypeId) : null}
                  onChange={(v) => {
                    setForm((f) => ({
                      ...f,
                      accountTypeId: v ? Number(v) : 0,
                      finCategoryId: 0,
                      finSubCategoryId: 0,
                    }));
                    setFormErrors((e) => ({
                      ...e,
                      accountTypeId: undefined,
                      finCategoryId: undefined,
                      finSubCategoryId: undefined,
                    }));
                  }}
                  options={toSelectOptions(cascade.accountTypes)}
                  placeholder="Account"
                  error={formErrors.accountTypeId}
                />
              </div>
              <Select
                label="Category"
                required
                value={form.finCategoryId ? String(form.finCategoryId) : null}
                onChange={(v) => {
                  setForm((f) => ({
                    ...f,
                    finCategoryId: v ? Number(v) : 0,
                    finSubCategoryId: 0,
                  }));
                  setFormErrors((e) => ({
                    ...e,
                    finCategoryId: undefined,
                    finSubCategoryId: undefined,
                  }));
                }}
                options={categories.map((c) => ({
                  value: String(c.finCategoryId),
                  label: c.categoryName,
                }))}
                placeholder="Category"
                disabled={!form.accountTypeId}
                error={formErrors.finCategoryId}
              />
              <Select
                label="Sub Category"
                required
                value={
                  form.finSubCategoryId ? String(form.finSubCategoryId) : null
                }
                onChange={(v) => {
                  setForm((f) => ({
                    ...f,
                    finSubCategoryId: v ? Number(v) : 0,
                  }));
                  setFormErrors((e) => ({
                    ...e,
                    finSubCategoryId: undefined,
                  }));
                }}
                options={subCategories.map((s) => ({
                  value: String(s.finSubCategoryId),
                  label: s.subCategoryName,
                }))}
                placeholder="Sub Category"
                disabled={!form.finCategoryId}
                error={formErrors.finSubCategoryId}
              />
              <div className="space-y-1.5">
                <Label className="text-xs">Approved Amount</Label>
                <Input
                  type="text"
                  placeholder="Approved Amount"
                  value={form.approvedAmount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, approvedAmount: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Proposed Amount</Label>
                <Input
                  type="text"
                  placeholder="Proposed Amount"
                  value={form.proposedAmount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, proposedAmount: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Next Year Proposal Amount</Label>
                <Input
                  type="text"
                  placeholder="Next Year Proposal Amount"
                  value={form.nextyrProposedAmount}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      nextyrProposedAmount: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={clearForm}>
                Clear
              </Button>
              <Button type="button" onClick={handleSaveForm}>
                {saveMutation.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {loadKey ? (
        <div className="space-y-3">
          <DataTable
            title={`Budget Allocation - ${selectedData}`}
            subtitle=""
            bordered
            pagination
            loading={isFetching}
            rowData={rows}
            columnDefs={columnDefs}
            toolbar={{
              search: true,
              searchPlaceholder: "Search",
              pdfDocumentTitle: `Budget Allocation - ${selectedData}`,
            }}
          />
          <div className="flex justify-end">
            <Button type="button" onClick={() => bulkSaveMutation.mutate()}>
              {bulkSaveMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      ) : null}
    </PageContainer>
  );
}
