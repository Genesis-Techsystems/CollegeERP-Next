"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
  getStudentExamHallticketDetail,
  listExamMastersByCourse,
  listStudentHallticketExams,
  resolveStudentPortalProfile,
  getUnivExamFiltersRegSup,
  getUnivExamRestNoTt,
  STUDENT_HALLTICKET_PRINT_STORAGE_KEY,
  searchStudentsByKeyword,
} from "@/services";
import { FilteredListPage } from "@/components/layout";
import { useSessionContext } from "@/context/SessionContext";
import { useHallticketPrint } from "./_print/useHallticketPrint";
import { Printer } from "lucide-react";
import { MINIO_URL } from "@/config/constants/api";

type AnyRow = Record<string, any>;

function studentPhotoUrl(path: unknown): string {
  const p = String(path ?? "").trim();
  if (!p) return defaultStudent.src;
  if (/^(https?:\/\/|data:)/i.test(p)) return p;
  const base =
    MINIO_URL ||
    (typeof globalThis !== "undefined"
      ? String(globalThis.localStorage?.getItem("MINIO") ?? "")
      : "");
  if (!base) return defaultStudent.src;
  return `${base.replace(/\/?$/, "/")}${p.replace(/^\/+/, "")}`;
}

type ExamHallticketPageProps = {
  /** Angular `examination-section/student-exam-hallticket` — logged-in student only. */
  variant?: "admin" | "studentPortal";
};

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

/**
 * Flatten Angular examhallticket subjectDTOList into table rows.
 * Must strip nested subjectDTOList from the header — otherwise
 * normalizeHallticketRows re-expands each row (7 subjects → 49 rows).
 */
function mapStudentPortalSubjectRows(
  detail: AnyRow,
  subjects: AnyRow[],
): AnyRow[] {
  const {
    subjectDTOList: _subjectDTOList,
    subjects: _subjects,
    examStudentDetailDTOs: _examStudentDetailDTOs,
    examStudentDetails: _examStudentDetails,
    examStudentDetailList: _examStudentDetailList,
    examSessionDTOList: _examSessionDTOList,
    ...header
  } = detail;

  return subjects.map((s) => {
    const {
      subjectDTOList: _nestedList,
      subjects: _nestedSubjects,
      omrBarcode: _omrBarcode,
      ...subject
    } = s;
    return {
      ...header,
      ...subject,
      exam_date:
        subject.examDate ??
        subject.exam_date ??
        header.exam_date ??
        header.examDate,
      subject_code: subject.subjectCode ?? subject.subject_code,
      subject_name: subject.subjectName ?? subject.subject_name,
      session_start_time:
        subject.sessionStartTime ??
        subject.session_start_time ??
        subject.start_time,
      session_end_time:
        subject.sessionEndTime ?? subject.session_end_time ?? subject.end_time,
      subjecttype: subject.subjectType ?? subject.subjecttype,
    };
  });
}

