"use client";

import { useMemo } from "react";
import { Input } from "@/components/ui/input";
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

function getRowId(row: FinBudgetReportRow): number {
  return Number(row.pk_finbudgetallocation_id ?? 0);
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

type Props = {
  rows: FinBudgetReportRow[];
  search: string;
  /** Editable Approve Budget For The Next Year values (Angular `nextyr_proposed_amountt`). */
  draft: Record<number, number>;
  onDraftChange: (id: number, value: number) => void;
};

/** Angular budget-approval HTML report table. */
export function BudgetApprovalReportTable({
  rows,
  search,
  draft,
  onDraftChange,
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
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1100px] border-collapse">
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
              Budget Approval For The Next Year
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
              Actuals For The End Of First 8 Months ({meta.f_8month_date ?? ""}{" "}
              To {meta.t_8month_date ?? ""})
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
        <tbody>
          {filtered.map((row, i) => {
            const id = getRowId(row);
            const proposed =
              draft[id] ??
              Number(
                row.nextyr_proposed_amountt ?? row.nextyr_proposed_amount ?? 0,
              );
            return (
              <tr key={String(id || i)}>
                <td className="border border-slate-300 px-2 py-1.5 text-xs">
                  {i + 1}
                </td>
                <td className="border border-slate-300 px-2 py-1.5 text-xs font-medium">
                  {String(row.accounttype_code ?? row.accounttype_name ?? "")}
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
                <td className="border border-slate-300 px-2 py-1 text-xs">
                  <Input
                    type="text"
                    className="h-8 text-xs"
                    value={Number.isNaN(proposed) ? "" : String(proposed)}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (!id) return;
                      onDraftChange(id, Number.isNaN(n) ? 0 : n);
                    }}
                  />
                </td>
                <td className="border border-slate-300 px-2 py-1.5 text-xs" />
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
