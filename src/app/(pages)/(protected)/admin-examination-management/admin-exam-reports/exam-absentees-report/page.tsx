"use client";

/**
 * Exam Absentees Report — Angular `exam-absentees-report`.
 * MatTable → FilteredListPage + DataTable.
 */

import { useEffect, useMemo, useState } from "react";
import type { ColDef } from "ag-grid-community";
import { format, parseISO } from "date-fns";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Select } from "@/common/components/select";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { rowIndexGetter } from "@/lib/utils";
import {
  getExamAbsenteesReport,
  getGradeMemoIssueFilters,
  getGradeMemoIssueRestFilters,
  getModerationColleges,
  getUnivExamSubjectUc,
} from "@/services";
import { MINIO_URL } from "@/config/constants/api";
import { toastError, toastInfo } from "@/lib/toast";
import {
  DEFAULT_COLLEGE_LOGO,
  useCollegeLogo,
} from "@/hooks/useCollegeLogo";
import { FileSpreadsheet, Printer } from "lucide-react";
import { printExamAbsenteesReport } from "../_components/printExamAbsenteesReport";

type AnyRow = Record<string, any>;

const TOOLBAR = {
  search: true,
  searchPlaceholder: "Search...",
  columnPicker: false,
  exportPdf: false,
  exportExcel: false,
} as const;

/** Angular displayedColumns: id, collegeCode, groupCode, courseYearCode, examDate, subject, hallticketNumber */
const COL_DEFS = {
  sno: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 80,
    flex: 0,
  } as ColDef<AnyRow>,
  college: {
    headerName: "College Code",
    minWidth: 110,
    flex: 0.8,
    valueGetter: (p) => strFrom(p.data ?? {}, ["college_code", "collegeCode"]),
  } as ColDef<AnyRow>,
  group: {
    headerName: "Group Code",
    minWidth: 110,
    flex: 0.8,
    valueGetter: (p) => strFrom(p.data ?? {}, ["group_code", "groupCode"]),
  } as ColDef<AnyRow>,
  courseYear: {
    headerName: "Course Year Code",
    minWidth: 140,
    flex: 1,
    valueGetter: (p) =>
      strFrom(p.data ?? {}, ["course_year_code", "courseYearCode"]),
  } as ColDef<AnyRow>,
  examDate: {
    headerName: "Exam Date",
    minWidth: 120,
    flex: 0.9,
    valueGetter: (p) => strFrom(p.data ?? {}, ["exam_date", "examDate"]),
  } as ColDef<AnyRow>,
  subject: {
    headerName: "Subject Name (Subject Code)",
    minWidth: 220,
    flex: 1.5,
    valueGetter: (p) => {
      const name = strFrom(p.data ?? {}, ["subject_name", "subjectName"]);
      const code = strFrom(p.data ?? {}, ["subject_code", "subjectCode"]);
      return name && code ? `${name} (${code})` : name || code;
    },
  } as ColDef<AnyRow>,
  hallticket: {
    headerName: "Hallticket Number",
    minWidth: 170,
    flex: 1.1,
    valueGetter: (p) =>
      strFrom(p.data ?? {}, ["hallticket_number", "hall_ticketno"]),
  } as ColDef<AnyRow>,
};

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

/** Angular date pipe for Exam Master — `MMM d, yyyy` (Dec 22, 2025). */
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

/**
 * Angular Exam Master option:
 * `{{exam_name}} ({{from}} - {{to}}) (Internal)(Regular)(Supple)`
 */
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

function toLogoUrl(path: string): string {
  if (/^(https?:\/\/|data:|blob:|\/)/i.test(path)) return path;
  return `${MINIO_URL}${path.replace(/^\/+/, "")}`;
}

function toAbsoluteLogoUrl(url: string): string {
  if (/^(https?:\/\/|data:|blob:)/i.test(url)) return url;
  if (typeof globalThis.location?.origin === "string") {
    return `${globalThis.location.origin}${url.startsWith("/") ? "" : "/"}${url}`;
  }
  return url;
}

