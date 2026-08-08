"use client";

/**
 * Staff Timetable Report —
 * Angular `reports/admin-timetable-reports/staff-timetable-report` parity.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { ColDef } from "ag-grid-community";
import { format } from "date-fns";
import { FileSpreadsheet, Printer } from "lucide-react";
import { DatePicker } from "@/common/components/date-picker";
import { Select } from "@/common/components/select";
import { escapeHtml, exportHtmlTableAsExcel } from "@/common/export-html-table";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { printHtmlInIframe } from "@/lib/print";
import { QK } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/errors";
import { resolveReportCatalogHref } from "@/lib/report-catalog";
import { toastError, toastInfo } from "@/lib/toast";
import { DEFAULT_COLLEGE_LOGO, useCollegeLogo } from "@/hooks/useCollegeLogo";
import { useLoginEmployeeId } from "@/hooks/useLoginEmployeeId";
import { useSession } from "@/hooks/useSession";
import {
  fetchTimetableFilterRows,
  getCollegeById,
  getStaffTimetableReport,
  searchEmployeesForStaffTimetableReport,
} from "@/services";
import {
  attendancePrintShell as timetablePrintShell,
  resolveAttendancePrintLogo as resolveTimetablePrintLogo,
  toPrintLogoUrl,
} from "@/app/(pages)/(protected)/reports/admin-attendance-reports/_lib/attendance-report-print";
import {
  buildMatrixTableHtml,
  buildStaffTimetableMatrix,
  subjectForStaffPeriod,
  type PeriodKey,
} from "../_lib/timetable-matrix";
import {
  buildMatrixColumnDefs,
  periodField,
  toMatrixGridRows,
  type MatrixGridRow,
} from "../_lib/timetable-grid";
import {
  distinctAcademicYears,
  distinctColleges,
  num,
  toSelectOptions,
  txt,
} from "../_lib/timetable-report-filters";

const REPORT_TITLE = "Staff Timetable Report";

type EmpOption = {
  employeeId: number;
  firstName: string;
  empNumber: string;
};

function empLabel(e: EmpOption): string {
  return e.empNumber
    ? `${e.firstName} (${e.empNumber})`
    : e.firstName || String(e.employeeId);
}

export default function StaffTimetableReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: sessionLoading } = useSession();
  const { employeeId: loginEmployeeId } = useLoginEmployeeId(
    user,
    sessionLoading,
  );

  const [collegeId, setCollegeId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [fromDate, setFromDate] = useState<Date | null>(() => new Date());
  const [toDate, setToDate] = useState<Date | null>(() => new Date());
  /** Angular `isDisable` — when true, date fields are enabled. */
  const [datesEnabled, setDatesEnabled] = useState(true);

  const [employees, setEmployees] = useState<EmpOption[]>([]);
  const [employeeSearching, setEmployeeSearching] = useState(false);

  const [keys, setKeys] = useState<PeriodKey[]>([]);
  const [gridRows, setGridRows] = useState<MatrixGridRow[]>([]);
  const [dataDetails, setDataDetails] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [showTable, setShowTable] = useState(false);

  const collegeLogo = useCollegeLogo(collegeId ? Number(collegeId) : null);

  const clearResults = useCallback(() => {
    setKeys([]);
    setGridRows([]);
    setShowTable(false);
    setDataDetails("");
    setCollegeName("");
  }, []);

  const filtersQuery = useQuery({
    queryKey: QK.timetableReports.clsFilters(),
    queryFn: () => fetchTimetableFilterRows("cls_timtable_filters", 0),
  });

  const filterRows = useMemo(
    () => (Array.isArray(filtersQuery.data) ? filtersQuery.data : []),
    [filtersQuery.data],
  );

  const colleges = useMemo(() => distinctColleges(filterRows), [filterRows]);
  const academicYears = useMemo(
    () => distinctAcademicYears(filterRows, Number(collegeId || 0)),
    [filterRows, collegeId],
  );

  const collegeOptions = useMemo(
    () =>
      toSelectOptions(colleges, ["fk_college_id", "collegeId"], [
        "college_code",
        "collegeCode",
      ]),
    [colleges],
  );
  const ayOptions = useMemo(
    () =>
      toSelectOptions(academicYears, ["fk_academic_year_id", "academicYearId"], [
        "academic_year",
        "academicYear",
      ]),
    [academicYears],
  );

  const employeeOptions = useMemo(
    () =>
      employees
        .filter((e) => e.employeeId > 0)
        .map((e) => ({
          value: String(e.employeeId),
          label: empLabel(e),
        })),
    [employees],
  );

  useEffect(() => {
    if (!loginEmployeeId || employeeId) return;
    const name = String(user?.firstName ?? user?.userName ?? "Current User");
    const empNumber =
      typeof window !== "undefined"
        ? String(globalThis.localStorage.getItem("empNumber") ?? "")
        : "";
    setEmployeeId(String(loginEmployeeId));
    setEmployees([
      {
        employeeId: loginEmployeeId,
        firstName: name,
        empNumber,
      },
    ]);
  }, [loginEmployeeId, employeeId, user]);

  useEffect(() => {
    if (!colleges.length) return;
    if (!colleges.some((r) => num(r.fk_college_id ?? r.collegeId) === Number(collegeId))) {
      setCollegeId(String(num(colleges[0].fk_college_id ?? colleges[0].collegeId)));
    }
  }, [colleges, collegeId]);

  useEffect(() => {
    if (!academicYears.length) {
      setAcademicYearId("");
      return;
    }
    if (
      !academicYears.some(
        (r) => num(r.fk_academic_year_id ?? r.academicYearId) === Number(academicYearId),
      )
    ) {
      setAcademicYearId(
        String(num(academicYears[0].fk_academic_year_id ?? academicYears[0].academicYearId)),
      );
    }
  }, [academicYears, academicYearId]);

  async function onEmployeeSearch(term: string) {
    const q = term.trim();
    if (q.length <= 4) {
      if (!employeeId) setEmployees([]);
      return;
    }
    setEmployeeSearching(true);
    try {
      const found = await searchEmployeesForStaffTimetableReport(q);
      setEmployees(
        found
          .map((r) => ({
            employeeId: num(r.employeeId),
            firstName: txt(r.firstName),
            empNumber: txt(r.empNumber),
          }))
          .filter((e) => e.employeeId > 0),
      );
    } catch (e) {
      toastError(getErrorMessage(e));
      setEmployees([]);
    } finally {
      setEmployeeSearching(false);
    }
  }

  const columnDefs = useMemo<ColDef<MatrixGridRow>[]>(
    () => buildMatrixColumnDefs("Days/Hours", keys),
    [keys],
  );

  const tableHtml = useMemo(() => {
    if (!showTable || gridRows.length === 0) return "";
    return buildMatrixTableHtml({
      firstColHeader: "Days/Hours",
      keys,
      rows: gridRows.map((r) => ({
        label: r.rowLabel,
        cells: keys.map((k) => String(r[periodField(k.Period)] ?? "")),
      })),
    });
  }, [gridRows, keys, showTable]);

  const handleGetList = async () => {
    const cid = Number(collegeId || 0);
    const ay = Number(academicYearId || 0);
    const emp = Number(employeeId || 0);
    if (!cid) {
      toastInfo("College is required");
      return;
    }
    if (!ay) {
      toastInfo("Academic Year is required");
      return;
    }
    if (!emp) {
      toastInfo("Employee is required");
      return;
    }
    if (!fromDate || !toDate) {
      toastInfo("From Date and To Date are required");
      return;
    }

    const college = colleges.find(
      (r) => num(r.fk_college_id ?? r.collegeId) === cid,
    );
    const ayRow = academicYears.find(
      (r) => num(r.fk_academic_year_id ?? r.academicYearId) === ay,
    );
    const academicYearName = txt(ayRow?.academic_year ?? ayRow?.academicYear);
    const details = [
      txt(college?.college_code ?? college?.collegeCode),
      academicYearName,
    ]
      .filter(Boolean)
      .join(" / ");

    setLoadingList(true);
    clearResults();
    setDataDetails(details);
    try {
      const [raw, collegeFull] = await Promise.all([
        getStaffTimetableReport({
          fromDate: format(fromDate, "yyyy-MM-dd"),
          toDate: format(toDate, "yyyy-MM-dd"),
          collegeId: cid,
          academicYearId: ay,
          employeeId: emp,
          academicYearName,
        }),
        getCollegeById(cid).catch(() => null),
      ]);
      setCollegeName(
        String(
          collegeFull?.collegeName ??
            college?.college_name ??
            college?.collegeName ??
            "",
        ),
      );
      if (raw.length === 0) {
        toastInfo("No records found.");
        return;
      }
      const matrix = buildStaffTimetableMatrix(raw);
      setKeys(matrix.keys);
      setGridRows(
        toMatrixGridRows(
          matrix.studentTimetable.map((r) => ({
            label: r.WeekDay_Name,
            cells: matrix.keys.map((k) => subjectForStaffPeriod(r, k.Period)),
          })),
          matrix.keys,
        ),
      );
      setShowTable(true);
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setLoadingList(false);
    }
  };

  const handleExcelExport = () => {
    if (!tableHtml) {
      toastInfo("No records to export.");
      return;
    }
    const headerHtml = `<div style="margin-bottom:12px;">
      <div style="font-size:16px;font-weight:550;">${escapeHtml(REPORT_TITLE)}${dataDetails ? `-${escapeHtml(dataDetails)}` : ""}</div>
    </div>`;
    exportHtmlTableAsExcel(`${REPORT_TITLE}.xls`, tableHtml, headerHtml);
  };

  const printReport = async () => {
    if (!tableHtml) {
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
        tableHtml,
        textAlign: "center",
      }),
    );
  };

  const goBack = () => {
    router.push(resolveReportCatalogHref(searchParams.get("path")));
  };

  const pageTitle =
    showTable && dataDetails
      ? `${REPORT_TITLE} - (${dataDetails})`
      : REPORT_TITLE;

  return (
    <FilteredListPage<MatrixGridRow>
      title={pageTitle}
      filters={
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <Select
              label="College"
              required
              value={collegeId || null}
              onChange={(v) => {
                setCollegeId(v ?? "");
                clearResults();
              }}
              options={collegeOptions}
              placeholder="College"
              isLoading={filtersQuery.isLoading}
            />
            <Select
              label="Academic Year"
              required
              value={academicYearId || null}
              onChange={(v) => {
                setAcademicYearId(v ?? "");
                clearResults();
              }}
              options={ayOptions}
              placeholder="Academic Year"
              disabled={!collegeId}
            />
            <Select
              label="Employee"
              required
              value={employeeId || null}
              onChange={(v) => {
                setEmployeeId(v ?? "");
                clearResults();
                if (!v) return;
                const selected = employees.find(
                  (e) => String(e.employeeId) === v,
                );
                if (selected) setEmployees([selected]);
              }}
              onSearch={(term) => void onEmployeeSearch(term)}
              options={employeeOptions}
              placeholder="Employee"
              searchable
              isLoading={employeeSearching}
            />
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:w-auto lg:min-w-[360px]">
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
                disabled={!datesEnabled}
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
                disabled={!datesEnabled}
                minDate={fromDate ?? undefined}
              />
            </div>
            <div className="flex h-9 items-center gap-2 px-1">
              <Checkbox
                id="staff-tt-dates-enabled"
                checked={datesEnabled}
                onCheckedChange={(checked) => {
                  const enabled = checked === true;
                  setDatesEnabled(enabled);
                  if (enabled) {
                    const today = new Date();
                    setFromDate(today);
                    setToDate(today);
                  }
                  clearResults();
                }}
              />
              <Label htmlFor="staff-tt-dates-enabled" className="text-[12px]">
                {datesEnabled ? "enable" : "Disable"}
              </Label>
            </div>
            <Button
              type="button"
              className="h-9 w-fit px-4"
              disabled={loadingList}
              onClick={() => void handleGetList()}
            >
              {loadingList ? "Loading…" : "Get Staff Timetable"}
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
      rowData={showTable ? gridRows : []}
      columnDefs={columnDefs}
      loading={loadingList}
      resultsVisible={showTable}
      hideEmptyGrid
      pagination
      paginationPageSize={25}
      getRowId={(p) => String(p.data?.__rowId ?? "")}
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        exportExcel: false,
        exportPdf: false,
        columnPicker: true,
        lockColumnIds: ["rowLabel"],
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
