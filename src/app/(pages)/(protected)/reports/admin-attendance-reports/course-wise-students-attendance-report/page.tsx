"use client";

/**
 * Course-Wise Students Attendance Report —
 * Angular `course-wise-students-attendance-report` parity.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { ColDef } from "ag-grid-community";
import { Printer } from "lucide-react";
import { MonthYearPicker } from "@/common/components/date-picker";
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
  pickNum,
  pickText,
  type FilterRow,
} from "@/app/(pages)/(protected)/accounts-and-fees/fee-masters/_lib/fee-master-filters";
import {
  getAttendanceTimetableFilters,
  getCourseWiseStudentsAttendanceReport,
} from "@/services";
import {
  attendancePrintShell,
  resolveAttendancePrintLogo,
  toPrintLogoUrl,
} from "../_lib/attendance-report-print";

const PRINT_REPORT_TITLE = "Course-Wise Students Attendance Report";
const ALL0 = { value: "0", label: "All" };

const MONTH_FULL_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

type CourseAttRow = {
  roll_number: string;
  student_name: string;
  section: string;
  total_classes: string;
  present_classes: string;
  absent_classes: string;
};

type AnyRow = Record<string, unknown>;

export default function CourseWiseStudentsAttendanceReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const orgId = Number(
    globalThis?.localStorage?.getItem("organizationId") ?? 0,
  );
  const empId = Number(globalThis?.localStorage?.getItem("employeeId") ?? 0);

  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [courseId, setCourseId] = useState<string>("0");
  const [courseGroupId, setCourseGroupId] = useState<string>("0");
  const [courseYearId, setCourseYearId] = useState<string>("0");
  const [sectionId, setSectionId] = useState<string>("0");
  const [monthYear, setMonthYear] = useState<Date | null>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [rows, setRows] = useState<CourseAttRow[]>([]);
  const [sectionHeader, setSectionHeader] = useState("Section");
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
    setSectionHeader("Section");
  }, []);

  const filtersQuery = useQuery({
    queryKey: QK.attendanceReports.timetableFilters(orgId, empId),
    queryFn: () => getAttendanceTimetableFilters(orgId, empId),
    enabled: orgId > 0 && empId > 0,
  });

  const filterRows = useMemo(
    () => (filtersQuery.data?.filtersData ?? []) as FilterRow[],
    [filtersQuery.data?.filtersData],
  );

  const collegeOptions = useMemo(
    () =>
      dedupeBy(filterRows, (r) => pickNum(r, ["fk_college_id", "collegeId"]))
        .sort(
          (a, b) =>
            pickNum(a, ["clg_sort_order"]) - pickNum(b, ["clg_sort_order"]),
        )
        .map((r) => ({
          value: String(pickNum(r, ["fk_college_id", "collegeId"])),
          label: pickText(r, ["college_code", "collegeCode"]) || "—",
        })),
    [filterRows],
  );

  const selectedCollegeRow = useMemo(
    () =>
      filterRows.find(
        (r) =>
          String(pickNum(r, ["fk_college_id", "collegeId"])) ===
          String(collegeId ?? ""),
      ) ?? null,
    [filterRows, collegeId],
  );

  const courseOptions = useMemo(() => {
    const cid = Number(collegeId ?? 0);
    return dedupeBy(
      filterRows.filter(
        (r) => !cid || pickNum(r, ["fk_college_id", "collegeId"]) === cid,
      ),
      (r) => pickNum(r, ["fk_course_id", "courseId"]),
    ).map((r) => ({
      value: String(pickNum(r, ["fk_course_id", "courseId"])),
      label: pickText(r, ["course_code", "courseCode"]) || "—",
    }));
  }, [filterRows, collegeId]);

  const groupOptions = useMemo(() => {
    const cid = Number(collegeId ?? 0);
    const cr = Number(courseId || 0);
    return dedupeBy(
      filterRows.filter(
        (r) =>
          (!cid || pickNum(r, ["fk_college_id", "collegeId"]) === cid) &&
          (!cr || pickNum(r, ["fk_course_id", "courseId"]) === cr),
      ),
      (r) => pickNum(r, ["fk_course_group_id", "courseGroupId"]),
    ).map((r) => ({
      value: String(pickNum(r, ["fk_course_group_id", "courseGroupId"])),
      label: pickText(r, ["group_code", "groupCode"]) || "—",
    }));
  }, [filterRows, collegeId, courseId]);

  const yearOptions = useMemo(() => {
    const cid = Number(collegeId ?? 0);
    const cr = Number(courseId || 0);
    const g = Number(courseGroupId || 0);
    return dedupeBy(
      filterRows.filter(
        (r) =>
          (!cid || pickNum(r, ["fk_college_id", "collegeId"]) === cid) &&
          (!cr || pickNum(r, ["fk_course_id", "courseId"]) === cr) &&
          (!g || pickNum(r, ["fk_course_group_id", "courseGroupId"]) === g),
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
        label: pickText(r, ["course_year_name", "courseYearName"]) || "—",
      }));
  }, [filterRows, collegeId, courseId, courseGroupId]);

  const sectionOptions = useMemo(() => {
    const cid = Number(collegeId ?? 0);
    const cr = Number(courseId || 0);
    const g = Number(courseGroupId || 0);
    const y = Number(courseYearId || 0);
    const rows = dedupeBy(
      filterRows.filter(
        (r) =>
          (!cid || pickNum(r, ["fk_college_id", "collegeId"]) === cid) &&
          (!cr || pickNum(r, ["fk_course_id", "courseId"]) === cr) &&
          (!g || pickNum(r, ["fk_course_group_id", "courseGroupId"]) === g) &&
          (!y || pickNum(r, ["fk_course_year_id", "courseYearId"]) === y),
      ),
      (r) => pickNum(r, ["fk_group_section_id", "groupSectionId", "sectionId"]),
    ).sort(
      (a, b) =>
        pickNum(a, ["fk_group_section_id", "groupSectionId"]) -
        pickNum(b, ["fk_group_section_id", "groupSectionId"]),
    );
    return [
      ALL0,
      ...rows.map((r) => ({
        value: String(
          pickNum(r, ["fk_group_section_id", "groupSectionId", "sectionId"]),
        ),
        label:
          pickText(r, ["section", "section_name", "group_section_name"]) || "—",
      })),
    ];
  }, [filterRows, collegeId, courseId, courseGroupId, courseYearId]);

  useEffect(() => {
    if (collegeId || collegeOptions.length === 0) return;
    setCollegeId(collegeOptions[0].value);
  }, [collegeId, collegeOptions]);

  useEffect(() => {
    if (!collegeId) return;
    setCourseId(courseOptions[0]?.value ?? "0");
  }, [collegeId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!courseId || courseId === "0") {
      setCourseGroupId("0");
      return;
    }
    setCourseGroupId(groupOptions[0]?.value ?? "0");
  }, [courseId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!courseGroupId || courseGroupId === "0") {
      setCourseYearId("0");
      return;
    }
    setCourseYearId(yearOptions[0]?.value ?? "0");
  }, [courseGroupId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setSectionId("0");
    clearResults();
  }, [courseYearId]); // eslint-disable-line react-hooks/exhaustive-deps

  const columnDefs = useMemo<ColDef<CourseAttRow>[]>(
    () => [
      {
        headerName: "SI.No",
        valueGetter: rowIndexGetter,
        width: 70,
        flex: 0,
      },
      { field: "roll_number", headerName: "Roll Number", minWidth: 120 },
      { field: "student_name", headerName: "Student", minWidth: 160 },
      { field: "section", headerName: sectionHeader, minWidth: 140 },
      { field: "total_classes", headerName: "Total Classes", minWidth: 110 },
      {
        field: "present_classes",
        headerName: "Present Classes",
        minWidth: 100,
      },
      { field: "absent_classes", headerName: "Absent Classes", minWidth: 100 },
    ],
    [sectionHeader],
  );

  const excelColumns = useMemo(
    () => [
      { key: "siNo", header: "SI.No" },
      { key: "roll_number", header: "Roll Number" },
      { key: "student_name", header: "Student" },
      { key: "section", header: sectionHeader },
      { key: "total_classes", header: "Total Classes" },
      { key: "present_classes", header: "Present" },
      { key: "absent_classes", header: "Absent" },
    ],
    [sectionHeader],
  );

  const exportRows = useMemo(
    () => rows.map((row, i) => ({ siNo: i + 1, ...row })),
    [rows],
  );

  const handleGetList = async () => {
    const cid = Number(collegeId ?? 0);
    if (!cid) {
      toastInfo("College is required");
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
    if (!Number(courseYearId || 0)) {
      toastInfo("Course Year is required");
      return;
    }
    if (!monthYear) {
      toastInfo("Month / Year is required");
      return;
    }

    const monthNum = monthYear.getMonth() + 1;
    const month = String(monthNum).padStart(2, "0");
    const year = monthYear.getFullYear();
    const collegeCode =
      pickText(selectedCollegeRow, ["college_code", "collegeCode"]) ||
      collegeOptions.find((o) => o.value === collegeId)?.label ||
      "";
    const courseCode =
      courseOptions.find((o) => o.value === courseId)?.label || "";
    const monthName = MONTH_FULL_NAMES[monthNum - 1] ?? month;
    const details = `${collegeCode} / ${courseCode} - ( ${monthName} / ${year} )`;
    const name =
      pickText(selectedCollegeRow, ["college_name", "collegeName"]) ||
      collegeCode;

    setLoadingList(true);
    clearResults();
    setDataDetails(details);
    setCollegeName(name);
    try {
      const raw = await getCourseWiseStudentsAttendanceReport({
        month,
        year,
        collegeId: cid,
        courseId: Number(courseId || 0),
        courseYearId: Number(courseYearId || 0),
        sectionId: Number(sectionId || 0),
        courseGroupId: Number(courseGroupId || 0),
      });
      if (raw.length === 0) {
        toastInfo("No records found.");
        return;
      }
      const first = raw[0] as AnyRow;
      const headerParts = [
        first.college_code,
        first.course_code,
        first.group_code,
        first.course_year_code,
      ]
        .map((v) => (v != null ? String(v) : ""))
        .filter(Boolean);
      setSectionHeader(
        headerParts.length > 0 ? headerParts.join(" - ") : "Section",
      );
      setRows(
        raw.map((row) => ({
          roll_number: String(row.roll_number ?? row.rollNumber ?? ""),
          student_name: String(row.student_name ?? row.studentName ?? ""),
          section: String(row.section ?? ""),
          total_classes: String(
            row.Total_Classes ?? row.total_classes ?? row.totalClasses ?? "",
          ),
          present_classes: String(
            row.Present_Classes ??
              row.present_classes ??
              row.presentClasses ??
              "",
          ),
          absent_classes: String(
            row.Absent_Classes ?? row.absent_classes ?? row.absentClasses ?? "",
          ),
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
      "Course-Wise Students Attendance Report.xls",
      buildHtmlTable(excelColumns, exportRows),
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
    printHtmlInIframe(
      attendancePrintShell({
        title: escapeHtml(PRINT_REPORT_TITLE),
        logoSrc: escapeHtml(logoSrc),
        fallbackLogo: escapeHtml(fallbackLogo),
        collegeName: escapeHtml(collegeName || "College"),
        dataDetails: dataDetails ? escapeHtml(dataDetails) : undefined,
        tableHtml: buildHtmlTable(excelColumns, exportRows),
      }),
    );
  };

  const goBack = () => {
    router.push(resolveReportCatalogHref(searchParams.get("path")));
  };

  const pageTitle = showTable
    ? `${PRINT_REPORT_TITLE} - ${dataDetails}`
    : PRINT_REPORT_TITLE;

  const now = new Date();
  const minMonth = new Date(now.getFullYear() - 5, 0, 1);
  const maxMonth = new Date(now.getFullYear() + 5, 11, 1);

  return (
    <FilteredListPage<CourseAttRow>
      title={pageTitle}
      filters={
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
              required
              value={courseYearId}
              onChange={(v) => {
                setCourseYearId(v ?? "0");
                clearResults();
              }}
              options={yearOptions}
              placeholder="Course Year"
            />
            <Select
              label="Section"
              value={sectionId}
              onChange={(v) => {
                setSectionId(v ?? "0");
                clearResults();
              }}
              options={sectionOptions}
              placeholder="Section"
            />
            <MonthYearPicker
              label="Month / Year"
              required
              value={monthYear}
              onChange={(d) => {
                setMonthYear(d);
                clearResults();
              }}
              minDate={minMonth}
              maxDate={maxMonth}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              className="h-9 w-fit px-4"
              disabled={loadingList}
              onClick={() => void handleGetList()}
            >
              {loadingList ? "Loading…" : "Get Attendance"}
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
      onExportExcel={handleExcelExport}
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
