"use client";

/**
 * Daily Attendance of Students —
 * Angular `reports/admin-attendance-reports/student-daily-attendance-count-report` parity.
 * Get Attendance Summary: `getAllRecords/s_get_daily_attendance_report`
 *   ?in_college_id=&in_course_id=&in_academic_year_id=&in_attendance_date=
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ColDef } from "ag-grid-community";
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
import {
  academicYearsFromFilterRows,
  collegesFromFilterRows,
  coursesFromFilterRows,
  num,
  text,
} from "@/app/(pages)/(protected)/time-table-management/_lib/timetable-filters";
import { useCollegeLogo, DEFAULT_COLLEGE_LOGO } from "@/hooks/useCollegeLogo";
import { getErrorMessage } from "@/lib/errors";
import { printHtmlInIframe } from "@/lib/print";
import { resolveReportCatalogHref } from "@/lib/report-catalog";
import { toastError, toastInfo } from "@/lib/toast";
import { rowIndexGetter } from "@/lib/utils";
import {
  fetchAttendanceReportFilterRows,
  fetchDailyAttendanceOfStudentsReport,
  getCollegeById,
} from "@/services";
import { buildBannerHtml, formatYmd } from "../_lib/useAttendanceReportFilters";

type AnyRow = Record<string, unknown>;

const REPORT_TITLE = "Daily Attendance of Students";

const EXCEL_COLUMNS = [
  { key: "siNo", header: "S.No" },
  { key: "BRANCH", header: "Branch" },
  { key: "COURSEYEAR", header: "Year" },
  { key: "SECTIONS", header: "Sections" },
  { key: "STRENGTH", header: "Strength" },
  { key: "PRESENT", header: "Present" },
  { key: "ABSENT", header: "Absent" },
  { key: "AHOD_Name", header: "AHoD Name" },
  { key: "AHOD_CONTACT_No", header: "Mobile Number" },
] as const;

const COL_DEFS = {
  siNo: {
    headerName: "S.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<AnyRow>,
  branch: {
    field: "BRANCH",
    headerName: "Branch",
    minWidth: 110,
  } as ColDef<AnyRow>,
  year: {
    field: "COURSEYEAR",
    headerName: "Year",
    minWidth: 90,
  } as ColDef<AnyRow>,
  sections: {
    field: "SECTIONS",
    headerName: "Sections",
    minWidth: 90,
  } as ColDef<AnyRow>,
  strength: {
    field: "STRENGTH",
    headerName: "Strength",
    minWidth: 100,
  } as ColDef<AnyRow>,
  present: {
    field: "PRESENT",
    headerName: "Present",
    minWidth: 90,
  } as ColDef<AnyRow>,
  absent: {
    field: "ABSENT",
    headerName: "Absent",
    minWidth: 90,
  } as ColDef<AnyRow>,
  ahodName: {
    field: "AHOD_Name",
    headerName: "AHoD Name",
    minWidth: 140,
  } as ColDef<AnyRow>,
  mobile: {
    field: "AHOD_CONTACT_No",
    headerName: "Mobile Number",
    minWidth: 130,
  } as ColDef<AnyRow>,
};

function formatSubtitleDate(d: Date | null): string {
  if (!d) return "";
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const y = d.getFullYear();
  const m = months[d.getMonth()] ?? "";
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function StudentDailyAttendanceCountReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgCode =
    typeof globalThis.localStorage !== "undefined"
      ? String(globalThis.localStorage.getItem("orgCode") ?? "")
      : "";

  const [loadingFilters, setLoadingFilters] = useState(true);
  const [filterRows, setFilterRows] = useState<AnyRow[]>([]);
  const [collegeId, setCollegeId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [clsDate, setClsDate] = useState<Date | null>(() => new Date());

  const [rows, setRows] = useState<AnyRow[]>([]);
  const [dataDetails, setDataDetails] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [showTable, setShowTable] = useState(false);

  const collegeNum = Number(collegeId || 0) || null;
  const collegeLogo = useCollegeLogo(collegeNum);

  const clearResults = useCallback(() => {
    setRows([]);
    setShowTable(false);
    setDataDetails("");
    setCollegeName("");
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadingFilters(true);
    void fetchAttendanceReportFilterRows()
      .then((list) => {
        if (cancelled) return;
        setFilterRows(list);
        const colleges = collegesFromFilterRows(list);
        if (colleges[0]) {
          setCollegeId(String(num(colleges[0].fk_college_id)));
        }
      })
      .catch((err) => {
        if (!cancelled) toastError(getErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoadingFilters(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const colleges = useMemo(
    () => collegesFromFilterRows(filterRows),
    [filterRows],
  );
  const academicYears = useMemo(() => {
    const list = academicYearsFromFilterRows(
      filterRows,
      Number(collegeId || 0),
    );
    return [...list].sort(
      (a, b) =>
        Number(String(text(b, ["academic_year"])) || 0) -
        Number(String(text(a, ["academic_year"])) || 0),
    );
  }, [filterRows, collegeId]);
  const courses = useMemo(
    () =>
      coursesFromFilterRows(
        filterRows,
        Number(collegeId || 0),
        Number(academicYearId || 0),
      ),
    [filterRows, collegeId, academicYearId],
  );

  useEffect(() => {
    if (!academicYears.length) {
      setAcademicYearId("");
      return;
    }
    const ids = academicYears.map((r) => String(num(r.fk_academic_year_id)));
    if (!ids.includes(academicYearId)) setAcademicYearId(ids[0] ?? "");
  }, [academicYears, academicYearId]);

  // Angular: course is required but not auto-selected — leave empty until user picks
  // (or keep selection if still valid after AY change).
  useEffect(() => {
    if (!courses.length) {
      setCourseId("");
      return;
    }
    const ids = courses.map((r) => String(num(r.fk_course_id)));
    if (courseId && !ids.includes(courseId)) setCourseId("");
  }, [courses, courseId]);

  const collegeOptions = useMemo(
    () =>
      colleges.map((r) => ({
        value: String(num(r.fk_college_id)),
        label: text(r, ["college_code"]) || String(num(r.fk_college_id)),
      })),
    [colleges],
  );
  const ayOptions = useMemo(
    () =>
      academicYears.map((r) => ({
        value: String(num(r.fk_academic_year_id)),
        label: text(r, ["academic_year"]) || "—",
      })),
    [academicYears],
  );
  const courseOptions = useMemo(
    () =>
      courses.map((r) => ({
        value: String(num(r.fk_course_id)),
        label: text(r, ["course_code"]) || "—",
      })),
    [courses],
  );

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.branch,
      COL_DEFS.year,
      COL_DEFS.sections,
      COL_DEFS.strength,
      COL_DEFS.present,
      COL_DEFS.absent,
      COL_DEFS.ahodName,
      COL_DEFS.mobile,
    ],
    [],
  );

  const handleGetList = async () => {
    const cid = Number(collegeId || 0);
    const ay = Number(academicYearId || 0);
    const cr = Number(courseId || 0);
    if (!cid) {
      toastInfo("College is required");
      return;
    }
    if (!ay) {
      toastInfo("Academic Year is required");
      return;
    }
    if (!cr) {
      toastInfo("Course is required");
      return;
    }
    if (!clsDate) {
      toastInfo("Date is required");
      return;
    }

    const dateStr = formatYmd(clsDate);
    const clgLabel =
      collegeOptions.find((o) => o.value === collegeId)?.label ?? "";
    const ayLabel =
      ayOptions.find((o) => o.value === academicYearId)?.label ?? "";
    const crLabel =
      courseOptions.find((o) => o.value === courseId)?.label ?? "";
    const details = `${clgLabel}/${ayLabel}/${crLabel}( ${formatSubtitleDate(clsDate)} )`;

    setLoadingList(true);
    clearResults();
    setDataDetails(details);

    try {
      const [raw, college] = await Promise.all([
        fetchDailyAttendanceOfStudentsReport({
          collegeId: cid,
          courseId: cr,
          academicYearId: ay,
          attendanceDate: dateStr,
        }),
        getCollegeById(cid).catch(() => null),
      ]);
      setCollegeName(String(college?.collegeName ?? clgLabel));
      if (!raw.length) {
        toastInfo("No Records Found.");
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

  const exportFlatRows = useMemo(
    () =>
      rows.map((row, i) => ({
        siNo: i + 1,
        BRANCH: String(row.BRANCH ?? ""),
        COURSEYEAR: String(row.COURSEYEAR ?? ""),
        SECTIONS: String(row.SECTIONS ?? ""),
        STRENGTH: String(row.STRENGTH ?? ""),
        PRESENT: String(row.PRESENT ?? ""),
        ABSENT: String(row.ABSENT ?? ""),
        AHOD_Name: String(row.AHOD_Name ?? ""),
        AHOD_CONTACT_No: String(row.AHOD_CONTACT_No ?? ""),
      })),
    [rows],
  );

  const handleExcelExport = useCallback(() => {
    if (exportFlatRows.length === 0) {
      toastError("No records to export.");
      return;
    }
    const headerHtml = `<div style="text-align:center;margin-bottom:12px;">
      <div style="font-size:14px;font-weight:bold;">${escapeHtml(REPORT_TITLE)}${dataDetails ? ` - ${escapeHtml(dataDetails)}` : ""}</div>
    </div>`;
    const tableHtml = buildHtmlTable(
      EXCEL_COLUMNS.map((c) => ({ key: c.key, header: c.header })),
      exportFlatRows as Record<string, unknown>[],
    );
    exportHtmlTableAsExcel(`${REPORT_TITLE}.xls`, tableHtml, headerHtml);
  }, [dataDetails, exportFlatRows]);

  const handlePrintReport = useCallback(() => {
    if (exportFlatRows.length === 0) {
      toastError("No records to print.");
      return;
    }
    const logoSrc = collegeLogo || DEFAULT_COLLEGE_LOGO;
    const headerHtml = buildBannerHtml({
      logoSrc,
      collegeName,
      dataDetails,
      reportTitle: REPORT_TITLE,
      orgCode,
    });
    const tableHtml = buildHtmlTable(
      EXCEL_COLUMNS.map((c) => ({ key: c.key, header: c.header })),
      exportFlatRows as Record<string, unknown>[],
    );
    printHtmlInIframe(`<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>${escapeHtml(REPORT_TITLE)}</title>
<style>
  body{font-family:Arial,sans-serif;padding:16px;color:#111}
  table{border-collapse:collapse;width:100%;font-size:12px}
  th,td{border:1px solid #333;padding:4px 6px}
  th{background:#f3f4f6}
</style>
</head><body>${headerHtml}${tableHtml}</body></html>`);
  }, [collegeLogo, collegeName, dataDetails, exportFlatRows, orgCode]);

  const goBack = () => {
    router.push(resolveReportCatalogHref(searchParams.get("path")));
  };

  return (
    <FilteredListPage
      title={
        showTable && dataDetails
          ? `${REPORT_TITLE} - ${dataDetails}`
          : REPORT_TITLE
      }
      filters={
        <div className="grid grid-cols-1 items-end gap-2 md:grid-cols-12">
          <div className="md:col-span-2">
            <Select
              label="College"
              required
              value={collegeId || null}
              onChange={(v) => {
                setCollegeId(v ?? "");
                setAcademicYearId("");
                setCourseId("");
                clearResults();
              }}
              options={collegeOptions}
              isLoading={loadingFilters}
            />
          </div>
          <div className="md:col-span-2">
            <Select
              label="Academic Year"
              required
              value={academicYearId || null}
              onChange={(v) => {
                setAcademicYearId(v ?? "");
                setCourseId("");
                clearResults();
              }}
              options={ayOptions}
              disabled={!collegeId}
            />
          </div>
          <div className="md:col-span-2">
            <Select
              label="Course"
              required
              value={courseId || null}
              onChange={(v) => {
                setCourseId(v ?? "");
                clearResults();
              }}
              options={courseOptions}
              disabled={!academicYearId}
            />
          </div>
          <div className="md:col-span-2">
            <DatePicker
              label="Date"
              value={clsDate}
              onChange={(d) => {
                setClsDate(d);
                clearResults();
              }}
              displayFormat="dd/MM/yyyy"
              maxDate={new Date()}
            />
          </div>
          <div className="flex shrink-0 items-center gap-2 pb-0.5 md:col-span-4">
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
        </div>
      }
      rowData={showTable ? rows : []}
      columnDefs={columnDefs}
      loading={loadingList}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search…",
        exportExcel: false,
        exportPdf: false,
      }}
      toolbarTrailing={
        showTable ? (
          <div className="flex items-center gap-2">
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
              onClick={handlePrintReport}
            >
              <Printer className="mr-1.5 h-3.5 w-3.5" />
              Print Report
            </Button>
          </div>
        ) : undefined
      }
    />
  );
}
