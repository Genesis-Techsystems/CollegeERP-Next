"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColDef } from "ag-grid-community";
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
  getVerifyExamMarksRestFilters,
  getVerifyExamMarksSubjects,
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
  columnFilters: false,
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
 * Angular External Marks Status (`displayedColumns`):
 * id, course_name, course_group, academic_year, course_year, subject_name,
 * Student_registered, ext_is_present, ext_marks_entered
 * (no evaluation columns)
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
 * Angular External Evaluation Status (`EvalautiondisplayedColumns`):
 * same as External through Ext Present, then 1/2/3 evaluation assigned/evaluated
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

function cellValue(row: AnyRow, keys: string[]): string {
  for (const k of keys) {
    if (row[k] != null && txt(row[k]) !== "") return txt(row[k]);
  }
  return "";
}

/**
 * Angular Internal (check===1) + All (check===4):
 *   AlldisplayedColumns = Object.keys(firstRow); splice(0, 1);
 * Headers = raw API field names (college removed as first key).
 * Union extra keys from later rows so sparse first rows still expose columns.
 */
function angularDynamicKeys(rows: AnyRow[]): string[] {
  if (!rows.length) return [];
  const firstKeys = Object.keys(rows[0]).filter((k) => k !== "__rid");
  if (!firstKeys.length) return [];
  const skip = firstKeys[0]; // Angular splice(0, 1) — usually "college"
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
  if (!rows.length) return;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
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
  <p class="title">${escapeHtml(title)}</p>
  <p class="sub">${escapeHtml(subtitle)}</p>
  ${buildHtmlTable(columns, rows)}
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

export default function VerifyExamMarksPage() {
  const router = useRouter();
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [mode, setMode] = useState<VerifyExamMarksMode>("internal");
  const [baseRows, setBaseRows] = useState<AnyRow[]>([]);
  const [restRows, setRestRows] = useState<AnyRow[]>([]);
  const [subjectRows, setSubjectRows] = useState<AnyRow[]>([]);
  const [rows, setRows] = useState<AnyRow[]>([]);

  const [courseId, setCourseId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [examId, setExamId] = useState("");
  const [courseGroupId, setCourseGroupId] = useState("");
  const [courseYearId, setCourseYearId] = useState("");
  const [regulationId, setRegulationId] = useState("");
  const [subjectId, setSubjectId] = useState("");

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
    const current = [...unique].sort(
      (a, b) => num(b.is_curr_ay) - num(a.is_curr_ay),
    );
    return [...current].sort(
      (a, b) =>
        parseInt(txt(b.academic_year), 10) - parseInt(txt(a.academic_year), 10),
    );
  }, [baseRows, courseId]);

  const exams = useMemo(() => {
    const cid = Number(courseId);
    const ay = Number(academicYearId);
    // Angular: filter out internal exams
    return dedupeBy(
      baseRows.filter(
        (r) =>
          num(r.fk_course_id) === cid &&
          num(r.fk_academic_year_id) === ay &&
          !r.is_internal_exam,
      ),
      (r) => num(r.fk_exam_id),
    );
  }, [baseRows, courseId, academicYearId]);

  const courseGroups = useMemo(
    () => dedupeBy(restRows, (r) => num(r.fk_course_group_id)),
    [restRows],
  );

  const courseYears = useMemo(() => {
    const gid = Number(courseGroupId);
    return dedupeBy(
      restRows.filter((r) => num(r.fk_course_group_id) === gid),
      (r) => num(r.fk_course_year_id),
    );
  }, [restRows, courseGroupId]);

  const regulations = useMemo(() => {
    const gid = Number(courseGroupId);
    const yid = Number(courseYearId);
    return dedupeBy(
      restRows.filter(
        (r) =>
          num(r.fk_course_group_id) === gid && num(r.fk_course_year_id) === yid,
      ),
      (r) => num(r.fk_regulation_id),
    );
  }, [restRows, courseGroupId, courseYearId]);

  const subjects = useMemo(
    () => dedupeBy(subjectRows, (r) => num(r.fk_subject_id)),
    [subjectRows],
  );

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

  const collegeCode = useMemo(() => {
    const row = restRows.find(
      (r) => num(r.fk_course_group_id) === Number(courseGroupId),
    );
    return txt(row?.college_code);
  }, [restRows, courseGroupId]);

  const reportSubtitle = [
    collegeCode,
    examName,
    groupCode || null,
    subjectCode || null,
  ]
    .filter(Boolean)
    .join(" / ");

  async function loadBase() {
    setLoadingFilters(true);
    try {
      const list = await getVerifyExamMarksFilters({ employeeId });
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
    void loadBase();
  }, [employeeId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setAcademicYearId("");
    setExamId("");
    setCourseGroupId("");
    setCourseYearId("");
    setRegulationId("");
    setSubjectId("");
    setRestRows([]);
    setSubjectRows([]);
    setRows([]);
    if (!courseId || !academicYears.length) return;
    // Prefer current AY (Angular), else first after sort
    const current = academicYears.find((y) => num(y.is_curr_ay) > 0);
    const pick = current ?? academicYears[0];
    setAcademicYearId(String(num(pick.fk_academic_year_id)));
  }, [courseId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setExamId("");
    setCourseGroupId("");
    setCourseYearId("");
    setRegulationId("");
    setSubjectId("");
    setRestRows([]);
    setSubjectRows([]);
    setRows([]);
    if (!academicYearId || !exams.length) return;
    setExamId(String(num(exams[0].fk_exam_id)));
  }, [academicYearId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    async function loadRest() {
      setCourseGroupId("");
      setCourseYearId("");
      setRegulationId("");
      setSubjectId("");
      setSubjectRows([]);
      setRows([]);
      if (!courseId || !academicYearId || !examId) {
        setRestRows([]);
        return;
      }
      setLoadingFilters(true);
      try {
        const list = await getVerifyExamMarksRestFilters({
          mode,
          courseId: Number(courseId),
          academicYearId: Number(academicYearId),
          examId: Number(examId),
          employeeId,
        });
        setRestRows(list);
        const first = dedupeBy(list, (r) => num(r.fk_course_group_id))[0];
        if (first) setCourseGroupId(String(num(first.fk_course_group_id)));
      } catch (e) {
        toastError(e, "Failed to load course groups");
        setRestRows([]);
      } finally {
        setLoadingFilters(false);
      }
    }
    void loadRest();
  }, [courseId, academicYearId, examId, mode, employeeId]);

  useEffect(() => {
    setCourseYearId("");
    setRegulationId("");
    setSubjectId("");
    setSubjectRows([]);
    setRows([]);
    if (!courseGroupId || !courseYears.length) return;
    setCourseYearId(String(num(courseYears[0].fk_course_year_id)));
  }, [courseGroupId, restRows]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setRegulationId("");
    setSubjectId("");
    setSubjectRows([]);
    setRows([]);
    if (!courseYearId || !regulations.length) return;
    setRegulationId(String(num(regulations[0].fk_regulation_id)));
  }, [courseYearId, restRows, courseGroupId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    async function loadSubjects() {
      setSubjectId("");
      setRows([]);
      if (
        !courseId ||
        !academicYearId ||
        !examId ||
        !courseGroupId ||
        !courseYearId ||
        regulationId === ""
      ) {
        setSubjectRows([]);
        return;
      }
      setLoadingFilters(true);
      try {
        const list = await getVerifyExamMarksSubjects({
          mode,
          courseId: Number(courseId),
          courseGroupId: Number(courseGroupId),
          courseYearId: Number(courseYearId),
          examId: Number(examId),
          academicYearId: Number(academicYearId),
          regulationId: Number(regulationId),
          employeeId,
        });
        setSubjectRows(list);
      } catch (e) {
        toastError(e, "Failed to load subjects");
        setSubjectRows([]);
      } finally {
        setLoadingFilters(false);
      }
    }
    void loadSubjects();
  }, [
    courseId,
    academicYearId,
    examId,
    courseGroupId,
    courseYearId,
    regulationId,
    mode,
    employeeId,
  ]);

  function clearResults() {
    setRows([]);
  }

  async function onGetList() {
    if (
      !courseId ||
      !academicYearId ||
      !examId ||
      !courseGroupId ||
      !courseYearId
    ) {
      toastInfo("Please Select Valid Filters");
      return;
    }
    setLoadingList(true);
    try {
      const list = await getVerifyExamMarksReport({
        mode,
        examId: Number(examId),
        courseId: Number(courseId),
        courseGroupId: Number(courseGroupId),
        courseYearId: Number(courseYearId),
        academicYearId: Number(academicYearId),
        regulationId: Number(regulationId || 0),
        subjectId: Number(subjectId || 0),
      });
      // Stamp unique ids — many subject rows share Course_Code/subject_code;
      // duplicate getRowId values make AG Grid show only one row.
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
    // Angular reset: clear exam / group / subject + table
    setExamId("");
    setCourseGroupId("");
    setCourseYearId("");
    setRegulationId("");
    setSubjectId("");
    setRestRows([]);
    setSubjectRows([]);
    clearResults();
    if (academicYearId && exams.length) {
      setExamId(String(num(exams[0].fk_exam_id)));
    }
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
    // Angular External / Evaluation: fixed matColumnDef list + SI No.
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
    // Angular Internal / All: Object.keys(firstRow); splice(0, 1) — no SI No.
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
          onValueChange={(value) => {
            setMode(value as VerifyExamMarksMode);
            clearResults();
          }}
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
        <GlobalFilterField label="Academic Year *">
          <Select
            options={academicYears.map((y) => ({
              value: String(num(y.fk_academic_year_id)),
              label: txt(y.academic_year),
            }))}
            value={academicYearId || null}
            onChange={(v) => setAcademicYearId(v ?? "")}
            disabled={loadingFilters || !courseId}
            placeholder="Academic Year"
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
            disabled={loadingFilters || !academicYearId}
            placeholder="Exam"
            searchable
          />
        </GlobalFilterField>
      </GlobalFilterBarRow>

      <GlobalFilterBarRow>
        <GlobalFilterField label="Course Group *">
          <Select
            options={courseGroups.map((g) => ({
              value: String(num(g.fk_course_group_id)),
              label: txt(g.group_code),
            }))}
            value={courseGroupId || null}
            onChange={(v) => {
              setCourseGroupId(v ?? "");
              clearResults();
            }}
            disabled={loadingFilters || !examId}
            placeholder="Course Group"
            searchable
          />
        </GlobalFilterField>
        <GlobalFilterField label="Course Year *">
          <Select
            options={courseYears.map((y) => ({
              value: String(num(y.fk_course_year_id)),
              label: txt(y.course_year_code),
            }))}
            value={courseYearId || null}
            onChange={(v) => {
              setCourseYearId(v ?? "");
              clearResults();
            }}
            disabled={loadingFilters || !courseGroupId}
            placeholder="Course Year"
          />
        </GlobalFilterField>
        <GlobalFilterField label="Regulation">
          <Select
            options={regulations.map((r) => ({
              value: String(num(r.fk_regulation_id)),
              label: txt(r.regulation_code),
            }))}
            value={regulationId || null}
            onChange={(v) => {
              setRegulationId(v ?? "");
              clearResults();
            }}
            disabled={loadingFilters || !courseYearId}
            placeholder="Regulation"
          />
        </GlobalFilterField>
        <GlobalFilterField label="Subject" className="min-w-[200px] flex-[2]">
          <Select
            options={subjects.map((s) => ({
              value: String(num(s.fk_subject_id)),
              label: `${txt(s.subject_name)} - ${txt(s.subject_code)}`,
            }))}
            value={subjectId || null}
            onChange={(v) => {
              setSubjectId(v ?? "");
              clearResults();
            }}
            disabled={loadingFilters || regulationId === ""}
            placeholder="Subject"
            searchable
            clearable
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
              variant="secondary"
              onClick={onBack}
              className="h-[30px] px-3 text-[12px] bg-amber-400 text-black hover:bg-amber-500"
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
      pagination
      fitColumnsToWidth={false}
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
