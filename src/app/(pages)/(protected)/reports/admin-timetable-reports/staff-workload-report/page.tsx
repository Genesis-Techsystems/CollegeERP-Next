"use client";

/**
 * Staff Workload Report —
 * Angular `reports/admin-timetable-reports/staffworkload` parity.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { ColDef } from "ag-grid-community";
import { format, isValid, parseISO } from "date-fns";
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
import { resolveOrganizationId } from "@/lib/user-context";
import { toastError, toastInfo } from "@/lib/toast";
import { DEFAULT_COLLEGE_LOGO, useCollegeLogo } from "@/hooks/useCollegeLogo";
import { useLoginEmployeeId } from "@/hooks/useLoginEmployeeId";
import { useSession } from "@/hooks/useSession";
import {
  dedupeBy,
  filterColleges,
  pickNum,
  pickText,
  type FilterRow,
} from "@/app/(pages)/(protected)/accounts-and-fees/fee-masters/_lib/fee-master-filters";
import {
  attendancePrintShell as timetablePrintShell,
  resolveAttendancePrintLogo as resolveTimetablePrintLogo,
  toPrintLogoUrl,
} from "@/app/(pages)/(protected)/reports/admin-attendance-reports/_lib/attendance-report-print";
import {
  getAttendanceCollegeDeptFilters,
  getCollegeById,
  getStaffWorkloadReport,
} from "@/services";

function formatHolidayDate(value: string): string {
  if (!value) return "—";
  const iso = parseISO(value);
  if (isValid(iso)) return format(iso, "dd/MM/yyyy");
  const fallback = new Date(value);
  if (isValid(fallback)) return format(fallback, "dd/MM/yyyy");
  return value;
}

const REPORT_TITLE = "Staff Workload Report";
const ALL0 = { value: "0", label: "All" };

const DEPT_KEYS = ["fk_dept_id", "deptId", "departmentId", "emp_dept_id"];

type WorkloadRow = {
  employee: string;
  totalClasses: number;
  attendanceCapture: number;
  pending: number;
  isTotal?: boolean;
};

type HolidayRow = {
  startDate: string;
  eventName: string;
};

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<WorkloadRow>,
  employee: {
    field: "employee",
    headerName: "Employee",
    minWidth: 200,
  } as ColDef<WorkloadRow>,
  totalClasses: {
    field: "totalClasses",
    headerName: "Total Classes As Per Timetable",
    minWidth: 200,
  } as ColDef<WorkloadRow>,
  attendanceCapture: {
    field: "attendanceCapture",
    headerName: "Attendance Capture Classes",
    minWidth: 200,
  } as ColDef<WorkloadRow>,
  pending: {
    field: "pending",
    headerName: "Pending Classes",
    minWidth: 160,
  } as ColDef<WorkloadRow>,
};

const EXCEL_COLUMNS = [
  { key: "siNo", header: "SI.No" },
  { key: "employee", header: "Employee" },
  { key: "totalClasses", header: "Total Classes As Per Timetable" },
  { key: "attendanceCapture", header: "Attendance Capture Classes" },
  { key: "pending", header: "Pending Classes" },
];

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function mapWorkloadRow(row: Record<string, unknown>): WorkloadRow {
  const employeeName = String(row.Employee_Name ?? row.employee_Name ?? "");
  return {
    employee: employeeName,
    totalClasses: num(row.TOTALCLASSES_AS_PER_TIMETABLE),
    attendanceCapture: num(row.Attendance_Capture_CLASSES),
    pending: num(row.PENDING_CLASSES),
  };
}

export default function StaffWorkloadReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: sessionLoading } = useSession();
  const { employeeId: loginEmployeeId } = useLoginEmployeeId(
    user,
    sessionLoading,
  );

  const orgId = resolveOrganizationId(user);
  const empId = loginEmployeeId;

  const [collegeId, setCollegeId] = useState("");
  const [departmentId, setDepartmentId] = useState("0");
  const [fromDate, setFromDate] = useState<Date | null>(() => new Date());
  const [toDate, setToDate] = useState<Date | null>(() => new Date());

  const [rows, setRows] = useState<WorkloadRow[]>([]);
  const [holidays, setHolidays] = useState<HolidayRow[]>([]);
  const [dataDetails, setDataDetails] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [showTable, setShowTable] = useState(false);

  const collegeLogo = useCollegeLogo(collegeId ? Number(collegeId) : null);

  const clearResults = useCallback(() => {
    setRows([]);
    setHolidays([]);
    setShowTable(false);
    setDataDetails("");
    setCollegeName("");
  }, []);

  const filtersQuery = useQuery({
    queryKey: QK.attendanceReports.collegeDeptFilters(orgId, empId),
    queryFn: () => getAttendanceCollegeDeptFilters(orgId, empId),
    enabled: orgId > 0 && empId > 0,
  });

  const filtersData = useMemo(
    () => (filtersQuery.data?.filtersData ?? []) as FilterRow[],
    [filtersQuery.data?.filtersData],
  );

  const departmentData = useMemo(() => {
    const fromDept = (filtersQuery.data?.departmentData ?? []) as FilterRow[];
    if (fromDept.length > 0) return fromDept;
    return filtersData.filter(
      (r) =>
        pickNum(r, DEPT_KEYS) > 0 &&
        pickText(r, ["dept_code", "deptCode", "dept_name", "department_name"]),
    );
  }, [filtersQuery.data?.departmentData, filtersData]);

  const colleges = useMemo(
    () =>
      filterColleges(filtersData).sort(
        (a, b) =>
          pickNum(a, ["clg_sort_order"]) - pickNum(b, ["clg_sort_order"]),
      ),
    [filtersData],
  );

  const collegeOptions = useMemo(
    () =>
      colleges.map((r) => ({
        value: String(pickNum(r, ["fk_college_id", "collegeId"])),
        label: pickText(r, ["college_code", "collegeCode"]) || "—",
      })),
    [colleges],
  );

  const departmentOptions = useMemo(() => {
    const cid = Number(collegeId || 0);
    const rows = dedupeBy(
      departmentData.filter((r) => {
        const rowClg = pickNum(r, ["fk_college_id", "collegeId"]);
        return !cid || rowClg === 0 || rowClg === cid;
      }),
      (r) => pickNum(r, DEPT_KEYS),
    ).map((r) => ({
      value: String(pickNum(r, DEPT_KEYS)),
      label:
        pickText(r, ["dept_code", "deptCode", "dept_name", "deptName"]) || "—",
    }));
    return [ALL0, ...rows];
  }, [collegeId, departmentData]);

  useEffect(() => {
    if (!colleges.length) return;
    if (
      !colleges.some(
        (r) => String(pickNum(r, ["fk_college_id", "collegeId"])) === collegeId,
      )
    ) {
      setCollegeId(
        String(pickNum(colleges[0], ["fk_college_id", "collegeId"])),
      );
    }
  }, [colleges, collegeId]);

  const columnDefs = useMemo<ColDef<WorkloadRow>[]>(
    () => [
      {
        ...COL_DEFS.siNo,
        valueGetter: (p) => (p.data?.isTotal ? "" : rowIndexGetter(p)),
      },
      {
        ...COL_DEFS.employee,
        cellStyle: (p) =>
          p.data?.isTotal ? { textAlign: "right", fontWeight: 600 } : undefined,
      },
      COL_DEFS.totalClasses,
      COL_DEFS.attendanceCapture,
      COL_DEFS.pending,
    ],
    [],
  );

  const exportRows = useMemo(
    () =>
      rows.map((row, i) => ({
        siNo: row.isTotal ? "" : i + 1,
        employee: row.employee,
        totalClasses: row.totalClasses,
        attendanceCapture: row.attendanceCapture,
        pending: row.pending,
      })),
    [rows],
  );

  const handleGetList = async () => {
    const cid = Number(collegeId || 0);
    const did = Number(departmentId || 0);
    if (!cid) {
      toastInfo("College is required");
      return;
    }
    if (!fromDate || !toDate) {
      toastInfo("From Date and To Date are required");
      return;
    }

    const college = colleges.find(
      (r) => String(pickNum(r, ["fk_college_id", "collegeId"])) === collegeId,
    );
    const dept = departmentData.find(
      (r) => String(pickNum(r, DEPT_KEYS)) === departmentId,
    );
    const deptLabel =
      did === 0 ? ALL0.label : pickText(dept, ["dept_code", "deptCode"]);
    const details = [
      pickText(college, ["college_code", "collegeCode"]),
      deptLabel,
    ]
      .filter(Boolean)
      .join(" / ");

    setLoadingList(true);
    clearResults();
    setDataDetails(details);
    try {
      const [result, collegeFull] = await Promise.all([
        getStaffWorkloadReport({
          departmentId: did,
          fromDate: format(fromDate, "yyyy-MM-dd"),
          toDate: format(toDate, "yyyy-MM-dd"),
        }),
        getCollegeById(cid).catch(() => null),
      ]);
      setCollegeName(
        String(
          collegeFull?.collegeName ??
            pickText(college, ["college_name", "collegeName"]) ??
            "",
        ),
      );

      if (result.rows.length === 0) {
        toastInfo("No records found.");
        return;
      }

      const mapped = result.rows.map((r) => mapWorkloadRow(r));
      const totals = mapped.reduce(
        (acc, r) => ({
          totalClasses: acc.totalClasses + r.totalClasses,
          attendanceCapture: acc.attendanceCapture + r.attendanceCapture,
          pending: acc.pending + r.pending,
        }),
        { totalClasses: 0, attendanceCapture: 0, pending: 0 },
      );

      setRows([
        ...mapped,
        {
          employee: "Total",
          ...totals,
          isTotal: true,
        },
      ]);
      setHolidays(
        result.holidays.map((h) => ({
          startDate: String(h.start_date ?? h.startDate ?? ""),
          eventName: String(h.event_name ?? h.eventName ?? ""),
        })),
      );
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
      <div style="font-size:16px;font-weight:550;">${escapeHtml(REPORT_TITLE)}${dataDetails ? ` - (${escapeHtml(dataDetails)})` : ""}</div>
    </div>`;
    exportHtmlTableAsExcel(
      `${REPORT_TITLE}.xls`,
      buildHtmlTable(EXCEL_COLUMNS, exportRows),
      headerHtml,
    );
  };

  const printReport = async () => {
    if (exportRows.length === 0) {
      toastInfo("No records to print.");
      return;
    }
    const cid = Number(collegeId || 0);
    const logoSrc = await resolveTimetablePrintLogo(
      null,
      cid,
      collegeLogo || DEFAULT_COLLEGE_LOGO,
    );
    const fallbackLogo = toPrintLogoUrl(DEFAULT_COLLEGE_LOGO);
    printHtmlInIframe(
      timetablePrintShell({
        title: escapeHtml(REPORT_TITLE),
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
    <FilteredListPage<WorkloadRow>
      title={
        showTable && dataDetails
          ? `${REPORT_TITLE} - (${dataDetails})`
          : REPORT_TITLE
      }
      filters={
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[7.5rem] flex-1 basis-[7.5rem] sm:min-w-[8.5rem]">
            <Select
              label="College"
              required
              value={collegeId || null}
              onChange={(v) => {
                setCollegeId(v ?? "");
                setDepartmentId("0");
                clearResults();
              }}
              options={collegeOptions}
              placeholder="College"
              isLoading={filtersQuery.isLoading}
            />
          </div>
          <div className="min-w-[7.5rem] flex-1 basis-[7.5rem] sm:min-w-[8.5rem]">
            <Select
              label="Department"
              value={departmentId || null}
              onChange={(v) => {
                setDepartmentId(v ?? "0");
                clearResults();
              }}
              options={departmentOptions}
              placeholder="Department"
              disabled={!collegeId}
              isLoading={filtersQuery.isLoading}
            />
          </div>
          <div className="min-w-[8.5rem] flex-1 basis-[8.5rem] sm:min-w-[9.5rem]">
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
          </div>
          <div className="min-w-[8.5rem] flex-1 basis-[8.5rem] sm:min-w-[9.5rem]">
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
            className="h-9 rounded-[5px] px-4"
            disabled={loadingList}
            onClick={() => void handleGetList()}
          >
            {loadingList ? "Loading…" : "Get Staff Workload"}
          </Button>
          <Button
            type="button"
            className="h-9 min-w-20 !rounded-[5px] !border-0 !bg-[#ffcf46] px-4 !text-black shadow-sm hover:!bg-[#e5b535]"
            onClick={goBack}
          >
            Back
          </Button>
        </div>
      }
      showTable={showTable}
      rowData={showTable ? rows : []}
      columnDefs={columnDefs}
      loading={loadingList}
      resultsVisible={showTable}
      hideEmptyGrid
      pagination
      fitColumnsToWidth={false}
      paginationPageSize={25}
      getRowId={(p) =>
        p.data?.isTotal ? "__total__" : String(p.data?.employee ?? "")
      }
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
      rightRail={
        showTable ? (
          <div className="overflow-hidden rounded border border-[#c3d9ff] bg-card">
            <h3 className="bg-[#ecf3ff] px-3 py-2 text-left text-[14px] font-medium text-slate-700">
              Holidays List
            </h3>
            <div className="max-h-[420px] overflow-auto p-3 text-[13px]">
              {holidays.length === 0 ? (
                <p className="text-[#A86326]">No holidays are found.</p>
              ) : (
                <ul className="space-y-2">
                  {holidays.map((h, i) => (
                    <li
                      key={`${h.startDate}-${h.eventName}-${i}`}
                      className="border-b border-border/50 pb-2 last:border-b-0 last:pb-0"
                    >
                      <div className="font-medium text-slate-800">
                        {formatHolidayDate(h.startDate)}
                      </div>
                      <div className="text-slate-600">{h.eventName || "—"}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : undefined
      }
    />
  );
}
