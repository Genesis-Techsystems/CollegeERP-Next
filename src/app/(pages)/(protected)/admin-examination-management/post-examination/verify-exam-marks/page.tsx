"use client";

/**
 * Verify Exam Marks — Result Processing Angular parity
 * Filters: College * / Exam * / Course Group * (All) / Subject (All)
 * Angular: result-processing/verify-exam-marks
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColDef } from "ag-grid-community";
import { format } from "date-fns";
import { RefreshCw } from "lucide-react";
import { FilteredListPage } from "@/components/layout";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { Select } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { rowIndexGetter } from "@/lib/utils";
import { dedupeBy, num, txt } from "@/common/utils/data-helpers";
import { toastError, toastSuccess } from "@/lib/toast";
import { toast } from "sonner";
import {
  buildHtmlTable,
  exportHtmlTableAsExcel,
} from "../../_lib/export-html-table";
import {
  getVerifyExamMarksFilters,
  getVerifyExamMarksReport,
  type VerifyExamMarksMode,
} from "@/services";

type AnyRow = Record<string, unknown>;

const toastInfo = (msg: string) => toast.info(msg);

const TOOLBAR = {
  search: true,
  searchPlaceholder: "Search...",
  columnPicker: false,
  exportPdf: false,
  exportExcel: false,
} as const;

const PANEL_TITLE: Record<VerifyExamMarksMode, string> = {
  internal: "Internal Marks Status",
  external: "External Marks Status",
  evaluation: "External Evaluation Status",
  all: "Exam Marks Status",
};

const REPORT_TITLE: Record<VerifyExamMarksMode, string> = {
  internal: "Internal Marks Status Report",
  external: "External Marks Status Report",
  evaluation: "External Evaluation Status Report",
  all: "Exam Marks Status Report",
};

/**
 * Angular External `displayedColumns`:
 * id, course_name, course_group, academic_year, course_year, subject_name,
 * Student_registered, ext_is_present, ext_marks_entered
 */
const EXTERNAL_COLS: { header: string; keys: string[] }[] = [
  { header: "Course Code", keys: ["Course_Code", "course_name"] },
  { header: "Course Group", keys: ["Course_Group", "course_group"] },
  { header: "Academic Year", keys: ["Academic_Year", "academic_year"] },
  { header: "Course Year", keys: ["Course_Year", "course_year"] },
  { header: "Subject", keys: ["Subject", "subject_name", "subject"] },
  {
    header: "Student Registered",
    keys: ["Student_Registered", "Student_registered"],
  },
  { header: "Ext Present", keys: ["Ext_is_Present", "ext_is_present"] },
  {
    header: "Ext Marks Entered",
    keys: ["Ext_Marks_Entered", "ext_marks_entered"],
  },
];

/**
 * Angular Evaluation `EvalautiondisplayedColumns`:
 * same through Ext Present, then 1/2/3 evaluation assigned/evaluated
 * (no Ext Marks Entered)
 */
const EVALUATION_COLS: { header: string; keys: string[] }[] = [
  { header: "Course Code", keys: ["Course_Code", "course_name"] },
  { header: "Course Group", keys: ["Course_Group", "course_group"] },
  { header: "Academic Year", keys: ["Academic_Year", "academic_year"] },
  { header: "Course Year", keys: ["Course_Year", "course_year"] },
  { header: "Subject", keys: ["Subject", "subject_name", "subject"] },
  {
    header: "Student Registered",
    keys: ["Student_Registered", "Student_registered"],
  },
  { header: "Ext Present", keys: ["Ext_is_Present", "ext_is_present"] },
  { header: "One Evaluation Assigned", keys: ["1_evaluation_assigned"] },
  { header: "One Evaluation Evaluated", keys: ["1_evaluation_evaluated"] },
  { header: "Two Evaluation Assigned", keys: ["2_evaluation_assigned"] },
  { header: "Two Evaluation Evaluated", keys: ["2_evaluation_evaluated"] },
  { header: "Three Evaluation Assigned", keys: ["3_evaluation_assigned"] },
  { header: "Three Evaluation Evaluated", keys: ["3_evaluation_evaluated"] },
];

