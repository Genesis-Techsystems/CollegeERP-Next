"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef } from "ag-grid-community";
import { format, parseISO } from "date-fns";
import { FilteredPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Select } from "@/common/components/select";
import { DataTable } from "@/common/components/table";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import {
  getCollegeById,
  getGeneralDetails,
  getGradeMemoIssueFilters,
  getGradeMemoIssueRestFilters,
  getGraceMarksBenefitedStudents,
} from "@/services";
import { GM_CODES } from "@/config/constants/ui";
import { toastError, toastInfo } from "@/lib/toast";
import { rowIndexGetter } from "@/lib/utils";
import { DEFAULT_COLLEGE_LOGO, useCollegeLogo } from "@/hooks/useCollegeLogo";
import {
  BookOpen,
  Building2,
  CalendarDays,
  ClipboardList,
  FileSpreadsheet,
  GraduationCap,
  Layers,
  Printer,
  RefreshCw,
  RotateCcw,
  School,
} from "lucide-react";
import { printGraceMarksBenefitedStudents } from "./printGraceMarksBenefitedStudents";

type AnyRow = Record<string, any>;

type GroupBucket = {
  courseGroup: string;
  subjects: AnyRow[];
};

const REPORT_TITLE = "Grace Marks Benefited Students Data";