export function ExamHallticketPage({
  variant = "admin",
}: ExamHallticketPageProps) {
  const isStudentPortal = variant === "studentPortal";
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: sessionLoading } = useSessionContext();
  const urlStudentId = searchParams.get("studentId") ?? "";
  const urlExamId = searchParams.get("examId") ?? "";
  const sessionStudentId = user?.studentId ?? null;
  const sessionCollegeId = user?.collegeId ?? null;
  const sessionUserId = user?.userId ?? null;
  const sessionFirstName = user?.firstName ?? "";
  const sessionUserName = user?.userName ?? "";
  // Single key keeps useEffect deps length fixed across Fast Refresh edits.
  const studentPortalInitKey = [
    isStudentPortal ? "1" : "0",
    sessionLoading ? "1" : "0",
    urlStudentId,
    urlExamId,
    String(sessionStudentId ?? ""),
    String(sessionCollegeId ?? ""),
    String(sessionUserId ?? ""),
    sessionFirstName,
    sessionUserName,
  ].join("\0");
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
  const [hallticketPrintData, setHallticketPrintData] = useState<AnyRow | null>(
    null,
  );

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
      dedupeBy(studentExams, (r) =>
        Number(r.examId ?? r.exam_id ?? r.fk_exam_id ?? r.id),
      )
        .filter(
          (r) => Number(r.examId ?? r.exam_id ?? r.fk_exam_id ?? r.id) > 0,
        )
        .map((r) => {
          const id = Number(r.examId ?? r.exam_id ?? r.fk_exam_id ?? r.id);
          // Angular: examName (examFromDate - examToDate)
          const from = formatRangeDate(
            r.examFromDate ?? r.from_date ?? r.fromDate ?? r.exam_from_date,
          );
          const to = formatRangeDate(
            r.examToDate ?? r.to_date ?? r.toDate ?? r.exam_to_date,
          );
          return {
            id,
            label: `${String(r.examName ?? r.exam_name ?? `Exam ${id}`)}${
              from && to ? ` (${from} - ${to})` : ""
            }${r.is_regular_exam || r.isRegularExam ? " (Regular)" : ""}${
              r.is_supply_exam || r.isSupplyExam ? " (Supple)" : ""
            }`,
          };
        }),
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
  const { printMode, printButton, printStudent, printView } =
    useHallticketPrint(
      isStudentPortal ? [] : rowsForPrint,
      user?.universityCode ?? "",
    );

  function handleStudentPortalPrint() {
    if (!studentId || !studentExamId) return;
    // Never put hall-ticket JSON in the URL — subject omrBarcode base64 blobs
    // make the query string huge and Next.js returns HTTP 431.
    // Print page loads via sessionStorage and/or GET examhallticket?examId&studentId.
    if (hallticketPrintData && typeof globalThis !== "undefined") {
      const subjects = (
        (hallticketPrintData.subjectDTOList ??
          hallticketPrintData.subjects ??
          studentDisplayRows) as AnyRow[]
      ).map((s) => {
        const { omrBarcode: _omit, ...rest } = s;
        return rest;
      });
      const payload = {
        ...hallticketPrintData,
        subjectDTOList: subjects,
      };
      delete (payload as AnyRow).omrBarcode;
      globalThis.sessionStorage.setItem(
        STUDENT_HALLTICKET_PRINT_STORAGE_KEY,
        JSON.stringify(payload),
      );
    }
    const qs = new URLSearchParams({
      examId: String(studentExamId),
      studentId: String(studentId),
    });
    router.push(
      `/examination-section/student-exam-hallticket/print-hallticket?${qs.toString()}`,
    );
  }

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
      const data = await searchStudentsByKeyword(q).catch(() => []);
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
        if (isStudentPortal) {
          const result = await getStudentExamHallticketDetail(
            studentExamId,
            studentId,
          );
          if (result) {
            // Ensure print page can match sessionStorage by exam/student ids.
            setHallticketPrintData({
              ...result.detail,
              examId:
                Number(result.detail.examId ?? result.detail.exam_id ?? 0) ||
                studentExamId,
              studentId:
                Number(
                  result.detail.studentId ?? result.detail.student_id ?? 0,
                ) || studentId,
              subjectDTOList: result.subjects,
            });
            setRows(
              mapStudentPortalSubjectRows(result.detail, result.subjects),
            );
          } else {
            setHallticketPrintData(null);
            setRows([]);
          }
          return;
        }

        const data = await getExamHalltickets({
          examId: studentExamId,
          studentId,
          collegeId: 0,
          academicYearId: 0,
          courseId: 0,
          courseGroupId: 0,
          courseYearId: 0,
        });
        setHallticketPrintData(null);
        setRows(Array.isArray(data) ? data : []);
      } catch {
        setHallticketPrintData(null);
        setRows([]);
      } finally {
        setLoading(false);
      }
    }
    void autoLoadStudentHallticket();
  }, [mode, studentId, studentExamId, isStudentPortal]);

  useEffect(() => {
    if (!isStudentPortal || sessionLoading) return;

    async function initStudentPortal() {
      setMode("student");
      setLoading(true);
      try {
        const profile = await resolveStudentPortalProfile({
          userId: sessionUserId,
          studentId:
            Number(
              urlStudentId ||
                sessionStudentId ||
                globalThis?.localStorage?.getItem("studentId") ||
                0,
            ) || null,
          userName: sessionUserName,
        });
        if (!profile) return;

        const sid = Number(profile.studentId ?? profile.id ?? 0);
        if (!sid) return;

        const cid = Number(
          profile.collegeId ??
            profile.college_id ??
            sessionCollegeId ??
            globalThis?.localStorage?.getItem("collegeId") ??
            0,
        );
        const courseId = Number(
          profile.courseId ?? profile.course_id ?? profile.fk_course_id ?? 0,
        );

        if (typeof globalThis !== "undefined") {
          globalThis.localStorage.setItem("studentId", String(sid));
          if (cid > 0)
            globalThis.localStorage.setItem("collegeId", String(cid));
          if (courseId > 0)
            globalThis.localStorage.setItem("courseId", String(courseId));
          const roll = String(
            profile.rollNumber ?? profile.hallticketNumber ?? "",
          ).trim();
          if (roll) globalThis.localStorage.setItem("rollNumber", roll);
        }

        setStudentId(sid);
        setStudents([profile]);

        // Angular getExamsList — ExamStudent by collegeId + studentId (registered exams).
        const exams =
          sid > 0
            ? await listStudentHallticketExams(cid, sid).catch(() => [])
            : [];
        setStudentExams(exams);

        const examFromUrl = Number(urlExamId || 0);
        if (examFromUrl > 0) {
          setStudentExamId(examFromUrl);
        } else if (exams.length === 1) {
          setStudentExamId(
            Number(
              exams[0]?.examId ??
                exams[0]?.exam_id ??
                exams[0]?.fk_exam_id ??
                0,
            ) || null,
          );
        }
      } finally {
        setLoading(false);
      }
    }

    void initStudentPortal();
    // Single fixed-length dep — multi-value arrays change size under Fast Refresh.
  }, [studentPortalInitKey]);

  const showTable =
    hasFetched ||
    (mode === "student"
      ? studentDisplayRows.length > 0
      : sectionTableRows.length > 0);

  // While the print dialog is open, replace the page with the hall-ticket
  // documents (AppShell @media print rules hide the app chrome).
  if (printMode && !isStudentPortal) return <>{printView}</>;

  return (
    <FilteredListPage
      title="Exam Hallticket"
      filters={
        <div className="space-y-2">
          {!isStudentPortal && (
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
          )}

          {mode === "student" && (
            <div className="space-y-2">
              {!isStudentPortal ? (
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
              ) : (
                /* Angular: mat-form-field fxFlex.gt-xs="60" fxFlex.gt-md="60" */
                <div className="w-full sm:w-[60%] space-y-1">
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
              )}

              {/* Angular: student card sits below the Exam dropdown after selection */}
              {!!selectedStudent && !!studentExamId && (
                <div className="rounded border border-blue-200 bg-blue-50/40 p-3">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                    <div className="md:col-span-2 flex justify-center">
                      <img
                        src={studentPhotoUrl(selectedStudent?.studentPhotoPath)}
                        alt="Student"
                        className="h-24 w-24 rounded object-cover border"
                        onError={(e) => {
                          e.currentTarget.src = defaultStudent.src;
                        }}
                      />
                    </div>
                    <div className="md:col-span-7 text-[12px] leading-6">
                      <div className="font-semibold">
                        {selectedStudent.firstName ??
                          selectedStudent.studentName ??
                          "-"}{" "}
                        (
                        <span className="text-blue-700">
                          {selectedStudent.isLateral ? "LATERAL" : "REGULAR"}
                        </span>
                        )
                      </div>
                      <div className="text-muted-foreground">
                        {selectedStudent.hallticketNumber ??
                          selectedStudent.rollNumber ??
                          "-"}
                      </div>
                      <div className="text-muted-foreground">
                        {selectedStudent.collegeCode ?? "-"} /{" "}
                        {selectedStudent.academicYear ?? "-"} /{" "}
                        {selectedStudent.courseCode || "-"} /{" "}
                        {selectedStudent.groupCode ?? "-"} /{" "}
                        {selectedStudent.courseYearName ?? "-"} / Section{" "}
                        {selectedStudent.section ?? "-"}
                      </div>
                      <div className="text-muted-foreground">
                        {selectedStudent.mobile ?? "-"}
                      </div>
                    </div>
                    <div className="md:col-span-3 text-[12px] leading-7">
                      <div>
                        Quota :{" "}
                        <span className="text-blue-700">
                          {selectedStudent.quotaDisplayName ?? "-"}
                        </span>
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
              )}
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
      }
      rowData={
        showTable
          ? mode === "student"
            ? studentDisplayRows
            : sectionTableRows
          : []
      }
      columnDefs={
        mode === "student" ? STUDENT_HALLTICKET_COL_DEFS : sectionColumnDefs
      }
      loading={loading}
      pagination
      toolbar={{ pdfDocumentTitle: "Exam hallticket list" }}
      toolbarLeading={
        <span className="text-[12px] text-muted-foreground whitespace-nowrap">
          {mode === "student"
            ? `${studentDisplayRows.length} records`
            : `${sectionTableRows.length} students`}
        </span>
      }
      toolbarTrailing={
        isStudentPortal && mode === "student" ? (
          studentDisplayRows.length > 0 ? (
            <Button
              type="button"
              size="sm"
              className="h-8 px-3 text-[12px]"
              onClick={handleStudentPortalPrint}
            >
              <Printer className="mr-1 h-3.5 w-3.5" />
              Print
            </Button>
          ) : null
        ) : (
          printButton(mode === "student" ? "Print" : "Print All")
        )
      }
    />
  );
}

export default function ExamHallticketAdminPage() {
  return <ExamHallticketPage />;
}
