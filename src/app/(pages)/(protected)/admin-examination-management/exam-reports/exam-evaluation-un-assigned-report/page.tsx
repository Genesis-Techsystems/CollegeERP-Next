"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColDef } from "ag-grid-community";
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
import {
  buildHtmlTable,
  exportHtmlTableAsExcel,
} from "../../_lib/export-html-table";
import {
  getEvalUnassignedBaseFilters,
  getExamEvalUnassignedList,
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

const EXPORT_COLS = [
  { key: "si", header: "Sl.No" },
  { key: "courseYear", header: "Course Year" },
  { key: "regulation", header: "Regulation" },
  { key: "subject", header: "Subject" },
  { key: "omrCount", header: "Un Assigned Omr Count" },
] as const;

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

function subjectLabel(row: AnyRow): string {
  const name = txt(row.subject_name);
  const code = txt(row.subject_code);
  if (name && code) return `${name}(${code})`;
  return name || code;
}

function toExportRows(rows: AnyRow[]): Record<string, unknown>[] {
  return rows.map((row, i) => ({
    si: i + 1,
    courseYear: txt(row.course_year_code),
    regulation: txt(row.regulation_code),
    subject: subjectLabel(row),
    omrCount: txt(row.omr_serial_count),
  }));
}

function printReport(rows: AnyRow[]) {
  if (!rows.length) return;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Exam Evaluation UnAssigned Report</title>
<style>
@page { size: A4 landscape; margin: 10mm; }
body { font: 11px/1.4 Arial, sans-serif; color: #000; margin: 0; }
.collegeName { text-align: center; font-size: 16px; font-weight: bold; margin: 8px 0 12px; }
table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #000; padding: 4px 6px; text-align: left; }
th { background: #f2f2f2; font-weight: 600; }
</style></head>
<body>
  <p class="collegeName">Exam Evaluation UnAssigned Report</p>
  ${buildHtmlTable([...EXPORT_COLS], toExportRows(rows))}
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
 * Angular Exam Evaluation UnAssigned Report
 * (`exam-evaluation-un-assigned-report`).
 */
export default function ExamEvaluationUnAssignedReportPage() {
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [loadingList, setLoadingList] = useState(false);

  const [baseRows, setBaseRows] = useState<AnyRow[]>([]);
  const [rows, setRows] = useState<AnyRow[]>([]);

  const [courseId, setCourseId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [examId, setExamId] = useState("");
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

  function clearResults() {
    setRows([]);
  }

  useEffect(() => {
    async function loadBase() {
      setLoadingFilters(true);
      try {
        const list = await getEvalUnassignedBaseFilters(employeeId);
        setBaseRows(list);
        // Angular getFiltersList → auto-select first course
        const firstCourses = dedupeBy(list, (r) => num(r.fk_course_id));
        if (firstCourses.length) {
          setCourseId(String(num(firstCourses[0].fk_course_id)));
        }
      } catch (e) {
        toastError(e, "Failed to load filters");
        setBaseRows([]);
      } finally {
        setLoadingFilters(false);
      }
    }
    void loadBase();
  }, [employeeId]);

  // Angular selectedCourse → first academic year
  useEffect(() => {
    setExamId("");
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

  // Angular selectedAcademicYear → first exam
  useEffect(() => {
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
    clearResults();
  }, [examId]);

  async function onGetList() {
    if (!courseId || !academicYearId || !examId) {
      toastInfo("Please Select Valid Filters");
      return;
    }
    setLoadingList(true);
    try {
      const list = await getExamEvalUnassignedList({
        courseId: Number(courseId),
        examId: Number(examId),
        isReevaluation,
        courseYearId: "",
      });
      setRows(list.map((row, i) => ({ ...row, __rid: i })));
      if (list.length) {
        toastSuccess("Data retrieved successfully!");
      } else {
        toastSuccess("No Records Found");
      }
    } catch (e) {
      toastError(e, "Failed to load report");
      setRows([]);
    } finally {
      setLoadingList(false);
    }
  }

  function handleExportExcel() {
    if (!rows.length) {
      toastInfo("No data to export");
      return;
    }
    exportHtmlTableAsExcel(
      "Exam Evaluation UnAssigned Report",
      buildHtmlTable([...EXPORT_COLS], toExportRows(rows)),
      `<strong>${escapeHtml("Exam Evaluation UnAssigned Report")}</strong>`,
    );
  }

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      {
        headerName: "Sl.No",
        valueGetter: rowIndexGetter,
        width: 70,
        flex: 0,
      },
      {
        headerName: "Course Year",
        minWidth: 120,
        valueGetter: (p) => txt(p.data?.course_year_code),
      },
      {
        headerName: "Regulation",
        minWidth: 180,
        valueGetter: (p) => txt(p.data?.regulation_code),
      },
      {
        headerName: "Subject",
        minWidth: 260,
        valueGetter: (p) => (p.data ? subjectLabel(p.data) : ""),
      },
      {
        headerName: "Un Assigned Omr Count",
        minWidth: 160,
        valueGetter: (p) => txt(p.data?.omr_serial_count),
      },
    ],
    [],
  );

  const filters = (
    <>
      <GlobalFilterBarRow>
        <GlobalFilterField label="Course">
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
        <GlobalFilterField label="Is Re-Evaluation">
          <div className="flex h-[30px] items-center gap-2">
            <Checkbox
              id="unassigned-is-reevaluation"
              checked={isReevaluation}
              onCheckedChange={(v) => {
                setIsReevaluation(v === true);
                clearResults();
              }}
            />
            <Label
              htmlFor="unassigned-is-reevaluation"
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
          <Button
            type="button"
            onClick={() => void onGetList()}
            disabled={loadingList}
            className="h-[30px] px-3 text-[12px]"
          >
            Get List
          </Button>
        </GlobalFilterField>
      </GlobalFilterBarRow>
    </>
  );

  return (
    <FilteredListPage
      title="Exam Evaluation UnAssigned Report"
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
              onClick={() => printReport(rows)}
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
