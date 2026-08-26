"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef, ColGroupDef } from "ag-grid-community";
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
import { printHtmlInIframe } from "@/lib/print";
import { DEFAULT_COLLEGE_LOGO } from "@/hooks/useCollegeLogo";
import {
  logoToDataUrl,
  toPrintLogoUrl,
} from "@/app/(pages)/(protected)/reports/admin-attendance-reports/_lib/attendance-report-print";
import { exportHtmlTableAsExcel } from "../../_lib/export-html-table";
import {
  getSubjectWisePassPercentBaseFilters,
  getSubjectWisePassPercentReport,
  getSubjectWisePassPercentRestFilters,
  listCollegesActive,
} from "@/services";

type AnyRow = Record<string, unknown>;

const REPORT_TITLE = "Subject Wise Result Percentage Report";

const toastInfo = (msg: string) => toast.info(msg);

const TOOLBAR = {
  search: true,
  searchPlaceholder: "Search...",
  columnPicker: true,
  exportPdf: false,
  exportExcel: false,
  columnFilters: false,
} as const;

const GROUP_HEADER = "app-table-header-group";

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

function buildDataDetails(parts: {
  courseCode: string;
  courseYearCode: string;
  examName: string;
}): string {
  let details = "";
  if (parts.courseCode) details = parts.courseCode;
  if (parts.courseYearCode) details += ` / ${parts.courseYearCode}`;
  if (parts.examName) details += ` / ${parts.examName}`;
  return details;
}

/** Angular getColleges(): first college logo for selected course's university. */
async function resolveUniversityPrintLogo(
  universityId: number,
): Promise<string> {
  if (universityId > 0) {
    try {
      const colleges = await listCollegesActive();
      const match = colleges.find(
        (c) =>
          num(c.universityId ?? c.university_id ?? c.fk_university_id) ===
          universityId,
      );
      const logo = txt(match?.logo);
      if (logo) return logoToDataUrl(toPrintLogoUrl(logo));
    } catch {
      /* fall through */
    }
  }
  return logoToDataUrl(toPrintLogoUrl(DEFAULT_COLLEGE_LOGO));
}

function buildExportTable(rows: AnyRow[]): string {
  const body = rows
    .map((row, i) => {
      const m = rowMetrics(row);
      return `<tr>
<td class="table-td" style="text-align:center">${i + 1}</td>
<td class="table-td">${escapeHtml(txt(row.course_year_code))}</td>
<td class="table-td">${escapeHtml(txt(row.subject_name))}</td>
<td class="table-td">${escapeHtml(txt(row.registered))}</td>
<td class="table-td">${escapeHtml(txt(row.Appeared))}</td>
<td class="table-td" style="text-align:center">${escapeHtml(txt(row.passed))}</td>
<td class="table-td" style="text-align:center">${escapeHtml(txt(row.Passed_percent))}</td>
<td class="table-td" style="text-align:center">${escapeHtml(txt(row.Count_of_above_55_percent))}</td>
<td class="table-td" style="text-align:center">${escapeHtml(txt(row.Percent_of_above_55_percent))}</td>
<td class="table-td" style="text-align:center">${escapeHtml(txt(row.Passed_after_moderation))}</td>
<td class="table-td" style="text-align:center">${escapeHtml(txt(row.Passed_after_moderation_percent))}</td>
<td class="table-td" style="text-align:center">${escapeHtml(txt(row.Moderation_marks_awarded))}</td>
<td class="table-td" style="text-align:center">${m.modBenefit}</td>
<td class="table-td" style="text-align:center">${escapeHtml(txt(row.Passed_after_grace))}</td>
<td class="table-td" style="text-align:center">${escapeHtml(txt(row.Passed_after_grace_percent))}</td>
<td class="table-td" style="text-align:center">${m.graceBenefit}</td>
<td class="table-td" style="text-align:center">${m.combinedBenefit}</td>
<td class="table-td" style="text-align:center">${escapeHtml(txt(row.Passed_after_grace_percent))}</td>
</tr>`;
    })
    .join("");

  return `<table border="1" cellspacing="0" cellpadding="4" class="mar">
<thead>
<tr>
<th class="table-th" colspan="5"></th>
<th class="table-th" colspan="4" style="text-align:center">Before Moderation</th>
<th class="table-th" colspan="4" style="text-align:center">After Moderation</th>
<th class="table-th" colspan="3" style="text-align:center">After Grace Marks</th>
<th class="table-th"></th><th class="table-th"></th>
</tr>
<tr>
<th class="table-th">S.No</th><th class="table-th">Semester</th><th class="table-th">Subject</th><th class="table-th">Registered</th><th class="table-th">Appeared</th>
<th class="table-th">Passed</th><th class="table-th">Pass %</th><th class="table-th">&gt;=55% Marks</th><th class="table-th">&gt;=55 %Age</th>
<th class="table-th">Passed</th><th class="table-th">Pass %</th><th class="table-th">Moderation Marks Awarded</th><th class="table-th">No.of Students Benefited</th>
<th class="table-th">Passed</th><th class="table-th">Pass %</th><th class="table-th">No.of Students Benefited</th>
<th class="table-th">No.of Students Benefited after Moderation and Grace</th><th class="table-th">Final Pass %</th>
</tr>
</thead>
<tbody>${body}</tbody>
</table>
<table class="instructtable"><tr><td colspan="100%">
<p><strong>Moderation Marks :</strong></p>
<ol>
<li>If the pass in a subject is &lt; 30% then 4 is added.</li>
<li>If the percentage of students getting 55% of marks in a subject is &lt; 70%, then 4 is added.</li>
<li>If the both the above conditions are met then 2 moderations are added in a subject.</li>
</ol>
</td></tr></table>`;
}

