"use client";

/**
 * Counselor Activity Report —
 * Angular `reports/admin-attendance-reports/counselor-activity-report` parity.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { ColDef } from "ag-grid-community";
import { format } from "date-fns";
import { Printer } from "lucide-react";
import { DatePicker } from "@/common/components/date-picker";
import { Select } from "@/common/components/select";
import { buildHtmlTable, escapeHtml } from "@/common/export-html-table";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { printHtmlInIframe } from "@/lib/print";
import { QK } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/errors";
import { resolveReportCatalogHref } from "@/lib/report-catalog";
import { rowIndexGetter } from "@/lib/utils";
import { toastError, toastInfo } from "@/lib/toast";
import {
  DEFAULT_COLLEGE_LOGO,
  useCollegeLogo,
} from "@/hooks/useCollegeLogo";
import {
  dedupeBy,
  filterColleges,
  pickNum,
  pickText,
  type FilterRow,
} from "@/app/(pages)/(protected)/accounts-and-fees/fee-masters/_lib/fee-master-filters";
import {
  downloadCounselorActivityReport,
  getAttendanceCollegeDeptFilters,
  getCounselorActivityReport,
} from "@/services";
import {
  attendancePrintShell,
  resolveAttendancePrintLogo,
  toPrintLogoUrl,
} from "../_lib/attendance-report-print";

const PRINT_REPORT_TITLE = "Counselor Activity Report";

type AnyRow = Record<string, unknown>;

const DEPT_KEYS = ["fk_dept_id", "deptId", "departmentId", "emp_dept_id"];
const SKIP_KEYS = new Set([
  "flag",
  "rn",
  "rnum",
  "rownum",
  "row_num",
  "rownumber",
]);

function isInternalKey(key: string): boolean {
  return key.startsWith("_") || SKIP_KEYS.has(key.toLowerCase());
}

function humanizeKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function CounselorActivityReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const orgId = Number(
    globalThis?.localStorage?.getItem("organizationId") ?? 0,
  );
  const empId = Number(globalThis?.localStorage?.getItem("employeeId") ?? 0);

  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [departmentId, setDepartmentId] = useState<string>("0");
  const [attendanceDate, setAttendanceDate] = useState<Date | null>(null);
  const [meetingTaken, setMeetingTaken] = useState(false);

  const [rows, setRows] = useState<AnyRow[]>([]);
  const [collegeName, setCollegeName] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showTable, setShowTable] = useState(false);

  const collegeLogo = useCollegeLogo(collegeId ? Number(collegeId) : null);

  const clearResults = useCallback(() => {
    setRows([]);
    setShowTable(false);
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
      (r) => pickNum(r, DEPT_KEYS) > 0 && pickText(r, ["dept_code", "deptCode", "dept_name", "department_name"]),
    );
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
    return rows.map((r) => ({
      value: String(pickNum(r, DEPT_KEYS)),
      label:
        pickText(r, [
          "dept_code",
          "deptCode",
          "dept_name",
          "deptName",
          "department_name",
        ]) || String(pickNum(r, DEPT_KEYS)),
    }));
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
    setDepartmentId(deptOptions[0]?.value ?? "0");
  }, [collegeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const onCollegeChange = (v: string | null) => {
    setCollegeId(v);
    setDepartmentId("0");
    clearResults();
  };

  const dataKeys = useMemo(() => {
    if (rows.length === 0) return [] as string[];
    return Object.keys(rows[0]!).filter((k) => !isInternalKey(k));
  }, [rows]);

  const columnDefs = useMemo<ColDef<AnyRow>[]>(() => {
    if (dataKeys.length === 0) {
      return [
        {
          headerName: "SI.No",
          valueGetter: rowIndexGetter,
          width: 70,
          flex: 0,
        },
      ];
    }
    return [
      {
        headerName: "SI.No",
        valueGetter: rowIndexGetter,
        width: 70,
        flex: 0,
      },
      ...dataKeys.map(
        (key) =>
          ({
            field: key,
            headerName: humanizeKey(key),
            minWidth: 120,
            valueGetter: (p) => String(p.data?.[key] ?? ""),
          }) as ColDef<AnyRow>,
      ),
    ];
  }, [dataKeys]);

  const excelColumns = useMemo(
    () => [
      { key: "siNo", header: "SI.No" },
      ...dataKeys.map((key) => ({ key, header: humanizeKey(key) })),
    ],
    [dataKeys],
  );

  const exportRows = useMemo(
    () =>
      rows.map((row, i) => {
        const out: AnyRow = { siNo: i + 1 };
        for (const key of dataKeys) out[key] = row[key] ?? "";
        return out;
      }),
    [rows, dataKeys],
  );

  const reportParams = () => ({
    collegeId: Number(collegeId ?? 0),
    departmentId: Number(departmentId || 0),
    attendanceDate: attendanceDate
      ? format(attendanceDate, "yyyy-MM-dd")
      : "",
    zeroCounselling: meetingTaken ? -1 : 0,
  });

  const validateFilters = () => {
    if (!Number(collegeId ?? 0)) {
      toastInfo("College is required");
      return false;
    }
    if (!Number(departmentId || 0)) {
      toastInfo("Department is required");
      return false;
    }
    if (!attendanceDate) {
      toastInfo("Date is required");
      return false;
    }
    return true;
  };

  const handleGetList = async () => {
    if (!validateFilters()) return;
    const params = reportParams();
    const name =
      pickText(selectedCollegeRow, ["college_name", "collegeName"]) ||
      collegeOptions.find((o) => o.value === collegeId)?.label ||
      "";
    setLoadingList(true);
    clearResults();
    setCollegeName(name);
    try {
      const raw = await getCounselorActivityReport(params);
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

  const handleExcelExport = async () => {
    if (!validateFilters()) return;
    if (rows.length === 0) {
      toastInfo("No records to export.");
      return;
    }
    setExporting(true);
    try {
      await downloadCounselorActivityReport(reportParams());
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setExporting(false);
    }
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
    const tableHtml = buildHtmlTable(excelColumns, exportRows);
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
    <FilteredListPage<AnyRow>
      title="Counselor Activity Report"
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
              required
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
              label="Date"
              required
              value={attendanceDate}
              onChange={(d) => {
                setAttendanceDate(d);
                clearResults();
              }}
              displayFormat="dd/MM/yyyy"
              clearable={false}
              placeholder="Date"
            />
            <div className="flex items-end gap-2 pb-1">
              <Checkbox
                id="meeting-taken"
                checked={meetingTaken}
                onCheckedChange={(v) => {
                  setMeetingTaken(v === true);
                  clearResults();
                }}
              />
              <Label
                htmlFor="meeting-taken"
                className="cursor-pointer text-[12px] font-normal"
              >
                Meeting Taken
              </Label>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              className="h-9 w-fit px-4"
              disabled={loadingList}
              onClick={() => void handleGetList()}
            >
              {loadingList ? "Loading…" : "Get"}
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
      rowData={showTable ? rows : []}
      columnDefs={columnDefs}
      loading={loadingList || exporting}
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
      onExportExcel={() => void handleExcelExport()}
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
