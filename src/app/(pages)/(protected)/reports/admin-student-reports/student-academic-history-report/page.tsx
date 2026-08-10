"use client";

/**
 * Student Academic History Report —
 * Angular `reports/admin-student-reports/student-academic-history-report` parity.
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
import {
  filterAcademicYears,
  filterColleges,
  filterCourseGroups,
  filterCourses,
  filterCourseYears,
  pickNum,
  pickText,
  type FilterRow,
} from "@/app/(pages)/(protected)/accounts-and-fees/fee-masters/_lib/fee-master-filters";
import {
  getFeeMasterCollegeFilters,
  getStdAcademicHistoryReport,
} from "@/services";

type AnyRow = Record<string, unknown>;

type AcademicHistoryRow = AnyRow & {
  roll_number?: string;
  student_name?: string;
  Gender?: string;
  gender?: string;
  academic_details?: string;
  subject_name?: string;
  subject_code?: string;
};

const EXCEL_COLUMNS: { key: string; header: string }[] = [
  { key: "siNo", header: "SI.No" },
  { key: "roll_number", header: "Roll Number" },
  { key: "student_name", header: "student Name" },
  { key: "Gender", header: "Gender" },
  { key: "academic_details", header: "Academic Details" },
  { key: "subject_name", header: "subject Name" },
];

function subjectDisplay(row: AnyRow | undefined): string {
  if (!row) return "";
  const name = String(row.subject_name ?? "");
  const code = String(row.subject_code ?? "").trim();
  if (!code) return name;
  return name ? `${name} (${code})` : code;
}

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<AcademicHistoryRow>,
  rollNumber: {
    field: "roll_number",
    headerName: "Roll Number",
    minWidth: 120,
    valueGetter: (p) => String(p.data?.roll_number ?? ""),
  } as ColDef<AcademicHistoryRow>,
  studentName: {
    field: "student_name",
    headerName: "student Name",
    minWidth: 160,
    valueGetter: (p) => String(p.data?.student_name ?? ""),
  } as ColDef<AcademicHistoryRow>,
  gender: {
    headerName: "Gender",
    minWidth: 100,
    valueGetter: (p) => String(p.data?.Gender ?? p.data?.gender ?? ""),
  } as ColDef<AcademicHistoryRow>,
  academicDetails: {
    field: "academic_details",
    headerName: "Academic Details",
    minWidth: 180,
    valueGetter: (p) => String(p.data?.academic_details ?? ""),
  } as ColDef<AcademicHistoryRow>,
  subjectName: {
    headerName: "subject Name",
    minWidth: 200,
    valueGetter: (p) => subjectDisplay(p.data),
  } as ColDef<AcademicHistoryRow>,
};

export default function StudentAcademicHistoryReportPage() {
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

  const [rows, setRows] = useState<AcademicHistoryRow[]>([]);
  const [dataDetails, setDataDetails] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [showTable, setShowTable] = useState(false);

  const clearResults = useCallback(() => {
    setRows([]);
    setShowTable(false);
    setDataDetails("");
  }, []);

  const filtersQuery = useQuery({
    queryKey: QK.studentAdmissionReports.filters(orgId, empId),
    queryFn: () => getFeeMasterCollegeFilters(orgId, empId),
    enabled: orgId > 0 && empId > 0,
  });

  const filtersData = useMemo(
    () => (filtersQuery.data?.filtersData ?? []) as FilterRow[],
    [filtersQuery.data?.filtersData],
  );
  const academicData = useMemo(
    () => (filtersQuery.data?.academicData ?? []) as FilterRow[],
    [filtersQuery.data?.academicData],
  );

  const collegeOptions = useMemo(
    () =>
      filterColleges(filtersData).map((r) => ({
        value: String(pickNum(r, ["fk_college_id", "collegeId"])),
        label: pickText(r, ["college_code", "collegeCode"]),
      })),
    [filtersData],
  );

  const ayOptions = useMemo(() => {
    const cid = Number(collegeId ?? 0);
    return filterAcademicYears(academicData, cid || null, filtersData).map(
      (r) => ({
        value: String(pickNum(r, ["fk_academic_year_id", "academicYearId"])),
        label: pickText(r, ["academic_year", "academicYear"]) || "—",
      }),
    );
  }, [academicData, collegeId, filtersData]);

  const courseOptions = useMemo(() => {
    const cid = Number(collegeId ?? 0);
    return filterCourses(filtersData, cid || null).map((r) => ({
      value: String(pickNum(r, ["fk_course_id", "courseId"])),
      label: pickText(r, ["course_code", "courseCode", "course_name"]),
    }));
  }, [filtersData, collegeId]);

  const groupOptions = useMemo(() => {
    const cid = Number(collegeId ?? 0);
    const cr = Number(courseId || 0);
    return filterCourseGroups(filtersData, cid || null, cr || null).map(
      (r) => ({
        value: String(pickNum(r, ["fk_course_group_id", "courseGroupId"])),
        label: pickText(r, ["group_code", "groupCode", "courseGroupCode"]),
      }),
    );
  }, [filtersData, collegeId, courseId]);

  const yearOptions = useMemo(() => {
    const cid = Number(collegeId ?? 0);
    const cr = Number(courseId || 0);
    const g = Number(courseGroupId || 0);
    return filterCourseYears(filtersData, cid || null, cr || null, g || null)
      .sort(
        (a, b) =>
          pickNum(a, ["year_order", "sortOrder"]) -
          pickNum(b, ["year_order", "sortOrder"]),
      )
      .map((r) => ({
        value: String(pickNum(r, ["fk_course_year_id", "courseYearId"])),
        label: pickText(r, ["course_year_name", "courseYearName"]),
      }));
  }, [filtersData, collegeId, courseId, courseGroupId]);

  useEffect(() => {
    if (collegeId || collegeOptions.length === 0) return;
    setCollegeId(collegeOptions[0].value);
  }, [collegeId, collegeOptions]);

  useEffect(() => {
    if (!collegeId) return;
    const rowsAy = filterAcademicYears(
      academicData,
      Number(collegeId),
      filtersData,
    );
    if (rowsAy.length === 0) {
      setAcademicYearId("0");
      setCourseId("0");
      setCourseGroupId("0");
      setCourseYearId("0");
      return;
    }
    const current =
      rowsAy.find((r) => Number(r.is_curr_ay ?? 0) === 1) ?? rowsAy[0];
    setAcademicYearId(
      String(pickNum(current, ["fk_academic_year_id", "academicYearId"])),
    );
  }, [collegeId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!collegeId || !academicYearId) return;
    if (courseOptions.length === 0) {
      setCourseId("0");
      setCourseGroupId("0");
      setCourseYearId("0");
      return;
    }
    setCourseId(courseOptions[0].value);
  }, [collegeId, academicYearId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!courseId || courseId === "0") {
      setCourseGroupId("0");
      setCourseYearId("0");
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

  const onCollegeChange = (v: string | null) => {
    setCollegeId(v);
    setAcademicYearId("0");
    setCourseId("0");
    setCourseGroupId("0");
    setCourseYearId("0");
    clearResults();
  };

  const buildDataDetails = () => {
    const parts: string[] = [];
    const clg = collegeOptions.find((o) => o.value === collegeId);
    if (clg?.label) parts.push(clg.label);
    const ay = ayOptions.find((o) => o.value === academicYearId);
    if (ay?.label) parts.push(ay.label);
    const cr = courseOptions.find((o) => o.value === courseId);
    if (cr?.label) parts.push(cr.label);
    const g = groupOptions.find((o) => o.value === courseGroupId);
    if (g?.label) parts.push(g.label);
    const y = yearOptions.find((o) => o.value === courseYearId);
    if (y?.label) parts.push(y.label);
    return parts.join(" / ");
  };

  const exportRows = useMemo(
    () =>
      rows.map((row, i) => ({
        siNo: i + 1,
        roll_number: String(row.roll_number ?? ""),
        student_name: String(row.student_name ?? ""),
        Gender: String(row.Gender ?? row.gender ?? ""),
        academic_details: String(row.academic_details ?? ""),
        subject_name: subjectDisplay(row),
      })),
    [rows],
  );

  const columnDefs = useMemo<ColDef<AcademicHistoryRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.rollNumber,
      COL_DEFS.studentName,
      COL_DEFS.gender,
      COL_DEFS.academicDetails,
      COL_DEFS.subjectName,
    ],
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

    const details = buildDataDetails();
    setLoadingList(true);
    clearResults();
    setDataDetails(details);
    try {
      const raw = await getStdAcademicHistoryReport({
        collegeId: cid,
        courseId: Number(courseId || 0),
        academicYearId: Number(academicYearId || 0),
        courseGroupId: Number(courseGroupId || 0),
        courseYearId: Number(courseYearId || 0),
      });
      if (raw.length === 0) {
        toastInfo("No academic history found.");
        return;
      }
      setRows(raw as AcademicHistoryRow[]);
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
    const headerHtml = `<div style="font-weight:600;margin-bottom:8px;">Student Academic History Report${dataDetails ? ` — ${escapeHtml(dataDetails)}` : ""}</div>`;
    const tableHtml = buildHtmlTable(EXCEL_COLUMNS, exportRows);
    exportHtmlTableAsExcel(
      "Student Academic History Report.xls",
      tableHtml,
      headerHtml,
    );
  };

  const printReport = () => {
    if (exportRows.length === 0) {
      toastInfo("No records to print.");
      return;
    }
    const tableHtml = buildHtmlTable(EXCEL_COLUMNS, exportRows);
    printHtmlInIframe(`<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Student Academic History Report</title>
<style>
body{font-family:Arial,sans-serif;padding:16px;color:#111}
table{width:100%;border-collapse:collapse;font-size:11px}
th,td{border:1px solid #333;padding:3px 5px}
th{background:#e8f0fe}
</style></head><body>
<p style="font-weight:600">Student Academic History Report${dataDetails ? ` — ${escapeHtml(dataDetails)}` : ""}</p>
${tableHtml}
</body></html>`);
  };

  const goBack = () => {
    router.push(resolveReportCatalogHref(searchParams.get("path")));
  };

  const pageTitle = showTable
    ? `Student Academic History Report For : ${dataDetails}`
    : "Student Academic History Report";

  return (
    <FilteredListPage<AcademicHistoryRow>
      title={pageTitle}
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
              required
              value={courseYearId}
              onChange={(v) => {
                setCourseYearId(v ?? "0");
                clearResults();
              }}
              options={yearOptions}
              placeholder="Course Year"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              className="h-9 w-fit px-4"
              disabled={loadingList}
              onClick={() => void handleGetList()}
            >
              {loadingList ? "Loading…" : "Get Academic History List"}
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
