"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { FilteredListPage } from "@/components/layout";
import { SearchInput } from "@/common/components/search";
import { Button } from "@/components/ui/button";
import { QK } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/errors";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import {
  addFinBudgetAllocationList,
  fetchFinanceBudgetReport,
} from "@/services";
import type { FinBudgetReportRow } from "@/types/finance";
import { BudgetApprovalReportTable } from "../_components/BudgetApprovalReportTable";
import { FinanceBudgetFilters } from "../_components/FinanceBudgetFilters";
import { useFinanceCascade } from "../_lib/use-finance-cascade";

function getRowId(row: FinBudgetReportRow): number {
  return Number(row.pk_finbudgetallocation_id ?? 0);
}

function getProposedValue(row: FinBudgetReportRow): number {
  const v = row.nextyr_proposed_amountt ?? row.nextyr_proposed_amount;
  return v != null ? Number(v) : 0;
}

export default function BudgetApprovalPage() {
  const cascade = useFinanceCascade();
  const queryClient = useQueryClient();
  const [loadKey, setLoadKey] = useState<string | null>(null);
  const [selectedData, setSelectedData] = useState("");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<Record<number, number>>({});
  const emptyToastKey = useRef<string | null>(null);

  const {
    data: rows = [],
    isFetching,
    error,
    isSuccess,
  } = useQuery({
    queryKey: QK.finBudgetReport(
      "financial_budget_report_approval",
      loadKey ? JSON.parse(loadKey) : {},
    ),
    queryFn: () => fetchFinanceBudgetReport(JSON.parse(loadKey!)),
    enabled: loadKey != null,
  });

  // Angular getDetailsList: nextyr_proposed_amountt = nextyr_proposed_amount
  useEffect(() => {
    if (!isSuccess || isFetching) return;
    const next: Record<number, number> = {};
    for (const row of rows) {
      const id = getRowId(row);
      if (!id) continue;
      next[id] = getProposedValue(row);
    }
    setDraft(next);
  }, [rows, isSuccess, isFetching]);

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

  const approveMutation = useMutation({
    mutationFn: async () => {
      // Angular bulkSave → addFinBudgetAllocationList
      const payload = rows.map((row) => {
        const id = getRowId(row);
        return {
          accountEntityId: row.fk_acc_entity_id,
          financialYearId: row.nxtfy_fk_financial_year_id,
          finCategoryId: row.fk_fin_category_id,
          finSubCategoryId: row.fk_fin_sub_categoory_id,
          proposedAmount: row.nextyr_proposed_amount,
          approvedAmount: draft[id] ?? getProposedValue(row),
          nextyrProposedAmount: "",
          accountTypeId: row.pk_account_type_id,
          actualTillDate: row.actual_tilldate,
          isActive: true,
          reason: null,
        };
      });
      await addFinBudgetAllocationList(payload);
    },
    onSuccess: async () => {
      toastSuccess("Approved successfully.");
      setDraft({});
      if (loadKey) {
        await queryClient.invalidateQueries({
          queryKey: QK.finBudgetReport(
            "financial_budget_report_approval",
            JSON.parse(loadKey),
          ),
        });
      }
    },
    onError: (err) => {
      toastError(err);
    },
  });

  function handleGetList() {
    if (!cascade.filtersValid) return;
    const college =
      cascade.colleges.find((c) => c.value === cascade.collegeId)?.label ??
      "null";
    const entity =
      cascade.entities.find((e) => e.value === cascade.accountEntityId)
        ?.label ?? "null";
    const year =
      cascade.years.find((y) => y.value === cascade.financialYearId)?.label ??
      "null";
    setSelectedData(`${college}/${entity}/${year}`);
    setSearch("");
    setDraft({});
    emptyToastKey.current = null;
    setLoadKey(
      JSON.stringify(
        cascade.toBudgetParams({
          in_budgetdate: format(new Date(), "yyyy-MM-dd"),
          in_account_type_id: 0,
          in_major_accounttype: 0,
        }),
      ),
    );
  }

  return (
    <FilteredListPage
      title={`Budget Approval - ${selectedData}`}
      filterTitle="Budget Approval"
      filters={
        <div className="space-y-4">
          {error && !/no\s+record(?:\(s\)|s)?/i.test(getErrorMessage(error)) ? (
            <p className="text-sm text-destructive">{getErrorMessage(error)}</p>
          ) : null}
          <FinanceBudgetFilters
            cascade={cascade}
            loadLabel="Get List"
            loading={isFetching}
            bare
            onLoad={handleGetList}
          />
        </div>
      }
      resultsVisible={!!loadKey}
      body={
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-[200px] flex-1">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search"
              />
            </div>
          </div>

          {isFetching ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <BudgetApprovalReportTable
              rows={rows}
              search={search}
              draft={draft}
              onDraftChange={(id, value) =>
                setDraft((d) => ({ ...d, [id]: value }))
              }
            />
          )}

          <div className="flex justify-end">
            <Button type="button" onClick={() => approveMutation.mutate()}>
              {approveMutation.isPending ? "Approving…" : "Approve"}
            </Button>
          </div>
        </div>
      }
    />
  );
}
