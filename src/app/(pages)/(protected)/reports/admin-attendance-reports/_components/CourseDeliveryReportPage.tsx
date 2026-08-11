"use client";

/**
 * Shared UI for Angular `student-attendance-reports/course-delivery-plan-report`
 * and `course-delivary-tracking-report` (folder typo kept) — same filters/report
 * proc, distinguished only by `in_flag`.
 *
 * Filters cascade (Angular `s_get_collegewisedetails_bycode`):
 *   clg_filters (college/AY/course/regulation/courseGroup/courseYear)
 *   -> clg_sec_filters (section)
 *   -> clg_cou_subject_filters (subject)
 * Report: `getAllRecords/s_get_subject_unit_topics` — dynamic columns from
 * `Object.keys(result[0])`.
 */

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColDef } from "ag-grid-community";
import { Printer } from "lucide-react";
import { DatePicker } from "@/common/components/date-picker";
import { Select } from "@/common/components/select";
import {
  buildHtmlTable,
  escapeHtml,
  exportHtmlTableAsExcel,
} from "@/common/export-html-table";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { formatYmd } from "@/app/(pages)/(protected)/reports/student-attendance-reports/_lib/useAttendanceReportFilters";
import { printHtmlInIframe } from "@/lib/print";
import { QK } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/errors";
import { toastError, toastInfo } from "@/lib/toast";
import { rowIndexGetter } from "@/lib/utils";
import {
  academicYearOption,
  collegeOption,
  courseGroupOption,
  courseOption,
  courseYearOption,
  dedupeBy,
  filterAcademicYears,
  filterColleges,
  filterCourseGroups,
  filterCourses,
  filterCourseYears,
  filterRegulations,
  pickNum,
  pickText,
  regulationOption,
  type FilterRow,
} from "@/app/(pages)/(protected)/accounts-and-fees/fee-masters/_lib/fee-master-filters";
import {
  getCourseDeliveryReport,
  getCourseDeliverySectionFilters,
  getCourseDeliverySubjectFilters,
  getFeeMasterCollegeFilters,
  type CourseDeliveryReportFlag,
} from "@/services";

type AnyRow = Record<string, unknown>;

type ReportBanner = {
  /** Angular `dataDetails` — used in Excel hidden h3 subtitle. */
  dataDetails: string;
  collegeName: string;
  courseGroupCode: string;
  courseYearCode: string;
};

const SI_NO_COL: ColDef<AnyRow> = {
  headerName: "S.No",
  valueGetter: rowIndexGetter,
  width: 70,
  flex: 0,
};