function buildPrintHtml(
  rows: AnyRow[],
  opts: {
    logoSrc: string;
    fallbackLogo: string;
    universityName: string;
    examName: string;
    courseYearCode: string;
    orgCode: string;
  },
): string {
  const semesterLine =
    opts.courseYearCode.trim() !== ""
      ? `<p class="semester">Semester : ${escapeHtml(opts.courseYearCode)}</p>`
      : "";

  const headerHtml =
    opts.orgCode === "SUK"
      ? `<div class="suk-header">
      <img src="${escapeHtml(opts.logoSrc)}" alt="" class="suk-logo"
        onerror="this.onerror=null;this.src='${escapeHtml(opts.fallbackLogo)}'" />
      <p class="clgname">${escapeHtml(opts.universityName)}</p>
      <p class="title">${escapeHtml(REPORT_TITLE)}</p>
      <p class="exam">${escapeHtml(opts.examName)}</p>
    </div>`
      : `<div class="banner-row">
      <div class="logo-col">
        <img src="${escapeHtml(opts.logoSrc)}" alt="" class="portraitLogo"
          onerror="this.onerror=null;this.src='${escapeHtml(opts.fallbackLogo)}'" />
      </div>
      <div class="banner-text">
        <p class="collegeName">${escapeHtml(opts.universityName)}</p>
        <p class="title">${escapeHtml(REPORT_TITLE)}</p>
        <p class="details">${escapeHtml(opts.examName)}</p>
      </div>
    </div>`;

  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(REPORT_TITLE)}</title>
