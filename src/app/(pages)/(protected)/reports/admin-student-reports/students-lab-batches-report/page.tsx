"use client";

/**
 * Students Lab Batches Report —
 * Angular `reports/admin-student-reports/students-lab-batches-report` parity.
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
  getCollegeById,
  getFeeMasterCollegeFilters,
  getStdLabBatchesReport,
} from "@/services";

const ALL0 = { value: "0", label: "All" };
const PRINT_REPORT_TITLE = "Students Lab Batches Report By Course/Class";

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

/** Angular: `MINIO + logo_filename` — absolute URL for print iframe. */
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

async function resolveLabBatchesPrintLogo(
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

type LabBatchRow = {
  roll_number: string;
  student_name: string;
  batch_name: string;
  academic_year: string;
  academic_details: string;
};

const EXCEL_COLUMNS: { key: string; header: string }[] = [
  { key: "siNo", header: "SI.No" },
  { key: "roll_number", header: "Roll Number" },
  { key: "student_name", header: "Student Name" },
  { key: "batch_name", header: "Batch Name" },
  { key: "academic_year", header: "Academic Year" },
  { key: "academic_details", header: "Academic details" },
];

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<LabBatchRow>,
  rollNumber: {
    field: "roll_number",
    headerName: "Roll Number",
    minWidth: 120,
  } as ColDef<LabBatchRow>,
  studentName: {
    field: "student_name",
    headerName: "Student Name",
    minWidth: 160,
  } as ColDef<LabBatchRow>,
  batchName: {
    field: "batch_name",
    headerName: "Batch Name",
    minWidth: 140,
  } as ColDef<LabBatchRow>,
  academicYear: {
    field: "academic_year",
    headerName: "Academic Year",
    minWidth: 120,
  } as ColDef<LabBatchRow>,
  academicDetails: {
    field: "academic_details",
    headerName: "Academic details",
    minWidth: 180,
  } as ColDef<LabBatchRow>,
};

