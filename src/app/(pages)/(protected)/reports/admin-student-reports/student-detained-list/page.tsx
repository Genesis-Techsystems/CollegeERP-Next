"use client";

/**
 * Students Detained List Report —
 * Angular `reports/student-admission-reports/student-detained-list` parity.
 * Get List: `getAllRecords/s_get_student_reports?in_flag=sem_std_detained_list&…`
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
const REPORT_TITLE = "Students Detained List Report";

const EXCEL_COLUMNS = [
  { key: "siNo", header: "SI.No" },
  { key: "Roll_No", header: "Roll No" },
  { key: "Gender", header: "Gender" },
  { key: "Academic_Details", header: "Academic Details" },
  { key: "Detained_Date", header: "Detained Date" },
  { key: "Reason", header: "Reason" },
  { key: "Current_Status", header: "Current Status" },
] as const;

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<AnyRow>,
  rollNo: {
    field: "Roll_No",
    headerName: "Roll No",
    minWidth: 110,
  } as ColDef<AnyRow>,
  gender: {
    field: "Gender",
    headerName: "Gender",
    minWidth: 90,
  } as ColDef<AnyRow>,
  academicDetails: {
    field: "Academic_Details",
    headerName: "Academic Details",
    minWidth: 160,
  } as ColDef<AnyRow>,
  detainedDate: {
    field: "Detained_Date",
    headerName: "Detained Date",
    minWidth: 120,
  } as ColDef<AnyRow>,
  reason: {
    field: "Reason",
    headerName: "Reason",
    minWidth: 140,
  } as ColDef<AnyRow>,
  currentStatus: {
    field: "Current_Status",
    headerName: "Current Status",
    minWidth: 120,
  } as ColDef<AnyRow>,
};

function gmOptions(rows: FilterRow[], gmId: number) {
  return rows
    .filter((r) => Number(r.pk_gm_id ?? r.generalMasterId ?? 0) === gmId)
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

export default function StudentDetainedListReportPage() {
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
    return [
      ALL0,
      ...filterAcademicYears(academicData, cid || null, filtersData).map(
        (r) => ({
          value: String(pickNum(r, ["fk_academic_year_id", "academicYearId"])),
          label: pickText(r, ["academic_year", "academicYear"]) || "—",
        }),
      ),
    ];
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

  const quotaOptions = useMemo(() => [ALL0, ...gmOptions(gmRows, 8)], [gmRows]);

  useEffect(() => {
    if (collegeId || collegeOptions.length === 0) return;
    setCollegeId(collegeOptions[0].value);
  }, [collegeId, collegeOptions]);

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
    const ay = ayOptions.find(
      (o) => o.value === academicYearId && o.value !== "0",
    );
    if (ay?.label) parts.push(ay.label);
    const cr = courseOptions.find(
      (o) => o.value === courseId && o.value !== "0",
    );
    if (cr?.label) parts.push(cr.label);
    const g = groupOptions.find(
      (o) => o.value === courseGroupId && o.value !== "0",
    );
    if (g?.label) parts.push(g.label);
    const y = yearOptions.find(
      (o) => o.value === courseYearId && o.value !== "0",
    );
    if (y?.label) parts.push(y.label);
    let details = parts.join(" / ");
    const q = quotaOptions.find((o) => o.value === quotaId && o.value !== "0");
    if (q?.label) details = `${details} - ${q.label}`;
    else if (quotaId === "0") details = `${details} - All`;
    return details;
  };

  const handleGetList = async () => {
    const cid = Number(collegeId ?? 0);
    if (!cid) {
      toastInfo("College is required");
      return;
    }
    setLoadingList(true);
    clearResults();
    const details = buildDataDetails();
    setDataDetails(details);
    try {
      const [raw, college] = await Promise.all([
        fetchStudentReports({
          flag: "sem_std_detained_list",
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
        toastInfo("No detained student records found.");
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
        Roll_No: String(row.Roll_No ?? ""),
        Gender: String(row.Gender ?? ""),
        Academic_Details: String(row.Academic_Details ?? ""),
        Detained_Date: String(row.Detained_Date ?? ""),
        Reason: String(row.Reason ?? ""),
        Current_Status: String(row.Current_Status ?? ""),
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
table{width:100%;border-collapse:collapse;font-size:10px}
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
      COL_DEFS.rollNo,
      COL_DEFS.gender,
      COL_DEFS.academicDetails,
      COL_DEFS.detainedDate,
      COL_DEFS.reason,
      COL_DEFS.currentStatus,
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
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[7.5rem] flex-1 basis-[7.5rem] sm:min-w-[8.5rem]">
            <Select
              label="College"
              required
              value={collegeId}
              onChange={onCollegeChange}
              options={collegeOptions}
              placeholder="College"
              isLoading={loadingFilters}
            />
          </div>
          <div className="min-w-[8.5rem] flex-1 basis-[8.5rem] sm:min-w-[9.5rem]">
            <Select
              label="Academic Year"
              value={academicYearId}
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
              value={courseYearId}
              onChange={(v) => {
                setCourseYearId(v ?? "0");
                clearResults();
              }}
              options={yearOptions}
              placeholder="Course Year"
              disabled={!collegeId}
            />
          </div>
          <div className="min-w-[7rem] flex-1 basis-[7rem] sm:min-w-[8rem]">
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
              {loadingList ? "Loading…" : "Get Detained List"}
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
      showTable={showTable}
      rowData={showTable ? rows : []}
      columnDefs={columnDefs}
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
