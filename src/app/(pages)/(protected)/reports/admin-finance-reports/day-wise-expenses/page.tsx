"use client";

/**
 * Day-Wise Expenses Report —
 * Angular `accounts-and-fees/fee-reports/day-wise-expenses` parity
 * (Finance Reports menu in React).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { ColDef } from "ag-grid-community";
import { format, isValid, parseISO } from "date-fns";
import { Printer } from "lucide-react";
import { DatePicker } from "@/common/components/date-picker";
import { Select } from "@/common/components/select";
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
import { resolveReportCatalogHref } from "@/lib/report-catalog";
import { rowIndexGetter } from "@/lib/utils";
import { toastError, toastInfo } from "@/lib/toast";
import { DEFAULT_COLLEGE_LOGO, useCollegeLogo } from "@/hooks/useCollegeLogo";
import {
  fetchDayWiseExpenseReport,
  getAllocateStudentSubjectFilters,
  getCollegeById,
} from "@/services";
import {
  attendancePrintShell as reportPrintShell,
  resolveAttendancePrintLogo as resolveReportPrintLogo,
  toPrintLogoUrl,
} from "@/app/(pages)/(protected)/reports/admin-attendance-reports/_lib/attendance-report-print";
import {
  filterColleges,
  pickNum,
  pickText,
  type FilterRow,
} from "@/app/(pages)/(protected)/accounts-and-fees/fee-masters/_lib/fee-master-filters";
import type { AnyRow } from "@/app/(pages)/(protected)/reports/admin-library-reports/_lib/library-report-columns";

const PRINT_REPORT_TITLE = "Day-Wise Expenses Report";

type ExpenseRow = {
  transactionDate: string;
  collegeShortname: string;
  category: string;
  totalExpense: string;
};

const COL_DEFS = {
  siNo: {
    headerName: "S.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<ExpenseRow>,
  transactionDate: {
    field: "transactionDate",
    headerName: "Transaction Date",
    minWidth: 140,
  } as ColDef<ExpenseRow>,
  collegeShortname: {
    field: "collegeShortname",
    headerName: "College",
    minWidth: 120,
  } as ColDef<ExpenseRow>,
  category: {
    field: "category",
    headerName: "Category",
    minWidth: 140,
  } as ColDef<ExpenseRow>,
  totalExpense: {
    field: "totalExpense",
    headerName: "Total Expense",
    minWidth: 120,
  } as ColDef<ExpenseRow>,
};

const EXCEL_COLUMNS = [
  { key: "siNo", header: "S.No" },
  { key: "transactionDate", header: "Transaction Date" },
  { key: "collegeShortname", header: "College" },
  { key: "category", header: "Category" },
  { key: "totalExpense", header: "Total Expense" },
];

function formatTxnDate(v: unknown): string {
  if (v == null || String(v).trim() === "") return "";
  const raw = String(v);
  const d = raw.includes("T") ? parseISO(raw) : new Date(raw);
  if (!isValid(d)) return raw;
  return format(d, "MMM d, yyyy");
}

function mapRow(row: AnyRow): ExpenseRow {
  return {
    transactionDate: formatTxnDate(row.transaction_date ?? row.transactionDate),
    collegeShortname: String(
      row.college_shortname ?? row.collegeShortname ?? "",
    ),
    category: String(row.Category ?? row.category ?? ""),
    totalExpense: String(row.TotalExpense ?? row.totalExpense ?? ""),
  };
}

export default function DayWiseExpensesReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const orgId = Number(
    globalThis?.localStorage?.getItem("organizationId") ?? 0,
  );
  const empId = Number(globalThis?.localStorage?.getItem("employeeId") ?? 0);

  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);

  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [collegeName, setCollegeName] = useState("");
  const [dataDetails, setDataDetails] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [showTable, setShowTable] = useState(false);

  const collegeLogo = useCollegeLogo(collegeId ? Number(collegeId) : null);

  useEffect(() => {
    const today = new Date();
    setFromDate((p) => p ?? today);
    setToDate((p) => p ?? today);
  }, []);

  const clearResults = useCallback(() => {
    setRows([]);
    setShowTable(false);
    setDataDetails("");
    setCollegeName("");
  }, []);

  const filtersQuery = useQuery({
    queryKey: QK.financeReports.collegeFilters(orgId, empId),
    queryFn: () => getAllocateStudentSubjectFilters(orgId, empId),
    enabled: orgId > 0 && empId > 0,
  });

  const filtersData = useMemo(
    () => (filtersQuery.data?.filtersData ?? []) as FilterRow[],
    [filtersQuery.data?.filtersData],
  );

  const collegeOptions = useMemo(
    () =>
      filterColleges(filtersData)
        .sort(
          (a, b) =>
            pickNum(a, ["clg_sort_order"]) - pickNum(b, ["clg_sort_order"]),
        )
        .map((r) => ({
          value: String(pickNum(r, ["fk_college_id", "collegeId"])),
          label: pickText(r, ["college_code", "collegeCode"]) || "—",
        })),
    [filtersData],
  );

  useEffect(() => {
    if (collegeId || collegeOptions.length === 0) return;
    setCollegeId(collegeOptions[0]!.value);
  }, [collegeId, collegeOptions]);

  const columnDefs = useMemo<ColDef<ExpenseRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.transactionDate,
      COL_DEFS.collegeShortname,
      COL_DEFS.category,
      COL_DEFS.totalExpense,
    ],
    [],
  );

  const exportRows = useMemo(
    () => rows.map((row, i) => ({ siNo: i + 1, ...row })),
    [rows],
  );

  const handleGetList = async () => {
    const cid = Number(collegeId ?? 0);
    if (!cid) {
      toastInfo("College is required");
      return;
    }
    if (!fromDate || !toDate) {
      toastInfo("From Date and To Date are required");
      return;
    }

    const code =
      collegeOptions.find((o) => o.value === String(cid))?.label ?? "";
    const details = `${code}- ${format(fromDate, "yyyy-MMM-dd")} - ${format(toDate, "yyyy-MMM-dd")}`;

    let name = code || "College";
    try {
      const full = await getCollegeById(cid);
      if (full?.collegeName) name = String(full.collegeName);
    } catch {
      /* keep fallback */
    }

    setLoadingList(true);
    clearResults();
    setDataDetails(details);
    setCollegeName(name);
    try {
      const raw = await fetchDayWiseExpenseReport({
        collegeId: cid,
        fromDate: format(fromDate, "yyyy-MM-dd"),
        toDate: format(toDate, "yyyy-MM-dd"),
      });
      if (raw.length === 0) {
        toastInfo("No records found.");
        return;
      }
      setRows(raw.map(mapRow));
      setShowTable(true);
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setLoadingList(false);
    }
  };

  const handleExcelExport = () => {
    if (exportRows.length === 0) {
      toastInfo("No records to export.");
      return;
    }
    const headerHtml = `<div style="margin-bottom:12px;">
      <div style="font-size:18px;font-weight:600;">${escapeHtml(collegeName || "College")}</div>
      ${dataDetails ? `<div style="font-size:14px;font-weight:550;margin-top:4px;">${escapeHtml(dataDetails)}</div>` : ""}
      <div style="font-size:16px;font-weight:550;margin-top:4px;">${escapeHtml(PRINT_REPORT_TITLE)}</div>
    </div>`;
    exportHtmlTableAsExcel(
      "Day-Wise Expenses Report.xls",
      buildHtmlTable(EXCEL_COLUMNS, exportRows),
      headerHtml,
    );
  };

  const printReport = async () => {
    if (exportRows.length === 0) {
      toastInfo("No records to print.");
      return;
    }
    const logoSrc = await resolveReportPrintLogo(
      null,
      Number(collegeId ?? 0),
      collegeLogo || DEFAULT_COLLEGE_LOGO,
    );
    const fallbackLogo = toPrintLogoUrl(DEFAULT_COLLEGE_LOGO);
    printHtmlInIframe(
      reportPrintShell({
        title: escapeHtml(PRINT_REPORT_TITLE),
        logoSrc: escapeHtml(logoSrc),
        fallbackLogo: escapeHtml(fallbackLogo),
        collegeName: escapeHtml(collegeName || "College"),
        dataDetails: dataDetails ? escapeHtml(dataDetails) : undefined,
        tableHtml: buildHtmlTable(EXCEL_COLUMNS, exportRows),
      }),
    );
  };

  const goBack = () => {
    router.push(resolveReportCatalogHref(searchParams.get("path")));
  };

  return (
    <FilteredListPage<ExpenseRow>
      title={
        showTable && dataDetails
          ? `${PRINT_REPORT_TITLE} ( ${dataDetails} )`
          : PRINT_REPORT_TITLE
      }
      filters={
        <div className="flex flex-wrap items-end gap-3">
          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:w-auto lg:grid-cols-3 lg:min-w-[540px]">
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
            <DatePicker
              label="From Date"
              value={fromDate}
              onChange={(d) => {
                setFromDate(d);
                if (d && toDate && toDate < d) setToDate(d);
                clearResults();
              }}
              displayFormat="dd/MM/yyyy"
              clearable={false}
              placeholder="From Date"
              maxDate={toDate ?? undefined}
            />
            <DatePicker
              label="To Date"
              value={toDate}
              onChange={(d) => {
                setToDate(d);
                clearResults();
              }}
              displayFormat="dd/MM/yyyy"
              clearable={false}
              placeholder="To Date"
              minDate={fromDate ?? undefined}
            />
          </div>
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
            className="h-9 min-w-20 !border-0 !bg-[#ffcf46] px-4 !text-black shadow-sm hover:!bg-[#e5b535]"
            onClick={goBack}
          >
            Back
          </Button>
        </div>
      }
      rowData={showTable ? rows : []}
      columnDefs={columnDefs}
      loading={loadingList}
      resultsVisible={showTable}
      hideEmptyGrid
      pagination
      paginationPageSize={25}
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        exportExcel: true,
        exportPdf: false,
      }}
      onExportExcel={handleExcelExport}
      toolbarTrailing={
        showTable ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 px-3 text-[12px]"
            onClick={() => void printReport()}
          >
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Print Report
          </Button>
        ) : null
      }
    />
  );
}
