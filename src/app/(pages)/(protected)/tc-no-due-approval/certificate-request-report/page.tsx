"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { ColDef } from "ag-grid-community";
import { format } from "date-fns";
import { FileSpreadsheet, FileText } from "lucide-react";
import { FilteredListPage } from "@/components/layout";
import { DatePicker } from "@/common/components/date-picker";
import { Select } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import {
  buildHtmlTable,
  escapeHtml,
  exportHtmlTableAsExcel,
} from "@/common/export-html-table";
import { QK } from "@/lib/query-keys";
import { printHtmlInIframe } from "@/lib/print";
import { toastError, toastInfo } from "@/lib/toast";
import { useApiQueryToasts } from "@/hooks";
import { DEFAULT_COLLEGE_LOGO, useCollegeLogo } from "@/hooks/useCollegeLogo";
import { getCertificateSummaryReport, getCollegeById } from "@/services";
import type { CertificateSummaryReportRow } from "@/types/tc-no-due";
import { useTcCollegeCascade } from "@/app/(pages)/(protected)/tc-no-due-approval/_lib/use-tc-college-cascade";
import { resolveReportCatalogHref } from "@/lib/report-catalog";
import { buildBannerHtml } from "@/app/(pages)/(protected)/reports/student-attendance-reports/_lib/useAttendanceReportFilters";
import { resolveAttendancePrintLogo } from "@/app/(pages)/(protected)/reports/admin-attendance-reports/_lib/attendance-report-print";

const REPORT_TITLE = "Certificate Request Report";

const EXCEL_COLUMNS: { key: string; header: string }[] = [
  { key: "id", header: "S.No" },
  { key: "college_shortname", header: "College" },
  { key: "academic_year", header: "Academic Year" },
  { key: "Transfer_Certificates", header: "Transfer Certificate" },
  { key: "Bonafide_Certificates", header: "Bonafide Certificate" },
  { key: "Other_Certificates", header: "Other Certificates" },
];

const COL_DEFS: ColDef<CertificateSummaryReportRow>[] = [
  {
    field: "id",
    headerName: "S.No",
    width: 80,
    flex: 0,
    cellClass: "text-left",
  },
  {
    field: "college_shortname",
    headerName: "College",
    minWidth: 120,
    flex: 1,
    cellClass: "text-left",
  },
  {
    field: "academic_year",
    headerName: "Academic Year",
    minWidth: 120,
    flex: 1,
    cellClass: "text-left",
  },
  {
    field: "Transfer_Certificates",
    headerName: "Transfer Certificate",
    minWidth: 140,
    flex: 1,
    cellClass: "text-left",
  },
  {
    field: "Bonafide_Certificates",
    headerName: "Bonafide Certificate",
    minWidth: 140,
    flex: 1,
    cellClass: "text-left",
  },
  {
    field: "Other_Certificates",
    headerName: "Other Certificates",
    minWidth: 140,
    flex: 1,
    cellClass: "text-left",
  },
];

/** Angular `getExcelExportProperties` header rows (portrait report title + dataDetails). */
function buildExcelExportHeaderHtml(
  collegeName: string,
  dataDetails: string,
): string {
  const details = dataDetails.trim();
  return `<div style="text-align:center;margin-bottom:12px;">
    <div style="font-size:20px;font-weight:bold;color:#466884;">${escapeHtml(collegeName)}</div>
    <div style="height:8px;"></div>
    <div style="font-size:20px;font-weight:bold;color:#C67878;">( ${escapeHtml(REPORT_TITLE)} )</div>
    ${details ? `<div style="height:8px;"></div><div style="font-size:20px;font-weight:bold;color:#C67878;">${escapeHtml(details)}</div>` : ""}
  </div>`;
}

