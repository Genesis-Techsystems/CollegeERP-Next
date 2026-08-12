"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef } from "ag-grid-community";
import { RefreshCw } from "lucide-react";
import { FilteredListPage } from "@/components/layout";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { Select } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { rowIndexGetter } from "@/lib/utils";
import { dedupeBy, num, txt } from "@/common/utils/data-helpers";
import { toastError, toastSuccess } from "@/lib/toast";
import { toast } from "sonner";
import { printHtmlInIframe } from "@/lib/print";
import { DEFAULT_COLLEGE_LOGO } from "@/hooks/useCollegeLogo";
import {
  buildHtmlTable,
  exportHtmlTableAsExcel,
} from "../../_lib/export-html-table";
import {
  buildCurriculumDisplayColumnKeys,
  getCurriculumReportFilters,
  getCurriculumReportList,
  getCollegeById,
} from "@/services";
import {
  isDefaultLogoUrl,
  logoToDataUrl,
  toPrintLogoUrl,
} from "@/app/(pages)/(protected)/reports/admin-attendance-reports/_lib/attendance-report-print";

type AnyRow = Record<string, unknown>;

const toastInfo = (msg: string) => toast.info(msg);

const TOOLBAR = {
  search: true,
  searchPlaceholder: "Search...",
  columnPicker: false,
  exportPdf: false,
  exportExcel: false,
  columnFilters: false,
} as const;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function collegeIdOf(row: AnyRow): number {
  return num(row.fk_college_id);
}

function courseIdOf(row: AnyRow): number {
  return num(row.fk_course_id);
}

function groupIdOf(row: AnyRow): number {
  return num(row.fk_course_group_id);
}

function yearIdOf(row: AnyRow): number {
  return num(row.fk_course_year_id);
}

const REPORT_TITLE = "University Curriculum Report";

/** Angular getColleges(): only the selected college logo, else default_logo.png — no session college fallback. */
async function resolveCurriculumPrintLogo(collegeId: number): Promise<string> {
  if (collegeId > 0) {
    try {
      const college = await getCollegeById(collegeId);
      const raw = college?.logo ? String(college.logo).trim() : "";
      if (raw) {
        const url = toPrintLogoUrl(raw);
        if (!isDefaultLogoUrl(url)) {
          return logoToDataUrl(url);
        }
      }
    } catch {
      // fall through to default placeholder
    }
  }
  return logoToDataUrl(DEFAULT_COLLEGE_LOGO);
}

