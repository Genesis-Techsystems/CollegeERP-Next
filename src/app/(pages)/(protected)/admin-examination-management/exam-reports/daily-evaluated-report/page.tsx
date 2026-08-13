"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { format } from "date-fns";
import { FilteredListPage } from "@/components/layout";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { Select } from "@/common/components/select";
import { DatePicker } from "@/common/components/date-picker";
import { FormModal } from "@/common/components/feedback";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { rowIndexGetter } from "@/lib/utils";
import { dedupeBy, num, txt } from "@/common/utils/data-helpers";
import { toastError, toastSuccess } from "@/lib/toast";
import { toast } from "sonner";
import {
  buildHtmlTable,
  exportHtmlTableAsExcel,
} from "../../_lib/export-html-table";
import {
  filterStudentsForEvaluator,
  getDailyEvalBaseFilters,
  getDailyEvalEvaluators,
  getDailyEvalSubjectRows,
  getDailyEvaluatedReport,
  getDailyEvaluatedStudentList,
  listCollegesActive,
} from "@/services";
import { useRouter } from "next/navigation";
import { printHtmlInIframe } from "@/lib/print";
import { logoToDataUrl } from "@/app/(pages)/(protected)/reports/admin-attendance-reports/_lib/attendance-report-print";

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

function todayYmd(): string {
  return format(new Date(), "yyyy-MM-dd");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Angular default_logo.png when Logo == null. */
const NO_LOGO_PLACEHOLDER =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><circle cx="60" cy="60" r="58" fill="#e8e8e8" stroke="#bdbdbd" stroke-width="2"/><text x="60" y="66" text-anchor="middle" font-family="Arial,sans-serif" font-size="14" font-weight="700" fill="#757575">NO LOGO</text></svg>`,
  );

/**
 * Angular getCollegeLogo + template:
 *   this.Logo = collegesLogoList[0].logo
 *   *ngIf="Logo != null" → <img [src]="Logo">
 *   *ngIf="Logo == null" → default_logo.png (NO LOGO)
 *
 * Important: Angular uses Logo as img src **as-is** (no MinIO prefix in this
 * component). On your Angular env Logo is null → NO LOGO. React must not
 * invent/force another college logo via MinIO.
 */
async function resolveAngularPrintLogo(): Promise<string | null> {
  try {
    const colleges = await listCollegesActive();
    // Angular only reads `.logo` (not `.Logo`)
    const raw = (colleges[0] as AnyRow | undefined)?.logo;
    // Angular *ngIf="Logo == null" — null / undefined only (empty string is
    // still truthy for != null in JS, but treat blank as no logo for print).
    if (raw == null) return null;
    const src = String(raw).trim();
    if (!src) return null;

    // Angular: [src]="Logo" with no MinIO rewrite. Only use if already absolute
    // (http/https/data). Relative paths are what Angular would put in src; in a
    // print iframe they won't load — fall back to NO LOGO (same visible result
    // as your Angular print when Logo is null / not usable).
    if (!/^(https?:\/\/|data:)/i.test(src)) return null;

    return await logoToDataUrl(src);
  } catch {
    return null;
  }
}

/**
 * Angular printPage() — !bulk print block:
 * - orgCode != 'SUK': small left logo + title
 * - orgCode == 'SUK': wide logo + title (+ subject code)
 * - Logo != null → college logo; Logo == null → default_logo.png (NO LOGO)
 */
async function printDailyReport(rows: AnyRow[], subjectCode = "") {
  if (!rows.length) return;

  const collegeLogo = await resolveAngularPrintLogo();
  // Angular: Logo == null → default_logo.png
  const logoSrc = collegeLogo ?? NO_LOGO_PLACEHOLDER;

  const orgCode = (
    globalThis?.localStorage?.getItem("orgCode") ?? ""
  ).toUpperCase();

  const bodyRows = rows
    .map(
      (row, i) => `<tr>
<td>${i + 1}</td>
<td>${escapeHtml(txt(row.evaluator_name))}</td>
<td>${escapeHtml(txt(row.subject_code))}</td>
<td>${escapeHtml(txt(row.email))}</td>
<td style="text-align:center;color:blue">${num(row.no_of_students_assigned)}</td>
<td style="text-align:center;color:blue">${num(row.no_of_evaluations_completed)}</td>
</tr>`,
    )
    .join("");

  const header =
    orgCode === "SUK"
      ? `<div class="suk-header">
  <img src="${escapeHtml(logoSrc)}" alt="" class="suk-logo"
    onerror="this.onerror=null;this.src='${NO_LOGO_PLACEHOLDER}'" />
  <p class="collegeName">Daily Evaluated Report</p>
  ${subjectCode ? `<p class="title">${escapeHtml(subjectCode)}</p>` : ""}
</div>`
      : `<div class="banner-row">
  <div class="logo-col">
    <img src="${escapeHtml(logoSrc)}" alt="" class="portraitLogo"
      onerror="this.onerror=null;this.src='${NO_LOGO_PLACEHOLDER}'" />
  </div>
  <div class="banner-text">
    <p class="collegeName">Daily Evaluated Report</p>
  </div>
</div>`;

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Daily Evaluated Report</title>
<style>
@page { size: A4 portrait; margin: 12mm; }
* { box-sizing: border-box; }
body { margin: 0; padding: 0; color: #000; font: 12px/1.4 Arial, Helvetica, sans-serif; }
.banner-row { display: flex; align-items: flex-start; width: 100%; margin-bottom: 12px; }
.logo-col { width: 15%; flex-shrink: 0; }
.portraitLogo { width: 80%; height: auto; object-fit: contain; }
.banner-text { width: 85%; }
.suk-header { text-align: center; margin-bottom: 12px; }
.suk-logo { max-width: 100%; height: auto; width: 100%; object-fit: contain; margin-bottom: 8px; }
.collegeName {
  text-align: center !important;
  font-size: 20px !important;
  margin-top: 1% !important;
  margin-bottom: 10px !important;
  color: #000 !important;
  font-weight: 550 !important;
}
.title {
  text-align: center !important;
  font-size: 16px !important;
  font-weight: 500 !important;
  color: #000 !important;
}
table {
  width: 100%;
  border-collapse: collapse !important;
  page-break-inside: auto;
}
th, td {
  border: 1px solid #000 !important;
  padding: 8px;
  text-align: left;
}
th { background-color: #f2f2f2; font-weight: 600; }
tr { page-break-inside: avoid; page-break-after: auto; }
thead { display: table-header-group; }
</style></head>
<body>
${header}
<table>
  <thead>
    <tr>
      <th>SI.No</th>
      <th>Evaluator Name</th>
      <th>Course Code</th>
      <th>Evaluator Email</th>
      <th>Assigned Answer Sheets</th>
      <th>Evaluated Answer Sheets</th>
    </tr>
  </thead>
  <tbody>${bodyRows}</tbody>
</table>
</body></html>`;

  printHtmlInIframe(html);
}

