"use client";

/**
 * Employee Attendance Summary Report —
 * Angular `reports/admin-attendance-reports/employee-attendance-summary-report` parity.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { ColDef } from "ag-grid-community";
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
  dedupeBy,
  filterColleges,
  pickNum,
  pickText,
  type FilterRow,
} from "@/app/(pages)/(protected)/accounts-and-fees/fee-masters/_lib/fee-master-filters";
import {
  getAttendanceCollegeDeptFilters,
  getEmpAttendanceSummaryReport,
} from "@/services";
import {
  attendancePrintShell,
  resolveAttendancePrintLogo,
  toPrintLogoUrl,
} from "../_lib/attendance-report-print";

const PRINT_REPORT_TITLE = "Employee Attendance Summary Report";

type AnyRow = Record<string, unknown>;

type EmpSummaryRow = {
  empNo: string;
  employee: string;
  department: string;
  workingDays: string;
  present: string;
  absent: string;
};

const DEPT_KEYS = ["fk_dept_id", "deptId", "departmentId", "emp_dept_id"];

const EXCEL_COLUMNS: { key: string; header: string }[] = [
  { key: "siNo", header: "SI.No" },
  { key: "empNo", header: "Emp No" },
  { key: "employee", header: "Employee" },
  { key: "department", header: "Department" },
  { key: "workingDays", header: "Working Days" },
  { key: "present", header: "Present" },
  { key: "absent", header: "Absent" },
];

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<EmpSummaryRow>,
  empNo: {
    field: "empNo",
    headerName: "Emp No",
    minWidth: 110,
  } as ColDef<EmpSummaryRow>,
  employee: {
    field: "employee",
    headerName: "Employee",
    minWidth: 160,
  } as ColDef<EmpSummaryRow>,
  department: {
    field: "department",
    headerName: "Department",
    minWidth: 140,
  } as ColDef<EmpSummaryRow>,
  workingDays: {
    field: "workingDays",
    headerName: "Working Days",
    minWidth: 120,
  } as ColDef<EmpSummaryRow>,
  present: {
    field: "present",
    headerName: "Present",
    minWidth: 100,
  } as ColDef<EmpSummaryRow>,
  absent: {
    field: "absent",
    headerName: "Absent",
    minWidth: 100,
  } as ColDef<EmpSummaryRow>,
};

function mapEmpRow(row: AnyRow): EmpSummaryRow {
  return {
    empNo: String(
      row.emp_number ??
        row.Emp_No ??
        row.emp_no ??
        row.empNo ??
        row.EmpNo ??
        "",
    ),

    employee: String(
      row.first_name ??
        row.Employee ??
        row.employee ??
        row.Employee_Name ??
        row.employee_name ??
        "",
    ),

    department: String(
      row.Department ??
        row.department ??
        row.Dept_Name ??
        row.dept_name ??
        row.dept_name ??
        "",
    ),

    workingDays: String(
      row.Working_days ??
        row.Working_Days ??
        row.working_days ??
        row.WorkingDays ??
        "",
    ),
    present: String(row.Present ?? row.present ?? ""),

    absent: String(row.Absent ?? row.absent ?? ""),
  };
}

export default function EmployeeAttendanceSummaryReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const orgId = Number(
    globalThis?.localStorage?.getItem("organizationId") ?? 0,
  );
  const empId = Number(globalThis?.localStorage?.getItem("employeeId") ?? 0);

  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [departmentId, setDepartmentId] = useState<string>("0");
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);

  const [rows, setRows] = useState<AnyRow[]>([]);
  const [dataDetails, setDataDetails] = useState("");
  const [collegeName, setCollegeName] = useState("");
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
    return filtersData.filter((r) => pickNum(r, DEPT_KEYS) > 0);
  }, [filtersQuery.data?.departmentData, filtersData]);

  const collegeOptions = useMemo(
    () =>
      filterColleges(filtersData).map((r) => ({
        value: String(pickNum(r, ["fk_college_id", "collegeId"])),
        label: pickText(r, ["college_code", "collegeCode"]),
      })),
    [filtersData],
  );

  const selectedCollegeRow = useMemo(
    () =>
      filterColleges(filtersData).find(
        (r) =>
          String(pickNum(r, ["fk_college_id", "collegeId"])) ===
          String(collegeId ?? ""),
      ) ?? null,
    [filtersData, collegeId],
  );

  const deptOptions = useMemo(() => {
    const cid = Number(collegeId ?? 0);
    const rows = dedupeBy(
      departmentData.filter((r) => {
        const rowClg = pickNum(r, ["fk_college_id", "collegeId"]);
        return !cid || rowClg === 0 || rowClg === cid;
      }),
      (r) => pickNum(r, DEPT_KEYS),
    );
    return [
      { value: "0", label: "All" },
      ...rows.map((r) => ({
        value: String(pickNum(r, DEPT_KEYS)),
        label:
          pickText(r, [
            "dept_code",
            "deptCode",
            "dept_name",
            "deptName",
            "department_name",
          ]) || String(pickNum(r, DEPT_KEYS)),
      })),
    ];
  }, [departmentData, collegeId]);

  useEffect(() => {
    if (collegeId || collegeOptions.length === 0) return;
    setCollegeId(collegeOptions[0].value);
  }, [collegeId, collegeOptions]);

  useEffect(() => {
    if (!collegeId) {
      setDepartmentId("0");
      return;
    }
    setDepartmentId("0");
  }, [collegeId]);

  const onCollegeChange = (v: string | null) => {
    setCollegeId(v);
    setDepartmentId("0");
    clearResults();
  };

  const displayRows = useMemo(() => rows.map(mapEmpRow), [rows]);

  const exportRows = useMemo(
    () =>
      displayRows.map((row, i) => ({
        siNo: i + 1,
        ...row,
      })),
    [displayRows],
  );

  const columnDefs = useMemo<ColDef<EmpSummaryRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.empNo,
      COL_DEFS.employee,
      COL_DEFS.department,
      COL_DEFS.workingDays,
      COL_DEFS.present,
      COL_DEFS.absent,
    ],
    [],
  );

  const buildDataDetails = () => {
    const collegeCode =
      pickText(selectedCollegeRow, ["college_code", "collegeCode"]) ||
      collegeOptions.find((o) => o.value === collegeId)?.label ||
      "";
    const deptCode =
      deptOptions.find((o) => o.value === departmentId)?.label || "All";
    const fromStr = fromDate ? format(fromDate, "dd/MM/yyyy") : "";
    const toStr = toDate ? format(toDate, "dd/MM/yyyy") : "";
    return `${collegeCode} / ${deptCode} - ( ${fromStr} To ${toStr} )`;
  };

  const handleGetList = async () => {
    const cid = Number(collegeId ?? 0);
    if (!cid) {
      toastInfo("College is required");
      return;
    }
    if (!fromDate) {
      toastInfo("From Date is required");
      return;
    }
    if (!toDate) {
      toastInfo("To Date is required");
      return;
    }

    const details = buildDataDetails();
    const name =
      pickText(selectedCollegeRow, ["college_name", "collegeName"]) ||
      collegeOptions.find((o) => o.value === collegeId)?.label ||
      "";
    setLoadingList(true);
    clearResults();
    setDataDetails(details);
    setCollegeName(name);
    try {
      const raw = await getEmpAttendanceSummaryReport({
        collegeId: cid,
        departmentId: Number(departmentId || 0),
        fromDate: format(fromDate, "yyyy-MM-dd"),
        toDate: format(toDate, "yyyy-MM-dd"),
      });
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
    const tableHtml = buildHtmlTable(EXCEL_COLUMNS, exportRows);
    exportHtmlTableAsExcel(
      "Employee Attendance Summary Report.xls",
      tableHtml,
      headerHtml,
    );
  };

  const printReport = async () => {
    if (exportRows.length === 0) {
      toastInfo("No records to print.");
      return;
    }
    const cid = Number(collegeId ?? 0);
    const logoSrc = await resolveAttendancePrintLogo(
      selectedCollegeRow,
      cid,
      collegeLogo || DEFAULT_COLLEGE_LOGO,
    );
    const fallbackLogo = toPrintLogoUrl(DEFAULT_COLLEGE_LOGO);
    const tableHtml = buildHtmlTable(EXCEL_COLUMNS, exportRows);
    printHtmlInIframe(
      attendancePrintShell({
        title: escapeHtml(PRINT_REPORT_TITLE),
        logoSrc: escapeHtml(logoSrc),
        fallbackLogo: escapeHtml(fallbackLogo),
        collegeName: escapeHtml(collegeName || "College"),
        dataDetails: dataDetails ? escapeHtml(dataDetails) : undefined,
        tableHtml,
      }),
    );
  };

  const goBack = () => {
    router.push(resolveReportCatalogHref(searchParams.get("path")));
  };

  return (
    <FilteredListPage<EmpSummaryRow>
      title="Employee Attendance Summary Report"
      tableTitle={
        showTable && dataDetails
          ? `Employee Attendance Summary Report - ${dataDetails}`
          : "Employee Attendance Summary Report"
      }
      filters={
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Select
              label="College"
              required
              value={collegeId}
              onChange={onCollegeChange}
              options={collegeOptions}
              placeholder="College"
              isLoading={filtersQuery.isLoading}
            />
            <Select
              label="Department"
              value={departmentId}
              onChange={(v) => {
                setDepartmentId(v ?? "0");
                clearResults();
              }}
              options={deptOptions}
              placeholder="Department"
              disabled={!collegeId}
            />
            <DatePicker
              label="From Date"
              required
              value={fromDate}
              onChange={(d) => {
                setFromDate(d);
                clearResults();
              }}
              displayFormat="dd/MM/yyyy"
              clearable={false}
              placeholder="From Date"
            />
            <DatePicker
              label="To Date"
              required
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
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              className="h-9 w-fit px-4"
              disabled={loadingList}
              onClick={() => void handleGetList()}
            >
              {loadingList ? "Loading…" : "Get Attendance Summary"}
            </Button>
            <button
              type="button"
              className="app-control inline-flex h-9 w-fit cursor-pointer items-center justify-center rounded-[5px] border-0 bg-amber-400 px-4 font-medium text-slate-900 shadow-sm transition-colors hover:bg-amber-500"
              onClick={goBack}
            >
              Back
            </button>
          </div>
        </div>
      }
      rowData={showTable ? displayRows : []}
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
      onExportExcel={handleExcelExport}
      toolbarTrailing={
        showTable ? (
          <>
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