function numFrom(row: AnyRow, keys: string[]): number {
  for (const key of keys) {
    const n = Number(row?.[key]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function strFrom(row: AnyRow, keys: string[]): string {
  for (const key of keys) {
    const v = String(row?.[key] ?? "").trim();
    if (v) return v;
  }
  return "";
}

function dedupeBy(rows: AnyRow[], keys: string[]): AnyRow[] {
  const seen = new Set<number>();
  const out: AnyRow[] = [];
  for (const row of rows) {
    const id = numFrom(row, keys);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(row);
  }
  return out;
}

/** Angular date pipe for Exam Master — `MMM d, yyyy`. */
function parseExamDate(v: unknown): string {
  const s = String(v ?? "").trim();
  if (!s) return "";
  try {
    if (/^\d{4}-\d{2}-\d{2}/.test(s))
      return format(parseISO(s.slice(0, 10)), "MMM d, yyyy");
    return format(new Date(s), "MMM d, yyyy");
  } catch {
    return s;
  }
}

function examTypeTags(r: AnyRow): string[] {
  const tags: string[] = [];
  if (r.is_internal_exam || r.isInternalExam) tags.push("(Internal)");
  if (r.is_regular_exam || r.isRegularExam) tags.push("(Regular)");
  if (r.is_supply_exam || r.isSupplyExam) tags.push("(Supple)");
  return tags;
}

function examMasterLabel(r: AnyRow): string {
  const name = strFrom(r, ["exam_name", "examName"]) || "Exam";
  const from = parseExamDate(r.from_date ?? r.fromDate);
  const to = parseExamDate(r.to_date ?? r.toDate);
  const range = from && to ? ` (${from} - ${to})` : "";
  const tags = examTypeTags(r);
  return `${name}${range}${tags.length ? ` ${tags.join("")}` : ""}`;
}

function examMasterLabelNode(r: AnyRow) {
  const name = strFrom(r, ["exam_name", "examName"]) || "Exam";
  const from = parseExamDate(r.from_date ?? r.fromDate);
  const to = parseExamDate(r.to_date ?? r.toDate);
  const range = from && to ? ` (${from} - ${to})` : "";
  const tags = examTypeTags(r);
  return (
    <>
      {name}
      {range}
      {tags.length ? " " : null}
      {tags.map((t) => (
        <span key={t} style={{ color: "#0014ff", fontWeight: 500 }}>
          {t}
        </span>
      ))}
    </>
  );
}

function examMasterTooltip(r: AnyRow): string {
  const name = strFrom(r, ["exam_name", "examName"]) || "Exam";
  const from = parseExamDate(r.from_date ?? r.fromDate);
  const to = parseExamDate(r.to_date ?? r.toDate);
  return from && to ? `${name} (${from} - ${to})` : name;
}

function toAbsoluteLogoUrl(url: string): string {
  if (/^(https?:\/\/|data:|blob:)/i.test(url)) return url;
  if (typeof globalThis.location?.origin === "string") {
    return `${globalThis.location.origin}${url.startsWith("/") ? "" : "/"}${url}`;
  }
  return url;
}

/** Angular getDetails grouping: by course_group → flat subject/student rows. */
function groupGraceRows(rows: AnyRow[]): GroupBucket[] {
  const grouped: Record<string, GroupBucket> = {};
  for (const item of rows) {
    const groupKey =
      strFrom(item, [
        "course_group",
        "group_code",
        "groupCode",
        "course_group_code",
      ]) || "—";
    if (!grouped[groupKey]) {
      grouped[groupKey] = { courseGroup: groupKey, subjects: [] };
    }
    grouped[groupKey].subjects.push(item);
  }
  return Object.values(grouped);
}

function exportHtmlTable(filename: string, title: string, bodyHtml: string) {
  const template = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Worksheet</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table>${title}${bodyHtml}</table></body></html>`;
  const link = document.createElement("a");
  link.download = filename;
  link.href = `data:application/vnd.ms-excel;base64,${window.btoa(unescape(encodeURIComponent(template)))}`;
  link.click();
}

const COL_DEFS = {
  siNo: {
    headerName: "S.No",
    valueGetter: rowIndexGetter,
    width: 80,
    flex: 0,
    cellStyle: { textAlign: "center" },
  } as ColDef<AnyRow>,
  hallticket: {
    headerName: "Hall Ticket No.",
    minWidth: 160,
    flex: 1,
    valueGetter: (p) =>
      strFrom(p.data ?? {}, ["hallticket_number", "hall_ticketno"]) || "—",
  } as ColDef<AnyRow>,
  subject: {
    headerName: "Subject",
    minWidth: 220,
    flex: 1.4,
    valueGetter: (p) =>
      strFrom(p.data ?? {}, ["subject_name", "subject"]) || "—",
  } as ColDef<AnyRow>,
  afterModeration: {
    headerName: "After Moderation Marks",
    minWidth: 160,
    flex: 0.8,
    valueGetter: (p) => strFrom(p.data ?? {}, ["ext_marks"]) || "—",
  } as ColDef<AnyRow>,
  graceMarks: {
    headerName: "Grace Marks",
    minWidth: 120,
    flex: 0.7,
    valueGetter: (p) => strFrom(p.data ?? {}, ["grace_marks_added"]) || "—",
  } as ColDef<AnyRow>,
  finalMarks: {
    headerName: "Final Marks",
    minWidth: 120,
    flex: 0.7,
    valueGetter: (p) => strFrom(p.data ?? {}, ["ext_grace_total"]) || "—",
    cellStyle: { textAlign: "center" },
  } as ColDef<AnyRow>,
};

export function GraceMarksBenefitedStudentsReportPage() {
  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );

  const [loading, setLoading] = useState(false);
  const [baseRows, setBaseRows] = useState<AnyRow[]>([]);
  const [restRows, setRestRows] = useState<AnyRow[]>([]);
  const [examFeeTypes, setExamFeeTypes] = useState<AnyRow[]>([]);

  const [courseId, setCourseId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [examId, setExamId] = useState<number | null>(null);
  const [examTypeCatdetId, setExamTypeCatdetId] = useState<number>(0);
  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [courseGroupId, setCourseGroupId] = useState<number>(0);
  const [courseYearId, setCourseYearId] = useState<number>(0);
  const [skipAutoSelect, setSkipAutoSelect] = useState(false);

  const [groupResults, setGroupResults] = useState<GroupBucket[]>([]);
  const [dataDetails, setDataDetails] = useState("");
  const [examLabel, setExamLabel] = useState("");
  /** Angular getColleges(): collegeName from College domain (filter rows often lack name). */
  const [printCollegeName, setPrintCollegeName] = useState("");

  const collegeLogo = useCollegeLogo(collegeId);

  const courses = useMemo(
    () => dedupeBy(baseRows, ["fk_course_id", "courseId"]),
    [baseRows],
  );
  const academicYears = useMemo(
    () =>
      dedupeBy(
        baseRows.filter(
          (r) => numFrom(r, ["fk_course_id", "courseId"]) === Number(courseId),
        ),
        ["fk_academic_year_id", "academicYearId"],
      ).sort(
        (a, b) =>
          Number(strFrom(b, ["academic_year", "academicYear"])) -
          Number(strFrom(a, ["academic_year", "academicYear"])),
      ),
    [baseRows, courseId],
  );
  const exams = useMemo(
    () =>
      dedupeBy(
        baseRows.filter(
          (r) =>
            numFrom(r, ["fk_course_id", "courseId"]) === Number(courseId) &&
            numFrom(r, ["fk_academic_year_id", "academicYearId"]) ===
              Number(academicYearId),
        ),
        ["fk_exam_id", "examId"],
      ),
    [baseRows, courseId, academicYearId],
  );
  const colleges = useMemo(
    () =>
      dedupeBy(restRows, ["fk_college_id", "collegeId"]).sort(
        (a, b) =>
          Number(a.clg_sort_order ?? a.sort_order ?? 0) -
          Number(b.clg_sort_order ?? b.sort_order ?? 0),
      ),
    [restRows],
  );
  const courseGroups = useMemo(
    () =>
      dedupeBy(
        restRows.filter(
          (r) =>
            numFrom(r, ["fk_college_id", "collegeId"]) === Number(collegeId),
        ),
        ["fk_course_group_id", "courseGroupId"],
      ),
    [restRows, collegeId],
  );
  const courseYears = useMemo(
    () =>
      dedupeBy(
        restRows.filter(
          (r) =>
            numFrom(r, ["fk_college_id", "collegeId"]) === Number(collegeId) &&
            (courseGroupId === 0 ||
              numFrom(r, ["fk_course_group_id", "courseGroupId"]) ===
                Number(courseGroupId)),
        ),
        ["fk_course_year_id", "courseYearId"],
      ).sort(
        (a, b) => Number(a.cy_sort_order ?? 0) - Number(b.cy_sort_order ?? 0),
      ),
    [restRows, collegeId, courseGroupId],
  );

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.hallticket,
      COL_DEFS.subject,
      COL_DEFS.afterModeration,
      COL_DEFS.graceMarks,
      COL_DEFS.finalMarks,
    ],
    [],
  );

  const getRowId = useCallback(
    (p: { data?: AnyRow; node?: { rowIndex?: number | null } }) => {
      const d = p.data;
      if (!d) return "";
      const ht = strFrom(d, ["hallticket_number", "hall_ticketno"]);
      const sub = strFrom(d, [
        "subject_name",
        "subject",
        "subject_code",
        "subjectCode",
      ]);
      const idx = p.node?.rowIndex ?? 0;
      return `${ht}-${sub}-${idx}`;
    },
    [],
  );

  function clearResults() {
    setGroupResults([]);
    setDataDetails("");
    setExamLabel("");
    setPrintCollegeName("");
  }

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      try {
        const rows = await getGradeMemoIssueFilters(employeeId);
        if (cancelled) return;
        setBaseRows(rows);
        const firstCourse = dedupeBy(rows, ["fk_course_id", "courseId"])[0];
        setSkipAutoSelect(false);
        setCourseId(
          firstCourse
            ? numFrom(firstCourse, ["fk_course_id", "courseId"])
            : null,
        );
      } catch {
        if (!cancelled) toastError("Failed to load filters");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void init();
    return () => {
      cancelled = true;
    };
  }, [employeeId]);

  useEffect(() => {
    if (!courseId) {
      setAcademicYearId(null);
      return;
    }
    if (skipAutoSelect) return;
    const years = dedupeBy(
      baseRows.filter(
        (r) => numFrom(r, ["fk_course_id", "courseId"]) === Number(courseId),
      ),
      ["fk_academic_year_id", "academicYearId"],
    ).sort(
      (a, b) =>
        Number(strFrom(b, ["academic_year", "academicYear"])) -
        Number(strFrom(a, ["academic_year", "academicYear"])),
    );
    setAcademicYearId(
      years[0]
        ? numFrom(years[0], ["fk_academic_year_id", "academicYearId"])
        : null,
    );
  }, [courseId, baseRows, skipAutoSelect]);

  useEffect(() => {
    if (!courseId || !academicYearId) {
      setExamId(null);
      return;
    }
    if (skipAutoSelect) return;
    const list = dedupeBy(
      baseRows.filter(
        (r) =>
          numFrom(r, ["fk_course_id", "courseId"]) === Number(courseId) &&
          numFrom(r, ["fk_academic_year_id", "academicYearId"]) ===
            Number(academicYearId),
      ),
      ["fk_exam_id", "examId"],
    );
    setExamId(list[0] ? numFrom(list[0], ["fk_exam_id", "examId"]) : null);
  }, [courseId, academicYearId, baseRows, skipAutoSelect]);

  useEffect(() => {
    let cancelled = false;
    async function loadRestAndTypes() {
      if (!courseId || !academicYearId || !examId) {
        setRestRows([]);
        setExamFeeTypes([]);
        setCollegeId(null);
        setCourseGroupId(0);
        setCourseYearId(0);
        setExamTypeCatdetId(0);
        return;
      }
      setLoading(true);
      try {
        const [rest, feeTypes] = await Promise.all([
          getGradeMemoIssueRestFilters({
            courseId,
            academicYearId,
            examId,
            employeeId,
          }),
          getGeneralDetails(GM_CODES.EXAM_FEE_TYPE).catch(() => []),
        ]);
        if (cancelled) return;
        setRestRows(rest);

        const examRow = exams.find(
          (r) => numFrom(r, ["fk_exam_id", "examId"]) === Number(examId),
        );
        const allowed: AnyRow[] = [];
        for (const ft of feeTypes) {
          const code = strFrom(ft, [
            "generalDetailCode",
            "general_detail_code",
          ]);
          if (examRow?.is_regular_exam && code === "Regular") allowed.push(ft);
          if (examRow?.is_supply_exam && code === "Supple") allowed.push(ft);
          if (examRow?.is_internal_exam && code === "Internal")
            allowed.push(ft);
        }
        setExamFeeTypes(allowed);

        if (skipAutoSelect) {
          setExamTypeCatdetId(0);
          setCollegeId(null);
          setCourseGroupId(0);
          setCourseYearId(0);
          return;
        }

        setExamTypeCatdetId(
          allowed[0]
            ? numFrom(allowed[0], ["generalDetailId", "general_detail_id"])
            : 0,
        );

        const nextColleges = dedupeBy(rest, [
          "fk_college_id",
          "collegeId",
        ]).sort(
          (a, b) =>
            Number(a.clg_sort_order ?? a.sort_order ?? 0) -
            Number(b.clg_sort_order ?? b.sort_order ?? 0),
        );
        setCollegeId(
          nextColleges[0]
            ? numFrom(nextColleges[0], ["fk_college_id", "collegeId"])
            : null,
        );
      } catch {
        if (!cancelled) toastError("Failed to load college filters");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadRestAndTypes();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, academicYearId, examId, employeeId, skipAutoSelect]);

  useEffect(() => {
    if (!collegeId) {
      setCourseGroupId(0);
      setCourseYearId(0);
      return;
    }
    if (skipAutoSelect) return;
    const groups = dedupeBy(
      restRows.filter(
        (r) => numFrom(r, ["fk_college_id", "collegeId"]) === Number(collegeId),
      ),
      ["fk_course_group_id", "courseGroupId"],
    );
    const nextGroupId = groups[0]
      ? numFrom(groups[0], ["fk_course_group_id", "courseGroupId"])
      : 0;
    setCourseGroupId(nextGroupId);
    const years = dedupeBy(
      restRows.filter(
        (r) =>
          numFrom(r, ["fk_college_id", "collegeId"]) === Number(collegeId) &&
          numFrom(r, ["fk_course_group_id", "courseGroupId"]) ===
            Number(nextGroupId),
      ),
      ["fk_course_year_id", "courseYearId"],
    ).sort(
      (a, b) => Number(a.cy_sort_order ?? 0) - Number(b.cy_sort_order ?? 0),
    );
    setCourseYearId(
      years[0] ? numFrom(years[0], ["fk_course_year_id", "courseYearId"]) : 0,
    );
  }, [collegeId, restRows, skipAutoSelect]);

  useEffect(() => {
    if (skipAutoSelect || !collegeId) return;
    const years = dedupeBy(
      restRows.filter(
        (r) =>
          numFrom(r, ["fk_college_id", "collegeId"]) === Number(collegeId) &&
          (courseGroupId === 0 ||
            numFrom(r, ["fk_course_group_id", "courseGroupId"]) ===
              Number(courseGroupId)),
      ),
      ["fk_course_year_id", "courseYearId"],
    ).sort(
      (a, b) => Number(a.cy_sort_order ?? 0) - Number(b.cy_sort_order ?? 0),
    );
    setCourseYearId(
      years[0] ? numFrom(years[0], ["fk_course_year_id", "courseYearId"]) : 0,
    );
  }, [courseGroupId, collegeId, restRows, skipAutoSelect]);

  async function handleGetReport() {
    if (!courseId || !collegeId || !examId) {
      toastError("Please select Course, Exam, and College");
      return;
    }
    setLoading(true);
    clearResults();
    try {
      const rows = await getGraceMarksBenefitedStudents({
        examId,
        examTypeCatdetId: examTypeCatdetId || 0,
        collegeId,
        courseId,
        courseGroupId: courseGroupId || 0,
        courseYearId: courseYearId || 0,
      });
      if (rows.length === 0) {
        toastInfo("No records found");
        return;
      }

      const course = courses.find(
        (r) => numFrom(r, ["fk_course_id", "courseId"]) === Number(courseId),
      );
      const college = colleges.find(
        (r) => numFrom(r, ["fk_college_id", "collegeId"]) === Number(collegeId),
      );
      const group = courseGroups.find(
        (r) =>
          numFrom(r, ["fk_course_group_id", "courseGroupId"]) ===
          Number(courseGroupId),
      );
      const year = courseYears.find(
        (r) =>
          numFrom(r, ["fk_course_year_id", "courseYearId"]) ===
          Number(courseYearId),
      );
      const examName =
        strFrom(rows[0] ?? {}, ["exam_label_name", "exam_name"]) ||
        strFrom(
          exams.find(
            (r) => numFrom(r, ["fk_exam_id", "examId"]) === Number(examId),
          ) ?? {},
          ["exam_name", "examName"],
        );
      // Angular selectedData(): collegeCode / courseCode / courseGroup / courseYear / exam
      // courseYear uses course_year_name; exam uses exam_label_name from API
      setExamLabel(examName);
      setDataDetails(
        [
          strFrom(college ?? {}, ["college_code", "collegeCode"]),
          strFrom(course ?? {}, ["course_code", "courseCode"]),
          courseGroupId
            ? strFrom(group ?? {}, [
                "group_code",
                "groupCode",
                "course_group_code",
              ])
            : "",
          courseYearId
            ? strFrom(year ?? {}, [
                "course_year_name",
                "courseYearName",
                "course_year_code",
                "courseYearCode",
              ])
            : "",
          examName,
        ]
          .filter(Boolean)
          .join(" / "),
      );

      // Angular getColleges(): collegeName + logo from College domain by collegeId
      const collegeRecord = await getCollegeById(Number(collegeId)).catch(
        () => null,
      );
      setPrintCollegeName(
        strFrom(collegeRecord ?? {}, ["collegeName", "college_name"]) ||
          strFrom(college ?? {}, ["college_name", "collegeName"]),
      );

      setGroupResults(groupGraceRows(rows));
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Failed to load report");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setSkipAutoSelect(true);
    setCourseId(null);
    setAcademicYearId(null);
    setExamId(null);
    setExamTypeCatdetId(0);
    setCollegeId(null);
    setCourseGroupId(0);
    setCourseYearId(0);
    setRestRows([]);
    setExamFeeTypes([]);
    clearResults();
  }

  function handleExportExcel() {
    if (groupResults.length === 0) return;
    const rowsHtml = groupResults
      .map((group) => {
        const groupHeader = `<tr><td colspan="6"><b>Course Group : ${group.courseGroup}</b></td></tr>`;
        const head = `<tr><th>S.No</th><th>Hall Ticket No.</th><th>Subject</th><th>After Moderation Marks</th><th>Grace Marks</th><th>Final Marks</th></tr>`;
        const body = group.subjects
          .map(
            (s, i) =>
              `<tr><td>${i + 1}</td><td>${strFrom(s, ["hallticket_number", "hall_ticketno"])}</td><td>${strFrom(s, ["subject_name", "subject"])}</td><td>${strFrom(s, ["ext_marks"])}</td><td>${strFrom(s, ["grace_marks_added"])}</td><td>${strFrom(s, ["ext_grace_total"])}</td></tr>`,
          )
          .join("");
        return `${groupHeader}${head}${body}`;
      })
      .join("");
    const title = `<tr><th colspan="6" style="text-align:center;font-size:18px;font-weight:bold;background:#f2f2f2;">${REPORT_TITLE}${dataDetails ? ` (${dataDetails})` : ""}</th></tr>`;
    exportHtmlTable(`${REPORT_TITLE}.xls`, title, rowsHtml);
  }

  function handlePrint() {
    if (groupResults.length === 0) return;
    const college = colleges.find(
      (r) => numFrom(r, ["fk_college_id", "collegeId"]) === Number(collegeId),
    );
    const collegeName =
      printCollegeName ||
      strFrom(college ?? {}, ["college_name", "collegeName"]);
    printGraceMarksBenefitedStudents(groupResults, {
      title: REPORT_TITLE,
      examLabel,
      collegeName,
      logoUrl: toAbsoluteLogoUrl(collegeLogo || DEFAULT_COLLEGE_LOGO),
    });
  }

  return (
    <FilteredPage
      title={REPORT_TITLE}
      tableHeader={
        groupResults.length > 0 ? (
          <div className="table-context-header flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <div className="flex items-center gap-2">
              <span
                className="material-icons table-context-header__icon"
                aria-hidden
              >
                ballot
              </span>
              <strong className="table-context-header__title">
                {REPORT_TITLE}
              </strong>
            </div>
            {dataDetails ? (
              <span
                className="text-[14px] font-medium"
                style={{ color: "#042956" }}
              >
                {dataDetails}
              </span>
            ) : null}
          </div>
        ) : null
      }
      filters={
        <div className="inv-allot-report-filters space-y-2">
          <div className="inv-allot-report-filters__row">
            <div className="inv-allot-report-filters__fx13">
              <GlobalFilterField
                label="Course"
                className="global-filter-field--fx20"
              >
                <Select
                  value={courseId ? String(courseId) : null}
                  onChange={(v) => {
                    setSkipAutoSelect(false);
                    clearResults();
                    setCourseId(v ? Number(v) : null);
                  }}
                  options={courses.map((r) => ({
                    value: String(numFrom(r, ["fk_course_id", "courseId"])),
                    label: strFrom(r, [
                      "course_code",
                      "courseCode",
                      "course_name",
                    ]),
                  }))}
                  placeholder="Course"
                  searchable
                  isLoading={loading && baseRows.length === 0}
                />
              </GlobalFilterField>
            </div>
            <div className="inv-allot-report-filters__fx15">
              <GlobalFilterField
                label="Exam Year"
                className="global-filter-field--fx20"
              >
                <Select
                  value={academicYearId ? String(academicYearId) : null}
                  onChange={(v) => {
                    setSkipAutoSelect(false);
                    clearResults();
                    setAcademicYearId(v ? Number(v) : null);
                  }}
                  options={academicYears.map((r) => ({
                    value: String(
                      numFrom(r, ["fk_academic_year_id", "academicYearId"]),
                    ),
                    label: strFrom(r, ["academic_year", "academicYear"]),
                  }))}
                  placeholder="Exam Year"
                  searchable
                />
              </GlobalFilterField>
            </div>
            <div className="inv-allot-report-filters__fx52">
              <GlobalFilterField
                label="Exam Master"
                className="global-filter-field--fx60"
              >
                <Select
                  value={examId ? String(examId) : null}
                  onChange={(v) => {
                    setSkipAutoSelect(false);
                    clearResults();
                    setExamId(v ? Number(v) : null);
                  }}
                  options={exams.map((r) => ({
                    value: String(numFrom(r, ["fk_exam_id", "examId"])),
                    label: examMasterLabel(r),
                    title: examMasterTooltip(r),
                    labelNode: examMasterLabelNode(r),
                  }))}
                  placeholder="Exam Master"
                  searchable
                  searchPlaceholder="Search..."
                  wrapOptionLabels
                />
              </GlobalFilterField>
            </div>
            <div className="inv-allot-report-filters__fx20">
              <GlobalFilterField
                label="Exam Type"
                className="global-filter-field--fx15"
              >
                <Select
                  value={String(examTypeCatdetId)}
                  onChange={(v) => {
                    clearResults();
                    setExamTypeCatdetId(v ? Number(v) : 0);
                  }}
                  options={[
                    { value: "0", label: "All" },
                    ...examFeeTypes.map((r) => ({
                      value: String(
                        numFrom(r, ["generalDetailId", "general_detail_id"]),
                      ),
                      label: strFrom(r, [
                        "generalDetailCode",
                        "general_detail_code",
                      ]),
                    })),
                  ]}
                  placeholder="Exam Type"
                />
              </GlobalFilterField>
            </div>
          </div>

          <div className="inv-allot-report-filters__row">
            <div className="inv-allot-report-filters__fx20">
              <GlobalFilterField
                label="College"
                className="global-filter-field--fx20"
              >
                <Select
                  value={collegeId ? String(collegeId) : null}
                  onChange={(v) => {
                    setSkipAutoSelect(false);
                    clearResults();
                    setCollegeId(v ? Number(v) : null);
                  }}
                  options={colleges.map((r) => ({
                    value: String(numFrom(r, ["fk_college_id", "collegeId"])),
                    label: strFrom(r, [
                      "college_code",
                      "collegeCode",
                      "college_name",
                    ]),
                  }))}
                  placeholder="College"
                  searchable
                />
              </GlobalFilterField>
            </div>
            <div className="inv-allot-report-filters__fx20">
              <GlobalFilterField
                label="Course Group"
                className="global-filter-field--fx20"
              >
                <Select
                  value={String(courseGroupId)}
                  onChange={(v) => {
                    clearResults();
                    setCourseGroupId(v ? Number(v) : 0);
                  }}
                  options={[
                    { value: "0", label: "All" },
                    ...courseGroups.map((r) => ({
                      value: String(
                        numFrom(r, ["fk_course_group_id", "courseGroupId"]),
                      ),
                      label: strFrom(r, [
                        "group_code",
                        "groupCode",
                        "course_group_code",
                      ]),
                    })),
                  ]}
                  placeholder="Course Group"
                  searchable
                />
              </GlobalFilterField>
            </div>
            <div className="inv-allot-report-filters__fx20">
              <GlobalFilterField
                label="Course Years"
                className="global-filter-field--fx20"
              >
                <Select
                  value={String(courseYearId)}
                  onChange={(v) => {
                    clearResults();
                    setCourseYearId(v ? Number(v) : 0);
                  }}
                  options={[
                    { value: "0", label: "All" },
                    ...courseYears.map((r) => ({
                      value: String(
                        numFrom(r, ["fk_course_year_id", "courseYearId"]),
                      ),
                      label: strFrom(r, ["course_year_code", "courseYearCode"]),
                    })),
                  ]}
                  placeholder="Course Years"
                  searchable
                />
              </GlobalFilterField>
            </div>
            <div className="inv-allot-report-filters__fx13 flex items-center self-end pb-0.5">
              <Button
                type="button"
                className="h-8 text-[12px] w-full"
                onClick={() => void handleGetReport()}
                disabled={loading}
              >
                {loading ? "Loading..." : "Get Report"}
              </Button>
            </div>
            <div className="inv-allot-report-filters__fx13 flex items-center self-end pb-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleReset}
                title="Reset"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      }
      body={
        groupResults.length > 0 ? (
          <div className="space-y-5">
            {groupResults.map((group, groupIndex) => (
              <div key={group.courseGroup}>
                <DataTable
                  title=""
                  subtitle=""
                  rowData={group.subjects}
                  columnDefs={columnDefs}
                  loading={loading}
                  pagination
                  paginationPageSize={25}
                  getRowId={getRowId}
                  height="auto"
                  toolbar={{
                    search: true,
                    columnPicker: true,
                    exportExcel: false,
                    exportPdf: false,
                  }}
                  toolbarTrailing={
                    groupIndex === 0 ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          className="h-8 text-[12px]"
                          onClick={handleExportExcel}
                        >
                          <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
                          Export Excel
                        </Button>
                        <Button
                          type="button"
                          className="h-8 text-[12px]"
                          onClick={handlePrint}
                        >
                          <Printer className="mr-1.5 h-3.5 w-3.5" />
                          Print Report
                        </Button>
                      </div>
                    ) : undefined
                  }
                  toolbarFooter={
                    <p className="text-sm font-semibold text-[#042956]">
                      Course Group : {group.courseGroup}
                    </p>
                  }
                />
              </div>
            ))}
          </div>
        ) : null
      }
    />
  );
}
