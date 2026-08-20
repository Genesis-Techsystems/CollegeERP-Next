"use client";

/**
 * Employee Count Report —
 * Angular `reports/hr-reports/employee-count-drilldown-report` (route: employee-drilldown-report).
 *
 * Flags on `getAllRecords/s_rep_emp_details`:
 *   Total_Count_of_employees → Total_Count_of_employees_by_college → Emp_details_of_deptid
 * Params: in_flag, in_college_id, in_dept
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { ListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { printHtmlInIframe } from "@/lib/print";
import { QK } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/errors";
import { toastError, toastInfo } from "@/lib/toast";
import { escapeHtml, exportHtmlTableAsExcel } from "@/common/export-html-table";
import { MINIO_URL } from "@/config/constants/api";
import { DEFAULT_COLLEGE_LOGO } from "@/hooks/useCollegeLogo";
import {
  getEmployeeCountDrilldown,
  listActiveOrganizations,
  type EmployeeDrilldownFlag,
} from "@/services";

type AnyRow = Record<string, unknown>;

/** Angular `trafoItem` / page heading */
const REPORT_TITLE = "Employee Drilldown Report";

/** Angular `currentPosition` values (= last `detailValue` passed to task). */
type CurrentPosition = "" | "college_code" | "Emp_Department";

type DrillStep = {
  id: number;
  name: string;
  in_flag: EmployeeDrilldownFlag;
  in_college_id: number;
  in_dept: number;
  detailName: string;
  detailValue: string;
};

type DrillRow = AnyRow & {
  __rowKey: string;
  varaiableName: string;
  varaiableValue: string;
  count?: number | null;
  Emp_Department?: string;
  Emp_Name?: string;
  emp_number?: string;
  Emp_Designation?: string | null;
  email?: string | null;
  mobile?: string | null;
  Emp_Category?: string | null;
  fk_college_id?: number;
  fk_emp_dept_id?: number;
};

function txt(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Angular `function(input)` — Indian grouping for row counts. */
function formatCount(input: unknown): string {
  if (input == null || input === "") return "";
  const n = Number(input);
  if (Number.isNaN(n)) return "";
  const isNegative = n < 0;
  const abs = Math.abs(n).toString();
  const result = abs.split(".");
  let lastThree = result[0].substring(result[0].length - 3);
  const otherNumbers = result[0].substring(0, result[0].length - 3);
  if (otherNumbers !== "") lastThree = "," + lastThree;
  let output = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree;
  if (result.length > 1) output += "." + result[1];
  if (isNegative) output = "-" + output;
  return output;
}

/** Angular: show `-` only when value is strictly `null`. */
function nullDash(v: unknown): string {
  return v === null ? "-" : txt(v);
}

function isDefaultLogoUrl(url: string): boolean {
  return /default_logo\.png/i.test(url);
}

/** Angular binds `logoPath` as img src; null → `assets/images/avatars/default_logo.png`. */
function toPrintLogoUrl(path: string | null | undefined): string {
  const raw = String(path ?? "").trim();
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const fallback = origin
    ? `${origin}${DEFAULT_COLLEGE_LOGO}`
    : DEFAULT_COLLEGE_LOGO;
  if (!raw) return fallback;
  if (/^(https?:\/\/|data:)/i.test(raw)) return raw;
  if (raw.startsWith("/")) return origin ? `${origin}${raw}` : raw;
  const base = String(MINIO_URL ?? "").replace(/\/$/, "");
  if (base) return `${base}/${raw.replace(/^\/+/, "")}`;
  return fallback;
}

async function logoToDataUrl(src: string): Promise<string> {
  const abs = toPrintLogoUrl(src);
  if (abs.startsWith("data:")) return abs;
  try {
    const res = await fetch(abs, { mode: "cors", credentials: "omit" });
    if (!res.ok) return abs;
    const blob = await res.blob();
    if (!blob.type.startsWith("image/")) return abs;
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? abs));
      reader.onerror = () => resolve(abs);
      reader.readAsDataURL(blob);
    });
  } catch {
    return abs;
  }
}

function makeExpandRenderer(onExpand: (row: DrillRow) => void) {
  return (p: ICellRendererParams<DrillRow>) => {
    if (!p.data) return null;
    // Angular grand-total row: colspan covers Expand + blank cols (no `>`).
    if (p.data.__rowKey === "grand-total") {
      return <span>Grand Total</span>;
    }
    return (
      <button
        type="button"
        className="cursor-pointer px-2 font-medium hover:underline"
        onClick={() => onExpand(p.data!)}
      >
        &gt;
      </button>
    );
  };
}

