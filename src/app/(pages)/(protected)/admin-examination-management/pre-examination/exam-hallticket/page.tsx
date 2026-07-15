"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select } from "@/common/components/select";
import { StudentSearchSelect } from "@/common/components/student-search";
import defaultStudent from "@/assets/images/avatars/default_Student.png";
import { format, parseISO } from "date-fns";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import {
  getExamHalltickets,
  listExamMastersByCourse,
  getUnivExamFiltersRegSup,
  getUnivExamRestNoTt,
  listStudents,
} from "@/services/pre-examination";
import { FilteredListPage } from "@/components/layout";
import { useSessionContext } from "@/context/SessionContext";
import { useHallticketPrint } from "./_print/useHallticketPrint";
import { Printer } from "lucide-react";

type AnyRow = Record<string, any>;

// ── Column shape ─────────────────────────────────────────────────────────────
function formatExamDateDisplay(value: unknown): string {
  if (value == null || value === "") return "-";
  const raw = String(value).trim();
  if (!raw) return "-";
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    try {
      return format(parseISO(raw), "dd MMM yyyy");
    } catch {
      return raw;
    }
  }
  return raw;
}

function formatExamTimeDisplay(row: AnyRow | undefined): string {
  const start = String(
    pick(row ?? {}, ["session_start_time", "sessionStartTime", "start_time"]),
  ).trim();
  const end = String(
    pick(row ?? {}, ["session_end_time", "sessionEndTime", "end_time"]),
  ).trim();
  if (!start || !end) return "-";
  const startFmt = tConvert(start);
  const endFmt = tConvert(end);
  if (!startFmt || !endFmt) return "-";
  return `${startFmt} - ${endFmt}`;
}

const STUDENT_HALLTICKET_COL_DEFS: ColDef[] = [
  {
    headerName: "SI.No",
    valueGetter: (p: any) => (p.node?.rowIndex ?? 0) + 1,
    width: 70,
    flex: 0,
  },
  {
    headerName: "Exam Date",
    width: 120,
    flex: 0,
    valueGetter: (p: any) => pick(p.data, ["exam_date", "examDate"]),
    valueFormatter: (p: any) => formatExamDateDisplay(p.value),
  },
  {
    headerName: "Exam Time",
    width: 160,
    flex: 0,
    valueGetter: (p: any) => formatExamTimeDisplay(p.data),
  },
  { field: "subject_code", headerName: "Subject Code", minWidth: 130 },
  { field: "subject_name", headerName: "Subject Name", flex: 1, minWidth: 160 },
  { field: "subjecttype", headerName: " Subject Type", width: 90, flex: 0 },
];

function makeSectionPrintRenderer(onPrint: (rows: AnyRow[]) => void) {
  return (p: ICellRendererParams) => (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="h-7 w-7 p-0"
      onClick={() => onPrint((p.data?._subjectRows as AnyRow[]) ?? [])}
      aria-label="Print hallticket"
    >
      <Printer className="h-3.5 w-3.5" />
    </Button>
  );
}

