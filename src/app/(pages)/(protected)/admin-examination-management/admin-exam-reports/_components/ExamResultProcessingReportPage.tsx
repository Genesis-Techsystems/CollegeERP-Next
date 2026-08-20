"use client";

/**
 * Moderation Reports — Angular exam-moderation-reports.
 * GraceMarks Reports lives in `exam-gracemarks-reports/page.tsx` (separate).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef, ColGroupDef } from "ag-grid-community";
import { format, parseISO } from "date-fns";
import { FileSpreadsheet, Printer, RefreshCw } from "lucide-react";
import { FilteredListPage } from "@/components/layout";
import { Select, type SelectOption } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toastError } from "@/lib/toast";
import { toast } from "sonner";
import { GM_CODES } from "@/config/constants/ui";
import { rowIndexGetter } from "@/lib/utils";
import {
  getCollegeById,
  getExamResultProcessingReport,
  getGeneralDetails,
  getUnivExamFiltersRegSup,
  getUnivExamRestInRegExamStd,
  type AnyRow,
} from "@/services";
import { printHtmlInIframe } from "@/lib/print";
import { DEFAULT_COLLEGE_LOGO, useCollegeLogo } from "@/hooks/useCollegeLogo";
import {
  resolveAttendancePrintLogo as resolveReportPrintLogo,
  toPrintLogoUrl,
} from "@/app/(pages)/(protected)/reports/admin-attendance-reports/_lib/attendance-report-print";

const REPORT_TITLE = "Moderation Report";

type Row = AnyRow;

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function txt(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

function dash(v: unknown): string {
  const s = txt(v);
  return !s || s === "null" ? "—" : s;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function dedupeBy<T>(rows: T[], keyFn: (r: T) => number): T[] {
  const seen = new Set<number>();
  const out: T[] = [];
  for (const r of rows) {
    const k = keyFn(r);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

function parseMaybeDate(v: unknown): string {
  const s = txt(v);
  if (!s) return "";
  try {
    if (/^\d{4}-\d{2}-\d{2}/.test(s))
      return format(parseISO(s.slice(0, 10)), "dd MMM, yyyy");
    return format(new Date(s), "dd MMM, yyyy");
  } catch {
    return s;
  }
}

function examMasterLabel(r: Row): string {
  const name = txt(r.exam_name ?? r.examName) || "Exam";
  const from = parseMaybeDate(r.from_date ?? r.fromDate);
  const to = parseMaybeDate(r.to_date ?? r.toDate);
  const range = from && to ? ` (${from} - ${to})` : "";
  const tags: string[] = [];
  if (r.is_internal_exam || r.isInternalExam) tags.push("(Internal)");
  if (r.is_regular_exam || r.isRegularExam) tags.push("(Regular)");
  if (r.is_supply_exam || r.isSupplyExam) tags.push("(Supple)");
  return `${name}${range}${tags.length ? ` ${tags.join("")}` : ""}`;
}

function exportHtmlTable(filename: string, bodyHtml: string) {
  const template = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Worksheet</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table>${bodyHtml}</table></body></html>`;
  const link = document.createElement("a");
  link.download = filename;
  link.href = `data:application/vnd.ms-excel;base64,${window.btoa(unescape(encodeURIComponent(template)))}`;
  link.click();
}

function schemeValue(r: Row): string {
  return dash(r.academic_year ?? r.regulation_code ?? r.scheme);
}

function above55MarksBefore(r: Row): string {
  return dash(
    r.Count_of_above_55_percent ?? r.Above_55_marks ?? r.above_55_marks_before,
  );
}

function above55PercentBefore(r: Row): string {
  return dash(
    r.Percent_of_above_55_percent ??
      r.Above_55_percent ??
      r.above_55_percent_before,
  );
}

function above55MarksAfter(r: Row): string {
  return dash(
    r.Count_of_above_55_percent_after_moderation ??
      r.Above_55_marks_after ??
      r.above_55_marks_after,
  );
}

function above55PercentAfter(r: Row): string {
  return dash(
    r.Percent_of_above_55_percent_after_moderation ??
      r.Above_55_percent_after ??
      r.above_55_percent_after,
  );
}

function printModerationReport(args: {
  collegeName: string;
  collegeLogo: string;
  fallbackLogo: string;
  examName: string;
  courseGroupCode: string;
  courseYearCode: string;
  rows: Row[];
}): void {
  const bodyRows = args.rows
    .map(
      (r, i) =>
        `<tr>
        <td class="table-td" style="text-align:center">${i + 1}</td>
        <td class="table-td" style="text-align:left">${escapeHtml(dash(r.subject_name ?? r.subject))}</td>
        <td class="table-td" style="text-align:left">${escapeHtml(schemeValue(r))}</td>
        <td class="table-td" style="text-align:center">${escapeHtml(dash(r.ext_maxmarks ?? r.subject_maximum))}</td>
        <td class="table-td" style="text-align:center">${escapeHtml(dash(r.Appeared ?? r.appeared))}</td>
        <td class="table-td" style="text-align:center">${escapeHtml(dash(r.passed ?? r.before_passed))}</td>
        <td class="table-td" style="text-align:center">${escapeHtml(dash(r.Passed_percent ?? r.before_pass_percent))}</td>
        <td class="table-td" style="text-align:center">${escapeHtml(above55MarksBefore(r))}</td>
        <td class="table-td" style="text-align:center">${escapeHtml(above55PercentBefore(r))}</td>
        <td class="table-td" style="text-align:center">${escapeHtml(dash(r.Passed_after_moderation ?? r.after_passed))}</td>
        <td class="table-td" style="text-align:center">${escapeHtml(dash(r.Passed_after_moderation_percent ?? r.after_pass_percent))}</td>
        <td class="table-td" style="text-align:center">${escapeHtml(above55MarksAfter(r))}</td>
        <td class="table-td" style="text-align:center">${escapeHtml(above55PercentAfter(r))}</td>
        <td class="table-td" style="text-align:center">${escapeHtml(dash(r.Moderation_marks_awarded ?? r.moderation_marks))}</td>
      </tr>`,
    )
    .join("");

  const courseMeta = args.courseGroupCode
    ? `<p style="text-align:left;width:50%;margin:0;">Course : ${escapeHtml(args.courseGroupCode)}</p>`
    : "";
  const semesterMeta = args.courseYearCode
    ? `<p style="text-align:right;width:50%;margin:0;">Semester : ${escapeHtml(args.courseYearCode)}</p>`
    : "";

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(REPORT_TITLE)}</title><style>
@page { size: A4 portrait; margin: 10mm; }
* { box-sizing: border-box; }
body {
  font-family: Arial, Helvetica, sans-serif;
  color: #000; margin: 0; padding: 8px 12px;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.header-row { display: flex; align-items: flex-start; width: 100%; margin-bottom: 4px; }
.logo-col { width: 12%; flex: 0 0 12%; padding-right: 8px; }
.logo-col img { max-width: 100%; width: 90px; height: auto; display: block; object-fit: contain; }
.title-col { width: 88%; flex: 1 1 88%; text-align: center; }
.collegeName { text-align: center; font-size: 22px; font-weight: 550; margin: 16px 0 0; color: #000; }
.title { text-align: center; font-size: 20px; font-weight: 550; margin: 2px 0 4px; color: #000; }
.details { text-align: center; font-size: 16px; margin: 0 0 4px; color: #000; }
.meta { display: flex; justify-content: space-between; width: 100%; margin: 4px 0 8px; font-size: 14px; color: #000; }
table.mar { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
th.table-th, td.table-td { border: 1px solid #333; padding: 6px 5px; vertical-align: top; word-break: break-word; }
th.table-th { background: #c3d9ff; font-weight: 550; text-align: center; }
tr { break-inside: avoid; page-break-inside: avoid; }
thead { display: table-header-group; }
.instructtable { width: 100%; margin-top: 8px; font-size: 12px; }
.instructtable strong { color: #0014ff; }
.instructtable ol { margin: 4px 0 0; padding-left: 20px; }
</style></head><body>
  <div class="header-row">
    <div class="logo-col">
      <img src="${escapeHtml(args.collegeLogo)}" alt="College Logo"
        onerror="this.onerror=null;this.src='${escapeHtml(args.fallbackLogo)}'" />
    </div>
    <div class="title-col">
      ${args.collegeName ? `<p class="collegeName">${escapeHtml(args.collegeName)}</p>` : ""}
      <p class="title">${escapeHtml(REPORT_TITLE)}</p>
      ${args.examName ? `<p class="details">${escapeHtml(args.examName)}</p>` : ""}
    </div>
  </div>
  ${courseMeta || semesterMeta ? `<div class="meta">${courseMeta}${semesterMeta}</div>` : ""}
  <table class="mar">
    <thead>
      <tr>
        <th class="table-th" colspan="5"></th>
        <th class="table-th" colspan="4">Before Moderation</th>
        <th class="table-th" colspan="4">After Moderation</th>
        <th class="table-th"></th>
      </tr>
      <tr>
        <th class="table-th">S.No</th>
        <th class="table-th">Subject Name</th>
        <th class="table-th">Scheme</th>
        <th class="table-th">Subject Maximum</th>
        <th class="table-th">Appeared</th>
        <th class="table-th">Passed</th>
        <th class="table-th">Pass %Age</th>
        <th class="table-th">&gt;=55% Marks</th>
        <th class="table-th">&gt;=55 %Age</th>
        <th class="table-th">Passed</th>
        <th class="table-th">Pass %Age</th>
        <th class="table-th">&gt;=55% Marks</th>
        <th class="table-th">&gt;=55%Age</th>
        <th class="table-th">Moderation Marks</th>
      </tr>
    </thead>
    <tbody>${bodyRows}</tbody>
  </table>
  <table class="instructtable">
    <tr>
      <td colspan="100%">
        <strong>Moderation Marks :</strong>
        <ol>
          <li>If the pass in a subject is &lt; 30% then 4 is added.</li>
          <li>If the percentage of students getting 55% of marks in a subject is &lt; 70%, then 4 is added.</li>
          <li>If the both the above conditions are met then 2 moderations are added in a subject.</li>
        </ol>
      </td>
    </tr>
  </table>
</body></html>`;

  printHtmlInIframe(html);
}

const moderationCols: (ColDef<Row> | ColGroupDef<Row>)[] = [
  {
    headerName: "S.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
    cellStyle: { textAlign: "center" },
  },
  {
    headerName: "Subject Name",
    minWidth: 200,
    flex: 1,
    valueGetter: (p) => dash(p.data?.subject_name ?? p.data?.subject),
  },
  {
    headerName: "Scheme",
    minWidth: 90,
    flex: 0,
    valueGetter: (p) => schemeValue(p.data ?? {}),
  },
  {
    headerName: "Subject Maximum",
    minWidth: 120,
    flex: 0,
    valueGetter: (p) => dash(p.data?.ext_maxmarks ?? p.data?.subject_maximum),
  },
  {
    headerName: "Appeared",
    minWidth: 90,
    flex: 0,
    valueGetter: (p) => dash(p.data?.Appeared ?? p.data?.appeared),
  },
  {
    headerName: "Before Moderation",
    children: [
      {
        headerName: "Passed",
        minWidth: 90,
        flex: 0,
        valueGetter: (p) => dash(p.data?.passed ?? p.data?.before_passed),
      },
      {
        headerName: "Pass %Age",
        minWidth: 90,
        flex: 0,
        valueGetter: (p) =>
          dash(p.data?.Passed_percent ?? p.data?.before_pass_percent),
      },
      {
        headerName: ">=55% Marks",
        minWidth: 110,
        flex: 0,
        valueGetter: (p) => above55MarksBefore(p.data ?? {}),
      },
      {
        headerName: ">=55 %Age",
        minWidth: 110,
        flex: 0,
        valueGetter: (p) => above55PercentBefore(p.data ?? {}),
      },
    ],
  },
  {
    headerName: "After Moderation",
    children: [
      {
        headerName: "Passed",
        minWidth: 90,
        flex: 0,
        valueGetter: (p) =>
          dash(p.data?.Passed_after_moderation ?? p.data?.after_passed),
      },
      {
        headerName: "Pass %Age",
        minWidth: 90,
        flex: 0,
        valueGetter: (p) =>
          dash(
            p.data?.Passed_after_moderation_percent ??
              p.data?.after_pass_percent,
          ),
      },
      {
        headerName: ">=55% Marks",
        minWidth: 110,
        flex: 0,
        valueGetter: (p) => above55MarksAfter(p.data ?? {}),
      },
      {
        headerName: ">=55 %Age",
        minWidth: 110,
        flex: 0,
        valueGetter: (p) => above55PercentAfter(p.data ?? {}),
      },
    ],
  },
  {
    headerName: "Moderation Marks",
    minWidth: 120,
    flex: 0,
    valueGetter: (p) =>
      dash(p.data?.Moderation_marks_awarded ?? p.data?.moderation_marks),
  },
];

/** Moderation Reports page — used by exam-moderation-reports route. */
export function ExamResultProcessingReportPage() {
  return <ModerationReportsPage />;
}

