"use client";

import { useMemo } from "react";
import type { FinBudgetReportRow } from "@/types/finance";
import { formatFinanceNumber } from "../_lib/finance-format";

function amt(value: unknown): string {
  if (value == null || value === "") return "";
  return formatFinanceNumber(value);
}

function getTotal(row: FinBudgetReportRow): number {
  return (
    Number(row.actual_amount ?? 0) + Number(row.probablesfornext_n_months ?? 0)
  );
}

type Meta = {
  Pr_Yr?: string;
  financial_year?: string;
  f_8month_date?: string;
  t_8month_date?: string;
  f_4month_date?: string;
  t_4month_date?: string;
  nxt_yr?: string;
};

function ReportTableHead({ meta }: { meta: Meta }) {
  return (
    <thead>
      <tr>
        <th className="border border-slate-300 bg-sky-50 px-2 py-1.5 text-xs font-semibold" />
        <th className="border border-slate-300 bg-sky-50 px-2 py-1.5 text-xs font-semibold" />
        <th className="border border-slate-300 bg-sky-50 px-2 py-1.5 text-xs font-semibold" />
        <th className="border border-slate-300 bg-sky-50 px-2 py-1.5 text-xs font-semibold" />
        <th
          colSpan={2}
          className="border border-slate-300 bg-sky-50 px-2 py-1.5 text-center text-sm font-semibold"
        >
          Revised Estimates For The Current Year
        </th>
        <th className="border border-slate-300 bg-sky-50 px-2 py-1.5 text-xs font-semibold">
          Total
        </th>
        <th className="border border-slate-300 bg-sky-50 px-2 py-1.5 text-xs font-semibold" />
        <th className="border border-slate-300 bg-sky-50 px-2 py-1.5 text-xs font-semibold" />
        <th className="border border-slate-300 bg-sky-50 px-2 py-1.5 text-xs font-semibold" />
      </tr>
      <tr>
        <th className="border border-slate-300 bg-sky-50 px-2 py-1.5 text-xs font-semibold">
          No.
        </th>
        <th className="border border-slate-300 bg-sky-50 px-2 py-1.5 text-xs font-semibold">
          Name Of The Account
        </th>
        <th className="border border-slate-300 bg-sky-50 px-2 py-1.5 text-xs font-semibold">
          Actuals For The Previous Year ({meta.Pr_Yr ?? ""})
        </th>
        <th className="border border-slate-300 bg-sky-50 px-2 py-1.5 text-xs font-semibold">
          Approved Budget For The Current Year ({meta.financial_year ?? ""})
        </th>
        <th className="border border-slate-300 bg-sky-50 px-2 py-1.5 text-xs font-semibold">
          Actuals For The End Of First 8 Months ({meta.f_8month_date ?? ""} To{" "}
          {meta.t_8month_date ?? ""})
        </th>
        <th className="border border-slate-300 bg-sky-50 px-2 py-1.5 text-xs font-semibold">
          Probables For 4 Months ({meta.f_4month_date ?? ""} TO{" "}
          {meta.t_4month_date ?? ""})
        </th>
        <th className="border border-slate-300 bg-sky-50 px-2 py-1.5 text-xs font-semibold">
          4+5
        </th>
        <th className="border border-slate-300 bg-sky-50 px-2 py-1.5 text-xs font-semibold">
          Budget Proposals For The Next Year ({meta.nxt_yr ?? ""})
        </th>
        <th className="border border-slate-300 bg-sky-50 px-2 py-1.5 text-xs font-semibold">
          Approve Budget For The Next Year ({meta.nxt_yr ?? ""})
        </th>
        <th className="border border-slate-300 bg-sky-50 px-2 py-1.5 text-xs font-semibold">
          Reasons For Deviatoin
        </th>
      </tr>
      <tr>
        <th className="border border-slate-300 bg-sky-50 px-2 py-1 text-xs font-semibold" />
        <th className="border border-slate-300 bg-sky-50 px-2 py-1 text-center text-xs font-semibold">
          1
        </th>
        <th className="border border-slate-300 bg-sky-50 px-2 py-1 text-center text-xs font-semibold">
          2
        </th>
        <th className="border border-slate-300 bg-sky-50 px-2 py-1 text-center text-xs font-semibold">
          3
        </th>
        <th className="border border-slate-300 bg-sky-50 px-2 py-1 text-center text-xs font-semibold">
          4
        </th>
        <th className="border border-slate-300 bg-sky-50 px-2 py-1 text-center text-xs font-semibold">
          5
        </th>
        <th className="border border-slate-300 bg-sky-50 px-2 py-1 text-center text-xs font-semibold">
          6
        </th>
        <th className="border border-slate-300 bg-sky-50 px-2 py-1 text-center text-xs font-semibold">
          8
        </th>
        <th className="border border-slate-300 bg-sky-50 px-2 py-1 text-center text-xs font-semibold">
          9
        </th>
        <th className="border border-slate-300 bg-sky-50 px-2 py-1 text-xs font-semibold" />
      </tr>
    </thead>
  );
}

