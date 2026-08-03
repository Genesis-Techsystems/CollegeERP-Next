"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ChevronDownIcon, PencilIcon } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { DataTable } from "@/common/components/table";
import { DatePicker } from "@/common/components/date-picker";
import { Select, type SelectOption } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { toastError, toastSuccess } from "@/lib/toast";
import {
  addMultipleFinBudgetMidyearEstimations,
  listFinBudgetMidyearEstimations,
  listFinCategoriesByCollegeAndAccountType,
  listFinSubCategoriesByCategory,
  updateFinBudgetMidyearEstimation,
} from "@/services";
import type { FinBudgetMidyearEstimation } from "@/types/finance";
import { formatFinanceNumber } from "../_lib/finance-format";
import { useFinanceCascade } from "../_lib/use-finance-cascade";
import { useFinanceSessionIds } from "../_lib/use-finance-session-ids";

/** Angular displayedColumns */
const COL_DEFS = {
  siNo: {
    headerName: "Sl.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<FinBudgetMidyearEstimation>,
  accounttype_name: {
    field: "accounttype_name",
    headerName: "Account Type",
    minWidth: 140,
    flex: 1,
  } as ColDef<FinBudgetMidyearEstimation>,
  actualAmount: {
    field: "actualAmount",
    headerName: "Actuals Amount",
    minWidth: 120,
    flex: 0.8,
  } as ColDef<FinBudgetMidyearEstimation>,
  estimatedAmount: {
    field: "estimatedAmount",
    headerName: "Estimated Amount",
    minWidth: 120,
    flex: 0.8,
  } as ColDef<FinBudgetMidyearEstimation>,
  nextyrProposedAmount: {
    field: "nextyrProposedAmount",
    headerName: "Next Year Proposed Amount",
    minWidth: 160,
    flex: 1,
  } as ColDef<FinBudgetMidyearEstimation>,
  estimationFromDate: {
    field: "estimationFromDate",
    headerName: "Estimation From Date",
    minWidth: 140,
    flex: 0.9,
  } as ColDef<FinBudgetMidyearEstimation>,
  estimationToDate: {
    field: "estimationToDate",
    headerName: "Estimation To Date",
    minWidth: 140,
    flex: 0.9,
  } as ColDef<FinBudgetMidyearEstimation>,
  actions: {
    headerName: "Actions",
    minWidth: 80,
    width: 80,
    flex: 0,
  } as ColDef<FinBudgetMidyearEstimation>,
};

function toSelectOptions(
  items: { value: number; label: string }[],
): SelectOption[] {
  return items.map((item) => ({
    value: String(item.value),
    label: item.label,
  }));
}

function amountRenderer(p: ICellRendererParams<FinBudgetMidyearEstimation>) {
  return (
    <span className="text-xs tabular-nums">{formatFinanceNumber(p.value)}</span>
  );
}

function dateRenderer(p: ICellRendererParams<FinBudgetMidyearEstimation>) {
  if (!p.value) return null;
  const d = new Date(String(p.value));
  if (Number.isNaN(d.getTime()))
    return <span className="text-xs">{String(p.value)}</span>;
  return <span className="text-xs">{format(d, "MMM d, yyyy")}</span>;
}

function makeActionsRenderer(
  onEdit: (row: FinBudgetMidyearEstimation) => void,
) {
  return (p: ICellRendererParams<FinBudgetMidyearEstimation>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      onClick={() => p.data && onEdit(p.data)}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  );
}

type FormState = {
  accountTypeId: number;
  finCategoryId: number;
  finSubCategoryId: number;
  estimatedAmount: string;
  nextyrProposedAmount: string;
  estimationFromDate: Date;
  estimationToDate: Date;
  isActive: boolean;
  reason: string;
};

type LoadedContext = {
  entityId: number;
  yearId: number;
};

const emptyForm = (): FormState => ({
  accountTypeId: 0,
  finCategoryId: 0,
  finSubCategoryId: 0,
  estimatedAmount: "",
  nextyrProposedAmount: "",
  estimationFromDate: new Date(),
  estimationToDate: new Date(),
  isActive: true,
  reason: "",
});

export default function BudgetMidYearPage() {
  const cascade = useFinanceCascade({ withAccountType: true });
  const { employeeId } = useFinanceSessionIds();
  const queryClient = useQueryClient();
  const [loadedContext, setLoadedContext] = useState<LoadedContext | null>(
    null,
  );
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FinBudgetMidyearEstimation | null>(
    null,
  );
  const [form, setForm] = useState<FormState>(emptyForm);

  const collegeLabel = cascade.colleges.find(
    (c) => c.value === cascade.collegeId,
  )?.label;
  const entityLabel = cascade.entities.find(
    (e) => e.value === cascade.accountEntityId,
  )?.label;
  const yearLabel = cascade.years.find(
    (y) => y.value === cascade.financialYearId,
  )?.label;

  // Used only for PDF export context — not shown in page headings
  const selectedData = useMemo(() => {
    const college =
      collegeLabel ?? (cascade.collegeId ? String(cascade.collegeId) : "null");
    const entity =
      entityLabel ??
      (cascade.accountEntityId ? String(cascade.accountEntityId) : "null");
    const year =
      yearLabel ??
      (cascade.financialYearId ? String(cascade.financialYearId) : "null");
    return `${college}/${entity}/${year}`;
  }, [
    collegeLabel,
    entityLabel,
    yearLabel,
    cascade.collegeId,
    cascade.accountEntityId,
    cascade.financialYearId,
  ]);

  const pageTitle = "Budget Mid Year Estimations";
  const formTitle = `Budget Mid Year Estimation - ${selectedData}`;

  const {
    data: rows = [],
    isFetching,
    error,
  } = useQuery({
    queryKey: QK.finBudgetMidyear(
      loadedContext?.entityId ?? 0,
      loadedContext?.yearId ?? 0,
    ),
    queryFn: () =>
      listFinBudgetMidyearEstimations(
        loadedContext!.entityId,
        loadedContext!.yearId,
      ),
    enabled: loadedContext != null,
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
  }, [formOpen, form.finCategoryId, form.finSubCategoryId, subCategories]);

  const clearForm = useCallback(() => {
    setEditing(null);
    setForm(emptyForm());
  }, []);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!cascade.filtersValid) return;
      const payload: Partial<FinBudgetMidyearEstimation> = {
        accountEntityId: cascade.accountEntityId,
        financialYearId: cascade.financialYearId,
        accountTypeId: form.accountTypeId,
        finCategoryId: form.finCategoryId || undefined,
        finSubCategoryId: form.finSubCategoryId || undefined,
        estimatedAmount: form.estimatedAmount
          ? Number(form.estimatedAmount)
          : null,
        nextyrProposedAmount: form.nextyrProposedAmount
          ? Number(form.nextyrProposedAmount)
          : null,
        estimationFromDate: format(form.estimationFromDate, "yyyy-MM-dd"),
        estimationToDate: format(form.estimationToDate, "yyyy-MM-dd"),
        estimatedByEmpId: employeeId || undefined,
        nextyrProposedByEmpId: employeeId || undefined,
        isActive: form.isActive,
        reason: form.isActive ? null : form.reason.trim() || null,
      };
      if (editing?.finBudgetMidyrEstimationId) {
        await updateFinBudgetMidyearEstimation(
          editing.finBudgetMidyrEstimationId,
          payload,
        );
      } else {
        await addMultipleFinBudgetMidyearEstimations([payload]);
      }
    },
    onSuccess: async () => {
      toastSuccess(
        editing
          ? "Estimation updated successfully"
          : "Estimation created successfully",
      );
      setLoadedContext({
        entityId: cascade.accountEntityId,
        yearId: cascade.financialYearId,
      });
      await queryClient.invalidateQueries({
        queryKey: QK.finBudgetMidyear(
          cascade.accountEntityId,
          cascade.financialYearId,
        ),
      });
      clearForm();
      setFormOpen(false);
    },
    onError: (err) => {
      toastError(
        err,
        editing ? "Update estimation failed" : "Create estimation failed",
      );
    },
  });

  const getList = useCallback(() => {
    if (!cascade.filtersValid) return;
    clearForm();
    setFormOpen(false);
    setLoadedContext({
      entityId: cascade.accountEntityId,
      yearId: cascade.financialYearId,
    });
  }, [cascade, clearForm]);

  const openEdit = useCallback((row: FinBudgetMidyearEstimation) => {
    setEditing(row);
    setFormOpen(true);
    setForm({
      accountTypeId: row.accountTypeId ?? 0,
      finCategoryId: row.finCategoryId ?? 0,
      finSubCategoryId: row.finSubCategoryId ?? 0,
      estimatedAmount:
        row.estimatedAmount != null ? String(row.estimatedAmount) : "",
      nextyrProposedAmount:
        row.nextyrProposedAmount != null
          ? String(row.nextyrProposedAmount)
          : "",
      estimationFromDate: row.estimationFromDate
        ? new Date(row.estimationFromDate)
        : new Date(),
      estimationToDate: row.estimationToDate
        ? new Date(row.estimationToDate)
        : new Date(),
      isActive: row.isActive ?? true,
      reason: row.reason ?? "",
    });
  }, []);

  const columnDefs = useMemo(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.accounttype_name,
      { ...COL_DEFS.actualAmount, cellRenderer: amountRenderer },
      { ...COL_DEFS.estimatedAmount, cellRenderer: amountRenderer },
      { ...COL_DEFS.nextyrProposedAmount, cellRenderer: amountRenderer },
      { ...COL_DEFS.estimationFromDate, cellRenderer: dateRenderer },
      { ...COL_DEFS.estimationToDate, cellRenderer: dateRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(openEdit) },
    ],
    [openEdit],
  );

  const notice = (
    <>
      {cascade.isError ? (
        <p className="text-sm text-destructive">
          {getErrorMessage(cascade.error)}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive">{getErrorMessage(error)}</p>
      ) : null}
    </>
  );

  return (
    <PageContainer className="space-y-5">
      {notice}

      {/* Card 1 — filters */}
      <div className="app-card space-y-4 p-4">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          {pageTitle}
        </h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[180px] flex-1">
            <Select
              label="College"
              required
              value={cascade.collegeId ? String(cascade.collegeId) : null}
              onChange={(v) => cascade.setCollegeId(v ? Number(v) : 0)}
              options={toSelectOptions(cascade.colleges)}
              placeholder="College"
              isLoading={cascade.isLoading}
            />
          </div>
          <div className="min-w-[180px] flex-1">
            <Select
              label="Entity"
              required
              value={
                cascade.accountEntityId ? String(cascade.accountEntityId) : null
              }
              onChange={(v) => cascade.setAccountEntityId(v ? Number(v) : 0)}
              options={toSelectOptions(cascade.entities)}
              placeholder="Entity"
              disabled={!cascade.collegeId}
            />
          </div>
          <div className="min-w-[180px] flex-1">
            <Select
              label="Financial Year"
              required
              value={
                cascade.financialYearId ? String(cascade.financialYearId) : null
              }
              onChange={(v) => cascade.setFinancialYearId(v ? Number(v) : 0)}
              options={toSelectOptions(cascade.years)}
              placeholder="Financial Year"
              disabled={!cascade.accountEntityId}
            />
          </div>
          <Button
            type="button"
            className="shrink-0 ml-auto"
            onClick={getList}
            disabled={!cascade.filtersValid || isFetching}
          >
            {isFetching ? "Loading…" : "Get List"}
          </Button>
        </div>
      </div>

      {/* Card 2 — add/edit form (same fields, separate card) */}
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
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Select
                  label="Account"
                  required
                  value={form.accountTypeId ? String(form.accountTypeId) : null}
                  onChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      accountTypeId: v ? Number(v) : 0,
                      finCategoryId: 0,
                      finSubCategoryId: 0,
                    }))
                  }
                  options={toSelectOptions(cascade.accountTypes)}
                  placeholder="Account"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Estimated From Date</Label>
                <DatePicker
                  value={form.estimationFromDate}
                  onChange={(d) =>
                    d && setForm((f) => ({ ...f, estimationFromDate: d }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Estimated To Date</Label>
                <DatePicker
                  value={form.estimationToDate}
                  onChange={(d) =>
                    d && setForm((f) => ({ ...f, estimationToDate: d }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Estimated Amount</Label>
                <Input
                  type="text"
                  placeholder="Estimated Amount"
                  value={form.estimatedAmount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, estimatedAmount: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Next Year Proposed Amount</Label>
                <Input
                  type="text"
                  placeholder="Next Year Proposed Amount"
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
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="midyear-active"
                  checked={form.isActive}
                  onCheckedChange={(v) =>
                    setForm((f) => ({ ...f, isActive: v === true }))
                  }
                />
                <Label
                  htmlFor="midyear-active"
                  className="cursor-pointer text-sm"
                >
                  Active
                </Label>
              </div>
              {!form.isActive ? (
                <div className="min-w-[220px] flex-1 space-y-1.5">
                  <Label className="text-xs">Reason</Label>
                  <Input
                    value={form.reason}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, reason: e.target.value }))
                    }
                    placeholder="Reason"
                  />
                </div>
              ) : null}
              <div className="ml-auto flex gap-2">
                <Button type="button" variant="outline" onClick={clearForm}>
                  Clear
                </Button>
                <Button
                  type="button"
                  onClick={() => saveMutation.mutate()}
                  disabled={
                    saveMutation.isPending ||
                    !form.accountTypeId ||
                    !cascade.filtersValid
                  }
                >
                  {saveMutation.isPending ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Card 3 — results table */}
      {loadedContext ? (
        <DataTable
          title={pageTitle}
          subtitle=""
          bordered
          pagination
          loading={isFetching}
          rowData={rows}
          columnDefs={columnDefs}
          toolbar={{
            search: true,
            searchPlaceholder: "Search",
            pdfDocumentTitle: `${pageTitle} - ${selectedData}`,
          }}
        />
      ) : null}
    </PageContainer>
  );
}
