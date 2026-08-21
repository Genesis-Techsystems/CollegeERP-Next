"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef, ColGroupDef } from "ag-grid-community";
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
  getGradeMemoIssueFilters,
  getGradeMemoIssueRestFilters,
  getStudentWiseGradePointAnalysis,
  getStudentWiseGradePointReport,
  searchStudentsByKeyword,
} from "@/services";
import { toastError, toastInfo } from "@/lib/toast";
import { useCollegeLogo } from "@/hooks/useCollegeLogo";
import {
  BookOpen,
  Building2,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  Layers,
  Printer,
  RotateCcw,
  School,
} from "lucide-react";
import { printStudentWiseGradePointReport } from "../_components/printStudentWiseGradePointReport";

type AnyRow = Record<string, any>;
type StudentSubjectRows = AnyRow[];

const TOOLBAR = {
  search: true,
  searchPlaceholder: "Search roll no",
  columnPicker: true,
  exportPdf: false,
  exportExcel: true,
  excelDocumentTitle: "Grade And Grade Points Report",
  excelFileName: "Grade And Grade Points Report.xls",
} as const;

const ANALYSIS_TOOLBAR = {
  search: true,
  searchPlaceholder: "Search subject",
  columnPicker: true,
  exportPdf: false,
  exportExcel: true,
  excelDocumentTitle: "Subject Wise Analysis",
  excelFileName: "Subject Wise Analysis.xls",
} as const;

const ALL_STUDENTS = "__all__";

function parseMaybeDate(v: unknown): string {
  const s = String(v ?? "").trim();
  if (!s) return "";
  try {
    if (/^\d{4}-\d{2}-\d{2}/.test(s))
      return format(parseISO(s.slice(0, 10)), "dd MMM, yyyy");
    return format(new Date(s), "dd MMM, yyyy");
  } catch {
    return s;
  }
}

function examMasterLabel(r: AnyRow): string {
  const name = strFrom(r, ["exam_name", "examName"]) || "Exam";
  const from = parseMaybeDate(r.from_date ?? r.fromDate);
  const to = parseMaybeDate(r.to_date ?? r.toDate);
  const range = from && to ? ` (${from} - ${to})` : "";
  const tags = [
    r.is_internal_exam ? "Internal" : "",
    r.is_regular_exam ? "Regular" : "",
    r.is_supply_exam ? "Supple" : "",
  ]
    .filter(Boolean)
    .join(", ");
  const suffix = tags ? ` (${tags})` : "";
  return `${name}${range}${suffix}`;
}

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

function groupByHallTicket(flatRows: AnyRow[]): StudentSubjectRows[] {
  const seen = new Set<string>();
  const order: string[] = [];
  for (const r of flatRows) {
    const key = strFrom(r, ["hallticket_number", "hall_ticketno"]);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    order.push(key);
  }
  return order.map((ht) =>
    flatRows.filter(
      (r) => strFrom(r, ["hallticket_number", "hall_ticketno"]) === ht,
    ),
  );
}

function uniqueSubjectCodes(flatRows: AnyRow[]): { subject_code: string }[] {
  const codes: string[] = [];
  for (const r of flatRows) {
    const code = strFrom(r, ["subject_code"]);
    if (code && !codes.includes(code)) codes.push(code);
  }
  return codes.map((subject_code) => ({ subject_code }));
}

function findMarks(list: AnyRow[], subjectCode: string, field: string): string {
  const item = list.find((x) => strFrom(x, ["subject_code"]) === subjectCode);
  if (!item) return " ";
  const v = item[field];
  return v == null || String(v).trim() === "" ? " " : String(v);
}

function flattenGradePointRows(
  groups: StudentSubjectRows[],
  codes: string[],
): AnyRow[] {
  return groups.map((list) => {
    const first = list[0] ?? {};
    const row: AnyRow = {
      hallticket_number: strFrom(first, ["hallticket_number", "hall_ticketno"]),
      sgpa: strFrom(first, ["sgpa"]) || " ",
      total_fail_subjects: strFrom(first, ["total_fail_subjects"]) || " ",
      failed_subjects: strFrom(first, ["failed_subjects"]) || " ",
    };
    for (const code of codes) {
      row[`${code}__points`] = findMarks(list, code, "grade_points");
      row[`${code}__grade`] = findMarks(list, code, "grade");
    }
    return row;
  });
}