const dedupeBy = <T,>(rows: T[], keyFn: (r: T) => string | number) => {
  const seen = new Set<string | number>();
  return rows.filter((r) => {
    const key = keyFn(r);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const tConvert = (time?: string) => {
  const raw = String(time ?? "").trim();
  const m = raw.match(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
  if (!m) return "";
  const hour24 = Number(m[1]);
  const mins = m[2];
  const ampm = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${mins} ${ampm}`;
};

const formatRangeDate = (value?: string) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const pick = (row: AnyRow, keys: string[]) => {
  for (const k of keys) {
    const v = row?.[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return "";
};

const flattenRows = (input: unknown): AnyRow[] => {
  if (!Array.isArray(input)) return [];
  const out: AnyRow[] = [];
  for (const item of input) {
    if (Array.isArray(item)) out.push(...flattenRows(item));
    else if (item && typeof item === "object") out.push(item as AnyRow);
  }
  return out;
};

const normalizeHallticketRows = (input: unknown): AnyRow[] => {
  const flat = flattenRows(input);
  const out: AnyRow[] = [];
  for (const row of flat) {
    const nested =
      row.subjectDTOList ??
      row.subjects ??
      row.examStudentDetailDTOs ??
      row.examStudentDetails ??
      row.examStudentDetailList;
    if (Array.isArray(nested) && nested.length > 0) {
      for (const s of nested) {
        out.push({
          ...row,
          ...s,
          exam_month_yr:
            s.exam_month_yr ??
            s.examMonthYr ??
            row.exam_month_yr ??
            row.examMonthYr ??
            "",
          exam_date:
            s.exam_date ??
            s.examDate ??
            s.exam_month_yr ??
            s.examMonthYr ??
            row.exam_date ??
            row.examDate ??
            row.exam_month_yr ??
            row.examMonthYr ??
            row.fromDate,

          session_start_time:
            s.session_start_time ??
            s.sessionStartTime ??
            s.start_time ??
            row.session_start_time ??
            row.sessionStartTime ??
            row.start_time,
          session_end_time:
            s.session_end_time ??
            s.sessionEndTime ??
            s.end_time ??
            row.session_end_time ??
            row.sessionEndTime ??
            row.end_time,
          subject_code:
            s.subject_code ??
            s.subjectCode ??
            row.subject_code ??
            row.subjectCode,
          subject_name:
            s.subject_name ??
            s.subjectName ??
            row.subject_name ??
            row.subjectName,
          subjecttype:
            s.subjecttype ??
            s.subjectType ??
            row.subjecttype ??
            row.subjectType,
        });
      }
      continue;
    }
    out.push(row);
  }
  return out;
};

const hallticketKey = (row: AnyRow) =>
  String(row.hallticket_number ?? row.hallticketNumber ?? "").trim();

/** Angular getHallTickets section mode — group flat subject rows per student. */
function buildSectionMainList(rows: AnyRow[]): AnyRow[][] {
  if (!rows.length) return [];

  const seen = new Set<string>();
  const uniqueStudents: AnyRow[] = [];
  for (const row of rows) {
    const key = hallticketKey(row);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    uniqueStudents.push(row);
  }

  uniqueStudents.sort((a, b) =>
    hallticketKey(a).localeCompare(hallticketKey(b)),
  );

  return uniqueStudents.map((studentRow) => {
    const key = hallticketKey(studentRow);
    return rows
      .filter((r) => hallticketKey(r) === key)
      .sort(
        (a, b) =>
          Number(a.order_no ?? a.orderNo ?? 0) -
          Number(b.order_no ?? b.orderNo ?? 0),
      );
  });
}

function toSectionTableRows(mainList: AnyRow[][]): AnyRow[] {
  return mainList.map((group) => {
    const head = group[0] ?? {};
    return {
      hallticket_number: hallticketKey(head) || "-",
      first_name:
        head.first_name ??
        head.firstName ??
        head.student_name ??
        head.studentName ??
        "-",
      _subjectRows: group,
    };
  });
}

function filterAmsLabRows(rows: AnyRow[], orgCode: string): AnyRow[] {
  if (orgCode !== "AMS") return rows;
  return rows.filter(
    (r) => String(r.subjecttype ?? r.subjectType ?? "") !== "LAB",
  );
}

export default function ExamHallticketPage() {
  const [mode, setMode] = useState<"student" | "section">("student");
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const [students, setStudents] = useState<AnyRow[]>([]);
  const [studentId, setStudentId] = useState<number | null>(null);
  const [studentSearchLoading, setStudentSearchLoading] = useState(false);
  const [studentExamId, setStudentExamId] = useState<number | null>(null);
  const [studentExams, setStudentExams] = useState<AnyRow[]>([]);

  const [filterRows, setFilterRows] = useState<AnyRow[]>([]);
  const [restRows, setRestRows] = useState<AnyRow[]>([]);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [examId, setExamId] = useState<number | null>(null);
  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null);
  const [courseYearId, setCourseYearId] = useState<number | null>(null);

  const [rows, setRows] = useState<AnyRow[]>([]);

  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );

  const courses = useMemo(
    () =>
      dedupeBy(filterRows, (r) => Number(r.fk_course_id)).filter(
        (r) => Number(r.fk_course_id) > 0,
      ),
    [filterRows],
  );
  const academicYears = useMemo(
    () =>
      dedupeBy(
        filterRows.filter((r) => Number(r.fk_course_id) === Number(courseId)),
        (r) => Number(r.fk_academic_year_id),
      ).filter((r) => Number(r.fk_academic_year_id) > 0),
    [filterRows, courseId],
  );
  const exams = useMemo(
    () =>
      dedupeBy(
        filterRows.filter(
          (r) =>
            Number(r.fk_course_id) === Number(courseId) &&
            Number(r.fk_academic_year_id) === Number(academicYearId),
        ),
        (r) => Number(r.fk_exam_id),
      ).filter((r) => Number(r.fk_exam_id) > 0),
    [filterRows, courseId, academicYearId],
  );
  const colleges = useMemo(
    () =>
      dedupeBy(restRows, (r) => Number(r.fk_college_id)).filter(
        (r) => Number(r.fk_college_id) > 0,
      ),
    [restRows],
  );
  const groups = useMemo(
    () =>
      dedupeBy(
        restRows.filter((r) => Number(r.fk_college_id) === Number(collegeId)),
        (r) => Number(r.fk_course_group_id),
      ).filter((r) => Number(r.fk_course_group_id) > 0),
    [restRows, collegeId],
  );
  const years = useMemo(
    () =>
      dedupeBy(
        restRows.filter(
          (r) =>
            Number(r.fk_college_id) === Number(collegeId) &&
            Number(r.fk_course_group_id) === Number(courseGroupId),
        ),
        (r) => Number(r.fk_course_year_id),
      ).filter((r) => Number(r.fk_course_year_id) > 0),
    [restRows, collegeId, courseGroupId],
  );
  const studentExamOptions = useMemo(
    () =>
      dedupeBy(studentExams, (r) => Number(r.fk_exam_id ?? r.examId ?? r.id))
        .filter((r) => Number(r.fk_exam_id ?? r.examId ?? r.id) > 0)
        .map((r) => ({
          id: Number(r.fk_exam_id ?? r.examId ?? r.id),
          label: `${String(r.exam_name ?? r.examName ?? `Exam ${r.fk_exam_id ?? r.examId ?? r.id}`)}${
            formatRangeDate(r.from_date ?? r.fromDate) &&
            formatRangeDate(r.to_date ?? r.toDate)
              ? ` (${formatRangeDate(r.from_date ?? r.fromDate)} - ${formatRangeDate(r.to_date ?? r.toDate)})`
              : ""
          }${r.is_regular_exam || r.isRegularExam ? " (Regular)" : ""}${
            r.is_supply_exam || r.isSupplyExam ? " (Supple)" : ""
          }`,
        })),
    [studentExams],
  );
  const selectedStudent = useMemo(
    () =>
      students.find(
        (s) => Number(s.studentId ?? s.id ?? 0) === Number(studentId ?? 0),
      ) ?? null,
    [students, studentId],
  );

  const orgCode =
    typeof globalThis !== "undefined"
      ? String(globalThis.localStorage?.getItem("orgCode") ?? "")
      : "";

  const normalizedRows = useMemo(
    () =>
      normalizeHallticketRows(rows).filter(
        (r) => r && Object.keys(r).length > 0,
      ),
    [rows],
  );

  const sectionSubjectRows = useMemo(
    () => (mode === "section" ? filterAmsLabRows(normalizedRows, orgCode) : []),
    [mode, normalizedRows, orgCode],
  );

  const sectionTableRows = useMemo(
    () =>
      mode === "section"
        ? toSectionTableRows(buildSectionMainList(sectionSubjectRows))
        : [],
    [mode, sectionSubjectRows],
  );

  const studentDisplayRows = useMemo(
    () => (mode === "student" ? normalizedRows : []),
    [mode, normalizedRows],
  );

  const rowsForPrint =
    mode === "section" ? sectionSubjectRows : studentDisplayRows;

  // Printable HALL TICKET documents (Angular print section) — grouped per student.
  const { user } = useSessionContext();
  const { printMode, printButton, printStudent, printView } =
    useHallticketPrint(rowsForPrint, user?.universityCode ?? "");

  const sectionColumnDefs = useMemo<ColDef[]>(
    () => [
      {
        headerName: "SI.No",
        valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
        width: 70,
        flex: 0,
      },
      {
        field: "hallticket_number",
        headerName: "Hallticket No",
        minWidth: 140,
      },
      {
        field: "first_name",
        headerName: "Student Name",
        minWidth: 180,
        flex: 1,
      },
    ],
    [printStudent],
  );

  useEffect(() => {
    async function loadExamOptions() {
      if (filterRows.length > 0) return;
      const rows = await getUnivExamFiltersRegSup(employeeId).catch(() => []);
      if (Array.isArray(rows) && rows.length > 0) setFilterRows(rows);
    }
    void loadExamOptions();
  }, [employeeId, filterRows.length]);

  async function initSectionFilters() {
    setLoading(true);
    try {
      const rows = await getUnivExamFiltersRegSup(employeeId).catch(() => []);
      setFilterRows(rows);
      const c = dedupeBy(rows, (r) => Number(r.fk_course_id)).filter(
        (r) => Number(r.fk_course_id) > 0,
      );
      const firstCourse = c[0]?.fk_course_id ? Number(c[0].fk_course_id) : null;
      setCourseId(firstCourse);
      if (!firstCourse) return;

      const ay = dedupeBy(
        rows.filter((r) => Number(r.fk_course_id) === firstCourse),
        (r) => Number(r.fk_academic_year_id),
      ).filter((r) => Number(r.fk_academic_year_id) > 0);
      const firstAy = ay[0]?.fk_academic_year_id
        ? Number(ay[0].fk_academic_year_id)
        : null;
      setAcademicYearId(firstAy);
      if (!firstAy) return;

      const ex = dedupeBy(
        rows.filter(
          (r) =>
            Number(r.fk_course_id) === firstCourse &&
            Number(r.fk_academic_year_id) === firstAy,
        ),
        (r) => Number(r.fk_exam_id),
      ).filter((r) => Number(r.fk_exam_id) > 0);
      const firstExam = ex[0]?.fk_exam_id ? Number(ex[0].fk_exam_id) : null;
      setExamId(firstExam);
      if (!firstExam) return;

      const rest = await getUnivExamRestNoTt({
        courseId: firstCourse,
        examId: firstExam,
        academicYearId: firstAy,
        employeeId,
      }).catch(() => []);
      setRestRows(rest);
      const firstCollege = dedupeBy(rest, (r) => Number(r.fk_college_id))[0]
        ?.fk_college_id;
      if (firstCollege) setCollegeId(Number(firstCollege));
    } finally {
      setLoading(false);
    }
  }

  async function searchStudents(qRaw: string) {
    const q = qRaw.trim();
    if (!q) {
      setStudents([]);
      return;
    }
    if (q.length < 5) return;
    setStudentSearchLoading(true);
    try {
      const data = await listStudents(q).catch(() => []);
      setStudents(Array.isArray(data) ? data : []);
    } finally {
      setStudentSearchLoading(false);
    }
  }

  async function onStudentSelect(
    nextId: number | null,
    selected: AnyRow | null,
  ) {
    setStudentId(nextId);
    setRows([]);
    setStudentExamId(null);
    setStudentExams([]);
    if (!nextId || !selected) return;
    setStudents((prev) =>
      prev.some((s) => Number(s.studentId ?? s.id) === nextId)
        ? prev
        : [...prev, selected],
    );

    const courseId = Number(selected.courseId ?? selected.fk_course_id ?? 0);
    if (!courseId) return;

    // Angular getExamsList — ExamMaster by course only, exclude internal exams
    const exams = await listExamMastersByCourse(courseId).catch(() => []);
    setStudentExams(
      (Array.isArray(exams) ? exams : []).filter(
        (e) => !(e.isInternalExam ?? e.is_internal_exam),
      ),
    );
  }

  async function onGetList() {
    const targetExamId = mode === "student" ? studentExamId : examId;
    if (!targetExamId || (mode === "student" && !studentId)) return;
    setLoading(true);
    setHasFetched(true);
    try {
      const data = await getExamHalltickets({
        examId: targetExamId,
        studentId: mode === "student" ? (studentId ?? 0) : 0,
        collegeId: mode === "section" ? (collegeId ?? 0) : 0,
        academicYearId: mode === "section" ? (academicYearId ?? 0) : 0,
        courseId: mode === "section" ? (courseId ?? 0) : 0,
        courseGroupId: mode === "section" ? (courseGroupId ?? 0) : 0,
        courseYearId: mode === "section" ? (courseYearId ?? 0) : 0,
      });
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function autoLoadStudentHallticket() {
      if (mode !== "student") return;
      if (!studentId || !studentExamId) return;
      setLoading(true);
      setHasFetched(true);
      try {
        const data = await getExamHalltickets({
          examId: studentExamId,
          studentId,
          collegeId: 0,
          academicYearId: 0,
          courseId: 0,
          courseGroupId: 0,
          courseYearId: 0,
        });
        setRows(Array.isArray(data) ? data : []);
      } catch {
        setRows([]);
      } finally {
        setLoading(false);
      }
    }
    void autoLoadStudentHallticket();
  }, [mode, studentId, studentExamId]);

  const showTable =
    hasFetched ||
    (mode === "student"
      ? studentDisplayRows.length > 0
      : sectionTableRows.length > 0);

  // While the print dialog is open, replace the page with the hall-ticket
  // documents (AppShell @media print rules hide the app chrome).
  if (printMode) return <>{printView}</>;

  return (
    <FilteredListPage
      title="Exam Hallticket"
      notice={
        mode === "student" && !!selectedStudent && !!studentExamId ? (
          <div className="rounded border border-blue-200 bg-blue-50/40 p-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
              <div className="md:col-span-2 flex justify-center">
                <img
                  src={selectedStudent?.studentPhotoPath || defaultStudent.src}
                  alt="Student"
                  className="h-24 w-24 rounded object-cover border"
                  onError={(e) => {
                    e.currentTarget.src = defaultStudent.src;
                  }}
                />
              </div>
              <div className="md:col-span-7 text-[12px] leading-6">
                <div className="font-semibold">
                  {selectedStudent.firstName ?? selectedStudent.studentName ?? "-"}{" "}
                  (
                  <span className="text-blue-700">
                    {selectedStudent.isLateral ? "LATERAL" : "REGULAR"}
                  </span>
                  )
                </div>
                <div className="text-muted-foreground">
                  {selectedStudent.hallticketNumber ?? selectedStudent.rollNumber ?? "-"}
                </div>
                <div className="text-muted-foreground">
                  {selectedStudent.collegeCode ?? "-"} / {selectedStudent.academicYear ?? "-"} /{" "}
                  {selectedStudent.courseCode ?? "-"} / {selectedStudent.groupCode ?? "-"} /{" "}
                  {selectedStudent.courseYearName ?? "-"} / Section {selectedStudent.section ?? "-"}
                </div>
                <div className="text-muted-foreground">{selectedStudent.mobile ?? "-"}</div>
              </div>
              <div className="md:col-span-3 text-[12px] leading-7">
                <div>
                  Quota :{" "}
                  <span className="text-blue-700">{selectedStudent.quotaDisplayName ?? "-"}</span>
                </div>
                <div>
                  Student Status :{" "}
                  <span className="text-green-700 font-medium">
                    {selectedStudent.studentStatusDisplayName ?? "-"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : null
      }
      filters={(
        <div className="space-y-2">
          <RadioGroup
            value={mode}
            onValueChange={(v) => {
              const next = (v as "student" | "section") || "student";
              setMode(next);
              setRows([]);
              setHasFetched(false);
              if (next === "section") initSectionFilters();
            }}
            className="flex gap-6"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="student" id="by-student" />
              <Label htmlFor="by-student">Hallticket By Student</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="section" id="by-section" />
              <Label htmlFor="by-section">Hallticket By Section</Label>
            </div>
          </RadioGroup>

          {mode === "student" && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start">
              <div className="md:col-span-4 space-y-1">
                <StudentSearchSelect
                  label="Student"
                  value={studentId}
                  students={students}
                  selectedStudent={selectedStudent}
                  isLoading={studentSearchLoading}
                  onSearch={(term) => void searchStudents(term)}
                  onChange={(id, row) => void onStudentSelect(id, row)}
                />
              </div>
              <div className="md:col-span-7 space-y-1">
                <Label>Exam</Label>
                <Select
                  value={studentExamId ? String(studentExamId) : null}
                  onChange={(v) => setStudentExamId(v ? Number(v) : null)}
                  options={studentExamOptions.map((e) => ({
                    value: String(e.id),
                    label: e.label,
                  }))}
                  placeholder="Exam"
                />
              </div>
            </div>
          )}

          {mode === "section" && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
              <div className="md:col-span-2 space-y-1">
                <Label>Course</Label>
                <Select
                  value={courseId ? String(courseId) : null}
                  onChange={(v) => setCourseId(v ? Number(v) : null)}
                  options={courses.map((c) => ({
                    value: String(c.fk_course_id),
                    label: c.course_code,
                  }))}
                  placeholder="Program"
                />
              </div>
              <div className="md:col-span-2 space-y-1">
                <Label>Exam Year</Label>
                <Select
                  value={academicYearId ? String(academicYearId) : null}
                  onChange={(v) => setAcademicYearId(v ? Number(v) : null)}
                  options={academicYears.map((a) => ({
                    value: String(a.fk_academic_year_id),
                    label: a.academic_year,
                  }))}
                  placeholder="Exam Year"
                />
              </div>
              <div className="md:col-span-4 space-y-1">
                <Label>Exam Master</Label>
                <Select
                  value={examId ? String(examId) : null}
                  onChange={async (v) => {
                    const next = v ? Number(v) : null;
                    setExamId(next);
                    if (!next || !courseId || !academicYearId) return;
                    const rest = await getUnivExamRestNoTt({
                      courseId,
                      examId: next,
                      academicYearId,
                      employeeId,
                    }).catch(() => []);
                    setRestRows(rest);
                    const firstCollege = dedupeBy(rest, (r) =>
                      Number(r.fk_college_id),
                    )[0]?.fk_college_id;
                    setCollegeId(firstCollege ? Number(firstCollege) : null);
                  }}
                  options={exams.map((e) => ({
                    value: String(e.fk_exam_id),
                    label: e.exam_name,
                  }))}
                  placeholder="Exam Master"
                />
              </div>
              <div className="md:col-span-2 space-y-1">
                <Label>College</Label>
                <Select
                  value={collegeId ? String(collegeId) : null}
                  onChange={(v) => setCollegeId(v ? Number(v) : null)}
                  options={colleges.map((c) => ({
                    value: String(c.fk_college_id),
                    label: c.college_code,
                  }))}
                  placeholder="College"
                />
              </div>
              <div className="md:col-span-2 space-y-1">
                <Label>Course Group</Label>
                <Select
                  value={courseGroupId ? String(courseGroupId) : null}
                  onChange={(v) => setCourseGroupId(v ? Number(v) : null)}
                  options={groups.map((g) => ({
                    value: String(g.fk_course_group_id),
                    label: g.group_code,
                  }))}
                  placeholder="Course Group"
                />
              </div>
              <div className="md:col-span-2 space-y-1">
                <Label>Course Year</Label>
                <Select
                  value={courseYearId ? String(courseYearId) : null}
                  onChange={(v) => setCourseYearId(v ? Number(v) : null)}
                  options={years.map((y) => ({
                    value: String(y.fk_course_year_id),
                    label: y.course_year_code,
                  }))}
                  placeholder="Course Year"
                />
              </div>
              <div className="md:col-span-2">
                <Button
                  type="button"
                  onClick={onGetList}
                  disabled={loading}
                  className="h-8 px-3 text-[12px] w-full"
                >
                  Get List
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
      rowData={
        showTable
          ? mode === "student"
            ? studentDisplayRows
            : sectionTableRows
          : []
      }
      columnDefs={mode === "student" ? STUDENT_HALLTICKET_COL_DEFS : sectionColumnDefs}
      loading={loading}
      pagination
      toolbar={{ pdfDocumentTitle: "Exam hallticket list" }}
      toolbarLeading={(
        <span className="text-[12px] text-muted-foreground whitespace-nowrap">
          {mode === "student"
            ? `${studentDisplayRows.length} records`
            : `${sectionTableRows.length} students`}
        </span>
      )}
      toolbarTrailing={printButton(mode === "student" ? "Print" : "Print All")}
    />
  );
}
