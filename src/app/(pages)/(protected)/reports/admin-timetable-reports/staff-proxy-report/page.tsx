"use client";

/**
 * Staff Proxy Report —
 * Angular `reports/admin-timetable-reports/staff-proxy-report` parity.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { format } from "date-fns";
import { FileSpreadsheet, Printer } from "lucide-react";
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
  getCollegeById,
  getStaffProxyReport,
  listActiveCollegesForDepartments,
  listDepartmentsByCollege,
  listEmployeesForStaffProxyReport,
} from "@/services";
import {
  attendancePrintShell as timetablePrintShell,
  resolveAttendancePrintLogo as resolveTimetablePrintLogo,
  toPrintLogoUrl,
} from "@/app/(pages)/(protected)/reports/admin-attendance-reports/_lib/attendance-report-print";

const PRINT_REPORT_TITLE = "Staff Proxy Report";

type AnyRow = Record<string, unknown>;

type ProxyRow = {
  academicDetails: string;
  subjectCode: string;
  subjectName: string;
  subjectType: string;
  proxyEmployee: string;
  proxyDate: string;
  timing: string;
  assignedBy: string;
};

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<ProxyRow>,
  academicDetails: {
    field: "academicDetails",
    headerName: "Academic Details",
    minWidth: 160,
  } as ColDef<ProxyRow>,
  subjectCode: {
    field: "subjectCode",
    headerName: "Subject Code",
    minWidth: 110,
  } as ColDef<ProxyRow>,
  subjectName: {
    field: "subjectName",
    headerName: "Subject",
    minWidth: 180,
  } as ColDef<ProxyRow>,
  proxyEmployee: {
    field: "proxyEmployee",
    headerName: "Proxy Employee",
    minWidth: 160,
  } as ColDef<ProxyRow>,
  proxyDate: {
    field: "proxyDate",
    headerName: "Proxy Date",
    minWidth: 120,
  } as ColDef<ProxyRow>,
  timing: {
    field: "timing",
    headerName: "Timing",
    minWidth: 120,
  } as ColDef<ProxyRow>,
  assignedBy: {
    field: "assignedBy",
    headerName: "Assigned Employee",
    minWidth: 160,
  } as ColDef<ProxyRow>,
};

const EXCEL_COLUMNS = [
  { key: "siNo", header: "SI.No" },
  { key: "academicDetails", header: "Academic Details" },
  { key: "subjectCode", header: "Subject Code" },
  { key: "subjectDisplay", header: "Subject" },
  { key: "proxyEmployee", header: "Proxy Employee" },
  { key: "proxyDate", header: "Proxy Date" },
  { key: "timing", header: "Timing" },
  { key: "assignedBy", header: "Assigned Employee" },
];

function dash(v: unknown): string {
  if (v == null || String(v).trim() === "") return "-";
  return String(v);
}

function formatProxyDate(v: unknown): string {
  if (v == null || String(v).trim() === "") return "-";
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return String(v);
  return format(d, "MMM d, yyyy");
}

function mapProxyRow(row: AnyRow): ProxyRow {
  const start = String(row.StartTime ?? row.startTime ?? "");
  const end = String(row.EndTime ?? row.endTime ?? "");
  return {
    academicDetails: dash(row.AcademicDetails),
    subjectCode: dash(row.subject_code),
    subjectName: dash(row.subject_name),
    subjectType: String(row.SubjectType ?? ""),
    proxyEmployee: dash(row.ProxyEmployee),
    proxyDate: formatProxyDate(row.proxy_date),
    timing: start && end ? `${start} - ${end}` : dash(start || end),
    assignedBy: dash(row.AssignedBy),
  };
}

function subjectRenderer(p: ICellRendererParams<ProxyRow>) {
  const name = p.data?.subjectName ?? "-";
  const type = p.data?.subjectType?.trim();
  if (!type) return name;
  return (
    <span>
      {name} (<span className="font-medium text-blue-600">{type}</span>)
    </span>
  );
}

export default function StaffProxyReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [departmentId, setDepartmentId] = useState<string>("0");
  const [employeeId, setEmployeeId] = useState<string>("0");
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);

  const [rows, setRows] = useState<ProxyRow[]>([]);
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

  const collegesQuery = useQuery({
    queryKey: QK.timetableReports.colleges(),
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

  const departmentsQuery = useQuery({
    queryKey: QK.timetableReports.departments(Number(collegeId ?? 0)),
    queryFn: () => listDepartmentsByCollege(Number(collegeId)),
    enabled: Number(collegeId ?? 0) > 0,
  });

  const departmentOptions = useMemo(
    () =>
      (departmentsQuery.data ?? []).map((d) => ({
        value: String(d.departmentId),
        label: String(d.deptCode ?? d.deptName ?? d.departmentId),
      })),
    [departmentsQuery.data],
  );

  const employeesQuery = useQuery({
    queryKey: QK.timetableReports.employees(
      Number(collegeId ?? 0),
      Number(departmentId || 0),
    ),
    queryFn: () =>
      listEmployeesForStaffProxyReport(Number(collegeId), Number(departmentId)),
    enabled: Number(collegeId ?? 0) > 0 && Number(departmentId || 0) > 0,
  });

  const employeeOptions = useMemo(
    () =>
      (employeesQuery.data ?? [])
        .filter((e) => e.employeeId != null)
        .map((e) => {
          const name = String(e.firstName ?? "");
          const num = String(e.empNumber ?? "");
          return {
            value: String(e.employeeId),
            label: num ? `${name} ( ${num} )` : name || String(e.employeeId),
          };
        }),
    [employeesQuery.data],
  );

  useEffect(() => {
    if (collegeId || collegeOptions.length === 0) return;
    setCollegeId(collegeOptions[0].value);
  }, [collegeId, collegeOptions]);

  useEffect(() => {
    if (!collegeId) return;
    if (departmentOptions.length === 0) {
      setDepartmentId("0");
      setEmployeeId("0");
      return;
    }
    const stillValid = departmentOptions.some((o) => o.value === departmentId);
    if (!stillValid) setDepartmentId(departmentOptions[0].value);
  }, [collegeId, departmentOptions]); // eslint-disable-line react-hooks/exhaustive-deps

  const columnDefs = useMemo<ColDef<ProxyRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.academicDetails,
      COL_DEFS.subjectCode,
      { ...COL_DEFS.subjectName, cellRenderer: subjectRenderer },
      COL_DEFS.proxyEmployee,
      COL_DEFS.proxyDate,
      COL_DEFS.timing,
      COL_DEFS.assignedBy,
    ],
    [],
  );

  const exportRows = useMemo(
    () =>
      rows.map((row, i) => ({
        siNo: i + 1,
        ...row,
        subjectDisplay: row.subjectType
          ? `${row.subjectName} (${row.subjectType})`
          : row.subjectName,
      })),
    [rows],
  );

  const handleGetList = async () => {
    const cid = Number(collegeId ?? 0);
    const did = Number(departmentId || 0);
    if (!cid) {
      toastInfo("College is required");
      return;
    }
    if (!did) {
      toastInfo("Department is required");
      return;
    }
    if (!fromDate || !toDate) {
      toastInfo("From Date and To Date are required");
      return;
    }

    const college = (collegesQuery.data ?? []).find(
      (c) => String(c.collegeId) === String(cid),
    );
    const dept = (departmentsQuery.data ?? []).find(
      (d) => String(d.departmentId) === String(did),
    );
    const code = String(college?.collegeCode ?? "");
    const deptCode = String(dept?.deptCode ?? "");
    const details = [code, deptCode].filter(Boolean).join(" / ");

    let name = String(college?.collegeName ?? (code || "College"));
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
      const raw = await getStaffProxyReport({
        fromDate: format(fromDate, "yyyy-MM-dd"),
        toDate: format(toDate, "yyyy-MM-dd"),
        collegeId: cid,
        employeeId: Number(employeeId || 0),
        departmentId: did,
      });
      if (raw.length === 0) {
        toastInfo("No records found.");
        return;
      }
      setRows(raw.map(mapProxyRow));
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
      "Staff Proxy Report.xls",
      buildHtmlTable(EXCEL_COLUMNS, exportRows),
      headerHtml,
    );
  };

  const printReport = async () => {
    if (exportRows.length === 0) {
      toastInfo("No records to print.");
      return;
    }
    const cid = Number(collegeId ?? 0);
    const logoSrc = await resolveTimetablePrintLogo(
      null,
      cid,
      collegeLogo || DEFAULT_COLLEGE_LOGO,
    );
    const fallbackLogo = toPrintLogoUrl(DEFAULT_COLLEGE_LOGO);
    printHtmlInIframe(
      timetablePrintShell({
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
    <FilteredListPage<ProxyRow>
      title={
        showTable && dataDetails
          ? `${PRINT_REPORT_TITLE} - (${dataDetails})`
          : PRINT_REPORT_TITLE
      }
      filters={
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Select
              label="College"
              required
              value={collegeId}
              onChange={(v) => {
                setCollegeId(v);
                setDepartmentId("0");
                setEmployeeId("0");
                clearResults();
              }}
              options={collegeOptions}
              placeholder="College"
              isLoading={collegesQuery.isLoading}
            />
            <Select
              label="Department"
              required
              value={departmentId === "0" ? null : departmentId}
              onChange={(v) => {
                setDepartmentId(v ?? "0");
                setEmployeeId("0");
                clearResults();
              }}
              options={departmentOptions}
              placeholder="Department"
              disabled={!collegeId}
              isLoading={departmentsQuery.isLoading}
            />
            <Select
              label="Employee"
              value={employeeId === "0" ? null : employeeId}
              onChange={(v) => {
                setEmployeeId(v ?? "0");
                clearResults();
              }}
              options={employeeOptions}
              placeholder="Employee"
              searchable
              clearable
              disabled={!Number(departmentId || 0)}
              isLoading={employeesQuery.isLoading}
            />
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:w-auto lg:grid-cols-2 lg:min-w-[360px]">
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
              {loadingList ? "Loading…" : "Get Staff Proxies"}
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
      showTable={showTable}
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
        columnPicker: true,
      }}
      toolbarTrailing={
        showTable ? (
          <>
            <Button
              type="button"
              size="sm"
              data-table-primary-action
              className="h-9 px-3 text-[12px]"
              onClick={handleExcelExport}
            >
              <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
              Export Excel
            </Button>
            <Button
              type="button"
              size="sm"
              data-table-primary-action
              className="h-9 px-3 text-[12px]"
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
