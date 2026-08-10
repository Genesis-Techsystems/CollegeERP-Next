"use client";

/**
 * CCA Activity Report —
 * Angular `reports/admin-timetable-reports/cca-activity-report` parity.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { ColDef } from "ag-grid-community";
import { FileSpreadsheet, Printer } from "lucide-react";
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
import { resolveOrganizationId } from "@/lib/user-context";
import { toastError, toastInfo } from "@/lib/toast";
import { DEFAULT_COLLEGE_LOGO, useCollegeLogo } from "@/hooks/useCollegeLogo";
import { useLoginEmployeeId } from "@/hooks/useLoginEmployeeId";
import { useSession } from "@/hooks/useSession";
import {
  attendancePrintShell as timetablePrintShell,
  resolveAttendancePrintLogo as resolveTimetablePrintLogo,
  toPrintLogoUrl,
} from "@/app/(pages)/(protected)/reports/admin-attendance-reports/_lib/attendance-report-print";
import {
  distinctColleges,
  distinctCourseGroups,
  distinctCourses,
  distinctCourseYears,
  num,
  toSelectOptions,
  txt,
} from "../_lib/timetable-report-filters";
import {
  getAttendanceCollegeDeptFilters,
  getCcaActivityReport,
} from "@/services";

const REPORT_TITLE = "CCA Activity Report";

type CcaRow = {
  sNo: number;
  student: string;
  academicDetails: string;
  coCurricularActivities: string;
};

const COL_DEFS = {
  sNo: {
    field: "sNo",
    headerName: "S.No",
    width: 70,
    flex: 0,
  } as ColDef<CcaRow>,
  student: {
    field: "student",
    headerName: "Student",
    minWidth: 180,
  } as ColDef<CcaRow>,
  academicDetails: {
    field: "academicDetails",
    headerName: "Academic Details",
    minWidth: 180,
  } as ColDef<CcaRow>,
  coCurricularActivities: {
    field: "coCurricularActivities",
    headerName: "Co-Curricular Activities",
    minWidth: 220,
  } as ColDef<CcaRow>,
};

const EXCEL_COLUMNS = [
  { key: "sNo", header: "S.No" },
  { key: "student", header: "Student" },
  { key: "academicDetails", header: "Academic Details" },
  { key: "coCurricularActivities", header: "Co-Curricular Activities" },
];

function dash(v: unknown): string {
  if (v == null || String(v).trim() === "") return "-";
  return String(v);
}

export default function CcaActivityReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: sessionLoading } = useSession();
  const { employeeId: loginEmployeeId } = useLoginEmployeeId(
    user,
    sessionLoading,
  );

  const orgId = resolveOrganizationId(user);
  const empId = loginEmployeeId;

  const [collegeId, setCollegeId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [courseGroupId, setCourseGroupId] = useState("");
  const [courseYearId, setCourseYearId] = useState("");

  const [rows, setRows] = useState<CcaRow[]>([]);
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
    queryKey: QK.attendanceReports.collegeDeptFilters(orgId, empId),
    queryFn: () => getAttendanceCollegeDeptFilters(orgId, empId),
    enabled: orgId > 0 && empId > 0,
  });

  const filterRows = useMemo(
    () => (filtersQuery.data?.filtersData ?? []) as Record<string, unknown>[],
    [filtersQuery.data?.filtersData],
  );

  const colleges = useMemo(() => distinctColleges(filterRows), [filterRows]);
  const courses = useMemo(
    () => distinctCourses(filterRows, Number(collegeId || 0), 0),
    [filterRows, collegeId],
  );
  const courseGroups = useMemo(
    () =>
      distinctCourseGroups(
        filterRows,
        Number(collegeId || 0),
        0,
        Number(courseId || 0),
      ),
    [filterRows, collegeId, courseId],
  );
  const courseYears = useMemo(
    () =>
      distinctCourseYears(
        filterRows,
        Number(collegeId || 0),
        0,
        Number(courseId || 0),
        Number(courseGroupId || 0),
      ),
    [filterRows, collegeId, courseId, courseGroupId],
  );

  const collegeOptions = useMemo(
    () =>
      toSelectOptions(
        colleges,
        ["fk_college_id", "collegeId"],
        ["college_code", "collegeCode"],
      ),
    [colleges],
  );
  const courseOptions = useMemo(
    () =>
      toSelectOptions(
        courses,
        ["fk_course_id", "courseId"],
        ["course_code", "courseCode"],
      ),
    [courses],
  );
  const groupOptions = useMemo(
    () =>
      toSelectOptions(
        courseGroups,
        ["fk_course_group_id", "courseGroupId"],
        ["group_code", "groupCode"],
      ),
    [courseGroups],
  );
  const yearOptions = useMemo(
    () =>
      toSelectOptions(
        courseYears,
        ["fk_course_year_id", "courseYearId"],
        ["course_year_name", "courseYearName"],
      ),
    [courseYears],
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
    if (!courses.length) {
      setCourseId("");
      return;
    }
    if (
      !courses.some(
        (r) => num(r.fk_course_id ?? r.courseId) === Number(courseId),
      )
    ) {
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
        (r) =>
          num(r.fk_course_group_id ?? r.courseGroupId) ===
          Number(courseGroupId),
      )
    ) {
      setCourseGroupId(
        String(
          num(
            courseGroups[0].fk_course_group_id ?? courseGroups[0].courseGroupId,
          ),
        ),
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
        (r) =>
          num(r.fk_course_year_id ?? r.courseYearId) === Number(courseYearId),
      )
    ) {
      setCourseYearId(
        String(
          num(courseYears[0].fk_course_year_id ?? courseYears[0].courseYearId),
        ),
      );
    }
  }, [courseYears, courseYearId]);

  const columnDefs = useMemo<ColDef<CcaRow>[]>(
    () => [
      COL_DEFS.sNo,
      COL_DEFS.student,
      COL_DEFS.academicDetails,
      COL_DEFS.coCurricularActivities,
    ],
    [],
  );

  const handleGetList = async () => {
    const cid = Number(collegeId || 0);
    const coid = Number(courseId || 0);
    const gid = Number(courseGroupId || 0);
    const yid = Number(courseYearId || 0);
    if (!cid || !coid || !gid || !yid) {
      toastInfo("All filters are required");
      return;
    }

    const college = colleges.find(
      (r) => num(r.fk_college_id ?? r.collegeId) === cid,
    );
    const course = courses.find(
      (r) => num(r.fk_course_id ?? r.courseId) === coid,
    );
    const group = courseGroups.find(
      (r) => num(r.fk_course_group_id ?? r.courseGroupId) === gid,
    );
    const year = courseYears.find(
      (r) => num(r.fk_course_year_id ?? r.courseYearId) === yid,
    );

    const details = [
      txt(college?.college_code ?? college?.collegeCode),
      txt(course?.course_code ?? course?.courseCode),
      txt(group?.group_code ?? group?.groupCode),
      txt(year?.course_year_name ?? year?.courseYearName),
    ]
      .filter(Boolean)
      .join(" / ");

    setLoadingList(true);
    clearResults();
    setDataDetails(details);
    setCollegeName(
      txt(college?.college_name ?? college?.collegeName) || "College",
    );
    try {
      const raw = await getCcaActivityReport({
        collegeId: cid,
        courseId: coid,
        courseGroupId: gid,
        courseYearId: yid,
      });
      if (raw.length === 0) {
        toastInfo("No records found.");
        return;
      }
      setRows(
        raw.map((row, idx) => ({
          sNo: idx + 1,
          student: dash(row.student_name),
          academicDetails: dash(row.academic_details),
          coCurricularActivities: dash(row.CoCurricular_Activities),
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
    if (rows.length === 0) {
      toastInfo("No records to export.");
      return;
    }
    const headerHtml = `<div style="margin-bottom:12px;">
      <div style="font-size:16px;font-weight:550;">${escapeHtml(REPORT_TITLE)}${dataDetails ? ` - (${escapeHtml(dataDetails)})` : ""}</div>
    </div>`;
    exportHtmlTableAsExcel(
      `${REPORT_TITLE}.xls`,
      buildHtmlTable(EXCEL_COLUMNS, rows),
      headerHtml,
    );
  };

  const printReport = async () => {
    if (rows.length === 0) {
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
        tableHtml: buildHtmlTable(EXCEL_COLUMNS, rows),
      }),
    );
  };

  const goBack = () => {
    router.push(resolveReportCatalogHref(searchParams.get("path")));
  };

  return (
    <FilteredListPage<CcaRow>
      title={
        showTable && dataDetails
          ? `${REPORT_TITLE} - (${dataDetails})`
          : REPORT_TITLE
      }
      filters={
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
              label="Course"
              required
              value={courseId || null}
              onChange={(v) => {
                setCourseId(v ?? "");
                clearResults();
              }}
              options={courseOptions}
              placeholder="Course"
              disabled={!collegeId}
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
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <Button
              type="button"
              className="h-9 w-fit px-4"
              disabled={loadingList}
              onClick={() => void handleGetList()}
            >
              {loadingList ? "Loading…" : "Get CCA Activities"}
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
      showTable={showTable}
      rowData={showTable ? rows : []}
      columnDefs={columnDefs}
      loading={loadingList}
      resultsVisible={showTable}
      hideEmptyGrid
      pagination
      paginationPageSize={25}
      getRowId={(p) => String(p.data?.sNo ?? "")}
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        exportExcel: false,
        exportPdf: false,
        columnPicker: true,
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
