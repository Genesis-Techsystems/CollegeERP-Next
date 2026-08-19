"use client";

/**
 * Student Admission Report (Day Wise) —
 * Angular AMS `day-wise-admission-report` parity (relabeled Quota/Course/Route columns).
 * Get List: `getAllRecords/s_get_student_reports?in_flag=admission_report&…`
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format, isValid, parseISO } from "date-fns";
import type { ColDef, ValueFormatterParams } from "ag-grid-community";
import { FileSpreadsheet, Printer } from "lucide-react";
import { Select } from "@/common/components/select";
import {
  buildHtmlTable,
  escapeHtml,
  exportHtmlTableAsExcel,
} from "@/common/export-html-table";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
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
import { useCollegeLogo, DEFAULT_COLLEGE_LOGO } from "@/hooks/useCollegeLogo";
import { getErrorMessage } from "@/lib/errors";
import { printHtmlInIframe } from "@/lib/print";
import { resolveReportCatalogHref } from "@/lib/report-catalog";
import { toastError, toastInfo } from "@/lib/toast";
import { rowIndexGetter } from "@/lib/utils";
import {
  fetchStudentReports,
  getCollegeById,
  getFeePaylinkCollegeFilters,
} from "@/services";

type AnyRow = Record<string, unknown>;

const ALL0 = { value: "0", label: "All" };
const REPORT_TITLE = "Student Admission Report";

const EXCEL_COLUMNS = [
  { key: "siNo", header: "SI.No" },
  { key: "Application_Number", header: "Application Number" },
  { key: "Academic_Details", header: "Academic Details" },
  { key: "Student_Quota", header: "Student Quota" },
  { key: "Regulation", header: "Regulation" },
  { key: "Lateral", header: "Lateral" },
  { key: "Student_Name", header: "Student Name" },
  { key: "Gender", header: "Gender" },
  { key: "Student_Mobile", header: "Student Mobile" },
  { key: "Father_Name", header: "Father Name" },
  { key: "Student_Status", header: "Student Status" },
] as const;

function rowText(row: AnyRow, key: string): string {
  const v = row[key];
  if (v == null || v === "") return "";
  return String(v);
}

/** Angular AMS: Admission_Date column header is "Course", formatted `dd MMM, y`. */
function formatAdmissionDate(value: unknown): string {
  if (value == null || value === "") return "";
  const raw = String(value).trim();
  if (!raw) return "";
  const d = parseISO(raw.includes("T") ? raw : raw.slice(0, 10));
  if (!isValid(d)) return raw;
  return format(d, "dd MMM, yyyy");
}

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<AnyRow>,
  applicationNumber: {
    field: "Application_Number",
    headerName: "Application Number",
    minWidth: 160,
    width: 160,
  } as ColDef<AnyRow>,
  academicDetails: {
    field: "Academic_Details",
    headerName: "Academic Details",
    minWidth: 260,
    width: 260,
  } as ColDef<AnyRow>,

  studentQuota: {
    field: "Student_Quota",
    headerName: "Student Quota",
    minWidth: 140,
    width: 140,
  } as ColDef<AnyRow>,
  regulation: {
    field: "Regulation",
    headerName: "Regulation",
    minWidth: 110,
    width: 110,
  } as ColDef<AnyRow>,
  lateral: {
    field: "Lateral",
    headerName: "Lateral",
    minWidth: 90,
    width: 90,
  } as ColDef<AnyRow>,
  studentName: {
    field: "Student_Name",
    headerName: "Student Name",
    minWidth: 200,
    width: 200,
  } as ColDef<AnyRow>,
  gender: {
    field: "Gender",
    headerName: "Gender",
    minWidth: 90,
    width: 90,
  } as ColDef<AnyRow>,
  studentMobile: {
    field: "Student_Mobile",
    headerName: "Student Mobile",
    minWidth: 130,
    width: 130,
  } as ColDef<AnyRow>,
  fatherName: {
    field: "Father_Name",
    headerName: "Father Name",
    minWidth: 180,
    width: 180,
  } as ColDef<AnyRow>,
  studentStatus: {
    field: "Student_Status",
    headerName: "Student Status",
    minWidth: 140,
    width: 140,
  } as ColDef<AnyRow>,
};

