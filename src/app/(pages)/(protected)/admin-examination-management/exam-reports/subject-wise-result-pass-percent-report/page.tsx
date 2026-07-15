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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { rowIndexGetter } from "@/lib/utils";
import { dedupeBy, num, txt } from "@/common/utils/data-helpers";
import { toastError, toastSuccess } from "@/lib/toast";
import { toast } from "sonner";
import { exportHtmlTableAsExcel } from "../../_lib/export-html-table";
import {
  getSubjectWisePassPercentBaseFilters,
  getSubjectWisePassPercentReport,
  getSubjectWisePassPercentRestFilters,
  type AnyRow,
} from "@/services";

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

function n(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function rowMetrics(row: AnyRow) {
  const passed = n(row.passed);
  const afterMod = n(row.Passed_after_moderation);
  const afterGrace = n(row.Passed_after_grace);
  const modBenefit = afterMod - passed;
  const graceBenefit = afterGrace - afterMod;
  return {
    passed,
    afterMod,
    afterGrace,
    modBenefit,
    graceBenefit,
    combinedBenefit: modBenefit + graceBenefit,
  };
}

function buildExportTable(rows: AnyRow[], subtitle: string): string {
  const body = rows
    .map((row, i) => {
      const m = rowMetrics(row);
      return `<tr>
<td>${i + 1}</td>
<td>${escapeHtml(txt(row.course_year_code))}</td>
<td>${escapeHtml(txt(row.subject_name))}</td>
<td>${escapeHtml(txt(row.registered))}</td>
<td>${escapeHtml(txt(row.Appeared))}</td>
<td>${escapeHtml(txt(row.passed))}</td>
<td>${escapeHtml(txt(row.Passed_percent))}</td>
<td>${escapeHtml(txt(row.Count_of_above_55_percent))}</td>
<td>${escapeHtml(txt(row.Percent_of_above_55_percent))}</td>
<td>${escapeHtml(txt(row.Passed_after_moderation))}</td>
<td>${escapeHtml(txt(row.Passed_after_moderation_percent))}</td>
<td>${escapeHtml(txt(row.Moderation_marks_awarded))}</td>
<td>${m.modBenefit}</td>
<td>${escapeHtml(txt(row.Passed_after_grace))}</td>
<td>${escapeHtml(txt(row.Passed_after_grace_percent))}</td>
<td>${m.graceBenefit}</td>
<td>${m.combinedBenefit}</td>
<td>${escapeHtml(txt(row.Passed_after_grace_percent))}</td>
</tr>`;
    })
    .join("");

  return `<table border="1" cellspacing="0" cellpadding="4">
<thead>
<tr style="display:none"><th colspan="18">Subject Wise Pass Percentage Report (${escapeHtml(subtitle)})</th></tr>
<tr>
<th colspan="5"></th>
<th colspan="4">Before Moderation</th>
<th colspan="4">After Moderation</th>
<th colspan="3">After Grace Marks</th>
<th></th><th></th>
</tr>
<tr>
<th>S.No</th><th>Semester</th><th>Subject</th><th>Registered</th><th>Appeared</th>
<th>Passed</th><th>Pass %</th><th>&gt;=55% Marks</th><th>&gt;=55 %Age</th>
<th>Passed</th><th>Pass %</th><th>Moderation Marks Awarded</th><th>No.of Students Benefited</th>
<th>Passed</th><th>Pass %</th><th>No.of Students Benefited</th>
<th>No.of Students Benefited after Moderation and Grace</th><th>Final Pass %</th>
</tr>
</thead>
<tbody>${body}</tbody>
</table>`;
}

function printReport(rows: AnyRow[], subtitle: string) {
  if (!rows.length) return;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Subject Wise Result Percentage Report</title>
<style>
@page { size: A4 landscape; margin: 8mm; }
body { font: 10px/1.3 Arial, sans-serif; color: #000; margin: 0; }
.title { text-align: center; font-size: 14px; font-weight: bold; margin: 4px 0; }
.sub { text-align: center; margin: 2px 0 8px; }
table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #000; padding: 3px 4px; text-align: left; }
th { background: #f2f2f2; }
.note { margin-top: 10px; font-size: 10px; }
</style></head>
<body>
  <p class="title">Subject Wise Result Percentage Report</p>
  <p class="sub">${escapeHtml(subtitle)}</p>
  ${buildExportTable(rows, subtitle)}
  <div class="note"><strong>Moderation Marks :</strong>
    <ol>
      <li>If the pass in a subject is &lt; 30% then 4 is added.</li>
      <li>If the percentage of students getting 55% of marks in a subject is &lt; 70%, then 4 is added.</li>
      <li>If the both the above conditions are met then 2 moderations are added in a subject.</li>
    </ol>
  </div>
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

/**
 * Angular Subject Wise Result Percentage Report
 * (`subject-wise-result-pass-percent-report`).
 */
export default function SubjectWiseResultPassPercentReportPage() {
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [loadingList, setLoadingList] = useState(false);

  const [baseRows, setBaseRows] = useState<AnyRow[]>([]);
  const [restRows, setRestRows] = useState<AnyRow[]>([]);
  const [rows, setRows] = useState<AnyRow[]>([]);

  const [courseId, setCourseId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [examId, setExamId] = useState("");
  const [courseYearId, setCourseYearId] = useState("0");
  const [isReevaluation, setIsReevaluation] = useState(false);

  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );

  const courses = useMemo(
    () => dedupeBy(baseRows, (r) => num(r.fk_course_id)),
    [baseRows],
  );
  const academicYears = useMemo(() => {
    if (!courseId) return [];
    const list = dedupeBy(
      baseRows.filter((r) => num(r.fk_course_id) === Number(courseId)),
      (r) => num(r.fk_academic_year_id),
    );
    return [...list].sort(
      (a, b) =>
        parseInt(txt(b.academic_year), 10) - parseInt(txt(a.academic_year), 10),
    );
  }, [baseRows, courseId]);
  const exams = useMemo(() => {
    if (!courseId || !academicYearId) return [];
    return dedupeBy(
      baseRows.filter(
        (r) =>
          num(r.fk_course_id) === Number(courseId) &&
          num(r.fk_academic_year_id) === Number(academicYearId),
      ),
      (r) => num(r.fk_exam_id),
    );
  }, [baseRows, courseId, academicYearId]);
  const courseYears = useMemo(() => {
    const list = dedupeBy(restRows, (r) => num(r.fk_course_year_id));
    return [...list].sort(
      (a, b) =>
        num(a.year_order ?? a.cy_sort_order) -
        num(b.year_order ?? b.cy_sort_order),
    );
  }, [restRows]);

  const reportSubtitle = useMemo(() => {
    const parts = [
      txt(
        courses.find((c) => num(c.fk_course_id) === Number(courseId))
          ?.course_code,
      ),
      Number(courseYearId)
        ? txt(
            courseYears.find(
              (y) => num(y.fk_course_year_id) === Number(courseYearId),
            )?.course_year_code,
          )
        : "",
      txt(exams.find((e) => num(e.fk_exam_id) === Number(examId))?.exam_name),
    ].filter(Boolean);
    return parts.join(" / ");
  }, [courses, courseYears, exams, courseId, courseYearId, examId]);

  function clearResults() {
    setRows([]);
  }

  useEffect(() => {
    async function loadBase() {
      setLoadingFilters(true);
      try {
        const list = await getSubjectWisePassPercentBaseFilters(employeeId);
        setBaseRows(list);
        const first = dedupeBy(list, (r) => num(r.fk_course_id));
        if (first.length) setCourseId(String(num(first[0].fk_course_id)));
      } catch (e) {
        toastError(e, "Failed to load filters");
        setBaseRows([]);
      } finally {
        setLoadingFilters(false);
      }
    }
    void loadBase();
  }, [employeeId]);

  useEffect(() => {
    setExamId("");
    setCourseYearId("0");
    setRestRows([]);
    clearResults();
    if (!courseId) {
      setAcademicYearId("");
      return;
    }
    const years = dedupeBy(
      baseRows.filter((r) => num(r.fk_course_id) === Number(courseId)),
      (r) => num(r.fk_academic_year_id),
    ).sort(
      (a, b) =>
        parseInt(txt(b.academic_year), 10) - parseInt(txt(a.academic_year), 10),
    );
    setAcademicYearId(
      years.length ? String(num(years[0].fk_academic_year_id)) : "",
    );
  }, [courseId, baseRows]);

  useEffect(() => {
    setCourseYearId("0");
    setRestRows([]);
    clearResults();
    if (!courseId || !academicYearId) {
      setExamId("");
      return;
    }
    const list = dedupeBy(
      baseRows.filter(
        (r) =>
          num(r.fk_course_id) === Number(courseId) &&
          num(r.fk_academic_year_id) === Number(academicYearId),
      ),
      (r) => num(r.fk_exam_id),
    );
    setExamId(list.length ? String(num(list[0].fk_exam_id)) : "");
  }, [academicYearId, courseId, baseRows]);

  useEffect(() => {
    async function loadRest() {
      setCourseYearId("0");
      clearResults();
      if (!courseId || !academicYearId || !examId) {
        setRestRows([]);
        return;
      }
      setLoadingFilters(true);
      try {
        const list = await getSubjectWisePassPercentRestFilters({
          courseId: Number(courseId),
          academicYearId: Number(academicYearId),
          examId: Number(examId),
          employeeId,
        });
        setRestRows(list);
        const years = dedupeBy(list, (r) => num(r.fk_course_year_id)).sort(
          (a, b) =>
            num(a.year_order ?? a.cy_sort_order) -
            num(b.year_order ?? b.cy_sort_order),
        );
        if (years.length) {
          setCourseYearId(String(num(years[0].fk_course_year_id)));
        }
      } catch (e) {
        toastError(e, "Failed to load course years");
        setRestRows([]);
      } finally {
        setLoadingFilters(false);
      }
    }
    void loadRest();
  }, [examId, courseId, academicYearId, employeeId]);

  async function onGetReport() {
    if (!courseId || !academicYearId || !examId || !courseYearId) {
      toastInfo("Please Select Valid Filters");
      return;
    }
    setLoadingList(true);
    try {
      const list = await getSubjectWisePassPercentReport({
        examId: Number(examId),
        courseId: Number(courseId),
        courseYearId: Number(courseYearId) || 0,
        isReevaluation,
      });
      setRows(list.map((row, i) => ({ ...row, __rid: i })));
      if (!list.length) toastSuccess("No Records Found.");
    } catch (e) {
      toastError(e, "Failed to load report");
      setRows([]);
    } finally {
      setLoadingList(false);
    }
  }

  function onReset() {
    setCourseId("");
    setAcademicYearId("");
    setExamId("");
    setCourseYearId("0");
    setIsReevaluation(false);
    setRestRows([]);
    clearResults();
    const first = courses[0];
    if (first) setCourseId(String(num(first.fk_course_id)));
  }

  function handleExportExcel() {
    if (!rows.length) {
      toastInfo("No data to export");
      return;
    }
    exportHtmlTableAsExcel(
      "Subject Wise Result Percentage Report",
      buildExportTable(rows, reportSubtitle),
    );
  }

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      {
        headerName: "S.No",
        valueGetter: rowIndexGetter,
        width: 70,
        flex: 0,
      },
      {
        headerName: "Semester",
        minWidth: 100,
        valueGetter: (p) => txt(p.data?.course_year_code),
      },
      {
        headerName: "Subject",
        minWidth: 180,
        valueGetter: (p) => txt(p.data?.subject_name),
      },
      {
        headerName: "Registered",
        minWidth: 100,
        valueGetter: (p) => txt(p.data?.registered),
      },
      {
        headerName: "Appeared",
        minWidth: 100,
        valueGetter: (p) => txt(p.data?.Appeared),
      },
      {
        headerName: "BM Passed",
        minWidth: 100,
        valueGetter: (p) => txt(p.data?.passed),
      },
      {
        headerName: "BM Pass %",
        minWidth: 100,
        valueGetter: (p) => txt(p.data?.Passed_percent),
      },
      {
        headerName: ">=55% Marks",
        minWidth: 110,
        valueGetter: (p) => txt(p.data?.Count_of_above_55_percent),
      },
      {
        headerName: ">=55 %Age",
        minWidth: 100,
        valueGetter: (p) => txt(p.data?.Percent_of_above_55_percent),
      },
      {
        headerName: "AM Passed",
        minWidth: 100,
        valueGetter: (p) => txt(p.data?.Passed_after_moderation),
      },
      {
        headerName: "AM Pass %",
        minWidth: 100,
        valueGetter: (p) => txt(p.data?.Passed_after_moderation_percent),
      },
      {
        headerName: "Moderation Marks Awarded",
        minWidth: 140,
        valueGetter: (p) => txt(p.data?.Moderation_marks_awarded),
      },
      {
        headerName: "AM Students Benefited",
        minWidth: 140,
        valueGetter: (p) =>
          p.data ? String(rowMetrics(p.data).modBenefit) : "",
      },
      {
        headerName: "AG Passed",
        minWidth: 100,
        valueGetter: (p) => txt(p.data?.Passed_after_grace),
      },
      {
        headerName: "AG Pass %",
        minWidth: 100,
        valueGetter: (p) => txt(p.data?.Passed_after_grace_percent),
      },
      {
        headerName: "AG Students Benefited",
        minWidth: 140,
        valueGetter: (p) =>
          p.data ? String(rowMetrics(p.data).graceBenefit) : "",
      },
      {
        headerName: "Benefited (Mod+Grace)",
        minWidth: 150,
        valueGetter: (p) =>
          p.data ? String(rowMetrics(p.data).combinedBenefit) : "",
      },
      {
        headerName: "Final Pass %",
        minWidth: 110,
        valueGetter: (p) => txt(p.data?.Passed_after_grace_percent),
      },
    ],
    [],
  );

  const filters = (
    <>
      <GlobalFilterBarRow>
        <GlobalFilterField label="Course *">
          <Select
            value={courseId || null}
            onChange={(v) => setCourseId(v ?? "")}
            isLoading={loadingFilters}
            options={courses.map((c) => ({
              value: String(num(c.fk_course_id)),
              label: txt(c.course_code),
            }))}
            placeholder="Course"
            searchable
          />
        </GlobalFilterField>
        <GlobalFilterField label="Exam Year">
          <Select
            value={academicYearId || null}
            onChange={(v) => setAcademicYearId(v ?? "")}
            isLoading={loadingFilters}
            options={academicYears.map((y) => ({
              value: String(num(y.fk_academic_year_id)),
              label: txt(y.academic_year),
            }))}
            placeholder="Exam Year"
            searchable
          />
        </GlobalFilterField>
        <GlobalFilterField label="Exam" className="min-w-[280px] flex-[2]">
          <Select
            value={examId || null}
            onChange={(v) => setExamId(v ?? "")}
            isLoading={loadingFilters}
            options={exams.map((e) => ({
              value: String(num(e.fk_exam_id)),
              label: formatExamLabel(e),
            }))}
            placeholder="Exam"
            searchable
          />
        </GlobalFilterField>
      </GlobalFilterBarRow>
      <GlobalFilterBarRow>
        <GlobalFilterField label="Course Year">
          <Select
            value={courseYearId || null}
            onChange={(v) => {
              setCourseYearId(v ?? "0");
              clearResults();
            }}
            isLoading={loadingFilters}
            options={[
              { value: "0", label: "All" },
              ...courseYears.map((y) => ({
                value: String(num(y.fk_course_year_id)),
                label: txt(y.course_year_code),
              })),
            ]}
            placeholder="Course Year"
            searchable
          />
        </GlobalFilterField>
        <GlobalFilterField label="Is Re-Evaluation">
          <div className="flex h-[30px] items-center gap-2">
            <Checkbox
              id="swpp-is-reevaluation"
              checked={isReevaluation}
              onCheckedChange={(v) => {
                setIsReevaluation(v === true);
                clearResults();
              }}
            />
            <Label
              htmlFor="swpp-is-reevaluation"
              className="text-[12px] font-normal"
            >
              Is Re-Evaluation
            </Label>
          </div>
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
              variant="outline"
              size="icon"
              className="h-[30px] w-[30px]"
              title="Reset"
              onClick={onReset}
            >
              <RefreshCw className="h-3.5 w-3.5" />
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
          ? `Subject Wise Result Percentage Report — ${reportSubtitle}`
          : "Subject Wise Result Percentage Report"
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
              onClick={() => printReport(rows, reportSubtitle)}
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
