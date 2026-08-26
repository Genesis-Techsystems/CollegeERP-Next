"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef } from "ag-grid-community";
import { FilteredListPage } from "@/components/layout";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { Select } from "@/common/components/select";
import { Button } from "@/components/ui/button";
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
  getGenderWiseExamBaseFilters,
  getGenderWiseExamFeeTypes,
  getGenderWiseExamReport,
  getGenderWiseExamRestFilters,
} from "@/services";

type AnyRow = Record<string, unknown>;

const REPORT_TITLE = "Gender Wise Result";
const PAGE_TITLE = "Gender Wise Exam Result";

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
  { key: "si", header: "S.No" },
  { key: "subject", header: "Subject" },
  { key: "subjectType", header: "Subject Type" },
  { key: "credits", header: "Credits" },
  { key: "appeared", header: "Appeared" },
  { key: "passed", header: "Passed" },
  { key: "percentage", header: "Percentage" },
  { key: "boys", header: "Boys" },
  { key: "girls", header: "Girls" },
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
  if (flagOn(exam.is_internal_exam ?? exam.isInternalExam))
    bits.push("Internal");
  if (flagOn(exam.is_regular_exam ?? exam.isRegularExam)) bits.push("Regular");
  if (flagOn(exam.is_supply_exam ?? exam.isSupplyExam)) bits.push("Supple");
  const range = from && to ? ` (${from} - ${to})` : "";
  const tags = bits.length ? bits.map((b) => `(${b})`).join("") : "";
  return `${name}${range}${tags}`;
}

/** Angular exam flag (`is_regular_exam` / `is_supply_exam` / `is_internal_exam`). */
function flagOn(v: unknown): boolean {
  if (v === true || v === 1) return true;
  const s = String(v ?? "")
    .trim()
    .toLowerCase();
  return s === "1" || s === "true" || s === "t" || s === "y" || s === "yes";
}

function feeTypeId(row: AnyRow): number {
  return num(row.generalDetailId ?? row.general_detail_id);
}

function feeTypeCode(row: AnyRow): string {
  return txt(row.generalDetailCode ?? row.general_detail_code);
}

function toExportRows(rows: AnyRow[]): Record<string, unknown>[] {
  return rows.map((row, i) => ({
    si: i + 1,
    subject: txt(row.SUBJECT),
    subjectType: txt(row.subject_type),
    credits: txt(row.credits),
    appeared: txt(row.Appeared),
    passed: txt(row.Passed),
    percentage: txt(row.Pass_percentage),
    boys: txt(row.boys_passed),
    girls: txt(row.girls_passed),
  }));
}

function buildDataDetails(parts: {
  collegeCode: string;
  courseCode: string;
  courseGroup: string;
  courseYear: string;
  exam: string;
}): string {
  let details = "";
  if (parts.collegeCode) details = parts.collegeCode;
  if (parts.courseCode) details += ` / ${parts.courseCode}`;
  if (parts.courseGroup) details += ` / ${parts.courseGroup}`;
  if (parts.courseYear) details += ` / ${parts.courseYear}`;
  if (parts.exam) details += ` / ${parts.exam}`;
  return details;
}

/** Angular getColleges(): selected college logo + name only. */
async function resolveCollegePrintLogo(collegeId: number): Promise<string> {
  if (collegeId > 0) {
    try {
      const college = await getCollegeById(collegeId);
      const raw = college?.logo ? String(college.logo).trim() : "";
      if (raw) {
        const url = toPrintLogoUrl(raw);
        if (!isDefaultLogoUrl(url)) return logoToDataUrl(url);
      }
    } catch {
      /* fall through */
    }
  }
  return logoToDataUrl(toPrintLogoUrl(DEFAULT_COLLEGE_LOGO));
}

