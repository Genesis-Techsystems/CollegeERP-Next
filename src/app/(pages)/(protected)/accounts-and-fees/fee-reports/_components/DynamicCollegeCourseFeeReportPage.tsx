"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColDef } from "ag-grid-community";
import { PrinterIcon } from "lucide-react";
import { FilteredListPage } from "@/components/layout";
import { SearchInput } from "@/common/components/search";
import { Select } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { printElementInIframe } from "@/lib/print";
import { rowIndexGetter } from "@/lib/utils";
import { toastInfo } from "@/lib/toast";
import { useApiQueryToasts } from "@/hooks";
import { useCollegeLogo, DEFAULT_COLLEGE_LOGO } from "@/hooks/useCollegeLogo";
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
  type CollegeCourseFeeReportParams,
  type FeeCollectionReportRow,
} from "@/services";

const ALL = { value: "0", label: "All" };

const TH: CSSProperties = {
  padding: "8px 5px",
  background: "#C3D9FF",
  fontWeight: 550,
  border: "1px solid #96aacb",
  textAlign: "left",
};

const TD: CSSProperties = {
  padding: "8px",
  textAlign: "left",
  fontWeight: 400,
  border: "1px solid #96aacb",
};

function exportHtmlTableAsExcel(root: HTMLElement, fileName: string) {
  const uri = "data:application/vnd.ms-excel;base64,";
  const template =
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>{worksheet}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table>{table}</table></body></html>';
  const base64 = (s: string) => window.btoa(unescape(encodeURIComponent(s)));
  const formatTpl = (s: string, c: Record<string, string>) =>
    s.replace(/{(\w+)}/g, (_, p: string) => c[p] ?? "");
  const ctx = { worksheet: "Worksheet", table: root.innerHTML };
  const link = document.createElement("a");
  link.download = `${fileName}.xls`;
  link.href = uri + base64(formatTpl(template, ctx));
  link.click();
}

