"use client";

/**
 * Subject Wise Faculty Attendance Report —
 * Angular `subject-wise-faculty-attendance-report` parity.
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
  pickNum,
  pickText,
  type FilterRow,
} from "@/app/(pages)/(protected)/accounts-and-fees/fee-masters/_lib/fee-master-filters";
import {
  getAttendanceCourseSubjectFilters,
  getAttendanceTimetableFilters,
  getSubjectWiseFacultyAttendanceReport,
} from "@/services";
import {
  attendancePrintShell,
  resolveAttendancePrintLogo,
  toPrintLogoUrl,
} from "../_lib/attendance-report-print";

const PRINT_REPORT_TITLE = "Subject Wise College Attendance Report";
const ALL0 = { value: "0", label: "All" };

type FacultyAttRow = {
  class_date: string;
  faculty_name: string;
};

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<FacultyAttRow>,
  classDate: {
    field: "class_date",
    headerName: "Class Date",
    minWidth: 140,
  } as ColDef<FacultyAttRow>,
  faculty: {
    field: "faculty_name",
    headerName: "Faculty Name",
    minWidth: 180,
  } as ColDef<FacultyAttRow>,
};

const EXCEL_COLUMNS = [
  { key: "siNo", header: "SI.No" },
  { key: "class_date", header: "Class Date" },
  { key: "faculty_name", header: "Faculty Name" },
];

export default function SubjectWiseFacultyAttendanceReportPage() {
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
  const [sectionId, setSectionId] = useState<string>("0");
  const [subjectId, setSubjectId] = useState<string>("0");
  const [fromDate, setFromDate] = useState<Date | null>(() => new Date());
  const [toDate, setToDate] = useState<Date | null>(() => new Date());

  const [rows, setRows] = useState<FacultyAttRow[]>([]);
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

  const ayOptions = useMemo(() => {
    const cid = Number(collegeId ?? 0);
    return dedupeBy(
      filterRows.filter(
        (r) => !cid || pickNum(r, ["fk_college_id", "collegeId"]) === cid,
      ),
      (r) => pickNum(r, ["fk_academic_year_id", "academicYearId"]),
    )
      .sort(
        (a, b) =>
          Number(pickText(b, ["academic_year", "academicYear"])) -
          Number(pickText(a, ["academic_year", "academicYear"])),
      )
      .map((r) => ({
        value: String(pickNum(r, ["fk_academic_year_id", "academicYearId"])),
        label: pickText(r, ["academic_year", "academicYear"]) || "—",
      }));
  }, [filterRows, collegeId]);

  const courseOptions = useMemo(() => {
    const cid = Number(collegeId ?? 0);
    const ay = Number(academicYearId || 0);
    const rows = dedupeBy(
      filterRows.filter(
        (r) =>
          (!cid || pickNum(r, ["fk_college_id", "collegeId"]) === cid) &&
          (!ay || pickNum(r, ["fk_academic_year_id", "academicYearId"]) === ay),
      ),
      (r) => pickNum(r, ["fk_course_id", "courseId"]),
    );
    return [
      ALL0,
      ...rows.map((r) => ({
        value: String(pickNum(r, ["fk_course_id", "courseId"])),
        label: pickText(r, ["course_code", "courseCode"]) || "—",
      })),
    ];
  }, [filterRows, collegeId, academicYearId]);

  const groupOptions = useMemo(() => {
    const cid = Number(collegeId ?? 0);
    const ay = Number(academicYearId || 0);
    const cr = Number(courseId || 0);
    const rows = dedupeBy(
      filterRows.filter(
        (r) =>
          (!cid || pickNum(r, ["fk_college_id", "collegeId"]) === cid) &&
          (!ay ||
            pickNum(r, ["fk_academic_year_id", "academicYearId"]) === ay) &&
          (!cr || pickNum(r, ["fk_course_id", "courseId"]) === cr),
      ),
      (r) => pickNum(r, ["fk_course_group_id", "courseGroupId"]),
    );
    return [
      ALL0,
      ...rows.map((r) => ({
        value: String(pickNum(r, ["fk_course_group_id", "courseGroupId"])),
        label: pickText(r, ["group_code", "groupCode"]) || "—",
      })),
    ];
  }, [filterRows, collegeId, academicYearId, courseId]);

  const yearOptions = useMemo(() => {
    const cid = Number(collegeId ?? 0);
    const ay = Number(academicYearId || 0);
    const cr = Number(courseId || 0);
    const g = Number(courseGroupId || 0);
    const rows = dedupeBy(
      filterRows.filter(
        (r) =>
          (!cid || pickNum(r, ["fk_college_id", "collegeId"]) === cid) &&
          (!ay ||
            pickNum(r, ["fk_academic_year_id", "academicYearId"]) === ay) &&
          (!cr || pickNum(r, ["fk_course_id", "courseId"]) === cr) &&
          (!g || pickNum(r, ["fk_course_group_id", "courseGroupId"]) === g),
      ),
      (r) => pickNum(r, ["fk_course_year_id", "courseYearId"]),
    ).sort(
      (a, b) =>
        pickNum(a, ["year_order", "sortOrder"]) -
        pickNum(b, ["year_order", "sortOrder"]),
    );
    return [
      ALL0,
      ...rows.map((r) => ({
        value: String(pickNum(r, ["fk_course_year_id", "courseYearId"])),
        label: pickText(r, ["course_year_name", "courseYearName"]) || "—",
      })),
    ];
  }, [filterRows, collegeId, academicYearId, courseId, courseGroupId]);

  const sectionOptions = useMemo(() => {
    const cid = Number(collegeId ?? 0);
    const ay = Number(academicYearId || 0);
    const cr = Number(courseId || 0);
    const g = Number(courseGroupId || 0);
    const y = Number(courseYearId || 0);
    const rows = dedupeBy(
      filterRows.filter(
        (r) =>
          (!cid || pickNum(r, ["fk_college_id", "collegeId"]) === cid) &&
          (!ay ||
            pickNum(r, ["fk_academic_year_id", "academicYearId"]) === ay) &&
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
  }, [
    filterRows,
    collegeId,
    academicYearId,
    courseId,
    courseGroupId,
    courseYearId,
  ]);

  const subjectsQuery = useQuery({
    queryKey: [
      ...QK.attendanceReports.courseSubjectFilters(orgId, empId),
      collegeId,
      academicYearId,
      courseId,
      courseGroupId,
      courseYearId,
      sectionId,
    ],
    queryFn: () =>
      getAttendanceCourseSubjectFilters(orgId, empId, {
        collegeId: Number(collegeId ?? 0),
        academicYearId: Number(academicYearId || 0),
        courseId: Number(courseId || 0),
        courseGroupId: Number(courseGroupId || 0),
        courseYearId: Number(courseYearId || 0),
        groupSectionId: Number(sectionId || 0),
      }),
    enabled: !!collegeId && Number(academicYearId || 0) > 0,
  });

  const subjectOptions = useMemo(() => {
    const fromCourse = (subjectsQuery.data?.subjectData ??
      subjectsQuery.data?.filtersData ??
      []) as FilterRow[];
    const rows = dedupeBy(fromCourse, (r) =>
      pickNum(r, ["fk_subject_id", "subjectId"]),
    );
    return [
      ALL0,
      ...rows.map((r) => {
        const name = pickText(r, ["subject_name", "subjectName"]);
        const code = pickText(r, ["subject_code", "subjectCode"]);
        return {
          value: String(pickNum(r, ["fk_subject_id", "subjectId"])),
          label: code ? `${name} (${code})` : name || "—",
        };
      }),
    ];
  }, [subjectsQuery.data]);

  useEffect(() => {
    if (collegeId || collegeOptions.length === 0) return;
    setCollegeId(collegeOptions[0].value);
  }, [collegeId, collegeOptions]);

  useEffect(() => {
    if (!collegeId) return;
    if (ayOptions.length === 0) {
      setAcademicYearId("0");
      return;
    }
    setAcademicYearId(ayOptions[0].value);
  }, [collegeId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!academicYearId || academicYearId === "0") {
      setCourseId("0");
      return;
    }
    const first = courseOptions.find((o) => o.value !== "0");
    setCourseId(first?.value ?? "0");
  }, [academicYearId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!courseId || courseId === "0") {
      setCourseGroupId("0");
      return;
    }
    const first = groupOptions.find((o) => o.value !== "0");
    setCourseGroupId(first?.value ?? "0");
  }, [courseId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!courseGroupId || courseGroupId === "0") {
      setCourseYearId("0");
      return;
    }
    const first = yearOptions.find((o) => o.value !== "0");
    setCourseYearId(first?.value ?? "0");
  }, [courseGroupId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!courseYearId || courseYearId === "0") {
      setSectionId("0");
      setSubjectId("0");
      return;
    }
    const first = sectionOptions.find((o) => o.value !== "0");
    setSectionId(first?.value ?? "0");
    setSubjectId("0");
  }, [courseYearId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setSubjectId("0");
    clearResults();
  }, [sectionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const buildDataDetails = (fromYmd: string, toYmd: string) => {
    const parts = [
      collegeOptions.find((o) => o.value === collegeId)?.label,
      ayOptions.find((o) => o.value === academicYearId)?.label,
      Number(courseId) > 0
        ? courseOptions.find((o) => o.value === courseId)?.label
        : null,
      Number(courseGroupId) > 0
        ? groupOptions.find((o) => o.value === courseGroupId)?.label
        : null,
      Number(courseYearId) > 0
        ? yearOptions.find((o) => o.value === courseYearId)?.label
        : null,
      Number(sectionId) > 0
        ? sectionOptions.find((o) => o.value === sectionId)?.label
        : null,
      Number(subjectId) > 0
        ? subjectOptions.find((o) => o.value === subjectId)?.label
        : null,
    ].filter(Boolean);
    return `${parts.join(" / ")} ( ${fromYmd} - ${toYmd} )`;
  };

  const exportRows = useMemo(
    () => rows.map((row, i) => ({ siNo: i + 1, ...row })),
    [rows],
  );

  const columnDefs = useMemo<ColDef<FacultyAttRow>[]>(
    () => [COL_DEFS.siNo, COL_DEFS.classDate, COL_DEFS.faculty],
    [],
  );

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
    if (!fromDate || !toDate) {
      toastInfo("From Date and To Date are required");
      return;
    }
    const fromYmd = format(fromDate, "yyyy-MM-dd");
    const toYmd = format(toDate, "yyyy-MM-dd");
    const details = buildDataDetails(fromYmd, toYmd);
    const name =
      pickText(selectedCollegeRow, ["college_name", "collegeName"]) ||
      collegeOptions.find((o) => o.value === collegeId)?.label ||
      "";

    setLoadingList(true);
    clearResults();
    setDataDetails(details);
    setCollegeName(name);
    try {
      const raw = await getSubjectWiseFacultyAttendanceReport({
        collegeId: cid,
        academicYearId: Number(academicYearId || 0),
        courseId: Number(courseId || 0),
        sectionId: Number(sectionId || 0),
        courseGroupId: Number(courseGroupId || 0),
        courseYearId: Number(courseYearId || 0),
        subjectId: Number(subjectId || 0),
        fromDate: fromYmd,
        toDate: toYmd,
      });
      if (raw.length === 0) {
        toastInfo("No Records Found.");
        return;
      }
      const seen = new Set<string>();
      const mapped: FacultyAttRow[] = [];
      for (const row of raw) {
        const classDate = String(
          row.class_date ?? row.classDate ?? row.cls_date ?? "",
        );
        if (!classDate || seen.has(classDate)) continue;
        seen.add(classDate);
        mapped.push({
          class_date: classDate,
          faculty_name: String(
            row.Faculty ?? row.faculty_name ?? row.firstName ?? "",
          ),
        });
      }
      if (mapped.length === 0) {
        toastInfo("No Records Found.");
        return;
      }
      setRows(mapped);
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
      "Subject Wise Faculty Attendance Report.xls",
      buildHtmlTable(EXCEL_COLUMNS, exportRows),
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
        tableHtml: buildHtmlTable(EXCEL_COLUMNS, exportRows),
      }),
    );
  };

  const goBack = () => {
    router.push(resolveReportCatalogHref(searchParams.get("path")));
  };

  const pageTitle = showTable
    ? `${PRINT_REPORT_TITLE} - ${dataDetails}`
    : PRINT_REPORT_TITLE;

  return (
    <FilteredListPage<FacultyAttRow>
      title={pageTitle}
      filters={
        <div className="space-y-3">
          {/* Row 1: College → Section (Angular fxFlex row of 6) */}
          <div className="grid grid-cols-2 items-end gap-3 sm:grid-cols-3 lg:grid-cols-6">
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
              required
              value={sectionId}
              onChange={(v) => {
                setSectionId(v ?? "0");
                clearResults();
              }}
              options={sectionOptions}
              placeholder="Section"
            />
          </div>

          {/* Row 2: Subject (wide) + dates + actions — Angular 50 / 20 / 20 / buttons */}
          <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-12">
            <div className="sm:col-span-5">
              <Select
                label="Subject"
                required
                value={subjectId}
                onChange={(v) => {
                  setSubjectId(v ?? "0");
                  clearResults();
                }}
                options={subjectOptions}
                placeholder="Subject"
                searchable
                isLoading={subjectsQuery.isFetching}
              />
            </div>
            <div className="sm:col-span-2">
              <DatePicker
                label="From Date"
                required
                value={fromDate}
                onChange={(d) => {
                  setFromDate(d);
                  clearResults();
                }}
                maxDate={toDate ?? undefined}
                displayFormat="dd-MM-yyyy"
              />
            </div>
            <div className="sm:col-span-2">
              <DatePicker
                label="To Date"
                required
                value={toDate}
                onChange={(d) => {
                  setToDate(d);
                  clearResults();
                }}
                minDate={fromDate ?? undefined}
                displayFormat="dd-MM-yyyy"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:col-span-3">
              <Button
                type="button"
                className="h-9 w-fit px-4"
                disabled={loadingList}
                onClick={() => void handleGetList()}
              >
                {loadingList ? "Loading…" : "Get Attendance"}
              </Button>
              <button
                type="button"
                className="app-control inline-flex h-9 w-fit cursor-pointer items-center justify-center rounded-[5px] border-0 bg-amber-400 px-4 font-medium text-slate-900 shadow-sm transition-colors hover:bg-amber-500"
                onClick={goBack}
              >
                Back
              </button>
            </div>
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
        exportExcel: false,
        exportPdf: false,
      }}
      onExportExcel={handleExcelExport}
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
