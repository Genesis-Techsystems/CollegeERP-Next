"use client";

import { useMemo, type CSSProperties } from "react";
import type { FinBudgetReportRow } from "@/types/finance";
import { formatFinanceNumber } from "../_lib/finance-format";

/** Angular `.table-th` background */
const TH_BG = "#C3D9FF";
/** Angular `#table` border color */
const BORDER = "#96aacb";

const thBase: CSSProperties = {
  borderWidth: 2,
  borderStyle: "solid",
  borderColor: BORDER,
  background: TH_BG,
  fontWeight: 500,
  fontSize: 12,
  padding: "6px 5px",
  verticalAlign: "middle",
  textAlign: "center",
  color: "#1e293b",
  lineHeight: 1.25,
};

const tdBase: CSSProperties = {
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: BORDER,
  padding: "6px 8px",
  fontSize: 12,
  verticalAlign: "middle",
  textAlign: "left",
  color: "#1e293b",
};

/** Angular `currencySymbol` — empty when null/blank; else Indian grouping (no forced decimals). */
function amt(value: unknown): string {
  if (value == null || value === "") return "";
  return formatFinanceNumber(value);
}

/**
 * Angular screen: `getTotal(row) | currency:'INR':''` → typically 2 decimal places (e.g. 0.00).
 */
