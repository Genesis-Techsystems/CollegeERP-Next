"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColDef } from "ag-grid-community";
import { RefreshCw } from "lucide-react";
import { FilteredPage } from "@/components/layout";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { DataTable } from "@/common/components/table";
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
  buildDisplayColumnKeys,
  getGroupYearwiseBaseFilters,
  getGroupYearwiseRestFilters,
  getGroupYearwiseResultReport,
  type AnyRow,
} from "@/services/group-yearwise-result-report";

const toastInfo = (msg: string) => toast.info(msg);

const TOOLBAR = {
  search: true,
  searchPlaceholder: "Search...",
  columnPicker: false,
  exportPdf: false,
  exportExcel: false,
  columnFilters: false,
} as const;

function formatExamLabel(exam: AnyRow): string {
  const name = txt(exam.exam_name);
  const from = txt(exam.from_date).slice(0, 10);
  const to = txt(exam.to_date).slice(0, 10);
  const bits: string[] = [];
  if (exam.is_internal_exam) bits.push("Internal");
  if (exam.is_regular_exam) bits.push("Regular");
  if (exam.is_supply_exam) bits.push("Supple");
  const range = from && to ? ` (${from} - ${to})` : "";
  const tags = bits.length ? bits.map((b) => `(${b})`).join("") : "";
  return `${name}${range}${tags}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function printGroupYearwiseReport(
  rows: AnyRow[],
  columnKeys: string[],
  subtitle: string,
) {
  if (!rows.length || !columnKeys.length) return;
  const columns = columnKeys.map((key) => ({ key, header: key }));
  const data = rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const key of columnKeys) out[key] = row[key] ?? "";
    return out;
  });
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Group &amp; Year Wise Result Report</title>
<style>
@page { size: A4 landscape; margin: 10mm; }
body { font: 11px/1.4 Arial, sans-serif; color: #000; margin: 0; }
.clgname, .title, .exam { text-align: center; margin: 4px 0; }
.title { font-size: 15px; font-weight: bold; }
table { width: 100%; border-collapse: collapse; margin-top: 10px; }
th, td { border: 1px solid #000; padding: 4px 6px; text-align: left; }
th { background: #f2f2f2; }
</style></head>
<body>
  <p class="title">Group &amp; Year Wise Result Report</p>
  <p class="exam">${escapeHtml(subtitle)}</p>
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

export default function GroupYearwiseResultReportPage() {
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [loadingList, setLoadingList] = useState(false);

  const [baseRows, setBaseRows] = useState<AnyRow[]>([]);
  const [restRows, setRestRows] = useState<AnyRow[]>([]);
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [columnKeys, setColumnKeys] = useState<string[]>([]);

  const [courseId, setCourseId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [examId, setExamId] = useState("");
  const [collegeId, setCollegeId] = useState("");
  const [courseGroupId, setCourseGroupId] = useState("");

  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );

  const courses = useMemo(
    () => dedupeBy(baseRows, (r) => num(r.fk_course_id)),
    [baseRows],
  );

  const academicYears = useMemo(() => {
    const cid = Number(courseId);
    const list = baseRows.filter((r) => num(r.fk_course_id) === cid);
    const unique = dedupeBy(list, (r) => num(r.fk_academic_year_id));
    return [...unique].sort(
      (a, b) =>
        parseInt(txt(b.academic_year), 10) - parseInt(txt(a.academic_year), 10),
    );
  }, [baseRows, courseId]);

  const exams = useMemo(() => {
    const cid = Number(courseId);
    const ay = Number(academicYearId);
    return dedupeBy(
      baseRows.filter(
        (r) =>
          num(r.fk_course_id) === cid && num(r.fk_academic_year_id) === ay,
      ),
      (r) => num(r.fk_exam_id),
    );
  }, [baseRows, courseId, academicYearId]);

  const colleges = useMemo(
    () => dedupeBy(restRows, (r) => num(r.fk_college_id)),
    [restRows],
  );

  const courseGroups = useMemo(() => {
    const clg = Number(collegeId);
    return dedupeBy(
      restRows.filter((r) => num(r.fk_college_id) === clg),
      (r) => num(r.fk_course_group_id),
    );
  }, [restRows, collegeId]);

  const collegeCode = useMemo(() => {
    const row = colleges.find((c) => num(c.fk_college_id) === Number(collegeId));
    return txt(row?.college_code);
  }, [colleges, collegeId]);

  const examLabel = useMemo(() => {
    const row = exams.find((e) => num(e.fk_exam_id) === Number(examId));
    return row ? txt(row.exam_name) : "";
  }, [exams, examId]);

  const courseGroupName = useMemo(() => {
    if (courseGroupId === "0" || courseGroupId === "") return "All";
    const row = courseGroups.find(
      (g) => num(g.fk_course_group_id) === Number(courseGroupId),
    );
    return txt(row?.group_code) || "All";
  }, [courseGroups, courseGroupId]);

  const reportSubtitle = `${collegeCode} / ${examLabel} / ${courseGroupName}`;

  async function loadBaseFilters() {
    setLoadingFilters(true);
    try {
      const list = await getGroupYearwiseBaseFilters(employeeId);
      setBaseRows(list);
      const first = dedupeBy(list, (r) => num(r.fk_course_id))[0];
      if (first) setCourseId(String(num(first.fk_course_id)));
      else setCourseId("");
    } catch (e) {
      toastError(e, "Failed to load filters");
      setBaseRows([]);
    } finally {
      setLoadingFilters(false);
    }
  }

  useEffect(() => {
    void loadBaseFilters();
  }, [employeeId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setAcademicYearId("");
    setExamId("");
    setCollegeId("");
    setCourseGroupId("");
    setRestRows([]);
    setRows([]);
    setColumnKeys([]);
    if (!courseId || !academicYears.length) return;
    setAcademicYearId(String(num(academicYears[0].fk_academic_year_id)));
  }, [courseId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setExamId("");
    setCollegeId("");
    setCourseGroupId("");
    setRestRows([]);
    setRows([]);
    setColumnKeys([]);
    if (!academicYearId || !exams.length) return;
    setExamId(String(num(exams[0].fk_exam_id)));
  }, [academicYearId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    async function loadRest() {
      setCollegeId("");
      setCourseGroupId("");
      setRows([]);
      setColumnKeys([]);
      if (!courseId || !academicYearId || !examId) {
        setRestRows([]);
        return;
      }
      setLoadingFilters(true);
      try {
        const list = await getGroupYearwiseRestFilters({
          courseId: Number(courseId),
          academicYearId: Number(academicYearId),
          examId: Number(examId),
          employeeId,
        });
        setRestRows(list);
        const firstCollege = dedupeBy(list, (r) => num(r.fk_college_id))[0];
        if (firstCollege) {
          setCollegeId(String(num(firstCollege.fk_college_id)));
        }
      } catch (e) {
        toastError(e, "Failed to load colleges");
        setRestRows([]);
      } finally {
        setLoadingFilters(false);
      }
    }
    void loadRest();
  }, [courseId, academicYearId, examId, employeeId]);

  useEffect(() => {
    setCourseGroupId("");
    setRows([]);
    setColumnKeys([]);
    if (!collegeId || !courseGroups.length) {
      if (collegeId && !courseGroups.length) setCourseGroupId("0");
      return;
    }
    setCourseGroupId(String(num(courseGroups[0].fk_course_group_id)));
  }, [collegeId, restRows]); // eslint-disable-line react-hooks/exhaustive-deps

  function clearResults() {
    setRows([]);
    setColumnKeys([]);
  }

  async function onGetReports() {
    if (
      !courseId ||
      !academicYearId ||
      !examId ||
      !collegeId ||
      courseGroupId === ""
    ) {
      toastInfo("Please Select Valid Filters");
      return;
    }
    setLoadingList(true);
    try {
      const list = await getGroupYearwiseResultReport({
        examId: Number(examId),
        collegeId: Number(collegeId),
        courseGroupId: Number(courseGroupId),
        academicYearId: Number(academicYearId),
      });
      setRows(list);
      setColumnKeys(buildDisplayColumnKeys(list[0]));
      if (!list.length) toastSuccess("No Records Found.");
    } catch (e) {
      toastError(e, "Failed to load report");
      setRows([]);
      setColumnKeys([]);
    } finally {
      setLoadingList(false);
    }
  }

  function onReset() {
    clearResults();
    setCourseId("");
    setAcademicYearId("");
    setExamId("");
    setCollegeId("");
    setCourseGroupId("");
    setRestRows([]);
    void loadBaseFilters();
  }

  function exportAsExcel() {
    if (!rows.length || !columnKeys.length) {
      toastInfo("No data to export");
      return;
    }
    const columns = columnKeys.map((key) => ({ key, header: key }));
    const data = rows.map((row) => {
      const out: Record<string, unknown> = {};
      for (const key of columnKeys) out[key] = row[key] ?? "";
      return out;
    });
    exportHtmlTableAsExcel(
      "Group & Year Wise Result Report",
      buildHtmlTable(columns, data),
      `<strong>Group &amp; Year Wise Result Report - (${escapeHtml(reportSubtitle)})</strong>`,
    );
  }

  const columnDefs = useMemo((): ColDef<AnyRow>[] => {
    const dynamic = columnKeys.map(
      (key): ColDef<AnyRow> => ({
        headerName: key,
        field: key,
        minWidth: 110,
        valueGetter: (p) => txt(p.data?.[key]),
      }),
    );
    return [
      {
        headerName: "SI.No",
        valueGetter: rowIndexGetter,
        width: 70,
        flex: 0,
      },
      ...dynamic,
    ];
  }, [columnKeys]);

  const filters = (
    <>
      <GlobalFilterBarRow>
        <GlobalFilterField label="Course *">
          <Select
            options={courses.map((c) => ({
              value: String(num(c.fk_course_id)),
              label: txt(c.course_code),
            }))}
            value={courseId || null}
            onChange={(v) => setCourseId(v ?? "")}
            disabled={loadingFilters}
            placeholder="Course"
          />
        </GlobalFilterField>
        <GlobalFilterField label="Exam Year *">
          <Select
            options={academicYears.map((y) => ({
              value: String(num(y.fk_academic_year_id)),
              label: txt(y.academic_year),
            }))}
            value={academicYearId || null}
            onChange={(v) => setAcademicYearId(v ?? "")}
            disabled={loadingFilters || !courseId}
            placeholder="Exam Year"
          />
        </GlobalFilterField>
        <GlobalFilterField
          label="Exam Master *"
          className="min-w-[280px] flex-[2]"
        >
          <Select
            options={exams.map((e) => ({
              value: String(num(e.fk_exam_id)),
              label: formatExamLabel(e),
            }))}
            value={examId || null}
            onChange={(v) => setExamId(v ?? "")}
            disabled={loadingFilters || !academicYearId}
            placeholder="Exam Master"
            searchable
          />
        </GlobalFilterField>
      </GlobalFilterBarRow>

      <GlobalFilterBarRow>
        <GlobalFilterField label="College *">
          <Select
            options={colleges.map((c) => ({
              value: String(num(c.fk_college_id)),
              label: txt(c.college_code),
            }))}
            value={collegeId || null}
            onChange={(v) => {
              setCollegeId(v ?? "");
              clearResults();
            }}
            disabled={loadingFilters || !examId}
            placeholder="College"
            searchable
          />
        </GlobalFilterField>
        <GlobalFilterField label="Course Group *">
          <Select
            options={[
              { value: "0", label: "All" },
              ...courseGroups.map((g) => ({
                value: String(num(g.fk_course_group_id)),
                label: txt(g.group_code),
              })),
            ]}
            value={courseGroupId || null}
            onChange={(v) => {
              setCourseGroupId(v ?? "");
              clearResults();
            }}
            disabled={loadingFilters || !collegeId}
            placeholder="Course Group"
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
              onClick={() => void onGetReports()}
              disabled={loadingList}
              className="h-[30px] px-3 text-[12px]"
            >
              Get Reports
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              title="Reset"
              onClick={onReset}
              className="h-[30px] w-[30px]"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </GlobalFilterField>
      </GlobalFilterBarRow>
    </>
  );

  return (
    <FilteredPage title="Group & Year Wise Result Report" filters={filters}>
      {rows.length > 0 && (
        <DataTable
          title={`Group & Year Wise Result Report - (${reportSubtitle})`}
          rowData={rows}
          columnDefs={columnDefs}
          loading={loadingList}
          pagination
          bordered
          toolbar={TOOLBAR}
          toolbarTrailing={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                className="h-[30px] px-3 text-[12px]"
                onClick={exportAsExcel}
              >
                Export Excel
              </Button>
              <Button
                type="button"
                className="h-[30px] px-3 text-[12px]"
                onClick={() =>
                  printGroupYearwiseReport(rows, columnKeys, reportSubtitle)
                }
              >
                Print Report
              </Button>
            </div>
          }
          getRowId={(p) =>
            String(
              columnKeys.map((k) => txt(p.data?.[k])).join("|") || p.rowIndex,
            )
          }
        />
      )}
    </FilteredPage>
  );
}
