"use client";

/**
 * Verify Exam Marks — Post Examination Angular parity
 * Angular: post-examination/verify-exam-marks
 * Filters: Course * / Academic Year * / Exam * / Course Group * / Course Year * / Regulation / Subject
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { rowIndexGetter } from "@/lib/utils";
import { dedupeBy, num, txt } from "@/common/utils/data-helpers";
import { toastError, toastSuccess } from "@/lib/toast";
import { toast } from "sonner";
import { printHtmlInIframe } from "@/lib/print";
import { DEFAULT_COLLEGE_LOGO } from "@/hooks/useCollegeLogo";
import {
  isDefaultLogoUrl,
  logoToDataUrl,
  toPrintLogoUrl,
} from "@/app/(pages)/(protected)/reports/admin-attendance-reports/_lib/attendance-report-print";
import {
  buildHtmlTable,
  exportHtmlTableAsExcel,
} from "../../_lib/export-html-table";
import {
  getCollegeById,
  getPostExamVerifyMarksBaseFilters,
  getPostExamVerifyMarksReport,
  getPostExamVerifyMarksRestFilters,
  getPostExamVerifyMarksSubjects,
  type VerifyExamMarksMode,
} from "@/services";

type AnyRow = Record<string, unknown>;

const toastInfo = (msg: string) => toast.info(msg);

const TOOLBAR = {
  search: true,
  searchPlaceholder: "Search...",
  columnPicker: true,
  exportPdf: false,
  exportExcel: false,
} as const;

const PANEL_TITLE: Record<VerifyExamMarksMode, string> = {
  internal: "Internal Marks Status",
  external: "External Marks Status",
  evaluation: "External Evalaution Status",
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

function formatExamTooltip(exam: AnyRow): string {
  const name = txt(exam.exam_name);
  const from = formatExamDate(exam.from_date);
  const to = formatExamDate(exam.to_date);
  if (from && to) return `${name} (${from} - ${to})`;
  return name;
}

function formatExamLabel(exam: AnyRow): string {
  const name = txt(exam.exam_name);
  const from = formatExamDate(exam.from_date);
  const to = formatExamDate(exam.to_date);
  const range = from && to ? ` (${from} - ${to})` : "";
  return `${name}${range}`;
}

function examLabelNode(exam: AnyRow) {
  const tags: string[] = [];
  if (exam.is_internal_exam) tags.push("Internal");
  if (exam.is_regular_exam) tags.push("Regular");
  if (exam.is_supply_exam) tags.push("Supple");
  return (
    <span className="block truncate">
      {formatExamLabel(exam)}
      {tags.map((t) => (
        <span key={t} className="font-medium text-[#0014ff]">
          ({t})
        </span>
      ))}
    </span>
  );
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

/** Angular getColleges(): selected college logo, else default_logo.png. */
async function resolveVerifyMarksPrintLogo(
  collegeId: number,
): Promise<{ logoSrc: string; collegeName: string }> {
  let collegeName = "";
  if (collegeId > 0) {
    try {
      const college = await getCollegeById(collegeId);
      collegeName = String(college?.collegeName ?? "").trim();
      const raw = college?.logo ? String(college.logo).trim() : "";
      if (raw) {
        const url = toPrintLogoUrl(raw);
        if (!isDefaultLogoUrl(url)) {
          return { logoSrc: await logoToDataUrl(url), collegeName };
        }
      }
    } catch {
      /* fall through */
    }
  }
  return {
    logoSrc: await logoToDataUrl(toPrintLogoUrl(DEFAULT_COLLEGE_LOGO)),
    collegeName,
  };
}

