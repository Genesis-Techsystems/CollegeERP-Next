"use client";

import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { FilteredPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select } from "@/common/components/select";
import { SearchInput } from "@/common/components/search";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { DEFAULT_COLLEGE_LOGO, useCollegeLogo } from "@/hooks/useCollegeLogo";
import {
  getCollegeById,
  getGeneralDetails,
  getGradeMemoIssueFilters,
  getGradeMemoIssueRestFilters,
  getModerationBenefitedStudents,
} from "@/services";
import { GM_CODES } from "@/config/constants/ui";
import { toastError, toastInfo } from "@/lib/toast";
import {
  BookOpen,
  Building2,
  CalendarDays,
  ClipboardList,
  Columns3,
  GraduationCap,
  Layers,
  RefreshCw,
  RotateCcw,
  School,
} from "lucide-react";
import { printModerationBenefitedStudents } from "../_components/printModerationBenefitedStudents";

type AnyRow = Record<string, any>;

type SubjectBucket = {
  subjectId: string;
  subjectName: string;
  students: AnyRow[];
};

type GroupBucket = {
  groupCode: string;
  subjects: SubjectBucket[];
};

const REPORT_TITLE = "Moderation Benefited Students Data";

const REPORT_COLUMNS = [
  { id: "sno", label: "S.No" },
  { id: "hallTicket", label: "Hall Ticket No." },
  { id: "originalMarks", label: "Original Marks" },
  { id: "moderationMarks", label: "Moderation Marks" },
  { id: "finalMarks", label: "Final Marks" },
] as const;

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

/** Angular getDetails grouping: by group_id → subjectId → students. */
function groupModerationRows(rows: AnyRow[]): GroupBucket[] {
  const grouped: Record<
    string,
    { groupCode: string; subjects: Record<string, SubjectBucket> }
  > = {};

  for (const item of rows) {
    const groupKey =
      strFrom(item, ["group_id", "fk_course_group_id", "groupId"]) ||
      strFrom(item, ["group_code", "groupCode"]) ||
      "—";
    const subjectKey =
      strFrom(item, ["subjectId", "subject_id", "fk_subject_id"]) ||
      strFrom(item, ["subject_name", "subject"]) ||
      "—";

    if (!grouped[groupKey]) {
      grouped[groupKey] = {
        groupCode: strFrom(item, ["group_code", "groupCode"]) || groupKey,
        subjects: {},
      };
    }
    if (!grouped[groupKey].subjects[subjectKey]) {
      grouped[groupKey].subjects[subjectKey] = {
        subjectId: subjectKey,
        subjectName: strFrom(item, ["subject_name", "subject"]) || subjectKey,
        students: [],
      };
    }
    grouped[groupKey].subjects[subjectKey].students.push(item);
  }

  return Object.values(grouped).map((g) => ({
    groupCode: g.groupCode,
    subjects: Object.values(g.subjects),
  }));
}