function gmQuotaOptions(rows: FilterRow[]) {
  return rows
    .filter((r) => Number(r.pk_gm_id ?? r.generalMasterId ?? 0) === 8)
    .map((r) => ({
      value: String(r.pk_gd_id ?? r.generalDetailId ?? ""),
      label: String(r.gd_name ?? r.generalDetailDisplayName ?? r.gd_code ?? ""),
    }))
    .filter((o) => o.value && o.value !== "0");
}

function buildBannerHtml(opts: {
  logoSrc: string;
  collegeName: string;
  dataDetails: string;
  orgCode: string;
}): string {
  const { logoSrc, collegeName, dataDetails, orgCode } = opts;
  if (orgCode === "SUK") {
    return `<div style="text-align:center;margin-bottom:12px;">
      <img src="${escapeHtml(logoSrc)}" alt="" style="height:120px;max-width:90%;object-fit:contain;" />
      <p style="font-size:16px;font-weight:700;margin:8px 0 4px;">${escapeHtml(collegeName)}</p>
      <p style="font-size:13px;margin:2px 0;">${escapeHtml(dataDetails)}</p>
      <p style="font-size:13px;font-weight:600;margin:2px 0;">${REPORT_TITLE}</p>
    </div>`;
  }
  return `<div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px;">
    <img src="${escapeHtml(logoSrc)}" alt="" style="height:72px;width:auto;object-fit:contain;" />
    <div>
      <p style="font-size:16px;font-weight:700;margin:0 0 4px;text-align:left;">${escapeHtml(collegeName)}</p>
      <p style="font-size:13px;margin:2px 0;text-align:left;">${escapeHtml(dataDetails)}</p>
      <p style="font-size:13px;font-weight:600;margin:2px 0;text-align:left;">${REPORT_TITLE}</p>
    </div>
  </div>`;
}

