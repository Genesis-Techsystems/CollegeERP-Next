"use client";

/**
 * Parent Teacher Meeting Report —
 * Admin: `reports/admin-attendance-reports/parent-teacher-meeting-report`
 * HOD:   `staff-reports/admin-attendance-reports/parent-teacher-meeting-report`
 */

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ColDef } from "ag-grid-community";
import { format } from "date-fns";
import { FileSpreadsheet, Printer } from "lucide-react";
import { DatePicker } from "@/common/components/date-picker";
import { Select } from "@/common/components/select";
import type { SelectOption } from "@/common/components/select";
import {
  buildHtmlTable,
  escapeHtml,
  exportHtmlTableAsExcel,
} from "@/common/export-html-table";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { printHtmlInIframe } from "@/lib/print";
import { getErrorMessage } from "@/lib/errors";
import { resolveReportCatalogHref } from "@/lib/report-catalog";
import { rowIndexGetter } from "@/lib/utils";
import { toastError, toastInfo } from "@/lib/toast";
import { DEFAULT_COLLEGE_LOGO, useCollegeLogo } from "@/hooks/useCollegeLogo";
import {
  facultyEmployeeLabel,
  getCollegeById,
  getParentTeacherMeetingReport,
  searchEmployeesForFacultyDataSecurity,
  type FacultySecurityEmployee,
} from "@/services";
import {
  attendancePrintShell,
  resolveAttendancePrintLogo,
  toPrintLogoUrl,
} from "../_lib/attendance-report-print";

const PRINT_REPORT_TITLE = "Parent Teacher Meeting Report";

type AnyRow = Record<string, unknown>;

type PtmRow = {
  counselorName: string;
  activityDate: string;
  noOfStudents: string;
};

const EXCEL_COLUMNS: { key: string; header: string }[] = [
  { key: "siNo", header: "SI.No" },
  { key: "counselorName", header: "Counselor Name" },
  { key: "activityDate", header: "Activity Date" },
  { key: "noOfStudents", header: "No. of Students" },
];

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<PtmRow>,
  counselorName: {
    field: "counselorName",
    headerName: "Counselor Name",
    minWidth: 180,
  } as ColDef<PtmRow>,
  activityDate: {
    field: "activityDate",
    headerName: "Activity Date",
    minWidth: 130,
  } as ColDef<PtmRow>,
  noOfStudents: {
    field: "noOfStudents",
    headerName: "No. of Students",
    minWidth: 130,
  } as ColDef<PtmRow>,
};

function pickRowValue(row: AnyRow, keys: string[]): string {
  const asText = (v: unknown): string | null => {
    if (v == null) return null;
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
    const s = String(v).trim();
    return s === "" ? null : s;
  };

  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(row, key)) continue;
    const text = asText(row[key]);
    if (text != null) return text;
  }
  const wanted = new Set(
    keys.map((k) => k.toLowerCase().replace(/[\s_]+/g, "")),
  );
  for (const [k, v] of Object.entries(row)) {
    const norm = k.toLowerCase().replace(/[\s_]+/g, "");
    if (!wanted.has(norm)) continue;
    const text = asText(v);
    if (text != null) return text;
  }
  return "";
}

function mapPtmRow(row: AnyRow): PtmRow {
  return {
    counselorName: pickRowValue(row, [
      "Counselor_Name",
      "counselor_name",
      "CounselorName",
      "Counselor Name",
    ]),
    activityDate: pickRowValue(row, [
      "activity_date",
      "Activity_Date",
      "activityDate",
      "Activity Date",
    ]),
    noOfStudents: pickRowValue(row, [
      "No_of_students",
      "no_of_students",
      "No_Of_Students",
      "NoOfStudents",
      "No. of Students",
      "No of Students",
    ]),
  };
}

