"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColDef } from "ag-grid-community";
import { FilteredListPage } from "@/components/layout";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import {
  buildHtmlTable,
  escapeHtml,
  exportHtmlTableAsExcel,
} from "@/common/export-html-table";
import { Select } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { printHtmlInIframe } from "@/lib/print";
import { rowIndexGetter } from "@/lib/utils";
import { toastInfo } from "@/lib/toast";
import { useApiQueryToasts } from "@/hooks";
import { DEFAULT_COLLEGE_LOGO } from "@/hooks/useCollegeLogo";
import {
  isDefaultLogoUrl,
  logoToDataUrl,
  toPrintLogoUrl,
} from "@/app/(pages)/(protected)/reports/admin-attendance-reports/_lib/attendance-report-print";
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
  type CollegeCourseFeeReportParams,
  type FeeCollectionReportRow,
} from "@/services";

const ALL = { value: "0", label: "All" };

const TOOLBAR = {
  search: true,
  searchPlaceholder: "Search",
  columnPicker: false,
  exportPdf: false,
  exportExcel: false,
  columnFilters: false,
} as const;

function humanizeField(field: string): string {
  return field
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Angular print: selected college logo only, else default_logo.png. */
async function resolveCollegePrintLogo(collegeId: number): Promise<string> {
  if (collegeId > 0) {
    try {
      const college = await getCollegeById(collegeId);
      const raw = college?.logo ? String(college.logo).trim() : "";
      if (raw) {
        const url = toPrintLogoUrl(raw);
        if (!isDefaultLogoUrl(url)) return logoToDataUrl(url);
      }
    } catch {
      /* fall through */
    }
  }
  return logoToDataUrl(toPrintLogoUrl(DEFAULT_COLLEGE_LOGO));
}

function buildPrintHtml(args: {
  title: string;
  dataDetails: string;
  collegeName: string;
  logoSrc: string;
  fallbackLogo: string;
  orgCode: string | null;
  dataFields: string[];
  rows: FeeCollectionReportRow[];
}): string {
  const head = args.dataFields
    .map((f) => `<th class="table-th">${escapeHtml(humanizeField(f))}</th>`)
    .join("");
  const body = args.rows
    .map((row, i) => {
      const cells = args.dataFields
        .map((f) => {
          const v = row[f];
          return `<td class="table-td">${escapeHtml(v == null ? "" : String(v))}</td>`;
        })
        .join("");
      return `<tr><td class="table-td text-center">${i + 1}</td>${cells}</tr>`;
    })
    .join("");

  const headerHtml =
    args.orgCode === "SUK"
      ? `<div class="suk-header">
      <img src="${escapeHtml(args.logoSrc)}" alt="" class="suk-logo"
        onerror="this.onerror=null;this.src='${escapeHtml(args.fallbackLogo)}'" />
      <p class="title-2">${escapeHtml(args.dataDetails)}</p>
      <p class="title">${escapeHtml(args.title)}</p>
    </div>`
      : `<div class="banner-row">
      <div class="logo-col">
        <img src="${escapeHtml(args.logoSrc)}" alt="" class="portraitLogo"
          onerror="this.onerror=null;this.src='${escapeHtml(args.fallbackLogo)}'" />
      </div>
      <div class="banner-text">
        ${args.collegeName ? `<p class="collegeName">${escapeHtml(args.collegeName)}</p>` : ""}
        <p class="title-2">${escapeHtml(args.dataDetails)}</p>
        <p class="title">${escapeHtml(args.title)}</p>
      </div>
    </div>`;

  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(args.title)}</title>
<style>
@page { size: A4 landscape; margin: 8mm; }
* { box-sizing: border-box; }
body { margin: 0; padding: 0; color: #000; font-family: Arial, sans-serif; font-size: 10px; }
.banner-row { display: flex; align-items: flex-start; width: 100%; margin-bottom: 10px; }
.logo-col { width: 12%; flex-shrink: 0; text-align: center; }
.portraitLogo { width: 80%; max-width: 96px; height: auto; object-fit: contain; }
.banner-text { width: 88%; text-align: left; }
.suk-header { text-align: center; margin-bottom: 10px; }
.suk-logo { max-width: 100%; height: auto; object-fit: contain; margin-bottom: 8px; }
.collegeName { margin: 0 0 4px; font-size: 18px; font-weight: 550; }
.title-2 { margin: 2px 0; font-size: 14px; font-weight: 550; }
.title { margin: 2px 0 8px; font-size: 16px; font-weight: 550; }
table { width: 100%; border-collapse: collapse; }
.table-th { padding: 8px 5px; background: #c3d9ff; font-weight: 550; border: 1px solid #96aacb; text-align: left; }
.table-td { padding: 6px 8px; border: 1px solid #96aacb; text-align: left; }
.text-center { text-align: center; }
thead { display: table-header-group; }
tr { page-break-inside: avoid; }
</style></head>
<body>
${headerHtml}
<table>
<thead><tr><th class="table-th">S.No</th>${head}</tr></thead>
<tbody>${body}</tbody>
</table>
</body></html>`;
}

export type DynamicCollegeCourseFeeReportPageProps = {
  title: string;
  filterQueryKey: string;
  queryKey: (loadKey: string) => readonly unknown[];
  fetchRows: (
    params: CollegeCourseFeeReportParams,
  ) => Promise<FeeCollectionReportRow[]>;
};

/**
 * Shared UI for Angular fee reports that share the same filter cascade +
 * dynamic-column grid (Collections, Fee Particular Wise, Fee Due List).
 */
export function DynamicCollegeCourseFeeReportPage({
  title,
  filterQueryKey,
  queryKey,
  fetchRows,
}: DynamicCollegeCourseFeeReportPageProps) {
  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );
  const orgId = Number(
    globalThis?.localStorage?.getItem("organizationId") ?? 0,
  );
  const orgCode =
    typeof window !== "undefined"
      ? window.localStorage.getItem("orgCode")
      : null;

  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [academicYearId, setAcademicYearId] = useState<string | null>(null);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [courseGroupId, setCourseGroupId] = useState("0");
  const [courseYearId, setCourseYearId] = useState("0");
  const [loadKey, setLoadKey] = useState<string | null>(null);
  const [dataDetails, setDataDetails] = useState("");
  const [collegeName, setCollegeName] = useState("");

  const collegeNum = Number(collegeId ?? 0);
  const courseNum = Number(courseId ?? 0);
  const ayNum = Number(academicYearId ?? 0);

  const { data: filterBundle, isLoading: loadingFilters } = useQuery({
    queryKey: [filterQueryKey, "filters", orgId, employeeId],
    queryFn: () => getFeeMasterCollegeFilters(orgId, employeeId),
    enabled: orgId > 0 && employeeId > 0,
  });

  const filtersData = useMemo(
    () => (filterBundle?.filtersData ?? []) as FilterRow[],
    [filterBundle?.filtersData],
  );
  const academicData = useMemo(
    () => (filterBundle?.academicData ?? []) as FilterRow[],
    [filterBundle?.academicData],
  );

  const colleges = useMemo(() => filterColleges(filtersData), [filtersData]);
  const academicYears = useMemo(
    () => filterAcademicYears(academicData, collegeNum || null, filtersData),
    [academicData, collegeNum, filtersData],
  );
  const courses = useMemo(
    () => filterCourses(filtersData, collegeNum || null),
    [filtersData, collegeNum],
  );
  const courseGroups = useMemo(
    () =>
      filterCourseGroups(filtersData, collegeNum || null, courseNum || null),
    [filtersData, collegeNum, courseNum],
  );
  const courseYears = useMemo(
    () =>
      filterCourseYears(
        filtersData,
        collegeNum || null,
        courseNum || null,
        Number(courseGroupId) || null,
      ),
    [filtersData, collegeNum, courseNum, courseGroupId],
  );

  useEffect(() => {
    if (!collegeId && colleges.length > 0) {
      setCollegeId(
        String(pickNum(colleges[0], ["fk_college_id", "collegeId"])),
      );
    }
  }, [colleges, collegeId]);

  useEffect(() => {
    if (!collegeNum || academicYears.length === 0) return;
    if (!academicYearId) {
      const current =
        [...academicYears].sort(
          (a, b) =>
            Number(b.is_curr_ay ?? b.isCurrAy ?? 0) -
            Number(a.is_curr_ay ?? a.isCurrAy ?? 0),
        )[0] ?? academicYears[0];
      setAcademicYearId(
        String(pickNum(current, ["fk_academic_year_id", "academicYearId"])),
      );
    }
  }, [collegeNum, academicYears, academicYearId]);

  // Default Course / Group / Year only when parent cascade has no selection yet.
  // Do NOT overwrite explicit "All" (value "0") after the user picks it.
  useEffect(() => {
    if (!collegeNum || !ayNum || courses.length === 0) return;
    if (courseId) return;
    const nextCourse = String(
      pickNum(courses[0], ["fk_course_id", "courseId"]),
    );
    setCourseId(nextCourse);
    const groups = filterCourseGroups(
      filtersData,
      collegeNum,
      Number(nextCourse),
    );
    const nextGroup =
      groups.length > 0
        ? String(pickNum(groups[0], ["fk_course_group_id", "courseGroupId"]))
        : "0";
    setCourseGroupId(nextGroup);
    const years = filterCourseYears(
      filtersData,
      collegeNum,
      Number(nextCourse),
      Number(nextGroup) || null,
    );
    const nextYear =
      years.length > 0
        ? String(pickNum(years[0], ["fk_course_year_id", "courseYearId"]))
        : "0";
    setCourseYearId(nextYear);
  }, [collegeNum, ayNum, courses, courseId, filtersData]);

  function applyCourseCascade(nextCourseId: string | null) {
    setCourseId(nextCourseId);
    if (!nextCourseId || !collegeNum) {
      setCourseGroupId("0");
      setCourseYearId("0");
      return;
    }
    const groups = filterCourseGroups(
      filtersData,
      collegeNum,
      Number(nextCourseId),
    );
    const nextGroup =
      groups.length > 0
        ? String(pickNum(groups[0], ["fk_course_group_id", "courseGroupId"]))
        : "0";
    setCourseGroupId(nextGroup);
    const years = filterCourseYears(
      filtersData,
      collegeNum,
      Number(nextCourseId),
      Number(nextGroup) || null,
    );
    setCourseYearId(
      years.length > 0
        ? String(pickNum(years[0], ["fk_course_year_id", "courseYearId"]))
        : "0",
    );
  }

  function applyGroupCascade(nextGroupId: string) {
    setCourseGroupId(nextGroupId);
    if (!collegeNum || !courseNum) {
      setCourseYearId("0");
      return;
    }
    // Angular selectedGroup: when a real group is chosen, default first year.
    // When "All" (0), leave year as All too.
    if (nextGroupId === "0") {
      setCourseYearId("0");
      return;
    }
    const years = filterCourseYears(
      filtersData,
      collegeNum,
      courseNum,
      Number(nextGroupId),
    );
    setCourseYearId(
      years.length > 0
        ? String(pickNum(years[0], ["fk_course_year_id", "courseYearId"]))
        : "0",
    );
  }

  const collegeOptions = useMemo(
    () =>
      colleges.map((r) => ({
        value: String(pickNum(r, ["fk_college_id", "collegeId"])),
        label:
          pickText(r, ["college_code", "collegeCode"]) ||
          String(pickNum(r, ["fk_college_id"])),
      })),
    [colleges],
  );
  const ayOptions = useMemo(() => {
    const sorted = [...academicYears].sort(
      (a, b) =>
        Number(pickText(b, ["academic_year"])) -
        Number(pickText(a, ["academic_year"])),
    );
    return sorted.map((r) => ({
      value: String(pickNum(r, ["fk_academic_year_id", "academicYearId"])),
      label: pickText(r, ["academic_year", "academicYear"]) || "—",
    }));
  }, [academicYears]);
  const courseOptions = useMemo(
    () =>
      courses.map((r) => ({
        value: String(pickNum(r, ["fk_course_id", "courseId"])),
        label:
          pickText(r, ["course_code", "courseCode"]) ||
          String(pickNum(r, ["fk_course_id"])),
      })),
    [courses],
  );
  const groupOptions = useMemo(
    () => [
      ALL,
      ...courseGroups.map((r) => ({
        value: String(pickNum(r, ["fk_course_group_id", "courseGroupId"])),
        label:
          pickText(r, ["group_code", "courseGroupCode"]) ||
          String(pickNum(r, ["fk_course_group_id"])),
      })),
    ],
    [courseGroups],
  );
  const yearOptions = useMemo(
    () => [
      ALL,
      ...courseYears.map((r) => ({
        value: String(pickNum(r, ["fk_course_year_id", "courseYearId"])),
        label:
          pickText(r, ["course_year_name", "courseYearName"]) ||
          String(pickNum(r, ["fk_course_year_id"])),
      })),
    ],
    [courseYears],
  );

  const {
    data: rows = [],
    isFetching,
    error,
    isSuccess,
    isError,
  } = useQuery({
    queryKey: queryKey(loadKey ?? ""),
    queryFn: () => {
      const p = JSON.parse(loadKey!) as CollegeCourseFeeReportParams;
      return fetchRows(p);
    },
    enabled: loadKey != null,
  });

  const { resetApiToast } = useApiQueryToasts({
    requestKey: loadKey,
    isFetching,
    isSuccess,
    isError,
    error,
    rowCount: rows.length,
  });

  const dataFields = useMemo(() => {
    if (rows.length === 0) return [] as string[];
    return Object.keys(rows[0]!).filter((k) => k !== "__rowKey");
  }, [rows]);

  const tableRows = useMemo(
    () =>
      rows.map((row, i) => ({
        ...row,
        __rowKey: `row-${i}`,
      })),
    [rows],
  );

  const columnDefs = useMemo<ColDef<FeeCollectionReportRow>[]>(() => {
    const defs: ColDef<FeeCollectionReportRow>[] = [
      {
        colId: "siNo",
        headerName: "S.No",
        valueGetter: rowIndexGetter,
        width: 70,
        minWidth: 70,
        flex: 0,
      },
    ];
    for (const field of dataFields) {
      defs.push({
        field,
        headerName: humanizeField(field),
        minWidth: 120,
        width: 130,
        flex: 0,
        valueGetter: (p) => {
          const v = p.data?.[field];
          return v == null ? "" : String(v);
        },
      });
    }
    return defs;
  }, [dataFields]);

  function clearResults() {
    setLoadKey(null);
    setDataDetails("");
  }

  function handleGetList() {
    if (!collegeNum) {
      toastInfo("Please select college.");
      return;
    }
    const collegeRow = colleges.find(
      (r) => pickNum(r, ["fk_college_id", "collegeId"]) === collegeNum,
    );
    const parts: string[] = [
      pickText(collegeRow, ["college_code", "collegeCode"]),
    ];
    const ay = ayOptions.find((o) => o.value === academicYearId);
    if (ay) parts.push(ay.label);
    const course = courseOptions.find((o) => o.value === courseId);
    if (course) parts.push(course.label);
    const group = groupOptions.find(
      (o) => o.value === courseGroupId && o.value !== "0",
    );
    if (group) parts.push(group.label);
    const year = yearOptions.find(
      (o) => o.value === courseYearId && o.value !== "0",
    );
    if (year) parts.push(year.label);

    setCollegeName(
      pickText(collegeRow, ["college_name", "collegeName"]) || parts[0] || "",
    );
    setDataDetails(parts.filter(Boolean).join(" / "));
    resetApiToast();
    setLoadKey(
      JSON.stringify({
        collegeId: collegeNum,
        academicYearId: ayNum || 0,
        courseId: courseNum || 0,
        courseGroupId: Number(courseGroupId) || 0,
        courseYearId: Number(courseYearId) || 0,
      } satisfies CollegeCourseFeeReportParams),
    );
  }

  function handleExportExcel() {
    if (!rows.length) {
      toastInfo("No data to export");
      return;
    }
    const cols = [
      { key: "si", header: "S.No" },
      ...dataFields.map((f) => ({ key: f, header: humanizeField(f) })),
    ];
    const exportRows = rows.map((row, i) => {
      const out: Record<string, unknown> = { si: i + 1 };
      for (const f of dataFields) out[f] = row[f] ?? "";
      return out;
    });
    exportHtmlTableAsExcel(
      title,
      buildHtmlTable(cols, exportRows),
      `<strong>${escapeHtml(title)} - ${escapeHtml(dataDetails)}</strong>`,
    );
  }

  const handlePrint = useCallback(async () => {
    if (!rows.length) {
      toastInfo("No data to print");
      return;
    }
    const logoSrc = await resolveCollegePrintLogo(collegeNum);
    const fallbackLogo = await logoToDataUrl(
      toPrintLogoUrl(DEFAULT_COLLEGE_LOGO),
    );
    printHtmlInIframe(
      buildPrintHtml({
        title,
        dataDetails,
        collegeName,
        logoSrc,
        fallbackLogo,
        orgCode,
        dataFields,
        rows,
      }),
    );
  }, [rows, collegeNum, title, dataDetails, collegeName, orgCode, dataFields]);

  const hasRows = rows.length > 0;
  const displayTitle =
    hasRows && dataDetails ? `${title} — ${dataDetails}` : title;

  return (
    <FilteredListPage<FeeCollectionReportRow>
      title={displayTitle}
      filterTitle={title}
      className="relative"
      filters={
        <>
          <GlobalFilterBarRow>
            <GlobalFilterField label="College *">
              <Select
                value={collegeId}
                onChange={(v) => {
                  setCollegeId(v);
                  setAcademicYearId(null);
                  setCourseId(null);
                  setCourseGroupId("0");
                  setCourseYearId("0");
                  clearResults();
                }}
                options={collegeOptions}
                placeholder="College"
                isLoading={loadingFilters}
              />
            </GlobalFilterField>
            <GlobalFilterField label="Academic Year">
              <Select
                value={academicYearId}
                onChange={(v) => {
                  setAcademicYearId(v);
                  setCourseId(null);
                  setCourseGroupId("0");
                  setCourseYearId("0");
                  clearResults();
                }}
                options={ayOptions}
                placeholder="Academic Year"
                disabled={!collegeId}
              />
            </GlobalFilterField>
            <GlobalFilterField label="Course">
              <Select
                value={courseId}
                onChange={(v) => {
                  applyCourseCascade(v);
                  clearResults();
                }}
                options={courseOptions}
                placeholder="Course"
                disabled={!collegeId}
              />
            </GlobalFilterField>
            <GlobalFilterField label="Course Group">
              <Select
                value={courseGroupId}
                onChange={(v) => {
                  applyGroupCascade(v ?? "0");
                  clearResults();
                }}
                options={groupOptions}
                placeholder="Course Group"
                disabled={!courseId}
              />
            </GlobalFilterField>
          </GlobalFilterBarRow>
          <GlobalFilterBarRow>
            <GlobalFilterField label="Course Year">
              <Select
                value={courseYearId}
                onChange={(v) => {
                  setCourseYearId(v ?? "0");
                  clearResults();
                }}
                options={yearOptions}
                placeholder="Course Year"
                disabled={!courseId}
              />
            </GlobalFilterField>
            <GlobalFilterField
              label=""
              className="global-filter-field--shrink global-filter-field--action"
            >
              <Button
                type="button"
                size="sm"
                disabled={isFetching || !collegeId}
                onClick={handleGetList}
              >
                {isFetching ? "Loading…" : "Get List"}
              </Button>
            </GlobalFilterField>
          </GlobalFilterBarRow>
        </>
      }
      rowData={tableRows}
      columnDefs={columnDefs}
      loading={isFetching}
      showTable={hasRows}
      resultsVisible={hasRows}
      fitColumnsToWidth={false}
      pagination
      columnFilters={false}
      getRowId={(p) => String(p.data?.__rowKey ?? "")}
      toolbar={TOOLBAR}
      toolbarTrailing={
        hasRows ? (
          <div className="flex flex-wrap items-center gap-2">
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
              onClick={() => void handlePrint()}
            >
              Print Report
            </Button>
          </div>
        ) : null
      }
    />
  );
}