/** Today at local midnight — Angular defaults `fDate`/`tDate` to `moment()`. */
function todayLocal(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export interface CourseDeliveryReportPageProps {
  flag: CourseDeliveryReportFlag;
  title: string;
  excelFileName: string;
}

export function CourseDeliveryReportPage({
  flag,
  title,
  excelFileName,
}: CourseDeliveryReportPageProps) {
  const orgId = Number(
    globalThis?.localStorage?.getItem("organizationId") ?? 0,
  );
  const empId = Number(globalThis?.localStorage?.getItem("employeeId") ?? 0);
  // Angular localStorage key is `univeristyId` (typo) — kept for parity.
  const universityId = Number(
    globalThis?.localStorage?.getItem("univeristyId") ?? 0,
  );

  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [academicYearId, setAcademicYearId] = useState<string | null>(null);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [regulationId, setRegulationId] = useState<string | null>(null);
  const [courseGroupId, setCourseGroupId] = useState<string | null>(null);
  const [courseYearId, setCourseYearId] = useState<string | null>(null);
  const [groupSectionId, setGroupSectionId] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  // Angular header-only dates (not sent to `s_get_subject_unit_topics`).
  const [fromDate, setFromDate] = useState<Date | null>(() => todayLocal());
  const [toDate, setToDate] = useState<Date | null>(() => todayLocal());

  const [rows, setRows] = useState<AnyRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [showTable, setShowTable] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [banner, setBanner] = useState<ReportBanner>({
    dataDetails: "",
    collegeName: "",
    courseGroupCode: "",
    courseYearCode: "",
  });

  const filtersQuery = useQuery({
    queryKey: QK.courseDeliveryReports.filters(orgId, empId),
    queryFn: () => getFeeMasterCollegeFilters(orgId, empId),
    enabled: orgId > 0,
  });

  const filtersData = useMemo(
    () => (filtersQuery.data?.filtersData ?? []) as FilterRow[],
    [filtersQuery.data?.filtersData],
  );
  const academicData = useMemo(
    () => (filtersQuery.data?.academicData ?? []) as FilterRow[],
    [filtersQuery.data?.academicData],
  );
  const regulationData = useMemo(
    () => (filtersQuery.data?.regulationData ?? []) as FilterRow[],
    [filtersQuery.data?.regulationData],
  );

  const collegeOptions = useMemo(
    () => filterColleges(filtersData).map(collegeOption),
    [filtersData],
  );

  useEffect(() => {
    if (collegeId || collegeOptions.length === 0) return;
    setCollegeId(collegeOptions[0]!.value);
  }, [collegeId, collegeOptions]);

  const universityIdForCollege = useMemo(
    () =>
      pickNum(
        filtersData.find(
          (r) =>
            pickNum(r, ["fk_college_id", "collegeId"]) ===
            Number(collegeId || 0),
        ),
        ["fk_university_id", "universityId"],
      ),
    [filtersData, collegeId],
  );

  const ayRows = useMemo(
    () =>
      filterAcademicYears(academicData, Number(collegeId || 0), filtersData),
    [academicData, collegeId, filtersData],
  );
  const ayOptions = useMemo(() => ayRows.map(academicYearOption), [ayRows]);

  const courseOptions = useMemo(
    () => filterCourses(filtersData, Number(collegeId || 0)).map(courseOption),
    [filtersData, collegeId],
  );
  const regulationOptions = useMemo(
    () =>
      filterRegulations(
        regulationData,
        universityIdForCollege || null,
        Number(courseId || 0),
      ).map(regulationOption),
    [regulationData, universityIdForCollege, courseId],
  );
  const courseGroupOptions = useMemo(
    () =>
      filterCourseGroups(
        filtersData,
        Number(collegeId || 0),
        Number(courseId || 0),
      ).map(courseGroupOption),
    [filtersData, collegeId, courseId],
  );
  const courseYearOptions = useMemo(
    () =>
      filterCourseYears(
        filtersData,
        Number(collegeId || 0),
        Number(courseId || 0),
        Number(courseGroupId || 0),
      ).map(courseYearOption),
    [filtersData, collegeId, courseId, courseGroupId],
  );

  const sectionsEnabled = Boolean(
    collegeId && courseId && courseGroupId && courseYearId && academicYearId,
  );
  const sectionsQuery = useQuery({
    queryKey: QK.courseDeliveryReports.sections(
      orgId,
      empId,
      Number(collegeId || 0),
      Number(courseId || 0),
      Number(courseGroupId || 0),
      Number(courseYearId || 0),
      Number(academicYearId || 0),
    ),
    queryFn: () =>
      getCourseDeliverySectionFilters({
        orgId,
        employeeId: empId,
        collegeId: Number(collegeId || 0),
        courseId: Number(courseId || 0),
        courseGroupId: Number(courseGroupId || 0),
        courseYearId: Number(courseYearId || 0),
        academicYearId: Number(academicYearId || 0),
      }),
    enabled: sectionsEnabled,
  });

  const sectionOptions = useMemo(() => {
    const idKeys = [
      "fk_group_section_id",
      "pk_group_section_id",
      "groupSectionId",
      "sectionId",
    ];
    const rows2 = dedupeBy(sectionsQuery.data ?? [], (r) => pickNum(r, idKeys));
    return rows2.map((r) => ({
      value: String(pickNum(r, idKeys)),
      label:
        pickText(r, [
          "section",
          "section_name",
          "group_section_name",
          "sectionName",
        ]) || "—",
    }));
  }, [sectionsQuery.data]);

  const subjectsEnabled = sectionsEnabled && Boolean(groupSectionId);
  const subjectsQuery = useQuery({
    queryKey: QK.courseDeliveryReports.subjects(
      orgId,
      empId,
      Number(collegeId || 0),
      Number(courseId || 0),
      Number(courseGroupId || 0),
      Number(courseYearId || 0),
      Number(groupSectionId || 0),
      Number(academicYearId || 0),
    ),
    queryFn: () =>
      getCourseDeliverySubjectFilters({
        orgId,
        employeeId: empId,
        collegeId: Number(collegeId || 0),
        courseId: Number(courseId || 0),
        courseGroupId: Number(courseGroupId || 0),
        courseYearId: Number(courseYearId || 0),
        groupSectionId: Number(groupSectionId || 0),
        academicYearId: Number(academicYearId || 0),
      }),
    enabled: subjectsEnabled,
  });

  const subjectOptions = useMemo(() => {
    const idKeys = ["fk_subject_id", "subjectId"];
    const rows2 = dedupeBy(subjectsQuery.data ?? [], (r) => pickNum(r, idKeys));
    return rows2.map((r) => {
      const name = pickText(r, ["subject_name", "subjectName"]);
      const code = pickText(r, ["subject_code", "subjectCode"]);
      return {
        value: String(pickNum(r, idKeys)),
        label: code ? `${name} (${code})` : name || "—",
      };
    });
  }, [subjectsQuery.data]);

  const clearResults = () => {
    setRows([]);
    setColumns([]);
    setShowTable(false);
    setBanner({
      dataDetails: "",
      collegeName: "",
      courseGroupCode: "",
      courseYearCode: "",
    });
  };

  /** Angular mat-table headers use raw `Object.keys` — do not humanize. */
  const columnDefs = useMemo<ColDef<AnyRow>[]>(() => {
    if (columns.length === 0) return [];
    return [
      SI_NO_COL,
      ...columns.map(
        (key) =>
          ({
            field: key,
            headerName: key,
            minWidth: 140,
          }) as ColDef<AnyRow>,
      ),
    ];
  }, [columns]);

  /**
   * Angular `selectedSubject` `dataDetails` build:
   * college_code / academic_year / course_code / group_code / course_year_name / section / subject_name ( from - to )
   */
  const buildBanner = (): ReportBanner => {
    const cid = Number(collegeId || 0);
    const ay = Number(academicYearId || 0);
    const cr = Number(courseId || 0);
    const cg = Number(courseGroupId || 0);
    const cy = Number(courseYearId || 0);
    const sec = Number(groupSectionId || 0);
    const sub = Number(subjectId || 0);

    const collegeRow = filtersData.find(
      (r) => pickNum(r, ["fk_college_id", "collegeId"]) === cid,
    );
    const ayRow = ayRows.find(
      (r) => pickNum(r, ["fk_academic_year_id", "academicYearId"]) === ay,
    );
    const courseRow = filtersData.find(
      (r) =>
        pickNum(r, ["fk_college_id", "collegeId"]) === cid &&
        pickNum(r, ["fk_course_id", "courseId"]) === cr,
    );
    const groupRow = filtersData.find(
      (r) => pickNum(r, ["fk_course_group_id", "courseGroupId"]) === cg,
    );
    const yearRow = filtersData.find(
      (r) => pickNum(r, ["fk_course_year_id", "courseYearId"]) === cy,
    );
    const sectionRow = (sectionsQuery.data ?? []).find(
      (r) =>
        pickNum(r, [
          "fk_group_section_id",
          "pk_group_section_id",
          "groupSectionId",
          "sectionId",
        ]) === sec,
    );
    const subjectRow = (subjectsQuery.data ?? []).find(
      (r) => pickNum(r, ["fk_subject_id", "subjectId"]) === sub,
    );

    const collegeCode = pickText(collegeRow, ["college_code", "collegeCode"]);
    const collegeName =
      pickText(collegeRow, ["college_name", "collegeName"]) ||
      collegeOptions.find((o) => o.value === String(cid))?.label ||
      "";
    const academicYear = pickText(ayRow, ["academic_year", "academicYear"]);
    const courseCode = pickText(courseRow, ["course_code", "courseCode"]);
    const groupCode = pickText(groupRow, ["group_code", "groupCode"]);
    const courseYearName = pickText(yearRow, [
      "course_year_name",
      "courseYearName",
      "course_year_code",
      "courseYearCode",
    ]);
    const section = pickText(sectionRow, [
      "section",
      "section_name",
      "group_section_name",
      "sectionName",
    ]);
    const subjectName = pickText(subjectRow, ["subject_name", "subjectName"]);

    const from = formatYmd(fromDate) || formatYmd(todayLocal());
    const to = formatYmd(toDate) || from;
    const parts = [
      collegeCode,
      academicYear,
      courseCode,
      groupCode,
      courseYearName,
      section,
      subjectName,
    ].filter((p) => p.trim() !== "");

    return {
      dataDetails: `${parts.join(" / ")} ( ${from} - ${to} )`,
      collegeName,
      courseGroupCode: groupCode,
      courseYearCode: courseYearName,
    };
  };

  const handleGetReport = async () => {
    const cid = Number(collegeId || 0);
    const ay = Number(academicYearId || 0);
    const cr = Number(courseId || 0);
    const reg = Number(regulationId || 0);
    const cg = Number(courseGroupId || 0);
    const cy = Number(courseYearId || 0);
    const sec = Number(groupSectionId || 0);
    const sub = Number(subjectId || 0);
    if (!cid) return toastInfo("College is required");
    if (!ay) return toastInfo("Academic Year is required");
    if (!cr) return toastInfo("Course is required");
    if (!reg) return toastInfo("Regulation is required");
    if (!cg) return toastInfo("Course Group is required");
    if (!cy) return toastInfo("Course Year is required");
    if (!sec) return toastInfo("Section is required");
    if (!sub) return toastInfo("Subject is required");

    setLoadingList(true);
    clearResults();
    try {
      const raw = await getCourseDeliveryReport({
        flag,
        orgId,
        universityId,
        collegeId: cid,
        courseId: cr,
        courseGroupId: cg,
        courseYearId: cy,
        groupSectionId: sec,
        academicYearId: ay,
        regulationId: reg,
        subjectId: sub,
        employeeId: empId,
      });
      if (raw.length === 0) {
        toastInfo("No Records Found.");
        return;
      }
      setBanner(buildBanner());
      setColumns(Object.keys(raw[0] ?? {}));
      setRows(raw);
      setShowTable(true);
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setLoadingList(false);
    }
  };

  // Angular Excel/print use raw API column keys (+ S.No).
  const excelColumns = useMemo(
    () => [
      { key: "siNo", header: "S.No" },
      ...columns.map((c) => ({ key: c, header: c })),
    ],
    [columns],
  );
  const excelRows = useMemo(
    () => rows.map((r, i) => ({ siNo: i + 1, ...r })),
    [rows],
  );

  const handleExcelExport = () => {
    if (rows.length === 0) {
      toastInfo("No records to export.");
      return;
    }
    // Angular `#excelTable` hidden h3: `{title} - {{dataDetails}}`
    const headerHtml = `<div style="display:none"><h3> ${escapeHtml(title)} - ${escapeHtml(banner.dataDetails)}</h3></div>`;
    exportHtmlTableAsExcel(
      `${excelFileName}.xls`,
      buildHtmlTable(excelColumns, excelRows),
      headerHtml,
    );
  };

  /** Angular `printPage()` → window.print of collegeName + title + Course/Semester + raw-key table. */
  const printReport = () => {
    if (rows.length === 0) {
      toastInfo("No records to print.");
      return;
    }
    const tableHtml = buildHtmlTable(excelColumns, excelRows);
    const courseLine = banner.courseGroupCode
      ? `<p style="text-align:left;color:#000;width:50%;margin:0;"> Course : ${escapeHtml(banner.courseGroupCode)} </p>`
      : "";
    const semLine = banner.courseYearCode
      ? `<p style="text-align:right;color:#000;width:50%;margin:0;"> Semester : ${escapeHtml(banner.courseYearCode)} </p>`
      : "";
    printHtmlInIframe(`<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>${escapeHtml(title)}</title>
<style>
@page{margin:12mm}
body{font-family:Arial,sans-serif;padding:12px;color:#111;margin:0}
.collegeName{text-align:center;font-size:25px;margin:0 0 4px;color:#000}
.title{text-align:center;font-size:20px;margin:0 0 12px;color:#000}
.meta{display:flex;justify-content:space-between;margin:0 0 10px;width:100%}
table{width:100%;border-collapse:collapse;font-size:11px}
th,td{border:1px solid #333;padding:8px;text-align:center}
th{background:#f2f2f2}
</style></head><body>
<p class="collegeName">${escapeHtml(banner.collegeName)}</p>
<p class="title">${escapeHtml(title)}</p>
<div class="meta">${courseLine}${semLine}</div>
${tableHtml}
</body></html>`);
  };

  return (
    <FilteredListPage<AnyRow>
      title={title}
      filters={
        <div className="grid grid-cols-1 items-end gap-2 md:grid-cols-12">
          <div className="md:col-span-3">
            <Select
              label="College"
              required
              value={collegeId}
              onChange={(v) => {
                setCollegeId(v);
                setAcademicYearId(null);
                setCourseId(null);
                setRegulationId(null);
                setCourseGroupId(null);
                setCourseYearId(null);
                setGroupSectionId(null);
                setSubjectId(null);
                clearResults();
              }}
              options={collegeOptions}
              isLoading={filtersQuery.isLoading}
            />
          </div>
          <div className="md:col-span-3">
            <Select
              label="Academic Year"
              required
              value={academicYearId}
              onChange={(v) => {
                setAcademicYearId(v);
                clearResults();
              }}
              options={ayOptions}
              disabled={!collegeId}
            />
          </div>
          <div className="md:col-span-3">
            <Select
              label="Course"
              required
              value={courseId}
              onChange={(v) => {
                setCourseId(v);
                setRegulationId(null);
                setCourseGroupId(null);
                setCourseYearId(null);
                setGroupSectionId(null);
                setSubjectId(null);
                clearResults();
              }}
              options={courseOptions}
              disabled={!academicYearId}
            />
          </div>
          <div className="md:col-span-3">
            <Select
              label="Regulation"
              required
              value={regulationId}
              onChange={(v) => {
                setRegulationId(v);
                clearResults();
              }}
              options={regulationOptions}
              disabled={!courseId}
            />
          </div>
          <div className="md:col-span-3">
            <Select
              label="Course Group"
              required
              value={courseGroupId}
              onChange={(v) => {
                setCourseGroupId(v);
                setCourseYearId(null);
                setGroupSectionId(null);
                setSubjectId(null);
                clearResults();
              }}
              options={courseGroupOptions}
              disabled={!courseId}
            />
          </div>
          <div className="md:col-span-3">
            <Select
              label="Course Year"
              required
              value={courseYearId}
              onChange={(v) => {
                setCourseYearId(v);
                setGroupSectionId(null);
                setSubjectId(null);
                clearResults();
              }}
              options={courseYearOptions}
              disabled={!courseGroupId}
            />
          </div>
          <div className="md:col-span-3">
            <Select
              label="Section"
              required
              value={groupSectionId}
              onChange={(v) => {
                setGroupSectionId(v);
                setSubjectId(null);
                clearResults();
              }}
              options={sectionOptions}
              isLoading={sectionsQuery.isFetching}
              disabled={!courseYearId}
            />
          </div>
          <div className="md:col-span-3">
            <Select
              label="Subject"
              required
              value={subjectId}
              onChange={(v) => {
                setSubjectId(v);
                clearResults();
              }}
              options={subjectOptions}
              isLoading={subjectsQuery.isFetching}
              disabled={!groupSectionId}
            />
          </div>

          <div className="flex shrink-0 items-center gap-2 pb-0.5 md:col-span-3">
            <Button
              type="button"
              className="h-9 w-fit px-4"
              disabled={loadingList}
              onClick={() => void handleGetReport()}
            >
              {loadingList ? "Loading…" : "Get Report"}
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
            onClick={printReport}
          >
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Print Report
          </Button>
        ) : null
      }
    />
  );
}
