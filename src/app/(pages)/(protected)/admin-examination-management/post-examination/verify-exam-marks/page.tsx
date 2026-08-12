"use client";

/**
 * Verify Exam Marks — Post Examination Angular parity
 * Angular: post-examination/verify-exam-marks
 * Filters: Course * / Academic Year * / Exam * / Course Group * / Course Year * / Regulation / Subject
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

function cascadeRestFilters(restRows: AnyRow[]) {
  const courseGroups = dedupeBy(
    restRows.filter((r) => num(r.fk_course_group_id) > 0),
    (r) => num(r.fk_course_group_id),
  );
  const courseGroupId = courseGroups[0]
    ? num(courseGroups[0].fk_course_group_id)
    : 0;

  const courseYears = dedupeBy(
    restRows.filter((r) => num(r.fk_course_group_id) === courseGroupId),
    (r) => num(r.fk_course_year_id),
  ).filter((r) => num(r.fk_course_year_id) > 0);
  const courseYearId = courseYears[0]
    ? num(courseYears[0].fk_course_year_id)
    : 0;

  const regulations = dedupeBy(
    restRows.filter(
      (r) =>
        num(r.fk_course_group_id) === courseGroupId &&
        num(r.fk_course_year_id) === courseYearId,
    ),
    (r) => num(r.fk_regulation_id),
  ).filter((r) => num(r.fk_regulation_id) > 0);
  const regulationId = regulations[0]
    ? num(regulations[0].fk_regulation_id)
    : 0;

  return { courseGroupId, courseYearId, regulationId };
}

function cascadeYearAndRegulation(
  restRows: AnyRow[],
  courseGroupId: number,
  courseYearId?: number,
) {
  const courseYears = dedupeBy(
    restRows.filter((r) => num(r.fk_course_group_id) === courseGroupId),
    (r) => num(r.fk_course_year_id),
  ).filter((r) => num(r.fk_course_year_id) > 0);

  const resolvedYearId =
    courseYearId != null &&
    courseYears.some((r) => num(r.fk_course_year_id) === courseYearId)
      ? courseYearId
      : courseYears[0]
        ? num(courseYears[0].fk_course_year_id)
        : 0;

  const regulations = dedupeBy(
    restRows.filter(
      (r) =>
        num(r.fk_course_group_id) === courseGroupId &&
        num(r.fk_course_year_id) === resolvedYearId,
    ),
    (r) => num(r.fk_regulation_id),
  ).filter((r) => num(r.fk_regulation_id) > 0);

  const regulationId = regulations[0]
    ? num(regulations[0].fk_regulation_id)
    : 0;

  return { courseYearId: resolvedYearId, regulationId };
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

  const [examListDetails, setExamListDetails] = useState<AnyRow[]>([]);
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
    () => dedupeBy(examListDetails, (r) => num(r.fk_course_id)),
    [examListDetails],
  );

  const academicYears = useMemo(() => {
    const cid = Number(courseId);
    const list = examListDetails.filter((r) => num(r.fk_course_id) === cid);
    const unique = dedupeBy(list, (r) => num(r.fk_academic_year_id));
    return [...unique].sort(
      (a, b) =>
        parseInt(txt(b.academic_year), 10) - parseInt(txt(a.academic_year), 10),
    );
  }, [examListDetails, courseId]);

  const exams = useMemo(() => {
    const cid = Number(courseId);
    const ay = Number(academicYearId);
    return dedupeBy(
      examListDetails.filter(
        (r) =>
          num(r.fk_course_id) === cid &&
          num(r.fk_academic_year_id) === ay &&
          !num(r.is_internal_exam),
      ),
      (r) => num(r.fk_exam_id),
    );
  }, [examListDetails, courseId, academicYearId]);

  const courseGroups = useMemo(
    () =>
      dedupeBy(
        restRows.filter((r) => num(r.fk_course_group_id) > 0),
        (r) => num(r.fk_course_group_id),
      ),
    [restRows],
  );

  const courseYears = useMemo(() => {
    const gid = Number(courseGroupId);
    return dedupeBy(
      restRows.filter((r) => num(r.fk_course_group_id) === gid),
      (r) => num(r.fk_course_year_id),
    ).filter((r) => num(r.fk_course_year_id) > 0);
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
    ).filter((r) => num(r.fk_regulation_id) > 0);
  }, [restRows, courseGroupId, courseYearId]);

  const subjects = useMemo(
    () => dedupeBy(subjectRows, (r) => num(r.fk_subject_id)),
    [subjectRows],
  );

  const courseCode = useMemo(() => {
    const row = courses.find((c) => num(c.fk_course_id) === Number(courseId));
    return txt(row?.course_code);
  }, [courses, courseId]);

  const examName = useMemo(() => {
    const row = exams.find((e) => num(e.fk_exam_id) === Number(examId));
    return txt(row?.exam_name);
  }, [exams, examId]);

  const groupCode = useMemo(() => {
    const row = courseGroups.find(
      (g) => num(g.fk_course_group_id) === Number(courseGroupId),
    );
    return txt(row?.group_code);
  }, [courseGroups, courseGroupId]);

  const subjectCode = useMemo(() => {
    if (!subjectId) return "";
    const row = subjects.find(
      (s) => num(s.fk_subject_id) === Number(subjectId),
    );
    return txt(row?.subject_code);
  }, [subjects, subjectId]);

  const reportSubtitle = [
    courseCode,
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
        const list = await getVerifyExamMarksFilters({ employeeId });
        if (cancelled) return;
        setExamListDetails(list);
        const first = dedupeBy(list, (r) => num(r.fk_course_id))[0];
        setCourseId(first ? String(num(first.fk_course_id)) : "");
      } catch (e) {
        if (cancelled) return;
        toastError(e, "Failed to load filters");
        setExamListDetails([]);
        setCourseId("");
      } finally {
        if (!cancelled) setLoadingFilters(false);
      }
    }
    void loadBase();
    return () => {
      cancelled = true;
    };
  }, [employeeId]);

  useEffect(() => {
    setAcademicYearId("");
    setExamId("");
    setRestRows([]);
    setSubjectRows([]);
    setCourseGroupId("");
    setCourseYearId("");
    setRegulationId("");
    setSubjectId("");
    setRows([]);
    if (!courseId || !academicYears.length) return;

    const currentAy = [...academicYears].sort(
      (a, b) => num(b.is_curr_ay) - num(a.is_curr_ay),
    )[0];
    setAcademicYearId(
      String(
        num(currentAy?.fk_academic_year_id) ||
          num(academicYears[0].fk_academic_year_id),
      ),
    );
  }, [courseId, academicYears]);

  useEffect(() => {
    setExamId("");
    setRestRows([]);
    setSubjectRows([]);
    setCourseGroupId("");
    setCourseYearId("");
    setRegulationId("");
    setSubjectId("");
    setRows([]);
    if (!academicYearId || !exams.length) return;
    setExamId(String(num(exams[0].fk_exam_id)));
  }, [academicYearId, exams]);

  useEffect(() => {
    let cancelled = false;
    async function loadRest() {
      setRestRows([]);
      setSubjectRows([]);
      setCourseGroupId("");
      setCourseYearId("");
      setRegulationId("");
      setSubjectId("");
      setRows([]);
      if (!courseId || !academicYearId || !examId) return;

      setLoadingFilters(true);
      try {
        const list = await getVerifyExamMarksRestFilters({
          mode,
          courseId: Number(courseId),
          academicYearId: Number(academicYearId),
          examId: Number(examId),
          employeeId,
        });
        if (cancelled) return;
        const rest = Array.isArray(list) ? list : [];
        setRestRows(rest);
        const cascaded = cascadeRestFilters(rest);
        setCourseGroupId(
          cascaded.courseGroupId ? String(cascaded.courseGroupId) : "",
        );
        setCourseYearId(
          cascaded.courseYearId ? String(cascaded.courseYearId) : "",
        );
        setRegulationId(
          cascaded.regulationId ? String(cascaded.regulationId) : "",
        );
      } catch (e) {
        if (cancelled) return;
        toastError(e, "Failed to load exam filters");
        setRestRows([]);
      } finally {
        if (!cancelled) setLoadingFilters(false);
      }
    }
    void loadRest();
    return () => {
      cancelled = true;
    };
  }, [courseId, academicYearId, examId, employeeId]); // mode read at call time; Angular clear() does not re-fetch on tab change

  useEffect(() => {
    let cancelled = false;
    async function loadSubjects() {
      setSubjectRows([]);
      setSubjectId("");
      if (
        !courseId ||
        !examId ||
        !academicYearId ||
        !courseGroupId ||
        !courseYearId ||
        !regulationId
      ) {
        return;
      }

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
        if (cancelled) return;
        setSubjectRows(Array.isArray(list) ? list : []);
      } catch (e) {
        if (cancelled) return;
        toastError(e, "Failed to load subjects");
        setSubjectRows([]);
      }
    }
    void loadSubjects();
    return () => {
      cancelled = true;
    };
  }, [
    courseId,
    courseGroupId,
    courseYearId,
    examId,
    academicYearId,
    regulationId,
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
    setExamId("");
    setCourseGroupId("");
    setSubjectId("");
    clearResults();
  }

  function onBack() {
    try {
      sessionStorage.removeItem("examVerificationBack");
    } catch {
      /* ignore */
    }
    router.back();
  }

  function onModeChange(value: string) {
    setMode(value as VerifyExamMarksMode);
    clearResults();
  }

  function handleCourseGroupChange(value: string | null) {
    const gid = Number(value || 0);
    setCourseGroupId(value ?? "");
    setSubjectId("");
    clearResults();
    const cascaded = cascadeYearAndRegulation(restRows, gid);
    setCourseYearId(cascaded.courseYearId ? String(cascaded.courseYearId) : "");
    setRegulationId(cascaded.regulationId ? String(cascaded.regulationId) : "");
  }

  function handleCourseYearChange(value: string | null) {
    const yid = Number(value || 0);
    setCourseYearId(value ?? "");
    setSubjectId("");
    clearResults();
    const regulationsList = dedupeBy(
      restRows.filter(
        (r) =>
          num(r.fk_course_group_id) === Number(courseGroupId) &&
          num(r.fk_course_year_id) === yid,
      ),
      (r) => num(r.fk_regulation_id),
    ).filter((r) => num(r.fk_regulation_id) > 0);
    const nextReg = regulationsList[0]
      ? num(regulationsList[0].fk_regulation_id)
      : 0;
    setRegulationId(nextReg ? String(nextReg) : "");
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
            options={academicYears.map((ay) => ({
              value: String(num(ay.fk_academic_year_id)),
              label: txt(ay.academic_year),
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
            onChange={handleCourseGroupChange}
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
            onChange={handleCourseYearChange}
            disabled={loadingFilters || !courseGroupId}
            placeholder="Course Year"
            searchable
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
              setSubjectId("");
              clearResults();
            }}
            disabled={loadingFilters || !courseYearId}
            placeholder="Regulation"
            searchable
            clearable
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
            disabled={loadingFilters || !regulationId}
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
      showTable={rows.length > 0}
      rowData={rows}
      columnDefs={columnDefs}
      loading={loadingList}
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
