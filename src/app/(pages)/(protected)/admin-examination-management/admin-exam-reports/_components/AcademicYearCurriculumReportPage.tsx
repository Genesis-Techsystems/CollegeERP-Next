"use client";

/**
 * Academic Year Curriculum Report — Angular `academic-year-curriculum-report`.
 * MatTable + dynamic columns → FilteredListPage + DataTable.
 */

import { useEffect, useMemo, useState } from "react";
import type { ColDef } from "ag-grid-community";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Select } from "@/common/components/select";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { rowIndexGetter } from "@/lib/utils";
import {
  getAcademicYearCurriculumReport,
  getFeeMasterCollegeFilters,
} from "@/services";
import { toastError, toastInfo } from "@/lib/toast";
import {
  DEFAULT_COLLEGE_LOGO,
  useCollegeLogo,
} from "@/hooks/useCollegeLogo";
import { FileSpreadsheet, Printer } from "lucide-react";
import { printAcademicYearCurriculumReport } from "./printAcademicYearCurriculumReport";
import {
  filterAcademicYears,
  pickNum,
  pickText,
  type FilterRow,
} from "@/app/(pages)/(protected)/accounts-and-fees/fee-masters/_lib/fee-master-filters";

type AnyRow = Record<string, any>;

const TOOLBAR = {
  search: true,
  searchPlaceholder: "Search...",
  columnPicker: false,
  exportPdf: false,
  exportExcel: false,
} as const;

function toAbsoluteLogoUrl(url: string): string {
  if (/^(https?:\/\/|data:|blob:)/i.test(url)) return url;
  if (typeof globalThis.location?.origin === "string") {
    return `${globalThis.location.origin}${url.startsWith("/") ? "" : "/"}${url}`;
  }
  return url;
}

function toFilterRows(rows: AnyRow[]): FilterRow[] {
  return rows as FilterRow[];
}