function humanizeField(field: string): string {
  return field
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
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
  const [search, setSearch] = useState("");
  const excelRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const collegeNum = Number(collegeId ?? 0);
  const courseNum = Number(courseId ?? 0);
  const ayNum = Number(academicYearId ?? 0);
  const logoUrl = useCollegeLogo(collegeNum || null);

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

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      Object.values(r).some((v) =>
        String(v ?? "")
          .toLowerCase()
          .includes(q),
      ),
    );
  }, [rows, search]);

  const tableRows = useMemo(
    () =>
      filteredRows.map((row, i) => ({
        ...row,
        __rowKey: `row-${i}`,
      })),
    [filteredRows],
  );

  const columnDefs = useMemo<ColDef<FeeCollectionReportRow>[]>(() => {
    const defs: ColDef<FeeCollectionReportRow>[] = [
      {
        colId: "siNo",
        headerName: "S.No",
        valueGetter: rowIndexGetter,
        width: 70,
        flex: 0,
      },
    ];
    for (const field of dataFields) {
      defs.push({
        field,
        headerName: humanizeField(field),
        minWidth: 110,
        flex: 1,
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
    setSearch("");
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
    setSearch("");
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
    if (!excelRef.current) return;
    exportHtmlTableAsExcel(excelRef.current, title);
  }

  function handlePrint() {
    if (!printRef.current) return;
    printElementInIframe(printRef.current, title, {
      extraCss: `
        @page { margin: 0.8cm; size: landscape; }
        html, body { background: #fff !important; }
        .coll-print { width: 100%; color: #000; }
        .coll-print .collegeName, .coll-print .title, .coll-print .title-2 {
          text-align: left !important;
          font-weight: 550 !important;
          margin: 2px 0 !important;
        }
        .coll-print table { width: 100%; border-collapse: collapse; }
        .coll-print th, .coll-print td {
          border: 1px solid #96aacb; padding: 4px 6px; font-size: 10px;
        }
        .coll-print th {
          background: #C3D9FF !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .coll-print img.portraitLogo {
          height: 80px; width: auto; max-width: 120px; object-fit: contain;
        }
      `,
    });
  }

  const resultsVisible = loadKey != null && !isFetching && rows.length > 0;

  return (
    <FilteredListPage<FeeCollectionReportRow>
      title={title}
      className="relative"
      filters={
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[150px] flex-1">
              <Select
                label="College"
                required
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
            </div>
            <div className="min-w-[150px] flex-1">
              <Select
                label="Academic Year"
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
            </div>
            <div className="min-w-[150px] flex-1">
              <Select
                label="Course"
                value={courseId}
                onChange={(v) => {
                  applyCourseCascade(v);
                  clearResults();
                }}
                options={courseOptions}
                placeholder="Course"
                disabled={!collegeId}
              />
            </div>
            <div className="min-w-[150px] flex-1">
              <Select
                label="Course Group"
                value={courseGroupId}
                onChange={(v) => {
                  applyGroupCascade(v ?? "0");
                  clearResults();
                }}
                options={groupOptions}
                placeholder="Course Group"
                disabled={!courseId}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[150px] flex-1">
              <Select
                label="Course Year"
                value={courseYearId}
                onChange={(v) => {
                  setCourseYearId(v ?? "0");
                  clearResults();
                }}
                options={yearOptions}
                placeholder="Course Year"
                disabled={!courseId}
              />
            </div>
            <Button
              type="button"
              size="sm"
              disabled={isFetching || !collegeId}
              onClick={handleGetList}
            >
              {isFetching ? "Loading…" : "Get List"}
            </Button>
          </div>
        </div>
      }
      filtersFooter={
        resultsVisible && dataDetails ? (
          <p className="text-sm font-semibold text-blue-600">{dataDetails}</p>
        ) : null
      }
      rowData={tableRows}
      columnDefs={columnDefs}
      loading={isFetching}
      resultsVisible={resultsVisible}
      height="auto"
      pagination
      columnFilters={false}
      getRowId={(p) => String(p.data?.__rowKey ?? "")}
      toolbar={{
        search: false,
        exportExcel: true,
        exportPdf: false,
        columnPicker: false,
        excelDocumentTitle: title,
        excelFileName: `${title}.xls`,
      }}
      toolbarLeading={
        <div className="min-w-[200px] max-w-xs flex-1">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search"
          />
        </div>
      }
      onExportExcel={handleExportExcel}
      toolbarTrailing={
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="app-data-table-toolbar-btn h-9 px-3 text-[12px]"
          onClick={handlePrint}
          disabled={!resultsVisible}
        >
          <PrinterIcon className="mr-1.5 h-3.5 w-3.5" />
          Print Report
        </Button>
      }
    >
      {resultsVisible ? (
        <div ref={excelRef} className="hidden" aria-hidden>
          <h3>
            {title} - {dataDetails}
          </h3>
          <table>
            <thead>
              <tr>
                <th style={TH}>S.No</th>
                {dataFields.map((f) => (
                  <th key={`h-${f}`} style={TH}>
                    {humanizeField(f)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, i) => (
                <tr key={`excel-${i}`}>
                  <td style={TD}>{i + 1}</td>
                  {dataFields.map((f) => (
                    <td key={`e-${i}-${f}`} style={TD}>
                      {row[f] == null ? "" : String(row[f])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {resultsVisible ? (
        <div className="pointer-events-none absolute -left-[9999px] top-0 w-[1200px] bg-white text-black">
          <div ref={printRef} className="coll-print bg-white p-4 text-black">
            <div className="mb-2 flex items-start gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl || DEFAULT_COLLEGE_LOGO}
                alt=""
                className="portraitLogo shrink-0"
                onError={(e) => {
                  const img = e.currentTarget;
                  if (!img.src.endsWith("default_logo.png")) {
                    img.src = DEFAULT_COLLEGE_LOGO;
                  }
                }}
              />
              <div>
                {orgCode !== "SUK" ? (
                  <p className="collegeName">{collegeName}</p>
                ) : null}
                <p className="title">{dataDetails}</p>
                <p className="title-2">{title}</p>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>S.No</th>
                  {dataFields.map((f) => (
                    <th key={`ph-${f}`}>{humanizeField(f)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, i) => (
                  <tr key={`print-${i}`}>
                    <td>{i + 1}</td>
                    {dataFields.map((f) => (
                      <td key={`p-${i}-${f}`}>
                        {row[f] == null ? "" : String(row[f])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </FilteredListPage>
  );
}