function buildPrintTableHtml(rows: AnyRow[]): string {
  const body = rows
    .map((row, i) => {
      return `<tr>
<td class="table-td" style="text-align:center">${i + 1}</td>
<td class="table-td">${escapeHtml(txt(row.SUBJECT))}</td>
<td class="table-td">${escapeHtml(txt(row.subject_type))}</td>
<td class="table-td">${escapeHtml(txt(row.credits))}</td>
<td class="table-td">${escapeHtml(txt(row.Appeared))}</td>
<td class="table-td" style="text-align:center">${escapeHtml(txt(row.Passed))}</td>
<td class="table-td" style="text-align:center">${escapeHtml(txt(row.Pass_percentage))}</td>
<td class="table-td" style="text-align:center">${escapeHtml(txt(row.boys_passed))}</td>
<td class="table-td" style="text-align:center">${escapeHtml(txt(row.girls_passed))}</td>
</tr>`;
    })
    .join("");

  return `<table class="mar">
<thead><tr>
<th class="table-th">S.No</th>
<th class="table-th">Subject</th>
<th class="table-th">Subject Type</th>
<th class="table-th">Credits</th>
<th class="table-th">Appeared</th>
<th class="table-th">Passed</th>
<th class="table-th">Percentage</th>
<th class="table-th">Boys</th>
<th class="table-th">Girls</th>
</tr></thead>
<tbody>${body}</tbody>
</table>`;
}

function buildPrintHtml(
  rows: AnyRow[],
  opts: {
    logoSrc: string;
    fallbackLogo: string;
    collegeName: string;
    examLabel: string;
    courseGroup: string;
    courseYear: string;
    orgCode: string;
  },
): string {
  const courseLine =
    opts.courseGroup.trim() !== ""
      ? `<p class="meta meta-left">Course : ${escapeHtml(opts.courseGroup)}</p>`
      : `<p class="meta meta-left"></p>`;
  const semesterLine =
    opts.courseYear.trim() !== ""
      ? `<p class="meta meta-right">Semester : ${escapeHtml(opts.courseYear)}</p>`
      : `<p class="meta meta-right"></p>`;

  const headerHtml =
    opts.orgCode === "SUK"
      ? `<div class="suk-header">
      <img src="${escapeHtml(opts.logoSrc)}" alt="" class="suk-logo"
        onerror="this.onerror=null;this.src='${escapeHtml(opts.fallbackLogo)}'" />
      <p class="collegeName">${escapeHtml(opts.collegeName)}</p>
      <p class="title">${escapeHtml(REPORT_TITLE)}</p>
      <p class="details">${escapeHtml(opts.examLabel)}</p>
    </div>`
      : `<div class="banner-row">
      <div class="logo-col">
        <img src="${escapeHtml(opts.logoSrc)}" alt="" class="portraitLogo"
          onerror="this.onerror=null;this.src='${escapeHtml(opts.fallbackLogo)}'" />
      </div>
      <div class="banner-text">
        <p class="collegeName">${escapeHtml(opts.collegeName)}</p>
        <p class="title">${escapeHtml(REPORT_TITLE)}</p>
        <p class="details">${escapeHtml(opts.examLabel)}</p>
      </div>
    </div>`;

  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(REPORT_TITLE)}</title>
