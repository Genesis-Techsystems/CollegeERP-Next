"use client";

/**
 * Employee Attendance Report —
 * Admin: `reports/admin-attendance-reports/employee-attendance-report`
 * HOD:   `staff-reports/admin-attendance-reports/employee-attendance-report`
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
  pickNum,
  pickText,
  type FilterRow,
} from "@/app/(pages)/(protected)/accounts-and-fees/fee-masters/_lib/fee-master-filters";
import {
  getAttendanceCollegeDeptSubjectFilters,
  getEmpAttendanceReport,
} from "@/services";
import {
  attendancePrintShell,
  resolveAttendancePrintLogo,
  toPrintLogoUrl,
} from "../_lib/attendance-report-print";
import {
  collectAttendanceDates,
  formatAttendanceDateHeader,
  pivotEmpAttendanceRows,
  type EmpAttendancePivotRow,
} from "../_lib/emp-attendance-pivot";

const PRINT_REPORT_TITLE = "Employee Attendance Report";
const ALL0 = { value: "0", label: "All" };

export default function EmployeeAttendanceReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const orgId = Number(
    globalThis?.localStorage?.getItem("organizationId") ?? 0,
  );
  const empId = Number(globalThis?.localStorage?.getItem("employeeId") ?? 0);

  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [departmentId, setDepartmentId] = useState<string>("0");
  const [subjectId, setSubjectId] = useState<string>("0");
  const [fromDate, setFromDate] = useState<Date | null>(() => new Date());
  const [toDate, setToDate] = useState<Date | null>(() => new Date());

  const [pivotRows, setPivotRows] = useState<EmpAttendancePivotRow[]>([]);
  const [dateKeys, setDateKeys] = useState<string[]>([]);
  const [collegeName, setCollegeName] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [showTable, setShowTable] = useState(false);

  const collegeLogo = useCollegeLogo(collegeId ? Number(collegeId) : null);

  const clearResults = useCallback(() => {
    setPivotRows([]);
    setDateKeys([]);
    setShowTable(false);
    setCollegeName("");
  }, []);

  const filtersQuery = useQuery({
    queryKey: QK.attendanceReports.collegeDeptSubjectFilters(orgId, empId),
    queryFn: () => getAttendanceCollegeDeptSubjectFilters(orgId, empId),
    enabled: orgId > 0 && empId > 0,
  });

  const filtersData = useMemo(
    () => (filtersQuery.data?.filtersData ?? []) as FilterRow[],
    [filtersQuery.data?.filtersData],
  );
  const departmentData = useMemo(
    () => (filtersQuery.data?.departmentData ?? []) as FilterRow[],
    [filtersQuery.data?.departmentData],
  );
  const subjectData = useMemo(
    () => (filtersQuery.data?.subjectData ?? []) as FilterRow[],
    [filtersQuery.data?.subjectData],
  );

  const collegeOptions = useMemo(
    () =>
      dedupeBy(filtersData, (r) => pickNum(r, ["fk_college_id", "collegeId"]))
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

  const departmentOptions = useMemo(() => {
    const cid = Number(collegeId ?? 0);
    const rows = dedupeBy(
      departmentData.filter(
        (r) => !cid || pickNum(r, ["fk_college_id", "collegeId"]) === cid,
      ),
      (r) => pickNum(r, ["fk_dept_id", "departmentId", "deptId"]),
    );
    return [
      ALL0,
      ...rows.map((r) => ({
        value: String(pickNum(r, ["fk_dept_id", "departmentId", "deptId"])),
        label: pickText(r, ["dept_code", "deptCode", "dept_name"]) || "—",
      })),
    ];
  }, [departmentData, collegeId]);

  const subjectOptions = useMemo(() => {
    const cid = Number(collegeId ?? 0);
    const rows = dedupeBy(
      subjectData.filter(
        (r) => !cid || pickNum(r, ["fk_college_id", "collegeId"]) === cid,
      ),
      (r) =>
        pickText(r, ["subject_code", "subjectCode"]) ||
        pickNum(r, ["fk_subject_id", "subjectId"]),
    );
    return [
      ALL0,
      ...rows.map((r) => {
        const name = pickText(r, ["subject_name", "subjectName"]);
        const code = pickText(r, ["subject_code", "subjectCode"]);
        return {
          value: String(pickNum(r, ["fk_subject_id", "subjectId"])),
          label: code ? `${name} (${code})` : name || "—",
        };
      }),
    ];
  }, [subjectData, collegeId]);

  useEffect(() => {
    if (collegeId || collegeOptions.length === 0) return;
    setCollegeId(collegeOptions[0].value);
  }, [collegeId, collegeOptions]);

  useEffect(() => {
    if (!collegeId) return;
    const firstDept = departmentOptions.find((o) => o.value !== "0");
    setDepartmentId(firstDept?.value ?? "0");
    setSubjectId("0");
    clearResults();
  }, [collegeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const onCollegeChange = (v: string | null) => {
    setCollegeId(v);
  };

  const columnDefs = useMemo<ColDef<EmpAttendancePivotRow>[]>(() => {
    const fixed: ColDef<EmpAttendancePivotRow>[] = [
      {
        headerName: "SI.No",
        valueGetter: rowIndexGetter,
        width: 70,
        flex: 0,
      },
      {
        headerName: "Employee",
        minWidth: 180,
        valueGetter: (p) => {
          const name = p.data?.first_name ?? "";
          const num = p.data?.emp_number ?? "";
          return num ? `${name} (${num})` : name;
        },
      },
      { field: "dept_name", headerName: "Department", minWidth: 120 },
      { field: "course_group", headerName: "Course Group", minWidth: 110 },
      { field: "course_year", headerName: "Course Year", minWidth: 110 },
      { field: "section", headerName: "Section", minWidth: 90 },
      { field: "subject_name", headerName: "Subject Name", minWidth: 140 },
      { field: "subject_code", headerName: "Subject Code", minWidth: 110 },
    ];
    const dateCols: ColDef<EmpAttendancePivotRow>[] = dateKeys.map((d) => ({
      field: d,
      headerName: formatAttendanceDateHeader(d),
      width: 90,
      flex: 0,
      cellStyle: { textAlign: "center" },
    }));
    return [
      ...fixed,
      ...dateCols,
      {
        field: "present",
        headerName: "Present",
        width: 90,
        flex: 0,
        cellStyle: { textAlign: "center" },
      },
      {
        field: "absent",
        headerName: "Absent",
        width: 90,
        flex: 0,
        cellStyle: { textAlign: "center" },
      },
    ];
  }, [dateKeys]);

  const excelColumns = useMemo(() => {
    const cols: { key: string; header: string }[] = [
      { key: "siNo", header: "SI.No" },
      { key: "employee", header: "Employee" },
      { key: "dept_name", header: "Department" },
      { key: "course_group", header: "Course Group" },
      { key: "course_year", header: "Course Year" },
      { key: "section", header: "Section" },
      { key: "subject_name", header: "Subject Name" },
      { key: "subject_code", header: "Subject Code" },
    ];
    for (const d of dateKeys) {
      cols.push({ key: d, header: formatAttendanceDateHeader(d) });
    }
    cols.push({ key: "present", header: "Present" });
    cols.push({ key: "absent", header: "Absent" });
    return cols;
  }, [dateKeys]);

  const exportRows = useMemo(
    () =>
      pivotRows.map((row, i) => ({
        siNo: i + 1,
        employee: row.emp_number
          ? `${row.first_name} (${row.emp_number})`
          : row.first_name,
        ...row,
      })),
    [pivotRows],
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
    const fromYmd = format(fromDate, "yyyy-MM-dd");
    const toYmd = format(toDate, "yyyy-MM-dd");
    const name =
      pickText(selectedCollegeRow, ["college_name", "collegeName"]) ||
      collegeOptions.find((o) => o.value === collegeId)?.label ||
      "";

    setLoadingList(true);
    clearResults();
    setCollegeName(name);
    try {
      const raw = await getEmpAttendanceReport({
        collegeId: cid,
        departmentId: Number(departmentId || 0),
        subjectId: Number(subjectId || 0),
        fromDate: fromYmd,
        toDate: toYmd,
        employeeId: 0,
      });
      if (raw.length === 0) {
        toastInfo("No records found.");
        setShowTable(false);
        return;
      }
      const dates = collectAttendanceDates(raw);
      setDateKeys(dates);
      setPivotRows(pivotEmpAttendanceRows(raw, dates));
      setShowTable(true);
    } catch (err) {
      toastError(getErrorMessage(err));
      setShowTable(false);
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
      <div style="font-size:16px;font-weight:550;margin-top:4px;">${escapeHtml(PRINT_REPORT_TITLE)}</div>
    </div>`;
    exportHtmlTableAsExcel(
      "Employee Attendance Report.xls",
      buildHtmlTable(excelColumns, exportRows),
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
    printHtmlInIframe(
      attendancePrintShell({
        title: escapeHtml(PRINT_REPORT_TITLE),
        logoSrc: escapeHtml(logoSrc),
        fallbackLogo: escapeHtml(fallbackLogo),
        collegeName: escapeHtml(collegeName || "College"),
        tableHtml: buildHtmlTable(excelColumns, exportRows),
      }),
    );
  };

  const goBack = () => {
    router.push(resolveReportCatalogHref(searchParams.get("path")));
  };

  return (
    <FilteredListPage<EmpAttendancePivotRow>
      title={PRINT_REPORT_TITLE}
      filters={
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
                setSubjectId("0");
                clearResults();
              }}
              options={departmentOptions}
              placeholder="Department"
              disabled={!collegeId}
            />
            <Select
              label="Subject"
              value={subjectId}
              onChange={(v) => {
                setSubjectId(v ?? "0");
                clearResults();
              }}
              options={subjectOptions}
              placeholder="Subject"
              searchable
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
              maxDate={toDate ?? undefined}
              displayFormat="dd-MM-yyyy"
            />
            <DatePicker
              label="To Date"
              required
              value={toDate}
              onChange={(d) => {
                setToDate(d);
                clearResults();
              }}
              minDate={fromDate ?? undefined}
              displayFormat="dd-MM-yyyy"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              className="h-9 w-fit px-4"
              disabled={loadingList}
              onClick={() => void handleGetList()}
            >
              {loadingList ? "Loading…" : "Get Employee Attendance"}
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
      showTable={showTable}
      rowData={showTable ? pivotRows : []}
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