function exportHtmlTable(filename: string, title: string, bodyHtml: string) {
  const template = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Worksheet</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table>${title}${bodyHtml}</table></body></html>`;
  const link = document.createElement("a");
  link.download = filename;
  link.href = `data:application/vnd.ms-excel;base64,${window.btoa(unescape(encodeURIComponent(template)))}`;
  link.click();
}

export default function ModerationBenefitedStudentsReportPage() {
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
  const [printCollegeName, setPrintCollegeName] = useState("");
  const [searchText, setSearchText] = useState("");
  const [visibleColumnIds, setVisibleColumnIds] = useState(
    () => new Set(REPORT_COLUMNS.map((column) => column.id)),
  );

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

  const filteredGroupResults = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return groupResults;

    return groupResults
      .map((group) => ({
        ...group,
        subjects: group.subjects
          .map((subject) => ({
            ...subject,
            students: subject.students.filter((student) =>
              Object.values(student).some((value) =>
                String(value ?? "")
                  .toLowerCase()
                  .includes(query),
              ),
            ),
          }))
          .filter((subject) => subject.students.length > 0),
      }))
      .filter((group) => group.subjects.length > 0);
  }, [groupResults, searchText]);

  const filteredRowCount = useMemo(
    () =>
      filteredGroupResults.reduce(
        (groupTotal, group) =>
          groupTotal +
          group.subjects.reduce(
            (subjectTotal, subject) => subjectTotal + subject.students.length,
            0,
          ),
        0,
      ),
    [filteredGroupResults],
  );

  function clearResults() {
    setGroupResults([]);
    setDataDetails("");
    setExamLabel("");
    setPrintCollegeName("");
    setSearchText("");
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
      const rows = await getModerationBenefitedStudents({
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
      const examRow =
        exams.find(
          (r) => numFrom(r, ["fk_exam_id", "examId"]) === Number(examId),
        ) ?? {};
      // Angular: exam = result[0][0].exam_label_name; courseYear = course_year_name
      const examName =
        strFrom(rows[0] ?? {}, ["exam_label_name", "exam_name"]) ||
        strFrom(examRow, ["exam_name", "examName"]);
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
                "course_year_code",
                "courseYearCode",
                "course_year_name",
                "courseYearName",
              ])
            : "",
          examName,
        ]
          .filter(Boolean)
          .join(" / "),
      );

      const collegeRecord = await getCollegeById(Number(collegeId)).catch(
        () => null,
      );
      setPrintCollegeName(
        strFrom(collegeRecord ?? {}, ["collegeName", "college_name"]) ||
          strFrom(college ?? {}, ["college_name", "collegeName"]),
      );

      setGroupResults(groupModerationRows(rows));
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
        const groupHeader = `<tr><td colspan="5"><b>Course Group: ${group.groupCode}</b></td></tr>`;
        const subjects = group.subjects
          .map((subj) => {
            const subHeader = `<tr><td colspan="5"><b>Subject : ${subj.subjectName}</b></td></tr>`;
            const head = `<tr><th>S.No</th><th>Hall Ticket No.</th><th>Original Marks</th><th>Moderation Marks</th><th>Final Marks</th></tr>`;
            const body = subj.students
              .map(
                (s, i) =>
                  `<tr><td>${i + 1}</td><td>${strFrom(s, ["hall_ticketno", "hallticket_number"])}</td><td>${strFrom(s, ["ext_marks"])}</td><td>${strFrom(s, ["moderation_marks_added"])}</td><td>${strFrom(s, ["moderated_ext_marks"])}</td></tr>`,
              )
              .join("");
            return `${subHeader}${head}${body}`;
          })
          .join("");
        return `${groupHeader}${subjects}`;
      })
      .join("");
    const title = `<tr><th colspan="5" style="text-align:center;font-size:18px;font-weight:bold;background:#f2f2f2;">${REPORT_TITLE}${dataDetails ? ` (${dataDetails})` : ""}</th></tr>`;
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
    printModerationBenefitedStudents(groupResults, {
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
                className="text-[15px] font-medium"
                style={{ color: "#042956" }}
              >
                {dataDetails}
              </span>
            ) : null}
          </div>
        ) : null
      }
      bodyClassName="overflow-hidden !border !border-border !bg-white !shadow-md"
      filters={
        <div className="inv-allot-report-filters space-y-2">
          <div className="inv-allot-report-filters__row">
            <div className="inv-allot-report-filters__fx15">
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
            <div className="inv-allot-report-filters__fx13">
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
            <div className="inv-allot-report-filters__fx15">
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
            <div className="inv-allot-report-filters__fx20 flex items-center self-end pb-0.5">
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
          <div className="space-y-4">
            <div className="app-data-table-toolbar flex flex-row flex-wrap items-center justify-between gap-x-3 gap-y-2">
              <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-x-3">
                <SearchInput
                  value={searchText}
                  onChange={setSearchText}
                  placeholder="Search..."
                  className="min-w-0 w-full max-w-md"
                />
                <span className="inline-flex shrink-0 items-center rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground tabular-nums">
                  {filteredRowCount} {filteredRowCount === 1 ? "row" : "rows"}
                </span>
              </div>
              <div className="flex shrink-0 flex-nowrap items-center justify-end gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="app-data-table-toolbar-btn h-[30px] px-3 text-[12px]"
                    >
                      <Columns3 className="mr-1.5 h-3.5 w-3.5" />
                      Columns
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel className="text-[12px]">
                      Toggle columns
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {REPORT_COLUMNS.map((column) => {
                      const checked = visibleColumnIds.has(column.id);
                      return (
                        <DropdownMenuCheckboxItem
                          key={column.id}
                          checked={checked}
                          disabled={checked && visibleColumnIds.size === 1}
                          className="text-[12px]"
                          onCheckedChange={(nextChecked) => {
                            setVisibleColumnIds((current) => {
                              const next = new Set(current);
                              if (nextChecked) next.add(column.id);
                              else if (next.size > 1) next.delete(column.id);
                              return next;
                            });
                          }}
                        >
                          {column.label}
                        </DropdownMenuCheckboxItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
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
            </div>

            <div className="space-y-5">
              {filteredGroupResults.map((group) => (
                <div key={group.groupCode} className="space-y-3">
                  <p className="text-sm font-semibold text-[#042956]">
                    Course Group: {group.groupCode}
                  </p>
                  {group.subjects.map((subj) => (
                    <div
                      key={`${group.groupCode}-${subj.subjectId}`}
                      className="space-y-2"
                    >
                      <p className="text-sm font-medium text-[#042956]">
                        Subject : {subj.subjectName}
                      </p>
                      {/* Angular MatTable parity — plain HTML table (AG Grid autoHeight collapses when pagination is off) */}
                      <div className="w-full overflow-x-auto">
                        <table className="mbs-subject-table w-full border-collapse text-[13px]">
                          <thead>
                            <tr>
                              {visibleColumnIds.has("sno") ? (
                                <th>S.No</th>
                              ) : null}
                              {visibleColumnIds.has("hallTicket") ? (
                                <th>Hall Ticket No.</th>
                              ) : null}
                              {visibleColumnIds.has("originalMarks") ? (
                                <th>Original Marks</th>
                              ) : null}
                              {visibleColumnIds.has("moderationMarks") ? (
                                <th>Moderation Marks</th>
                              ) : null}
                              {visibleColumnIds.has("finalMarks") ? (
                                <th>Final Marks</th>
                              ) : null}
                            </tr>
                          </thead>
                          <tbody>
                            {subj.students.map((student, i) => (
                              <tr
                                key={`${group.groupCode}-${subj.subjectId}-${strFrom(student, ["hall_ticketno", "hallticket_number"]) || i}`}
                              >
                                {visibleColumnIds.has("sno") ? (
                                  <td className="text-center">{i + 1}</td>
                                ) : null}
                                {visibleColumnIds.has("hallTicket") ? (
                                  <td>
                                    {strFrom(student, [
                                      "hall_ticketno",
                                      "hallticket_number",
                                    ]) || "—"}
                                  </td>
                                ) : null}
                                {visibleColumnIds.has("originalMarks") ? (
                                  <td>
                                    {strFrom(student, ["ext_marks"]) || "—"}
                                  </td>
                                ) : null}
                                {visibleColumnIds.has("moderationMarks") ? (
                                  <td>
                                    {strFrom(student, [
                                      "moderation_marks_added",
                                    ]) || "—"}
                                  </td>
                                ) : null}
                                {visibleColumnIds.has("finalMarks") ? (
                                  <td>
                                    {strFrom(student, [
                                      "moderated_ext_marks",
                                    ]) || "—"}
                                  </td>
                                ) : null}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : null
      }
    />
  );
}
