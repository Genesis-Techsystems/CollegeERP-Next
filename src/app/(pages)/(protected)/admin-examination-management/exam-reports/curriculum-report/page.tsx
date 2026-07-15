"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  buildHtmlTable,
  exportHtmlTableAsExcel,
} from "../../_lib/export-html-table";
import {
  buildCurriculumDisplayColumnKeys,
  getCurriculumReportFilters,
  getCurriculumReportList,
} from "@/services";

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

function printReport(rows: AnyRow[], columnKeys: string[], subtitle: string) {
  if (!rows.length || !columnKeys.length) return;
  const columns = [
    { key: "si", header: "S.No" },
    ...columnKeys.map((key) => ({ key, header: key })),
  ];
  const data = rows.map((row, i) => {
    const out: Record<string, unknown> = { si: i + 1 };
    for (const key of columnKeys) out[key] = row[key] ?? "";
    return out;
  });
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>University Curriculum Report</title>
<style>
@page { size: A4 landscape; margin: 10mm; }
body { font: 11px/1.4 Arial, sans-serif; color: #000; margin: 0; }
.title, .sub { text-align: center; margin: 4px 0; }
.title { font-size: 15px; font-weight: bold; }
table { width: 100%; border-collapse: collapse; margin-top: 10px; }
th, td { border: 1px solid #000; padding: 4px 6px; text-align: left; }
th { background: #f2f2f2; }
</style></head>
<body>
  <p class="title">University Curriculum Report</p>
  <p class="sub">${escapeHtml(subtitle)}</p>
  ${buildHtmlTable(columns, data)}
</body></html>`;

  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(frame);
  const fdoc = frame.contentDocument;
  const win = frame.contentWindow;
  if (!fdoc || !win) {
    frame.remove();
    return;
  }
  fdoc.open();
  fdoc.write(html);
  fdoc.close();
  win.addEventListener("afterprint", () => frame.remove());
  setTimeout(() => {
    win.focus();
    win.print();
  }, 50);
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
      Number(courseGroupId) === 0
        ? "All"
        : txt(selectedGroup?.group_code),
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
            value={collegeId || undefined}
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
            value={courseId || undefined}
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
            value={courseYearId || undefined}
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
            value={courseGroupId || undefined}
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
            value={regulationId || undefined}
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
      title={
        rows.length > 0
          ? `University Curriculum Report`
          : "University Curriculum Report Filter"
      }
      filters={filters}
      rowData={rows}
      columnDefs={columnDefs}
      loading={loadingList}
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
              onClick={() => printReport(rows, columnKeys, reportSubtitle)}
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
