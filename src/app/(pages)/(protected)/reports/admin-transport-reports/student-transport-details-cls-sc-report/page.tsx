"use client";

/**
 * Transport Details By Class/Sec Report —
 * Angular `reports/admin-transport-reports/student-transport-details-cls-sc-report` parity.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { ColDef } from "ag-grid-community";
import { Printer } from "lucide-react";
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
  getAttendanceTimetableFilters,
  getCollegeById,
  getStudentTransportByClassReport,
} from "@/services";
import {
  attendancePrintShell as transportPrintShell,
  resolveAttendancePrintLogo as resolveTransportPrintLogo,
  toPrintLogoUrl,
} from "@/app/(pages)/(protected)/reports/admin-attendance-reports/_lib/attendance-report-print";
import {
  dedupeBy,
  filterColleges,
  pickNum,
  pickText,
  type FilterRow,
} from "@/app/(pages)/(protected)/accounts-and-fees/fee-masters/_lib/fee-master-filters";
import type { AnyRow } from "@/app/(pages)/(protected)/reports/admin-library-reports/_lib/library-report-columns";

const PRINT_REPORT_TITLE = "Student Transport Details By Class / Sec Report";

type StdTransportRow = {
  collegeCode: string;
  studentName: string;
  groupCode: string;
  courseYearCode: string;
  section: string;
};

const COL_DEFS = {
  siNo: {
    headerName: "S.No.",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<StdTransportRow>,
  collegeCode: {
    field: "collegeCode",
    headerName: "College Code",
    minWidth: 120,
  } as ColDef<StdTransportRow>,
  studentName: {
    field: "studentName",
    headerName: "Student Name",
    minWidth: 160,
  } as ColDef<StdTransportRow>,
  groupCode: {
    field: "groupCode",
    headerName: "Group Code",
    minWidth: 110,
  } as ColDef<StdTransportRow>,
  courseYearCode: {
    field: "courseYearCode",
    headerName: "Course Year Code",
    minWidth: 130,
  } as ColDef<StdTransportRow>,
  section: {
    field: "section",
    headerName: "Section",
    minWidth: 90,
  } as ColDef<StdTransportRow>,
};

const EXCEL_COLUMNS = [
  { key: "siNo", header: "S.No." },
  { key: "collegeCode", header: "College Code" },
  { key: "studentName", header: "Student Name" },
  { key: "groupCode", header: "Group Code" },
  { key: "courseYearCode", header: "Course Year Code" },
  { key: "section", header: "Section" },
];

function mapRow(row: AnyRow): StdTransportRow {
  return {
    collegeCode: String(row.college_code ?? row.collegeCode ?? ""),
    studentName: String(row.student_name ?? row.studentName ?? ""),
    groupCode: String(row.group_code ?? row.groupCode ?? ""),
    courseYearCode: String(row.course_year_code ?? row.courseYearCode ?? ""),
    section: String(row.section ?? ""),
  };
}

export default function StudentTransportDetailsByClassPage() {
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
  const [groupSectionId, setGroupSectionId] = useState<string>("0");

  const [rows, setRows] = useState<StdTransportRow[]>([]);
  const [collegeName, setCollegeName] = useState("");
  const [dataDetails, setDataDetails] = useState("");
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
    queryKey: QK.transportReports.timetableFilters(orgId, empId),
    queryFn: () => getAttendanceTimetableFilters(orgId, empId),
    enabled: orgId > 0 && empId > 0,
  });

  const filtersData = useMemo(
    () => (filtersQuery.data?.filtersData ?? []) as FilterRow[],
    [filtersQuery.data?.filtersData],
  );

  const collegeOptions = useMemo(
    () =>
      filterColleges(filtersData)
        .sort(
          (a, b) =>
            pickNum(a, ["clg_sort_order"]) - pickNum(b, ["clg_sort_order"]),
        )
        .map((r) => ({
          value: String(pickNum(r, ["fk_college_id", "collegeId"])),
          label: pickText(r, ["college_code", "collegeCode"]) || "—",
        })),
    [filtersData],
  );

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
      label: pickText(r, ["course_code", "courseCode"]) || "—",
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
      label: pickText(r, ["group_code", "groupCode"]) || "—",
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
    ).map((r) => ({
      value: String(pickNum(r, ["fk_course_year_id", "courseYearId"])),
      label:
        pickText(r, ["course_year_name", "courseYearName", "course_year_code"]) ||
        "—",
    }));
  }, [filtersData, collegeId, academicYearId, courseId, courseGroupId]);

  const sectionOptions = useMemo(() => {
    const cid = Number(collegeId ?? 0);
    const ay = Number(academicYearId || 0);
    const cr = Number(courseId || 0);
    const g = Number(courseGroupId || 0);
    const y = Number(courseYearId || 0);
    if (!cid || !ay || !cr || !g || !y) return [{ value: "0", label: "All" }];
    return [
      { value: "0", label: "All" },
      ...dedupeBy(
        filtersData.filter(
          (r) =>
            pickNum(r, ["fk_college_id", "collegeId"]) === cid &&
            pickNum(r, ["fk_academic_year_id", "academicYearId"]) === ay &&
            pickNum(r, ["fk_course_id", "courseId"]) === cr &&
            pickNum(r, ["fk_course_group_id", "courseGroupId"]) === g &&
            pickNum(r, ["fk_course_year_id", "courseYearId"]) === y,
        ),
        (r) => pickNum(r, ["fk_group_section_id", "groupSectionId"]),
      ).map((r) => ({
        value: String(pickNum(r, ["fk_group_section_id", "groupSectionId"])),
        label: pickText(r, ["section", "sectionName"]) || "—",
      })),
    ];
  }, [
    filtersData,
    collegeId,
    academicYearId,
    courseId,
    courseGroupId,
    courseYearId,
  ]);

  useEffect(() => {
    if (collegeId || collegeOptions.length === 0) return;
    setCollegeId(collegeOptions[0]!.value);
  }, [collegeId, collegeOptions]);

  useEffect(() => {
    if (!collegeId) return;
    if (ayOptions.length === 0) {
      setAcademicYearId("0");
      return;
    }
    const stillValid = ayOptions.some((o) => o.value === academicYearId);
    if (!stillValid) {
      const current = filtersData.find(
        (r) =>
          pickNum(r, ["fk_college_id", "collegeId"]) === Number(collegeId) &&
          Number(r.is_curr_ay ?? r.isCurrAy ?? 0) > 0,
      );
      const preferred = current
        ? String(pickNum(current, ["fk_academic_year_id", "academicYearId"]))
        : ayOptions[0]!.value;
      setAcademicYearId(preferred);
    }
  }, [collegeId, ayOptions]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!Number(academicYearId || 0)) return;
    if (courseOptions.length === 0) {
      setCourseId("0");
      return;
    }
    if (!courseOptions.some((o) => o.value === courseId)) {
      setCourseId(courseOptions[0]!.value);
    }
  }, [academicYearId, courseOptions]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!Number(courseId || 0)) return;
    if (groupOptions.length === 0) {
      setCourseGroupId("0");
      return;
    }
    if (!groupOptions.some((o) => o.value === courseGroupId)) {
      setCourseGroupId(groupOptions[0]!.value);
    }
  }, [courseId, groupOptions]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!Number(courseGroupId || 0)) return;
    if (yearOptions.length === 0) {
      setCourseYearId("0");
      return;
    }
    if (!yearOptions.some((o) => o.value === courseYearId)) {
      setCourseYearId(yearOptions[0]!.value);
    }
  }, [courseGroupId, yearOptions]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setGroupSectionId("0");
  }, [courseYearId]);

  const columnDefs = useMemo<ColDef<StdTransportRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.collegeCode,
      COL_DEFS.studentName,
      COL_DEFS.groupCode,
      COL_DEFS.courseYearCode,
      COL_DEFS.section,
    ],
    [],
  );

  const exportRows = useMemo(
    () => rows.map((row, i) => ({ siNo: i + 1, ...row })),
    [rows],
  );

  const handleGetList = async () => {
    const cid = Number(collegeId ?? 0);
    const ay = Number(academicYearId || 0);
    const cr = Number(courseId || 0);
    const g = Number(courseGroupId || 0);
    const y = Number(courseYearId || 0);
    if (!cid || !ay || !cr || !g || !y) {
      toastInfo("College, Academic Year, Course, Group and Year are required");
      return;
    }

    const collegeCode =
      collegeOptions.find((o) => o.value === String(cid))?.label ?? "";
    const ayLabel =
      ayOptions.find((o) => o.value === String(ay))?.label ?? "";
    const courseLabel =
      courseOptions.find((o) => o.value === String(cr))?.label ?? "";
    const groupLabel =
      groupOptions.find((o) => o.value === String(g))?.label ?? "";
    const yearLabel =
      yearOptions.find((o) => o.value === String(y))?.label ?? "";
    const sectionLabel =
      sectionOptions.find((o) => o.value === groupSectionId)?.label ?? "";
    const details = [
      `${collegeCode}/${ayLabel}`,
      courseLabel,
      groupLabel,
      yearLabel,
      Number(groupSectionId || 0) > 0 && sectionLabel
        ? `Section ${sectionLabel}`
        : "",
    ]
      .filter(Boolean)
      .join(" / ")
      .replace(" / Section", " - Section");

    let name = collegeCode || "College";
    try {
      const full = await getCollegeById(cid);
      if (full?.collegeName) name = String(full.collegeName);
    } catch {
      /* keep fallback */
    }

    setLoadingList(true);
    clearResults();
    setDataDetails(details);
    setCollegeName(name);
    try {
      const raw = await getStudentTransportByClassReport({
        collegeId: cid,
        academicYearId: ay,
        courseId: cr,
        courseGroupId: g,
        courseYearId: y,
        groupSectionId: Number(groupSectionId || 0),
      });
      if (raw.length === 0) {
        toastInfo("No records found.");
        return;
      }
      setRows(raw.map(mapRow));
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
      "Student Transport Details By Class Sec Report.xls",
      buildHtmlTable(EXCEL_COLUMNS, exportRows),
      headerHtml,
    );
  };

  const printReport = async () => {
    if (exportRows.length === 0) {
      toastInfo("No records to print.");
      return;
    }
    const logoSrc = await resolveTransportPrintLogo(
      null,
      Number(collegeId ?? 0),
      collegeLogo || DEFAULT_COLLEGE_LOGO,
    );
    const fallbackLogo = toPrintLogoUrl(DEFAULT_COLLEGE_LOGO);
    printHtmlInIframe(
      transportPrintShell({
        title: escapeHtml(PRINT_REPORT_TITLE),
        logoSrc: escapeHtml(logoSrc),
        fallbackLogo: escapeHtml(fallbackLogo),
        collegeName: escapeHtml(collegeName || "College"),
        dataDetails: dataDetails ? escapeHtml(dataDetails) : undefined,
        tableHtml: buildHtmlTable(EXCEL_COLUMNS, exportRows),
      }),
    );
  };

  const goBack = () => {
    router.push(resolveReportCatalogHref(searchParams.get("path")));
  };

  return (
    <FilteredListPage<StdTransportRow>
      title={
        showTable && dataDetails
          ? `${PRINT_REPORT_TITLE} ( ${dataDetails} )`
          : PRINT_REPORT_TITLE
      }
      filters={
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Select
              label="College"
              required
              value={collegeId}
              onChange={(v) => {
                setCollegeId(v);
                setAcademicYearId("0");
                setCourseId("0");
                setCourseGroupId("0");
                setCourseYearId("0");
                setGroupSectionId("0");
                clearResults();
              }}
              options={collegeOptions}
              placeholder="College"
              isLoading={filtersQuery.isLoading}
            />
            <Select
              label="Academic Year"
              required
              value={academicYearId === "0" ? null : academicYearId}
              onChange={(v) => {
                setAcademicYearId(v ?? "0");
                setCourseId("0");
                setCourseGroupId("0");
                setCourseYearId("0");
                setGroupSectionId("0");
                clearResults();
              }}
              options={ayOptions}
              placeholder="Academic Year"
              disabled={!collegeId}
            />
            <Select
              label="Course"
              required
              value={courseId === "0" ? null : courseId}
              onChange={(v) => {
                setCourseId(v ?? "0");
                setCourseGroupId("0");
                setCourseYearId("0");
                setGroupSectionId("0");
                clearResults();
              }}
              options={courseOptions}
              placeholder="Course"
              disabled={!Number(academicYearId || 0)}
            />
            <Select
              label="Course Group"
              required
              value={courseGroupId === "0" ? null : courseGroupId}
              onChange={(v) => {
                setCourseGroupId(v ?? "0");
                setCourseYearId("0");
                setGroupSectionId("0");
                clearResults();
              }}
              options={groupOptions}
              placeholder="Course Group"
              disabled={!Number(courseId || 0)}
            />
            <Select
              label="Course Year"
              required
              value={courseYearId === "0" ? null : courseYearId}
              onChange={(v) => {
                setCourseYearId(v ?? "0");
                setGroupSectionId("0");
                clearResults();
              }}
              options={yearOptions}
              placeholder="Course Year"
              disabled={!Number(courseGroupId || 0)}
            />
            <Select
              label="Section"
              required
              value={groupSectionId}
              onChange={(v) => {
                setGroupSectionId(v ?? "0");
                clearResults();
              }}
              options={sectionOptions}
              placeholder="Section"
              disabled={!Number(courseYearId || 0)}
            />
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <Button
              type="button"
              className="h-9 w-fit px-4"
              disabled={loadingList}
              onClick={() => void handleGetList()}
            >
              {loadingList ? "Loading…" : "Get List"}
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
