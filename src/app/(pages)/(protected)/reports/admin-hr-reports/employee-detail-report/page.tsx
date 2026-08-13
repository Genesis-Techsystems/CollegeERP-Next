"use client";

/**
 * Employee Detail Report —
 * Angular `reports/admin-hr-reports/employee-detail-report` parity.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
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
  getEmployeeDetailReport,
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

const PRINT_REPORT_TITLE = "Employee Detail Report";

type EmpDetailRow = {
  firstName: string;
  empNumber: string;
  deptName: string;
  designationName: string;
  empCategoryName: string;
  mobile: string;
  officialMobile: string;
  email: string;
};

const COL_DEFS = {
  siNo: {
    headerName: "S.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<EmpDetailRow>,
  empName: {
    field: "firstName",
    headerName: "Employee",
    minWidth: 200,
  } as ColDef<EmpDetailRow>,
  department: {
    field: "deptName",
    headerName: "Department",
    minWidth: 130,
  } as ColDef<EmpDetailRow>,
  designation: {
    field: "designationName",
    headerName: "Designation",
    minWidth: 130,
  } as ColDef<EmpDetailRow>,
  category: {
    field: "empCategoryName",
    headerName: "Category",
    minWidth: 120,
  } as ColDef<EmpDetailRow>,
  mobile: {
    field: "mobile",
    headerName: "Mobile",
    minWidth: 110,
  } as ColDef<EmpDetailRow>,
  officialMobile: {
    field: "officialMobile",
    headerName: "Official Mobile",
    minWidth: 130,
  } as ColDef<EmpDetailRow>,
  email: {
    field: "email",
    headerName: "Email",
    minWidth: 160,
  } as ColDef<EmpDetailRow>,
};

const EXCEL_COLUMNS = [
  { key: "siNo", header: "S.No" },
  { key: "empDisplay", header: "Employee" },
  { key: "deptName", header: "Department" },
  { key: "designationName", header: "Designation" },
  { key: "empCategoryName", header: "Category" },
  { key: "mobile", header: "Mobile" },
  { key: "officialMobile", header: "Official Mobile" },
  { key: "email", header: "Email" },
];

function empNameRenderer(p: ICellRendererParams<EmpDetailRow>) {
  const name = p.data?.firstName ?? "";
  const num = p.data?.empNumber?.trim();
  if (!num) return name;
  return (
    <span>
      {name} <span className="text-muted-foreground">( {num} )</span>
    </span>
  );
}

function mapRow(row: AnyRow): EmpDetailRow {
  return {
    firstName: String(row.firstName ?? row.Emp_Name ?? ""),
    empNumber: String(row.empNumber ?? row.emp_number ?? ""),
    deptName: String(row.deptName ?? row.Emp_Department ?? ""),
    designationName: String(row.designationName ?? row.Emp_Designation ?? ""),
    empCategoryName: String(row.empCategoryName ?? row.Emp_Category ?? ""),
    mobile: String(row.mobile ?? ""),
    officialMobile: String(row.officialMobile ?? row.official_mobile ?? ""),
    email: String(row.email ?? ""),
  };
}

export default function EmployeeDetailReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const orgId = Number(
    globalThis?.localStorage?.getItem("organizationId") ?? 0,
  );
  const empId = Number(globalThis?.localStorage?.getItem("employeeId") ?? 0);

  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [rows, setRows] = useState<EmpDetailRow[]>([]);
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
    queryKey: QK.hrReports.collegeFilters(orgId, empId),
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

  const columnDefs = useMemo<ColDef<EmpDetailRow>[]>(
    () => [
      COL_DEFS.siNo,
      { ...COL_DEFS.empName, cellRenderer: empNameRenderer },
      COL_DEFS.department,
      COL_DEFS.designation,
      COL_DEFS.category,
      COL_DEFS.mobile,
      COL_DEFS.officialMobile,
      COL_DEFS.email,
    ],
    [],
  );

  const exportRows = useMemo(
    () =>
      rows.map((row, i) => ({
        siNo: i + 1,
        ...row,
        empDisplay: row.empNumber
          ? `${row.firstName} ( ${row.empNumber} )`
          : row.firstName,
      })),
    [rows],
  );

  const handleGetList = async () => {
    const cid = Number(collegeId ?? 0);
    if (!cid) {
      toastInfo("College is required");
      return;
    }

    const code =
      collegeOptions.find((o) => o.value === String(cid))?.label ?? "";
    let name =
      pickText(
        filtersData.find(
          (r) => pickNum(r, ["fk_college_id", "collegeId"]) === cid,
        ),
        ["college_name", "collegeName"],
      ) ||
      code ||
      "College";
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
      const raw = await getEmployeeDetailReport(cid);
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
      "Employee Details Report.xls",
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
    <FilteredListPage<EmpDetailRow>
      title={PRINT_REPORT_TITLE}
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
            {loadingList ? "Loading…" : "Get Report"}
          </Button>
          {/* <Button
            type="button"
            variant="secondary"
            className="h-9 w-fit px-4"
            onClick={goBack}
          >
            Back
          </Button> */}
        </div>
      }
      tableTitle={
        showTable && dataDetails
          ? `${PRINT_REPORT_TITLE} - ${dataDetails}`
          : PRINT_REPORT_TITLE
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
        columnPicker: true,
      }}
      toolbarTrailing={
        showTable ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              className="h-9 px-3 text-[12px]"
              onClick={handleExcelExport}
            >
              <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
              Excel Export
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
          </div>
        ) : null
      }
    />
  );
}