function totalAmt(row: FinBudgetReportRow): string {
  const n =
    Number(row.actual_amount ?? 0) + Number(row.probablesfornext_n_months ?? 0);
  if (Number.isNaN(n)) return "";
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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

function metaFromRows(rows: FinBudgetReportRow[]): Meta {
  const first = rows[0];
  if (!first) return {};
  return {
    Pr_Yr: first.Pr_Yr != null ? String(first.Pr_Yr) : undefined,
    financial_year:
      first.financial_year != null ? String(first.financial_year) : undefined,
    f_8month_date:
      first.f_8month_date != null ? String(first.f_8month_date) : undefined,
    t_8month_date:
      first.t_8month_date != null ? String(first.t_8month_date) : undefined,
    f_4month_date:
      first.f_4month_date != null ? String(first.f_4month_date) : undefined,
    t_4month_date:
      first.t_4month_date != null ? String(first.t_4month_date) : undefined,
    nxt_yr: first.nxt_yr != null ? String(first.nxt_yr) : undefined,
  };
}

/** Angular 3-row thead — group → labels → column index numbers (skips 7). */
function ReportTableHead({ meta }: { meta: Meta }) {
  return (
    <thead>
      <tr>
        <th style={thBase} />
        <th style={thBase} />
        <th style={thBase} />
        <th style={thBase} />
        <th
          colSpan={2}
          style={{
            ...thBase,
            fontSize: 14,
            fontWeight: 600,
            padding: "8px 5px",
          }}
        >
          Revised Estimates For The Current Year
        </th>
        <th style={thBase}>Total</th>
        <th style={thBase} />
        <th style={thBase} />
        <th style={thBase} />
      </tr>
      <tr>
        <th style={thBase}>No.</th>
        {/* Angular legacy spelling */}
        <th style={thBase}>Name Of The Acoount </th>
        <th style={{ ...thBase, minWidth: 120, width: "13%" }}>
          Actuals For The Prevoius Year ({meta.Pr_Yr ?? ""})
        </th>
        <th style={{ ...thBase, minWidth: 130 }}>
          Approved Budget For The Current Year ({meta.financial_year ?? ""})
        </th>
        <th style={{ ...thBase, minWidth: 150 }}>
          Actuals For The End Of First 8 Months({meta.f_8month_date ?? ""} To{" "}
          {meta.t_8month_date ?? ""})
        </th>
        <th style={{ ...thBase, minWidth: 140 }}>
          Probables For 4 Months ({meta.f_4month_date ?? ""} TO{" "}
          {meta.t_4month_date ?? ""})
        </th>
        <th style={thBase}>4+5</th>
        <th style={{ ...thBase, minWidth: 130 }}>
          Budget Proposals For The Next Year ({meta.nxt_yr ?? ""})
        </th>
        <th style={{ ...thBase, minWidth: 130 }}>
          Approve Budget For The Next Year ({meta.nxt_yr ?? ""})
        </th>
        <th style={{ ...thBase, minWidth: 110 }}> Reasons For Deviatoin</th>
      </tr>
      <tr>
        <th style={thBase} />
        <th style={thBase}>1</th>
        <th style={thBase}>2</th>
        <th style={thBase}>3</th>
        <th style={thBase}>4</th>
        <th style={thBase}>5</th>
        <th style={thBase}>6</th>
        <th style={thBase}>8</th>
        <th style={thBase}>9</th>
        <th style={thBase} />
      </tr>
    </thead>
  );
}

function ReportRows({
  rows,
  search,
  numberFromAllRows,
}: {
  rows: FinBudgetReportRow[];
  search: string;
  numberFromAllRows?: FinBudgetReportRow[];
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
      {filtered.map((row, i) => {
        const siNo =
          numberFromAllRows != null
            ? numberFromAllRows.indexOf(row) + 1 || i + 1
            : i + 1;
        return (
          <tr key={String(row.pk_finbudgetallocation_id ?? `${siNo}-${i}`)}>
            {/* No. — centered (Angular screenshot) */}
            <td style={{ ...tdBase, textAlign: "center", width: 48 }}>
              {siNo}
            </td>
            {/* Name — left, medium weight */}
            <td style={{ ...tdBase, fontWeight: 500, textAlign: "left" }}>
              {String(row.accounttype_name ?? "")}
            </td>
            {/* Amount columns — left-aligned like Angular mat table cells */}
            <td style={tdBase}>{amt(row.actuals_for_the_prv_yr)}</td>
            <td style={tdBase}>{amt(row.approved_amount)}</td>
            <td style={tdBase}>{amt(row.actual_amount)}</td>
            <td style={tdBase}>{amt(row.probablesfornext_n_months)}</td>
            <td style={tdBase}>{totalAmt(row)}</td>
            <td style={tdBase}>{amt(row.nextyr_proposed_amount)}</td>
            <td style={tdBase}>{amt(row.nextyr_proposed_amount)}</td>
            <td style={tdBase} />
          </tr>
        );
      })}
    </tbody>
  );
}

type Props = {
  rows: FinBudgetReportRow[];
  search: string;
  /** Angular: when All, group by transaction_type sections (e.g. ASSETS). */
  transactionTypeLabel: string;
  sectionTypes: string[];
  /** Print layout: no horizontal scroll; table fits page width (Angular parity). */
  forPrint?: boolean;
};

/** Angular budget-estimations HTML report table(s) — screenshot header/alignment parity. */
export function BudgetEstimationsReportTables({
  rows,
  search,
  transactionTypeLabel,
  sectionTypes,
  forPrint = false,
}: Props) {
  const meta = metaFromRows(rows);

  const wrapClass = forPrint ? "overflow-visible" : "overflow-x-auto p-2.5";
  const tableClass = forPrint
    ? "w-full border-collapse table-fixed"
    : "w-full min-w-[1200px] border-collapse";

  const tableStyle: CSSProperties = {
    borderCollapse: "collapse",
    borderSpacing: 0,
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: BORDER,
    background: "#fff",
  };

  function renderTable(
    sectionRows: FinBudgetReportRow[],
    opts?: { numberFromAllRows?: FinBudgetReportRow[] },
  ) {
    return (
      <div className={wrapClass}>
        <table id="table" className={tableClass} style={tableStyle}>
          <ReportTableHead meta={meta} />
          <ReportRows
            rows={sectionRows}
            search={search}
            numberFromAllRows={opts?.numberFromAllRows}
          />
        </table>
      </div>
    );
  }

  if (transactionTypeLabel !== "All") {
    return renderTable(rows);
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
    return renderTable(rows);
  }

  // Prefer types that have rows first (still include empty sections like Angular).
  return (
    <div className="space-y-4">
      {types.map((type) => {
        const sectionRows = rows.filter(
          (r) => String(r.transaction_type ?? "") === type,
        );
        return (
          <div key={type} className="space-y-1">
            {/* Angular h3.x-Tittle — centered, bold, uppercase */}
            <h3
              className="m-0 text-center text-[15px] font-bold uppercase tracking-wide text-foreground"
              style={{ margin: "4px 0" }}
            >
              {type}
            </h3>
            {renderTable(sectionRows, {
              numberFromAllRows: forPrint ? rows : undefined,
            })}
          </div>
        );
      })}
    </div>
  );
}
