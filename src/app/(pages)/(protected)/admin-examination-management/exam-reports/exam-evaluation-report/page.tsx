"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
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
import { DEFAULT_COLLEGE_LOGO, useCollegeLogo } from "@/hooks/useCollegeLogo";
import { useSessionContext } from "@/context/SessionContext";
import { printHtmlInIframe } from "@/lib/print";
import {
  resolveAttendancePrintLogo,
  toPrintLogoUrl,
} from "@/app/(pages)/(protected)/reports/admin-attendance-reports/_lib/attendance-report-print";
import {
  buildHtmlTable,
  exportHtmlTableAsExcel,
} from "../../_lib/export-html-table";
import {
  getEvalReportBaseFilters,
  getEvalReportEvaluators,
  getEvalReportSubjectRows,
  getExamEvaluationDetailReport,
  listActiveCollegesForGeneralSettings,
  type AnyRow,
} from "@/services";
import { useRouter } from "next/navigation";

const toastInfo = (msg: string) => toast.info(msg);

const TOOLBAR = {
  search: true,
  searchPlaceholder: "Search...",
  columnPicker: false,
  exportPdf: false,
  exportExcel: false,
  columnFilters: false,
} as const;

/**
 * Angular: `<span style="color: blue;font-weight: 600;">…</span>`
 * Must be a renderer — `.ag-cell-value { color: #000 }` overrides cellStyle.
 */
function blueNumRenderer(p: ICellRendererParams<AnyRow>) {
  const value = p.value ?? "";
  return (
    <span style={{ color: "blue", fontWeight: 600 }}>{String(value)}</span>
  );
}

const BLUE_NUM_COL = {
  cellRenderer: blueNumRenderer,
  cellStyle: { textAlign: "center" } as const,
};

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

