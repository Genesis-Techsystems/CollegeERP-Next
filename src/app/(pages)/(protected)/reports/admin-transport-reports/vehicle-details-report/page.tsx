"use client";

/**
 * Vehicle Details Report —
 * Angular `reports/admin-transport-reports/vehicle-details-report` parity.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { resolveReportCatalogHref } from "@/lib/report-catalog";
import { rowIndexGetter } from "@/lib/utils";
import { toastError, toastInfo } from "@/lib/toast";
import { DEFAULT_COLLEGE_LOGO, useCollegeLogo } from "@/hooks/useCollegeLogo";
import {
  getCollegeById,
  getVehicleDetailsReport,
  listActiveCollegesForDepartments,
} from "@/services";
import {
  attendancePrintShell as transportPrintShell,
  resolveAttendancePrintLogo as resolveTransportPrintLogo,
  toPrintLogoUrl,
} from "@/app/(pages)/(protected)/reports/admin-attendance-reports/_lib/attendance-report-print";
import type { AnyRow } from "@/app/(pages)/(protected)/reports/admin-library-reports/_lib/library-report-columns";

const PRINT_REPORT_TITLE = "Vehicle Details Report";

type VehicleRow = {
  vehicleNumber: string;
  vehicleType: string;
  rcNumber: string;
  noOfSeats: string;
};

const COL_DEFS = {
  siNo: {
    headerName: "S.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<VehicleRow>,
  vehicleNumber: {
    field: "vehicleNumber",
    headerName: "Vehicle Number",
    minWidth: 140,
  } as ColDef<VehicleRow>,
  vehicleType: {
    field: "vehicleType",
    headerName: "Vehicle",
    minWidth: 120,
  } as ColDef<VehicleRow>,
  rcNumber: {
    field: "rcNumber",
    headerName: "RC Number",
    minWidth: 120,
  } as ColDef<VehicleRow>,
  noOfSeats: {
    field: "noOfSeats",
    headerName: "No Of Seats",
    minWidth: 110,
  } as ColDef<VehicleRow>,
};

const EXCEL_COLUMNS = [
  { key: "siNo", header: "S.No" },
  { key: "vehicleNumber", header: "Vehicle Number" },
  { key: "vehicleType", header: "Vehicle" },
  { key: "rcNumber", header: "RC Number" },
  { key: "noOfSeats", header: "No Of Seats" },
];

function mapRow(row: AnyRow): VehicleRow {
  return {
    vehicleNumber: String(row.vehicle_number ?? row.vehicleNumber ?? ""),
    vehicleType: String(
      row.Vehicle_type ?? row.vehicle_type ?? row.Vehicle ?? "",
    ),
    rcNumber: String(row.rc_number ?? row.rcNumber ?? ""),
    noOfSeats: String(row.no_of_seats ?? row.noOfSeats ?? ""),
  };
}

export default function VehicleDetailsReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [rows, setRows] = useState<VehicleRow[]>([]);
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

  const collegesQuery = useQuery({
    queryKey: QK.transportReports.colleges(),
    queryFn: () => listActiveCollegesForDepartments(),
  });

  const collegeOptions = useMemo(
    () =>
      (collegesQuery.data ?? []).map((c) => ({
        value: String(c.collegeId),
        label: String(c.collegeCode ?? c.collegeName ?? c.collegeId),
      })),
    [collegesQuery.data],
  );

  useEffect(() => {
    if (collegeId || collegeOptions.length === 0) return;
    setCollegeId(collegeOptions[0]!.value);
  }, [collegeId, collegeOptions]);

  const columnDefs = useMemo<ColDef<VehicleRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.vehicleNumber,
      COL_DEFS.vehicleType,
      COL_DEFS.rcNumber,
      COL_DEFS.noOfSeats,
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

    const college = (collegesQuery.data ?? []).find(
      (c) => String(c.collegeId) === String(cid),
    );
    const code = String(college?.collegeCode ?? "");
    let name = String(college?.collegeName ?? (code || "College"));
    try {
      const full = await getCollegeById(cid);
      if (full?.collegeName) name = String(full.collegeName);
    } catch {
      /* keep fallback */
    }

    setLoadingList(true);
    clearResults();
    setDataDetails(code);
    setCollegeName(name);
    try {
      const raw = await getVehicleDetailsReport(cid);
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
      "Vehicle Details Report.xls",
      buildHtmlTable(EXCEL_COLUMNS, exportRows),
      headerHtml,
    );
  };

  const printReport = async () => {
    if (exportRows.length === 0) {
      toastInfo("No records to print.");
      return;
    }
    const logoSrc = await resolveTransportPrintLogo(
      null,
      Number(collegeId ?? 0),
      collegeLogo || DEFAULT_COLLEGE_LOGO,
    );
    const fallbackLogo = toPrintLogoUrl(DEFAULT_COLLEGE_LOGO);
    printHtmlInIframe(
      transportPrintShell({
        title: escapeHtml(PRINT_REPORT_TITLE),
        logoSrc: escapeHtml(logoSrc),
        fallbackLogo: escapeHtml(fallbackLogo),
        collegeName: escapeHtml(collegeName || "College"),
        dataDetails: dataDetails ? escapeHtml(`( ${dataDetails} )`) : undefined,
        tableHtml: buildHtmlTable(EXCEL_COLUMNS, exportRows),
      }),
    );
  };

  const goBack = () => {
    router.push(resolveReportCatalogHref(searchParams.get("path")));
  };

  return (
    <FilteredListPage<VehicleRow>
      title={PRINT_REPORT_TITLE}
      tableTitle={
        showTable && dataDetails
          ? `${PRINT_REPORT_TITLE} (${dataDetails})`
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
              isLoading={collegesQuery.isLoading}
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
            variant="secondary"
            className="h-9 w-fit border-[#e0a800] !bg-[#ffc107] px-4 !text-[#212529] hover:!bg-[#e0a800]"
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
