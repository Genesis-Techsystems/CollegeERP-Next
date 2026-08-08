"use client";

/**
 * Daily Attendance Statistical Report —
 * Angular `reports/admin-timetable-reports/daily-statistical-report` parity.
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
import { printHtmlInIframe } from "@/lib/print";
import { QK } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/errors";
import { resolveReportCatalogHref } from "@/lib/report-catalog";
import { toastError, toastInfo } from "@/lib/toast";
import { DEFAULT_COLLEGE_LOGO, useCollegeLogo } from "@/hooks/useCollegeLogo";
import {
  fetchTimetableFilterRows,
  getCollegeById,
  getDailyStatisticalReport,
} from "@/services";
import {
  attendancePrintShell as timetablePrintShell,
  resolveAttendancePrintLogo as resolveTimetablePrintLogo,
  toPrintLogoUrl,
} from "@/app/(pages)/(protected)/reports/admin-attendance-reports/_lib/attendance-report-print";
import {
  buildDailyStatisticalMatrix,
  buildStatisticalTableHtml,
  statisticalPeriodField,
  type StatisticalPeriodKey,
} from "../_lib/timetable-matrix";
import {
  buildStatisticalColumnDefs,
  toStatisticalGridRows,
  type StatisticalGridRow,
} from "../_lib/timetable-grid";
import {
  distinctAcademicYears,
  distinctColleges,
  distinctCourseGroups,
  distinctCourses,
  distinctCourseYears,
  distinctSections,
  num,
  toSelectOptions,
  txt,
} from "../_lib/timetable-report-filters";

const REPORT_TITLE = "Daily Attendance Statistical Report";

export default function DailyStatisticalReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [collegeId, setCollegeId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [courseGroupId, setCourseGroupId] = useState("");
  const [courseYearId, setCourseYearId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [reportDate, setReportDate] = useState<Date | null>(() => new Date());

  const [keys, setKeys] = useState<StatisticalPeriodKey[]>([]);
  const [gridRows, setGridRows] = useState<StatisticalGridRow[]>([]);
  const [dataDetails, setDataDetails] = useState("");
  const [dayName, setDayName] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [showTable, setShowTable] = useState(false);

  const collegeLogo = useCollegeLogo(collegeId ? Number(collegeId) : null);

  const clearResults = useCallback(() => {
    setKeys([]);
    setGridRows([]);
    setShowTable(false);
    setDataDetails("");
    setDayName("");
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
  const courses = useMemo(
    () =>
      distinctCourses(
        filterRows,
        Number(collegeId || 0),
        Number(academicYearId || 0),
      ),
    [filterRows, collegeId, academicYearId],
  );
  const courseGroups = useMemo(
    () =>
      distinctCourseGroups(
        filterRows,
        Number(collegeId || 0),
        Number(academicYearId || 0),
        Number(courseId || 0),
      ),
    [filterRows, collegeId, academicYearId, courseId],
  );
  const courseYears = useMemo(
    () =>
      distinctCourseYears(
        filterRows,
        Number(collegeId || 0),
        Number(academicYearId || 0),
        Number(courseId || 0),
        Number(courseGroupId || 0),
      ),
    [filterRows, collegeId, academicYearId, courseId, courseGroupId],
  );
  const sections = useMemo(
    () =>
      distinctSections(
        filterRows,
        Number(collegeId || 0),
        Number(academicYearId || 0),
        Number(courseId || 0),
        Number(courseGroupId || 0),
        Number(courseYearId || 0),
      ),
    [
      filterRows,
      collegeId,
      academicYearId,
      courseId,
      courseGroupId,
      courseYearId,
    ],
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
  const courseOptions = useMemo(
    () =>
      toSelectOptions(courses, ["fk_course_id", "courseId"], [
        "course_code",
        "courseCode",
      ]),
    [courses],
  );
  const groupOptions = useMemo(
    () =>
      toSelectOptions(courseGroups, ["fk_course_group_id", "courseGroupId"], [
        "group_code",
        "groupCode",
      ]),
    [courseGroups],
  );
  const yearOptions = useMemo(
    () =>
      toSelectOptions(courseYears, ["fk_course_year_id", "courseYearId"], [
        "course_year_name",
        "courseYearName",
      ]),
    [courseYears],
  );
  const sectionOptions = useMemo(
    () =>
      toSelectOptions(
        sections,
        ["fk_group_section_id", "groupSectionId", "sectionId"],
        ["section"],
      ),
    [sections],
  );

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

  useEffect(() => {
    if (!courses.length) {
      setCourseId("");
      return;
    }
    if (!courses.some((r) => num(r.fk_course_id ?? r.courseId) === Number(courseId))) {
      setCourseId(String(num(courses[0].fk_course_id ?? courses[0].courseId)));
    }
  }, [courses, courseId]);

  useEffect(() => {
    if (!courseGroups.length) {
      setCourseGroupId("");
      return;
    }
    if (
      !courseGroups.some(
        (r) => num(r.fk_course_group_id ?? r.courseGroupId) === Number(courseGroupId),
      )
    ) {
      setCourseGroupId(
        String(num(courseGroups[0].fk_course_group_id ?? courseGroups[0].courseGroupId)),
      );
    }
  }, [courseGroups, courseGroupId]);

  useEffect(() => {
    if (!courseYears.length) {
      setCourseYearId("");
      return;
    }
    if (
      !courseYears.some(
        (r) => num(r.fk_course_year_id ?? r.courseYearId) === Number(courseYearId),
      )
    ) {
      setCourseYearId(
        String(num(courseYears[0].fk_course_year_id ?? courseYears[0].courseYearId)),
      );
    }
  }, [courseYears, courseYearId]);

  useEffect(() => {
    if (!sections.length) {
      setSectionId("");
      return;
    }
    if (
      !sections.some(
        (r) =>
          num(r.fk_group_section_id ?? r.groupSectionId ?? r.sectionId) ===
          Number(sectionId),
      )
    ) {
      setSectionId(
        String(
          num(
            sections[0].fk_group_section_id ??
              sections[0].groupSectionId ??
              sections[0].sectionId,
          ),
        ),
      );
    }
  }, [sections, sectionId]);

  const columnDefs = useMemo<ColDef<StatisticalGridRow>[]>(
    () => buildStatisticalColumnDefs(keys),
    [keys],
  );

  const tableHtml = useMemo(() => {
    if (!showTable || gridRows.length === 0) return "";
    return buildStatisticalTableHtml({
      keys,
      rows: gridRows.map((r) => ({
        SEC_Display_Name: r.rowLabel,
        subjectTimetable: keys.map((k) => {
          const field = statisticalPeriodField(k.periodno);
          return {
            text: String(r[field] ?? ""),
            attendanceTaken: Number(r[`${field}_att`] ?? 0),
          };
        }),
      })),
    });
  }, [gridRows, keys, showTable]);

  const handleGetList = async () => {
    const cid = Number(collegeId || 0);
    const ay = Number(academicYearId || 0);
    const coid = Number(courseId || 0);
    const gid = Number(courseGroupId || 0);
    const yid = Number(courseYearId || 0);
    const sid = Number(sectionId || 0);
    if (!cid || !ay || !coid || !gid || !yid || !sid) {
      toastInfo("All filters are required");
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
    const course = courses.find((r) => num(r.fk_course_id ?? r.courseId) === coid);
    const group = courseGroups.find(
      (r) => num(r.fk_course_group_id ?? r.courseGroupId) === gid,
    );
    const year = courseYears.find(
      (r) => num(r.fk_course_year_id ?? r.courseYearId) === yid,
    );
    const section = sections.find(
      (r) => num(r.fk_group_section_id ?? r.groupSectionId ?? r.sectionId) === sid,
    );

    const details = [
      txt(college?.college_code ?? college?.collegeCode),
      txt(ayRow?.academic_year ?? ayRow?.academicYear),
      txt(course?.course_code ?? course?.courseCode),
      txt(group?.group_code ?? group?.groupCode),
      txt(year?.course_year_name ?? year?.courseYearName),
      txt(section?.section),
    ]
      .filter(Boolean)
      .join(" / ");

    const day = format(reportDate, "EEEE");
    const fromDate = format(reportDate, "yyyy-MM-dd");

    setLoadingList(true);
    clearResults();
    setDataDetails(details);
    setDayName(day);
    try {
      const [raw, collegeFull] = await Promise.all([
        getDailyStatisticalReport({
          fromDate,
          collegeId: cid,
          courseId: coid,
          courseGroupId: gid,
          courseYearId: yid,
          academicYearId: ay,
          sectionId: sid,
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
      const matrix = buildDailyStatisticalMatrix(raw);
      setKeys(matrix.keys);
      setGridRows(
        toStatisticalGridRows(
          matrix.studentTimetable.map((r) => ({
            label: r.SEC_Display_Name,
            cells: r.subjectTimetable,
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

  const titleSuffix =
    showTable && dataDetails
      ? ` - (${dataDetails})${dayName ? ` (${dayName})` : ""}`
      : "";

  const handleExcelExport = () => {
    if (!tableHtml) {
      toastInfo("No records to export.");
      return;
    }
    const headerHtml = `<div style="margin-bottom:12px;">
      <div style="font-size:16px;font-weight:550;">${escapeHtml(REPORT_TITLE)}${dataDetails ? `-(${escapeHtml(dataDetails)})` : ""}${dayName ? ` (${escapeHtml(dayName)})` : ""}</div>
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
    const detailsLine = [dataDetails, dayName ? `(${dayName})` : ""]
      .filter(Boolean)
      .join(" ");
    printHtmlInIframe(
      timetablePrintShell({
        title: escapeHtml(REPORT_TITLE),
        logoSrc: escapeHtml(logoSrc),
        fallbackLogo: escapeHtml(fallbackLogo),
        collegeName: escapeHtml(collegeName || "College"),
        dataDetails: detailsLine ? escapeHtml(detailsLine) : undefined,
        tableHtml,
        textAlign: "center",
      }),
    );
  };

  const goBack = () => {
    router.push(resolveReportCatalogHref(searchParams.get("path")));
  };

  return (
    <FilteredListPage<StatisticalGridRow>
      title={`${REPORT_TITLE}${titleSuffix}`}
      filters={
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
              label="Course"
              required
              value={courseId || null}
              onChange={(v) => {
                setCourseId(v ?? "");
                clearResults();
              }}
              options={courseOptions}
              placeholder="Course"
              disabled={!academicYearId}
            />
            <Select
              label="Course Group"
              required
              value={courseGroupId || null}
              onChange={(v) => {
                setCourseGroupId(v ?? "");
                clearResults();
              }}
              options={groupOptions}
              placeholder="Course Group"
              disabled={!courseId}
            />
            <Select
              label="Course Year"
              required
              value={courseYearId || null}
              onChange={(v) => {
                setCourseYearId(v ?? "");
                clearResults();
              }}
              options={yearOptions}
              placeholder="Course Year"
              disabled={!courseGroupId}
            />
            <Select
              label="Section"
              required
              value={sectionId || null}
              onChange={(v) => {
                setSectionId(v ?? "");
                clearResults();
              }}
              options={sectionOptions}
              placeholder="Section"
              disabled={!courseYearId}
            />
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-full min-w-[10rem] sm:w-auto sm:min-w-[12rem]">
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
                maxDate={new Date()}
              />
            </div>
            <Button
              type="button"
              className="h-9 w-fit px-4"
              disabled={loadingList}
              onClick={() => void handleGetList()}
            >
              {loadingList ? "Loading…" : "Get Daily Statistical Report"}
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
      filtersFooter={
        showTable ? (
          <p className="text-[12px]">
            <span className="font-medium text-green-600">Attendance Capture</span>
            {" | "}
            <span className="font-medium text-red-600">
              Attendance Not Capture
            </span>
          </p>
        ) : null
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