<style>
@page { size: A4 portrait; margin: 10mm; }
* { box-sizing: border-box; }
body { margin: 0; padding: 0; color: #000; font-family: "Times New Roman", Times, serif; font-size: 12px; }
.banner-row { display: flex; align-items: flex-start; width: 100%; margin-bottom: 8px; }
.logo-col { width: 15%; flex-shrink: 0; text-align: center; }
.portraitLogo { width: 80%; height: auto; object-fit: contain; }
.banner-text { width: 85%; text-align: center; }
.suk-header { text-align: center; margin-bottom: 10px; }
.suk-logo { max-width: 100%; height: auto; object-fit: contain; margin-bottom: 8px; }
.collegeName { margin: 16px 0 -8px; font-size: 24px; font-weight: 550; text-align: center; font-family: Arial, sans-serif; }
.title { margin: 4px 0; font-size: 21px; font-weight: 550; text-align: center; font-family: Arial, sans-serif; }
.details { margin: 4px 0 8px; font-size: 19px; text-align: center; font-family: Arial, sans-serif; }
.meta-row { display: flex; width: 100%; margin: 6px 0 10px; font-family: Arial, sans-serif; font-size: 12px; }
.meta-left { width: 50%; text-align: left; margin: 0; }
.meta-right { width: 50%; text-align: right; margin: 0; }
.mar { width: 100%; border-collapse: collapse; }
.table-th { padding: 8px 5px; background: #c3d9ff; font-weight: 550; border: 1px solid #000; }
.table-td { padding: 8px; border: 1px solid #000; }
.footer-row { display: flex; margin-top: 8%; width: 100%; font-family: Arial, sans-serif; font-size: 12px; font-weight: 550; }
.footer { width: 48%; margin: 0; color: #000; }
.footer-right { text-align: right; }
thead { display: table-header-group; }
tr { page-break-inside: avoid; }
</style></head>
<body>
${headerHtml}
<div class="meta-row">${courseLine}${semesterLine}</div>
${buildPrintTableHtml(rows)}
<div class="footer-row">
  <p class="footer">Controller of Examinations</p>
  <p class="footer footer-right">Principal</p>
</div>
</body></html>`;
}

async function printReport(
  rows: AnyRow[],
  printMeta: {
    collegeId: number;
    collegeName: string;
    examLabel: string;
    courseGroup: string;
    courseYear: string;
  },
  orgCode: string,
) {
  if (!rows.length) return;
  const logoSrc = await resolveCollegePrintLogo(printMeta.collegeId);
  const fallbackLogo = await logoToDataUrl(
    toPrintLogoUrl(DEFAULT_COLLEGE_LOGO),
  );
  printHtmlInIframe(
    buildPrintHtml(rows, {
      logoSrc,
      fallbackLogo,
      collegeName: printMeta.collegeName,
      examLabel: printMeta.examLabel,
      courseGroup: printMeta.courseGroup,
      courseYear: printMeta.courseYear,
      orgCode,
    }),
  );
}

/**
 * Angular Gender Wise Exam Result (`gender-wise-exam-report`).
 */
export default function GenderWiseExamReportPage() {
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [loadingList, setLoadingList] = useState(false);

  const [baseRows, setBaseRows] = useState<AnyRow[]>([]);
  const [restRows, setRestRows] = useState<AnyRow[]>([]);
  const [allFeeTypes, setAllFeeTypes] = useState<AnyRow[]>([]);
  const [examFeeTypes, setExamFeeTypes] = useState<AnyRow[]>([]);
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [dataDetails, setDataDetails] = useState("");
  const [printMeta, setPrintMeta] = useState({
    collegeId: 0,
    collegeName: "",
    examLabel: "",
    courseGroup: "",
    courseYear: "",
  });

  const [courseId, setCourseId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [examId, setExamId] = useState("");
  const [examTypeCatdetId, setExamTypeCatdetId] = useState("0");
  const [collegeId, setCollegeId] = useState("");
  const [courseGroupId, setCourseGroupId] = useState("0");
  const [courseYearId, setCourseYearId] = useState("0");

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
  const selectedExam = useMemo(
    () => exams.find((e) => num(e.fk_exam_id) === Number(examId)),
    [exams, examId],
  );
  const colleges = useMemo(
    () => dedupeBy(restRows, (r) => num(r.fk_college_id)),
    [restRows],
  );
  const courseGroups = useMemo(() => {
    if (!collegeId) return [];
    return dedupeBy(
      restRows.filter((r) => num(r.fk_college_id) === Number(collegeId)),
      (r) => num(r.fk_course_group_id),
    );
  }, [restRows, collegeId]);
  const courseYears = useMemo(() => {
    if (!collegeId) return [];
    const groupNum = Number(courseGroupId);
    const filtered = restRows.filter((r) => {
      if (num(r.fk_college_id) !== Number(collegeId)) return false;
      if (groupNum !== 0 && num(r.fk_course_group_id) !== groupNum)
        return false;
      return true;
    });
    const list = dedupeBy(filtered, (r) => num(r.fk_course_year_id));
    return [...list].sort(
      (a, b) =>
        num(a.year_order ?? a.cy_sort_order) -
        num(b.year_order ?? b.cy_sort_order),
    );
  }, [restRows, collegeId, courseGroupId]);

  function clearResults() {
    setRows([]);
    setDataDetails("");
    setPrintMeta({
      collegeId: 0,
      collegeName: "",
      examLabel: "",
      courseGroup: "",
      courseYear: "",
    });
  }

  useEffect(() => {
    async function loadBase() {
      setLoadingFilters(true);
      try {
        const [list, feeTypes] = await Promise.all([
          getGenderWiseExamBaseFilters(employeeId),
          getGenderWiseExamFeeTypes(),
        ]);
        setBaseRows(list);
        setAllFeeTypes(feeTypes);
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
    setExamTypeCatdetId("0");
    setCollegeId("");
    setCourseGroupId("0");
    setCourseYearId("0");
    setExamFeeTypes([]);
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
    setExamTypeCatdetId("0");
    setCollegeId("");
    setCourseGroupId("0");
    setCourseYearId("0");
    setExamFeeTypes([]);
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
    setCollegeId("");
    setCourseGroupId("0");
    setCourseYearId("0");
    clearResults();
    if (!examId || !selectedExam) {
      setExamFeeTypes([]);
      setRestRows([]);
      return;
    }
    const types = allFeeTypes.filter((t) => {
      const code = String(t.generalDetailCode ?? t.general_detail_code ?? "");
      if (code === "Regular")
        return flagOn(
          selectedExam.is_regular_exam ?? selectedExam.isRegularExam,
        );
      if (code === "Supple")
        return flagOn(selectedExam.is_supply_exam ?? selectedExam.isSupplyExam);
      if (code === "Internal")
        return flagOn(
          selectedExam.is_internal_exam ?? selectedExam.isInternalExam,
        );
      return false;
    });
    setExamFeeTypes(types);
    setExamTypeCatdetId(types.length ? String(feeTypeId(types[0])) : "0");

    async function loadRest() {
      setLoadingFilters(true);
      try {
        const list = await getGenderWiseExamRestFilters({
          courseId: Number(courseId),
          academicYearId: Number(academicYearId),
          examId: Number(examId),
          employeeId,
        });
        setRestRows(list);
        const clgs = dedupeBy(list, (r) => num(r.fk_college_id));
        if (clgs.length) {
          setCollegeId(String(num(clgs[0].fk_college_id)));
        }
      } catch (e) {
        toastError(e, "Failed to load colleges");
        setRestRows([]);
      } finally {
        setLoadingFilters(false);
      }
    }
    void loadRest();
  }, [examId, selectedExam, allFeeTypes, courseId, academicYearId, employeeId]);

  useEffect(() => {
    setCourseYearId("0");
    clearResults();
    if (!collegeId) {
      setCourseGroupId("0");
      return;
    }
    const groups = dedupeBy(
      restRows.filter((r) => num(r.fk_college_id) === Number(collegeId)),
      (r) => num(r.fk_course_group_id),
    );
    setCourseGroupId(
      groups.length ? String(num(groups[0].fk_course_group_id)) : "0",
    );
  }, [collegeId, restRows]);

  useEffect(() => {
    clearResults();
    if (!collegeId) {
      setCourseYearId("0");
      return;
    }
    const groupNum = Number(courseGroupId);
    const filtered = restRows.filter((r) => {
      if (num(r.fk_college_id) !== Number(collegeId)) return false;
      if (groupNum !== 0 && num(r.fk_course_group_id) !== groupNum)
        return false;
      return true;
    });
    const years = dedupeBy(filtered, (r) => num(r.fk_course_year_id)).sort(
      (a, b) =>
        num(a.year_order ?? a.cy_sort_order) -
        num(b.year_order ?? b.cy_sort_order),
    );
    setCourseYearId(
      years.length ? String(num(years[0].fk_course_year_id)) : "0",
    );
  }, [courseGroupId, collegeId, restRows]);

  async function onGetReport() {
    if (
      !courseId ||
      !academicYearId ||
      !examId ||
      !collegeId ||
      !examTypeCatdetId
    ) {
      toastInfo("Please Select Valid Filters");
      return;
    }
    setLoadingList(true);
    try {
      const collegeRow = colleges.find(
        (c) => num(c.fk_college_id) === Number(collegeId),
      );
      const courseRow = courses.find(
        (c) => num(c.fk_course_id) === Number(courseId),
      );
      const groupRow = Number(courseGroupId)
        ? courseGroups.find(
            (g) => num(g.fk_course_group_id) === Number(courseGroupId),
          )
        : undefined;
      const yearRow = Number(courseYearId)
        ? courseYears.find(
            (y) => num(y.fk_course_year_id) === Number(courseYearId),
          )
        : undefined;

      const list = await getGenderWiseExamReport({
        examId: Number(examId),
        collegeId: Number(collegeId),
        courseId: Number(courseId),
        courseGroupId: Number(courseGroupId) || 0,
        courseYearId: Number(courseYearId) || 0,
        examTypeCatdetId: Number(examTypeCatdetId) || 0,
      });
      setRows(list.map((row, i) => ({ ...row, __rid: i })));

      if (list.length) {
        const examLabel = txt(list[0]?.exam_label_name);
        const collegeCode = txt(collegeRow?.college_code);
        const courseCode = txt(courseRow?.course_code);
        const courseGroup = groupRow ? txt(groupRow.group_code) : "";
        const courseYear = yearRow
          ? txt(yearRow.course_year_name ?? yearRow.course_year_code)
          : "";

        setDataDetails(
          buildDataDetails({
            collegeCode,
            courseCode,
            courseGroup,
            courseYear,
            exam: examLabel,
          }),
        );

        let collegeName = txt(collegeRow?.college_name);
        try {
          const college = await getCollegeById(Number(collegeId));
          if (college?.collegeName) collegeName = String(college.collegeName);
        } catch {
          /* use filter row name */
        }

        setPrintMeta({
          collegeId: Number(collegeId),
          collegeName,
          examLabel,
          courseGroup,
          courseYear,
        });
        toastSuccess("Data retrieved successfully!");
      } else {
        clearResults();
        toastSuccess("No Records Found.");
      }
    } catch (e) {
      toastError(e, "Failed to load report");
      clearResults();
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
      REPORT_TITLE,
      buildHtmlTable([...EXPORT_COLS], toExportRows(rows)),
      `<strong>${escapeHtml(REPORT_TITLE)} &nbsp; (${escapeHtml(dataDetails)})</strong>`,
    );
  }

  const handlePrintReport = useCallback(async () => {
    if (!rows.length) {
      toastInfo("No data to print");
      return;
    }
    await printReport(rows, printMeta, orgCode);
  }, [rows, printMeta, orgCode]);

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      {
        headerName: "S.No",
        valueGetter: rowIndexGetter,
        width: 70,
        minWidth: 70,
        flex: 0,
      },
      {
        headerName: "Subject",
        minWidth: 200,
        flex: 1,
        valueGetter: (p) => txt(p.data?.SUBJECT),
      },
      {
        headerName: "Subject Type",
        minWidth: 120,
        flex: 0,
        valueGetter: (p) => txt(p.data?.subject_type),
      },
      {
        headerName: "Credits",
        minWidth: 90,
        flex: 0,
        cellClass: "text-center",
        valueGetter: (p) => txt(p.data?.credits),
      },
      {
        headerName: "Appeared",
        minWidth: 100,
        flex: 0,
        cellClass: "text-center",
        valueGetter: (p) => txt(p.data?.Appeared),
      },
      {
        headerName: "Passed",
        minWidth: 90,
        flex: 0,
        cellClass: "text-center",
        valueGetter: (p) => txt(p.data?.Passed),
      },
      {
        headerName: "Percentage",
        minWidth: 110,
        flex: 0,
        cellClass: "text-center",
        valueGetter: (p) => txt(p.data?.Pass_percentage),
      },
      {
        headerName: "Boys",
        minWidth: 90,
        flex: 0,
        cellClass: "text-center",
        valueGetter: (p) => txt(p.data?.boys_passed),
      },
      {
        headerName: "Girls",
        minWidth: 90,
        flex: 0,
        cellClass: "text-center",
        valueGetter: (p) => txt(p.data?.girls_passed),
      },
    ],
    [],
  );

  const filters = (
    <>
      <div className="inv-allot-report-filters space-y-2">
        <div className="inv-allot-report-filters__row">
          <div className="inv-allot-report-filters__fx15">
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
            <GlobalFilterField label="Exam Year *">
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
          <div className="inv-allot-report-filters__fx52">
            <GlobalFilterField
              label="Exam Master *"
              className="min-w-[260px] flex-[2]"
            >
              <Select
                value={examId || null}
                onChange={(v) => setExamId(v ?? "")}
                isLoading={loadingFilters}
                options={exams.map((e) => ({
                  value: String(num(e.fk_exam_id)),
                  label: formatExamLabel(e),
                }))}
                placeholder="Exam Master"
                searchable
              />
            </GlobalFilterField>
          </div>
          <div className="inv-allot-report-filters__fx13">
            <GlobalFilterField label="Exam Type *">
              <Select
                value={examTypeCatdetId || null}
                onChange={(v) => {
                  setExamTypeCatdetId(v ?? "0");
                  clearResults();
                }}
                isLoading={loadingFilters}
                options={[
                  { value: "0", label: "All" },
                  ...examFeeTypes.map((t) => ({
                    value: String(feeTypeId(t)),
                    label: feeTypeCode(t),
                  })),
                ]}
                placeholder="Exam Type"
                searchable
              />
            </GlobalFilterField>
          </div>
        </div>
        <div className="inv-allot-report-filters__row">
          <div className="inv-allot-report-filters__fx20">
            <GlobalFilterField label="College *">
              <Select
                value={collegeId || null}
                onChange={(v) => setCollegeId(v ?? "")}
                isLoading={loadingFilters}
                options={colleges.map((c) => ({
                  value: String(num(c.fk_college_id)),
                  label: txt(c.college_code),
                }))}
                placeholder="College"
                searchable
              />
            </GlobalFilterField>
          </div>
          <div className="inv-allot-report-filters__fx20">
            <GlobalFilterField label="Course Group *">
              <Select
                value={courseGroupId || null}
                onChange={(v) => setCourseGroupId(v ?? "0")}
                isLoading={loadingFilters}
                options={[
                  { value: "0", label: "All" },
                  ...courseGroups.map((g) => ({
                    value: String(num(g.fk_course_group_id)),
                    label: txt(g.group_code),
                  })),
                ]}
                placeholder="Course Group"
                searchable
              />
            </GlobalFilterField>
          </div>
          <div className="inv-allot-report-filters__fx20">
            <GlobalFilterField label="Course Years *">
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
                    label: txt(y.course_year_code ?? y.course_year_name),
                  })),
                ]}
                placeholder="Course Years"
                searchable
              />
            </GlobalFilterField>
          </div>
          <div className="inv-allot-report-filters__fx15">
            <GlobalFilterField
              label=""
              className="global-filter-field--shrink global-filter-field--action"
            >
              <Button
                type="button"
                onClick={() => void onGetReport()}
                disabled={loadingList}
                className="h-[30px] px-3 text-[12px] w-full"
              >
                Get Report
              </Button>
            </GlobalFilterField>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <FilteredListPage
      title={rows.length > 0 ? `${REPORT_TITLE} — ${dataDetails}` : PAGE_TITLE}
      filterTitle={PAGE_TITLE}
      filters={filters}
      rowData={rows}
      columnDefs={columnDefs}
      loading={loadingList}
      showTable={rows.length > 0}
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
