"use client";

/**
 * Mentor Fortnight Report —
 * Angular `reports/admin-attendance-reports/mentor-fortnight-report` parity.
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
import { Label } from "@/components/ui/label";
import { printHtmlInIframe } from "@/lib/print";
import { cn } from "@/lib/utils";
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
  downloadMentorFortnightReport,
  getAttendanceTimetableFilters,
  getMentorFortnightReport,
} from "@/services";
import {
  attendancePrintShell,
  resolveAttendancePrintLogo,
  toPrintLogoUrl,
} from "../_lib/attendance-report-print";

const PRINT_REPORT_TITLE =
  "Fortnight Consolidated List of Students having Poor Attendance";

type AnyRow = Record<string, unknown>;

type FortnightRow = {
  student: string;
  className: string;
  studentMobile: string;
  parentMobile: string;
  mentor: string;
  attendancePct: string;
};

const EXCEL_COLUMNS: { key: string; header: string }[] = [
  { key: "siNo", header: "SI.No" },
  { key: "student", header: "Student" },
  { key: "className", header: "Class" },
  { key: "studentMobile", header: "Student Mobile" },
  { key: "parentMobile", header: "Parent Mobile" },
  { key: "mentor", header: "Mentor" },
  { key: "attendancePct", header: "Attendance %" },
];

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<FortnightRow>,
  student: {
    field: "student",
    headerName: "Student",
    minWidth: 200,
  } as ColDef<FortnightRow>,
  className: {
    field: "className",
    headerName: "Class",
    minWidth: 140,
  } as ColDef<FortnightRow>,
  studentMobile: {
    field: "studentMobile",
    headerName: "Student Mobile",
    minWidth: 130,
  } as ColDef<FortnightRow>,
  parentMobile: {
    field: "parentMobile",
    headerName: "Parent Mobile",
    minWidth: 130,
  } as ColDef<FortnightRow>,
  mentor: {
    field: "mentor",
    headerName: "Mentor",
    minWidth: 140,
  } as ColDef<FortnightRow>,
  attendancePct: {
    field: "attendancePct",
    headerName: "Attendance %",
    minWidth: 110,
  } as ColDef<FortnightRow>,
};

function mapFortnightRow(row: AnyRow): FortnightRow {
  const name = String(row.Student_Name ?? row.student_name ?? "");
  const roll = String(row.Roll_no ?? row.roll_no ?? row.Roll_No ?? "");
  const student =
    name && roll ? `${name} (${roll})` : name || roll || "";
  return {
    student,
    className: String(row.Class ?? row.class ?? ""),
    studentMobile: String(
      row.Student_Mobile ?? row.student_mobile ?? "",
    ),
    parentMobile: String(row.Parent_Mobile ?? row.parent_mobile ?? ""),
    mentor: String(
      row.Mentor ?? row.Counselor ?? row.mentor ?? row.counselor ?? "",
    ),
    attendancePct: String(
      row.Attendance_Percentage ??
        row.attendance_percentage ??
        row.Attendance_percentage ??
        "",
    ),
  };
}

export default function MentorFortnightReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const orgId = Number(
    globalThis?.localStorage?.getItem("organizationId") ?? 0,
  );
  const empId = Number(globalThis?.localStorage?.getItem("employeeId") ?? 0);

  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [academicYearId, setAcademicYearId] = useState<string>("0");
  const [courseId, setCourseId] = useState<string>("0");
  const [courseGroupId, setCourseGroupId] = useState<string>("0");
  const [courseYearId, setCourseYearId] = useState<string>("0");
  // Avoid SSR/client Date mismatch — set today after mount (Angular: moment() today).
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [maxDate, setMaxDate] = useState<Date | undefined>(undefined);
  // Angular npn-slider 0–100
  const [fromPercentage, setFromPercentage] = useState(0);
  const [toPercentage, setToPercentage] = useState(100);

  const [rows, setRows] = useState<AnyRow[]>([]);
  const [collegeName, setCollegeName] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showTable, setShowTable] = useState(false);

  const collegeLogo = useCollegeLogo(collegeId ? Number(collegeId) : null);

  useEffect(() => {
    const today = new Date();
    setMaxDate(today);
    setFromDate((prev) => prev ?? today);
    setToDate((prev) => prev ?? today);
  }, []);

  const clearResults = useCallback(() => {
    setRows([]);
    setShowTable(false);
    setCollegeName("");
  }, []);

  const filtersQuery = useQuery({
    queryKey: QK.attendanceReports.timetableFilters(orgId, empId),
    queryFn: () => getAttendanceTimetableFilters(orgId, empId),
    enabled: orgId > 0 && empId > 0,
  });

  const filtersData = useMemo(
    () => (filtersQuery.data?.filtersData ?? []) as FilterRow[],
    [filtersQuery.data?.filtersData],
  );

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

  // Angular: academic years are distinct rows from cls_timtable_filters for the college
  // (not a separate clg_filters_ay group).
  const ayOptions = useMemo(() => {
    const cid = Number(collegeId ?? 0);
    if (!cid) return [];
    const rows = dedupeBy(
      filtersData.filter(
        (r) => pickNum(r, ["fk_college_id", "collegeId"]) === cid,
      ),
      (r) => pickNum(r, ["fk_academic_year_id", "academicYearId"]),
    ).sort(
      (a, b) =>
        Number.parseInt(pickText(b, ["academic_year", "academicYear"]), 10) -
        Number.parseInt(pickText(a, ["academic_year", "academicYear"]), 10),
    );
    return rows.map((r) => ({
      value: String(pickNum(r, ["fk_academic_year_id", "academicYearId"])),
      label: pickText(r, ["academic_year", "academicYear"]) || "—",
    }));
  }, [filtersData, collegeId]);

  const courseOptions = useMemo(() => {
    const cid = Number(collegeId ?? 0);
    const ay = Number(academicYearId || 0);
    if (!cid || !ay) return [];
    return dedupeBy(
      filtersData.filter(
        (r) =>
          pickNum(r, ["fk_college_id", "collegeId"]) === cid &&
          pickNum(r, ["fk_academic_year_id", "academicYearId"]) === ay,
      ),
      (r) => pickNum(r, ["fk_course_id", "courseId"]),
    ).map((r) => ({
      value: String(pickNum(r, ["fk_course_id", "courseId"])),
      label: pickText(r, ["course_code", "courseCode", "course_name"]),
    }));
  }, [filtersData, collegeId, academicYearId]);

  const groupOptions = useMemo(() => {
    const cid = Number(collegeId ?? 0);
    const ay = Number(academicYearId || 0);
    const cr = Number(courseId || 0);
    if (!cid || !ay || !cr) return [];
    return dedupeBy(
      filtersData.filter(
        (r) =>
          pickNum(r, ["fk_college_id", "collegeId"]) === cid &&
          pickNum(r, ["fk_academic_year_id", "academicYearId"]) === ay &&
          pickNum(r, ["fk_course_id", "courseId"]) === cr,
      ),
      (r) => pickNum(r, ["fk_course_group_id", "courseGroupId"]),
    ).map((r) => ({
      value: String(pickNum(r, ["fk_course_group_id", "courseGroupId"])),
      label: pickText(r, ["group_code", "groupCode", "courseGroupCode"]),
    }));
  }, [filtersData, collegeId, academicYearId, courseId]);

  const yearOptions = useMemo(() => {
    const cid = Number(collegeId ?? 0);
    const ay = Number(academicYearId || 0);
    const cr = Number(courseId || 0);
    const g = Number(courseGroupId || 0);
    if (!cid || !ay || !cr || !g) return [];
    return dedupeBy(
      filtersData.filter(
        (r) =>
          pickNum(r, ["fk_college_id", "collegeId"]) === cid &&
          pickNum(r, ["fk_academic_year_id", "academicYearId"]) === ay &&
          pickNum(r, ["fk_course_id", "courseId"]) === cr &&
          pickNum(r, ["fk_course_group_id", "courseGroupId"]) === g,
      ),
      (r) => pickNum(r, ["fk_course_year_id", "courseYearId"]),
    )
      .sort(
        (a, b) =>
          pickNum(a, ["year_order", "sortOrder"]) -
          pickNum(b, ["year_order", "sortOrder"]),
      )
      .map((r) => ({
        value: String(pickNum(r, ["fk_course_year_id", "courseYearId"])),
        label: pickText(r, ["course_year_name", "courseYearName"]),
      }));
  }, [filtersData, collegeId, academicYearId, courseId, courseGroupId]);

  useEffect(() => {
    if (collegeId || collegeOptions.length === 0) return;
    setCollegeId(collegeOptions[0].value);
  }, [collegeId, collegeOptions]);

  useEffect(() => {
    if (!collegeId) return;
    if (ayOptions.length === 0) {
      setAcademicYearId("0");
      setCourseId("0");
      setCourseGroupId("0");
      setCourseYearId("0");
      return;
    }
    const stillValid = ayOptions.some((o) => o.value === academicYearId);
    if (!stillValid) setAcademicYearId(ayOptions[0].value);
  }, [collegeId, ayOptions]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!collegeId || !Number(academicYearId || 0)) return;
    if (courseOptions.length === 0) {
      setCourseId("0");
      setCourseGroupId("0");
      setCourseYearId("0");
      return;
    }
    const stillValid = courseOptions.some((o) => o.value === courseId);
    if (!stillValid) setCourseId(courseOptions[0].value);
  }, [collegeId, academicYearId, courseOptions]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!courseId || courseId === "0") {
      setCourseGroupId("0");
      setCourseYearId("0");
      return;
    }
    if (groupOptions.length === 0) {
      setCourseGroupId("0");
      setCourseYearId("0");
      return;
    }
    const stillValid = groupOptions.some((o) => o.value === courseGroupId);
    if (!stillValid) setCourseGroupId(groupOptions[0].value);
  }, [courseId, groupOptions]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!courseGroupId || courseGroupId === "0") {
      setCourseYearId("0");
      return;
    }
    // Angular defaults to first course year (e.g. SEM1)
    if (yearOptions.length === 0) {
      setCourseYearId("0");
      return;
    }
    const stillValid = yearOptions.some((o) => o.value === courseYearId);
    if (!stillValid) setCourseYearId(yearOptions[0].value);
  }, [courseGroupId, yearOptions]); // eslint-disable-line react-hooks/exhaustive-deps

  const onCollegeChange = (v: string | null) => {
    setCollegeId(v);
    setAcademicYearId("0");
    setCourseId("0");
    setCourseGroupId("0");
    setCourseYearId("0");
    clearResults();
  };

  const displayRows = useMemo(
    () => rows.map(mapFortnightRow),
    [rows],
  );

  const exportRows = useMemo(
    () =>
      displayRows.map((row, i) => ({
        siNo: i + 1,
        ...row,
      })),
    [displayRows],
  );

  const columnDefs = useMemo<ColDef<FortnightRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.student,
      COL_DEFS.className,
      COL_DEFS.studentMobile,
      COL_DEFS.parentMobile,
      COL_DEFS.mentor,
      COL_DEFS.attendancePct,
    ],
    [],
  );

  const reportParams = () => {
    const fromPct = Math.min(100, Math.max(0, fromPercentage));
    const toPct = Math.min(100, Math.max(0, toPercentage));
    return {
      collegeId: Number(collegeId ?? 0),
      academicYearId: Number(academicYearId || 0),
      courseId: Number(courseId || 0),
      courseGroupId: Number(courseGroupId || 0),
      courseYearId: Number(courseYearId || 0),
      fromDate: fromDate ? format(fromDate, "yyyy-MM-dd") : "",
      toDate: toDate ? format(toDate, "yyyy-MM-dd") : "",
      fromPercentage: Math.min(fromPct, toPct),
      toPercentage: Math.max(fromPct, toPct),
    };
  };

  const validateFilters = () => {
    const cid = Number(collegeId ?? 0);
    if (!cid) {
      toastInfo("College is required");
      return false;
    }
    if (!Number(academicYearId || 0)) {
      toastInfo("Academic Year is required");
      return false;
    }
    if (!Number(courseId || 0)) {
      toastInfo("Course is required");
      return false;
    }
    if (!Number(courseGroupId || 0)) {
      toastInfo("Course Group is required");
      return false;
    }
    if (!fromDate) {
      toastInfo("From Date is required");
      return false;
    }
    if (!toDate) {
      toastInfo("To Date is required");
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
      const raw = await getMentorFortnightReport(params);
      if (raw.length === 0) {
        toastInfo("No records found.");
        return;
      }
      const fromData = String(raw[0]?.College_Name ?? raw[0]?.college_name ?? "");
      setCollegeName(fromData || name);
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
      await downloadMentorFortnightReport(reportParams());
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
    <FilteredListPage<FortnightRow>
      title="Mentor Fortnight Report"
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
              label="Academic Year"
              required
              value={academicYearId}
              onChange={(v) => {
                setAcademicYearId(v ?? "0");
                clearResults();
              }}
              options={ayOptions}
              placeholder="Academic Year"
            />
            <Select
              label="Course"
              required
              value={courseId}
              onChange={(v) => {
                setCourseId(v ?? "0");
                clearResults();
              }}
              options={courseOptions}
              placeholder="Course"
              disabled={!collegeId}
            />
            <Select
              label="Course Group"
              required
              value={courseGroupId}
              onChange={(v) => {
                setCourseGroupId(v ?? "0");
                clearResults();
              }}
              options={groupOptions}
              placeholder="Course Group"
              disabled={!courseId || courseId === "0"}
            />
            <Select
              label="Course Year"
              value={courseYearId}
              onChange={(v) => {
                setCourseYearId(v ?? "0");
                clearResults();
              }}
              options={yearOptions}
              placeholder="Course Year"
            />
            <DatePicker
              label="From Date"
              required
              value={fromDate}
              onChange={(d) => {
                setFromDate(d);
                if (d && toDate && toDate < d) setToDate(d);
                clearResults();
              }}
              displayFormat="dd/MM/yyyy"
              clearable={false}
              placeholder="From Date"
              maxDate={maxDate}
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
              maxDate={maxDate}
            />
            {/* Angular: Attendance(%) Range — npn-slider 0–100 */}
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-2 xl:col-span-2">
              <Label>Attendance(%) Range</Label>
              <div className="flex items-center gap-3 pt-1">
                <span className="w-7 shrink-0 text-xs text-muted-foreground">
                  0
                </span>
                <div className="relative h-8 flex-1">
                  <div className="pointer-events-none absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-slate-200" />
                  <div
                    className="pointer-events-none absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-[#1565c0]"
                    style={{
                      left: `${fromPercentage}%`,
                      width: `${Math.max(0, toPercentage - fromPercentage)}%`,
                    }}
                  />
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={fromPercentage}
                    aria-label="Attendance from percent"
                    className={cn(
                      "pointer-events-none absolute inset-0 z-[1] h-8 w-full appearance-none bg-transparent",
                      "[&::-webkit-slider-thumb]:pointer-events-auto",
                      "[&::-webkit-slider-thumb]:relative [&::-webkit-slider-thumb]:z-[2]",
                      "[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4",
                      "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full",
                      "[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white",
                      "[&::-webkit-slider-thumb]:bg-[#1565c0] [&::-webkit-slider-thumb]:shadow",
                      "[&::-moz-range-thumb]:pointer-events-auto",
                      "[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4",
                      "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2",
                      "[&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-[#1565c0]",
                    )}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setFromPercentage(Math.min(v, toPercentage));
                      clearResults();
                    }}
                  />
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={toPercentage}
                    aria-label="Attendance to percent"
                    className={cn(
                      "pointer-events-none absolute inset-0 z-[2] h-8 w-full appearance-none bg-transparent",
                      "[&::-webkit-slider-thumb]:pointer-events-auto",
                      "[&::-webkit-slider-thumb]:relative [&::-webkit-slider-thumb]:z-[3]",
                      "[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4",
                      "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full",
                      "[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white",
                      "[&::-webkit-slider-thumb]:bg-[#1565c0] [&::-webkit-slider-thumb]:shadow",
                      "[&::-moz-range-thumb]:pointer-events-auto",
                      "[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4",
                      "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2",
                      "[&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-[#1565c0]",
                    )}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setToPercentage(Math.max(v, fromPercentage));
                      clearResults();
                    }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-xs text-muted-foreground">
                  100
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {fromPercentage}% – {toPercentage}%
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              className="h-9 w-fit px-4"
              disabled={loadingList}
              onClick={() => void handleGetList()}
            >
              {loadingList ? "Loading…" : "Get Fortnight List"}
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
      rowData={showTable ? displayRows : []}
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
