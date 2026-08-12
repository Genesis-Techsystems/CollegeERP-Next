"use client";

/**
 * Department Wise Timetable Report —
 * Angular `reports/admin-timetable-reports/department-wise-timetable` parity.
 * Results render as a readable HTML matrix (Angular-style), not AG Grid.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { FileSpreadsheet, Printer } from "lucide-react";
import { DatePicker } from "@/common/components/date-picker";
import { DatePicker } from "@/common/components/date-picker";
import { Select } from "@/common/components/select";
import { escapeHtml, exportHtmlTableAsExcel } from "@/common/export-html-table";
import { FilteredPage } from "@/components/layout";
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
  getAttendanceCollegeDeptFilters,
  getCollegeById,
  getDepartmentWiseTimetableReport,
} from "@/services";
import {
  attendancePrintShell as timetablePrintShell,
  resolveAttendancePrintLogo as resolveTimetablePrintLogo,
  toPrintLogoUrl,
} from "@/app/(pages)/(protected)/reports/admin-attendance-reports/_lib/attendance-report-print";
import {
  buildDepartmentWiseMatrix,
  buildDepartmentWiseTableHtml,
  type DeptCourseCell,
  type WeekdayKey,
} from "../_lib/timetable-matrix";
import {
  distinctAcademicYears,
  distinctColleges,
  num,
  toSelectOptions,
  txt,
} from "../_lib/timetable-report-filters";

const REPORT_TITLE = "Department Wise Timetable Report";

const DEPT_KEYS = ["fk_dept_id", "deptId", "departmentId", "emp_dept_id"];

type DeptMatrixDisplayRow = {
  label: string;
  cells: (DeptCourseCell[] | undefined)[];
};

function pickDeptId(row: Record<string, unknown>): number {
  for (const k of DEPT_KEYS) {
    const v = num(row[k]);
    if (v > 0) return v;
  }
  return 0;
}

export default function DepartmentWiseTimetableReportPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isLoading: sessionLoading } = useSession();
  const { employeeId: loginEmployeeId } = useLoginEmployeeId(
    user,
    sessionLoading,
  );

  const orgId = useMemo(() => {
    if (typeof window === "undefined") return 0;
    return Number(
      globalThis.localStorage.getItem("organizationId") ??
        user?.organizationId ??
        0,
    );
  }, [user?.organizationId]);

  const empId = useMemo(() => {
    if (loginEmployeeId) return loginEmployeeId;
    if (typeof window === "undefined") return 0;
    return Number(globalThis.localStorage.getItem("employeeId") ?? 0);
  }, [loginEmployeeId]);

  const [collegeId, setCollegeId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [reportDate, setReportDate] = useState<Date | null>(() => new Date());
  /** Angular `isDisable` — when true, the Date field is enabled. */
  const [dateEnabled, setDateEnabled] = useState(true);
  const [reportDate, setReportDate] = useState<Date | null>(() => new Date());
  const [datesEnabled, setDatesEnabled] = useState(true);

  const isPrincipal = useMemo(() => {
    if (pathname.includes("staff-reports") || pathname.includes("principal")) {
      return true;
    }
    if (user?.isPrincipal) return true;
    if (
      user?.userRole?.toUpperCase().includes("PRINCIPAL") ||
      user?.roleName?.toUpperCase().includes("PRINCIPAL") ||
      user?.userTypeCode?.toUpperCase().includes("PRINCIPAL")
    ) {
      return true;
    }
    if (typeof window === "undefined") return false;
    const storage = globalThis.localStorage;
    const isPStorage =
      storage.getItem("isPRINCIPAL") === "true" ||
      storage.getItem("isPrincipal") === "true";
    const roleName = String(storage.getItem("roleName") ?? "").toUpperCase();
    const userRole = String(storage.getItem("userRole") ?? "").toUpperCase();
    const userTypeCode = String(
      storage.getItem("userTypeCode") ?? "",
    ).toUpperCase();
    const isAdminStorage = storage.getItem("isAdmin") === "true";

    if (
      isPStorage ||
      roleName.includes("PRINCIPAL") ||
      userRole.includes("PRINCIPAL") ||
      userTypeCode.includes("PRIN")
    ) {
      return true;
    }
    if (
      !user?.isAdmin &&
      !isAdminStorage &&
      (userTypeCode === "STAFF" || userRole === "STAFF")
    ) {
      return true;
    }
    return false;
  }, [
    pathname,
    user?.isPrincipal,
    user?.userRole,
    user?.roleName,
    user?.userTypeCode,
    user?.isAdmin,
  ]);

  const [weekdayKeys, setWeekdayKeys] = useState<WeekdayKey[]>([]);
  const [matrixRows, setMatrixRows] = useState<DeptMatrixDisplayRow[]>([]);
  const [htmlRows, setHtmlRows] = useState<
    ReturnType<typeof buildDepartmentWiseMatrix>["studentTimetable"]
  >([]);
  const [dataDetails, setDataDetails] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [showTable, setShowTable] = useState(false);

  const collegeLogo = useCollegeLogo(collegeId ? Number(collegeId) : null);

  const clearResults = useCallback(() => {
    setWeekdayKeys([]);
    setMatrixRows([]);
    setHtmlRows([]);
    setShowTable(false);
    setDataDetails("");
    setCollegeName("");
  }, []);

  const filtersQuery = useQuery({
    queryKey: QK.timetableReports.clsFilters(),
    queryFn: () => fetchTimetableFilterRows("cls_timtable_filters", 0),
  });

  const deptFiltersQuery = useQuery({
    queryKey: QK.attendanceReports.collegeDeptFilters(orgId, empId),
    queryFn: () => getAttendanceCollegeDeptFilters(orgId, empId),
    enabled: orgId > 0 && empId > 0,
  });

  const filterRows = useMemo(
    () => (Array.isArray(filtersQuery.data) ? filtersQuery.data : []),
    [filtersQuery.data],
  );

  const departmentData = useMemo(() => {
    const rows = deptFiltersQuery.data?.departmentData ?? [];
    return Array.isArray(rows) ? rows : [];
  }, [deptFiltersQuery.data?.departmentData]);

  const colleges = useMemo(() => distinctColleges(filterRows), [filterRows]);
  const academicYears = useMemo(
    () => distinctAcademicYears(filterRows, Number(collegeId || 0)),
    [filterRows, collegeId],
  );

  const departments = useMemo(() => {
    const cid = Number(collegeId || 0);
    const filtered = departmentData.filter(
      (r) => !cid || num(r.fk_college_id ?? r.collegeId) === cid,
    );
    const seen = new Set<number>();
    const out: typeof filtered = [];
    for (const r of filtered) {
      const id = pickDeptId(r);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push(r);
    }
    return out;
  }, [departmentData, collegeId]);

  const collegeOptions = useMemo(
    () =>
      toSelectOptions(
        colleges,
        ["fk_college_id", "collegeId"],
        ["college_code", "collegeCode"],
      ),
    [colleges],
  );
  const ayOptions = useMemo(
    () =>
      toSelectOptions(
        academicYears,
        ["fk_academic_year_id", "academicYearId"],
        ["academic_year", "academicYear"],
      ),
    [academicYears],
  );
  const departmentOptions = useMemo(
    () =>
      departments.map((r) => ({
        value: String(pickDeptId(r)),
        label: txt(r.dept_code ?? r.deptCode ?? r.department_code),
      })),
    [departments],
  );

  useEffect(() => {
    if (!colleges.length) return;
    if (
      !colleges.some(
        (r) => num(r.fk_college_id ?? r.collegeId) === Number(collegeId),
      )
    ) {
      setCollegeId(
        String(num(colleges[0].fk_college_id ?? colleges[0].collegeId)),
      );
    }
  }, [colleges, collegeId]);

  useEffect(() => {
    if (!academicYears.length) {
      setAcademicYearId("");
      return;
    }
    if (
      !academicYears.some(
        (r) =>
          num(r.fk_academic_year_id ?? r.academicYearId) ===
          Number(academicYearId),
      )
    ) {
      setAcademicYearId(
        String(
          num(
            academicYears[0].fk_academic_year_id ??
              academicYears[0].academicYearId,
          ),
        ),
      );
    }
  }, [academicYears, academicYearId]);

  useEffect(() => {
    setDepartmentId("");
    clearResults();
  }, [collegeId, clearResults]);

  const tableHtml = useMemo(() => {
    if (!showTable || htmlRows.length === 0) return "";
    return buildDepartmentWiseTableHtml({
      keys: weekdayKeys,
      rows: htmlRows,
    });
  }, [htmlRows, showTable, weekdayKeys]);

  const handleGetList = async () => {
    const cid = Number(collegeId || 0);
    const ay = Number(academicYearId || 0);
    const dept = Number(departmentId || 0);
    if (!cid || !ay || !dept) {
      toastInfo("College, Academic Year and Department are required");
      return;
    }
    if (!reportDate) {
      toastInfo("Date is required");
      return;
    }

    const college = colleges.find(
      (r) => num(r.fk_college_id ?? r.collegeId) === cid,
    );
    const ayRow = academicYears.find(
      (r) => num(r.fk_academic_year_id ?? r.academicYearId) === ay,
    );
    const deptRow = departments.find((r) => pickDeptId(r) === dept);

    const details = [
      txt(college?.college_code ?? college?.collegeCode),
      txt(ayRow?.academic_year ?? ayRow?.academicYear),
      txt(deptRow?.dept_code ?? deptRow?.deptCode),
    ]
      .filter(Boolean)
      .join(" / ");

    const fromDate =
      isPrincipal && datesEnabled && reportDate
        ? format(reportDate, "yyyy-MM-dd")
        : format(reportDate, "yyyy-MM-dd");

    setLoadingList(true);
    clearResults();
    setDataDetails(details);
    try {
      const [raw, collegeFull] = await Promise.all([
        getDepartmentWiseTimetableReport({
          fromDate,
          collegeId: cid,
          academicYearId: ay,
          departmentId: dept,
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
      const matrix = buildDepartmentWiseMatrix(raw);
      setWeekdayKeys(matrix.keys);
      setHtmlRows(matrix.studentTimetable);
      setMatrixRows(
        matrix.studentTimetable.map((r) => ({
          label: r.Faculty,
          cells: matrix.keys.map((k) => r.cells[k.weekday_name]),
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
    <FilteredPage
      title={pageTitle}
      filters={
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[7.5rem] flex-1 basis-[7.5rem] sm:min-w-[8.5rem]">
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
          </div>
          <div className="min-w-[7.5rem] flex-1 basis-[7.5rem] sm:min-w-[8.5rem]">
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
          </div>
          <div className="min-w-[7.5rem] flex-1 basis-[7.5rem] sm:min-w-[8.5rem]">
            <Select
              label="Department"
              required
              value={departmentId || null}
              onChange={(v) => {
                setDepartmentId(v ?? "");
                clearResults();
              }}
              options={departmentOptions}
              placeholder="Department"
              disabled={!collegeId || deptFiltersQuery.isLoading}
              isLoading={deptFiltersQuery.isLoading}
            />
          </div>
          <div className="min-w-[9rem] flex-1 basis-[9rem] sm:min-w-[10rem]">
            <DatePicker
              label="Date"
              value={reportDate}
              onChange={(d) => {
                setReportDate(d);
                clearResults();
              }}
              displayFormat="dd/MM/yyyy"
              clearable={false}
              placeholder="Date"
              disabled={!dateEnabled}
            />
          </div>
          <div className="flex h-9 items-center gap-2 px-1">
            <Checkbox
              id="dept-wise-date-enabled"
              checked={dateEnabled}
              onCheckedChange={(checked) => {
                const enabled = checked === true;
                setDateEnabled(enabled);
                if (enabled) setReportDate(new Date());
                clearResults();
              }}
            />
            <Label htmlFor="dept-wise-date-enabled" className="text-[12px]">
              {dateEnabled ? "enable" : "Disable"}
            </Label>
          </div>
          {isPrincipal && (
            <>
              <div className="min-w-[7.5rem] flex-1 basis-[7.5rem] sm:min-w-[8.5rem]">
                <DatePicker
                  label="Date"
                  value={reportDate}
                  onChange={(d) => {
                    setReportDate(d);
                    clearResults();
                  }}
                  displayFormat="dd/MM/yyyy"
                  clearable={false}
                  placeholder="Date"
                  disabled={!datesEnabled}
                />
              </div>
              <div className="flex h-9 items-center gap-2 px-1">
                <Checkbox
                  id="dept-tt-date-enabled"
                  checked={datesEnabled}
                  onCheckedChange={(checked) => {
                    const enabled = checked === true;
                    setDatesEnabled(enabled);
                    if (enabled && !reportDate) {
                      setReportDate(new Date());
                    }
                    clearResults();
                  }}
                />
                <Label htmlFor="dept-tt-date-enabled" className="text-[12px]">
                  enable
                </Label>
              </div>
            </>
          )}
          <Button
            type="button"
            className="h-9 w-fit px-4"
            disabled={loadingList}
            onClick={() => void handleGetList()}
          >
            {loadingList ? "Loading…" : "Get Timetable"}
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
      body={
        showTable ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-end gap-2">
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
            </div>

            <div className="rounded border border-[#d0d7de]">
              <table className="w-full table-fixed border-collapse text-[12px] leading-snug">
                <thead>
                  <tr className="bg-[#d9edf7]">
                    <th className="w-[12%] border border-[#c5d6e0] bg-[#d9edf7] px-2 py-3 text-center font-semibold text-[#0b4f8a]">
                      Employee
                    </th>
                    {weekdayKeys.map((key) => (
                      <th
                        key={key.weekday_name}
                        className="border border-[#c5d6e0] px-2 py-3 text-center align-middle font-semibold text-[#0b4f8a]"
                      >
                        {key.weekday_name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrixRows.map((row) => (
                    <tr key={row.label} className="bg-white">
                      <th className="border border-[#e0e0e0] bg-white px-2 py-3 text-center font-semibold text-blue-600">
                        {row.label}
                      </th>
                      {row.cells.map((courses, idx) => {
                        const isEmpty = !courses?.length;
                        return (
                          <td
                            key={`${row.label}-${weekdayKeys[idx]?.weekday_name ?? idx}`}
                            className={`border border-[#e0e0e0] px-2 py-2 text-center align-middle text-[12px] text-foreground ${
                              isEmpty
                                ? "bg-[#f5f5f5] text-muted-foreground"
                                : "bg-white"
                            }`}
                            style={{ wordBreak: "break-word" }}
                          >
                            {courses?.map((co, periodIdx) => (
                              <p
                                key={`${row.label}-${idx}-${periodIdx}-${co.time}-${co.sub}`}
                                className="my-2.5 border-b border-[#dedede] text-center font-medium leading-snug"
                              >
                                {co.sub ? <span>{co.sub}</span> : null}
                                {co.batch ? (
                                  <>
                                    <br />
                                    <span className="text-[#888888]">
                                      {co.batch}
                                    </span>
                                  </>
                                ) : null}
                                {co.time ? (
                                  <>
                                    <br />
                                    <span className="text-[#888888]">
                                      {co.time}
                                    </span>
                                  </>
                                ) : null}
                              </p>
                            ))}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : undefined
      }
    />
  );
}
