"use client";

/**
 * Employee List By Campus —
 * Angular `reports/admin-hr-reports/employee-list-by-campus-report` parity.
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
  getAttendanceCollegeDeptFilters,
  getCollegeById,
  getEmployeeListByCampusReport,
} from "@/services";
import {
  attendancePrintShell as reportPrintShell,
  resolveAttendancePrintLogo as resolveReportPrintLogo,
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

const PRINT_REPORT_TITLE = "Employee List By Department Report";

type EmpRow = {
  empName: string;
  empNumber: string;
  department: string;
  designation: string;
  category: string;
  email: string;
  mobile: string;
  officialMobile: string;
};

const COL_DEFS = {
  siNo: {
    headerName: "S.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<EmpRow>,
  empName: {
    field: "empName",
    headerName: "Employee",
    minWidth: 180,
  } as ColDef<EmpRow>,
  empNumber: {
    field: "empNumber",
    headerName: "Emp. No",
    minWidth: 110,
  } as ColDef<EmpRow>,
  department: {
    field: "department",
    headerName: "Department",
    minWidth: 120,
  } as ColDef<EmpRow>,
  designation: {
    field: "designation",
    headerName: "Designation",
    minWidth: 120,
  } as ColDef<EmpRow>,
  category: {
    field: "category",
    headerName: "Category",
    minWidth: 110,
  } as ColDef<EmpRow>,
  email: {
    field: "email",
    headerName: "Email",
    minWidth: 160,
  } as ColDef<EmpRow>,
  mobile: {
    field: "mobile",
    headerName: "Mobile",
    minWidth: 110,
  } as ColDef<EmpRow>,
  officialMobile: {
    field: "officialMobile",
    headerName: "Office Mobile",
    minWidth: 120,
  } as ColDef<EmpRow>,
};

const EXCEL_COLUMNS = [
  { key: "siNo", header: "S.No" },
  { key: "empName", header: "Employee" },
  { key: "empNumber", header: "Emp. No" },
  { key: "department", header: "Department" },
  { key: "designation", header: "Designation" },
  { key: "category", header: "Category" },
  { key: "email", header: "Email" },
  { key: "mobile", header: "Mobile" },
  { key: "officialMobile", header: "Office Mobile" },
];

function mapRow(row: AnyRow): EmpRow {
  return {
    empName: String(row.Emp_Name ?? row.emp_name ?? row.firstName ?? ""),
    empNumber: String(row.emp_number ?? row.empNumber ?? ""),
    department: String(row.Emp_Department ?? row.deptName ?? ""),
    designation: String(row.Emp_Designation ?? row.designationName ?? ""),
    category: String(row.Emp_Category ?? row.empCategoryName ?? ""),
    email: String(row.email ?? row.Email ?? ""),
    mobile: String(row.mobile ?? ""),
    officialMobile: String(
      row.official_mobile ?? row.officialMobile ?? "",
    ),
  };
}

export default function EmployeeListByCampusReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const orgId = Number(
    globalThis?.localStorage?.getItem("organizationId") ?? 0,
  );
  const empId = Number(globalThis?.localStorage?.getItem("employeeId") ?? 0);

  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);

  const [rows, setRows] = useState<EmpRow[]>([]);
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
    queryKey: QK.hrReports.collegeDeptFilters(orgId, empId),
    queryFn: () => getAttendanceCollegeDeptFilters(orgId, empId),
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

  const departmentOptions = useMemo(() => {
    const cid = Number(collegeId ?? 0);
    if (!cid) return [];
    return dedupeBy(
      departmentData.filter(
        (r) => pickNum(r, ["fk_college_id", "collegeId"]) === cid,
      ),
      (r) => pickNum(r, ["fk_dept_id", "departmentId"]),
    ).map((r) => ({
      value: String(pickNum(r, ["fk_dept_id", "departmentId"])),
      label: pickText(r, ["dept_code", "deptCode", "dept_name"]) || "—",
    }));
  }, [departmentData, collegeId]);

  useEffect(() => {
    if (collegeId || collegeOptions.length === 0) return;
    setCollegeId(collegeOptions[0]!.value);
  }, [collegeId, collegeOptions]);

  useEffect(() => {
    if (!collegeId) return;
    if (departmentOptions.length === 0) {
      setDepartmentId(null);
      return;
    }
    if (!departmentOptions.some((o) => o.value === departmentId)) {
      setDepartmentId(departmentOptions[0]!.value);
    }
  }, [collegeId, departmentOptions]); // eslint-disable-line react-hooks/exhaustive-deps

  const columnDefs = useMemo<ColDef<EmpRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.empName,
      COL_DEFS.empNumber,
      COL_DEFS.department,
      COL_DEFS.designation,
      COL_DEFS.category,
      COL_DEFS.email,
      COL_DEFS.mobile,
      COL_DEFS.officialMobile,
    ],
    [],
  );

  const exportRows = useMemo(
    () => rows.map((row, i) => ({ siNo: i + 1, ...row })),
    [rows],
  );

  const handleGetList = async () => {
    const cid = Number(collegeId ?? 0);
    const did = Number(departmentId ?? 0);
    if (!cid || !did) {
      toastInfo("College and Department are required");
      return;
    }
    if (!fromDate || !toDate) {
      toastInfo("From Date and To Date are required");
      return;
    }

    const collegeCode =
      collegeOptions.find((o) => o.value === String(cid))?.label ?? "";
    const deptCode =
      departmentOptions.find((o) => o.value === String(did))?.label ?? "";
    const details = [collegeCode, deptCode].filter(Boolean).join(" / ");

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
      const raw = await getEmployeeListByCampusReport({
        collegeId: cid,
        departmentId: did,
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
      "Employee List By Campus Report.xls",
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
    <FilteredListPage<EmpRow>
      title={
        showTable && dataDetails
          ? `${PRINT_REPORT_TITLE} ( ${dataDetails} )`
          : PRINT_REPORT_TITLE
      }
      filters={
        <div className="flex flex-wrap items-end gap-3">
          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:w-auto lg:grid-cols-4 lg:min-w-[720px]">
            <Select
              label="College"
              required
              value={collegeId}
              onChange={(v) => {
                setCollegeId(v);
                setDepartmentId(null);
                clearResults();
              }}
              options={collegeOptions}
              placeholder="College"
              isLoading={filtersQuery.isLoading}
            />
            <Select
              label="Department"
              required
              value={departmentId}
              onChange={(v) => {
                setDepartmentId(v);
                clearResults();
              }}
              options={departmentOptions}
              placeholder="Department"
              disabled={!collegeId}
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
              placeholder="Date"
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
              placeholder="Date"
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
            variant="secondary"
            className="h-9 w-fit px-4"
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