export default function CertificateRequestReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgCode =
    typeof globalThis.localStorage !== "undefined"
      ? String(globalThis.localStorage.getItem("orgCode") ?? "")
      : "";

  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState<Date | null>(new Date());
  const [toDate, setToDate] = useState<Date | null>(new Date());
  const [loadKey, setLoadKey] = useState<string | null>(null);

  const collegeNum = Number(collegeId ?? 0);
  const collegeLogo = useCollegeLogo(collegeNum);
  const { colleges, loadingColleges } = useTcCollegeCascade(collegeNum);

  useEffect(() => {
    if (!collegeId && colleges.length > 0) {
      setCollegeId(String(colleges[0]!.value));
    }
  }, [colleges, collegeId]);

  const {
    data: rows = [],
    isFetching,
    error,
    isSuccess,
    isError,
  } = useQuery({
    queryKey: QK.tcNoDue.summaryReport(
      loadKey ? Number(JSON.parse(loadKey).collegeId) : 0,
      loadKey ? JSON.parse(loadKey).fromDate : "",
      loadKey ? JSON.parse(loadKey).toDate : "",
    ),
    queryFn: () => {
      const p = JSON.parse(loadKey!) as {
        collegeId: number;
        fromDate: string;
        toDate: string;
      };
      return getCertificateSummaryReport(p);
    },
    enabled: loadKey != null,
  });

  const { resetApiToast } = useApiQueryToasts({
    requestKey: loadKey,
    isFetching,
    isSuccess,
    isError,
    error,
    rowCount: rows.length,
  });

  const tableRows = useMemo<CertificateSummaryReportRow[]>(
    () =>
      rows.map((row, i) => ({
        ...row,
        id: row.id ?? i + 1,
      })),
    [rows],
  );

  const dataDetails = useMemo(() => {
    const collegeCode =
      colleges.find((c) => c.value === collegeId)?.label?.trim() ?? "";
    if (!fromDate || !toDate) return "";
    const from = format(fromDate, "yyyy-MM-dd");
    const to = format(toDate, "yyyy-MM-dd");
    if (!collegeCode) return `${from} to ${to}`;
    return `${collegeCode} / ${from} to ${to}`;
  }, [colleges, collegeId, fromDate, toDate]);

  const exportFlatRows = useMemo(
    () =>
      tableRows.map((row) => ({
        id: String(row.id ?? ""),
        college_shortname: String(row.college_shortname ?? ""),
        academic_year: String(row.academic_year ?? ""),
        Transfer_Certificates: String(row.Transfer_Certificates ?? ""),
        Bonafide_Certificates: String(row.Bonafide_Certificates ?? ""),
        Other_Certificates: String(row.Other_Certificates ?? ""),
      })),
    [tableRows],
  );

  const resolveCollegeName = useCallback(async (): Promise<string> => {
    if (!collegeNum) return "";
    try {
      const college = await getCollegeById(collegeNum);
      return String(
        college?.collegeName ??
          college?.collegeCode ??
          dataDetails.split("/")[0]?.trim() ??
          "",
      );
    } catch {
      return dataDetails.split("/")[0]?.trim() ?? "";
    }
  }, [collegeNum, dataDetails]);

  const handleExcelExport = useCallback(async () => {
    if (exportFlatRows.length === 0) {
      toastError("No records to export.");
      return;
    }
    const collegeName = await resolveCollegeName();
    const headerHtml = buildExcelExportHeaderHtml(collegeName, dataDetails);
    const tableHtml = buildHtmlTable(EXCEL_COLUMNS, exportFlatRows);
    exportHtmlTableAsExcel(
      "Certificate Request Report.xls",
      tableHtml,
      headerHtml,
    );
  }, [dataDetails, exportFlatRows, resolveCollegeName]);

  const handlePdfExport = useCallback(async () => {
    if (exportFlatRows.length === 0) {
      toastError("No records to export.");
      return;
    }
    const collegeName = await resolveCollegeName();
    const logoSrc = await resolveAttendancePrintLogo(
      null,
      collegeNum,
      collegeLogo || DEFAULT_COLLEGE_LOGO,
    );
    const headerHtml = buildBannerHtml({
      logoSrc,
      collegeName,
      dataDetails,
      reportTitle: REPORT_TITLE,
      orgCode,
    });
    const tableHtml = buildHtmlTable(EXCEL_COLUMNS, exportFlatRows);
    printHtmlInIframe(`<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>${escapeHtml(REPORT_TITLE)}</title>
<style>
@page { size: A4 portrait; margin: 12mm; }
body { font-family: Arial, sans-serif; padding: 16px; color: #111; }
table { width: 100%; border-collapse: collapse; font-size: 11px; }
th, td { border: 1px solid #333; padding: 3px 5px; }
th { background: #e8f0fe; text-align: center; }
tr { break-inside: avoid; }
</style></head><body>
${headerHtml}
${tableHtml}
</body></html>`);
  }, [
    collegeLogo,
    collegeNum,
    dataDetails,
    exportFlatRows,
    orgCode,
    resolveCollegeName,
  ]);

  function handleGetList() {
    if (!collegeNum) {
      toastInfo("Please select college.");
      return;
    }
    if (!fromDate || !toDate) {
      toastInfo("Please select from and to dates.");
      return;
    }
    resetApiToast();
    setLoadKey(
      JSON.stringify({
        collegeId: collegeNum,
        fromDate: format(fromDate, "yyyy-MM-dd"),
        toDate: format(toDate, "yyyy-MM-dd"),
      }),
    );
  }

  /** Angular goBack(): navigate to `?path=` or Report Catalog (`report-catalyst`). */
  function onBack() {
    router.push(resolveReportCatalogHref(searchParams.get("path")));
  }

  const resultsVisible = loadKey != null && !isFetching && rows.length > 0;

  return (
    <FilteredListPage<CertificateSummaryReportRow>
      title="Certificate Request Report"
      filters={
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[180px] flex-1">
            <Select
              label="College"
              required
              value={collegeId}
              onChange={(v) => {
                setCollegeId(v);
                setLoadKey(null);
              }}
              options={colleges}
              placeholder="College"
              isLoading={loadingColleges}
            />
          </div>
          <div className="min-w-[160px] flex-1">
            <DatePicker
              label="From Date"
              value={fromDate}
              onChange={(d) => {
                setFromDate(d);
                setLoadKey(null);
              }}
              maxDate={new Date()}
            />
          </div>
          <div className="min-w-[160px] flex-1">
            <DatePicker
              label="To Date"
              value={toDate}
              onChange={(d) => {
                setToDate(d);
                setLoadKey(null);
              }}
              maxDate={new Date()}
            />
          </div>
          <Button
            type="button"
            size="sm"
            disabled={isFetching || !collegeId || !fromDate || !toDate}
            onClick={handleGetList}
          >
            {isFetching ? "Loading…" : "Get List"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onBack}
            className="h-[30px] px-3 text-[12px] bg-amber-400 text-black hover:bg-amber-500"
          >
            Back
          </Button>
        </div>
      }
      rowData={tableRows}
      columnDefs={COL_DEFS}
      loading={isFetching}
      resultsVisible={resultsVisible}
      height="auto"
      pagination
      columnFilters={true}
      getRowId={(p) => String(p.data?.id ?? "")}
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        exportExcel: false,
        exportPdf: false,
        columnPicker: false,
      }}
      toolbarTrailing={
        resultsVisible ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="app-data-table-toolbar-btn h-9 px-3 text-[12px]"
              onClick={() => void handleExcelExport()}
            >
              <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
              Excel
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="app-data-table-toolbar-btn h-9 px-3 text-[12px]"
              onClick={() => void handlePdfExport()}
            >
              <FileText className="mr-1.5 h-3.5 w-3.5" />
              PDF
            </Button>
          </>
        ) : null
      }
    />
  );
}
