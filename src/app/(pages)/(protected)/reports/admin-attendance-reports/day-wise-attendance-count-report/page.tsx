"use client";

/**
 * Day-wise Attendance Summary Report —
 * Admin: `reports/admin-attendance-reports/day-wise-attendance-count-report`
 * HOD:   `staff-reports/admin-attendance-reports/day-wise-attendance-count-report`
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
  filterColleges,
  pickNum,
  pickText,
  type FilterRow,
} from "@/app/(pages)/(protected)/accounts-and-fees/fee-masters/_lib/fee-master-filters";
import {
  getAttendanceTimetableFilters,
  getDayWiseStdAttendanceSummary,
} from "@/services";
import {
  attendancePrintShell,
  resolveAttendancePrintLogo,
  toPrintLogoUrl,
} from "../_lib/attendance-report-print";

const PRINT_REPORT_TITLE = "Day-Wise Students Attendance Summary Report";

type AnyRow = Record<string, unknown>;

type DayWiseRow = {
  courseDetails: string;
  noOfPresent: string;
  noOfAbsentees: string;
  total: string;
};

const EXCEL_COLUMNS: { key: string; header: string }[] = [
  { key: "siNo", header: "SI.No" },
  { key: "courseDetails", header: "Course Details" },
  { key: "noOfPresent", header: "NO of Present" },
  { key: "noOfAbsentees", header: "No Of Absentees" },
  { key: "total", header: "Total" },
];

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<DayWiseRow>,
  courseDetails: {
    field: "courseDetails",
    headerName: "Course Details",
    minWidth: 220,
  } as ColDef<DayWiseRow>,
  noOfPresent: {
    field: "noOfPresent",
    headerName: "NO of Present",
    minWidth: 120,
  } as ColDef<DayWiseRow>,
  noOfAbsentees: {
    field: "noOfAbsentees",
    headerName: "No Of Absentees",
    minWidth: 130,
  } as ColDef<DayWiseRow>,
  total: {
    field: "total",
    headerName: "Total",
    minWidth: 100,
  } as ColDef<DayWiseRow>,
};

/** Proc returns e.g. Present_Classes / Absent_Classes / Total_Classes (Angular headers differ). */
function pickRowValue(row: AnyRow, keys: string[]): string {
  const asText = (v: unknown): string | null => {
    if (v == null) return null;
    // Keep numeric 0 (common for present/absent counts)
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

function mapDayWiseRow(row: AnyRow): DayWiseRow {
  return {
    courseDetails: pickRowValue(row, [
      "academic_details",
      "Academic_Details",
      "Academic Details",
      "course_details",
      "Course_Details",
      "Course Details",
    ]),
    // API: Present_Classes (Angular header: "NO of Present")
    noOfPresent: pickRowValue(row, [
      "Present_Classes",
      "present_classes",
      "PresentClasses",
      "NO of Present",
      "No of Present",
      "No_of_Present",
      "no_of_present",
      "NoOfPresent",
      "present",
    ]),
    // API: Absent_Classes (Angular header: "No Of Absentees")
    noOfAbsentees: pickRowValue(row, [
      "Absent_Classes",
      "absent_classes",
      "AbsentClasses",
      "No Of Absentees",
      "No of Absentees",
      "No_of_Absentees",
      "no_of_absentees",
      "NoOfAbsentees",
      "absentees",
    ]),
    // API: Total_Classes (Angular header: "Total")
    total: pickRowValue(row, [
      "Total_Classes",
      "total_classes",
      "TotalClasses",
      "Total",
      "total",
      "TOTAL",
    ]),
  };
}

export default function DayWiseAttendanceCountReportPage() {
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
  // Angular: fDate defaults to today (`genericFunctions.moment()`)
  const [classDate, setClassDate] = useState<Date | null>(null);
  const [maxDate, setMaxDate] = useState<Date | undefined>(undefined);

  const [rows, setRows] = useState<AnyRow[]>([]);
  const [dataDetails, setDataDetails] = useState("");
  const [collegeName, setCollegeName] = useState("");
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
    queryKey: QK.attendanceReports.timetableFilters(orgId, empId),
    queryFn: () => getAttendanceTimetableFilters(orgId, empId),
    enabled: orgId > 0 && empId > 0,
  });

  const filtersData = useMemo(
    () => (filtersQuery.data?.filtersData ?? []) as FilterRow[],
    [filtersQuery.data?.filtersData],
  );

  useEffect(() => {
    const today = new Date();
    setMaxDate(today);
    setClassDate((prev) => prev ?? today);
  }, []);

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

  // Angular `selectedCollege`: distinct academic years from cls_timtable_filters
  const ayOptions = useMemo(() => {
    const cid = Number(collegeId ?? 0);
    if (!cid) return [];
    return dedupeBy(
      filtersData.filter(
        (r) => pickNum(r, ["fk_college_id", "collegeId"]) === cid,
      ),
      (r) => pickNum(r, ["fk_academic_year_id", "academicYearId"]),
    )
      .sort(
        (a, b) =>
          Number.parseInt(pickText(b, ["academic_year", "academicYear"]), 10) -
          Number.parseInt(pickText(a, ["academic_year", "academicYear"]), 10),
      )
      .map((r) => ({
        value: String(pickNum(r, ["fk_academic_year_id", "academicYearId"])),
        label: pickText(r, ["academic_year", "academicYear"]) || "—",
      }));
  }, [filtersData, collegeId]);

  // Angular `selectedAcademicYear`: courses for college + academic year
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

  // Angular Course Group after Course
  const groupOptions = useMemo(() => {
    const cid = Number(collegeId ?? 0);
    const ay = Number(academicYearId || 0);
    const crs = Number(courseId || 0);
    if (!cid || !ay || !crs) return [];
    return dedupeBy(
      filtersData.filter(
        (r) =>
          pickNum(r, ["fk_college_id", "collegeId"]) === cid &&
          pickNum(r, ["fk_academic_year_id", "academicYearId"]) === ay &&
          pickNum(r, ["fk_course_id", "courseId"]) === crs,
      ),
      (r) => pickNum(r, ["fk_course_group_id", "courseGroupId"]),
    ).map((r) => ({
      value: String(pickNum(r, ["fk_course_group_id", "courseGroupId"])),
      label: pickText(r, ["group_code", "groupCode"]) || "—",
    }));
  }, [filtersData, collegeId, academicYearId, courseId]);

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
      return;
    }
    const stillValid = courseOptions.some((o) => o.value === courseId);
    if (!stillValid) setCourseId(courseOptions[0].value);
  }, [collegeId, academicYearId, courseOptions]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!Number(courseId || 0)) {
      setCourseGroupId("0");
      return;
    }
    if (groupOptions.length === 0) {
      setCourseGroupId("0");
      return;
    }
    const stillValid = groupOptions.some((o) => o.value === courseGroupId);
    if (!stillValid) setCourseGroupId(groupOptions[0].value);
  }, [courseId, groupOptions]); // eslint-disable-line react-hooks/exhaustive-deps

  const onCollegeChange = (v: string | null) => {
    setCollegeId(v);
    setAcademicYearId("0");
    setCourseId("0");
    setCourseGroupId("0");
    clearResults();
  };

  const displayRows = useMemo(() => rows.map(mapDayWiseRow), [rows]);

  const exportRows = useMemo(
    () =>
      displayRows.map((row, i) => ({
        siNo: i + 1,
        ...row,
      })),
    [displayRows],
  );

  const columnDefs = useMemo<ColDef<DayWiseRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.courseDetails,
      COL_DEFS.noOfPresent,
      COL_DEFS.noOfAbsentees,
      COL_DEFS.total,
    ],
    [],
  );

  // Angular: `${collegeCode}/${ay}/${course}${group}( ${date} )`
  const buildDataDetails = () => {
    const collegeCode =
      pickText(selectedCollegeRow, ["college_code", "collegeCode"]) ||
      collegeOptions.find((o) => o.value === collegeId)?.label ||
      "";
    const ay = ayOptions.find((o) => o.value === academicYearId)?.label || "";
    const course = courseOptions.find((o) => o.value === courseId)?.label || "";
    const group =
      groupOptions.find((o) => o.value === courseGroupId)?.label || "";
    const dateStr = classDate ? format(classDate, "yyyy-MMM-dd") : "";
    return `${collegeCode}/${ay}/${course}${group}( ${dateStr} )`;
  };

  const handleGetList = async () => {
    const cid = Number(collegeId ?? 0);
    if (!cid) {
      toastInfo("College is required");
      return;
    }
    if (!Number(academicYearId || 0)) {
      toastInfo("Academic Year is required");
      return;
    }
    if (!Number(courseId || 0)) {
      toastInfo("Course is required");
      return;
    }
    if (!Number(courseGroupId || 0)) {
      toastInfo("Course Group is required");
      return;
    }
    if (!classDate) {
      toastInfo("From Date is required");
      return;
    }

    const details = buildDataDetails();
    const name =
      pickText(selectedCollegeRow, ["college_name", "collegeName"]) ||
      collegeOptions.find((o) => o.value === collegeId)?.label ||
      "";
    setLoadingList(true);
    clearResults();
    setDataDetails(details);
    setCollegeName(name);
    try {
      const raw = await getDayWiseStdAttendanceSummary({
        classDate: format(classDate, "yyyy-MM-dd"),
        collegeId: cid,
        courseYearId: 0,
        courseId: Number(courseId || 0),
        academicYearId: Number(academicYearId || 0),
        courseGroupId: Number(courseGroupId || 0),
      });
      if (raw.length === 0) {
        toastInfo("No records found.");
        setShowTable(false);
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
    const tableHtml = buildHtmlTable(EXCEL_COLUMNS, exportRows);
    exportHtmlTableAsExcel(
      "Day-Wise Students Attendance Summary Report.xls",
      tableHtml,
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
    const tableHtml = buildHtmlTable(EXCEL_COLUMNS, exportRows);
    printHtmlInIframe(
      attendancePrintShell({
        title: escapeHtml(PRINT_REPORT_TITLE),
        logoSrc: escapeHtml(logoSrc),
        fallbackLogo: escapeHtml(fallbackLogo),
        collegeName: escapeHtml(collegeName || "College"),
        dataDetails: dataDetails ? escapeHtml(dataDetails) : undefined,
        tableHtml,
      }),
    );
  };

  const goBack = () => {
    router.push(resolveReportCatalogHref(searchParams.get("path")));
  };

  return (
    <FilteredListPage<DayWiseRow>
      title="Day-Wise Students Attendance Summary Report"
      tableTitle={
        showTable && dataDetails
          ? `Day-Wise Students Attendance Summary Report - ${dataDetails}`
          : "Day-Wise Students Attendance Summary Report"
      }
      filters={
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-full min-w-[9rem] sm:w-auto sm:min-w-[10rem]">
            <Select
              label="College"
              required
              value={collegeId}
              onChange={onCollegeChange}
              options={collegeOptions}
              placeholder="College"
              isLoading={filtersQuery.isLoading}
            />
          </div>
          <div className="w-full min-w-[9rem] sm:w-auto sm:min-w-[10rem]">
            <Select
              label="Academic Year"
              required
              value={academicYearId === "0" ? null : academicYearId}
              onChange={(v) => {
                setAcademicYearId(v ?? "0");
                setCourseId("0");
                setCourseGroupId("0");
                clearResults();
              }}
              options={ayOptions}
              placeholder="Academic Year"
              disabled={!collegeId}
              isLoading={filtersQuery.isLoading}
            />
          </div>
          <div className="w-full min-w-[9rem] sm:w-auto sm:min-w-[10rem]">
            <Select
              label="Course"
              required
              value={courseId === "0" ? null : courseId}
              onChange={(v) => {
                setCourseId(v ?? "0");
                setCourseGroupId("0");
                clearResults();
              }}
              options={courseOptions}
              placeholder="Course"
              disabled={!collegeId || !Number(academicYearId || 0)}
            />
          </div>
          <div className="w-full min-w-[9rem] sm:w-auto sm:min-w-[10rem]">
            <Select
              label="Course Group"
              required
              value={courseGroupId === "0" ? null : courseGroupId}
              onChange={(v) => {
                setCourseGroupId(v ?? "0");
                clearResults();
              }}
              options={groupOptions}
              placeholder="Course Group"
              disabled={!Number(courseId || 0)}
            />
          </div>
          <div className="w-full min-w-[9rem] sm:w-auto sm:min-w-[10rem]">
            <DatePicker
              label="From Date"
              required
              value={classDate}
              onChange={(d) => {
                setClassDate(d);
                clearResults();
              }}
              displayFormat="dd/MM/yyyy"
              clearable={false}
              placeholder="From Date"
              maxDate={maxDate}
            />
          </div>
          <Button
            type="button"
            className="h-9 w-fit px-4"
            disabled={loadingList}
            onClick={() => void handleGetList()}
          >
            {loadingList ? "Loading…" : "Get Attendance Summary"}
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
