"use client";

/**
 * Biometric Tablelist —
 * Angular `reports/student-attendance-reports/biometric-tablelist` (`BiometricTablelistComponent`) parity.
 * List: `domain/list/TableList?query=order(createdDt=desc)&page=0&size=9999`, auto-loaded on mount.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  ColDef,
  ICellRendererParams,
  ValueFormatterParams,
} from "ag-grid-community";
import { format } from "date-fns";
import { FileSpreadsheet, Printer } from "lucide-react";
import { StatusBadge } from "@/common/components/data-display";
import {
  buildHtmlTable,
  escapeHtml,
  exportHtmlTableAsExcel,
} from "@/common/export-html-table";
import { ListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useSessionContext } from "@/context/SessionContext";
import { DEFAULT_COLLEGE_LOGO, useCollegeLogo } from "@/hooks/useCollegeLogo";
import { getErrorMessage } from "@/lib/errors";
import { printHtmlInIframe } from "@/lib/print";
import { toastError } from "@/lib/toast";
import { rowIndexGetter } from "@/lib/utils";
import { fetchBiometricTableList, type BiometricReportRow } from "@/services";
import {
  attendancePrintShell,
  resolveAttendancePrintLogo,
  toPrintLogoUrl,
} from "../_lib/attendance-report-print";

type AnyRow = BiometricReportRow;

const REPORT_TITLE = "Biometric Tablelist";

const EXCEL_COLUMNS = [
  { key: "siNo", header: "No." },
  { key: "sourceTableName", header: "Source Table Name" },
  { key: "destinationTableName", header: "Destination Table Name" },
  { key: "conditions", header: "Conditions" },
  { key: "loadColumnName", header: "Load ColumnName" },
  { key: "nextRunDate", header: "Next RunDate" },
  { key: "isActive", header: "Status" },
] as const;

function formatDMY(value: unknown): string {
  if (value == null || value === "") return "";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return format(d, "dd/MM/yyyy");
}

function isActiveBool(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  return String(value ?? "").toLowerCase() === "true";
}

function dateColRenderer(p: ValueFormatterParams<AnyRow>): string {
  return formatDMY(p.value);
}

function statusRenderer(p: ICellRendererParams<AnyRow>) {
  return <StatusBadge status={isActiveBool(p.data?.isActive)} />;
}

const COL_DEFS = {
  siNo: {
    headerName: "No.",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<AnyRow>,
  sourceTableName: {
    field: "sourceTableName",
    headerName: "Source Table Name",
    minWidth: 200,
  } as ColDef<AnyRow>,
  destinationTableName: {
    field: "destinationTableName",
    headerName: "Destination Table Name",
    minWidth: 200,
  } as ColDef<AnyRow>,
  conditions: {
    field: "conditions",
    headerName: "Conditions",
    minWidth: 200,
  } as ColDef<AnyRow>,
  loadColumnName: {
    field: "loadColumnName",
    headerName: "Load ColumnName",
    minWidth: 180,
  } as ColDef<AnyRow>,
  nextRunDate: {
    field: "nextRunDate",
    headerName: "Next RunDate",
    minWidth: 140,
    valueFormatter: dateColRenderer,
  } as ColDef<AnyRow>,
  isActive: {
    field: "isActive",
    headerName: "Status",
    minWidth: 110,
  } as ColDef<AnyRow>,
};

export default function AdminBiometricTablelistPage() {
  const { user } = useSessionContext();
  const collegeId = user?.collegeId ?? null;
  const collegeName = String(user?.collegeName ?? "");
  const collegeLogo = useCollegeLogo(collegeId);

  const [rows, setRows] = useState<AnyRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchBiometricTableList()
      .then((raw) => {
        if (!cancelled) setRows(raw);
      })
      .catch((err) => {
        if (!cancelled) toastError(getErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.sourceTableName,
      COL_DEFS.destinationTableName,
      COL_DEFS.conditions,
      COL_DEFS.loadColumnName,
      COL_DEFS.nextRunDate,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
    ],
    [],
  );

  const exportFlatRows = useMemo(
    () =>
      rows.map((row, i) => ({
        siNo: i + 1,
        sourceTableName: String(row.sourceTableName ?? ""),
        destinationTableName: String(row.destinationTableName ?? ""),
        conditions: String(row.conditions ?? ""),
        loadColumnName: String(row.loadColumnName ?? ""),
        nextRunDate: formatDMY(row.nextRunDate),
        isActive: isActiveBool(row.isActive) ? "Active" : "Inactive",
      })),
    [rows],
  );

  const handleExcelExport = useCallback(() => {
    if (exportFlatRows.length === 0) {
      toastError("No records to export.");
      return;
    }
    const tableHtml = buildHtmlTable(
      EXCEL_COLUMNS.map((c) => ({ key: c.key, header: c.header })),
      exportFlatRows as Record<string, unknown>[],
    );
    exportHtmlTableAsExcel(`${REPORT_TITLE}.xls`, tableHtml);
  }, [exportFlatRows]);

  const handlePrintReport = useCallback(async () => {
    if (exportFlatRows.length === 0) {
      toastError("No records to print.");
      return;
    }
    const logoSrc = await resolveAttendancePrintLogo(
      null,
      collegeId ?? 0,
      collegeLogo || DEFAULT_COLLEGE_LOGO,
    );
    const fallbackLogo = toPrintLogoUrl(DEFAULT_COLLEGE_LOGO);
    const tableHtml = buildHtmlTable(
      EXCEL_COLUMNS.map((c) => ({ key: c.key, header: c.header })),
      exportFlatRows as Record<string, unknown>[],
    );
    printHtmlInIframe(
      attendancePrintShell({
        title: escapeHtml(REPORT_TITLE),
        logoSrc: escapeHtml(logoSrc),
        fallbackLogo: escapeHtml(fallbackLogo),
        collegeName: escapeHtml(collegeName || "College"),
        tableHtml,
      }),
    );
  }, [collegeId, collegeLogo, collegeName, exportFlatRows]);

  return (
    <ListPage<AnyRow>
      title={REPORT_TITLE}
      rowData={rows}
      columnDefs={columnDefs}
      loading={loading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search…",
        exportExcel: false,
        exportPdf: false,
      }}
      toolbarTrailing={
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            className="h-9 px-3 text-[12px]"
            onClick={handleExcelExport}
          >
            <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
            Export Excel
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-9 px-3 text-[12px]"
            onClick={() => void handlePrintReport()}
          >
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Print Report
          </Button>
        </div>
      }
    />
  );
}