export default function DayWiseAdmissionReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgCode =
    typeof globalThis.localStorage !== "undefined"
      ? String(globalThis.localStorage.getItem("orgCode") ?? "")
      : "";

  const [filtersData, setFiltersData] = useState<FilterRow[]>([]);
  const [academicData, setAcademicData] = useState<FilterRow[]>([]);
  const [gmRows, setGmRows] = useState<FilterRow[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(true);

  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [academicYearId, setAcademicYearId] = useState<string>("0");
  const [courseId, setCourseId] = useState<string>("0");
  const [courseGroupId, setCourseGroupId] = useState<string>("0");
  const [courseYearId, setCourseYearId] = useState<string>("0");
  const [quotaId, setQuotaId] = useState<string>("0");

  const [rows, setRows] = useState<AnyRow[]>([]);
  const [dataDetails, setDataDetails] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [showTable, setShowTable] = useState(false);

  const collegeNum = Number(collegeId ?? 0) || null;
  const collegeLogo = useCollegeLogo(collegeNum);

  const clearResults = useCallback(() => {
    setRows([]);
    setShowTable(false);
    setDataDetails("");
    setCollegeName("");
  }, []);

  useEffect(() => {
    const orgId = Number(
      globalThis.localStorage?.getItem("organizationId") ?? 0,
    );
    const empId = Number(globalThis.localStorage?.getItem("employeeId") ?? 0);
    if (!orgId || !empId) {
      setLoadingFilters(false);
      return;
    }
    let cancelled = false;
    setLoadingFilters(true);
    void getFeePaylinkCollegeFilters(orgId, empId)
      .then((data) => {
        if (cancelled) return;
        setFiltersData((data.filtersData ?? []) as FilterRow[]);
        setAcademicData((data.academicData ?? []) as FilterRow[]);
        setGmRows((data.generalDetails ?? []) as FilterRow[]);
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
    return [
      ALL0,
      ...filterCourseGroups(filtersData, cid || null, cr || null).map((r) => ({
        value: String(pickNum(r, ["fk_course_group_id", "courseGroupId"])),
        label: pickText(r, ["group_code", "groupCode", "courseGroupCode"]),
      })),
    ];
  }, [filtersData, collegeId, courseId]);

  const yearOptions = useMemo(() => {
    const cid = Number(collegeId ?? 0);
    const cr = Number(courseId || 0);
    const g = Number(courseGroupId || 0);
    return [
      ALL0,
      ...filterCourseYears(filtersData, cid || null, cr || null, g || null)
        .sort(
          (a, b) =>
            pickNum(a, ["year_order", "sortOrder"]) -
            pickNum(b, ["year_order", "sortOrder"]),
        )
        .map((r) => ({
          value: String(pickNum(r, ["fk_course_year_id", "courseYearId"])),
          label: pickText(r, ["course_year_name", "courseYearName"]),
        })),
    ];
  }, [filtersData, collegeId, courseId, courseGroupId]);

  const quotaOptions = useMemo(
    () => [ALL0, ...gmQuotaOptions(gmRows)],
    [gmRows],
  );

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
    const courses = courseOptions;
    if (courses.length === 0) {
      setCourseId("0");
      setCourseGroupId("0");
      setCourseYearId("0");
      return;
    }
    setCourseId(courses[0].value);
  }, [collegeId, academicYearId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!courseId || courseId === "0") {
      setCourseGroupId("0");
      setCourseYearId("0");
      return;
    }
    const groups = groupOptions.filter((o) => o.value !== "0");
    setCourseGroupId(groups[0]?.value ?? "0");
  }, [courseId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!courseGroupId || courseGroupId === "0") {
      setCourseYearId("0");
      return;
    }
    const years = yearOptions.filter((o) => o.value !== "0");
    setCourseYearId(years[0]?.value ?? "0");
  }, [courseGroupId]); // eslint-disable-line react-hooks/exhaustive-deps

  const onCollegeChange = (v: string | null) => {
    setCollegeId(v);
    setAcademicYearId("0");
    setCourseId("0");
    setCourseGroupId("0");
    setCourseYearId("0");
    setQuotaId("0");
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
    const g = groupOptions.find(
      (o) => o.value === courseGroupId && o.value !== "0",
    );
    if (g?.label) parts.push(g.label);
    const y = yearOptions.find(
      (o) => o.value === courseYearId && o.value !== "0",
    );
    if (y?.label) parts.push(y.label);
    const q = quotaOptions.find((o) => o.value === quotaId && o.value !== "0");
    if (q?.label) parts.push(q.label);
    return parts.join(" / ");
  };

  const handleGetList = async () => {
    const cid = Number(collegeId ?? 0);
    if (!cid) {
      toastInfo("College is required");
      return;
    }
    if (!academicYearId || academicYearId === "0") {
      toastInfo("Academic Year is required");
      return;
    }
    if (!courseId || courseId === "0") {
      toastInfo("Course is required");
      return;
    }
    if (!courseGroupId) {
      toastInfo("Course Group is required");
      return;
    }
    if (!courseYearId) {
      toastInfo("Course Year is required");
      return;
    }
    setLoadingList(true);
    clearResults();
    const details = buildDataDetails();
    setDataDetails(details);
    try {
      const [raw, college] = await Promise.all([
        fetchStudentReports({
          flag: "admission_report",
          fromDate: "1990-01-01",
          toDate: "1990-01-01",
          collegeId: cid,
          courseId: Number(courseId || 0),
          academicYearId: Number(academicYearId || 0),
          courseGroupId: Number(courseGroupId || 0),
          courseYearId: Number(courseYearId || 0),
          quotaId: Number(quotaId || 0),
          regulationId: 0,
          isCurrentYear: -1,
          isLateral: -1,
          appStatus: 0,
          studentStatusIds: 0,
        }),
        getCollegeById(cid).catch(() => null),
      ]);
      setCollegeName(
        String(
          college?.collegeName ??
            collegeOptions.find((o) => o.value === collegeId)?.label ??
            "",
        ),
      );
      if (raw.length === 0) {
        toastInfo("No admissions found.");
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
        Application_Number: rowText(row, "Application_Number"),
        Academic_Details: rowText(row, "Academic_Details"),
        Admission_Number: rowText(row, "Admission_Number"),
        Admission_Date: formatAdmissionDate(row.Admission_Date),
        RollNo: rowText(row, "RollNo"),
        Student_Quota: rowText(row, "Student_Quota"),
        Regulation: rowText(row, "Regulation"),
        Lateral: rowText(row, "Lateral"),
        Student_Name: rowText(row, "Student_Name"),
        Gender: rowText(row, "Gender"),
        Student_Mobile: rowText(row, "Student_Mobile"),
        Father_Name: rowText(row, "Father_Name"),
        Student_Status: rowText(row, "Student_Status"),
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
      orgCode,
    });
    const tableHtml = buildHtmlTable(
      EXCEL_COLUMNS.map((c) => ({ key: c.key, header: c.header })),
      exportFlatRows as Record<string, unknown>[],
    );
    printHtmlInIframe(`<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>${REPORT_TITLE}</title>
<style>
body{font-family:Arial,sans-serif;padding:16px;color:#111}
table{width:100%;border-collapse:collapse;font-size:11px}
th,td{border:1px solid #333;padding:3px 5px}
th{background:#e8f0fe;text-align:center}
</style></head><body>
${headerHtml}
${tableHtml}
</body></html>`);
  }, [collegeLogo, collegeName, dataDetails, exportFlatRows, orgCode]);

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.applicationNumber,
      COL_DEFS.academicDetails,
      // COL_DEFS.quota,
      // COL_DEFS.course,
      // COL_DEFS.route,
      COL_DEFS.studentQuota,
      COL_DEFS.regulation,
      COL_DEFS.lateral,
      COL_DEFS.studentName,
      COL_DEFS.gender,
      COL_DEFS.studentMobile,
      COL_DEFS.fatherName,
      // COL_DEFS.workflowName,
      COL_DEFS.studentStatus,
    ],
    [],
  );

  const goBack = () => {
    router.push(resolveReportCatalogHref(searchParams.get("path")));
  };

  const pageTitle = showTable
    ? dataDetails
      ? `${REPORT_TITLE} — ${dataDetails}`
      : REPORT_TITLE
    : REPORT_TITLE;

  return (
    <FilteredListPage
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
              isLoading={loadingFilters}
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
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-full min-w-[10rem] sm:w-[12rem]">
              <Select
                label="Quota"
                value={quotaId}
                onChange={(v) => {
                  setQuotaId(v ?? "0");
                  clearResults();
                }}
                options={quotaOptions}
                placeholder="Quota"
              />
            </div>
            <div className="flex shrink-0 items-center gap-2 pb-0.5">
              <Button
                type="button"
                className="h-9 w-fit px-4"
                disabled={loadingList}
                onClick={() => void handleGetList()}
              >
                {loadingList ? "Loading…" : "Get Admissions"}
              </Button>
              <Button
                type="button"
                className="h-9 min-w-20 !border-0 !bg-[#ffcf46] px-4 !text-black shadow-sm hover:!bg-[#e5b535]"
                onClick={goBack}
              >
                Back
              </Button>
            </div>
          </div>
        </div>
      }
      showTable={showTable}
      rowData={showTable ? rows : []}
      columnDefs={columnDefs}
      fitColumnsToWidth={false}
      pagination
      loading={loadingList || loadingFilters}
      resultsVisible={showTable}
      hideEmptyGrid
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
              onClick={handlePrintReport}
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