/** Angular printPage() — portrait report with logo + compact table. */
function buildEvaluationPrintHtml(
  rows: AnyRow[],
  logoSrc: string,
  fallbackLogo: string,
): string {
  const rowHtml = rows
    .map((row, i) => {
      const assigned = num(row.evaluator_subject_evaluation_cnt);
      const done = num(row.evaluator_subject_evaluation_completed_cnt);
      const due = assigned - done;

      return `<tr>
        <td class="text-center">${i + 1}</td>
        <td class="text-center">${escapeHtml(txt(row.course_year_code))}</td>
        <td>${escapeHtml(txt(row.subject_code))}</td>
        <td>${escapeHtml(txt(row.subject_name))}</td>
        <td class="num">${num(row.total_uploaded)}</td>
        <td class="num">${num(row.total_evaluation_assgn_cnt)}</td>
        <td class="num">${num(row.total_unassigned)}</td>
        <td class="num">${num(row.total_subject_evaluation_completed_cnt)}</td>
        <td>${escapeHtml(txt(row.evaluator_type))}</td>
        <td>${escapeHtml(txt(row.evaluator_name))}</td>
        <td>${escapeHtml(txt(row.email))}</td>
        <td>${escapeHtml(txt(row.mobile_number))}</td>
        <td class="num">${assigned}</td>
        <td class="num">${done}</td>
        <td class="num">${due}</td>
      </tr>`;
    })
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>Exam Evaluation Report</title>
<style>
@page { size: A4 portrait; margin: 10mm; }
* { box-sizing: border-box; }
body {
  margin: 0;
  color: #000;
  font-family: Arial, sans-serif;
  font-size: 7px;
  line-height: 1.25;
}
.report-shell {
  width: 100%;
}
.report-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.logo-wrap {
  width: 68px;
  min-width: 68px;
  text-align: center;
}
.logo {
  max-width: 60px;
  max-height: 60px;
  object-fit: contain;
}
.title-wrap {
  flex: 1;
  text-align: center;
  padding-right: 68px;
}
.collegeName {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
}
table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
th, td {
  border: 1px solid #000;
  padding: 3px 4px;
  vertical-align: middle;
  word-break: break-word;
}
th {
  background: #f2f2f2;
  font-size: 7px;
  font-weight: 700;
  text-align: center;
}
td {
  font-size: 6.8px;
}
.text-center {
  text-align: center;
}
.num {
  color: blue;
  font-weight: 600;
  text-align: center;
}
</style></head>
<body>
  <div class="report-shell">
    <div class="report-header">
      <div class="logo-wrap">
        <img src="${escapeHtml(logoSrc)}" class="logo" alt="College Logo"
          onerror="this.onerror=null;this.src='${escapeHtml(fallbackLogo)}'" />
      </div>
      <div class="title-wrap">
        <p class="collegeName">Exam Evaluation Report</p>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width: 5%;">SI.No</th>
          <th style="width: 8%;">Semester</th>
          <th style="width: 9%;">Subject Code</th>
          <th style="width: 15%;">Subject Name</th>
          <th style="width: 7%;">Total Papers</th>
          <th style="width: 7%;">Assigned</th>
          <th style="width: 7%;">Not Assigned</th>
          <th style="width: 7%;">Completed</th>
          <th style="width: 9%;">Evaluator Type</th>
          <th style="width: 9%;">Name</th>
          <th style="width: 11%;">Email</th>
          <th style="width: 8%;">Mobile</th>
          <th style="width: 6%;">A</th>
          <th style="width: 6%;">C</th>
          <th style="width: 6%;">Due</th>
        </tr>
      </thead>
      <tbody>${rowHtml}</tbody>
    </table>
  </div>
</body></html>`;
}

/**
 * Angular getCollegeLogo(): active College list → Logo = list[0].logo
 * Prefer session college when available, else first active college.
 */
async function printEvaluationReport(
  rows: AnyRow[],
  liveLogoUrl: string,
  sessionCollegeId: number,
): Promise<void> {
  if (!rows.length) return;

  let collegeId = sessionCollegeId > 0 ? sessionCollegeId : 0;
  let collegeRow: AnyRow | undefined;
  try {
    const list = await listActiveCollegesForGeneralSettings();
    if (collegeId > 0) {
      collegeRow = list.find((c) => Number(c.collegeId) === collegeId) as
        | AnyRow
        | undefined;
    }
    if (!collegeRow && list.length > 0) {
      // Angular: this.Logo = this.collegesLogoList[0].logo
      collegeRow = list[0] as AnyRow;
      collegeId = Number(collegeRow.collegeId) || collegeId;
    }
  } catch {
    /* resolveAttendancePrintLogo still tries getCollegeById / hook */
  }

  const logoSrc = await resolveAttendancePrintLogo(
    collegeRow ?? null,
    collegeId,
    liveLogoUrl,
  );
  const fallbackLogo = toPrintLogoUrl(DEFAULT_COLLEGE_LOGO);
  printHtmlInIframe(buildEvaluationPrintHtml(rows, logoSrc, fallbackLogo));
}

export default function ExamEvaluationReportPage() {
  const router = useRouter();
  const { user } = useSessionContext();
  const sessionCollegeId = Number(
    user?.collegeId ||
      (typeof window !== "undefined"
        ? globalThis.localStorage?.getItem("collegeId")
        : 0) ||
      0,
  );
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const collegeLogo = useCollegeLogo(
    sessionCollegeId > 0 ? sessionCollegeId : null,
  );

  const [baseRows, setBaseRows] = useState<AnyRow[]>([]);
  const [academicYears, setAcademicYears] = useState<AnyRow[]>([]);
  const [exams, setExams] = useState<AnyRow[]>([]);
  const [regulations, setRegulations] = useState<AnyRow[]>([]);
  const [subjects, setSubjects] = useState<AnyRow[]>([]);
  const [evaluators, setEvaluators] = useState<AnyRow[]>([]);
  /** Angular `regulationFilterList` — subject/regulation source after exam select. */
  const regulationFilterListRef = useRef<AnyRow[]>([]);
  const [rows, setRows] = useState<AnyRow[]>([]);

  const [courseId, setCourseId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [examId, setExamId] = useState("");
  const [regulationId, setRegulationId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [evaluatorProfileId, setEvaluatorProfileId] = useState("");
  const [isReevaluation, setIsReevaluation] = useState(false);

  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );

  const courses = useMemo(
    () => dedupeBy(baseRows, (r) => num(r.fk_course_id)),
    [baseRows],
  );

  /** Angular dateChange / selectedEvaluator — clear report grid only. */
  function clearResults() {
    setRows([]);
  }

  /**
   * Angular selectedsubject → univ_exam_subject_inep / ONL_EVAL,
   * then auto-select first evaluator when list has rows.
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
      setEvaluatorProfileId("0");
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
        const list = await getEvalReportEvaluators({
          courseId: Number(ctx.courseId),
          academicYearId: Number(ctx.academicYearId),
          examId: Number(ctx.examId),
          regulationId: Number(ctx.regulationId),
          subjectId: Number(nextSubjectId),
          employeeId,
        });
        const unique = dedupeBy(list, (r) =>
          num(r.fk_exam_evaluator_profile_id),
        );
        setEvaluators(unique);
        setEvaluatorProfileId(
          unique.length
            ? String(num(unique[0].fk_exam_evaluator_profile_id))
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
    [employeeId],
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
      setSubjectId("0");
      setEvaluatorProfileId("0");
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
   * Angular selectedExam → univ_exam_subject_regexamstd / NoLAB,
   * distinct regulations → auto first → selectedRegulation.
   */
  const selectedExam = useCallback(
    async (
      nextExamId: string,
      ctx: { courseId: string; academicYearId: string },
    ) => {
      setExamId(nextExamId);
      setRegulationId("0");
      setSubjectId("0");
      setEvaluatorProfileId("0");
      regulationFilterListRef.current = [];
      setRegulations([]);
      setSubjects([]);
      setEvaluators([]);
      clearResults();

      if (!nextExamId || !ctx.courseId || !ctx.academicYearId) return;

      setLoadingFilters(true);
      try {
        const list = await getEvalReportSubjectRows({
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
      setRegulationId("0");
      setSubjectId("0");
      setEvaluatorProfileId("0");
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
   * Angular selectedCourse — local filter academic years by course (DESC),
   * auto first year → selectedAcademicYear.
   */
  const selectedCourse = useCallback(
    async (nextCourseId: string, base: AnyRow[]) => {
      setCourseId(nextCourseId);
      setAcademicYearId("");
      setExamId("");
      setRegulationId("0");
      setSubjectId("0");
      setEvaluatorProfileId("0");
      setAcademicYears([]);
      setExams([]);
      regulationFilterListRef.current = [];
      setRegulations([]);
      setSubjects([]);
      setEvaluators([]);
      clearResults();

      if (!nextCourseId) return;

      const years = [
        ...dedupeBy(
          base.filter((x) => num(x.fk_course_id) === Number(nextCourseId)),
          (r) => num(r.fk_academic_year_id),
        ),
      ].sort(
        (a, b) =>
          parseInt(txt(b.academic_year), 10) -
          parseInt(txt(a.academic_year), 10),
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
        const list = await getEvalReportBaseFilters(employeeId);
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

  function onBack() {
    try {
      sessionStorage.removeItem("examVerificationBack");
    } catch {
      /* ignore */
    }
    // Angular goBack() → navigate to exam-verification hub
    router.push("/admin-examination-management/exam-reports/exam-verification");
  }

  async function onGetList() {
    if (
      !courseId ||
      !academicYearId ||
      !examId ||
      regulationId === "" ||
      subjectId === "" ||
      evaluatorProfileId === ""
    ) {
      toastInfo("Please Select Valid Filters");
      return;
    }
    setLoadingList(true);
    try {
      const list = await getExamEvaluationDetailReport({
        courseId: Number(courseId),
        examId: Number(examId),
        regulationId: Number(regulationId),
        subjectId: Number(subjectId),
        evaluatorProfileId: Number(evaluatorProfileId),
        isReevaluation,
      });
      setRows(list);
      if (!list.length) toastSuccess("No Records Found");
    } catch (e) {
      toastError(e, "Failed to load report");
      setRows([]);
    } finally {
      setLoadingList(false);
    }
  }

  function exportAsExcel() {
    if (!rows.length) {
      toastInfo("No data to export");
      return;
    }
    const columns = [
      { key: "si", header: "SI.No" },
      { key: "semester", header: "Semester" },
      { key: "subjectCode", header: "Subject Code" },
      { key: "subjectName", header: "Subject Name" },
      { key: "totalPapers", header: "Total Papers" },
      { key: "assigned", header: "Assigned" },
      { key: "notAssigned", header: "Not Assigned" },
      { key: "completed", header: "Completed" },
      { key: "evaluatorType", header: "Evaluator Type" },
      { key: "name", header: "Name" },
      { key: "email", header: "Email" },
      { key: "mobile", header: "Mobile" },
      { key: "evalAssigned", header: "Assigned" },
      { key: "evalCompleted", header: "Completed" },
      { key: "due", header: "Due" },
    ];
    const data = rows.map((row, i) => {
      const assigned = num(row.evaluator_subject_evaluation_cnt);
      const done = num(row.evaluator_subject_evaluation_completed_cnt);
      return {
        si: i + 1,
        semester: txt(row.course_year_code),
        subjectCode: txt(row.subject_code),
        subjectName: txt(row.subject_name),
        totalPapers: num(row.total_uploaded),
        assigned: num(row.total_evaluation_assgn_cnt),
        notAssigned: num(row.total_unassigned),
        completed: num(row.total_subject_evaluation_completed_cnt),
        evaluatorType: txt(row.evaluator_type),
        name: txt(row.evaluator_name),
        email: txt(row.email),
        mobile: txt(row.mobile_number),
        evalAssigned: assigned,
        evalCompleted: done,
        due: assigned - done,
      };
    });
    exportHtmlTableAsExcel(
      "Exam Evaluation Report",
      buildHtmlTable(columns, data),
      `<strong>${escapeHtml("Exam Evaluation Report")}</strong>`,
    );
  }

  const columnDefs = useMemo(
    (): ColDef<AnyRow>[] => [
      {
        headerName: "SI.No",
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
        headerName: "Subject Code",
        minWidth: 120,
        valueGetter: (p) => txt(p.data?.subject_code),
      },
      {
        headerName: "Subject Name",
        minWidth: 180,
        valueGetter: (p) => txt(p.data?.subject_name),
      },
      {
        headerName: "Total Papers",
        minWidth: 110,
        valueGetter: (p) => num(p.data?.total_uploaded),
        ...BLUE_NUM_COL,
      },
      {
        headerName: "Assigned",
        minWidth: 100,
        valueGetter: (p) => num(p.data?.total_evaluation_assgn_cnt),
        ...BLUE_NUM_COL,
      },
      {
        headerName: "Not Assigned",
        minWidth: 110,
        valueGetter: (p) => num(p.data?.total_unassigned),
        ...BLUE_NUM_COL,
      },
      {
        headerName: "Completed",
        minWidth: 100,
        valueGetter: (p) => num(p.data?.total_subject_evaluation_completed_cnt),
        ...BLUE_NUM_COL,
      },
      {
        headerName: "Evaluator Type",
        minWidth: 120,
        valueGetter: (p) => txt(p.data?.evaluator_type),
      },
      {
        headerName: "Name",
        minWidth: 160,
        valueGetter: (p) => txt(p.data?.evaluator_name),
      },
      {
        headerName: "Email",
        minWidth: 160,
        valueGetter: (p) => txt(p.data?.email),
      },
      {
        headerName: "Mobile",
        minWidth: 120,
        valueGetter: (p) => txt(p.data?.mobile_number),
      },
      {
        headerName: "Assigned",
        minWidth: 100,
        valueGetter: (p) => num(p.data?.evaluator_subject_evaluation_cnt),
        ...BLUE_NUM_COL,
      },
      {
        headerName: "Completed",
        minWidth: 100,
        valueGetter: (p) =>
          num(p.data?.evaluator_subject_evaluation_completed_cnt),
        ...BLUE_NUM_COL,
      },
      {
        headerName: "Due",
        minWidth: 80,
        valueGetter: (p) =>
          num(p.data?.evaluator_subject_evaluation_cnt) -
          num(p.data?.evaluator_subject_evaluation_completed_cnt),
        ...BLUE_NUM_COL,
      },
    ],
    [],
  );

  const filters = (
    <>
      <div className="inv-allot-report-filters space-y-2">
        <div className="inv-allot-report-filters__row">
          <div className="inv-allot-report-filters__fx20">
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
          </div>
          <div className="inv-allot-report-filters__fx20">
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
          </div>
          <div className="inv-allot-report-filters__fx60">
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
          </div>
        </div>

        <div className="inv-allot-report-filters__row">
          <div className="inv-allot-report-filters__fx13">
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
          </div>
          <div className="inv-allot-report-filters__fx40">
            <GlobalFilterField
              label="Subject *"
              className="min-w-[240px] flex-[2]"
            >
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
          </div>
          <div className="inv-allot-report-filters__fx20">
            <GlobalFilterField label="Evaluators">
              <Select
                options={[
                  { value: "0", label: "All" },
                  ...evaluators.map((e) => ({
                    value: String(num(e.fk_exam_evaluator_profile_id)),
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
          </div>
          <div className="inv-allot-report-filters__fx13">
            <GlobalFilterField label="">
              <div className="flex h-[30px] items-center gap-2">
                <Checkbox
                  id="evalIsReevaluation"
                  checked={isReevaluation}
                  onCheckedChange={(v) => {
                    setIsReevaluation(v === true);
                    clearResults();
                  }}
                />
                <Label
                  htmlFor="evalIsReevaluation"
                  className="text-[12px] font-normal"
                >
                  Is Re-Evaluation
                </Label>
              </div>
            </GlobalFilterField>
          </div>
          <div className="inv-allot-report-filters__fx13">
            <GlobalFilterField
              label=""
              className="global-filter-field--shrink global-filter-field--action"
            >
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={() => void onGetList()}
                  disabled={loadingList}
                  className="h-[30px] px-3 text-[12px] w-full"
                >
                  Get List
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onBack}
                  className="h-[30px] px-3 text-[12px] bg-amber-400 hover:bg-amber-500 text-black w-full"
                >
                  Back
                </Button>
              </div>
            </GlobalFilterField>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <FilteredListPage
      title="Exam Evaluation Report"
      filters={filters}
      showTable={rows.length > 0}
      rowData={rows}
      columnDefs={columnDefs}
      loading={loadingList}
      pagination
      fitColumnsToWidth={false}
      toolbar={TOOLBAR}
      toolbarTrailing={
        rows.length > 0 ? (
          <div className="flex items-center gap-2">
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
              onClick={() => {
                void printEvaluationReport(rows, collegeLogo, sessionCollegeId);
              }}
            >
              Print Report
            </Button>
          </div>
        ) : null
      }
      getRowId={(p) =>
        `${txt(p.data?.fk_exam_evaluator_profile_id)}-${txt(p.data?.fk_subject_id)}-${txt(p.data?.subject_code)}-${txt(p.data?.email)}`
      }
    />
  );
}
