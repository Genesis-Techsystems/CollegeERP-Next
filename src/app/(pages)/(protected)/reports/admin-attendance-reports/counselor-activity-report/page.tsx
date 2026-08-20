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
import { Download } from "lucide-react";
import { DatePicker } from "@/common/components/date-picker";
import { Select } from "@/common/components/select";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { QK } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/errors";
import { resolveReportCatalogHref } from "@/lib/report-catalog";
import { toastError, toastInfo } from "@/lib/toast";
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

function isSerialNoKey(key: string): boolean {
  return key.toLowerCase().replace(/[.\s_]/g, "") === "sno";
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
  const [loadingList, setLoadingList] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showTable, setShowTable] = useState(false);

  const clearResults = useCallback(() => {
    setRows([]);
    setShowTable(false);
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

  const collegeOptions = useMemo(
    () =>
      filterColleges(filtersData).map((r) => ({
        value: String(pickNum(r, ["fk_college_id", "collegeId"])),
        label: pickText(r, ["college_code", "collegeCode"]),
      })),
    [filtersData],
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

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () =>
      dataKeys.map((key) => {
        const serial = isSerialNoKey(key);
        return {
          field: key,
          headerName: humanizeKey(key),
          minWidth: serial ? 70 : 120,
          flex: serial ? 0 : undefined,
          width: serial ? 70 : undefined,
          valueGetter: (p) => String(p.data?.[key] ?? ""),
        } as ColDef<AnyRow>;
      }),
    [dataKeys],
  );

  const reportParams = () => ({
    collegeId: Number(collegeId ?? 0),
    departmentId: Number(departmentId || 0),
    attendanceDate: attendanceDate ? format(attendanceDate, "yyyy-MM-dd") : "",
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
    setLoadingList(true);
    clearResults();
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
              {loadingList ? "Loading…" : "Get Counselor Activities"}
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
        exportExcel: false,
        exportPdf: false,
      }}
      toolbarTrailing={
        showTable ? (
          <button
            type="button"
            className="group relative z-[100] inline-flex h-30 w-30 items-center justify-center text-[#E91E63] hover:opacity-80 disabled:opacity-50"
            aria-label="Download Counselor Activity Report"
            disabled={exporting}
            onClick={() => void handleExcelExport()}
          >
            <Download className="h-7 w-7" strokeWidth={2.5} />
            <span className="pointer-events-none absolute right-0 top-full z-[9999] mt-1.5 whitespace-nowrap rounded bg-neutral-800 px-2.5 py-1.5 text-[12px] text-white opacity-0 shadow-md group-hover:opacity-100">
              Download Counselor Activity Report
            </span>
          </button>
        ) : null
      }
    />
  );
}