/** Angular date pipe `MMM d, y` for exam dropdown labels. */
function formatExamDate(value: unknown): string {
  const raw = txt(value);
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw.slice(0, 10);
  return format(d, "MMM d, yyyy");
}

function formatExamLabel(exam: AnyRow): string {
  const name = txt(exam.exam_name);
  const from = formatExamDate(exam.from_date);
  const to = formatExamDate(exam.to_date);
  const bits: string[] = [];
  if (num(exam.is_internal_exam)) bits.push("Internal");
  if (num(exam.is_regular_exam)) bits.push("Regular");
  if (num(exam.is_supply_exam)) bits.push("Supple");
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

function cellValue(row: AnyRow, keys: string[]): string {
  for (const k of keys) {
    if (row[k] != null && txt(row[k]) !== "") return txt(row[k]);
  }
  return "";
}

/** Angular Internal / All: Object.keys(firstRow); splice(0, 1). */
function angularDynamicKeys(rows: AnyRow[]): string[] {
  if (!rows.length) return [];
  const firstKeys = Object.keys(rows[0]).filter((k) => k !== "__rid");
  if (!firstKeys.length) return [];
  const skip = firstKeys[0];
  const ordered: string[] = firstKeys.filter((k) => k !== skip);
  const seen = new Set(ordered);
  for (const row of rows.slice(1)) {
    for (const k of Object.keys(row)) {
      if (k === skip || k === "__rid" || seen.has(k)) continue;
      seen.add(k);
      ordered.push(k);
    }
  }
  return ordered;
}

function cellByKey(row: AnyRow, key: string): string {
  if (row[key] != null && txt(row[key]) !== "") return txt(row[key]);
  const norm = key.toLowerCase().replace(/\s+/g, " ").trim();
  for (const k of Object.keys(row)) {
    if (k.toLowerCase().replace(/\s+/g, " ").trim() === norm) {
      return txt(row[k]);
    }
  }
  return "";
}

function printReport(
  title: string,
  subtitle: string,
  columns: { key: string; header: string }[],
  rows: Record<string, unknown>[],
) {
  if (!rows.length || !columns.length) return;

  const colCount = columns.length;
  const thFont =
    colCount >= 22 ? 4.5 : colCount >= 16 ? 5.5 : colCount >= 12 ? 6.5 : 8;
  const tdFont = Math.max(4, thFont - 0.5);
  const pad =
    colCount >= 16 ? "1px 2px" : colCount >= 12 ? "2px 3px" : "3px 4px";

  const head = columns.map((c) => `<th>${escapeHtml(c.header)}</th>`).join("");
  const body = rows
    .map(
      (row) =>
        `<tr>${columns
          .map((c) => `<td>${escapeHtml(String(row[c.key] ?? ""))}</td>`)
          .join("")}</tr>`,
    )
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
@page { size: A4 landscape; margin: 5mm; }
* { box-sizing: border-box; }
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  color: #000;
  font-family: Arial, sans-serif;
}
.title, .sub { text-align: center; margin: 2px 0 4px; }
.title { font-size: 13px; font-weight: 700; }
.sub { font-size: 10px; }
table.report {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  margin-top: 6px;
}
table.report th,
table.report td {
  border: 1px solid #000;
  padding: ${pad};
  vertical-align: top;
  text-align: left;
  word-break: break-word;
  overflow-wrap: anywhere;
  white-space: normal;
}
table.report th {
  background: #f2f2f2;
  font-size: ${thFont}px;
  font-weight: 700;
  line-height: 1.15;
}
table.report td {
  font-size: ${tdFont}px;
  line-height: 1.2;
}
thead { display: table-header-group; }
tr { page-break-inside: avoid; }
</style></head>
<body>
  <p class="title">${escapeHtml(title)}</p>
  <p class="sub">${escapeHtml(subtitle)}</p>
  <table class="report"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
</body></html>`;

  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(frame);
  const fdoc = frame.contentDocument;
  const fwin = frame.contentWindow;
  if (!fdoc || !fwin) {
    frame.remove();
    return;
  }
  fdoc.open();
  fdoc.write(html);
  fdoc.close();
  const cleanup = () => frame.remove();
  fwin.addEventListener("afterprint", cleanup);
  setTimeout(() => {
    fwin.focus();
    fwin.print();
    setTimeout(cleanup, 60_000);
  }, 50);
}

export default function VerifyExamMarksPage() {
  const router = useRouter();
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [mode, setMode] = useState<VerifyExamMarksMode>("internal");
  const [baseRows, setBaseRows] = useState<AnyRow[]>([]);
  const [rows, setRows] = useState<AnyRow[]>([]);

  const [collegeId, setCollegeId] = useState("");
  const [examId, setExamId] = useState("");
  /** Angular defaults courseGroupId / subjectId to 0 (= All). */
  const [courseGroupId, setCourseGroupId] = useState("0");
  const [subjectId, setSubjectId] = useState("0");

  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );
  const organizationId = Number(
    globalThis?.localStorage?.getItem("organizationId") ?? 0,
  );

  // Angular: dedupe colleges, sort by clg_sort_order.
  const colleges = useMemo(() => {
    const list = dedupeBy(baseRows, (r) => num(r.fk_college_id));
    return [...list].sort(
      (a, b) => num(a.clg_sort_order) - num(b.clg_sort_order),
    );
  }, [baseRows]);

  // Angular selectedCollege: non-internal exams for college.
  const exams = useMemo(() => {
    if (!collegeId) return [];
    return dedupeBy(
      baseRows.filter(
        (r) =>
          num(r.fk_college_id) === Number(collegeId) &&
          !num(r.is_internal_exam),
      ),
      (r) => num(r.fk_exam_id),
    );
  }, [baseRows, collegeId]);

  // Angular selectedExam: groups for college + exam.
  const courseGroups = useMemo(() => {
    if (!collegeId || !examId) return [];
    return dedupeBy(
      baseRows.filter(
        (r) =>
          num(r.fk_college_id) === Number(collegeId) &&
          num(r.fk_exam_id) === Number(examId) &&
          num(r.fk_course_group_id) > 0,
      ),
      (r) => num(r.fk_course_group_id),
    );
  }, [baseRows, collegeId, examId]);

  // Angular selectedExam / selectedCourseGroup: subjects for college + exam (+ group if not All).
  const subjects = useMemo(() => {
    if (!collegeId || !examId) return [];
    const gid = Number(courseGroupId);
    return dedupeBy(
      baseRows.filter((r) => {
        if (num(r.fk_college_id) !== Number(collegeId)) return false;
        if (num(r.fk_exam_id) !== Number(examId)) return false;
        if (gid !== 0 && num(r.fk_course_group_id) !== gid) return false;
        return num(r.fk_subject_id) > 0;
      }),
      (r) => num(r.fk_subject_id),
    );
  }, [baseRows, collegeId, examId, courseGroupId]);

  const collegeCode = useMemo(() => {
    const row = colleges.find(
      (c) => num(c.fk_college_id) === Number(collegeId),
    );
    return txt(row?.college_code);
  }, [colleges, collegeId]);

  const examName = useMemo(() => {
    const row = exams.find((e) => num(e.fk_exam_id) === Number(examId));
    return txt(row?.exam_name);
  }, [exams, examId]);

  const groupCode = useMemo(() => {
    if (!courseGroupId || courseGroupId === "0") return "";
    const row = courseGroups.find(
      (g) => num(g.fk_course_group_id) === Number(courseGroupId),
    );
    return txt(row?.group_code);
  }, [courseGroups, courseGroupId]);

  const subjectCode = useMemo(() => {
    if (!subjectId || subjectId === "0") return "";
    const row = subjects.find(
      (s) => num(s.fk_subject_id) === Number(subjectId),
    );
    return txt(row?.subject_code);
  }, [subjects, subjectId]);

  const reportSubtitle = [
    collegeCode,
    examName,
    groupCode || null,
    subjectCode || null,
  ]
    .filter(Boolean)
    .join(" / ");

  useEffect(() => {
    let cancelled = false;
    async function loadBase() {
      setLoadingFilters(true);
      try {
        const list = await getVerifyExamMarksFilters({
          organizationId,
          employeeId,
        });
        if (cancelled) return;
        setBaseRows(list);
        const sorted = [...dedupeBy(list, (r) => num(r.fk_college_id))].sort(
          (a, b) => num(a.clg_sort_order) - num(b.clg_sort_order),
        );
        // Angular getFiltersList → auto-select first college → selectedCollege
        setCollegeId(sorted[0] ? String(num(sorted[0].fk_college_id)) : "");
      } catch (e) {
        if (cancelled) return;
        toastError(e, "Failed to load filters");
        setBaseRows([]);
        setCollegeId("");
      } finally {
        if (!cancelled) setLoadingFilters(false);
      }
    }
    void loadBase();
    return () => {
      cancelled = true;
    };
  }, [employeeId, organizationId]);

  // Angular selectedCollege → auto-pick first non-internal exam; reset group/subject to All.
  useEffect(() => {
    setRows([]);
    setCourseGroupId("0");
    setSubjectId("0");
    if (!exams.length) {
      setExamId("");
      return;
    }
    setExamId(String(num(exams[0].fk_exam_id)));
  }, [exams]);

  // Angular selectedExam → reset group/subject to All (0).
  // Runs when user changes exam (exams-effect already resets on college change).
  useEffect(() => {
    setRows([]);
    setCourseGroupId("0");
    setSubjectId("0");
  }, [examId]);

  function clearResults() {
    setRows([]);
  }

  async function onGetList() {
    // Angular feeFormGroup.valid: collegeId + examId required.
    if (!collegeId || !examId) {
      toastInfo("Please Select Valid Filters");
      return;
    }
    setLoadingList(true);
    try {
      const list = await getVerifyExamMarksReport({
        mode,
        examId: Number(examId),
        collegeId: Number(collegeId),
        courseGroupId: Number(courseGroupId || 0),
        subjectId: Number(subjectId || 0),
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
    // Angular reset(): college '', exam '', group 0, subject 0, clear table.
    setCollegeId("");
    setExamId("");
    setCourseGroupId("0");
    setSubjectId("0");
    clearResults();
  }

  function onBack() {
    try {
      sessionStorage.removeItem("examVerificationBack");
    } catch {
      /* ignore */
    }
    // Angular goBack() → location.back()
    router.back();
  }

  function onModeChange(value: string) {
    setMode(value as VerifyExamMarksMode);
    clearResults();
    // Angular clear() → selectedCollege(collegeId) re-runs cascade.
    if (!collegeId) return;
    setCourseGroupId("0");
    setSubjectId("0");
    if (exams.length) {
      setExamId(String(num(exams[0].fk_exam_id)));
    } else {
      setExamId("");
    }
  }

  const exportColumns = useMemo(() => {
    if (mode === "external") {
      return EXTERNAL_COLS.map((c) => ({ key: c.keys[0], header: c.header }));
    }
    if (mode === "evaluation") {
      return EVALUATION_COLS.map((c) => ({ key: c.keys[0], header: c.header }));
    }
    const keys = angularDynamicKeys(rows);
    return keys.map((k) => ({ key: k, header: k }));
  }, [mode, rows]);

  function exportDataRows(): Record<string, unknown>[] {
    if (mode === "external" || mode === "evaluation") {
      const cols = mode === "external" ? EXTERNAL_COLS : EVALUATION_COLS;
      return rows.map((row) => {
        const out: Record<string, unknown> = {};
        for (const c of cols) out[c.keys[0]] = cellValue(row, c.keys);
        return out;
      });
    }
    const keys = angularDynamicKeys(rows);
    return rows.map((row) => {
      const out: Record<string, unknown> = {};
      for (const k of keys) out[k] = cellByKey(row, k);
      return out;
    });
  }

  function handleExportExcel() {
    if (!rows.length) {
      toastInfo("No data to export");
      return;
    }
    exportHtmlTableAsExcel(
      REPORT_TITLE[mode],
      buildHtmlTable(exportColumns, exportDataRows()),
      `<strong>${escapeHtml(PANEL_TITLE[mode])} - ${escapeHtml(reportSubtitle)}</strong>`,
    );
  }

  function handlePrint() {
    if (!rows.length) {
      toastInfo("No data to print");
      return;
    }
    printReport(
      REPORT_TITLE[mode],
      reportSubtitle,
      exportColumns,
      exportDataRows(),
    );
  }

  const columnDefs = useMemo((): ColDef<AnyRow>[] => {
    if (mode === "external" || mode === "evaluation") {
      const cols = mode === "external" ? EXTERNAL_COLS : EVALUATION_COLS;
      return [
        {
          headerName: "SI No.",
          valueGetter: rowIndexGetter,
          width: 70,
          flex: 0,
        },
        ...cols.map(
          (c): ColDef<AnyRow> => ({
            headerName: c.header,
            minWidth: 120,
            flex: 0,
            valueGetter: (p) => cellValue(p.data ?? {}, c.keys),
          }),
        ),
      ];
    }
    const keys = angularDynamicKeys(rows);
    return keys.map(
      (key): ColDef<AnyRow> => ({
        headerName: key,
        field: key,
        minWidth: Math.max(110, key.length * 9),
        flex: 0,
        valueGetter: (p) => cellByKey(p.data ?? {}, key),
      }),
    );
  }, [mode, rows]);

  const filters = (
    <>
      <div className="mb-3 px-0">
        <RadioGroup
          value={mode}
          onValueChange={onModeChange}
          className="flex flex-wrap items-center gap-6"
        >
          <label className="flex items-center gap-2 text-[12px]">
            <RadioGroupItem value="internal" id="vem-internal" />
            Internal Marks Status
          </label>
          <label className="flex items-center gap-2 text-[12px]">
            <RadioGroupItem value="external" id="vem-external" />
            External Marks Status
          </label>
          <label className="flex items-center gap-2 text-[12px]">
            <RadioGroupItem value="evaluation" id="vem-evaluation" />
            External Evaluation Status
          </label>
          <label className="flex items-center gap-2 text-[12px]">
            <RadioGroupItem value="all" id="vem-all" />
            All
          </label>
        </RadioGroup>
      </div>

      <GlobalFilterBarRow>
        <GlobalFilterField label="College *">
          <Select
            options={colleges.map((c) => ({
              value: String(num(c.fk_college_id)),
              label: txt(c.college_code),
            }))}
            value={collegeId || null}
            onChange={(v) => setCollegeId(v ?? "")}
            disabled={loadingFilters}
            placeholder="College"
          />
        </GlobalFilterField>
        <GlobalFilterField label="Exam *" className="min-w-[280px] flex-[2]">
          <Select
            options={exams.map((e) => ({
              value: String(num(e.fk_exam_id)),
              label: formatExamLabel(e),
            }))}
            value={examId || null}
            onChange={(v) => setExamId(v ?? "")}
            disabled={loadingFilters || !collegeId}
            placeholder="Exam"
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
            value={courseGroupId || "0"}
            onChange={(v) => {
              setCourseGroupId(v ?? "0");
              setSubjectId("0");
              clearResults();
            }}
            disabled={loadingFilters || !examId}
            placeholder="Course Group"
            searchable
          />
        </GlobalFilterField>
        <GlobalFilterField label="Subject" className="min-w-[200px] flex-[2]">
          <Select
            options={[
              { value: "0", label: "All" },
              ...subjects.map((s) => ({
                value: String(num(s.fk_subject_id)),
                label: `${txt(s.subject_name)} - ${txt(s.subject_code)}`,
              })),
            ]}
            value={subjectId || "0"}
            onChange={(v) => {
              setSubjectId(v ?? "0");
              clearResults();
            }}
            disabled={loadingFilters || !examId}
            placeholder="Subject"
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
              onClick={() => void onGetList()}
              disabled={loadingList}
              className="h-[30px] px-3 text-[12px]"
            >
              Get List
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="h-[30px] px-3 text-[12px]"
            >
              Back
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
      <div className="sr-only">
        <Label>{PANEL_TITLE[mode]}</Label>
      </div>
    </>
  );

  return (
    <FilteredListPage
      title={
        rows.length > 0
          ? `${PANEL_TITLE[mode]} - ${reportSubtitle}`
          : PANEL_TITLE[mode]
      }
      filters={filters}
      rowData={rows}
      columnDefs={columnDefs}
      loading={loadingList}
      hideEmptyGrid
      pagination
      fitColumnsToWidth={false}
      toolbar={rows.length > 0 ? TOOLBAR : false}
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
              onClick={handlePrint}
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
