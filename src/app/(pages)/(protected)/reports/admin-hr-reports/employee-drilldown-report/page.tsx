"use client";

/**
 * Employee Count Drilldown Report —
 * Angular `reports/hr-reports/employee-count-drilldown-report` parity.
 * `getAllRecords/s_rep_emp_details` via `in_flag` drill levels:
 *   Total_Count_of_employees -> Total_Count_of_employees_by_college -> Emp_details_of_deptid
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { ChevronRight, Printer } from "lucide-react";
import {
  buildHtmlTable,
  escapeHtml,
  exportHtmlTableAsExcel,
} from "@/common/export-html-table";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { printHtmlInIframe } from "@/lib/print";
import { QK } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/errors";
import { toastError, toastSuccess, toastInfo } from "@/lib/toast";
import {
  getEmployeeCountDrilldown,
  listOrganizations,
  type EmployeeDrilldownFlag,
} from "@/services";

type AnyRow = Record<string, unknown>;

const REPORT_TITLE = "Employee Count Drilldown Report";

type DrillStep = {
  id: number;
  name: string;
  flag: EmployeeDrilldownFlag;
  collegeId: number;
  deptId: number;
  detailName: string;
};

type Position = "" | "college" | "department";

type DrillRow = AnyRow & {
  __rowKey: string;
  varaiableName: string;
  varaiableValue: string;
  count?: string | number;
  Emp_Name?: string;
  emp_number?: string;
  designation?: string;
  email?: string;
  mobile?: string;
  category?: string;
};

function txt(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatCount(v: unknown): string {
  const n = num(v);
  return n.toLocaleString("en-IN");
}

const AGG_COLUMNS = [
  { key: "expand", header: "Expand" },
  { key: "varaiableName", header: "" },
  { key: "varaiableValue", header: "" },
  { key: "count", header: "Employees Count" },
];

const LEAF_COLUMNS = [
  { key: "Emp_Name", header: "Employee" },
  { key: "emp_number", header: "Employee Number" },
  { key: "designation", header: "Designation" },
  { key: "email", header: "Email" },
  { key: "mobile", header: "Mobile" },
  { key: "category", header: "Category" },
];

function makeExpandRenderer(onExpand: (row: DrillRow) => void) {
  return (p: ICellRendererParams<DrillRow>) => {
    if (!p.data) return null;
    return (
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 px-2 font-semibold"
        onClick={() => onExpand(p.data!)}
      >
        &gt;
      </Button>
    );
  };
}

export default function EmployeeDrilldownReportPage() {
  const orgId = Number(
    globalThis?.localStorage?.getItem("organizationId") ?? 0,
  );

  const [steps, setSteps] = useState<DrillStep[]>([]);
  const [position, setPosition] = useState<Position>("");
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const orgsQuery = useQuery({
    queryKey: QK.employeeDrilldownReport.orgs(),
    queryFn: listOrganizations,
    enabled: orgId > 0,
    staleTime: 5 * 60_000,
  });

  const orgMeta = useMemo(() => {
    const org =
      (orgsQuery.data ?? []).find((o) => Number(o.organizationId) === orgId) ??
      null;
    return {
      orgName: org?.orgName?.trim() || "Organization",
      logoPath: org?.logoPath?.trim() || "",
    };
  }, [orgsQuery.data, orgId]);

  const loadLevel = useCallback(
    async (params: {
      flag: EmployeeDrilldownFlag;
      collegeId?: number;
      deptId?: number;
      detailName: string;
      detailValue: string;
    }) => {
      setLoading(true);
      setRows([]);
      setGrandTotal(0);
      try {
        const raw = await getEmployeeCountDrilldown({
          flag: params.flag,
          collegeId: params.collegeId ?? 0,
          deptId: params.deptId ?? 0,
        });
        if (raw.length === 0) {
          toastSuccess("No Records(s) found.");
          return;
        }
        if (params.flag === "Emp_details_of_deptid") {
          setRows(raw);
          return;
        }
        let total = 0;
        const shaped = raw.map((row) => {
          const count = num(row.count);
          total += count;
          return {
            ...row,
            varaiableName: params.detailName,
            varaiableValue: txt(row[params.detailValue]),
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
    void loadLevel({
      flag: "Total_Count_of_employees",
      detailName: "College",
      detailValue: "college_code",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const expandRow = useCallback(
    (row: AnyRow) => {
      if (position === "department") return;

      if (position === "") {
        const name = txt(row.varaiableValue);
        const collegeId = num(row.fk_college_id ?? row.collegeId);
        setSteps((prev) => [
          ...prev,
          {
            id: prev.length + 1,
            name,
            flag: "Total_Count_of_employees_by_college",
            collegeId,
            deptId: 0,
            detailName: "Department",
          },
        ]);
        setPosition("college");
        void loadLevel({
          flag: "Total_Count_of_employees_by_college",
          collegeId,
          detailName: "Department",
          detailValue: "Emp_Department",
        });
        return;
      }

      if (position === "college") {
        const name = txt(row.varaiableValue);
        const last = steps[steps.length - 1];
        const collegeId = last?.collegeId ?? 0;
        const deptId = num(row.fk_emp_dept_id ?? row.deptId);
        setSteps((prev) => [
          ...prev,
          {
            id: prev.length + 1,
            name,
            flag: "Emp_details_of_deptid",
            collegeId,
            deptId,
            detailName: "Employee",
          },
        ]);
        setPosition("department");
        void loadLevel({
          flag: "Emp_details_of_deptid",
          collegeId,
          deptId,
          detailName: "Employee",
          detailValue: "Emp_Name",
        });
      }
    },
    [loadLevel, position, steps],
  );

  const handleBack = () => {
    if (steps.length === 0) return;
    const next = steps.slice(0, -1);
    setSteps(next);
    if (next.length === 0) {
      setPosition("");
      void loadLevel({
        flag: "Total_Count_of_employees",
        detailName: "College",
        detailValue: "college_code",
      });
      return;
    }
    const last = next[next.length - 1]!;
    setPosition(next.length === 1 ? "college" : "department");
    void loadLevel({
      flag: last.flag,
      collegeId: last.collegeId,
      deptId: last.deptId,
      detailName: last.detailName,
      detailValue:
        last.flag === "Emp_details_of_deptid" ? "Emp_Name" : "Emp_Department",
    });
  };

  const isLeaf = position === "department";

  const displayRows = useMemo<DrillRow[]>(
    () =>
      rows.map((row, i) => ({
        ...row,
        __rowKey: `${position}-${i}`,
        varaiableName: txt(row.varaiableName),
        varaiableValue: txt(row.varaiableValue),
        count: row.count as string | number | undefined,
        Emp_Name: txt(row.Emp_Name),
        emp_number: txt(row.emp_number),
        designation: txt(row.designation),
        email: txt(row.email),
        mobile: txt(row.mobile),
        category: txt(row.category),
      })),
    [position, rows],
  );

  const columnDefs = useMemo<ColDef<DrillRow>[]>(() => {
    if (isLeaf) {
      return [
        {
          field: "Emp_Name",
          headerName: "Employee",
          minWidth: 200,
          cellRenderer: (p: ICellRendererParams<DrillRow>) => {
            const name = p.data?.Emp_Name ?? "";
            const number = p.data?.emp_number?.trim();
            return number ? (
              <span>
                {name}{" "}
                <span className="text-muted-foreground">( {number} )</span>
              </span>
            ) : (
              name
            );
          },
        },
        { field: "designation", headerName: "Designation", minWidth: 150 },
        { field: "email", headerName: "Email", minWidth: 180 },
        { field: "mobile", headerName: "Mobile", minWidth: 120 },
        { field: "category", headerName: "Category", minWidth: 120 },
      ];
    }
    return [
      {
        headerName: "Expand",
        width: 90,
        flex: 0,
        sortable: false,
        filter: false,
        cellRenderer: makeExpandRenderer(expandRow),
      },
      {
        field: "varaiableName",
        headerName: "",
        minWidth: 120,
        onCellClicked: (e) => {
          if (e.data) expandRow(e.data);
        },
      },
      {
        field: "varaiableValue",
        headerName: "",
        minWidth: 160,
        onCellClicked: (e) => {
          if (e.data) expandRow(e.data);
        },
      },
      {
        field: "count",
        headerName: "Employees Count",
        minWidth: 150,
        valueFormatter: (p) => formatCount(p.value),
        onCellClicked: (e) => {
          if (e.data) expandRow(e.data);
        },
      },
    ];
  }, [expandRow, isLeaf]);

  const buildExportRows = () => {
    if (isLeaf) {
      return displayRows.map((row) => ({
        Emp_Name: row.Emp_Name ?? "",
        emp_number: row.emp_number ?? "",
        designation: row.designation ?? "",
        email: row.email ?? "",
        mobile: row.mobile ?? "",
        category: row.category ?? "",
      }));
    }
    return [
      ...displayRows.map((row) => ({
        expand: ">",
        varaiableName: row.varaiableName,
        varaiableValue: row.varaiableValue,
        count: formatCount(row.count),
      })),
      ...(displayRows.length > 0
        ? [
            {
              expand: "",
              varaiableName: "Grand Total",
              varaiableValue: "",
              count: formatCount(grandTotal),
            },
          ]
        : []),
    ];
  };

  const handleExcelExport = () => {
    const exportRows = buildExportRows();
    if (exportRows.length === 0) {
      toastInfo("No records to export.");
      return;
    }
    const headerHtml = `<div style="margin-bottom:12px;"><div style="font-size:18px;font-weight:600;">${escapeHtml(orgMeta.orgName)}</div><div style="font-size:16px;font-weight:550;margin-top:4px;">${escapeHtml(REPORT_TITLE)}</div></div>`;
    const columns = isLeaf ? LEAF_COLUMNS : AGG_COLUMNS;
    exportHtmlTableAsExcel(
      `${REPORT_TITLE}.xls`,
      buildHtmlTable(columns, exportRows),
      headerHtml,
    );
  };

  const printReport = () => {
    const exportRows = buildExportRows();
    if (exportRows.length === 0) {
      toastInfo("No records to print.");
      return;
    }
    const columns = isLeaf
      ? LEAF_COLUMNS
      : AGG_COLUMNS.filter((c) => c.key !== "expand");
    const tableHtml = buildHtmlTable(columns, exportRows);
    printHtmlInIframe(`<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>${escapeHtml(REPORT_TITLE)}</title>
<style>
@page{margin:12mm}
body{font-family:Arial,sans-serif;padding:12px;color:#111;margin:0}
.collegeName{font-size:24px;font-weight:550;margin:0 0 6px}
.title{font-size:20px;font-weight:550;margin:0 0 12px}
table{width:100%;border-collapse:collapse;font-size:11px}
th,td{border:1px solid #333;padding:6px 5px;text-align:center}
th{background:#f2f2f2}
</style></head><body>
<p class="collegeName">${escapeHtml(orgMeta.orgName)}</p>
<p class="title">${escapeHtml(REPORT_TITLE)}</p>
${tableHtml}
</body></html>`);
  };

  return (
    <FilteredListPage<DrillRow>
      title={REPORT_TITLE}
      filters={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-3">
            {steps.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1 text-sm">
                <span className="font-medium text-blue-700">
                  {orgMeta.orgName}
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                {steps.map((step, i) => (
                  <span
                    key={step.id}
                    className="inline-flex items-center gap-1"
                  >
                    <span className="font-medium text-blue-700">
                      {step.name}
                    </span>
                    {i < steps.length - 1 ? (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : null}
                  </span>
                ))}
              </div>
            ) : null}
            {!isLeaf && rows.length > 0 ? (
              <p className="text-sm font-semibold">
                Grand Total: {formatCount(grandTotal)}
              </p>
            ) : null}
          </div>
          {steps.length > 0 ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-8 px-3"
              onClick={handleBack}
              disabled={loading}
            >
              Back
            </Button>
          ) : null}
        </div>
      }
      rowData={displayRows}
      columnDefs={columnDefs}
      loading={loading}
      pagination
      paginationPageSize={25}
      getRowId={(p) => String(p.data?.__rowKey ?? "")}
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        exportExcel: true,
        exportPdf: false,
      }}
      onExportExcel={handleExcelExport}
      toolbarTrailing={
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 px-3 text-[12px]"
          onClick={printReport}
        >
          <Printer className="mr-1.5 h-3.5 w-3.5" />
          Print Report
        </Button>
      }
    />
  );
}