function buildCurriculumPrintHtml(opts: {
  rows: AnyRow[];
  columnKeys: string[];
  collegeName: string;
  logoSrc: string;
  fallbackLogo: string;
  courseGroupCode: string | null;
  courseYearName: string | null;
  orgCode: string;
}): string {
  const {
    rows,
    columnKeys,
    collegeName,
    logoSrc,
    fallbackLogo,
    courseGroupCode,
    courseYearName,
    orgCode,
  } = opts;

  const columns = [
    { key: "si", header: "S.No" },
    ...columnKeys.map((key) => ({ key, header: key })),
  ];
  const data = rows.map((row, i) => {
    const out: Record<string, unknown> = { si: i + 1 };
    for (const key of columnKeys) out[key] = row[key] ?? "";
    return out;
  });
  const tableHtml = buildHtmlTable(columns, data);

  const courseGroupLine = courseGroupCode
    ? `<p class="meta-left">Course : ${escapeHtml(courseGroupCode)}</p>`
    : "";
  const courseYearLine = courseYearName
    ? `<p class="meta-right">Course Year : ${escapeHtml(courseYearName)}</p>`
    : "";
  const metaRow =
    courseGroupLine || courseYearLine
      ? `<div class="meta-row">${courseGroupLine}${courseYearLine}</div>`
      : "";

  const headerHtml =
    orgCode === "SUK"
      ? `<div class="suk-header">
      <img src="${escapeHtml(logoSrc)}" alt="" class="suk-logo"
        onerror="this.onerror=null;this.src='${escapeHtml(fallbackLogo)}'" />
      <p class="collegeName">${escapeHtml(collegeName)}</p>
      <p class="title">${escapeHtml(REPORT_TITLE)}</p>
    </div>`
      : `<div class="banner-row">
      <div class="logo-col">
        <img src="${escapeHtml(logoSrc)}" alt="" class="portraitLogo"
          onerror="this.onerror=null;this.src='${escapeHtml(fallbackLogo)}'" />
      </div>
      <div class="banner-text">
        <p class="collegeName">${escapeHtml(collegeName)}</p>
        <p class="title">${escapeHtml(REPORT_TITLE)}</p>
      </div>
    </div>`;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>${escapeHtml(REPORT_TITLE)}</title>
<style>
@page { size: A4 portrait; margin: 12mm; }
body { font-family: Arial, sans-serif; margin: 0; padding: 0; color: #000; }
.banner-row { display: flex; align-items: flex-start; width: 100%; margin-bottom: 8px; }
.logo-col { width: 15%; flex-shrink: 0; }
.portraitLogo { height: 80%; width: 80%; object-fit: contain; }
.banner-text { width: 85%; }
.suk-header { text-align: center; margin-bottom: 12px; }
.suk-logo { height: auto; max-width: 90%; object-fit: contain; }
.collegeName {
  text-align: center;
  font-size: 24px;
  font-weight: 550;
  color: #000;
  margin: 16px 0 -8px;
}
.title {
  text-align: center;
  font-size: 21px;
  font-weight: 550;
  color: #000;
  margin: 4px 0;
}
.meta-row { display: flex; width: 100%; margin: 8px 0 4px; }
.meta-left {
  width: 50%;
  text-align: left;
  color: #000;
  margin: 0;
  font-size: 14px;
}
.meta-right {
  width: 50%;
  text-align: right;
  color: #000;
  margin: 0;
  font-size: 14px;
}
table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 6px; }
th, td { border: 1px solid #000; padding: 4px 6px; text-align: left; vertical-align: top; }
th { background: #c3d9ff; font-weight: 550; }
tr { break-inside: avoid; }
</style></head><body>
${headerHtml}
${metaRow}
${tableHtml}
</body></html>`;
}

export default function CurriculumReportPage() {
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [loadingList, setLoadingList] = useState(false);

  const [baseRows, setBaseRows] = useState<AnyRow[]>([]);
  const [regulationData, setRegulationData] = useState<AnyRow[]>([]);
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [columnKeys, setColumnKeys] = useState<string[]>([]);

  const [collegeId, setCollegeId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [courseYearId, setCourseYearId] = useState("");
  const [courseGroupId, setCourseGroupId] = useState("");
  const [regulationId, setRegulationId] = useState("");

  const collegeNum = Number(collegeId) || 0;
  const orgCode =
    typeof globalThis.localStorage !== "undefined"
      ? String(globalThis.localStorage.getItem("orgCode") ?? "")
      : "";

  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );
  const organizationId = Number(
    globalThis?.localStorage?.getItem("organizationId") ?? 0,
  );

  const colleges = useMemo(() => {
    const list = dedupeBy(baseRows, (r) => collegeIdOf(r));
    return [...list].sort(
      (a, b) => num(a.clg_sort_order) - num(b.clg_sort_order),
    );
  }, [baseRows]);

  const courses = useMemo(() => {
    if (!collegeId) return [];
    return dedupeBy(
      baseRows.filter((r) => collegeIdOf(r) === Number(collegeId)),
      (r) => courseIdOf(r),
    );
  }, [baseRows, collegeId]);

  const courseGroups = useMemo(() => {
    if (!collegeId || !courseId) return [];
    return dedupeBy(
      baseRows.filter(
        (r) =>
          collegeIdOf(r) === Number(collegeId) &&
          courseIdOf(r) === Number(courseId),
      ),
      (r) => groupIdOf(r),
    );
  }, [baseRows, collegeId, courseId]);

  const courseYears = useMemo(() => {
    if (!collegeId || !courseId) return [];
    const groupNum = Number(courseGroupId);
    const filtered = baseRows.filter((r) => {
      if (collegeIdOf(r) !== Number(collegeId)) return false;
      if (courseIdOf(r) !== Number(courseId)) return false;
      // Angular: courseGroupId == 0 → All groups (ignore group filter)
      if (groupNum && groupNum !== 0 && groupIdOf(r) !== groupNum) return false;
      return true;
    });
    return dedupeBy(filtered, (r) => yearIdOf(r));
  }, [baseRows, collegeId, courseId, courseGroupId]);

  const regulations = useMemo(() => {
    if (!collegeId || !courseId || !courseYearId) return [];
    const universityId = num(
      baseRows.find((r) => collegeIdOf(r) === Number(collegeId))
        ?.fk_university_id,
    );
    return regulationData.filter(
      (r) =>
        num(r.fk_university_id) === universityId &&
        num(r.fk_course_id) === Number(courseId),
    );
  }, [baseRows, regulationData, collegeId, courseId, courseYearId]);

  const selectedCollege = useMemo(
    () => colleges.find((c) => collegeIdOf(c) === Number(collegeId)),
    [colleges, collegeId],
  );
  const selectedCourse = useMemo(
    () => courses.find((c) => courseIdOf(c) === Number(courseId)),
    [courses, courseId],
  );
  const selectedGroup = useMemo(
    () => courseGroups.find((g) => groupIdOf(g) === Number(courseGroupId)),
    [courseGroups, courseGroupId],
  );
  const selectedYear = useMemo(
    () => courseYears.find((y) => yearIdOf(y) === Number(courseYearId)),
    [courseYears, courseYearId],
  );

  const reportSubtitle = useMemo(() => {
    return [
      txt(selectedCollege?.college_code),
      txt(selectedCourse?.course_code),
      Number(courseGroupId) === 0 ? "All" : txt(selectedGroup?.group_code),
      txt(selectedYear?.course_year_name),
    ]
      .filter(Boolean)
      .join(" / ");
  }, [
    selectedCollege,
    selectedCourse,
    selectedGroup,
    selectedYear,
    courseGroupId,
  ]);

  const courseGroupCodeForPrint = useMemo(() => {
    if (Number(courseGroupId) === 0) return null;
    const code = txt(selectedGroup?.group_code);
    return code || null;
  }, [courseGroupId, selectedGroup]);

  const courseYearNameForPrint = useMemo(() => {
    const name = txt(selectedYear?.course_year_name);
    return name || null;
  }, [selectedYear]);

  const resolveCollegeDisplayName = useCallback(async (): Promise<string> => {
    const fromFilter = txt(
      selectedCollege?.college_name ?? selectedCollege?.college_code,
    );
    if (!collegeNum) return fromFilter;
    try {
      const college = await getCollegeById(collegeNum);
      return String(college?.collegeName ?? college?.collegeCode ?? fromFilter);
    } catch {
      return fromFilter;
    }
  }, [collegeNum, selectedCollege]);

  const handlePrintReport = useCallback(async () => {
    if (!rows.length || !columnKeys.length) {
      toastInfo("No data to print");
      return;
    }
    const collegeName = await resolveCollegeDisplayName();
    const logoSrc = await resolveCurriculumPrintLogo(collegeNum);
    const fallbackLogo = await logoToDataUrl(DEFAULT_COLLEGE_LOGO);
    printHtmlInIframe(
      buildCurriculumPrintHtml({
        rows,
        columnKeys,
        collegeName,
        logoSrc,
        fallbackLogo,
        courseGroupCode: courseGroupCodeForPrint,
        courseYearName: courseYearNameForPrint,
        orgCode,
      }),
    );
  }, [
    rows,
    columnKeys,
    collegeNum,
    courseGroupCodeForPrint,
    courseYearNameForPrint,
    orgCode,
    resolveCollegeDisplayName,
  ]);

  function clearResults() {
    setRows([]);
    setColumnKeys([]);
  }

  useEffect(() => {
    async function loadFilters() {
      setLoadingFilters(true);
      try {
        const { filtersData, regulationData: regs } =
          await getCurriculumReportFilters({
            organizationId: organizationId || 0,
            employeeId,
          });
        setBaseRows(filtersData);
        setRegulationData(regs);
        const sorted = [...dedupeBy(filtersData, (r) => collegeIdOf(r))].sort(
          (a, b) => num(a.clg_sort_order) - num(b.clg_sort_order),
        );
        if (sorted.length > 0) {
          setCollegeId(String(collegeIdOf(sorted[0])));
        }
      } catch (e) {
        toastError(e, "Failed to load filters");
        setBaseRows([]);
        setRegulationData([]);
      } finally {
        setLoadingFilters(false);
      }
    }
    void loadFilters();
  }, [employeeId, organizationId]);

  // College → Course
  useEffect(() => {
    setCourseId("");
    setCourseGroupId("");
    setCourseYearId("");
    setRegulationId("");
    clearResults();
    if (!collegeId || !courses.length) return;
    setCourseId(String(courseIdOf(courses[0])));
  }, [collegeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Course → Group (Angular selectedCourse)
  useEffect(() => {
    setCourseGroupId("");
    setCourseYearId("");
    setRegulationId("");
    clearResults();
    if (!courseId || !courseGroups.length) return;
    setCourseGroupId(String(groupIdOf(courseGroups[0])));
  }, [courseId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Group → Year (Angular selectedGroup)
  useEffect(() => {
    setCourseYearId("");
    setRegulationId("");
    clearResults();
    if (!courseId) return;
    if (!courseYears.length) return;
    setCourseYearId(String(yearIdOf(courseYears[0])));
  }, [courseGroupId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Year → clear regulation (Angular selectedYear)
  useEffect(() => {
    setRegulationId("");
    clearResults();
  }, [courseYearId]);

  async function onGetReport() {
    if (!collegeId || !courseId) {
      toastInfo("Please Select Valid Filters");
      return;
    }
    setLoadingList(true);
    try {
      const list = await getCurriculumReportList({
        collegeId: Number(collegeId),
        courseId: Number(courseId),
        courseGroupId: Number(courseGroupId) || 0,
        courseYearId: Number(courseYearId) || 0,
        regulationId: Number(regulationId) || 0,
      });
      const stamped = list.map((row, i) => ({ ...row, __rid: i }));
      setRows(stamped);
      setColumnKeys(buildCurriculumDisplayColumnKeys(list));
      if (!list.length) toastSuccess("No Records Found.");
    } catch (e) {
      toastError(e, "Failed to load report");
      clearResults();
    } finally {
      setLoadingList(false);
    }
  }

  function onReset() {
    setCollegeId("");
    setCourseId("");
    setCourseGroupId("");
    setCourseYearId("");
    setRegulationId("");
    clearResults();
    if (colleges.length > 0) {
      setCollegeId(String(collegeIdOf(colleges[0])));
    }
  }

  function handleExportExcel() {
    if (!rows.length || !columnKeys.length) {
      toastInfo("No data to export");
      return;
    }
    const columns = [
      { key: "si", header: "S.No" },
      ...columnKeys.map((key) => ({ key, header: key })),
    ];
    const data = rows.map((row, i) => {
      const out: Record<string, unknown> = { si: i + 1 };
      for (const key of columnKeys) out[key] = row[key] ?? "";
      return out;
    });
    exportHtmlTableAsExcel(
      " curriculum Report",
      buildHtmlTable(columns, data),
      `<strong>University Curriculum Report - ${escapeHtml(reportSubtitle)}</strong>`,
    );
  }

  const columnDefs = useMemo<ColDef<AnyRow>[]>(() => {
    if (!columnKeys.length) {
      return [
        {
          headerName: "S.No",
          valueGetter: rowIndexGetter,
          width: 70,
          flex: 0,
        },
      ];
    }
    return [
      {
        headerName: "S.No",
        valueGetter: rowIndexGetter,
        width: 70,
        flex: 0,
      },
      ...columnKeys.map(
        (key) =>
          ({
            headerName: key,
            minWidth: 120,
            valueGetter: (p) => {
              const v = p.data?.[key];
              if (v == null) return "";
              return typeof v === "object" ? JSON.stringify(v) : String(v);
            },
          }) as ColDef<AnyRow>,
      ),
    ];
  }, [columnKeys]);

  const filters = (
    <>
      <GlobalFilterBarRow>
        <GlobalFilterField label="College *">
          <Select
            value={collegeId || null}
            onChange={(v) => setCollegeId(v ?? "")}
            isLoading={loadingFilters}
            options={colleges.map((c) => ({
              value: String(collegeIdOf(c)),
              label: txt(c.college_code),
            }))}
            placeholder="College"
            searchable
          />
        </GlobalFilterField>
        <GlobalFilterField label="Course *">
          <Select
            value={courseId || null}
            onChange={(v) => setCourseId(v ?? "")}
            isLoading={loadingFilters}
            options={courses.map((c) => ({
              value: String(courseIdOf(c)),
              label: txt(c.course_code),
            }))}
            placeholder="Course"
            searchable
          />
        </GlobalFilterField>
        <GlobalFilterField label="Course Year">
          <Select
            value={courseYearId || null}
            onChange={(v) => setCourseYearId(v ?? "")}
            isLoading={loadingFilters}
            options={courseYears.map((y) => ({
              value: String(yearIdOf(y)),
              label: txt(y.course_year_name),
            }))}
            placeholder="Course Year"
            searchable
          />
        </GlobalFilterField>
        <GlobalFilterField label="Course Group">
          <Select
            value={courseGroupId || null}
            onChange={(v) => setCourseGroupId(v ?? "")}
            isLoading={loadingFilters}
            options={[
              { value: "0", label: "All" },
              ...courseGroups.map((g) => ({
                value: String(groupIdOf(g)),
                label: txt(g.group_code),
              })),
            ]}
            placeholder="Course Group"
            searchable
          />
        </GlobalFilterField>
      </GlobalFilterBarRow>
      <GlobalFilterBarRow>
        <GlobalFilterField label="Regulation">
          <Select
            value={regulationId || null}
            onChange={(v) => {
              setRegulationId(v ?? "");
              clearResults();
            }}
            isLoading={loadingFilters}
            options={[
              { value: "0", label: "All" },
              ...regulations.map((r) => ({
                value: String(num(r.fk_regulation_id)),
                label: txt(r.regulation_code),
              })),
            ]}
            placeholder="Regulation"
            searchable
          />
        </GlobalFilterField>
        <GlobalFilterField
          label=""
          className="global-filter-field--shrink global-filter-field--action"
        >
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={() => void onGetReport()}
              disabled={loadingList}
              className="h-[30px] px-3 text-[12px]"
            >
              Get Report
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-[30px] w-[30px]"
              title="Reset"
              onClick={onReset}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </GlobalFilterField>
      </GlobalFilterBarRow>
    </>
  );

  return (
    <FilteredListPage
      title={rows.length > 0 ? `Curriculum Report` : "Curriculum Report"}
      filters={filters}
      rowData={rows}
      columnDefs={columnDefs}
      loading={loadingList}
      showTable={rows.length > 0}
      pagination
      toolbar={TOOLBAR}
      toolbarTrailing={
        rows.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            {reportSubtitle ? (
              <span className="text-[12px] font-medium text-blue-700">
                {reportSubtitle}
              </span>
            ) : null}
            <Button
              type="button"
              className="h-[30px] px-3 text-[12px]"
              onClick={handleExportExcel}
            >
              Export Excel
            </Button>
            <Button
              type="button"
              className="h-[30px] px-3 text-[12px]"
              onClick={() => void handlePrintReport()}
            >
              Print Report
            </Button>
          </div>
        ) : null
      }
      getRowId={(p) => String(p.data?.__rid ?? "")}
    />
  );
}
