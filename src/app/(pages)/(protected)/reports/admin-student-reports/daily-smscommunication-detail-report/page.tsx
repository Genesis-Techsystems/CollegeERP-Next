"use client";

/**
 * Daily SMS Details Report —
 * Angular `reports/student-admission-reports/daily-smscommunication-detail-report` parity.
 * Route alias: daily-sms-communication-detail-report
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { ColDef } from "ag-grid-community";
import { format } from "date-fns";
import { Printer } from "lucide-react";
import { DatePicker } from "@/common/components/date-picker";
import { Select } from "@/common/components/select";
import {
  buildHtmlTable,
  escapeHtml,
} from "@/common/export-html-table";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { printHtmlInIframe } from "@/lib/print";
import { QK } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/errors";
import { resolveReportCatalogHref } from "@/lib/report-catalog";
import { rowIndexGetter } from "@/lib/utils";
import { toastError, toastInfo } from "@/lib/toast";
import {
  filterColleges,
  pickNum,
  pickText,
  type FilterRow,
} from "@/app/(pages)/(protected)/accounts-and-fees/fee-masters/_lib/fee-master-filters";
import { getFeeMasterCollegeFilters, getSmsSummaryReport } from "@/services";

type AnyRow = Record<string, unknown>;

type SmsRow = AnyRow & {
  __rowKey: string;
  id: number;
  Message_SentDate: string;
  SMS_Type: string;
  Success_Messages: string;
  Failure_Messages: string;
};

const COL_DEFS = {
  siNo: {
    headerName: "S.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<SmsRow>,
  messageDate: {
    field: "Message_SentDate",
    headerName: "Message Date",
    minWidth: 140,
  } as ColDef<SmsRow>,
  smsType: {
    field: "SMS_Type",
    headerName: "SMS Type",
    minWidth: 140,
  } as ColDef<SmsRow>,
  success: {
    field: "Success_Messages",
    headerName: "Success Messages",
    minWidth: 140,
  } as ColDef<SmsRow>,
  failure: {
    field: "Failure_Messages",
    headerName: "Failure Messages",
    minWidth: 140,
  } as ColDef<SmsRow>,
};

const PRINT_COLUMNS: { key: string; header: string }[] = [
  { key: "id", header: "S.No" },
  { key: "Message_SentDate", header: "Message Date" },
  { key: "SMS_Type", header: "SMS Type" },
  { key: "Success_Messages", header: "Success Messages" },
  { key: "Failure_Messages", header: "Failure Messages" },
];

function formatDateCell(value: unknown): string {
  if (value == null || String(value).trim() === "") return "";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return format(d, "dd/MM/yyyy");
}

export default function DailySmsCommunicationDetailReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const orgId = Number(
    globalThis?.localStorage?.getItem("organizationId") ?? 0,
  );
  const empId = Number(globalThis?.localStorage?.getItem("employeeId") ?? 0);

  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState<Date | null>(new Date());
  const [toDate, setToDate] = useState<Date | null>(new Date());
  const [loadKey, setLoadKey] = useState<string | null>(null);
  const [dataDetails, setDataDetails] = useState("");

  const clearResults = useCallback(() => {
    setLoadKey(null);
    setDataDetails("");
  }, []);

  const filtersQuery = useQuery({
    queryKey: QK.studentAdmissionReports.filters(orgId, empId),
    queryFn: () => getFeeMasterCollegeFilters(orgId, empId),
    enabled: orgId > 0 && empId > 0,
  });

  const filtersData = useMemo(
    () => (filtersQuery.data?.filtersData ?? []) as FilterRow[],
    [filtersQuery.data?.filtersData],
  );

  const collegeOptions = useMemo(
    () =>
      filterColleges(filtersData).map((r) => ({
        value: String(pickNum(r, ["fk_college_id", "collegeId"])),
        label: pickText(r, ["college_code", "collegeCode"]),
      })),
    [filtersData],
  );

  useEffect(() => {
    if (collegeId || collegeOptions.length === 0) return;
    setCollegeId(collegeOptions[0].value);
  }, [collegeId, collegeOptions]);

  const reportQuery = useQuery({
    queryKey: ["StudentAdmissionReports", "smsSummary", loadKey],
    queryFn: async () => {
      if (!loadKey) return [] as AnyRow[];
      const [cid, fromYmd, toYmd] = loadKey.split("|");
      return getSmsSummaryReport({
        collegeId: Number(cid),
        fromDate: fromYmd,
        toDate: toYmd,
      });
    },
    enabled: !!loadKey,
  });

  useEffect(() => {
    if (reportQuery.isError) {
      toastError(getErrorMessage(reportQuery.error));
    }
  }, [reportQuery.isError, reportQuery.error]);

  useEffect(() => {
    if (!loadKey || reportQuery.isFetching) return;
    if ((reportQuery.data?.length ?? 0) === 0) {
      toastInfo("No SMS records found.");
    }
  }, [loadKey, reportQuery.isFetching, reportQuery.data]);

  const tableRows = useMemo<SmsRow[]>(() => {
    const raw = reportQuery.data ?? [];
    return raw.map((row, i) => ({
      ...row,
      __rowKey: `${i}-${String(row.Message_SentDate ?? "")}-${String(row.SMS_Type ?? "")}`,
      id: i + 1,
      Message_SentDate: formatDateCell(row.Message_SentDate),
      SMS_Type: String(row.SMS_Type ?? ""),
      Success_Messages: String(row.Success_Messages ?? ""),
      Failure_Messages: String(row.Failure_Messages ?? ""),
    }));
  }, [reportQuery.data]);

  const columnDefs = useMemo<ColDef<SmsRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.messageDate,
      COL_DEFS.smsType,
      COL_DEFS.success,
      COL_DEFS.failure,
    ],
    [],
  );

  const handleGetList = () => {
    const cid = Number(collegeId ?? 0);
    if (!cid) {
      toastInfo("College is required");
      return;
    }
    if (!fromDate || !toDate) {
      toastInfo("From Date and To Date are required");
      return;
    }
    const fromYmd = format(fromDate, "yyyy-MM-dd");
    const toYmd = format(toDate, "yyyy-MM-dd");
    const clg = collegeOptions.find((o) => o.value === collegeId);
    setDataDetails(
      `${clg?.label ?? ""} ( ${fromYmd} To ${toYmd} )`,
    );
    setLoadKey(`${cid}|${fromYmd}|${toYmd}`);
  };

  const handlePrint = () => {
    if (tableRows.length === 0) {
      toastInfo("No records to print.");
      return;
    }
    printHtmlInIframe(`<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Daily SMS Details Report</title>
<style>
body{font-family:Arial,sans-serif;padding:16px;color:#111}
table{width:100%;border-collapse:collapse;font-size:11px}
th,td{border:1px solid #333;padding:3px 5px}
th{background:#e8f0fe}
</style></head><body>
<p style="font-weight:600">Daily SMS Details Report${dataDetails ? ` — ${escapeHtml(dataDetails)}` : ""}</p>
${buildHtmlTable(PRINT_COLUMNS, tableRows)}
</body></html>`);
  };

  const goBack = () => {
    router.push(resolveReportCatalogHref(searchParams.get("path")));
  };

  const resultsVisible =
    loadKey != null && !reportQuery.isFetching && tableRows.length > 0;

  const pageTitle = resultsVisible
    ? `Daily SMS Details Report For : ${dataDetails}`
    : "Daily SMS Details Report";

  return (
    <FilteredListPage<SmsRow>
      title={pageTitle}
      filters={
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-full min-w-[10rem] sm:w-[14rem]">
            <Select
              label="College"
              required
              value={collegeId}
              onChange={(v) => {
                setCollegeId(v);
                clearResults();
              }}
              options={collegeOptions}
              placeholder="College"
              isLoading={filtersQuery.isLoading}
            />
          </div>
          <div className="w-full min-w-[10rem] sm:w-[12rem]">
            <DatePicker
              label="From Date"
              value={fromDate}
              onChange={(d) => {
                setFromDate(d);
                clearResults();
              }}
              displayFormat="dd/MM/yyyy"
              maxDate={toDate ?? new Date()}
            />
          </div>
          <div className="w-full min-w-[10rem] sm:w-[12rem]">
            <DatePicker
              label="To Date"
              value={toDate}
              onChange={(d) => {
                setToDate(d);
                clearResults();
              }}
              displayFormat="dd/MM/yyyy"
              maxDate={new Date()}
              minDate={fromDate ?? undefined}
            />
          </div>
          <div className="flex shrink-0 items-center gap-2 pb-0.5">
            <Button
              type="button"
              className="h-9 w-fit px-4"
              disabled={reportQuery.isFetching}
              onClick={handleGetList}
            >
              {reportQuery.isFetching ? "Loading…" : "Get SMS List"}
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
      filtersFooter={
        resultsVisible && dataDetails ? (
          <p className="text-sm font-semibold text-blue-600">{dataDetails}</p>
        ) : null
      }
      rowData={resultsVisible ? tableRows : []}
      columnDefs={columnDefs}
      loading={reportQuery.isFetching}
      resultsVisible={resultsVisible}
      hideEmptyGrid
      pagination
      paginationPageSize={25}
      getRowId={(p) => String(p.data?.__rowKey ?? "")}
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        exportExcel: true,
        exportPdf: true,
        columnPicker: false,
        excelDocumentTitle: "Daily SMS Details Report",
        excelFileName: "Daily SMS Details Report.xls",
        pdfDocumentTitle: "Daily SMS Details Report",
      }}
      toolbarTrailing={
        resultsVisible ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="app-data-table-toolbar-btn h-9 px-3 text-[12px]"
            onClick={handlePrint}
          >
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Print Report
          </Button>
        ) : null
      }
    />
  );
}