export default function StudentsLabBatchesReportPage() {
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

  const selectedCollegeRow = useMemo(
    () =>
      filterColleges(filtersData).find(
        (r) =>
          String(pickNum(r, ["fk_college_id", "collegeId"])) ===
          String(collegeId ?? ""),
      ) ?? null,
    [filtersData, collegeId],
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
    return [
      ALL0,
      ...filterCourses(filtersData, cid || null).map((r) => ({
        value: String(pickNum(r, ["fk_course_id", "courseId"])),
        label: pickText(r, ["course_code", "courseCode", "course_name"]),
      })),
    ];
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
    const courses = courseOptions.filter((o) => o.value !== "0");
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
    clearResults();
  };

  /** Angular: `GIT01/2026-2027 / BBA1 / GITBBA / SEM1` */
  const buildDataDetails = () => {
    const clg =
      pickText(selectedCollegeRow, ["college_code", "collegeCode"]) ||
      collegeOptions.find((o) => o.value === collegeId)?.label ||
      "";
    const ay = ayOptions.find((o) => o.value === academicYearId)?.label || "";
    let details = clg && ay ? `${clg}/${ay}` : clg || ay;
    const cr = courseOptions.find(
      (o) => o.value === courseId && o.value !== "0",
    )?.label;
    if (cr) details = details ? `${details} / ${cr}` : cr;
    const g = groupOptions.find(
      (o) => o.value === courseGroupId && o.value !== "0",
    )?.label;
    if (g) details = details ? `${details} / ${g}` : g;
    const y = yearOptions.find(
      (o) => o.value === courseYearId && o.value !== "0",
    )?.label;
    if (y) details = details ? `${details} / ${y}` : y;
    return details;
  };

  const displayRows = useMemo<LabBatchRow[]>(
    () =>
      rows.map((row) => ({
        roll_number: String(row.roll_number ?? ""),
        student_name: String(row.student_name ?? ""),
        batch_name: String(row.batch_name ?? ""),
        academic_year: String(row.academic_year ?? ""),
        academic_details: String(row.academic_details ?? ""),
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

  const columnDefs = useMemo<ColDef<LabBatchRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.rollNumber,
      COL_DEFS.studentName,
      COL_DEFS.batchName,
      COL_DEFS.academicYear,
      COL_DEFS.academicDetails,
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
    if (!courseId) {
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
      const raw = await getStdLabBatchesReport({
        collegeId: cid,
        courseId: Number(courseId || 0),
        academicYearId: Number(academicYearId || 0),
        courseGroupId: Number(courseGroupId || 0),
        courseYearId: Number(courseYearId || 0),
      });
      if (raw.length === 0) {
        toastInfo("No student labs found.");
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
      "Students Lab Batches Report.xls",
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
    const logoSrc = await resolveLabBatchesPrintLogo(
      selectedCollegeRow,
      cid,
      collegeLogo || DEFAULT_COLLEGE_LOGO,
    );
    const fallbackLogo = toPrintLogoUrl(DEFAULT_COLLEGE_LOGO);
    const tableHtml = buildHtmlTable(EXCEL_COLUMNS, exportRows);
    // Angular print-Section: logo left + college name + dataDetails + title
    printHtmlInIframe(`<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>${escapeHtml(PRINT_REPORT_TITLE)}</title>
<style>
@page{margin:12mm}
body{font-family:Arial,sans-serif;padding:12px;color:#111;margin:0}
.header{display:flex;align-items:flex-start;gap:16px;margin-bottom:16px}
.header img{width:90px;height:auto;max-height:100px;object-fit:contain}
.header-text{flex:1;text-align:left}
.collegeName{font-size:24px;font-weight:600;margin:0 0 6px}
.title{font-size:19px;font-weight:550;margin:0 0 6px}
.title-2{font-size:20px;font-weight:550;margin:0}
table{width:100%;border-collapse:collapse;font-size:11px;margin-top:8px}
th,td{border:1px solid #333;padding:6px 5px}
th{background:#f2f2f2}
</style></head><body>
<div class="header">
  <img src="${escapeHtml(logoSrc)}" alt="College Logo"
    onerror="this.onerror=null;this.src='${escapeHtml(fallbackLogo)}'" />
  <div class="header-text">
    <p class="collegeName">${escapeHtml(collegeName || "College")}</p>
    ${dataDetails ? `<p class="title">${escapeHtml(dataDetails)}</p>` : ""}
    <p class="title-2">${escapeHtml(PRINT_REPORT_TITLE)}</p>
  </div>
</div>
${tableHtml}
</body></html>`);
  };

  const goBack = () => {
    router.push(resolveReportCatalogHref(searchParams.get("path")));
  };

  const pageTitle = showTable
    ? `Students Lab Batches Report For : ${dataDetails}`
    : "Students Lab Batches Report";

  return (
    <FilteredListPage<LabBatchRow>
      title={pageTitle}
      filters={
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[7.5rem] flex-1 basis-[7.5rem] sm:min-w-[8.5rem]">
            <Select
              label="College"
              required
              value={collegeId}
              onChange={onCollegeChange}
              options={collegeOptions}
              placeholder="College"
              isLoading={filtersQuery.isLoading}
            />
          </div>
          <div className="min-w-[8.5rem] flex-1 basis-[8.5rem] sm:min-w-[9.5rem]">
            <Select
              label="Academic Year"
              required
              value={academicYearId === "0" ? null : academicYearId}
              onChange={(v) => {
                setAcademicYearId(v ?? "0");
                clearResults();
              }}
              options={ayOptions}
              placeholder="Academic Year"
            />
          </div>
          <div className="min-w-[7rem] flex-1 basis-[7rem] sm:min-w-[8rem]">
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
          </div>
          <div className="min-w-[8rem] flex-1 basis-[8rem] sm:min-w-[9rem]">
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
              disabled={!collegeId}
            />
          </div>
          <div className="min-w-[7.5rem] flex-1 basis-[7.5rem] sm:min-w-[8.5rem]">
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
          <div className="flex shrink-0 items-center gap-2 pb-0.5">
            <Button
              type="button"
              className="h-9 w-fit px-4"
              disabled={loadingList}
              onClick={() => void handleGetList()}
            >
              {loadingList ? "Loading…" : "Get Student Labs"}
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