export default function ParentTeacherMeetingReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const collegeId = Number(globalThis?.localStorage?.getItem("collegeId") ?? 0);

  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [employees, setEmployees] = useState<FacultySecurityEmployee[]>([]);
  const [employeeSearching, setEmployeeSearching] = useState(false);

  const [rows, setRows] = useState<AnyRow[]>([]);
  const [collegeName, setCollegeName] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [showTable, setShowTable] = useState(false);

  const collegeLogo = useCollegeLogo(collegeId > 0 ? collegeId : null);

  const clearResults = useCallback(() => {
    setRows([]);
    setShowTable(false);
  }, []);

  const employeeOptions: SelectOption[] = useMemo(
    () =>
      employees.map((e) => ({
        value: String(e.employeeId),
        label: facultyEmployeeLabel(e),
      })),
    [employees],
  );

  const displayRows = useMemo(() => rows.map(mapPtmRow), [rows]);

  const exportRows = useMemo(
    () =>
      displayRows.map((row, i) => ({
        siNo: i + 1,
        ...row,
      })),
    [displayRows],
  );

  const columnDefs = useMemo<ColDef<PtmRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.counselorName,
      COL_DEFS.activityDate,
      COL_DEFS.noOfStudents,
    ],
    [],
  );

  async function onEmployeeSearch(term: string) {
    const q = term.trim();
    if (q.length <= 4) {
      if (!employeeId) setEmployees([]);
      return;
    }
    setEmployeeSearching(true);
    try {
      const found = await searchEmployeesForFacultyDataSecurity(q);
      setEmployees(found);
    } catch (e) {
      toastError(getErrorMessage(e));
      setEmployees([]);
    } finally {
      setEmployeeSearching(false);
    }
  }

  function onEmployeeChange(value: string | null) {
    setEmployeeId(value);
    clearResults();
    if (!value) return;
    const selected = employees.find((e) => String(e.employeeId) === value);
    if (selected) setEmployees([selected]);
  }

  const handleGetList = async () => {
    if (!fromDate) {
      toastInfo("From Date is required");
      return;
    }
    if (!toDate) {
      toastInfo("To Date is required");
      return;
    }

    const emp = Number(employeeId || 0);
    const fromYmd = format(fromDate, "yyyy-MM-dd");
    const toYmd = format(toDate, "yyyy-MM-dd");

    // Angular quirk: without employee, pass fromDate for BOTH activity dates + emp_id=0
    const params =
      emp > 0
        ? {
            fromActivityDate: fromYmd,
            toActivityDate: toYmd,
            employeeId: emp,
          }
        : {
            fromActivityDate: fromYmd,
            toActivityDate: fromYmd,
            employeeId: 0,
          };

    setLoadingList(true);
    clearResults();
    try {
      let name = "";
      if (collegeId > 0) {
        try {
          const college = await getCollegeById(collegeId);
          name = college?.collegeName
            ? String(college.collegeName)
            : college?.collegeCode
              ? String(college.collegeCode)
              : "";
        } catch {
          name = "";
        }
      }
      setCollegeName(name);

      const raw = await getParentTeacherMeetingReport(params);
      if (raw.length === 0) {
        toastInfo("No records found.");
        setShowTable(false);
        return;
      }
      setRows(raw);
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
    const tableHtml = buildHtmlTable(EXCEL_COLUMNS, exportRows);
    exportHtmlTableAsExcel(
      "Parent Teacher Meeting Report.xls",
      tableHtml,
      headerHtml,
    );
  };

  const printReport = async () => {
    if (exportRows.length === 0) {
      toastInfo("No records to print.");
      return;
    }
    const logoSrc = await resolveAttendancePrintLogo(
      null,
      collegeId,
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
        tableHtml,
      }),
    );
  };

  const goBack = () => {
    router.push(resolveReportCatalogHref(searchParams.get("path")));
  };

  return (
    <FilteredListPage<PtmRow>
      title="Parent Teacher Meeting Report"
      filters={
        <div className="flex flex-nowrap items-end gap-3 overflow-x-auto pb-0.5">
          <div className="w-[11rem] shrink-0">
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
          </div>
          <div className="w-[11rem] shrink-0">
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
          <div className="w-[24rem] min-w-[22rem] max-w-[26rem] shrink-0">
            <Select
              label="Employee"
              value={employeeId}
              onChange={onEmployeeChange}
              options={employeeOptions}
              placeholder="Search employee (5+ chars)"
              searchable
              onSearch={onEmployeeSearch}
              isLoading={employeeSearching}
              clearable
            />
          </div>
          <Button
            type="button"
            className="h-9 w-fit shrink-0 px-4"
            disabled={loadingList}
            onClick={() => void handleGetList()}
          >
            {loadingList ? "Loading…" : "Get Meetings"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-9 w-fit shrink-0 px-4"
            onClick={goBack}
          >
            Back
          </Button>
        </div>
      }
      showTable={showTable}
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