/** Angular getCollegeLogo(): Logo = collegesLogoList[0].logo */
async function resolvePrintLogo(): Promise<string> {
  try {
    const colleges = await getModerationColleges();
    const logo = colleges[0]?.logo;
    if (logo != null && String(logo).trim() !== "") {
      return toLogoUrl(String(logo).trim());
    }
  } catch {
    // fall through
  }
  return DEFAULT_COLLEGE_LOGO;
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

function exportHtmlTable(filename: string, title: string, bodyHtml: string) {
  const template = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Worksheet</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table>${title}${bodyHtml}</table></body></html>`;
  const link = document.createElement("a");
  link.download = filename;
  link.href = `data:application/vnd.ms-excel;base64,${window.btoa(unescape(encodeURIComponent(template)))}`;
  link.click();
}

export default function ExamAbsenteesReportPage() {
  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );

  const [loading, setLoading] = useState(false);
  const [baseRows, setBaseRows] = useState<AnyRow[]>([]);
  const [restRows, setRestRows] = useState<AnyRow[]>([]);
  const [subjectRows, setSubjectRows] = useState<AnyRow[]>([]);

  const [courseId, setCourseId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [examId, setExamId] = useState<number | null>(null);
  const [collegeId, setCollegeId] = useState<number>(0);
  const [courseGroupId, setCourseGroupId] = useState<number>(0);
  const [courseYearId, setCourseYearId] = useState<number>(0);
  const [regulationId, setRegulationId] = useState<number>(0);
  const [subjectId, setSubjectId] = useState<number>(0);
  const [skipAutoSelect, setSkipAutoSelect] = useState(false);

  const [rows, setRows] = useState<AnyRow[]>([]);
  const [examLabel, setExamLabel] = useState("");
  const [showTable, setShowTable] = useState(false);
  const [printLogoUrl, setPrintLogoUrl] = useState("");
  const collegeLogo = useCollegeLogo(collegeId > 0 ? collegeId : null);

  // Angular getCollegeLogo() on init — first active college logo for print
  useEffect(() => {
    let cancelled = false;
    resolvePrintLogo().then((url) => {
      if (!cancelled) setPrintLogoUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
            collegeId === 0 ||
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
            (collegeId === 0 ||
              numFrom(r, ["fk_college_id", "collegeId"]) ===
                Number(collegeId)) &&
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
  const regulations = useMemo(() => {
    const filtered = restRows.filter(
      (r) =>
        !courseId ||
        numFrom(r, ["fk_course_id", "courseId"]) === Number(courseId),
    );
    return dedupeBy(filtered.length > 0 ? filtered : restRows, [
      "fk_regulation_id",
      "regulationId",
    ]);
  }, [restRows, courseId]);
  const subjects = useMemo(
    () => dedupeBy(subjectRows, ["fk_subject_id", "subjectId"]),
    [subjectRows],
  );

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      COL_DEFS.sno,
      COL_DEFS.college,
      COL_DEFS.group,
      COL_DEFS.courseYear,
      COL_DEFS.examDate,
      COL_DEFS.subject,
      COL_DEFS.hallticket,
    ],
    [],
  );

  function clearResults() {
    setRows([]);
    setExamLabel("");
    setShowTable(false);
  }

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      try {
        const list = await getGradeMemoIssueFilters(employeeId);
        if (cancelled) return;
        setBaseRows(list);
        const firstCourse = dedupeBy(list, ["fk_course_id", "courseId"])[0];
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
    async function loadRest() {
      if (!courseId || !academicYearId || !examId) {
        setRestRows([]);
        setCollegeId(0);
        setCourseGroupId(0);
        setCourseYearId(0);
        setRegulationId(0);
        return;
      }
      setLoading(true);
      try {
        const rest = await getGradeMemoIssueRestFilters({
          courseId,
          academicYearId,
          examId,
          employeeId,
        });
        if (cancelled) return;
        setRestRows(rest);
        if (skipAutoSelect) {
          setCollegeId(0);
          setCourseGroupId(0);
          setCourseYearId(0);
          setRegulationId(0);
          return;
        }
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
            : 0,
        );
      } catch {
        if (!cancelled) toastError("Failed to load college filters");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadRest();
    return () => {
      cancelled = true;
    };
  }, [courseId, academicYearId, examId, employeeId, skipAutoSelect]);

  useEffect(() => {
    if (skipAutoSelect) return;
    if (collegeId === 0) {
      setCourseGroupId(0);
      return;
    }
    const groups = dedupeBy(
      restRows.filter(
        (r) => numFrom(r, ["fk_college_id", "collegeId"]) === Number(collegeId),
      ),
      ["fk_course_group_id", "courseGroupId"],
    );
    setCourseGroupId(
      groups[0]
        ? numFrom(groups[0], ["fk_course_group_id", "courseGroupId"])
        : 0,
    );
  }, [collegeId, restRows, skipAutoSelect]);

  useEffect(() => {
    if (skipAutoSelect) return;
    if (courseGroupId === 0) {
      setCourseYearId(0);
      return;
    }
    const years = dedupeBy(
      restRows.filter(
        (r) =>
          (collegeId === 0 ||
            numFrom(r, ["fk_college_id", "collegeId"]) === Number(collegeId)) &&
          numFrom(r, ["fk_course_group_id", "courseGroupId"]) ===
            Number(courseGroupId),
      ),
      ["fk_course_year_id", "courseYearId"],
    ).sort(
      (a, b) => Number(a.cy_sort_order ?? 0) - Number(b.cy_sort_order ?? 0),
    );
    setCourseYearId(
      years[0] ? numFrom(years[0], ["fk_course_year_id", "courseYearId"]) : 0,
    );
  }, [courseGroupId, collegeId, restRows, skipAutoSelect]);

  useEffect(() => {
    if (skipAutoSelect) return;
    const regs = dedupeBy(
      restRows.filter(
        (r) =>
          !courseId ||
          numFrom(r, ["fk_course_id", "courseId"]) === Number(courseId),
      ),
      ["fk_regulation_id", "regulationId"],
    );
    setRegulationId(
      regs[0] ? numFrom(regs[0], ["fk_regulation_id", "regulationId"]) : 0,
    );
  }, [courseYearId, restRows, courseId, skipAutoSelect]);

  useEffect(() => {
    let cancelled = false;
    async function loadSubjects() {
      if (!courseId || !academicYearId || !examId) {
        setSubjectRows([]);
        setSubjectId(0);
        return;
      }
      try {
        const list = await getUnivExamSubjectUc({
          collegeId: collegeId || 0,
          courseId,
          courseGroupId: courseGroupId || 0,
          courseYearId: courseYearId || 0,
          examId,
          academicYearId,
          regulationId: regulationId || 0,
          employeeId,
        });
        if (cancelled) return;
        setSubjectRows(list);
        const next = dedupeBy(list, ["fk_subject_id", "subjectId"]);
        if (skipAutoSelect) {
          setSubjectId(0);
          return;
        }
        setSubjectId(
          next[0] ? numFrom(next[0], ["fk_subject_id", "subjectId"]) : 0,
        );
      } catch {
        if (!cancelled) {
          setSubjectRows([]);
          setSubjectId(0);
        }
      }
    }
    void loadSubjects();
    return () => {
      cancelled = true;
    };
  }, [
    courseId,
    academicYearId,
    examId,
    collegeId,
    courseGroupId,
    courseYearId,
    regulationId,
    employeeId,
    skipAutoSelect,
  ]);

  async function handleGetReport() {
    if (!courseId || !examId) {
      toastError("Please select Course and Exam");
      return;
    }
    setLoading(true);
    clearResults();
    try {
      const data = await getExamAbsenteesReport({
        collegeId: collegeId || 0,
        courseId,
        courseGroupId: courseGroupId || 0,
        courseYearId: courseYearId || 0,
        regulationId: regulationId || 0,
        examId,
        subjectId: subjectId || 0,
      });
      if (data.length === 0) {
        toastInfo("No records found");
        return;
      }
      setExamLabel(
        strFrom(data[0] ?? {}, ["exam_label_name", "exam_name"]) ||
          examMasterLabel(
            exams.find(
              (r) => numFrom(r, ["fk_exam_id", "examId"]) === Number(examId),
            ) ?? {},
          ),
      );
      setRows(data);
      setShowTable(true);
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Failed to load report");
    } finally {
      setLoading(false);
    }
  }

  function handleExportExcel() {
    if (rows.length === 0) return;
    const head = `<tr><th>SI.No</th><th>College Code</th><th>Group Code</th><th>Course Year Code</th><th>Exam Date</th><th>Subject Name (Subject Code)</th><th>Hallticket Number</th></tr>`;
    const body = rows
      .map((r, i) => {
        const name = strFrom(r, ["subject_name", "subjectName"]);
        const code = strFrom(r, ["subject_code", "subjectCode"]);
        const subject = name && code ? `${name} (${code})` : name || code;
        return `<tr>
          <td>${i + 1}</td>
          <td>${strFrom(r, ["college_code", "collegeCode"])}</td>
          <td>${strFrom(r, ["group_code", "groupCode"])}</td>
          <td>${strFrom(r, ["course_year_code", "courseYearCode"])}</td>
          <td>${strFrom(r, ["exam_date", "examDate"])}</td>
          <td>${subject}</td>
          <td>${strFrom(r, ["hallticket_number", "hall_ticketno"])}</td>
        </tr>`;
      })
      .join("");
    const title = `<tr><th colspan="7" style="text-align:center;font-size:18px;font-weight:bold;background:#f2f2f2;">Exam Absentees Report</th></tr>`;
    exportHtmlTable("Exam Absentees Report.xls", title, `${head}${body}`);
  }

  function handlePrint() {
    if (rows.length === 0) return;
    const college = colleges.find(
      (r) => numFrom(r, ["fk_college_id", "collegeId"]) === Number(collegeId),
    );
    const rawLogo = printLogoUrl || collegeLogo || DEFAULT_COLLEGE_LOGO;
    printExamAbsenteesReport(rows, {
      title: "Exam Absentees Report",
      examLabel,
      collegeName:
        collegeId > 0
          ? strFrom(college ?? {}, ["college_name", "collegeName"])
          : "",
      logoUrl: toAbsoluteLogoUrl(rawLogo),
    });
  }

  /** Angular: exactly 2 rows — 20/20/60 then 20/20/20/15/30 + Get List */
  const filters = (
    <>
      <div className="inv-allot-report-filters space-y-2">
        <div className="inv-allot-report-filters__row">
          <div className="inv-allot-report-filters__fx20">
            <GlobalFilterField
              label="Course *"
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
          <div className="inv-allot-report-filters__fx20">
            <GlobalFilterField
              label="Exam Year *"
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
          <div className="inv-allot-report-filters__fx60">
            <GlobalFilterField
              label="Exam Master *"
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
        </div>

        <div className="inv-allot-report-filters__row">
          <div className="inv-allot-report-filters__fx15">
            <GlobalFilterField
              label="College *"
              className="global-filter-field--fx12"
            >
              <Select
                value={String(collegeId)}
                onChange={(v) => {
                  setSkipAutoSelect(false);
                  clearResults();
                  setCollegeId(v ? Number(v) : 0);
                }}
                options={[
                  { value: "0", label: "All" },
                  ...colleges.map((r) => ({
                    value: String(numFrom(r, ["fk_college_id", "collegeId"])),
                    label: strFrom(r, [
                      "college_code",
                      "collegeCode",
                      "college_name",
                    ]),
                  })),
                ]}
                placeholder="College"
                searchable
                isLoading={Boolean(examId) && loading}
              />
            </GlobalFilterField>
          </div>
          <div className="inv-allot-report-filters__fx15">
            <GlobalFilterField
              label="Course Group *"
              className="global-filter-field--fx12"
            >
              <Select
                value={String(courseGroupId)}
                onChange={(v) => {
                  setSkipAutoSelect(false);
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
          <div className="inv-allot-report-filters__fx15">
            <GlobalFilterField
              label="Course Years *"
              className="global-filter-field--fx12"
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
                    label: strFrom(r, [
                      "course_year_code",
                      "courseYearCode",
                      "course_year_name",
                    ]),
                  })),
                ]}
                placeholder="Course Year"
                searchable
              />
            </GlobalFilterField>
          </div>
          <div className="inv-allot-report-filters__fx15">
            <GlobalFilterField
              label="Regulation"
              className="global-filter-field--fx10"
            >
              <Select
                value={String(regulationId)}
                onChange={(v) => {
                  clearResults();
                  setRegulationId(v ? Number(v) : 0);
                }}
                options={[
                  { value: "0", label: "All" },
                  ...regulations.map((r) => ({
                    value: String(
                      numFrom(r, ["fk_regulation_id", "regulationId"]),
                    ),
                    label: strFrom(r, ["regulation_code", "regulationCode"]),
                  })),
                ]}
                placeholder="Regulation"
                searchable
              />
            </GlobalFilterField>
          </div>
          <div className="inv-allot-report-filters__fx30">
            <GlobalFilterField
              label="Subject *"
              className="global-filter-field--fx40"
            >
              <Select
                value={String(subjectId)}
                onChange={(v) => {
                  clearResults();
                  setSubjectId(v ? Number(v) : 0);
                }}
                options={[
                  { value: "0", label: "All" },
                  ...subjects.map((r) => ({
                    value: String(numFrom(r, ["fk_subject_id", "subjectId"])),
                    label: `${strFrom(r, ["subject_name", "subjectName"])} (${strFrom(r, ["subject_code", "subjectCode"])})`,
                  })),
                ]}
                placeholder="Subject"
                searchable
              />
            </GlobalFilterField>
          </div>
          <div className="inv-allot-report-filters__fx10">
            <GlobalFilterField
              label=" "
              className="global-filter-field--action global-filter-field--fx10"
            >
              <Button
                type="button"
                className="h-[30px] shrink-0 px-3 text-[12px] w-full"
                onClick={() => void handleGetReport()}
                disabled={loading}
              >
                {loading ? "Loading..." : "Get List"}
              </Button>
            </GlobalFilterField>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <FilteredListPage
      title="Exam Absenties Report"
      filters={filters}
      showTable={showTable}
      rowData={showTable ? rows : []}
      columnDefs={columnDefs}
      loading={loading}
      pagination
      paginationPageSize={25}
      toolbar={TOOLBAR}
      toolbarTrailing={
        showTable && rows.length > 0 ? (
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
        ) : null
      }
      getRowId={(p) => {
        const ht = strFrom(p.data ?? {}, [
          "hallticket_number",
          "hall_ticketno",
        ]);
        const sub = strFrom(p.data ?? {}, ["subject_code", "subjectCode"]);
        const date = strFrom(p.data ?? {}, ["exam_date", "examDate"]);
        return ht ? `${ht}-${sub}-${date}` : `row-${Math.random()}`;
      }}
    />
  );
}