function printReport(args: {
  panelTitle: string;
  subtitle: string;
  collegeName: string;
  logoSrc: string;
  fallbackLogo: string;
  columns: { key: string; header: string }[];
  rows: Record<string, unknown>[];
}) {
  const {
    panelTitle,
    subtitle,
    collegeName,
    logoSrc,
    fallbackLogo,
    columns,
    rows,
  } = args;
  if (!rows.length || !columns.length) return;

  const orgCode = (
    globalThis?.localStorage?.getItem("orgCode") ?? ""
  ).toUpperCase();

  const head = columns.map((c) => `<th>${escapeHtml(c.header)}</th>`).join("");
  const body = rows
    .map(
      (row) =>
        `<tr>${columns
          .map((c) => `<td>${escapeHtml(String(row[c.key] ?? ""))}</td>`)
          .join("")}</tr>`,
    )
    .join("");

  const logoImg = `<img src="${escapeHtml(logoSrc)}" alt=""
    onerror="this.onerror=null;this.src='${escapeHtml(fallbackLogo)}'" `;

  const header =
    orgCode === "SUK"
      ? `<div class="suk-logo-row">
  ${logoImg} class="suk-logo" />
</div>
<div>
  <p class="collegeName suk">${escapeHtml(collegeName)}</p>
  <p class="title suk">${escapeHtml(subtitle)}</p>
  <p class="title-2 suk">${escapeHtml(panelTitle)}</p>
</div>`
      : `<div class="banner-row">
  <div class="logo-col">
    ${logoImg} class="portraitLogo" />
  </div>
  <div class="banner-text">
    <p class="collegeName">${escapeHtml(collegeName)}</p>
    <p class="title">${escapeHtml(subtitle)}</p>
    <p class="title-2">${escapeHtml(panelTitle)}</p>
  </div>
</div>`;

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(panelTitle)}</title>
<style>
@page { size: A4 landscape; }
html, body { margin: 0; padding: 0; color: #000; background: #fff; }
.banner-row { display: flex; flex-direction: row; align-items: flex-start; width: 100%; }
.logo-col { width: 15%; flex-shrink: 0; }
.banner-text { width: 85%; }
.portraitLogo { width: 80%; height: auto; max-height: 90px; object-fit: contain; }
.suk-logo-row { width: 100%; text-align: center; }
.suk-logo { width: 100%; max-width: 1200px; height: auto; object-fit: contain; }
.collegeName, .title, .title-2 {
  text-align: left;
  color: #000;
  margin: 2px 0;
}
.collegeName.suk, .title.suk, .title-2.suk { text-align: center; }
.collegeName { font-size: 20px; font-weight: 550; }
.title, .title-2 { font-size: 16px; font-weight: 500; }
table { width: 100%; border-collapse: collapse !important; margin-top: 8px; }
th, td { border: 1px solid #000 !important; padding: 6px; font-size: 11px; }
th { background-color: #f2f2f2; }
</style></head>
<body>
${header}
<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
</body></html>`;

  printHtmlInIframe(html);
}

export default function PostExamVerifyExamMarksPage() {
  const router = useRouter();
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [mode, setMode] = useState<VerifyExamMarksMode>("internal");
  const modeRef = useRef<VerifyExamMarksMode>("internal");

  const [baseRows, setBaseRows] = useState<AnyRow[]>([]);
  const [academicYears, setAcademicYears] = useState<AnyRow[]>([]);
  const [exams, setExams] = useState<AnyRow[]>([]);
  const restRowsRef = useRef<AnyRow[]>([]);
  const [courseGroups, setCourseGroups] = useState<AnyRow[]>([]);
  const [courseYears, setCourseYears] = useState<AnyRow[]>([]);
  const [regulations, setRegulations] = useState<AnyRow[]>([]);
  const [subjects, setSubjects] = useState<AnyRow[]>([]);
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

  const courseCode = useMemo(() => {
    const row = courses.find((c) => num(c.fk_course_id) === Number(courseId));
    return txt(row?.course_code);
  }, [courses, courseId]);

  const examName = useMemo(() => {
    const row = exams.find((e) => num(e.fk_exam_id) === Number(examId));
    return txt(row?.exam_name);
  }, [exams, examId]);

  const groupCode = useMemo(() => {
    if (!courseGroupId) return "";
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

  function clearResults() {
    setRows([]);
  }

  const selectedRegulation = useCallback(
    async (
      nextRegulationId: string,
      ctx: {
        courseId: string;
        academicYearId: string;
        examId: string;
        courseGroupId: string;
        courseYearId: string;
      },
    ) => {
      setRegulationId(nextRegulationId);
      setSubjectId("");
      setSubjects([]);
      clearResults();
      if (
        !nextRegulationId ||
        !ctx.courseId ||
        !ctx.academicYearId ||
        !ctx.examId
      ) {
        return;
      }
      setLoadingFilters(true);
      try {
        const list = await getPostExamVerifyMarksSubjects({
          mode: modeRef.current,
          courseId: Number(ctx.courseId),
          academicYearId: Number(ctx.academicYearId),
          examId: Number(ctx.examId),
          courseGroupId: Number(ctx.courseGroupId || 0),
          courseYearId: Number(ctx.courseYearId || 0),
          regulationId: Number(nextRegulationId),
          employeeId,
        });
        setSubjects(dedupeBy(list, (r) => num(r.fk_subject_id)));
      } catch (e) {
        toastError(e, "Failed to load subjects");
        setSubjects([]);
      } finally {
        setLoadingFilters(false);
      }
    },
    [employeeId],
  );

  const selectedYear = useCallback(
    async (
      nextYearId: string,
      ctx: {
        courseId: string;
        academicYearId: string;
        examId: string;
        courseGroupId: string;
      },
    ) => {
      setCourseYearId(nextYearId);
      setRegulationId("");
      setSubjectId("");
      setRegulations([]);
      setSubjects([]);
      clearResults();

      const regs = dedupeBy(
        restRowsRef.current.filter(
          (x) =>
            num(x.fk_course_group_id) === Number(ctx.courseGroupId) &&
            num(x.fk_course_year_id) === Number(nextYearId),
        ),
        (r) => num(r.fk_regulation_id),
      );
      setRegulations(regs);
      if (regs.length > 0) {
        const firstReg = String(num(regs[0].fk_regulation_id));
        await selectedRegulation(firstReg, {
          ...ctx,
          courseYearId: nextYearId,
        });
      }
    },
    [selectedRegulation],
  );

  const selectedGroup = useCallback(
    async (
      nextGroupId: string,
      ctx: { courseId: string; academicYearId: string; examId: string },
    ) => {
      setCourseGroupId(nextGroupId);
      setCourseYearId("");
      setRegulationId("");
      setSubjectId("");
      setCourseYears([]);
      setRegulations([]);
      setSubjects([]);
      clearResults();

      const years = dedupeBy(
        restRowsRef.current.filter(
          (x) => num(x.fk_course_group_id) === Number(nextGroupId),
        ),
        (r) => num(r.fk_course_year_id),
      );
      setCourseYears(years);
      if (years.length > 0) {
        const firstYear = String(num(years[0].fk_course_year_id));
        await selectedYear(firstYear, { ...ctx, courseGroupId: nextGroupId });
      }
    },
    [selectedYear],
  );

  const selectedExam = useCallback(
    async (
      nextExamId: string,
      ctx: { courseId: string; academicYearId: string },
    ) => {
      setExamId(nextExamId);
      setCourseGroupId("");
      setCourseYearId("");
      setRegulationId("");
      setSubjectId("");
      restRowsRef.current = [];
      setCourseGroups([]);
      setCourseYears([]);
      setRegulations([]);
      setSubjects([]);
      clearResults();
      if (!nextExamId || !ctx.courseId || !ctx.academicYearId) return;

      setLoadingFilters(true);
      try {
        const list = await getPostExamVerifyMarksRestFilters({
          mode: modeRef.current,
          courseId: Number(ctx.courseId),
          academicYearId: Number(ctx.academicYearId),
          examId: Number(nextExamId),
          employeeId,
        });
        restRowsRef.current = list;
        const groups = dedupeBy(list, (r) => num(r.fk_course_group_id));
        setCourseGroups(groups);
        if (groups.length > 0) {
          const firstGroup = String(num(groups[0].fk_course_group_id));
          await selectedGroup(firstGroup, { ...ctx, examId: nextExamId });
        }
      } catch (e) {
        toastError(e, "Failed to load course groups");
        restRowsRef.current = [];
        setCourseGroups([]);
      } finally {
        setLoadingFilters(false);
      }
    },
    [employeeId, selectedGroup],
  );

  const selectedAcademicYear = useCallback(
    async (nextYearId: string, ctx: { courseId: string; base: AnyRow[] }) => {
      setAcademicYearId(nextYearId);
      setExamId("");
      setCourseGroupId("");
      setCourseYearId("");
      setRegulationId("");
      setSubjectId("");
      setExams([]);
      restRowsRef.current = [];
      setCourseGroups([]);
      setCourseYears([]);
      setRegulations([]);
      setSubjects([]);
      clearResults();
      if (!nextYearId || !ctx.courseId) return;

      const examList = dedupeBy(
        ctx.base.filter(
          (x) =>
            num(x.fk_course_id) === Number(ctx.courseId) &&
            num(x.fk_academic_year_id) === Number(nextYearId) &&
            !x.is_internal_exam,
        ),
        (r) => num(r.fk_exam_id),
      );
      setExams(examList);
      if (examList.length > 0) {
        const firstExam = String(num(examList[0].fk_exam_id));
        await selectedExam(firstExam, {
          courseId: ctx.courseId,
          academicYearId: nextYearId,
        });
      }
    },
    [selectedExam],
  );

  const selectedCourse = useCallback(
    async (nextCourseId: string, base: AnyRow[]) => {
      setCourseId(nextCourseId);
      setAcademicYearId("");
      setExamId("");
      setCourseGroupId("");
      setCourseYearId("");
      setRegulationId("");
      setSubjectId("");
      setAcademicYears([]);
      setExams([]);
      restRowsRef.current = [];
      setCourseGroups([]);
      setCourseYears([]);
      setRegulations([]);
      setSubjects([]);
      clearResults();
      if (!nextCourseId) return;

      const years = dedupeBy(
        base.filter((x) => num(x.fk_course_id) === Number(nextCourseId)),
        (r) => num(r.fk_academic_year_id),
      );
      const currentAy = [...years].sort(
        (a, b) => num(b.is_curr_ay) - num(a.is_curr_ay),
      )[0];
      const sortedYears = [...years].sort(
        (a, b) =>
          parseInt(txt(b.academic_year), 10) -
          parseInt(txt(a.academic_year), 10),
      );
      setAcademicYears(sortedYears);
      if (currentAy) {
        await selectedAcademicYear(String(num(currentAy.fk_academic_year_id)), {
          courseId: nextCourseId,
          base,
        });
      }
    },
    [selectedAcademicYear],
  );

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoadingFilters(true);
      try {
        const list = await getPostExamVerifyMarksBaseFilters(employeeId);
        if (cancelled) return;
        setBaseRows(list);
        const courseList = dedupeBy(list, (r) => num(r.fk_course_id));
        if (courseList.length > 0) {
          await selectedCourse(String(num(courseList[0].fk_course_id)), list);
        }
      } catch (e) {
        if (!cancelled) toastError(e, "Failed to load filters");
      } finally {
        if (!cancelled) setLoadingFilters(false);
      }
    }
    void init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  async function onGetList() {
    if (!courseId || !academicYearId || !examId) {
      toastInfo("Please Select Valid Filters");
      return;
    }
    setLoadingList(true);
    try {
      const list = await getPostExamVerifyMarksReport({
        examId: Number(examId),
        courseId: Number(courseId),
        courseGroupId: Number(courseGroupId || 0),
        courseYearId: Number(courseYearId || 0),
        academicYearId: Number(academicYearId),
        regulationId: Number(regulationId || 0),
        subjectId: Number(subjectId || 0),
      });
      setRows(list.map((row, i) => ({ ...row, __rid: i })));
      if (!list.length) toastSuccess("No Records Found");
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
    setCourseYears([]);
    setRegulations([]);
    setSubjects([]);
    restRowsRef.current = [];
    setCourseGroups([]);
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
    const next = value as VerifyExamMarksMode;
    modeRef.current = next;
    setMode(next);
    clearResults();
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

  async function handlePrint() {
    if (!rows.length) {
      toastInfo("No data to print");
      return;
    }
    const cid = Number(globalThis?.localStorage?.getItem("collegeId") ?? 0);
    const { logoSrc, collegeName: fromCollege } =
      await resolveVerifyMarksPrintLogo(cid);
    const fallbackLogo = await logoToDataUrl(
      toPrintLogoUrl(DEFAULT_COLLEGE_LOGO),
    );
    printReport({
      panelTitle: PANEL_TITLE[mode],
      subtitle: reportSubtitle,
      collegeName:
        fromCollege ||
        globalThis?.localStorage?.getItem("collegeName") ||
        globalThis?.localStorage?.getItem("organizationName") ||
        "",
      logoSrc,
      fallbackLogo,
      columns: exportColumns,
      rows: exportDataRows(),
    });
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
      <GlobalFilterBarRow>
        <GlobalFilterField label="Course *">
          <Select
            options={courses.map((c) => ({
              value: String(num(c.fk_course_id)),
              label: txt(c.course_code),
            }))}
            value={courseId || null}
            onChange={(v) => {
              void selectedCourse(v ?? "", baseRows);
            }}
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
            onChange={(v) => {
              void selectedAcademicYear(v ?? "", {
                courseId,
                base: baseRows,
              });
            }}
            disabled={loadingFilters || !courseId}
            placeholder="Academic Year"
          />
        </GlobalFilterField>
        <GlobalFilterField label="Exam *" className="min-w-[280px] flex-[2]">
          <Select
            options={exams.map((e) => ({
              value: String(num(e.fk_exam_id)),
              label: formatExamLabel(e),
              labelNode: examLabelNode(e),
              title: formatExamTooltip(e),
            }))}
            value={examId || null}
            onChange={(v) => {
              void selectedExam(v ?? "", { courseId, academicYearId });
            }}
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
              void selectedGroup(v ?? "", {
                courseId,
                academicYearId,
                examId,
              });
            }}
            disabled={loadingFilters || !examId}
            placeholder="Course Group"
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
              void selectedYear(v ?? "", {
                courseId,
                academicYearId,
                examId,
                courseGroupId,
              });
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
              void selectedRegulation(v ?? "", {
                courseId,
                academicYearId,
                examId,
                courseGroupId,
                courseYearId,
              });
            }}
            disabled={loadingFilters || !courseYearId}
            placeholder="Regulation"
          />
        </GlobalFilterField>
        <GlobalFilterField label="Subject" className="min-w-[220px] flex-[2]">
          <Select
            options={subjects.map((s) => ({
              value: String(num(s.fk_subject_id)),
              label: `${txt(s.subject_name)} - ${txt(s.subject_code)}`,
              title: `${txt(s.subject_name)}(${txt(s.subject_code)})`,
            }))}
            value={subjectId || null}
            onChange={(v) => {
              setSubjectId(v ?? "");
              clearResults();
            }}
            disabled={loadingFilters || !regulationId}
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
              onClick={onBack}
              className="h-[30px] min-w-20 px-3 text-[12px] !border-0 !bg-[#ffcf46] !text-black shadow-sm hover:!bg-[#e5b535]"
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
    </>
  );

  return (
    <FilteredListPage
      notice={
        <div className="mb-1 px-0">
          <RadioGroup
            value={mode}
            onValueChange={onModeChange}
            className="flex flex-wrap items-center gap-6"
          >
            <label className="flex items-center gap-2 text-[12px]">
              <RadioGroupItem value="internal" id="pem-internal" />
              Internal Marks Status
            </label>
            <label className="flex items-center gap-2 text-[12px]">
              <RadioGroupItem value="external" id="pem-external" />
              External Marks Status
            </label>
            <label className="flex items-center gap-2 text-[12px]">
              <RadioGroupItem value="evaluation" id="pem-evaluation" />
              External Evalaution Status
            </label>
            <label className="flex items-center gap-2 text-[12px]">
              <RadioGroupItem value="all" id="pem-all" />
              All
            </label>
          </RadioGroup>
        </div>
      }
      title={
        rows.length > 0
          ? `${PANEL_TITLE[mode]} - ${reportSubtitle}`
          : PANEL_TITLE[mode]
      }
      filterTitle={PANEL_TITLE[mode]}
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
              onClick={() => void handlePrint()}
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
