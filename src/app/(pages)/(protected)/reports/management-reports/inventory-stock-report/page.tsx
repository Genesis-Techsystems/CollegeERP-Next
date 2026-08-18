"use client";

/**
 * Inventory Stock Report —
 * Angular `reports/management-reports/inventory-stock-report` parity.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColDef } from "ag-grid-community";
import { FileSpreadsheet, Printer } from "lucide-react";
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
import { rowIndexGetter } from "@/lib/utils";
import { toastError, toastInfo } from "@/lib/toast";
import { DEFAULT_COLLEGE_LOGO, useCollegeLogo } from "@/hooks/useCollegeLogo";
import {
  fetchInventoryStockSummary,
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

const PRINT_REPORT_TITLE = "Inventory Stock Report";

type StockRow = {
  collegeName: string;
  districtName: string;
  type: string;
  count: string;
};

const COL_DEFS = {
  siNo: {
    headerName: "S.No.",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<StockRow>,
  collegeName: {
    field: "collegeName",
    headerName: "College Code",
    minWidth: 160,
  } as ColDef<StockRow>,
  districtName: {
    field: "districtName",
    headerName: "District Name",
    minWidth: 130,
  } as ColDef<StockRow>,
  type: {
    field: "type",
    headerName: "Type",
    minWidth: 120,
  } as ColDef<StockRow>,
  count: {
    field: "count",
    headerName: "Count",
    minWidth: 100,
  } as ColDef<StockRow>,
};

const EXCEL_COLUMNS = [
  { key: "siNo", header: "S.No." },
  { key: "collegeName", header: "College" },
  { key: "districtName", header: "District" },
  { key: "type", header: "Type" },
  { key: "count", header: "Count" },
];

function mapRow(row: AnyRow): StockRow {
  return {
    collegeName: String(row.college_name ?? row.collegeName ?? ""),
    districtName: String(row.district_name ?? row.districtName ?? ""),
    type: String(row.Type ?? row.type ?? ""),
    count: String(row.Count ?? row.count ?? ""),
  };
}

export default function InventoryStockReportPage() {
  const orgId = Number(
    globalThis?.localStorage?.getItem("organizationId") ?? 0,
  );
  const empId = Number(globalThis?.localStorage?.getItem("employeeId") ?? 0);

  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [rows, setRows] = useState<StockRow[]>([]);
  const [collegeName, setCollegeName] = useState("");
  const [dataDetails, setDataDetails] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [showTable, setShowTable] = useState(false);

  const collegeLogo = useCollegeLogo(collegeId ? Number(collegeId) : null);

  const clearResults = useCallback(() => {
    setRows([]);
    setShowTable(false);
    setDataDetails("");
    setCollegeName("");
  }, []);

  const filtersQuery = useQuery({
    queryKey: QK.managementReports.collegeFilters(orgId, empId),
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

  const columnDefs = useMemo<ColDef<StockRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.collegeName,
      COL_DEFS.districtName,
      COL_DEFS.type,
      COL_DEFS.count,
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

    const row =
      filtersData.find(
        (r) => pickNum(r, ["fk_college_id", "collegeId"]) === cid,
      ) ?? null;
    const nameFromFilter = pickText(row, ["college_name", "collegeName"]);
    let name = nameFromFilter || "College";
    try {
      const full = await getCollegeById(cid);
      if (full?.collegeName) name = String(full.collegeName);
    } catch {
      /* keep fallback */
    }

    setLoadingList(true);
    clearResults();
    setDataDetails(name);
    setCollegeName(name);
    try {
      const raw = await fetchInventoryStockSummary({ collegeId: cid });
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
      ${dataDetails ? `<div style="font-size:14px;font-weight:550;margin-top:4px;">(${escapeHtml(dataDetails)})</div>` : ""}
      <div style="font-size:16px;font-weight:550;margin-top:4px;">${escapeHtml(PRINT_REPORT_TITLE)}</div>
    </div>`;
    exportHtmlTableAsExcel(
      "Inventory Stock Report.xls",
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
        dataDetails: dataDetails ? escapeHtml(`( ${dataDetails} )`) : undefined,
        tableHtml: buildHtmlTable(EXCEL_COLUMNS, exportRows),
      }),
    );
  };

  return (
    <FilteredListPage<StockRow>
      title={
        showTable && dataDetails
          ? `${PRINT_REPORT_TITLE} - (${dataDetails})`
          : PRINT_REPORT_TITLE
      }
      filters={
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-full min-w-[200px] max-w-xs sm:w-auto">
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
          <Button
            type="button"
            className="h-9 w-fit px-4"
            disabled={loadingList}
            onClick={() => void handleGetList()}
          >
            {loadingList ? "Loading…" : "Get List"}
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
        exportExcel: false,
        exportPdf: false,
      }}
      toolbarTrailing={
        showTable ? (
          <>
            <Button
              type="button"
              size="sm"
              className="h-9 rounded-[5px] px-3 text-[12px]"
              onClick={handleExcelExport}
            >
              <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
              Export Excel
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-9 rounded-[5px] px-3 text-[12px]"
              onClick={() => void printReport()}
            >
              <Printer className="mr-1.5 h-3.5 w-3.5" />
              Print Report
            </Button>
          </>
        ) : null
      }
    />
  );
}