function ModerationReportsPage() {
  const [loading, setLoading] = useState(false);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [employeeId, setEmployeeId] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [baseRows, setBaseRows] = useState<Row[]>([]);
  const [restRows, setRestRows] = useState<Row[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [examFeeTypes, setExamFeeTypes] = useState<Row[]>([]);
  const [courseId, setCourseId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [examId, setExamId] = useState("");
  const [examTypeId, setExamTypeId] = useState("0");
  const [collegeId, setCollegeId] = useState("");
  const [courseGroupId, setCourseGroupId] = useState("");
  const [courseYearId, setCourseYearId] = useState("");
  const [filterSummary, setFilterSummary] = useState("");

  const collegeLogo = useCollegeLogo(collegeId ? Number(collegeId) : null);

  useEffect(() => {
    setEmployeeId(Number(globalThis?.localStorage?.getItem("employeeId") ?? 0));
    try {
      setIsAdmin(
        JSON.parse(globalThis?.localStorage?.getItem("isAdmin") ?? "false") ===
          true,
      );
    } catch {
      setIsAdmin(false);
    }
  }, []);

  function clearResults() {
    setRows([]);
    setHasFetched(false);
    setFilterSummary("");
  }

  useEffect(() => {
    async function init() {
      if (!employeeId) return;
      setLoadingFilters(true);
      try {
        const filters = await getUnivExamFiltersRegSup(employeeId);
        const list = Array.isArray(filters) ? filters : [];
        const univ = list.filter(
          (r) => !txt(r.flag) || txt(r.flag) === "univ_exam_filters",
        );
        setBaseRows(univ.length ? univ : list);
        const courses = dedupeBy(univ.length ? univ : list, (r) =>
          num(r.fk_course_id),
        );
        if (courses[0]) setCourseId(String(num(courses[0].fk_course_id)));
      } catch (e) {
        toastError(e, "Failed to load filters");
      } finally {
        setLoadingFilters(false);
      }
    }
    void init();
  }, [employeeId]);

  const courses = useMemo(
    () => dedupeBy(baseRows, (r) => num(r.fk_course_id)),
    [baseRows],
  );
  const academicYears = useMemo(
    () =>
      dedupeBy(
        baseRows.filter((r) => num(r.fk_course_id) === Number(courseId)),
        (r) => num(r.fk_academic_year_id),
      ).sort(
        (a, b) =>
          Number(String(txt(b.academic_year)).split("-")[0] || 0) -
          Number(String(txt(a.academic_year)).split("-")[0] || 0),
      ),
    [baseRows, courseId],
  );
  const exams = useMemo(
    () =>
      dedupeBy(
        baseRows.filter(
          (r) =>
            num(r.fk_course_id) === Number(courseId) &&
            num(r.fk_academic_year_id) === Number(academicYearId),
        ),
        (r) => num(r.fk_exam_id),
      ),
    [baseRows, courseId, academicYearId],
  );
  const colleges = useMemo(
    () =>
      dedupeBy(restRows, (r) => num(r.fk_college_id)).sort(
        (a, b) =>
          num(a.clg_sort_order ?? a.sort_order) -
          num(b.clg_sort_order ?? b.sort_order),
      ),
    [restRows],
  );
  const courseGroups = useMemo(() => {
    const source = restRows.filter(
      (r) => !collegeId || num(r.fk_college_id) === Number(collegeId),
    );
    return dedupeBy(source, (r) => num(r.fk_course_group_id));
  }, [restRows, collegeId]);
  const courseYears = useMemo(() => {
    const source = restRows.filter(
      (r) =>
        (!collegeId || num(r.fk_college_id) === Number(collegeId)) &&
        (!courseGroupId ||
          Number(courseGroupId) === 0 ||
          num(r.fk_course_group_id) === Number(courseGroupId)),
    );
    return dedupeBy(source, (r) => num(r.fk_course_year_id)).sort(
      (a, b) =>
        num(a.year_order ?? a.cy_sort_order) -
        num(b.year_order ?? b.cy_sort_order),
    );
  }, [restRows, collegeId, courseGroupId]);

  const examTypeOptions: SelectOption[] = useMemo(
    () => [
      { value: "0", label: "All" },
      ...examFeeTypes.map((r) => ({
        value: String(num(r.generalDetailId ?? r.general_detail_id)),
        label:
          txt(r.generalDetailCode ?? r.general_detail_code) ||
          String(num(r.generalDetailId)),
      })),
    ],
    [examFeeTypes],
  );

  useEffect(() => {
    if (!courseId || !academicYears.length) return;
    if (
      !academicYears.some(
        (r) => num(r.fk_academic_year_id) === Number(academicYearId),
      )
    ) {
      setAcademicYearId(String(num(academicYears[0].fk_academic_year_id)));
    }
  }, [courseId, academicYears, academicYearId]);

  useEffect(() => {
    if (!academicYearId || !exams.length) return;
    if (!exams.some((r) => num(r.fk_exam_id) === Number(examId))) {
      setExamId(String(num(exams[0].fk_exam_id)));
    }
  }, [academicYearId, exams, examId]);

  useEffect(() => {
    async function loadRestAndTypes() {
      if (!courseId || !academicYearId || !examId || !employeeId) {
        setRestRows([]);
        setExamFeeTypes([]);
        setCollegeId("");
        setCourseGroupId("");
        setCourseYearId("");
        setExamTypeId("0");
        return;
      }
      setLoadingFilters(true);
      try {
        const [bundle, feeTypes] = await Promise.all([
          getUnivExamRestInRegExamStd({
            courseId: Number(courseId),
            examId: Number(examId),
            academicYearId: Number(academicYearId),
            employeeId,
            flagType: "REGSUP",
          }),
          getGeneralDetails(GM_CODES.EXAM_FEE_TYPE).catch(() => []),
        ]);
        setRestRows(
          Array.isArray(bundle.restFilters) ? bundle.restFilters : [],
        );
        const examRow =
          baseRows.find(
            (r) =>
              num(r.fk_course_id) === Number(courseId) &&
              num(r.fk_academic_year_id) === Number(academicYearId) &&
              num(r.fk_exam_id) === Number(examId),
          ) ?? null;
        const allowed: Row[] = [];
        for (const ft of feeTypes) {
          const code = txt(ft.generalDetailCode ?? ft.general_detail_code);
          if (examRow?.is_regular_exam && code === "Regular") allowed.push(ft);
          if (examRow?.is_supply_exam && code === "Supple") allowed.push(ft);
          if (examRow?.is_internal_exam && code === "Internal")
            allowed.push(ft);
        }
        setExamFeeTypes(allowed);
        setExamTypeId(
          allowed[0]
            ? String(
                num(allowed[0].generalDetailId ?? allowed[0].general_detail_id),
              )
            : "0",
        );
        setCollegeId("");
        setCourseGroupId("");
        setCourseYearId("");
        clearResults();
      } catch (e) {
        toastError(e, "Failed to load filters");
        setRestRows([]);
        setExamFeeTypes([]);
      } finally {
        setLoadingFilters(false);
      }
    }
    void loadRestAndTypes();
  }, [courseId, academicYearId, examId, employeeId, baseRows]);

  useEffect(() => {
    if (!colleges.length) return;
    if (!colleges.some((r) => num(r.fk_college_id) === Number(collegeId))) {
      setCollegeId(String(num(colleges[0].fk_college_id)));
    }
  }, [colleges, collegeId]);

  useEffect(() => {
    if (!courseGroups.length) return;
    if (
      Number(courseGroupId) !== 0 &&
      !courseGroups.some(
        (r) => num(r.fk_course_group_id) === Number(courseGroupId),
      )
    ) {
      setCourseGroupId(String(num(courseGroups[0].fk_course_group_id)));
      setCourseYearId("");
    } else if (!courseGroupId) {
      setCourseGroupId(String(num(courseGroups[0].fk_course_group_id)));
    }
  }, [courseGroups, courseGroupId]);

  useEffect(() => {
    if (!courseYears.length) return;
    if (
      Number(courseYearId) !== 0 &&
      !courseYears.some(
        (r) => num(r.fk_course_year_id) === Number(courseYearId),
      )
    ) {
      setCourseYearId(String(num(courseYears[0].fk_course_year_id)));
    } else if (!courseYearId) {
      setCourseYearId(String(num(courseYears[0].fk_course_year_id)));
    }
  }, [courseYears, courseYearId]);

  async function onGetReport() {
    if (!courseId || !examId || !collegeId) {
      toast.info("Please Select Valid Filters");
      return;
    }
    setLoading(true);
    setHasFetched(true);
    try {
      const list = await getExamResultProcessingReport({
        flag: "exam_analysis_by_subject",
        examId: Number(examId),
        examType: Number(examTypeId || 0),
        collegeId: Number(collegeId),
        courseId: Number(courseId),
        courseGroupId: Number(courseGroupId || 0),
        courseYearId: Number(courseYearId || 0),
      });
      const rowsList = Array.isArray(list) ? list : [];
      setRows(rowsList);
      if (!rowsList.length) {
        toast.info("No Records Found.");
        setFilterSummary("");
        return;
      }
      const college = colleges.find(
        (r) => num(r.fk_college_id) === Number(collegeId),
      );
      const course = courses.find(
        (r) => num(r.fk_course_id) === Number(courseId),
      );
      const group = courseGroups.find(
        (r) => num(r.fk_course_group_id) === Number(courseGroupId),
      );
      const year = courseYears.find(
        (r) => num(r.fk_course_year_id) === Number(courseYearId),
      );
      const exam = exams.find((r) => num(r.fk_exam_id) === Number(examId));
      setFilterSummary(
        [
          txt(college?.college_code),
          txt(course?.course_code),
          Number(courseGroupId) > 0 ? txt(group?.group_code) : "",
          Number(courseYearId) > 0 ? txt(year?.course_year_code) : "",
          exam ? examMasterLabel(exam) : "",
        ]
          .filter(Boolean)
          .join(" / "),
      );
    } catch (e) {
      toastError(e, "Failed to load report");
      setRows([]);
      setFilterSummary("");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    clearResults();
    setExamId("");
    setAcademicYearId("");
    setExamTypeId("0");
    setCollegeId("");
    setCourseGroupId("");
    setCourseYearId("");
    setRestRows([]);
    setExamFeeTypes([]);
    const c = courses[0];
    if (c) setCourseId(String(num(c.fk_course_id)));
    else setCourseId("");
  }

  function handleExportExcel() {
    if (!rows.length) return;
    const head = `<tr>
      <th colspan="5"></th>
      <th colspan="4">Before Moderation</th>
      <th colspan="4">After Moderation</th>
      <th></th>
    </tr>
    <tr>
      <th>S.No</th><th>Subject Name</th><th>Scheme</th><th>Subject Maximum</th><th>Appeared</th>
      <th>Passed</th><th>Pass %Age</th><th>&gt;=55% Marks</th><th>&gt;=55 %Age</th>
      <th>Passed</th><th>Pass %Age</th><th>&gt;=55% Marks</th><th>&gt;=55%Age</th>
      <th>Moderation Marks</th>
    </tr>`;
    const body = rows
      .map(
        (r, i) =>
          `<tr>
            <td>${i + 1}</td>
            <td>${escapeHtml(txt(r.subject_name))}</td>
            <td>${escapeHtml(schemeValue(r))}</td>
            <td>${escapeHtml(txt(r.ext_maxmarks))}</td>
            <td>${escapeHtml(txt(r.Appeared))}</td>
            <td>${escapeHtml(txt(r.passed))}</td>
            <td>${escapeHtml(txt(r.Passed_percent))}</td>
            <td>${escapeHtml(above55MarksBefore(r))}</td>
            <td>${escapeHtml(above55PercentBefore(r))}</td>
            <td>${escapeHtml(txt(r.Passed_after_moderation))}</td>
            <td>${escapeHtml(txt(r.Passed_after_moderation_percent))}</td>
            <td>${escapeHtml(above55MarksAfter(r))}</td>
            <td>${escapeHtml(above55PercentAfter(r))}</td>
            <td>${escapeHtml(txt(r.Moderation_marks_awarded))}</td>
          </tr>`,
      )
      .join("");
    exportHtmlTable("Moderation Report.xls", `${head}${body}`);
  }

  async function handlePrint() {
    if (!rows.length) {
      toast.info("No Records Found.");
      return;
    }

    const college =
      colleges.find((r) => num(r.fk_college_id) === Number(collegeId)) ?? null;
    const collegeRecord = await getCollegeById(Number(collegeId)).catch(
      () => null,
    );
    const exam = exams.find((r) => num(r.fk_exam_id) === Number(examId));
    const group = courseGroups.find(
      (r) => num(r.fk_course_group_id) === Number(courseGroupId),
    );
    const year = courseYears.find(
      (r) => num(r.fk_course_year_id) === Number(courseYearId),
    );
    const logoSrc = await resolveReportPrintLogo(
      null,
      Number(collegeId || 0),
      collegeLogo || DEFAULT_COLLEGE_LOGO,
    );

    printModerationReport({
      collegeName: txt(
        collegeRecord?.collegeName ??
          college?.college_name ??
          college?.collegeName ??
          college?.college_code,
      ),
      collegeLogo: logoSrc,
      fallbackLogo: toPrintLogoUrl(DEFAULT_COLLEGE_LOGO),
      examName: txt(exam?.exam_name ?? exam?.examName),
      courseGroupCode:
        Number(courseGroupId) > 0
          ? txt(group?.group_code ?? group?.groupCode)
          : "",
      courseYearCode:
        Number(courseYearId) > 0
          ? txt(year?.course_year_code ?? year?.courseYearCode)
          : "",
      rows,
    });
  }

  const getRowId = useCallback(
    (p: { data?: Row; node?: { rowIndex?: number | null } }) =>
      `row-${p.node?.rowIndex ?? 0}-${txt(p.data?.subject_name)}-${txt(p.data?.regulation_code)}`,
    [],
  );

  const courseGroupOptions: SelectOption[] = useMemo(() => {
    const opts = courseGroups.map((r) => ({
      value: String(num(r.fk_course_group_id)),
      label: txt(r.group_code) || String(num(r.fk_course_group_id)),
    }));
    return isAdmin ? [{ value: "0", label: "All" }, ...opts] : opts;
  }, [courseGroups, isAdmin]);

  const courseYearOptions: SelectOption[] = useMemo(() => {
    const opts = courseYears.map((r) => ({
      value: String(num(r.fk_course_year_id)),
      label: txt(r.course_year_code) || String(num(r.fk_course_year_id)),
    }));
    return isAdmin ? [{ value: "0", label: "All" }, ...opts] : opts;
  }, [courseYears, isAdmin]);

  return (
    <FilteredListPage
      title="Moderation Reports"
      tableTitle={
        hasFetched && filterSummary
          ? `Moderation Analysis - ${filterSummary}`
          : "Moderation Analysis"
      }
      resultsVisible={hasFetched}
      filters={
        <div className="space-y-2">
          <div className="grid grid-cols-1 items-end gap-2 md:grid-cols-12">
            <div className="space-y-1 md:col-span-2">
              <Label>Course *</Label>
              <Select
                value={courseId || null}
                onChange={(v) => {
                  setCourseId(v ?? "");
                  setAcademicYearId("");
                  setExamId("");
                  clearResults();
                }}
                options={courses.map((r) => ({
                  value: String(num(r.fk_course_id)),
                  label: txt(r.course_code) || String(num(r.fk_course_id)),
                }))}
                isLoading={loadingFilters}
                searchable
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Exam Year *</Label>
              <Select
                value={academicYearId || null}
                onChange={(v) => {
                  setAcademicYearId(v ?? "");
                  setExamId("");
                  clearResults();
                }}
                options={academicYears.map((r) => ({
                  value: String(num(r.fk_academic_year_id)),
                  label:
                    txt(r.academic_year) || String(num(r.fk_academic_year_id)),
                }))}
                disabled={!courseId}
                searchable
              />
            </div>
            <div className="space-y-1 md:col-span-5">
              <Label>Exam *</Label>
              <Select
                value={examId || null}
                onChange={(v) => {
                  setExamId(v ?? "");
                  clearResults();
                }}
                options={exams.map((r) => ({
                  value: String(num(r.fk_exam_id)),
                  label: examMasterLabel(r),
                }))}
                searchable
                wrapOptionLabels
                disabled={!academicYearId}
              />
            </div>
            <div className="space-y-1 md:col-span-3">
              <Label>Exam Type *</Label>
              <Select
                value={examTypeId}
                onChange={(v) => {
                  setExamTypeId(v ?? "0");
                  clearResults();
                }}
                options={examTypeOptions}
                disabled={!examId}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 items-end gap-2 md:grid-cols-12">
            <div className="space-y-1 md:col-span-2">
              <Label>College *</Label>
              <Select
                value={collegeId || null}
                onChange={(v) => {
                  setCollegeId(v ?? "");
                  setCourseGroupId("");
                  setCourseYearId("");
                  clearResults();
                }}
                options={colleges.map((r) => ({
                  value: String(num(r.fk_college_id)),
                  label: txt(r.college_code) || String(num(r.fk_college_id)),
                }))}
                disabled={!examId}
                searchable
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Course Group *</Label>
              <Select
                value={courseGroupId || null}
                onChange={(v) => {
                  setCourseGroupId(v ?? "");
                  setCourseYearId("");
                  clearResults();
                }}
                options={courseGroupOptions}
                disabled={!collegeId}
                searchable
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Course Year *</Label>
              <Select
                value={courseYearId || null}
                onChange={(v) => {
                  setCourseYearId(v ?? "");
                  clearResults();
                }}
                options={courseYearOptions}
                disabled={!courseGroupId && !isAdmin}
                searchable
              />
            </div>
            <div className="flex items-end gap-2 md:col-span-3">
              <Button
                type="button"
                className="h-8 text-[12px]"
                onClick={() => void onGetReport()}
                disabled={loading || loadingFilters}
              >
                {loading ? "Loading…" : "Get Report"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title="Reset"
                onClick={handleReset}
                disabled={loading || loadingFilters}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      }
      afterGrid={
        hasFetched && rows.length > 0 ? (
          <div className="px-4 pb-4 bg-white">
            <h4 className="font-semibold text-[13px] text-blue-700 mb-2">
              Moderation Marks :
            </h4>
            <ol className="list-decimal pl-5 text-[12px] text-gray-700 space-y-1">
              <li>If the pass in a subject is &lt; 30% then 4 is added.</li>
              <li>
                If the percentage of students getting 55% of marks in a subject
                is &lt; 70%, then 4 is added.
              </li>
              <li>
                If the both the above conditions are met then 2 moderations are
                added in a subject.
              </li>
            </ol>
          </div>
        ) : null
      }
      rowData={hasFetched ? rows : []}
      columnDefs={moderationCols}
      fitColumnsToWidth={false}
      loading={loading}
      pagination
      paginationPageSize={25}
      getRowId={getRowId}
      toolbar={{
        search: true,
        searchPlaceholder: "Search…",
        exportExcel: false,
        exportPdf: false,
      }}
      toolbarTrailing={
        hasFetched && rows.length > 0 ? (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              className="h-9 rounded-[5px] px-3 text-[12px]"
              onClick={handleExportExcel}
            >
              <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
              Export Excel
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-9 rounded-[5px] px-3 text-[12px]"
              onClick={() => void handlePrint()}
            >
              <Printer className="mr-1.5 h-3.5 w-3.5" />
              Print Report
            </Button>
          </div>
        ) : undefined
      }
    />
  );
}
