"use client";

/**
 * Biometric Jobs —
 * Angular `reports/student-attendance-reports/admin-biometric-jobs` (`AdminBiometricJobsComponent`) parity.
 * List: `domain/list/Jobs?query=order(createdDt=desc)&page=0&size=9999`.
 * From/To dates are shown in the header only — Angular does not send them to the Jobs API.
 */

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  ColDef,
  ICellRendererParams,
  ValueFormatterParams,
} from "ag-grid-community";
import { format } from "date-fns";
import { FileSpreadsheet, Printer } from "lucide-react";
import { StatusBadge } from "@/common/components/data-display";
import { DatePicker } from "@/common/components/date-picker";
import {
  buildHtmlTable,
  escapeHtml,
  exportHtmlTableAsExcel,
} from "@/common/export-html-table";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useSessionContext } from "@/context/SessionContext";
import { DEFAULT_COLLEGE_LOGO, useCollegeLogo } from "@/hooks/useCollegeLogo";
import { getErrorMessage } from "@/lib/errors";
import { printHtmlInIframe } from "@/lib/print";
import { resolveReportCatalogHref } from "@/lib/report-catalog";
import { toastError, toastInfo } from "@/lib/toast";
import { rowIndexGetter } from "@/lib/utils";
import { fetchBiometricJobs, type BiometricReportRow } from "@/services";
import {
  attendancePrintShell,
  resolveAttendancePrintLogo,
  toPrintLogoUrl,
} from "../_lib/attendance-report-print";

type AnyRow = BiometricReportRow;

const REPORT_TITLE = "Biometric Jobs";

const EXCEL_COLUMNS = [
  { key: "siNo", header: "SI.No" },
  { key: "jobStartDate", header: "Job Start Date" },
  { key: "jobEndDate", header: "Job End Date" },
  { key: "statusMessage", header: "Status Message" },
  { key: "noOfRowsEffected", header: "Rows Effected Count" },
  { key: "etlProcedure", header: "Procedure" },
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
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<AnyRow>,
  jobStartDate: {
    field: "jobStartDate",
    headerName: "Job Start Date",
    minWidth: 150,
    valueFormatter: dateColRenderer,
  } as ColDef<AnyRow>,
  jobEndDate: {
    field: "jobEndDate",
    headerName: "Job End Date",
    minWidth: 150,
    valueFormatter: dateColRenderer,
  } as ColDef<AnyRow>,
  statusMessage: {
    field: "statusMessage",
    headerName: "Status Message",
    minWidth: 220,
  } as ColDef<AnyRow>,
  noOfRowsEffected: {
    field: "noOfRowsEffected",
    headerName: "Rows Effected Count",
    minWidth: 160,
  } as ColDef<AnyRow>,
  etlProcedure: {
    field: "etlProcedure",
    headerName: "Procedure",
    minWidth: 200,
  } as ColDef<AnyRow>,
  isActive: {
    field: "isActive",
    headerName: "Status",
    minWidth: 110,
  } as ColDef<AnyRow>,
};

export default function AdminBiometricJobsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useSessionContext();
  const collegeId = user?.collegeId ?? null;
  const collegeName = String(user?.collegeName ?? "");
  const collegeLogo = useCollegeLogo(collegeId);

  const [fDate, setFDate] = useState<Date | null>(() => new Date());
  const [tDate, setTDate] = useState<Date | null>(() => new Date());

  const [rows, setRows] = useState<AnyRow[]>([]);
  const [dataDetails, setDataDetails] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [showTable, setShowTable] = useState(false);

  const clearResults = useCallback(() => {
    setRows([]);
    setShowTable(false);
    setDataDetails("");
  }, []);

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.jobStartDate,
      COL_DEFS.jobEndDate,
      COL_DEFS.statusMessage,
      COL_DEFS.noOfRowsEffected,
      COL_DEFS.etlProcedure,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
    ],
    [],
  );

  const handleGetList = async () => {
    if (!fDate || !tDate) {
      toastInfo("From Date and To Date are required");
      return;
    }
    const details = `${format(fDate, "yyyy-MMM-dd")} - ${format(tDate, "yyyy-MMM-dd")}`;
    setLoadingList(true);
    clearResults();
    setDataDetails(details);
    try {
      const raw = await fetchBiometricJobs();
      if (raw.length === 0) {
        toastInfo("No records found.");
        return;
      }
      setRows(raw);
      setShowTable(true);
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setLoadingList(false);
    }
  };

  const exportFlatRows = useMemo(
    () =>
      rows.map((row, i) => ({
        siNo: i + 1,
        jobStartDate: formatDMY(row.jobStartDate),
        jobEndDate: formatDMY(row.jobEndDate),
        statusMessage: String(row.statusMessage ?? ""),
        noOfRowsEffected: String(row.noOfRowsEffected ?? ""),
        etlProcedure: String(row.etlProcedure ?? ""),
        isActive: isActiveBool(row.isActive) ? "Active" : "Inactive",
      })),
    [rows],
  );

  const handleExcelExport = useCallback(() => {
    if (exportFlatRows.length === 0) {
      toastError("No records to export.");
      return;
    }
    const headerHtml = `<div style="text-align:center;margin-bottom:12px;">
      <div style="font-size:14px;font-weight:bold;">${escapeHtml(REPORT_TITLE)}${dataDetails ? ` ( ${escapeHtml(dataDetails)} )` : ""}</div>
    </div>`;
    const tableHtml = buildHtmlTable(
      EXCEL_COLUMNS.map((c) => ({ key: c.key, header: c.header })),
      exportFlatRows as Record<string, unknown>[],
    );
    exportHtmlTableAsExcel(`${REPORT_TITLE}.xls`, tableHtml, headerHtml);
  }, [dataDetails, exportFlatRows]);

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
        dataDetails: dataDetails ? escapeHtml(`( ${dataDetails} )`) : undefined,
        tableHtml,
      }),
    );
  }, [collegeId, collegeLogo, collegeName, dataDetails, exportFlatRows]);

  const goBack = () => {
    router.push(resolveReportCatalogHref(searchParams.get("path")));
  };

  return (
    <FilteredListPage<AnyRow>
      title={
        showTable && dataDetails
          ? `${REPORT_TITLE} ( ${dataDetails} )`
          : REPORT_TITLE
      }
      filters={
        <div className="grid grid-cols-1 items-end gap-2 md:grid-cols-12">
          <div className="md:col-span-3">
            <DatePicker
              label="From Date"
              required
              value={fDate}
              onChange={(d) => {
                setFDate(d);
                clearResults();
              }}
              displayFormat="dd/MM/yyyy"
              clearable={false}
            />
          </div>
          <div className="md:col-span-3">
            <DatePicker
              label="To Date"
              required
              value={tDate}
              onChange={(d) => {
                setTDate(d);
                clearResults();
              }}
              displayFormat="dd/MM/yyyy"
              clearable={false}
            />
          </div>
          <div className="flex shrink-0 items-center gap-2 pb-0.5 md:col-span-4">
            <Button
              type="button"
              className="h-9 w-fit px-4"
              disabled={loadingList}
              onClick={() => void handleGetList()}
            >
              {loadingList ? "Loading…" : "Get List"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-9 w-fit px-4"
              onClick={goBack}
            >
              Back
            </Button>
          </div>
        </div>
      }
      rowData={showTable ? rows : []}
      columnDefs={columnDefs}
      loading={loadingList}
      resultsVisible={showTable}
      hideEmptyGrid
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search…",
        exportExcel: false,
        exportPdf: false,
      }}
      toolbarTrailing={
        showTable ? (
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
        ) : undefined
      }
    />
  );
}
