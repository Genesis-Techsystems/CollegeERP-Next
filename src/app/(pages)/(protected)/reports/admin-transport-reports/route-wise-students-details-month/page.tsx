"use client";

/**
 * Route-Wise Students Details By Month —
 * Angular `reports/admin-transport-reports/route-wise-students-details-month` parity.
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
  getAllocateStudentSubjectFilters,
  getCollegeById,
  getRouteWiseStudentsByMonthReport,
  listRouteStopsByRoute,
  listRoutes,
} from "@/services";
import {
  attendancePrintShell as transportPrintShell,
  resolveAttendancePrintLogo as resolveTransportPrintLogo,
  toPrintLogoUrl,
} from "@/app/(pages)/(protected)/reports/admin-attendance-reports/_lib/attendance-report-print";
import {
  dedupeBy,
  filterColleges,
  pickNum,
  pickText,
  type FilterRow,
} from "@/app/(pages)/(protected)/accounts-and-fees/fee-masters/_lib/fee-master-filters";
import type { AnyRow } from "@/app/(pages)/(protected)/reports/admin-library-reports/_lib/library-report-columns";

const PRINT_REPORT_TITLE = "Route-Wise Students Details By Month";

type RouteWiseRow = {
  academicDetails: string;
  rollNumber: string;
  studentName: string;
  routeCode: string;
  stopName: string;
};

const COL_DEFS = {
  siNo: {
    headerName: "S.No.",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<RouteWiseRow>,
  academicDetails: {
    field: "academicDetails",
    headerName: "Academic Details",
    minWidth: 180,
  } as ColDef<RouteWiseRow>,
  rollNumber: {
    field: "rollNumber",
    headerName: "Roll Number",
    minWidth: 120,
  } as ColDef<RouteWiseRow>,
  studentName: {
    field: "studentName",
    headerName: "Student Name",
    minWidth: 160,
  } as ColDef<RouteWiseRow>,
  routeCode: {
    field: "routeCode",
    headerName: "Route Code",
    minWidth: 120,
  } as ColDef<RouteWiseRow>,
  stopName: {
    field: "stopName",
    headerName: "Stop Name",
    minWidth: 140,
  } as ColDef<RouteWiseRow>,
};

const EXCEL_COLUMNS = [
  { key: "siNo", header: "S.No." },
  { key: "academicDetails", header: "Academic Details" },
  { key: "rollNumber", header: "Roll Number" },
  { key: "studentName", header: "Student Name" },
  { key: "routeCode", header: "Route Code" },
  { key: "stopName", header: "Stop Name" },
];

function mapRow(row: AnyRow): RouteWiseRow {
  return {
    academicDetails: String(row.academic_details ?? row.academicDetails ?? ""),
    rollNumber: String(row.roll_number ?? row.rollNumber ?? ""),
    studentName: String(row.student_name ?? row.studentName ?? ""),
    routeCode: String(row.route_code ?? row.routeCode ?? ""),
    stopName: String(row.stop_name ?? row.stopName ?? ""),
  };
}

export default function RouteWiseStudentsDetailsByMonthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const orgId = Number(
    globalThis?.localStorage?.getItem("organizationId") ?? 0,
  );
  const empId = Number(globalThis?.localStorage?.getItem("employeeId") ?? 0);

  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [academicYearId, setAcademicYearId] = useState<string>("0");
  const [routeId, setRouteId] = useState<string>("0");
  const [routeStopId, setRouteStopId] = useState<string>("0");

  const [rows, setRows] = useState<RouteWiseRow[]>([]);
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
    queryKey: QK.transportReports.collegeFilters(orgId, empId),
    queryFn: () => getAllocateStudentSubjectFilters(orgId, empId),
    enabled: orgId > 0 && empId > 0,
  });

  const filtersData = useMemo(
    () => (filtersQuery.data?.filtersData ?? []) as FilterRow[],
    [filtersQuery.data?.filtersData],
  );
  const academicYearData = useMemo(
    () => (filtersQuery.data?.academicYearData ?? []) as FilterRow[],
    [filtersQuery.data?.academicYearData],
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

  const selectedCollegeRow = useMemo(
    () =>
      filtersData.find(
        (r) =>
          String(pickNum(r, ["fk_college_id", "collegeId"])) ===
          String(collegeId ?? ""),
      ) ?? null,
    [filtersData, collegeId],
  );

  const ayOptions = useMemo(() => {
    const uniId = pickNum(selectedCollegeRow, [
      "fk_university_id",
      "universityId",
    ]);
    const source = uniId
      ? academicYearData.filter(
          (r) => pickNum(r, ["fk_university_id", "universityId"]) === uniId,
        )
      : academicYearData;
    return dedupeBy(source, (r) =>
      pickNum(r, ["fk_academic_year_id", "academicYearId"]),
    )
      .sort(
        (a, b) =>
          Number.parseInt(pickText(b, ["academic_year", "academicYear"]), 10) -
          Number.parseInt(pickText(a, ["academic_year", "academicYear"]), 10),
      )
      .map((r) => ({
        value: String(pickNum(r, ["fk_academic_year_id", "academicYearId"])),
        label: pickText(r, ["academic_year", "academicYear"]) || "—",
      }));
  }, [academicYearData, selectedCollegeRow]);

  const routesQuery = useQuery({
    queryKey: QK.transportReports.routes(),
    queryFn: async () => {
      const list = await listRoutes();
      return list.filter((r) => r.isActive !== false);
    },
    enabled: Number(academicYearId || 0) > 0,
  });

  const routeOptions = useMemo(
    () => [
      { value: "0", label: "All" },
      ...(routesQuery.data ?? []).map((r) => ({
        value: String(r.routeId),
        label: String(r.routeCode ?? r.routeId),
      })),
    ],
    [routesQuery.data],
  );

  const stopsQuery = useQuery({
    queryKey: QK.transportReports.routeStops(Number(routeId || 0)),
    queryFn: () => listRouteStopsByRoute(Number(routeId)),
    enabled: Number(routeId || 0) > 0,
  });

  const stopOptions = useMemo(
    () => [
      { value: "0", label: "All" },
      ...(stopsQuery.data ?? []).map((s) => ({
        value: String(s.routeStopId),
        label: String(s.stopName ?? s.routeStopId),
      })),
    ],
    [stopsQuery.data],
  );

  useEffect(() => {
    if (collegeId || collegeOptions.length === 0) return;
    setCollegeId(collegeOptions[0]!.value);
  }, [collegeId, collegeOptions]);

  useEffect(() => {
    if (!collegeId) return;
    if (ayOptions.length === 0) {
      setAcademicYearId("0");
      return;
    }
    const stillValid = ayOptions.some((o) => o.value === academicYearId);
    if (!stillValid) {
      const current = academicYearData.find(
        (r) =>
          pickNum(r, ["fk_university_id", "universityId"]) ===
            pickNum(selectedCollegeRow, ["fk_university_id", "universityId"]) &&
          Number(r.is_curr_ay ?? r.isCurrAy ?? 0) > 0,
      );
      const preferred = current
        ? String(pickNum(current, ["fk_academic_year_id", "academicYearId"]))
        : ayOptions[0]!.value;
      setAcademicYearId(preferred);
    }
  }, [collegeId, ayOptions]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setRouteId("0");
    setRouteStopId("0");
  }, [academicYearId]);

  useEffect(() => {
    setRouteStopId("0");
  }, [routeId]);

  const columnDefs = useMemo<ColDef<RouteWiseRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.academicDetails,
      COL_DEFS.rollNumber,
      COL_DEFS.studentName,
      COL_DEFS.routeCode,
      COL_DEFS.stopName,
    ],
    [],
  );

  const exportRows = useMemo(
    () => rows.map((row, i) => ({ siNo: i + 1, ...row })),
    [rows],
  );

  const handleGetList = async () => {
    const cid = Number(collegeId ?? 0);
    const ay = Number(academicYearId || 0);
    if (!cid || !ay) {
      toastInfo("College and Academic Year are required");
      return;
    }

    const collegeCode =
      collegeOptions.find((o) => o.value === String(cid))?.label ?? "";
    const ayLabel = ayOptions.find((o) => o.value === String(ay))?.label ?? "";
    let details = `${collegeCode}/${ayLabel}`;
    if (Number(routeId || 0) > 0) {
      const routeLabel =
        routeOptions.find((o) => o.value === routeId)?.label ?? "";
      if (routeLabel) details += ` / ${routeLabel}`;
    }
    if (Number(routeStopId || 0) > 0) {
      const stopLabel =
        stopOptions.find((o) => o.value === routeStopId)?.label ?? "";
      if (stopLabel) details += ` / ${stopLabel}`;
    }

    let name = collegeCode || "College";
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
      const raw = await getRouteWiseStudentsByMonthReport({
        collegeId: cid,
        academicYearId: ay,
        routeId: Number(routeId || 0),
        stopId: Number(routeStopId || 0),
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
      "Route Wise Students Details By Month.xls",
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
        dataDetails: dataDetails ? escapeHtml(dataDetails) : undefined,
        tableHtml: buildHtmlTable(EXCEL_COLUMNS, exportRows),
      }),
    );
  };

  const goBack = () => {
    router.push(resolveReportCatalogHref(searchParams.get("path")));
  };

  return (
    <FilteredListPage<RouteWiseRow>
      title={
        showTable && dataDetails
          ? `${PRINT_REPORT_TITLE} ( ${dataDetails} )`
          : PRINT_REPORT_TITLE
      }
      filters={
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Select
              label="College"
              required
              value={collegeId}
              onChange={(v) => {
                setCollegeId(v);
                setAcademicYearId("0");
                setRouteId("0");
                setRouteStopId("0");
                clearResults();
              }}
              options={collegeOptions}
              placeholder="College"
              isLoading={filtersQuery.isLoading}
            />
            <Select
              label="Academic Year"
              required
              value={academicYearId === "0" ? null : academicYearId}
              onChange={(v) => {
                setAcademicYearId(v ?? "0");
                clearResults();
              }}
              options={ayOptions}
              placeholder="Academic Year"
              disabled={!collegeId}
            />
            <Select
              label="Route"
              required
              value={routeId}
              onChange={(v) => {
                setRouteId(v ?? "0");
                clearResults();
              }}
              options={routeOptions}
              placeholder="Route"
              disabled={!Number(academicYearId || 0)}
              isLoading={routesQuery.isLoading}
            />
            <Select
              label="Route Stops"
              required
              value={routeStopId}
              onChange={(v) => {
                setRouteStopId(v ?? "0");
                clearResults();
              }}
              options={stopOptions}
              placeholder="Route Stops"
              disabled={!Number(academicYearId || 0)}
              isLoading={stopsQuery.isLoading}
            />
          </div>
          <div className="flex flex-wrap items-end gap-3">
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