function ReportRows({
  rows,
  search,
}: {
  rows: FinBudgetReportRow[];
  search: string;
}) {
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      Object.values(r).some((v) =>
        String(v ?? "")
          .toLowerCase()
          .includes(q),
      ),
    );
  }, [rows, search]);

  return (
    <tbody>
      {filtered.map((row, i) => (
        <tr key={String(row.pk_finbudgetallocation_id ?? i)}>
          <td className="border border-slate-300 px-2 py-1.5 text-xs">
            {i + 1}
          </td>
          <td className="border border-slate-300 px-2 py-1.5 text-xs font-medium">
            {String(row.accounttype_name ?? "")}
          </td>
          <td className="border border-slate-300 px-2 py-1.5 text-xs tabular-nums">
            {amt(row.actuals_for_the_prv_yr)}
          </td>
          <td className="border border-slate-300 px-2 py-1.5 text-xs tabular-nums">
            {amt(row.approved_amount)}
          </td>
          <td className="border border-slate-300 px-2 py-1.5 text-xs tabular-nums">
            {amt(row.actual_amount)}
          </td>
          <td className="border border-slate-300 px-2 py-1.5 text-xs tabular-nums">
            {amt(row.probablesfornext_n_months)}
          </td>
          <td className="border border-slate-300 px-2 py-1.5 text-xs tabular-nums">
            {amt(getTotal(row))}
          </td>
          <td className="border border-slate-300 px-2 py-1.5 text-xs tabular-nums">
            {amt(row.nextyr_proposed_amount)}
          </td>
          <td className="border border-slate-300 px-2 py-1.5 text-xs tabular-nums">
            {amt(row.nextyr_proposed_amount)}
          </td>
          <td className="border border-slate-300 px-2 py-1.5 text-xs" />
        </tr>
      ))}
    </tbody>
  );
}

type Props = {
  rows: FinBudgetReportRow[];
  search: string;
  /** Angular: when All, group by transaction_type sections (e.g. ASSETS). */
  transactionTypeLabel: string;
  sectionTypes: string[];
};

/** Angular budget-estimations HTML report table(s). */
export function BudgetEstimationsReportTables({
  rows,
  search,
  transactionTypeLabel,
  sectionTypes,
}: Props) {
  const meta: Meta = {
    Pr_Yr: rows[0]?.Pr_Yr != null ? String(rows[0].Pr_Yr) : undefined,
    financial_year:
      rows[0]?.financial_year != null
        ? String(rows[0].financial_year)
        : undefined,
    f_8month_date:
      rows[0]?.f_8month_date != null
        ? String(rows[0].f_8month_date)
        : undefined,
    t_8month_date:
      rows[0]?.t_8month_date != null
        ? String(rows[0].t_8month_date)
        : undefined,
    f_4month_date:
      rows[0]?.f_4month_date != null
        ? String(rows[0].f_4month_date)
        : undefined,
    t_4month_date:
      rows[0]?.t_4month_date != null
        ? String(rows[0].t_4month_date)
        : undefined,
    nxt_yr: rows[0]?.nxt_yr != null ? String(rows[0].nxt_yr) : undefined,
  };

  if (transactionTypeLabel !== "All") {
    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] border-collapse">
          <ReportTableHead meta={meta} />
          <ReportRows rows={rows} search={search} />
        </table>
      </div>
    );
  }

  const types = sectionTypes.length
    ? sectionTypes
    : Array.from(
        new Set(
          rows
            .map((r) => String(r.transaction_type ?? "").trim())
            .filter(Boolean),
        ),
      );

  if (!types.length) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] border-collapse">
          <ReportTableHead meta={meta} />
          <ReportRows rows={rows} search={search} />
        </table>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {types.map((type) => {
        const sectionRows = rows.filter(
          (r) => String(r.transaction_type ?? "") === type,
        );
        return (
          <div key={type} className="space-y-2">
            <h3 className="text-center text-sm font-semibold text-foreground">
              {type}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] border-collapse">
                <ReportTableHead meta={meta} />
                <ReportRows rows={sectionRows} search={search} />
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