<style>
@page { size: A4 portrait; margin: 10mm; }
* { box-sizing: border-box; }
body { margin: 0; padding: 0; color: #000; font-family: "Times New Roman", Times, serif; font-size: 12px; }
.banner-row { display: flex; align-items: flex-start; width: 100%; margin-bottom: 8px; }
.logo-col { width: 12%; flex-shrink: 0; text-align: center; }
.portraitLogo { width: 80%; height: auto; object-fit: contain; }
.banner-text { width: 88%; text-align: center; }
.suk-header { text-align: center; margin-bottom: 10px; }
.suk-logo { max-width: 100%; height: auto; object-fit: contain; margin-bottom: 8px; }
.collegeName { margin: 18px 0 -3px; font-size: 20px; font-weight: 550; text-align: center; font-family: Arial, sans-serif; }
.title { margin: 4px 0; font-size: 18px; font-weight: 550; text-align: center; font-family: Arial, sans-serif; }
.details, .exam { margin: 4px 0; font-size: 18px; text-align: center; font-family: Arial, sans-serif; }
.clgname { margin: 0; font-size: 30px; font-weight: 550; text-transform: capitalize; font-family: Arial, sans-serif; }
.semester { text-align: left; margin: 6px 0 8px; font-family: Arial, sans-serif; }
.mar { width: 100%; border-collapse: collapse; margin: 0; }
.table-th { padding: 8px 5px; background: #c3d9ff; font-weight: 550; border: 1px solid #000; }
.table-td { padding: 8px; border: 1px solid #000; }
.instructtable { width: 100%; margin-top: 10px; font-family: Arial, sans-serif; font-size: 11px; }
thead { display: table-header-group; }
tr { page-break-inside: avoid; }
</style></head>
<body>
${headerHtml}
${semesterLine}
${buildExportTable(rows)}
</body></html>`;
}

async function printReport(
  rows: AnyRow[],
  printMeta: {
    universityName: string;
    examName: string;
    courseYearCode: string;
    universityId: number;
  },
  orgCode: string,
) {
  if (!rows.length) return;
  const logoSrc = await resolveUniversityPrintLogo(printMeta.universityId);
  const fallbackLogo = await logoToDataUrl(
    toPrintLogoUrl(DEFAULT_COLLEGE_LOGO),
  );
  printHtmlInIframe(
    buildPrintHtml(rows, {
      logoSrc,
      fallbackLogo,
      universityName: printMeta.universityName,
      examName: printMeta.examName,
      courseYearCode: printMeta.courseYearCode,
      orgCode,
    }),
  );
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
  const [dataDetails, setDataDetails] = useState("");
  const [printMeta, setPrintMeta] = useState({
    universityName: "",
    examName: "",
    courseYearCode: "",
    universityId: 0,
  });

  const [courseId, setCourseId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [examId, setExamId] = useState("");
  const [courseYearId, setCourseYearId] = useState("0");
  const [isReevaluation, setIsReevaluation] = useState(false);

  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );
  const orgCode =
    typeof globalThis.localStorage !== "undefined"
      ? String(globalThis.localStorage.getItem("orgCode") ?? "")
      : "";

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

  function clearResults() {
    setRows([]);
    setDataDetails("");
    setPrintMeta({
      universityName: "",
      examName: "",
      courseYearCode: "",
      universityId: 0,
    });
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
      const courseRow = courses.find(
        (c) => num(c.fk_course_id) === Number(courseId),
      );
      const examRow = exams.find((e) => num(e.fk_exam_id) === Number(examId));
      const yearRow = Number(courseYearId)
        ? courseYears.find(
            (y) => num(y.fk_course_year_id) === Number(courseYearId),
          )
        : undefined;
      const courseCode = txt(courseRow?.course_code);
      const courseYearCode = yearRow ? txt(yearRow.course_year_code) : "";
      const examName = txt(examRow?.exam_name);
      const details = buildDataDetails({
        courseCode,
        courseYearCode,
        examName,
      });

      const list = await getSubjectWisePassPercentReport({
        examId: Number(examId),
        courseId: Number(courseId),
        courseYearId: Number(courseYearId) || 0,
        isReevaluation,
      });
      setRows(list.map((row, i) => ({ ...row, __rid: i })));
      if (list.length) {
        setDataDetails(details);
        setPrintMeta({
          universityName: txt(courseRow?.university_name),
          examName,
          courseYearCode,
          universityId: num(
            courseRow?.fk_university_id ?? courseRow?.university_id,
          ),
        });
        toastSuccess("Data retrieved successfully!");
      } else {
        setDataDetails("");
        toastSuccess("No Records Found.");
      }
    } catch (e) {
      toastError(e, "Failed to load report");
      clearResults();
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
    const tableHtml = buildExportTable(rows);
    exportHtmlTableAsExcel(REPORT_TITLE, tableHtml);
  }

  const handlePrintReport = useCallback(async () => {
    if (!rows.length) {
      toastInfo("No data to print");
      return;
    }
    await printReport(rows, printMeta, orgCode);
  }, [rows, printMeta, orgCode]);

  // Angular table: group row (Before Moderation / After Moderation / After Grace)
  // then leaf columns S.No … Final Pass %.
  const columnDefs = useMemo<(ColDef<AnyRow> | ColGroupDef<AnyRow>)[]>(
    () => [
      {
        headerName: "S.No",
        colId: "sno",
        valueGetter: rowIndexGetter,
        width: 70,
        minWidth: 70,
        flex: 0,
        suppressMovable: true,
      },
      {
        headerName: "Semester",
        colId: "semester",
        minWidth: 100,
        width: 100,
        flex: 0,
        valueGetter: (p) => txt(p.data?.course_year_code),
      },
      {
        headerName: "Subject",
        colId: "subject",
        minWidth: 160,
        width: 200,
        flex: 0,
        valueGetter: (p) => txt(p.data?.subject_name),
      },
      {
        headerName: "Registered",
        colId: "registered",
        minWidth: 100,
        width: 100,
        flex: 0,
        cellClass: "text-center",
        valueGetter: (p) => txt(p.data?.registered),
      },
      {
        headerName: "Appeared",
        colId: "appeared",
        minWidth: 100,
        width: 100,
        flex: 0,
        cellClass: "text-center",
        valueGetter: (p) => txt(p.data?.Appeared),
      },
      {
        headerName: "Before Moderation",
        headerClass: GROUP_HEADER,
        marryChildren: true,
        children: [
          {
            headerName: "Passed",
            colId: "bm_passed",
            minWidth: 90,
            width: 90,
            flex: 0,
            cellClass: "text-center",
            valueGetter: (p) => txt(p.data?.passed),
          },
          {
            headerName: "Pass %",
            colId: "bm_pass_pct",
            minWidth: 90,
            width: 90,
            flex: 0,
            cellClass: "text-center",
            valueGetter: (p) => txt(p.data?.Passed_percent),
          },
          {
            headerName: ">=55% Marks",
            colId: "bm_55_marks",
            minWidth: 110,
            width: 110,
            flex: 0,
            cellClass: "text-center",
            valueGetter: (p) => txt(p.data?.Count_of_above_55_percent),
          },
          {
            headerName: ">=55 %Age",
            colId: "bm_55_pct",
            minWidth: 100,
            width: 100,
            flex: 0,
            cellClass: "text-center",
            valueGetter: (p) => txt(p.data?.Percent_of_above_55_percent),
          },
        ],
      },
      {
        headerName: "After Moderation",
        headerClass: GROUP_HEADER,
        marryChildren: true,
        children: [
          {
            headerName: "Passed",
            colId: "am_passed",
            minWidth: 90,
            width: 90,
            flex: 0,
            cellClass: "text-center",
            valueGetter: (p) => txt(p.data?.Passed_after_moderation),
          },
          {
            headerName: "Pass %",
            colId: "am_pass_pct",
            minWidth: 90,
            width: 90,
            flex: 0,
            cellClass: "text-center",
            valueGetter: (p) => txt(p.data?.Passed_after_moderation_percent),
          },
          {
            headerName: "Moderation Marks Awarded",
            colId: "am_mod_marks",
            minWidth: 150,
            width: 150,
            flex: 0,
            cellClass: "text-center",
            valueGetter: (p) => txt(p.data?.Moderation_marks_awarded),
          },
          {
            headerName: "No.of Students Benefited",
            colId: "am_benefited",
            minWidth: 150,
            width: 150,
            flex: 0,
            cellClass: "text-center",
            valueGetter: (p) =>
              p.data ? String(rowMetrics(p.data).modBenefit) : "",
          },
        ],
      },
      {
        headerName: "After Grace Marks",
        headerClass: GROUP_HEADER,
        marryChildren: true,
        children: [
          {
            headerName: "Passed",
            colId: "ag_passed",
            minWidth: 90,
            width: 90,
            flex: 0,
            cellClass: "text-center",
            valueGetter: (p) => txt(p.data?.Passed_after_grace),
          },
          {
            headerName: "Pass %",
            colId: "ag_pass_pct",
            minWidth: 90,
            width: 90,
            flex: 0,
            cellClass: "text-center",
            valueGetter: (p) => txt(p.data?.Passed_after_grace_percent),
          },
          {
            headerName: "No.of Students Benefited",
            colId: "ag_benefited",
            minWidth: 150,
            width: 150,
            flex: 0,
            cellClass: "text-center",
            valueGetter: (p) =>
              p.data ? String(rowMetrics(p.data).graceBenefit) : "",
          },
        ],
      },
      {
        headerName: "No.of Students Benefited after Moderation and Grace",
        colId: "combined_benefited",
        minWidth: 220,
        width: 220,
        flex: 0,
        cellClass: "text-center",
        valueGetter: (p) =>
          p.data ? String(rowMetrics(p.data).combinedBenefit) : "",
      },
      {
        headerName: "Final Pass %",
        colId: "final_pass_pct",
        minWidth: 110,
        width: 110,
        flex: 0,
        cellClass: "text-center",
        valueGetter: (p) => txt(p.data?.Passed_after_grace_percent),
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
          </div>
          <div className="inv-allot-report-filters__fx20">
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
          </div>
          <div className="inv-allot-report-filters__fx60">
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
          </div>
        </div>
        <div className="inv-allot-report-filters__row">
          <div className="inv-allot-report-filters__fx15">
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
          </div>
          <div className="inv-allot-report-filters__fx13">
            <GlobalFilterField label="">
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
                  className="text-[16px] font-normal"
                >
                  Is Re-Evaluation
                </Label>
              </div>
            </GlobalFilterField>
          </div>
          <div className="inv-allot-report-filters__fx15">
            <GlobalFilterField
              label=""
              className="global-filter-field--shrink global-filter-field--action"
            >
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={() => void onGetReport()}
                  disabled={loadingList}
                  className="h-[30px] px-3 text-[12px] w-full"
                >
                  Get Report
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-[30px] w-[30px]"
                  title="Reset"
                  onClick={onReset}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
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
      title={
        rows.length > 0 ? `${REPORT_TITLE} — ${dataDetails}` : REPORT_TITLE
      }
      filters={filters}
      rowData={rows}
      columnDefs={columnDefs}
      loading={loadingList}
      showTable={rows.length > 0}
      pagination
      fitColumnsToWidth={false}
      autoHeight
      columnFilters={false}
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
              onClick={() => void handlePrintReport()}
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