/** Angular printBulk — valuator sheets from evaluatedDuplicateReport + studentsList. */
function printAnswerSheetsReport(
  reports: AnyRow[],
  students: AnyRow[],
  fromDate: string,
  toDate: string,
) {
  const pages = reports
    .filter((r) => num(r.no_of_students_assigned) > 0)
    .map((obj) => {
      const profileId = num(obj.fk_exam_evaluator_profile_id);
      const rows = students
        .filter((s) => num(s.fk_exam_evaluator_profile_id) === profileId)
        .map(
          (s) =>
            `<tr><td>${escapeHtml(txt(s.omr_serial_no))}</td><td>${escapeHtml(txt(s.evaluated_totalmarks))}</td><td></td></tr>`,
        )
        .join("");
      return `
        <div class="page">
          <p class="exam">${escapeHtml(txt(obj.exam_name))}</p>
          <table class="meta">
            <tr>
              <td>Valuator-ID : ${escapeHtml(txt(obj.user_name))}</td>
              <td>Valuator-Name : ${escapeHtml(txt(obj.evaluator_name))}</td>
              <td>Valuated: From (${escapeHtml(fromDate)}) - To (${escapeHtml(toDate)})</td>
            </tr>
            <tr>
              <td>Course Code : ${escapeHtml(txt(obj.subject_code))}</td>
              <td>Course Title : ${escapeHtml(txt(obj.subject_name))}</td>
              <td>Sem : ${escapeHtml(txt(obj.course_year_code))}</td>
            </tr>
          </table>
          <table class="data">
            <thead><tr><th>Script Code</th><th>Marks</th><th>ValType</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="sigs">
            <span>Valuator Signature</span>
            <span>Co-Ordinator Signature</span>
          </div>
        </div>`;
    })
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Answer Sheets Report</title>
<style>
@page { size: A4; margin: 12mm; }
body { font: 12px/1.4 Arial, sans-serif; color: #000; }
.page { page-break-after: always; border: 1px solid #000; padding: 10px; margin-bottom: 8px; }
.page:last-child { page-break-after: auto; }
.exam { text-align: center; font-weight: 700; font-size: 15px; }
.meta, .data { width: 100%; border-collapse: collapse; margin-top: 8px; }
.meta td { padding: 4px; border: 1px solid #000; }
.data th, .data td { border: 1px solid #000; padding: 4px; text-align: center; }
.sigs { display: flex; justify-content: space-between; margin-top: 40px; }
</style></head><body>${pages || "<p>No records</p>"}</body></html>`;

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

export default function DailyEvaluatedReportPage() {
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const router = useRouter();

  const [baseRows, setBaseRows] = useState<AnyRow[]>([]);
  const [academicYears, setAcademicYears] = useState<AnyRow[]>([]);
  const [exams, setExams] = useState<AnyRow[]>([]);
  const [regulations, setRegulations] = useState<AnyRow[]>([]);
  const [subjects, setSubjects] = useState<AnyRow[]>([]);
  const [evaluators, setEvaluators] = useState<AnyRow[]>([]);
  /** Angular `regulationFilterList` — subject/regulation source after exam select. */
  const regulationFilterListRef = useRef<AnyRow[]>([]);

  const [rows, setRows] = useState<AnyRow[]>([]);
  const [studentsList, setStudentsList] = useState<AnyRow[]>([]);

  const [courseId, setCourseId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [examId, setExamId] = useState("");
  const [regulationId, setRegulationId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [evaluatorProfileId, setEvaluatorProfileId] = useState("");
  const [fromDate, setFromDate] = useState(todayYmd);
  const [toDate, setToDate] = useState(todayYmd);
  const [isReevaluation, setIsReevaluation] = useState(false);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetTitle, setSheetTitle] = useState("");
  const [sheetRows, setSheetRows] = useState<AnyRow[]>([]);
  const [sheetSearch, setSheetSearch] = useState("");

  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );
  const organizationId = Number(
    globalThis?.localStorage?.getItem("organizationId") ?? 0,
  );

  const courses = useMemo(
    () => dedupeBy(baseRows, (r) => num(r.fk_course_id)),
    [baseRows],
  );

  /** Angular dateChange / selectedEvaluator — clear report grid only. */
  function clearResults() {
    setRows([]);
    setStudentsList([]);
  }

  /**
   * Angular selectedsubject → s_get_examevaluation_bycodes
   * (filter_univexam_evaluator_moderator → evaluator_list)
   * then auto-select first evaluator.
   */
  const selectedSubject = useCallback(
    async (
      nextSubjectId: string,
      ctx: {
        courseId: string;
        academicYearId: string;
        examId: string;
        regulationId: string;
      },
    ) => {
      setSubjectId(nextSubjectId);
      setEvaluatorProfileId("");
      setEvaluators([]);
      clearResults();

      if (
        !ctx.courseId ||
        !ctx.academicYearId ||
        !ctx.examId ||
        ctx.regulationId === "" ||
        nextSubjectId === ""
      ) {
        return;
      }

      setLoadingFilters(true);
      try {
        const list = await getDailyEvalEvaluators({
          organizationId: organizationId || 1,
          examId: Number(ctx.examId),
          courseYearId: 0,
          subjectId: Number(nextSubjectId),
          regulationId: Number(ctx.regulationId),
          courseId: Number(ctx.courseId),
          academicYearId: Number(ctx.academicYearId),
          employeeId,
        });
        const unique = dedupeBy(list, (r) =>
          num(r.pk_exam_evaluator_profile_id),
        );
        setEvaluators(unique);
        // Angular: auto-select first evaluator when list has rows
        setEvaluatorProfileId(
          unique.length
            ? String(num(unique[0].pk_exam_evaluator_profile_id))
            : "0",
        );
      } catch (e) {
        toastError(e, "Failed to load evaluators");
        setEvaluators([]);
        setEvaluatorProfileId("0");
      } finally {
        setLoadingFilters(false);
      }
    },
    [employeeId, organizationId],
  );

  /**
   * Angular selectedRegulation — local filter of regulationFilterList → subjects,
   * then auto first subject → selectedsubject.
   */
  const selectedRegulation = useCallback(
    async (
      nextRegulationId: string,
      ctx: { courseId: string; academicYearId: string; examId: string },
    ) => {
      setRegulationId(nextRegulationId);
      setSubjectId("");
      setEvaluatorProfileId("");
      setSubjects([]);
      setEvaluators([]);
      clearResults();

      const filterList = regulationFilterListRef.current;
      const detailList =
        Number(nextRegulationId) === 0
          ? filterList
          : filterList.filter(
              (x) => num(x.fk_regulation_id) === Number(nextRegulationId),
            );
      const subjectList = dedupeBy(detailList, (r) => num(r.fk_subject_id));
      setSubjects(subjectList);

      if (subjectList.length > 0) {
        const firstSubjectId = String(num(subjectList[0].fk_subject_id));
        await selectedSubject(firstSubjectId, {
          ...ctx,
          regulationId: nextRegulationId,
        });
      } else {
        setSubjectId("0");
        setEvaluatorProfileId("0");
      }
    },
    [selectedSubject],
  );

  /**
   * Angular selectedExam → API univ_exam_subject_regexamstd / NoLAB,
   * distinct regulations → auto first → selectedRegulation.
   */
  const selectedExam = useCallback(
    async (
      nextExamId: string,
      ctx: { courseId: string; academicYearId: string },
    ) => {
      setExamId(nextExamId);
      setRegulationId("");
      setSubjectId("");
      setEvaluatorProfileId("");
      regulationFilterListRef.current = [];
      setRegulations([]);
      setSubjects([]);
      setEvaluators([]);
      clearResults();

      if (!nextExamId || !ctx.courseId || !ctx.academicYearId) return;

      setLoadingFilters(true);
      try {
        const list = await getDailyEvalSubjectRows({
          courseId: Number(ctx.courseId),
          academicYearId: Number(ctx.academicYearId),
          examId: Number(nextExamId),
          employeeId,
        });
        regulationFilterListRef.current = list;
        const regs = dedupeBy(list, (r) => num(r.fk_regulation_id));
        setRegulations(regs);

        if (regs.length > 0) {
          const firstRegId = String(num(regs[0].fk_regulation_id));
          await selectedRegulation(firstRegId, {
            ...ctx,
            examId: nextExamId,
          });
        } else {
          setRegulationId("0");
          await selectedRegulation("0", { ...ctx, examId: nextExamId });
        }
      } catch (e) {
        toastError(e, "Failed to load subjects");
        regulationFilterListRef.current = [];
        setRegulations([]);
        setSubjects([]);
      } finally {
        setLoadingFilters(false);
      }
    },
    [employeeId, selectedRegulation],
  );

  /**
   * Angular selectedAcademicYear — local filter exams by course + year,
   * auto first exam → selectedExam.
   */
  const selectedAcademicYear = useCallback(
    async (nextYearId: string, ctx: { courseId: string; base: AnyRow[] }) => {
      setAcademicYearId(nextYearId);
      setExamId("");
      setRegulationId("");
      setSubjectId("");
      setEvaluatorProfileId("");
      setExams([]);
      regulationFilterListRef.current = [];
      setRegulations([]);
      setSubjects([]);
      setEvaluators([]);
      clearResults();

      if (!nextYearId || !ctx.courseId) return;

      const examList = dedupeBy(
        ctx.base.filter(
          (x) =>
            num(x.fk_course_id) === Number(ctx.courseId) &&
            num(x.fk_academic_year_id) === Number(nextYearId),
        ),
        (r) => num(r.fk_exam_id),
      );
      setExams(examList);

      if (examList.length > 0) {
        const firstExamId = String(num(examList[0].fk_exam_id));
        await selectedExam(firstExamId, {
          courseId: ctx.courseId,
          academicYearId: nextYearId,
        });
      }
    },
    [selectedExam],
  );

  /**
   * Angular selectedCourse — local filter academic years by course,
   * auto first year → selectedAcademicYear.
   */
  const selectedCourse = useCallback(
    async (nextCourseId: string, base: AnyRow[]) => {
      setCourseId(nextCourseId);
      setAcademicYearId("");
      setExamId("");
      setRegulationId("");
      setSubjectId("");
      setEvaluatorProfileId("");
      setAcademicYears([]);
      setExams([]);
      regulationFilterListRef.current = [];
      setRegulations([]);
      setSubjects([]);
      setEvaluators([]);
      clearResults();

      if (!nextCourseId) return;

      // Angular: distinct academic years in API order (no sort)
      const years = dedupeBy(
        base.filter((x) => num(x.fk_course_id) === Number(nextCourseId)),
        (r) => num(r.fk_academic_year_id),
      );
      setAcademicYears(years);

      if (years.length > 0) {
        const firstYearId = String(num(years[0].fk_academic_year_id));
        await selectedAcademicYear(firstYearId, {
          courseId: nextCourseId,
          base,
        });
      }
    },
    [selectedAcademicYear],
  );

  // Angular ngOnInit → getFiltersList → auto first course → selectedCourse
  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoadingFilters(true);
      try {
        const list = await getDailyEvalBaseFilters(employeeId);
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
    // Run once on mount (employeeId from session)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  async function onGetList() {
    if (
      !courseId ||
      !academicYearId ||
      !examId ||
      regulationId === "" ||
      subjectId === "" ||
      evaluatorProfileId === "" ||
      !fromDate ||
      !toDate
    ) {
      toastInfo("Please Select Valid Filters");
      return;
    }
    setLoadingList(true);
    setStudentsList([]);
    try {
      // Angular getList → result.data.result[0] → table; then getStudentsList
      const list = await getDailyEvaluatedReport({
        examId: Number(examId),
        subjectId: Number(subjectId),
        evaluatorProfileId: Number(evaluatorProfileId),
        fromDate,
        toDate,
        isReevaluation,
      });
      setRows(list);
      if (!list.length) {
        toastSuccess("No Records Found.");
        return;
      }

      try {
        const students = await getDailyEvaluatedStudentList({
          examId: Number(examId),
          subjectId: Number(subjectId),
          evaluatorProfileId: Number(evaluatorProfileId),
          fromDate,
          toDate,
          isReevaluation,
        });
        setStudentsList(students);
      } catch {
        // Table still shows; drill-down / Print Answer Sheets need students
        setStudentsList([]);
      }
    } catch (e) {
      toastError(e, "Failed to load report");
      setRows([]);
      setStudentsList([]);
    } finally {
      setLoadingList(false);
    }
  }

  function openSheets(row: AnyRow, mode: "assigned" | "completed") {
    const profileId = num(row.fk_exam_evaluator_profile_id);
    const filtered = filterStudentsForEvaluator(studentsList, profileId, mode);
    setSheetTitle(
      `Student Answer Sheets (${txt(row.evaluator_name)}-(${txt(row.user_name)}))`,
    );
    setSheetRows(filtered);
    setSheetSearch("");
    setSheetOpen(true);
  }

  function exportAsExcel() {
    if (!rows.length) {
      toastInfo("No data to export");
      return;
    }
    const columns = [
      { key: "si", header: "SI.No" },
      { key: "name", header: "Evaluator Name" },
      { key: "code", header: "Course Code" },
      { key: "email", header: "Evaluator Email" },
      { key: "assigned", header: "Assigned Answer Sheets" },
      { key: "evaluated", header: "Evaluated Answer Sheets" },
    ];
    const data = rows.map((row, i) => ({
      si: i + 1,
      name: txt(row.evaluator_name),
      code: txt(row.subject_code),
      email: txt(row.email),
      assigned: num(row.no_of_students_assigned),
      evaluated: num(row.no_of_evaluations_completed),
    }));
    exportHtmlTableAsExcel(
      "Daily Evaluated Report",
      buildHtmlTable(columns, data),
      "<strong>Daily Evaluated Report</strong>",
    );
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

  const filteredSheetRows = useMemo(() => {
    const q = sheetSearch.trim().toLowerCase();
    if (!q) return sheetRows;
    return sheetRows.filter(
      (r) =>
        txt(r.omr_serial_no).toLowerCase().includes(q) ||
        txt(r.evaluated_totalmarks).toLowerCase().includes(q),
    );
  }, [sheetRows, sheetSearch]);

  // Angular columns: evaluator_name, subject_code, email,
  // no_of_students_assigned, no_of_evaluations_completed
  const columnDefs = useMemo(
    (): ColDef<AnyRow>[] => [
      {
        headerName: "SI.No",
        valueGetter: rowIndexGetter,
        width: 70,
        flex: 0,
      },
      {
        headerName: "Evaluator Name",
        field: "evaluator_name",
        minWidth: 180,
        valueGetter: (p) => txt(p.data?.evaluator_name),
      },
      {
        headerName: "Course Code",
        field: "subject_code",
        minWidth: 110,
        valueGetter: (p) => txt(p.data?.subject_code),
      },
      {
        headerName: "Evaluator Email",
        field: "email",
        minWidth: 180,
        valueGetter: (p) => txt(p.data?.email),
      },
      {
        headerName: "Assigned Answer Sheets",
        field: "no_of_students_assigned",
        minWidth: 160,
        cellRenderer: (p: ICellRendererParams<AnyRow>) => {
          if (!p.data) return null;
          return (
            <button
              type="button"
              className="text-blue-700 font-semibold hover:underline"
              onClick={() => openSheets(p.data!, "assigned")}
            >
              {num(p.data.no_of_students_assigned)}
            </button>
          );
        },
      },
      {
        headerName: "Evaluated Answer Sheets",
        field: "no_of_evaluations_completed",
        minWidth: 170,
        cellRenderer: (p: ICellRendererParams<AnyRow>) => {
          if (!p.data) return null;
          return (
            <button
              type="button"
              className="text-blue-700 font-semibold hover:underline"
              onClick={() => openSheets(p.data!, "completed")}
            >
              {num(p.data.no_of_evaluations_completed)}
            </button>
          );
        },
      },
    ],
    [studentsList],
  );

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
        <GlobalFilterField label="Exam Year *">
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
            onChange={(v) => {
              void selectedExam(v ?? "", {
                courseId,
                academicYearId,
              });
            }}
            disabled={loadingFilters || !academicYearId}
            placeholder="Exam Master"
            searchable
          />
        </GlobalFilterField>
      </GlobalFilterBarRow>

      <GlobalFilterBarRow>
        <GlobalFilterField label="Regulation *">
          <Select
            options={[
              { value: "0", label: "All" },
              ...regulations.map((r) => ({
                value: String(num(r.fk_regulation_id)),
                label: txt(r.regulation_code),
              })),
            ]}
            value={regulationId || null}
            onChange={(v) => {
              void selectedRegulation(v ?? "", {
                courseId,
                academicYearId,
                examId,
              });
            }}
            disabled={loadingFilters || !examId}
            placeholder="Regulation"
          />
        </GlobalFilterField>
        <GlobalFilterField label="Subject *" className="min-w-[240px] flex-[2]">
          <Select
            options={[
              { value: "0", label: "All" },
              ...subjects.map((s) => ({
                value: String(num(s.fk_subject_id)),
                label: `${txt(s.subject_name)} (${txt(s.subject_code)})`,
              })),
            ]}
            value={subjectId || null}
            onChange={(v) => {
              void selectedSubject(v ?? "", {
                courseId,
                academicYearId,
                examId,
                regulationId,
              });
            }}
            disabled={loadingFilters || regulationId === ""}
            placeholder="Subject"
            searchable
          />
        </GlobalFilterField>
        <GlobalFilterField label="Evaluators">
          <Select
            options={[
              { value: "0", label: "All" },
              ...evaluators.map((e) => ({
                value: String(num(e.pk_exam_evaluator_profile_id)),
                label: `${txt(e.evaluator_name)} (${txt(e.user_name)})`,
              })),
            ]}
            value={evaluatorProfileId || null}
            onChange={(v) => {
              setEvaluatorProfileId(v ?? "");
              clearResults();
            }}
            disabled={loadingFilters || subjectId === ""}
            placeholder="Evaluators"
            searchable
          />
        </GlobalFilterField>
      </GlobalFilterBarRow>

      <GlobalFilterBarRow>
        <GlobalFilterField label="From Date">
          <DatePicker
            value={fromDate ? new Date(`${fromDate}T00:00:00`) : null}
            onChange={(d) => {
              setFromDate(d ? format(d, "yyyy-MM-dd") : "");
              clearResults();
            }}
            placeholder="From Date"
            displayFormat="dd/MM/yyyy"
            maxDate={new Date()}
          />
        </GlobalFilterField>
        <GlobalFilterField label="To Date">
          <DatePicker
            value={toDate ? new Date(`${toDate}T00:00:00`) : null}
            onChange={(d) => {
              setToDate(d ? format(d, "yyyy-MM-dd") : "");
              clearResults();
            }}
            placeholder="To Date"
            displayFormat="dd/MM/yyyy"
          />
        </GlobalFilterField>
        <GlobalFilterField label="Is Re-Evaluation">
          <div className="flex h-[30px] items-center gap-2">
            <Checkbox
              id="dailyIsReeval"
              checked={isReevaluation}
              onCheckedChange={(v) => {
                setIsReevaluation(v === true);
                clearResults();
              }}
            />
            <Label htmlFor="dailyIsReeval" className="text-[12px] font-normal">
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
          </div>
        </GlobalFilterField>
      </GlobalFilterBarRow>
    </>
  );

  return (
    <FilteredListPage
      title="Daily Evaluated Report"
      filters={filters}
      showTable={rows.length > 0}
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
              onClick={exportAsExcel}
            >
              Excel Export
            </Button>
            <Button
              type="button"
              className="h-[30px] px-3 text-[12px]"
              onClick={() => {
                const sub = subjects.find(
                  (s) => String(num(s.fk_subject_id)) === subjectId,
                );
                void printDailyReport(rows, txt(sub?.subject_code));
              }}
            >
              Print Report
            </Button>
            <Button
              type="button"
              className="h-[30px] px-3 text-[12px]"
              onClick={() =>
                printAnswerSheetsReport(rows, studentsList, fromDate, toDate)
              }
            >
              Print Answer Sheets
            </Button>
          </div>
        ) : null
      }
      getRowId={(p) =>
        `${txt(p.data?.fk_exam_evaluator_profile_id)}-${txt(p.data?.subject_code)}-${txt(p.data?.email)}`
      }
    >
      <FormModal
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={sheetTitle}
        onSubmit={(e) => {
          e.preventDefault();
          setSheetOpen(false);
        }}
        submitLabel="Close"
        // cancelLabel="Cancel"
        size="lg"
      >
        <div className="space-y-3">
          <Input
            placeholder="Search"
            value={sheetSearch}
            onChange={(e) => setSheetSearch(e.target.value)}
            className="h-8 text-[12px]"
          />
          <div className="max-h-[360px] overflow-auto border rounded-md">
            <table className="w-full text-[12px]">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="text-left p-2 border-b">S.No</th>
                  <th className="text-left p-2 border-b">Omr Serial No</th>
                  <th className="text-left p-2 border-b">
                    Evaluated Total Marks
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredSheetRows.map((s, i) => (
                  <tr key={`${txt(s.omr_serial_no)}-${i}`} className="border-b">
                    <td className="p-2">{i + 1}</td>
                    <td className="p-2">{txt(s.omr_serial_no)}</td>
                    <td className="p-2">{txt(s.evaluated_totalmarks)}</td>
                  </tr>
                ))}
                {!filteredSheetRows.length && (
                  <tr>
                    <td
                      colSpan={3}
                      className="p-3 text-center text-muted-foreground"
                    >
                      No records
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </FormModal>
    </FilteredListPage>
  );
}
