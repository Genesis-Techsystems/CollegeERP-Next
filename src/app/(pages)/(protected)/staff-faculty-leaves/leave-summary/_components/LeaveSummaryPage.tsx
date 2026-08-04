"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef } from "ag-grid-community";
import { Download, RotateCcw } from "lucide-react";
import { FilteredListPage } from "@/components/layout";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { Select, type SelectOption } from "@/common/components/select";
import { DatePicker } from "@/common/components/date-picker";
import { Button } from "@/components/ui/button";
import { useSessionContext } from "@/context/SessionContext";
import { rowIndexGetter } from "@/lib/utils";
import { toastError, toastInfo } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import {
  downloadEmpLeaveSummaryReport,
  getEmpLeaveSummaryReport,
  getLeaveSummaryFilters,
  listLeaveTypesForEntitlement,
  searchEmployeesForLeaveSummary,
  toLeaveYmd,
} from "@/services";

type AnyRow = Record<string, unknown>;

const TOOLBAR = {
  search: true,
  searchPlaceholder: "Search...",
  columnPicker: true,
  exportPdf: false,
  exportExcel: true,
} as const;

function n(v: unknown): number {
  const num = Number(v);
  return Number.isFinite(num) ? num : 0;
}

function s(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
}

function uniqById(rows: AnyRow[], idKey: string): AnyRow[] {
  const seen = new Set<number>();
  return rows.filter((r) => {
    const id = n(r[idKey]);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function parseDate(value: unknown): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

function employeeLabel(row: AnyRow): string {
  const name = s(row.firstName);
  const num = s(row.empNumber);
  return num ? `${name} ( ${num} )` : name || "Employee";
}

export function LeaveSummaryPage() {
  const { user, isLoading: sessionLoading } = useSessionContext();

  const isAdmin = Boolean(user?.isAdmin);
  const isPrincipal = Boolean(user?.isPrincipal);
  /** Angular `dataSecurity` — college-wide employee search. */
  const canSearchCollegeWide = isAdmin || isPrincipal;
  /** Angular `dataSecStaff` — lock department to login emp dept. */
  const lockDepartment = !isAdmin && !isPrincipal;

  const [filtersLoading, setFiltersLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [collegeRows, setCollegeRows] = useState<AnyRow[]>([]);
  const [deptRows, setDeptRows] = useState<AnyRow[]>([]);
  const [academicYearRows, setAcademicYearRows] = useState<AnyRow[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<AnyRow[]>([]);

  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [leaveTypeId, setLeaveTypeId] = useState(0);
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [ayFrom, setAyFrom] = useState<Date | null>(null);
  const [ayTo, setAyTo] = useState<Date | null>(null);

  const [employeeOptions, setEmployeeOptions] = useState<SelectOption[]>([]);
  const [employeeSearchLoading, setEmployeeSearchLoading] = useState(false);

  const [rows, setRows] = useState<AnyRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);

  const clearResults = useCallback(() => {
    setRows([]);
    setColumns([]);
  }, []);

  // Angular getFiltersList + getLeaveTypes
  useEffect(() => {
    if (sessionLoading) return;
    let cancelled = false;
    (async () => {
      setFiltersLoading(true);
      try {
        const orgId = Number(
          globalThis?.localStorage?.getItem("organizationId") ?? 0,
        );
        const empId = Number(
          globalThis?.localStorage?.getItem("employeeId") ?? 0,
        );
        const [filterBundle, types] = await Promise.all([
          getLeaveSummaryFilters(orgId, empId),
          listLeaveTypesForEntitlement(orgId),
        ]);
        if (cancelled) return;

        const colleges = uniqById(filterBundle.colleges, "fk_college_id").sort(
          (a, b) => n(a.clg_sort_order) - n(b.clg_sort_order),
        );
        setCollegeRows(colleges);
        setDeptRows(filterBundle.departments);
        setAcademicYearRows(filterBundle.academicYears);
        setLeaveTypes(types);

        if (colleges.length > 0) {
          const firstId = n(colleges[0]!.fk_college_id);
          setCollegeId(firstId);
        }
      } catch (e) {
        if (!cancelled) toastError(getErrorMessage(e));
      } finally {
        if (!cancelled) setFiltersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionLoading]);

  const departments = useMemo(() => {
    if (!collegeId) return [];
    return uniqById(
      deptRows.filter((r) => n(r.fk_college_id) === collegeId),
      "fk_dept_id",
    );
  }, [deptRows, collegeId]);

  const academicYears = useMemo(() => {
    if (!collegeId) return [];
    const college = collegeRows.find((c) => n(c.fk_college_id) === collegeId);
    const universityId = n(college?.fk_university_id);
    if (!universityId) return [];
    const list = uniqById(
      academicYearRows.filter((r) => n(r.fk_university_id) === universityId),
      "fk_academic_year_id",
    );
    return list.sort(
      (a, b) =>
        parseInt(s(b.academic_year), 10) - parseInt(s(a.academic_year), 10),
    );
  }, [academicYearRows, collegeId, collegeRows]);

  // Angular selectedCollege → selectedDepartment + selectedAcademicYear
  useEffect(() => {
    if (!collegeId) {
      setAcademicYearId(null);
      setDepartmentId(null);
      setEmployeeId(null);
      setEmployeeOptions([]);
      setFromDate(null);
      setToDate(null);
      setAyFrom(null);
      setAyTo(null);
      clearResults();
      return;
    }

    clearResults();
    setEmployeeId(null);
    setEmployeeOptions([]);

    // Department defaults (Angular selectedDepartment)
    if (departments.length > 0) {
      if (lockDepartment) {
        const empDeptId = Number(
          globalThis?.localStorage?.getItem("empDeptId") ?? 0,
        );
        const match = departments.find((d) => n(d.fk_dept_id) === empDeptId);
        setDepartmentId(match ? empDeptId : n(departments[0]!.fk_dept_id));
      } else {
        setDepartmentId(n(departments[0]!.fk_dept_id));
      }
    } else {
      setDepartmentId(null);
    }

    // Academic year defaults (Angular selectedCollege → first AY DESC)
    if (academicYears.length > 0) {
      setAcademicYearId(n(academicYears[0]!.fk_academic_year_id));
    } else {
      setAcademicYearId(null);
      setFromDate(null);
      setToDate(null);
      setAyFrom(null);
      setAyTo(null);
    }
    // departments / academicYears are derived; collegeId is the driver
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run on college change
  }, [collegeId, lockDepartment, clearResults]);

  // Angular selectedAcademicYear — set from/to from AY bounds
  useEffect(() => {
    if (!academicYearId) {
      setFromDate(null);
      setToDate(null);
      setAyFrom(null);
      setAyTo(null);
      return;
    }
    const ay = academicYears.find(
      (r) => n(r.fk_academic_year_id) === academicYearId,
    );
    if (!ay) return;
    const f = parseDate(ay.ay_from_date);
    const t = parseDate(ay.ay_to_date);
    setAyFrom(f);
    setAyTo(t);
    setFromDate(f);
    setToDate(t);
    clearResults();
  }, [academicYearId, academicYears, clearResults]);

  const collegeOptions: SelectOption[] = useMemo(
    () =>
      collegeRows.map((c) => ({
        value: String(n(c.fk_college_id)),
        label: s(c.college_code) || s(c.collegeCode),
      })),
    [collegeRows],
  );

  const academicYearOptions: SelectOption[] = useMemo(
    () => [
      { value: "0", label: "Select" },
      ...academicYears.map((y) => ({
        value: String(n(y.fk_academic_year_id)),
        label: s(y.academic_year),
      })),
    ],
    [academicYears],
  );

  const departmentOptions: SelectOption[] = useMemo(() => {
    const opts = departments.map((d) => ({
      value: String(n(d.fk_dept_id)),
      label: s(d.dept_code) || s(d.deptCode),
    }));
    // Angular: Select (0) only when not principal
    if (!isPrincipal || isAdmin) {
      return [{ value: "0", label: "Select" }, ...opts];
    }
    return opts;
  }, [departments, isPrincipal, isAdmin]);

  const leaveTypeOptions: SelectOption[] = useMemo(
    () => [
      { value: "0", label: "Select" },
      ...leaveTypes.map((lt) => ({
        value: String(n(lt.leavetypeId ?? lt.leaveTypeId)),
        label: s(lt.leaveName),
      })),
    ],
    [leaveTypes],
  );

  const onEmployeeSearch = useCallback(
    async (term: string) => {
      if (!collegeId) {
        setEmployeeOptions([]);
        return;
      }
      const q = term.trim();
      if (q.length <= 4) {
        setEmployeeOptions([]);
        return;
      }
      setEmployeeSearchLoading(true);
      try {
        const list = canSearchCollegeWide
          ? await searchEmployeesForLeaveSummary(collegeId, q)
          : await searchEmployeesForLeaveSummary(
              collegeId,
              q,
              departmentId || undefined,
            );
        setEmployeeOptions(
          list
            .filter((r) => n(r.employeeId) > 0)
            .map((r) => ({
              value: String(n(r.employeeId)),
              label: employeeLabel(r),
            })),
        );
      } catch {
        setEmployeeOptions([]);
      } finally {
        setEmployeeSearchLoading(false);
      }
    },
    [collegeId, departmentId, canSearchCollegeWide],
  );

  async function handleGetList() {
    if (!collegeId) {
      toastError("College is required");
      return;
    }
    const fromYmd = toLeaveYmd(fromDate);
    const toYmd = toLeaveYmd(toDate);
    if (!fromYmd || !toYmd) {
      toastError("From Date and To Date are required");
      return;
    }
    if (fromDate && toDate && fromDate.getTime() > toDate.getTime()) {
      clearResults();
      toastError("From Date cannot be after To Date");
      return;
    }

    setReportLoading(true);
    clearResults();
    try {
      const list = await getEmpLeaveSummaryReport({
        collegeId,
        employeeId: employeeId || 0,
        departmentId: departmentId || 0,
        fromDate: fromYmd,
        toDate: toYmd,
        leaveTypeId: leaveTypeId || 0,
      });
      if (list.length === 0) {
        toastInfo("No records found");
        return;
      }
      setColumns(Object.keys(list[0] ?? {}));
      setRows(list);
    } catch (e) {
      toastError(getErrorMessage(e));
    } finally {
      setReportLoading(false);
    }
  }

  async function handleDownload() {
    if (!collegeId) return;
    const fromYmd = toLeaveYmd(fromDate);
    if (!fromYmd) {
      toastError("From Date is required");
      return;
    }
    setDownloading(true);
    try {
      await downloadEmpLeaveSummaryReport({
        collegeId,
        employeeId: employeeId || 0,
        academicYearId: academicYearId || 0,
        departmentId: departmentId || 0,
        leaveTypeId: leaveTypeId || 0,
        fromDate: fromYmd,
      });
    } catch (e) {
      toastError(getErrorMessage(e));
    } finally {
      setDownloading(false);
    }
  }

  function handleReset() {
    clearResults();
    setEmployeeId(null);
    setEmployeeOptions([]);
    setLeaveTypeId(0);
    if (collegeRows.length > 0) {
      setCollegeId(n(collegeRows[0]!.fk_college_id));
    }
  }

  const hasResults = rows.length > 0;

  // Angular `*ngIf="studentsList.length>0"` — table only after Get List returns rows.
  const columnDefs = useMemo<ColDef<AnyRow>[]>(() => {
    if (!hasResults || columns.length === 0) return [];
    return [
      {
        headerName: "SI.No",
        valueGetter: rowIndexGetter,
        width: 70,
        flex: 0,
      },
      ...columns.map(
        (col) =>
          ({
            field: col,
            headerName: col,
            minWidth: 120,
            valueFormatter: (p) =>
              p.value == null || p.value === "" ? "---" : String(p.value),
          }) as ColDef<AnyRow>,
      ),
    ];
  }, [columns, hasResults]);

  const getRowId = useCallback((p: { data?: AnyRow }) => {
    const row = p.data ?? {};
    const id =
      row.employeeId ??
      row.empId ??
      row.EmployeeId ??
      Object.values(row).slice(0, 4).join("|");
    return String(id);
  }, []);

  const loading = filtersLoading || reportLoading;

  return (
    <FilteredListPage
      title="Leave Summary Report"
      filtersCollapsible
      filters={
        <div className="space-y-3">
          <GlobalFilterBarRow>
            <GlobalFilterField label="College">
              <Select
                value={collegeId != null ? String(collegeId) : null}
                onChange={(v) => {
                  clearResults();
                  setCollegeId(v ? Number(v) : null);
                }}
                options={collegeOptions}
                placeholder="College"
                searchable
                isLoading={filtersLoading && collegeRows.length === 0}
              />
            </GlobalFilterField>
            <GlobalFilterField label="Academic Year">
              <Select
                value={academicYearId != null ? String(academicYearId) : "0"}
                onChange={(v) => {
                  clearResults();
                  const id = v ? Number(v) : 0;
                  setAcademicYearId(id > 0 ? id : null);
                }}
                options={academicYearOptions}
                placeholder="Select"
                searchable
                disabled={!collegeId}
              />
            </GlobalFilterField>
            <GlobalFilterField label="Department">
              <Select
                value={
                  departmentId != null && departmentId > 0
                    ? String(departmentId)
                    : "0"
                }
                onChange={(v) => {
                  clearResults();
                  setEmployeeId(null);
                  setEmployeeOptions([]);
                  const id = v ? Number(v) : 0;
                  setDepartmentId(id > 0 ? id : null);
                  // Angular department change also re-applies AY dates via selectedAcademicYear()
                  if (academicYearId) {
                    const ay = academicYears.find(
                      (r) => n(r.fk_academic_year_id) === academicYearId,
                    );
                    if (ay) {
                      setFromDate(parseDate(ay.ay_from_date));
                      setToDate(parseDate(ay.ay_to_date));
                    }
                  }
                }}
                options={departmentOptions}
                placeholder="Select"
                searchable
                disabled={!collegeId || lockDepartment}
              />
            </GlobalFilterField>
          </GlobalFilterBarRow>

          <GlobalFilterBarRow>
            <GlobalFilterField
              label="Employee"
              className="!min-w-[16rem] !flex-[1_1_20rem]"
            >
              <Select
                value={employeeId != null ? String(employeeId) : null}
                onChange={(v) => {
                  clearResults();
                  setEmployeeId(v ? Number(v) : null);
                }}
                options={employeeOptions}
                placeholder="Search by Employee name or Id."
                searchable
                clearable
                onSearch={onEmployeeSearch}
                isLoading={employeeSearchLoading}
                disabled={!collegeId}
              />
            </GlobalFilterField>
            <GlobalFilterField label="From Date">
              <DatePicker
                value={fromDate}
                onChange={(d) => {
                  clearResults();
                  setFromDate(d);
                }}
                placeholder="From Date"
                minDate={ayFrom ?? undefined}
                maxDate={ayTo ?? undefined}
              />
            </GlobalFilterField>
            <GlobalFilterField label="To Date">
              <DatePicker
                value={toDate}
                onChange={(d) => {
                  clearResults();
                  setToDate(d);
                }}
                placeholder="To Date"
                maxDate={ayTo ?? undefined}
              />
            </GlobalFilterField>
            <GlobalFilterField label="Leave Type">
              <Select
                value={String(leaveTypeId || 0)}
                onChange={(v) => {
                  clearResults();
                  setLeaveTypeId(v ? Number(v) : 0);
                }}
                options={leaveTypeOptions}
                placeholder="Select"
                searchable
              />
            </GlobalFilterField>
            <div className="ml-auto flex shrink-0 flex-wrap items-center gap-3 self-end pb-0.5">
              <Button
                type="button"
                className="h-8 text-[12px]"
                onClick={() => void handleGetList()}
                disabled={loading || !collegeId}
              >
                {reportLoading ? "Loading..." : "Get List"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-8 gap-1.5 text-[12px]"
                onClick={() => void handleDownload()}
                disabled={
                  downloading || rows.length === 0 || !collegeId || !fromDate
                }
                title="Download Report"
              >
                <Download className="h-3.5 w-3.5" />
                {downloading ? "Downloading..." : "Download"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-8 gap-1.5 text-[12px]"
                onClick={handleReset}
                title="Reset"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </Button>
            </div>
          </GlobalFilterBarRow>
        </div>
      }
      body={hasResults ? undefined : null}
      rowData={hasResults ? rows : undefined}
      columnDefs={hasResults ? columnDefs : undefined}
      loading={loading}
      pagination={hasResults}
      paginationPageSize={25}
      getRowId={getRowId}
      toolbar={
        hasResults
          ? {
              ...TOOLBAR,
              excelDocumentTitle: "Leave Summary Report",
              excelFileName: "Leave Summary Report.xls",
            }
          : undefined
      }
    />
  );
}