export default function StudentWiseGradePointReportPage() {
  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );

  const [loading, setLoading] = useState(false);
  const [baseRows, setBaseRows] = useState<AnyRow[]>([]);
  const [restRows, setRestRows] = useState<AnyRow[]>([]);

  const [courseId, setCourseId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [examId, setExamId] = useState<number | null>(null);
  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null);
  const [courseYearId, setCourseYearId] = useState<number | null>(null);
  const [hallTicketNo, setHallTicketNo] = useState(ALL_STUDENTS);
  const [studentOptions, setStudentOptions] = useState<AnyRow[]>([]);
  const [studentSearchLoading, setStudentSearchLoading] = useState(false);
  const [skipAutoSelect, setSkipAutoSelect] = useState(false);

  const [mainList, setMainList] = useState<StudentSubjectRows[]>([]);
  const [subjectCodes, setSubjectCodes] = useState<{ subject_code: string }[]>(
    [],
  );
  const [analysisRows, setAnalysisRows] = useState<AnyRow[]>([]);
  const [collegeBannerName, setCollegeBannerName] = useState("");

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
            numFrom(r, ["fk_course_group_id", "courseGroupId"]) ===
              Number(courseGroupId),
        ),
        ["fk_course_year_id", "courseYearId"],
      ).sort(
        (a, b) => Number(a.cy_sort_order ?? 0) - Number(b.cy_sort_order ?? 0),
      ),
    [restRows, collegeId, courseGroupId],
  );

  const codes = useMemo(
    () => subjectCodes.map((s) => s.subject_code),
    [subjectCodes],
  );

  const tableRows = useMemo(
    () => flattenGradePointRows(mainList, codes),
    [mainList, codes],
  );

  const columnDefs = useMemo<(ColDef<AnyRow> | ColGroupDef<AnyRow>)[]>(() => {
    const fixed: ColDef<AnyRow>[] = [
      {
        headerName: "ROLL NO",
        field: "hallticket_number",
        minWidth: 160,
        flex: 1,
        pinned: "left",
      },
    ];
    const groups: ColGroupDef<AnyRow>[] = codes.map((code) => ({
      headerName: code,
      headerClass: "app-table-header-group",
      marryChildren: true,
      children: [
        {
          headerName: "Points",
          colId: `${code}__points`,
          minWidth: 72,
          flex: 0.5,
          cellClass: "text-center",
          valueGetter: (p) => String(p.data?.[`${code}__points`] ?? " "),
        },
        {
          headerName: "Grade",
          colId: `${code}__grade`,
          minWidth: 72,
          flex: 0.5,
          cellClass: "text-center",
          valueGetter: (p) => String(p.data?.[`${code}__grade`] ?? " "),
        },
      ],
    }));
    const tail: ColDef<AnyRow>[] = [
      {
        headerName: "SGPA",
        field: "sgpa",
        minWidth: 80,
        flex: 0.6,
        cellClass: "text-center",
      },
      {
        headerName: "Fail Count",
        field: "total_fail_subjects",
        minWidth: 100,
        flex: 0.7,
        cellClass: "text-center",
      },
      {
        headerName: "Failed Subjects",
        field: "failed_subjects",
        minWidth: 160,
        flex: 1.2,
      },
    ];
    return [...fixed, ...groups, ...tail];
  }, [codes]);

  const analysisColumnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      {
        headerName: "Subject Name",
        minWidth: 220,
        flex: 1.5,
        valueGetter: (p) => strFrom(p.data ?? {}, ["subject_name"]) || " ",
      },
      {
        headerName: "Total Failures",
        minWidth: 120,
        flex: 0.8,
        cellClass: "text-center",
        valueGetter: (p) => strFrom(p.data ?? {}, ["TotalFailures"]) || " ",
      },
      {
        headerName: "Pass %",
        minWidth: 90,
        flex: 0.7,
        cellClass: "text-center",
        valueGetter: (p) => {
          const v = strFrom(p.data ?? {}, ["Pass%age"]);
          return v ? `${v}%` : " ";
        },
      },
      {
        headerName: "Absent",
        minWidth: 90,
        flex: 0.7,
        cellClass: "text-center",
        valueGetter: (p) => strFrom(p.data ?? {}, ["Absent"]) || " ",
      },
      {
        headerName: "75% - 100%",
        minWidth: 110,
        flex: 0.9,
        cellClass: "text-center",
        valueGetter: (p) =>
          strFrom(p.data ?? {}, ["B/w75%-100%(10pts-8pts)"]) || " ",
      },
      {
        headerName: "60% - 75%",
        minWidth: 110,
        flex: 0.9,
        cellClass: "text-center",
        valueGetter: (p) =>
          strFrom(p.data ?? {}, ["B/w60%-75%(7pts-6pts)"]) || " ",
      },
      {
        headerName: "40% - 60%",
        minWidth: 110,
        flex: 0.9,
        cellClass: "text-center",
        valueGetter: (p) =>
          strFrom(p.data ?? {}, ["B/w40%-60%(5pts-4pts)"]) || " ",
      },
      {
        headerName: "< 40%",
        minWidth: 90,
        flex: 0.7,
        cellClass: "text-center",
        valueGetter: (p) =>
          strFrom(p.data ?? {}, ["<40%(Lessthan4pts)"]) || " ",
      },
    ],
    [],
  );

  const getRowId = useCallback(
    (p: { data?: AnyRow }) =>
      strFrom(p.data ?? {}, ["hallticket_number"]) || `row-${Math.random()}`,
    [],
  );

  const getAnalysisRowId = useCallback(
    (p: { data?: AnyRow }) =>
      strFrom(p.data ?? {}, ["subject_name"]) || `analysis-${Math.random()}`,
    [],
  );

  function clearResults() {
    setMainList([]);
    setSubjectCodes([]);
    setAnalysisRows([]);
  }

  function resetStudentFilter() {
    setHallTicketNo(ALL_STUDENTS);
    setStudentOptions([]);
  }

  const selectedCourse = useMemo(
    () =>
      courses.find(
        (r) => numFrom(r, ["fk_course_id", "courseId"]) === Number(courseId),
      ) ?? null,
    [courses, courseId],
  );
  const selectedCourseYear = useMemo(
    () =>
      courseYears.find(
        (r) =>
          numFrom(r, ["fk_course_year_id", "courseYearId"]) ===
          Number(courseYearId),
      ) ?? null,
    [courseYears, courseYearId],
  );
  const selectedCollege = useMemo(
    () =>
      colleges.find(
        (r) => numFrom(r, ["fk_college_id", "collegeId"]) === Number(collegeId),
      ) ?? null,
    [colleges, collegeId],
  );
  const collegeLogo = useCollegeLogo(collegeId);
  const selectedCourseGroup = useMemo(
    () =>
      courseGroups.find(
        (r) =>
          numFrom(r, ["fk_course_group_id", "courseGroupId"]) ===
          Number(courseGroupId),
      ) ?? null,
    [courseGroups, courseGroupId],
  );
  const selectedExam = useMemo(
    () =>
      exams.find(
        (r) => numFrom(r, ["fk_exam_id", "examId"]) === Number(examId),
      ) ?? null,
    [exams, examId],
  );

  const dataDetails = useMemo(() => {
    if (mainList.length === 0) return "";
    return [
      strFrom(selectedCollege ?? {}, ["college_code", "collegeCode"]),
      strFrom(selectedCourse ?? {}, ["course_code", "courseCode"]),
      strFrom(selectedCourseGroup ?? {}, [
        "group_code",
        "groupCode",
        "course_group_code",
      ]),
      strFrom(selectedCourseYear ?? {}, [
        "course_year_code",
        "courseYearCode",
        "course_year_name",
      ]),
      strFrom(selectedExam ?? {}, ["exam_name", "examName"]),
    ]
      .filter(Boolean)
      .join(" / ");
  }, [
    mainList.length,
    selectedCollege,
    selectedCourse,
    selectedCourseGroup,
    selectedCourseYear,
    selectedExam,
  ]);

  const studentSelectOptions = useMemo(() => {
    const opts = [{ value: ALL_STUDENTS, label: "All" }];
    const seen = new Set<string>();
    if (
      hallTicketNo &&
      hallTicketNo !== ALL_STUDENTS &&
      !seen.has(hallTicketNo)
    ) {
      seen.add(hallTicketNo);
      opts.push({ value: hallTicketNo, label: hallTicketNo });
    }
    for (const s of studentOptions) {
      const ht = strFrom(s, [
        "hallticketNumber",
        "hall_ticketno",
        "hallticket_number",
      ]);
      if (!ht || seen.has(ht)) continue;
      seen.add(ht);
      const name = strFrom(s, ["firstName", "studentName"]);
      opts.push({
        value: ht,
        label: name ? `${ht} (${name})` : ht,
      });
    }
    return opts;
  }, [studentOptions, hallTicketNo]);

  async function searchStudents(term: string) {
    const q = term.trim();
    if (!q || q.length <= 4) {
      setStudentOptions([]);
      return;
    }
    setStudentSearchLoading(true);
    try {
      const rows = await searchStudentsByKeyword(q);
      setStudentOptions(Array.isArray(rows) ? rows : []);
    } catch {
      setStudentOptions([]);
    } finally {
      setStudentSearchLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    const fallback = strFrom(selectedCollege ?? {}, [
      "college_name",
      "collegeName",
    ]);

    if (!collegeId) {
      setCollegeBannerName(fallback);
      return;
    }

    getCollegeById(collegeId)
      .then((college) => {
        if (cancelled) return;
        setCollegeBannerName(
          strFrom(college ?? {}, ["collegeName", "college_name"]) || fallback,
        );
      })
      .catch(() => {
        if (!cancelled) setCollegeBannerName(fallback);
      });

    return () => {
      cancelled = true;
    };
  }, [collegeId, selectedCollege]);

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
    async function loadRest() {
      if (!courseId || !academicYearId || !examId) {
        setRestRows([]);
        setCollegeId(null);
        setCourseGroupId(null);
        setCourseYearId(null);
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
          setCollegeId(null);
          setCourseGroupId(null);
          setCourseYearId(null);
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
            : null,
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
    if (!collegeId) {
      setCourseGroupId(null);
      setCourseYearId(null);
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
      : null;
    setCourseGroupId(nextGroupId);
  }, [collegeId, restRows, skipAutoSelect]);

  useEffect(() => {
    if (!collegeId || !courseGroupId) {
      setCourseYearId(null);
      return;
    }
    if (skipAutoSelect) return;
    const years = dedupeBy(
      restRows.filter(
        (r) =>
          numFrom(r, ["fk_college_id", "collegeId"]) === Number(collegeId) &&
          numFrom(r, ["fk_course_group_id", "courseGroupId"]) ===
            Number(courseGroupId),
      ),
      ["fk_course_year_id", "courseYearId"],
    ).sort(
      (a, b) => Number(a.cy_sort_order ?? 0) - Number(b.cy_sort_order ?? 0),
    );
    setCourseYearId(
      years[0]
        ? numFrom(years[0], ["fk_course_year_id", "courseYearId"])
        : null,
    );
  }, [courseGroupId, collegeId, restRows, skipAutoSelect]);

  async function handleGetReport() {
    if (!courseId || !examId || !collegeId || !courseGroupId || !courseYearId) {
      toastError("Please select Course, Exam, College, Group, and Year");
      return;
    }
    setLoading(true);
    clearResults();
    try {
      const [flatRows, statsRows] = await Promise.all([
        getStudentWiseGradePointReport({
          examId,
          collegeId,
          courseId,
          courseGroupId,
          courseYearId,
          hallTicketNo:
            hallTicketNo === ALL_STUDENTS
              ? undefined
              : hallTicketNo.trim() || undefined,
        }),
        getStudentWiseGradePointAnalysis({
          examId,
          collegeId,
          courseId,
          courseGroupId,
          courseYearId,
        }),
      ]);
      if (flatRows.length === 0) {
        toastInfo("No records found");
        return;
      }

      setSubjectCodes(uniqueSubjectCodes(flatRows));
      setMainList(groupByHallTicket(flatRows));
      setAnalysisRows(statsRows);
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
    setCollegeId(null);
    setCourseGroupId(null);
    setCourseYearId(null);
    setRestRows([]);
    resetStudentFilter();
    clearResults();
  }

  const handlePrint = useCallback(() => {
    if (mainList.length === 0) return;
    printStudentWiseGradePointReport(mainList, {
      title: "Student wise grade point report",
      collegeName:
        collegeBannerName ||
        strFrom(selectedCollege ?? {}, ["college_name", "collegeName"]),
      logoUrl: collegeLogo,
      details: strFrom(selectedExam ?? {}, ["exam_name", "examName"]),
      branchLabel: strFrom(selectedCourseGroup ?? {}, [
        "group_code",
        "groupCode",
        "course_group_code",
      ]),
      subjectCodes: codes,
      analysisRows,
    });
  }, [
    mainList,
    collegeBannerName,
    selectedCollege,
    collegeLogo,
    selectedExam,
    selectedCourseGroup,
    codes,
    analysisRows,
  ]);

  return (
    <FilteredPage
      title="Grade And Grade Points Report"
      filters={
        <div className="space-y-3">
          {/* Angular fxFlex: Course 20 / Exam Year 20 / Exam Master 60 */}
          <GlobalFilterBarRow className="global-filter-bar__row--mbs-r1">
            <GlobalFilterField
              label="Course"
              icon={GraduationCap}
              className="global-filter-field--fx20"
            >
              <Select
                value={courseId ? String(courseId) : null}
                onChange={(v) => {
                  setSkipAutoSelect(false);
                  clearResults();
                  resetStudentFilter();
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
            <GlobalFilterField
              label="Exam Year"
              icon={CalendarDays}
              className="global-filter-field--fx20"
            >
              <Select
                value={academicYearId ? String(academicYearId) : null}
                onChange={(v) => {
                  setSkipAutoSelect(false);
                  clearResults();
                  resetStudentFilter();
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
            <GlobalFilterField
              label="Exam Master"
              icon={ClipboardList}
              className="global-filter-field--fx60"
            >
              <Select
                value={examId ? String(examId) : null}
                onChange={(v) => {
                  setSkipAutoSelect(false);
                  clearResults();
                  resetStudentFilter();
                  setExamId(v ? Number(v) : null);
                }}
                options={exams.map((r) => ({
                  value: String(numFrom(r, ["fk_exam_id", "examId"])),
                  label: examMasterLabel(r),
                }))}
                placeholder="Exam Master"
                searchable
              />
            </GlobalFilterField>
          </GlobalFilterBarRow>

          <GlobalFilterBarRow>
            <GlobalFilterField label="College" icon={Building2}>
              <Select
                value={collegeId ? String(collegeId) : null}
                onChange={(v) => {
                  setSkipAutoSelect(false);
                  clearResults();
                  resetStudentFilter();
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
                isLoading={Boolean(examId) && loading}
              />
            </GlobalFilterField>
            <GlobalFilterField label="Course Group" icon={School}>
              <Select
                value={courseGroupId ? String(courseGroupId) : null}
                onChange={(v) => {
                  setSkipAutoSelect(false);
                  clearResults();
                  resetStudentFilter();
                  setCourseGroupId(v ? Number(v) : null);
                }}
                options={courseGroups.map((r) => ({
                  value: String(
                    numFrom(r, ["fk_course_group_id", "courseGroupId"]),
                  ),
                  label: strFrom(r, [
                    "group_code",
                    "groupCode",
                    "course_group_code",
                  ]),
                }))}
                placeholder="Course Group"
                searchable
              />
            </GlobalFilterField>
            <GlobalFilterField label="Course Years" icon={Layers}>
              <Select
                value={courseYearId ? String(courseYearId) : null}
                onChange={(v) => {
                  clearResults();
                  resetStudentFilter();
                  setCourseYearId(v ? Number(v) : null);
                }}
                options={courseYears.map((r) => ({
                  value: String(
                    numFrom(r, ["fk_course_year_id", "courseYearId"]),
                  ),
                  label: strFrom(r, [
                    "course_year_code",
                    "courseYearCode",
                    "course_year_name",
                  ]),
                }))}
                placeholder="Course Years"
                searchable
              />
            </GlobalFilterField>
            <GlobalFilterField label="Student" icon={BookOpen}>
              <Select
                value={hallTicketNo || ALL_STUDENTS}
                onChange={(v) => {
                  clearResults();
                  setHallTicketNo(v ?? ALL_STUDENTS);
                }}
                options={studentSelectOptions}
                placeholder="Student"
                searchable
                onSearch={searchStudents}
                isLoading={studentSearchLoading}
              />
            </GlobalFilterField>
            <div className="ml-auto flex shrink-0 flex-wrap items-center gap-3 self-end pb-0.5">
              <Button
                type="button"
                className="h-8 text-[12px]"
                onClick={() => void handleGetReport()}
                disabled={loading}
              >
                {loading ? "Loading..." : "Get Report"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-8 gap-1.5 text-[12px]"
                onClick={handleReset}
                title="Reset"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </Button>
            </div>
          </GlobalFilterBarRow>
        </div>
      }
      body={
        mainList.length > 0 ? (
          <div className="space-y-4">
            {dataDetails ? (
              <p className="text-right text-sm font-medium text-primary">
                {dataDetails}
              </p>
            ) : null}
            <DataTable
              title=""
              subtitle=""
              bordered={false}
              rowData={tableRows}
              columnDefs={columnDefs}
              loading={loading}
              pagination
              paginationPageSize={25}
              getRowId={getRowId}
              fitColumnsToWidth={false}
              toolbar={TOOLBAR}
              toolbarTrailing={
                <Button
                  type="button"
                  size="sm"
                  className="h-9 text-[12px]"
                  onClick={handlePrint}
                >
                  <Printer className="mr-1.5 h-3.5 w-3.5" />
                  Print Report
                </Button>
              }
            />

            {analysisRows.length > 0 ? (
              <DataTable
                title="Subject Wise Analysis"
                subtitle=""
                bordered={false}
                rowData={analysisRows}
                columnDefs={analysisColumnDefs}
                loading={loading}
                pagination
                paginationPageSize={25}
                getRowId={getAnalysisRowId}
                fitColumnsToWidth={false}
                height="auto"
                toolbar={ANALYSIS_TOOLBAR}
              />
            ) : null}
          </div>
        ) : null
      }
    />
  );
}