function numFrom(row: AnyRow, keys: string[]): number {
  for (const key of keys) {
    const n = Number(row?.[key]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function strFrom(row: AnyRow, keys: string[]): string {
  for (const key of keys) {
    const v = String(row?.[key] ?? "").trim();
    if (v) return v;
  }
  return "";
}

function dedupeBy(rows: AnyRow[], keys: string[]): AnyRow[] {
  const seen = new Set<number>();
  const out: AnyRow[] = [];
  for (const row of rows) {
    const id = numFrom(row, keys);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(row);
  }
  return out;
}

function exportHtmlTable(filename: string, title: string, bodyHtml: string) {
  const template = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Worksheet</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table>${title}${bodyHtml}</table></body></html>`;
  const link = document.createElement("a");
  link.download = filename;
  link.href = `data:application/vnd.ms-excel;base64,${window.btoa(unescape(encodeURIComponent(template)))}`;
  link.click();
}

export function AcademicYearCurriculumReportPage() {
  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );
  const orgId = Number(
    globalThis?.localStorage?.getItem("organizationId") ?? 0,
  );
  const orgCode = String(globalThis?.localStorage?.getItem("orgCode") ?? "");

  const [loading, setLoading] = useState(false);
  const [filtersData, setFiltersData] = useState<AnyRow[]>([]);
  const [academicData, setAcademicData] = useState<AnyRow[]>([]);
  const [regulationData, setRegulationData] = useState<AnyRow[]>([]);

  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [courseGroupId, setCourseGroupId] = useState<number>(0);
  const [courseYearId, setCourseYearId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [regulationId, setRegulationId] = useState<number>(0);
  const [skipAutoSelect, setSkipAutoSelect] = useState(false);

  const [rows, setRows] = useState<AnyRow[]>([]);
  const [columnKeys, setColumnKeys] = useState<string[]>([]);
  const [showTable, setShowTable] = useState(false);
  const [dataDetails, setDataDetails] = useState("");
  const collegeLogo = useCollegeLogo(collegeId);

  const colleges = useMemo(
    () =>
      dedupeBy(filtersData, ["fk_college_id", "collegeId"]).sort(
        (a, b) => Number(a.clg_sort_order ?? 0) - Number(b.clg_sort_order ?? 0),
      ),
    [filtersData],
  );

  const universityId = useMemo(() => {
    if (!collegeId) return 0;
    const row = filtersData.find(
      (r) => numFrom(r, ["fk_college_id", "collegeId"]) === collegeId,
    );
    return numFrom(row ?? {}, ["fk_university_id", "universityId"]);
  }, [filtersData, collegeId]);

  const courses = useMemo(
    () =>
      dedupeBy(
        filtersData.filter(
          (r) =>
            numFrom(r, ["fk_college_id", "collegeId"]) === Number(collegeId),
        ),
        ["fk_course_id", "courseId"],
      ),
    [filtersData, collegeId],
  );

  const courseGroups = useMemo(
    () =>
      dedupeBy(
        filtersData.filter(
          (r) =>
            numFrom(r, ["fk_college_id", "collegeId"]) === Number(collegeId) &&
            numFrom(r, ["fk_course_id", "courseId"]) === Number(courseId),
        ),
        ["fk_course_group_id", "courseGroupId"],
      ),
    [filtersData, collegeId, courseId],
  );

  const courseYears = useMemo(
    () =>
      dedupeBy(
        filtersData.filter((r) => {
          if (numFrom(r, ["fk_college_id", "collegeId"]) !== Number(collegeId))
            return false;
          if (numFrom(r, ["fk_course_id", "courseId"]) !== Number(courseId))
            return false;
          if (courseGroupId === 0) return true;
          return (
            numFrom(r, ["fk_course_group_id", "courseGroupId"]) ===
            Number(courseGroupId)
          );
        }),
        ["fk_course_year_id", "courseYearId"],
      ).sort(
        (a, b) => Number(a.cy_sort_order ?? 0) - Number(b.cy_sort_order ?? 0),
      ),
    [filtersData, collegeId, courseId, courseGroupId],
  );

  const academicYears = useMemo(
    () =>
      filterAcademicYears(
        toFilterRows(academicData),
        collegeId,
        toFilterRows(filtersData),
      ),
    [academicData, collegeId, filtersData],
  );

  const regulations = useMemo(
    () =>
      dedupeBy(
        regulationData.filter((r) => {
          if (
            universityId &&
            numFrom(r, ["fk_university_id", "universityId"]) !== universityId
          ) {
            return false;
          }
          if (
            courseId &&
            numFrom(r, ["fk_course_id", "courseId"]) !== Number(courseId)
          ) {
            return false;
          }
          return true;
        }),
        ["fk_regulation_id", "regulationId"],
      ),
    [regulationData, universityId, courseId],
  );

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
            flex: 1,
            valueGetter: (p) => {
              const v = p.data?.[key];
              if (v == null) return "";
              return typeof v === "object" ? JSON.stringify(v) : String(v);
            },
          }) as ColDef<AnyRow>,
      ),
    ];
  }, [columnKeys]);

  function clearResults() {
    setRows([]);
    setColumnKeys([]);
    setShowTable(false);
    setDataDetails("");
  }

  function buildDataDetails() {
    const college = colleges.find(
      (r) => numFrom(r, ["fk_college_id", "collegeId"]) === collegeId,
    );
    const course = courses.find(
      (r) => numFrom(r, ["fk_course_id", "courseId"]) === courseId,
    );
    const group =
      courseGroupId === 0
        ? null
        : courseGroups.find(
            (r) =>
              numFrom(r, ["fk_course_group_id", "courseGroupId"]) ===
              courseGroupId,
          );
    const year = courseYears.find(
      (r) => numFrom(r, ["fk_course_year_id", "courseYearId"]) === courseYearId,
    );
    return [
      strFrom(college ?? {}, ["college_code", "collegeCode"]),
      strFrom(course ?? {}, ["course_code", "courseCode"]),
      strFrom(group ?? {}, ["group_code", "groupCode"]),
      strFrom(year ?? {}, [
        "course_year_name",
        "courseYearName",
        "course_year_code",
      ]),
    ]
      .filter(Boolean)
      .join(" / ");
  }

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      try {
        const data = await getFeeMasterCollegeFilters(orgId, employeeId);
        if (cancelled) return;
        setFiltersData(data.filtersData ?? []);
        setAcademicData(data.academicData ?? []);
        setRegulationData(data.regulationData ?? []);
        const firstCollege = dedupeBy(data.filtersData ?? [], [
          "fk_college_id",
          "collegeId",
        ]).sort(
          (a, b) =>
            Number(a.clg_sort_order ?? 0) - Number(b.clg_sort_order ?? 0),
        )[0];
        setSkipAutoSelect(false);
        setCollegeId(
          firstCollege
            ? numFrom(firstCollege, ["fk_college_id", "collegeId"])
            : null,
        );
      } catch {
        if (!cancelled) toastError("Failed to load filters");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void init();
    return () => {
      cancelled = true;
    };
  }, [orgId, employeeId]);

  useEffect(() => {
    if (!collegeId) {
      setCourseId(null);
      return;
    }
    if (skipAutoSelect) return;
    const list = dedupeBy(
      filtersData.filter(
        (r) => numFrom(r, ["fk_college_id", "collegeId"]) === Number(collegeId),
      ),
      ["fk_course_id", "courseId"],
    );
    setCourseId(
      list[0] ? numFrom(list[0], ["fk_course_id", "courseId"]) : null,
    );
  }, [collegeId, filtersData, skipAutoSelect]);

  useEffect(() => {
    if (!collegeId) {
      setAcademicYearId(null);
      return;
    }
    if (skipAutoSelect) return;
    const years = filterAcademicYears(
      toFilterRows(academicData),
      collegeId,
      toFilterRows(filtersData),
    );
    const current = years.find((r) => Number(r.is_curr_ay ?? 0) === 1);
    setAcademicYearId(
      current
        ? pickNum(current, ["fk_academic_year_id", "academicYearId"])
        : years[0]
          ? pickNum(years[0], ["fk_academic_year_id", "academicYearId"])
          : null,
    );
  }, [collegeId, academicData, filtersData, skipAutoSelect]);

  useEffect(() => {
    if (!collegeId || !courseId) {
      setCourseGroupId(0);
      return;
    }
    if (skipAutoSelect) return;
    const groups = dedupeBy(
      filtersData.filter(
        (r) =>
          numFrom(r, ["fk_college_id", "collegeId"]) === Number(collegeId) &&
          numFrom(r, ["fk_course_id", "courseId"]) === Number(courseId),
      ),
      ["fk_course_group_id", "courseGroupId"],
    );
    setCourseGroupId(
      groups[0]
        ? numFrom(groups[0], ["fk_course_group_id", "courseGroupId"])
        : 0,
    );
  }, [collegeId, courseId, filtersData, skipAutoSelect]);

  useEffect(() => {
    if (!collegeId || !courseId) {
      setCourseYearId(null);
      return;
    }
    if (skipAutoSelect) return;
    const years = dedupeBy(
      filtersData.filter((r) => {
        if (numFrom(r, ["fk_college_id", "collegeId"]) !== Number(collegeId))
          return false;
        if (numFrom(r, ["fk_course_id", "courseId"]) !== Number(courseId))
          return false;
        if (courseGroupId === 0) return true;
        return (
          numFrom(r, ["fk_course_group_id", "courseGroupId"]) ===
          Number(courseGroupId)
        );
      }),
      ["fk_course_year_id", "courseYearId"],
    ).sort(
      (a, b) => Number(a.cy_sort_order ?? 0) - Number(b.cy_sort_order ?? 0),
    );
    setCourseYearId(
      years[0]
        ? numFrom(years[0], ["fk_course_year_id", "courseYearId"])
        : null,
    );
    setRegulationId(0);
  }, [collegeId, courseId, courseGroupId, filtersData, skipAutoSelect]);

  async function handleGetReport() {
    if (!collegeId || !courseId) {
      toastError("Please select College and Course");
      return;
    }
    setLoading(true);
    clearResults();
    try {
      const data = await getAcademicYearCurriculumReport({
        collegeId,
        courseId,
        courseGroupId: courseGroupId || 0,
        courseYearId: courseYearId || 0,
        regulationId: regulationId || 0,
        academicYearId: academicYearId || 0,
      });
      if (data.length === 0) {
        toastInfo("No records found");
        return;
      }
      const stamped = data.map((row, i) => ({ ...row, __rid: i }));
      setRows(stamped);
      setColumnKeys(Object.keys(data[0] ?? {}));
      setDataDetails(buildDataDetails());
      setShowTable(true);
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Failed to load report");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setSkipAutoSelect(true);
    setCollegeId(null);
    setCourseId(null);
    setCourseGroupId(0);
    setCourseYearId(null);
    setAcademicYearId(null);
    setRegulationId(0);
    clearResults();
  }

  function handleExportExcel() {
    if (rows.length === 0 || columnKeys.length === 0) return;
    const head = `<tr><th>S.No</th>${columnKeys.map((c) => `<th>${c}</th>`).join("")}</tr>`;
    const body = rows
      .map(
        (r, i) =>
          `<tr><td>${i + 1}</td>${columnKeys
            .map((c) => `<td>${String(r?.[c] ?? "")}</td>`)
            .join("")}</tr>`,
      )
      .join("");
    const title = `<tr><th colspan="${columnKeys.length + 1}" style="text-align:center;font-size:18px;font-weight:bold;background:#f2f2f2;">Academic Year Curriculum Report${dataDetails ? ` - ${dataDetails}` : ""}</th></tr>`;
    exportHtmlTable(
      "Academic Year Curriculum Report.xls",
      title,
      `${head}${body}`,
    );
  }

  function handlePrint() {
    if (rows.length === 0 || columnKeys.length === 0) return;
    const college = colleges.find(
      (r) => numFrom(r, ["fk_college_id", "collegeId"]) === collegeId,
    );
    const group =
      courseGroupId === 0
        ? null
        : courseGroups.find(
            (r) =>
              numFrom(r, ["fk_course_group_id", "courseGroupId"]) ===
              courseGroupId,
          );
    const year = courseYears.find(
      (r) => numFrom(r, ["fk_course_year_id", "courseYearId"]) === courseYearId,
    );
    const logoUrl = toAbsoluteLogoUrl(collegeLogo || DEFAULT_COLLEGE_LOGO);

    printAcademicYearCurriculumReport(rows, {
      title: "Academic Year Curriculum Report",
      collegeName: strFrom(college ?? {}, ["college_name", "collegeName"]),
      filterSummary: dataDetails,
      logoUrl,
      orgCode,
      courseGroup: strFrom(group ?? {}, ["group_code", "groupCode"]),
      courseYear: strFrom(year ?? {}, [
        "course_year_name",
        "courseYearName",
        "course_year_code",
      ]),
      columns: columnKeys,
    });
  }

  const filters = (
    <div className="space-y-3">
      {/* Angular fxFlex: College 25 / Course 25 / Course Year 25 / Course Group 25 */}
      <GlobalFilterBarRow className="global-filter-bar__row--aycr-r1">
        <GlobalFilterField label="College" className="global-filter-field--fx25">
          <Select
            value={collegeId ? String(collegeId) : null}
            onChange={(v) => {
              setSkipAutoSelect(false);
              clearResults();
              setCollegeId(v ? Number(v) : null);
            }}
            options={colleges.map((r) => ({
              value: String(numFrom(r, ["fk_college_id", "collegeId"])),
              label: strFrom(r, [
                "college_code",
                "collegeCode",
                "college_name",
              ]),
            }))}
            placeholder="College"
            searchable
            isLoading={loading && filtersData.length === 0}
          />
        </GlobalFilterField>
        <GlobalFilterField label="Course" className="global-filter-field--fx25">
          <Select
            value={courseId ? String(courseId) : null}
            onChange={(v) => {
              setSkipAutoSelect(false);
              clearResults();
              setCourseId(v ? Number(v) : null);
            }}
            options={courses.map((r) => ({
              value: String(numFrom(r, ["fk_course_id", "courseId"])),
              label: strFrom(r, ["course_code", "courseCode", "course_name"]),
            }))}
            placeholder="Course"
            searchable
          />
        </GlobalFilterField>
        <GlobalFilterField
          label="Course Year"
          className="global-filter-field--fx25"
        >
          <Select
            value={courseYearId ? String(courseYearId) : null}
            onChange={(v) => {
              setSkipAutoSelect(false);
              clearResults();
              setCourseYearId(v ? Number(v) : null);
              setRegulationId(0);
            }}
            options={courseYears.map((r) => ({
              value: String(numFrom(r, ["fk_course_year_id", "courseYearId"])),
              label: strFrom(r, [
                "course_year_name",
                "courseYearName",
                "course_year_code",
              ]),
            }))}
            placeholder="Course Year"
            searchable
          />
        </GlobalFilterField>
        <GlobalFilterField
          label="Course Group"
          className="global-filter-field--fx25"
        >
          <Select
            value={String(courseGroupId)}
            onChange={(v) => {
              setSkipAutoSelect(false);
              clearResults();
              setCourseGroupId(v ? Number(v) : 0);
            }}
            options={[
              { value: "0", label: "All" },
              ...courseGroups.map((r) => ({
                value: String(
                  numFrom(r, ["fk_course_group_id", "courseGroupId"]),
                ),
                label: strFrom(r, ["group_code", "groupCode", "group_name"]),
              })),
            ]}
            placeholder="Course Group"
            searchable
          />
        </GlobalFilterField>
      </GlobalFilterBarRow>

      {/* Angular fxFlex: Academic Year 20 / Regulation 25 / Get Report / cached */}
      <GlobalFilterBarRow className="global-filter-bar__row--aycr-r2">
        <GlobalFilterField
          label="Academic Year"
          className="global-filter-field--fx20"
        >
          <Select
            value={academicYearId ? String(academicYearId) : null}
            onChange={(v) => {
              setSkipAutoSelect(false);
              clearResults();
              setAcademicYearId(v ? Number(v) : null);
            }}
            options={academicYears.map((r) => ({
              value: String(
                pickNum(r, ["fk_academic_year_id", "academicYearId"]),
              ),
              label: pickText(r, ["academic_year", "academicYear"]),
            }))}
            placeholder="Academic Year"
            searchable
          />
        </GlobalFilterField>
        <GlobalFilterField
          label="Regulation"
          className="global-filter-field--fx25"
        >
          <Select
            value={String(regulationId)}
            onChange={(v) => {
              clearResults();
              setRegulationId(v ? Number(v) : 0);
            }}
            options={[
              { value: "0", label: "All" },
              ...regulations.map((r) => ({
                value: String(numFrom(r, ["fk_regulation_id", "regulationId"])),
                label: strFrom(r, [
                  "regulation_code",
                  "regulationCode",
                  "regulation_name",
                ]),
              })),
            ]}
            placeholder="Regulation"
            searchable
          />
        </GlobalFilterField>
        <div className="global-filter-field global-filter-field--action global-filter-field--fx10 flex items-center gap-2 self-end pb-0.5">
          <Button
            type="button"
            className="h-8 shrink-0 px-3 text-[12px]"
            onClick={() => void handleGetReport()}
            disabled={loading}
          >
            {loading ? "Loading..." : "Get Report"}
          </Button>
          <span
            className="material-icons cursor-pointer select-none text-[22px] leading-none text-foreground/80 hover:text-foreground"
            onClick={handleReset}
            title="Reset"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleReset();
              }
            }}
            aria-label="Reset"
          >
            cached
          </span>
        </div>
      </GlobalFilterBarRow>
    </div>
  );

  return (
    <FilteredListPage
      title="Academic Year Curriculum Report"
      filters={filters}
      showTable={showTable}
      rowData={showTable ? rows : []}
      columnDefs={columnDefs}
      loading={loading}
      pagination
      paginationPageSize={10}
      toolbar={TOOLBAR}
      tableHeader={
        showTable ? (
          <div className="table-context-header flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <div className="flex items-center gap-2">
              <span
                className="material-icons table-context-header__icon"
                aria-hidden
              >
                ballot
              </span>
              <strong className="table-context-header__title">
                Academic Year Curriculum Report
              </strong>
            </div>
            {dataDetails ? (
              <span className="text-[13px] font-medium text-blue-700">
                {dataDetails}
              </span>
            ) : null}
          </div>
        ) : null
      }
      toolbarTrailing={
        showTable && rows.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              data-table-primary-action
              className="h-8 px-3 text-[12px]"
              onClick={handleExportExcel}
            >
              <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
              Export Excel
            </Button>
            <Button
              type="button"
              size="sm"
              data-table-primary-action
              className="h-8 px-3 text-[12px]"
              onClick={handlePrint}
            >
              <Printer className="mr-1.5 h-3.5 w-3.5" />
              Print Report
            </Button>
          </div>
        ) : null
      }
      getRowId={(p) => String(p.data?.__rid ?? Math.random())}
    />
  );
}
