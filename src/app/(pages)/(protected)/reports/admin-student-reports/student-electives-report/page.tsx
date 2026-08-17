"use client";

/**
 * Student Electives Report —
 * Angular `reports/admin-student-reports/student-elective-report` parity.
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
import { rowIndexGetter } from "@/lib/utils";
import { toastError, toastInfo } from "@/lib/toast";
import { MINIO_URL } from "@/config/constants/api";
import { DEFAULT_COLLEGE_LOGO, useCollegeLogo } from "@/hooks/useCollegeLogo";
import {
  filterColleges,
  filterCourses,
  filterCourseYears,
  pickNum,
  pickText,
  type FilterRow,
} from "@/app/(pages)/(protected)/accounts-and-fees/fee-masters/_lib/fee-master-filters";
import {
  getCollegeById,
  getFeeMasterCollegeFilters,
  getStdElectivesReport,
} from "@/services";

const PRINT_REPORT_TITLE = "Student Elective Report";

const LOGO_FILTER_KEYS = [
  "logo_filename",
  "logoFilename",
  "logo",
  "clg_logo",
  "college_logo",
  "logo_path",
  "logoPath",
];

function isDefaultLogoUrl(url: string): boolean {
  return /default_logo\.png/i.test(url);
}

function toPrintLogoUrl(path: string | null | undefined): string {
  const raw = String(path ?? "").trim();
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const fallback = origin
    ? `${origin}${DEFAULT_COLLEGE_LOGO}`
    : DEFAULT_COLLEGE_LOGO;
  if (!raw) return fallback;
  if (/^(https?:\/\/|data:)/i.test(raw)) return raw;
  if (raw.startsWith("/")) return origin ? `${origin}${raw}` : raw;
  const base = String(MINIO_URL ?? "").replace(/\/$/, "");
  if (base) return `${base}/${raw.replace(/^\/+/, "")}`;
  return fallback;
}

async function logoToDataUrl(src: string): Promise<string> {
  const abs = toPrintLogoUrl(src);
  if (abs.startsWith("data:")) return abs;
  try {
    const res = await fetch(abs, { mode: "cors", credentials: "omit" });
    if (!res.ok) return abs;
    const blob = await res.blob();
    if (!blob.type.startsWith("image/")) return abs;
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? abs));
      reader.onerror = () => resolve(abs);
      reader.readAsDataURL(blob);
    });
  } catch {
    return abs;
  }
}

async function resolveElectivesPrintLogo(
  filterRow: FilterRow | null,
  collegeId: number,
  liveLogo: string,
): Promise<string> {
  const fromFilter = pickText(filterRow, LOGO_FILTER_KEYS);
  const fromHook = liveLogo && !isDefaultLogoUrl(liveLogo) ? liveLogo : "";
  let fromCollege = "";
  if (collegeId > 0) {
    try {
      const college = await getCollegeById(collegeId);
      fromCollege = college?.logo ? String(college.logo) : "";
    } catch {
      fromCollege = "";
    }
  }
  for (const candidate of [fromCollege, fromFilter, fromHook, liveLogo]) {
    if (!candidate) continue;
    const url = toPrintLogoUrl(candidate);
    if (!isDefaultLogoUrl(url)) return logoToDataUrl(url);
  }
  return logoToDataUrl(DEFAULT_COLLEGE_LOGO);
}

type AnyRow = Record<string, unknown>;

type ElectiveRow = {
  student_name: string;
  electivegroupname: string;
  subject_name: string;
  college_code: string;
  course_year_name: string;
};

const EXCEL_COLUMNS: { key: string; header: string }[] = [
  { key: "siNo", header: "SI.No" },
  { key: "student_name", header: "Student Name" },
  { key: "electivegroupname", header: "Elective Group Name" },
  { key: "subject_name", header: "Subject Name" },
  { key: "college_code", header: "College Code" },
  { key: "course_year_name", header: "course Year Name" },
];

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<ElectiveRow>,
  studentName: {
    field: "student_name",
    headerName: "Student Name",
    minWidth: 160,
  } as ColDef<ElectiveRow>,
  electiveGroup: {
    field: "electivegroupname",
    headerName: "Elective Group Name",
    minWidth: 160,
  } as ColDef<ElectiveRow>,
  subjectName: {
    field: "subject_name",
    headerName: "Subject Name",
    minWidth: 160,
  } as ColDef<ElectiveRow>,
  collegeCode: {
    field: "college_code",
    headerName: "College Code",
    minWidth: 120,
  } as ColDef<ElectiveRow>,
  courseYearName: {
    field: "course_year_name",
    headerName: "course Year Name",
    minWidth: 140,
  } as ColDef<ElectiveRow>,
};

export default function StudentElectivesReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const orgId = Number(
    globalThis?.localStorage?.getItem("organizationId") ?? 0,
  );
  const empId = Number(globalThis?.localStorage?.getItem("employeeId") ?? 0);

  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [courseId, setCourseId] = useState<string>("0");
  const [courseYearId, setCourseYearId] = useState<string>("0");

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
    queryKey: QK.studentAdmissionReports.filters(orgId, empId),
    queryFn: () => getFeeMasterCollegeFilters(orgId, empId),
    enabled: orgId > 0 && empId > 0,
  });

  const filtersData = useMemo(
    () => (filtersQuery.data?.filtersData ?? []) as FilterRow[],
    [filtersQuery.data?.filtersData],
  );

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

  const courseOptions = useMemo(() => {
    const cid = Number(collegeId ?? 0);
    return filterCourses(filtersData, cid || null).map((r) => ({
      value: String(pickNum(r, ["fk_course_id", "courseId"])),
      label: pickText(r, ["course_code", "courseCode", "course_name"]),
    }));
  }, [filtersData, collegeId]);

  const yearOptions = useMemo(() => {
    const cid = Number(collegeId ?? 0);
    const cr = Number(courseId || 0);
    return filterCourseYears(filtersData, cid || null, cr || null, null)
      .sort(
        (a, b) =>
          pickNum(a, ["year_order", "sortOrder"]) -
          pickNum(b, ["year_order", "sortOrder"]),
      )
      .map((r) => ({
        value: String(pickNum(r, ["fk_course_year_id", "courseYearId"])),
        label: pickText(r, ["course_year_name", "courseYearName"]),
      }));
  }, [filtersData, collegeId, courseId]);

  useEffect(() => {
    if (collegeId || collegeOptions.length === 0) return;
    setCollegeId(collegeOptions[0].value);
  }, [collegeId, collegeOptions]);

  useEffect(() => {
    if (!collegeId) return;
    if (courseOptions.length === 0) {
      setCourseId("0");
      setCourseYearId("0");
      return;
    }
    setCourseId(courseOptions[0].value);
  }, [collegeId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!courseId || courseId === "0") {
      setCourseYearId("0");
      return;
    }
    setCourseYearId(yearOptions[0]?.value ?? "0");
  }, [courseId]); // eslint-disable-line react-hooks/exhaustive-deps

  const onCollegeChange = (v: string | null) => {
    setCollegeId(v);
    setCourseId("0");
    setCourseYearId("0");
    clearResults();
  };

  const buildDataDetails = () => {
    const parts: string[] = [];
    const clg = collegeOptions.find((o) => o.value === collegeId);
    if (clg?.label) parts.push(clg.label);
    const cr = courseOptions.find((o) => o.value === courseId);
    if (cr?.label) parts.push(cr.label);
    const y = yearOptions.find((o) => o.value === courseYearId);
    if (y?.label) parts.push(y.label);
    return parts.join(" / ");
  };

  const displayRows = useMemo<ElectiveRow[]>(
    () =>
      rows.map((row) => ({
        student_name: String(row.student_name ?? ""),
        electivegroupname: String(
          row.electivegroupname ?? row.elective_group_name ?? "",
        ),
        subject_name: String(row.subject_name ?? ""),
        college_code: String(row.college_code ?? row.collegeCode ?? ""),
        course_year_name: String(
          row.course_year_name ?? row.courseYearName ?? "",
        ),
      })),
    [rows],
  );

  const exportRows = useMemo(
    () =>
      displayRows.map((row, i) => ({
        siNo: i + 1,
        ...row,
      })),
    [displayRows],
  );

  const columnDefs = useMemo<ColDef<ElectiveRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.studentName,
      COL_DEFS.electiveGroup,
      COL_DEFS.subjectName,
      COL_DEFS.collegeCode,
      COL_DEFS.courseYearName,
    ],
    [],
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
    if (!Number(courseYearId || 0)) {
      toastInfo("Course Year is required");
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
      const raw = await getStdElectivesReport({
        collegeId: cid,
        courseYearId: Number(courseYearId || 0),
      });
      if (raw.length === 0) {
        toastInfo("No student electives found.");
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
      "Student Electives Report.xls",
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
    const logoSrc = await resolveElectivesPrintLogo(
      selectedCollegeRow,
      cid,
      collegeLogo || DEFAULT_COLLEGE_LOGO,
    );
    const fallbackLogo = toPrintLogoUrl(DEFAULT_COLLEGE_LOGO);
    const tableHtml = buildHtmlTable(EXCEL_COLUMNS, exportRows);
    // Angular print-Section: logo + college name + dataDetails + Student Elective Report
    printHtmlInIframe(`<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>${escapeHtml(PRINT_REPORT_TITLE)}</title>
<style>
@page{margin:12mm}
body{font-family:Arial,sans-serif;padding:12px;color:#111;margin:0}
.header{display:flex;align-items:flex-start;gap:16px;margin-bottom:16px}
.header img{width:90px;height:auto;max-height:100px;object-fit:contain}
.header-text{flex:1;text-align:left}
.collegeName{font-size:24px;font-weight:600;margin:0 0 6px}
.title-2{font-size:19px;font-weight:550;margin:0 0 6px}
.title{font-size:20px;font-weight:550;margin:0}
table{width:100%;border-collapse:collapse;font-size:11px;margin-top:8px}
th,td{border:1px solid #333;padding:6px 5px}
th{background:#f2f2f2}
</style></head><body>
<div class="header">
  <img src="${escapeHtml(logoSrc)}" alt="College Logo"
    onerror="this.onerror=null;this.src='${escapeHtml(fallbackLogo)}'" />
  <div class="header-text">
    <p class="collegeName">${escapeHtml(collegeName || "College")}</p>
    ${dataDetails ? `<p class="title-2">${escapeHtml(dataDetails)}</p>` : ""}
    <p class="title">${escapeHtml(PRINT_REPORT_TITLE)}</p>
  </div>
</div>
${tableHtml}
</body></html>`);
  };

  const goBack = () => {
    router.push(resolveReportCatalogHref(searchParams.get("path")));
  };

  const pageTitle = showTable
    ? `Student Electives Report For : ${dataDetails}`
    : "Student Electives Report";

  return (
    <FilteredListPage<ElectiveRow>
      title={pageTitle}
      filters={
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
              label="Course Year"
              required
              value={courseYearId}
              onChange={(v) => {
                setCourseYearId(v ?? "0");
                clearResults();
              }}
              options={yearOptions}
              placeholder="Course Year"
              disabled={!courseId || courseId === "0"}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              className="h-9 w-fit px-4"
              disabled={loadingList}
              onClick={() => void handleGetList()}
            >
              {loadingList ? "Loading…" : "Get Student Electives"}
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
      }
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