export default function EmployeeDrilldownReportPage() {
  const orgId = Number(
    globalThis?.localStorage?.getItem("organizationId") ?? 0,
  );

  const [steps, setSteps] = useState<DrillStep[]>([]);
  const [currentPosition, setCurrentPosition] = useState<CurrentPosition>("");
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // Angular: listDetailsById(organizations, 'true', isActive)
  const orgsQuery = useQuery({
    queryKey: QK.employeeDrilldownReport.orgs(),
    queryFn: listActiveOrganizations,
    staleTime: 5 * 60_000,
  });

  const orgMeta = useMemo(() => {
    const list = orgsQuery.data ?? [];
    const org = list.find((o) => Number(o.organizationId) === orgId) ?? null;
    const logoPath = org?.logoPath?.trim() || "";
    return {
      orgName: org?.orgName?.trim() || "",
      logoPath,
    };
  }, [orgsQuery.data, orgId]);

  /** Angular getSummary(in_flag, in_college_id, in_dept, detailName, detailValue) */
  const getSummary = useCallback(
    async (
      in_flag: EmployeeDrilldownFlag,
      in_college_id: number,
      in_dept: number,
      detailName: string,
      detailValue: string,
    ) => {
      setLoading(true);
      setRows([]);
      setGrandTotal(0);
      try {
        const raw = await getEmployeeCountDrilldown({
          flag: in_flag,
          collegeId: in_college_id,
          deptId: in_dept,
        });
        // Angular: empty success → empty table (no toast)
        if (!raw.length) return;
        let total = 0;
        const shaped = raw.map((x) => {
          const count = x.count == null || x.count === "" ? null : num(x.count);
          if (count != null) total += count;
          return {
            ...x,
            varaiableName: detailName,
            varaiableValue: txt(x[detailValue]),
            count,
          };
        });
        setRows(shaped);
        setGrandTotal(total);
      } catch (err) {
        toastError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void getSummary(
      "Total_Count_of_employees",
      0,
      0,
      "College",
      "college_code",
    );
  }, [getSummary]);

  const task = useCallback(
    (
      e: string,
      in_flag: EmployeeDrilldownFlag,
      in_college_id: number,
      in_dept: number,
      detailName: string,
      detailValue: string,
      back: "add" | "back",
    ) => {
      void getSummary(in_flag, in_college_id, in_dept, detailName, detailValue);
      if (back === "add") {
        setSteps((prev) => [
          ...prev,
          {
            id: prev.length + 1,
            name: e,
            in_flag,
            in_college_id,
            in_dept,
            detailName,
            detailValue,
          },
        ]);
      }
      setCurrentPosition(detailValue as CurrentPosition);
    },
    [getSummary],
  );

  const expandRoot = useCallback(
    (datum: DrillRow) => {
      task(
        datum.varaiableValue,
        "Total_Count_of_employees_by_college",
        num(datum.fk_college_id),
        0,
        "College",
        "college_code",
        "add",
      );
    },
    [task],
  );

  const expandCollege = useCallback(
    (datum: DrillRow) => {
      task(
        txt(datum.Emp_Department),
        "Emp_details_of_deptid",
        num(datum.fk_college_id),
        num(datum.fk_emp_dept_id),
        "Department",
        "Emp_Department",
        "add",
      );
    },
    [task],
  );

  const handleBack = () => {
    setSteps((prev) => {
      const next = prev.slice(0, -1);
      if (next.length > 0) {
        const last = next[next.length - 1]!;
        // Angular back() → task(..., 'back') which refreshes + sets currentPosition
        void getSummary(
          last.in_flag,
          last.in_college_id,
          last.in_dept,
          last.detailName,
          last.detailValue,
        );
        setCurrentPosition(last.detailValue as CurrentPosition);
      } else {
        void getSummary(
          "Total_Count_of_employees",
          0,
          0,
          "College",
          "college_code",
        );
        setCurrentPosition("");
      }
      return next;
    });
  };

  const isLeaf = currentPosition === "Emp_Department";

  const displayRows = useMemo<DrillRow[]>(
    () =>
      rows.map((row, i) => ({
        ...row,
        __rowKey: `${currentPosition}-${i}`,
        varaiableName: txt(row.varaiableName),
        varaiableValue: txt(row.varaiableValue),
        count: row.count == null ? null : num(row.count),
        Emp_Department: txt(row.Emp_Department),
        Emp_Name: txt(row.Emp_Name),
        emp_number: txt(row.emp_number),
        Emp_Designation:
          row.Emp_Designation === null || row.Emp_Designation === undefined
            ? null
            : txt(row.Emp_Designation),
        email:
          row.email === null || row.email === undefined ? null : txt(row.email),
        mobile:
          row.mobile === null || row.mobile === undefined
            ? null
            : txt(row.mobile),
        Emp_Category:
          row.Emp_Category === null || row.Emp_Category === undefined
            ? null
            : txt(row.Emp_Category),
        fk_college_id: num(row.fk_college_id),
        fk_emp_dept_id: num(row.fk_emp_dept_id),
      })),
    [currentPosition, rows],
  );

  // Angular: Grand Total row only when currentPosition != Emp_Department and list length > 0
  const pinnedBottom = useMemo<DrillRow[] | undefined>(() => {
    if (isLeaf || displayRows.length === 0) return undefined;
    return [
      {
        __rowKey: "grand-total",
        varaiableName: "Grand Total",
        varaiableValue: "",
        Emp_Department: "",
        count: grandTotal,
      },
    ];
  }, [displayRows.length, grandTotal, isLeaf]);

  const columnDefs = useMemo<ColDef<DrillRow>[]>(() => {
    if (isLeaf) {
      return [
        {
          headerName: " ",
          minWidth: 120,
          valueGetter: (p) => p.data?.varaiableName ?? "",
          cellStyle: { textAlign: "center" },
        },
        {
          headerName: " ",
          minWidth: 140,
          valueGetter: (p) => p.data?.varaiableValue ?? "",
          cellStyle: { textAlign: "center" },
        },
        {
          headerName: "Employee",
          minWidth: 200,
          // Angular always: Emp_Name (emp_number)
          valueGetter: (p) =>
            `${p.data?.Emp_Name ?? ""} (${p.data?.emp_number ?? ""})`,
          cellStyle: { textAlign: "center" },
        },
        {
          headerName: "Employee Designation",
          minWidth: 160,
          valueGetter: (p) => nullDash(p.data?.Emp_Designation),
          cellStyle: { textAlign: "center" },
        },
        {
          headerName: "Email",
          minWidth: 160,
          valueGetter: (p) => nullDash(p.data?.email),
          cellStyle: { textAlign: "center" },
        },
        {
          headerName: "Mobile",
          minWidth: 120,
          valueGetter: (p) => nullDash(p.data?.mobile),
          cellStyle: { textAlign: "center" },
        },
        {
          headerName: "Employee Category",
          minWidth: 140,
          valueGetter: (p) => nullDash(p.data?.Emp_Category),
          cellStyle: { textAlign: "center" },
        },
      ];
    }

    if (currentPosition === "college_code") {
      // Screen: Expand + 2 blanks + Department + Count (=5). Grand Total colspan=4 + count.
      return [
        {
          headerName: "Expand",
          width: 90,
          flex: 0,
          sortable: false,
          filter: false,
          colSpan: (p) => (p.data?.__rowKey === "grand-total" ? 4 : 1),
          cellRenderer: makeExpandRenderer(expandCollege),
          cellStyle: { textAlign: "center", cursor: "pointer" },
        },
        {
          headerName: " ",
          minWidth: 120,
          valueGetter: (p) => p.data?.varaiableName ?? "",
          onCellClicked: (e) => {
            if (e.data && e.data.__rowKey !== "grand-total")
              expandCollege(e.data);
          },
          cellStyle: { textAlign: "center", cursor: "pointer" },
        },
        {
          headerName: " ",
          minWidth: 120,
          field: "varaiableValue",
          onCellClicked: (e) => {
            if (e.data && e.data.__rowKey !== "grand-total")
              expandCollege(e.data);
          },
          cellStyle: { textAlign: "center", cursor: "pointer" },
        },
        {
          headerName: "Department",
          minWidth: 180,
          field: "Emp_Department",
          onCellClicked: (e) => {
            if (e.data && e.data.__rowKey !== "grand-total")
              expandCollege(e.data);
          },
          cellStyle: { textAlign: "center", cursor: "pointer" },
        },
        {
          headerName: "Employees Count",
          minWidth: 140,
          valueGetter: (p) => {
            if (p.data?.__rowKey === "grand-total") return String(grandTotal);
            return p.data?.count == null ? "" : formatCount(p.data.count);
          },
          onCellClicked: (e) => {
            if (e.data && e.data.__rowKey !== "grand-total")
              expandCollege(e.data);
          },
          cellStyle: { textAlign: "center", cursor: "pointer" },
        },
      ];
    }

    // Root: Expand + 2 blanks + Count (=4). Grand Total colspan=3 + count.
    return [
      {
        headerName: "Expand",
        width: 90,
        flex: 0,
        sortable: false,
        filter: false,
        colSpan: (p) => (p.data?.__rowKey === "grand-total" ? 3 : 1),
        cellRenderer: makeExpandRenderer(expandRoot),
        cellStyle: { textAlign: "center", cursor: "pointer" },
      },
      {
        headerName: " ",
        minWidth: 120,
        valueGetter: (p) => p.data?.varaiableName ?? "",
        onCellClicked: (e) => {
          if (e.data && e.data.__rowKey !== "grand-total") expandRoot(e.data);
        },
        cellStyle: { textAlign: "center", cursor: "pointer" },
      },
      {
        headerName: " ",
        minWidth: 120,
        field: "varaiableValue",
        onCellClicked: (e) => {
          if (e.data && e.data.__rowKey !== "grand-total") expandRoot(e.data);
        },
        cellStyle: { textAlign: "center", cursor: "pointer" },
      },
      {
        headerName: "Employees Count",
        minWidth: 140,
        valueGetter: (p) => {
          if (p.data?.__rowKey === "grand-total") return String(grandTotal);
          return p.data?.count == null ? "" : formatCount(p.data.count);
        },
        onCellClicked: (e) => {
          if (e.data && e.data.__rowKey !== "grand-total") expandRoot(e.data);
        },
        cellStyle: { textAlign: "center", cursor: "pointer" },
      },
    ];
  }, [currentPosition, expandCollege, expandRoot, grandTotal, isLeaf]);

  const drillPathHtml =
    steps.length > 0
      ? `<span style="padding:5px 10px;color:#0c51a4;font-size:16px;font-weight:500">${steps
          .map(
            (s, i) => escapeHtml(s.name) + (i < steps.length - 1 ? " > " : ""),
          )
          .join("")}</span>`
      : "";

  const buildPrintExportHtml = () => {
    if (!displayRows.length) return "";

    if (isLeaf) {
      const cols = [
        { key: "n", header: " " },
        { key: "v", header: " " },
        { key: "emp", header: "Employee" },
        { key: "des", header: "Employee Designation" },
        { key: "email", header: "Email" },
        { key: "mobile", header: "Mobile" },
        { key: "cat", header: "Employee Category" },
      ];
      const head = cols.map((c) => `<th>${escapeHtml(c.header)}</th>`).join("");
      const body = displayRows
        .map((d) => {
          const row = {
            n: d.varaiableName,
            v: d.varaiableValue,
            emp: `${d.Emp_Name ?? ""} (${d.emp_number ?? ""})`,
            des: nullDash(d.Emp_Designation),
            email: nullDash(d.email),
            mobile: nullDash(d.mobile),
            cat: nullDash(d.Emp_Category),
          };
          return `<tr>${cols
            .map(
              (c) =>
                `<td>${escapeHtml(String(row[c.key as keyof typeof row] ?? ""))}</td>`,
            )
            .join("")}</tr>`;
        })
        .join("");
      return `<table class="mar" border="1" cellspacing="0" cellpadding="4"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
    }

    if (currentPosition === "college_code") {
      // Excel/print (no Expand col): Grand Total colspan=3 + count
      return `<table class="mar" border="1" cellspacing="0" cellpadding="4">
<thead><tr>
<th> </th>
<th> </th>
<th>Department</th>
<th>Employees Count</th>
</tr></thead>
<tbody>
${displayRows
  .map(
    (d) => `<tr>
<td>${escapeHtml(d.varaiableName)}</td>
<td>${escapeHtml(d.varaiableValue)}</td>
<td>${escapeHtml(d.Emp_Department ?? "")}</td>
<td>${d.count == null ? "" : escapeHtml(formatCount(d.count))}</td>
</tr>`,
  )
  .join("")}
<tr>
<td colspan="3">Grand Total</td>
<td>${grandTotal}</td>
</tr>
</tbody></table>`;
    }

    // Excel/print root: Grand Total colspan=2 + count
    return `<table class="mar" border="1" cellspacing="0" cellpadding="4">
<thead><tr>
<th> </th>
<th> </th>
<th>Employees Count</th>
</tr></thead>
<tbody>
${displayRows
  .map(
    (d) => `<tr>
<td>${escapeHtml(d.varaiableName)}</td>
<td>${escapeHtml(d.varaiableValue)}</td>
<td>${d.count == null ? "" : escapeHtml(formatCount(d.count))}</td>
</tr>`,
  )
  .join("")}
<tr>
<td colspan="2">Grand Total</td>
<td>${grandTotal}</td>
</tr>
</tbody></table>`;
  };

  const handleExcelExport = () => {
    if (!displayRows.length) {
      toastInfo("No records to export.");
      return;
    }
    // Angular #excelTable: hidden org/title + drill path + table
    const headerHtml = `<p style="display:none">${escapeHtml(orgMeta.orgName)}</p><p style="display:none">${escapeHtml(REPORT_TITLE)}</p>${drillPathHtml}`;
    exportHtmlTableAsExcel(
      `${REPORT_TITLE}.xls`,
      buildPrintExportHtml(),
      headerHtml,
    );
  };

  const printReport = async () => {
    if (!displayRows.length) {
      toastInfo("No records to print.");
      return;
    }
    // Angular: Logo = logoPath; Logo == null → default_logo.png
    const logoUrl = toPrintLogoUrl(orgMeta.logoPath || DEFAULT_COLLEGE_LOGO);
    const logoSrc = isDefaultLogoUrl(logoUrl)
      ? await logoToDataUrl(DEFAULT_COLLEGE_LOGO)
      : await logoToDataUrl(logoUrl);
    const fallbackLogo = toPrintLogoUrl(DEFAULT_COLLEGE_LOGO);

    printHtmlInIframe(`<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>${escapeHtml(REPORT_TITLE)}</title>
<style>
@page{margin:12mm}
*{box-sizing:border-box}
body{font-family:Arial,sans-serif;padding:12px;color:#111;margin:0}
.banner{display:flex;align-items:flex-start;width:100%;margin-bottom:8px}
.banner img{height:96px;width:100px;object-fit:contain}
.collegeName{text-align:left;font-size:20px;font-weight:550;margin:20px 0 -5px 0.4%}
.title{text-align:left;font-size:19px;font-weight:550;margin:0}
/* separate + outer border avoids Chrome print clipping the right edge */
table{width:100%;border-collapse:separate;border-spacing:0;border:1px solid #333;font-size:12px;table-layout:fixed}
th,td{border-right:1px solid #333;border-bottom:1px solid #333;padding:8px;text-align:center;word-wrap:break-word;overflow-wrap:anywhere}
th:last-child,td:last-child{border-right:none}
tr:last-child td{border-bottom:none}
th{background:#C3D9FF;font-weight:500;border-top:none}
td{border-top:none}
</style></head><body>
<div class="banner">
  <img src="${escapeHtml(logoSrc)}" alt="" onerror="this.onerror=null;this.src='${escapeHtml(fallbackLogo)}'"/>
  <div style="flex:1">
    <p class="collegeName">${escapeHtml(orgMeta.orgName)}</p>
    <p class="title">${escapeHtml(REPORT_TITLE)}</p>
  </div>
</div>
${drillPathHtml}
${buildPrintExportHtml()}
</body></html>`);
  };

  return (
    <ListPage<DrillRow>
      title={REPORT_TITLE}
      rowData={displayRows}
      columnDefs={columnDefs}
      pinnedBottomRowData={pinnedBottom}
      loading={loading}
      pagination={true}
      getRowId={(p) => String(p.data?.__rowKey ?? "")}
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        exportExcel: false,
        exportPdf: false,
        columnPicker: false,
        columnFilters: false,
      }}
      toolbarLeading={
        steps.length > 0 ? (
          <p className="text-[16px] font-medium text-[#0c51a4]">
            {steps.map((s, i) => (
              <span key={s.id}>
                {s.name}
                {i < steps.length - 1 ? " > " : ""}
              </span>
            ))}
          </p>
        ) : null
      }
      toolbarTrailing={
        <div className="flex flex-wrap items-center gap-2">
          {steps.length > 0 ? (
            <Button
              type="button"
              className="h-[30px] px-3 text-[12px]"
              onClick={handleBack}
              disabled={loading}
            >
              Back
            </Button>
          ) : null}
          <Button
            type="button"
            className="h-[30px] px-3 text-[12px]"
            onClick={handleExcelExport}
            disabled={loading || !displayRows.length}
          >
            Export Excel
          </Button>
          <Button
            type="button"
            className="h-[30px] px-3 text-[12px]"
            onClick={() => void printReport()}
            disabled={loading || !displayRows.length}
          >
            Print Report
          </Button>
        </div>
      }
    />
  );
}
