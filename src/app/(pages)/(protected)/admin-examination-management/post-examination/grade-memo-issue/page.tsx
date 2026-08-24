"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format, isValid, parseISO } from "date-fns";
import { FilteredListPage, TableContextHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select as CommonSelect } from "@/common/components/select";
import { StudentSearchSelect } from "@/common/components/student-search";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import type { ColDef } from "ag-grid-community";
import {
  getGradeMemoIssueFilters,
  getGradeMemoIssueRestFilters,
  getGradeMemoIssueResult,
  getSessionUser,
  searchStudentsByKeyword,
} from "@/services";
import { MINIO_URL } from "@/config/constants/api";
import { toastError, toastInfo } from "@/lib/toast";
import { useSessionContext } from "@/context/SessionContext";
import {
  useGradeMemoPrint,
  type GradeMemoPrintMode,
} from "./_print/useGradeMemoPrint";

type AnyRow = Record<string, any>;

const DEFAULT_STUDENT_PHOTO = "/assets/images/avatars/default_Student.png";

const SUBJECT_COLS: ColDef<AnyRow>[] = [
  {
    headerName: "SI No.",
    valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
    width: 80,
    flex: 0,
  },
  { field: "subject_code", headerName: "Subject Code", minWidth: 140 },
  { field: "subject_name", headerName: "Subject Title", minWidth: 240 },
  { field: "internal_marks", headerName: "Internal Marks", width: 130 },
  { field: "external_marks", headerName: "External Marks", width: 130 },
  { field: "totalMarks", headerName: "Total Marks", width: 120 },
  { field: "examresult", headerName: "Result", width: 120 },
  { field: "credits", headerName: "Credits", width: 100 },
];

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

function parseExamDate(value: unknown): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return isValid(value) ? value : null;
  const raw = String(value).trim();
  if (!raw) return null;
  const iso = parseISO(raw.length >= 10 ? raw.slice(0, 10) : raw);
  if (isValid(iso)) return iso;
  const d = new Date(raw);
  return isValid(d) ? d : null;
}

/** Angular grade-memo option dates — matches prior exam dropdowns (`MMM d, y`). */
function formatExamDateLabel(value: unknown): string {
  const d = parseExamDate(value);
  return d ? format(d, "MMM d, yyyy") : "";
}

function examTypeTags(row: AnyRow): string[] {
  const tags: string[] = [];
  if (asBool(row.is_internal_exam ?? row.isInternalExam)) tags.push("Internal");
  if (asBool(row.is_regular_exam ?? row.isRegularExam)) tags.push("Regular");
  if (asBool(row.is_supply_exam ?? row.isSupplyExam)) tags.push("Supple");
  return tags;
}

/** Angular: `exam_name (from - to)(Regular)` */
function formatExamOptionLabel(row: AnyRow): string {
  const name = strFrom(row, ["exam_name", "examName"]) || "Exam";
  const from = formatExamDateLabel(
    row.from_date ?? row.fromDate ?? row.examFromDate,
  );
  const to = formatExamDateLabel(row.to_date ?? row.toDate ?? row.examToDate);
  const range = from && to ? ` (${from} - ${to})` : "";
  const tags = examTypeTags(row)
    .map((t) => `(${t})`)
    .join("");
  return `${name}${range}${tags}`;
}

function examOptionLabelNode(row: AnyRow) {
  const name = strFrom(row, ["exam_name", "examName"]) || "Exam";
  const from = formatExamDateLabel(
    row.from_date ?? row.fromDate ?? row.examFromDate,
  );
  const to = formatExamDateLabel(row.to_date ?? row.toDate ?? row.examToDate);
  const range = from && to ? ` (${from} - ${to})` : "";
  return (
    <span>
      {name}
      {range}
      {examTypeTags(row).map((t) => (
        <span key={t} className="font-medium text-[#0014ff]">
          ({t})
        </span>
      ))}
    </span>
  );
}

function studentPhotoSrc(row: AnyRow | null | undefined): string {
  const path = strFrom(row ?? {}, [
    "studentPhotoPath",
    "student_photo_path",
    "photoPath",
    "photo_path",
  ]);
  if (!path) return DEFAULT_STUDENT_PHOTO;
  if (/^https?:\/\//i.test(path) || path.startsWith("/")) return path;
  return `${MINIO_URL}${path}`;
}

function studentStatusClass(code: string): string {
  const c = code.toUpperCase();
  if (c === "DTND" || c === "DISCONTINUED") return "text-red-600 font-bold";
  if (c === "INCOLLEGE") return "text-green-700 font-bold";
  if (c === "PASSEDOUT") return "text-[#461eb6] font-bold";
  if (c === "DETAINRECOMMENDED") return "text-orange-600 font-bold";
  return "font-semibold text-green-700";
}

function GradeMemoStudentCard({ student }: { student: AnyRow }) {
  const [photoError, setPhotoError] = useState(false);
  const photoSrc = photoError
    ? DEFAULT_STUDENT_PHOTO
    : studentPhotoSrc(student);
  const name = strFrom(student, [
    "firstName",
    "studentName",
    "first_name",
    "student_name",
  ]);
  const roll = strFrom(student, [
    "rollNumber",
    "hallticketNumber",
    "hallticket_number",
    "roll_number",
  ]);
  const pathLine = [
    strFrom(student, ["collegeCode", "college_code"]),
    strFrom(student, ["academicYear", "academic_year"]),
    strFrom(student, ["courseCode", "course_code"]),
    strFrom(student, ["groupCode", "group_code"]),
    strFrom(student, ["courseYearName", "course_year_name", "courseYearCode"]),
    strFrom(student, ["section"])
      ? `Section ${strFrom(student, ["section"])}`
      : "",
  ]
    .filter(Boolean)
    .join(" / ");
  const isLateral = asBool(student.isLateral ?? student.is_lateral);
  const statusCode = strFrom(student, [
    "studentStatusCode",
    "student_status_code",
  ]);
  const statusName = strFrom(student, [
    "studentStatusDisplayName",
    "student_status_display_name",
  ]);
  const quota = strFrom(student, ["quotaDisplayName", "quota_display_name"]);
  const mobile = strFrom(student, ["mobile", "mobileNo", "phone"]);

  return (
    <div className="rounded border-4 border-[#c3d9ff] px-2 py-1">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="w-full shrink-0 sm:w-[120px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoSrc}
            alt=""
            className="w-[75%] max-w-full bg-[#c3d9ff] object-cover object-top p-1.5"
            style={{ height: 100 }}
            onError={() => setPhotoError(true)}
          />
        </div>
        <div className="min-w-0 flex-1 space-y-0.5 py-2 text-[13px] leading-5">
          <p className="font-medium">
            {name}{" "}
            <span className="text-blue-600">
              ({isLateral ? "LATERAL" : "REGULAR"})
            </span>
          </p>
          {roll ? <p className="text-[#8c8c8c]">{roll}</p> : null}
          {pathLine ? <p className="text-[#8c8c8c]">{pathLine}</p> : null}
          {mobile ? <p className="text-[#8c8c8c]">{mobile}</p> : null}
        </div>
        <div className="space-y-1 py-2 text-[15px] sm:min-w-[200px]">
          <p>
            Quota :{" "}
            {quota ? <span className="text-blue-600">{quota}</span> : null}
          </p>
          <p>
            Student Status :{" "}
            {statusName ? (
              <span className={studentStatusClass(statusCode)}>
                {statusName}
              </span>
            ) : null}
          </p>
        </div>
      </div>
    </div>
  );
}

/** Angular selectedCourse.university_code — tolerate alternate key casings from the filter proc. */
function pickUniversityCode(row: AnyRow): string {
  const preferred = strFrom(row, [
    "university_code",
    "universityCode",
    "University_Code",
    "UNIVERSITY_CODE",
    "univ_code",
    "univCode",
  ]);
  if (preferred) return preferred;
  for (const [key, value] of Object.entries(row ?? {})) {
    if (!/univ(ersity)?_?code$/i.test(key)) continue;
    const v = String(value ?? "").trim();
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

function asBool(v: unknown): boolean {
  return v === true || v === 1 || v === "1" || v === "true";
}

function applyRestRows(
  rows: AnyRow[],
  setters: {
    setRestFilters: (r: AnyRow[]) => void;
    setCollegeId: (n: number | null) => void;
    setCourseGroupId: (n: number | null) => void;
    setCourseYearId: (n: number | null) => void;
  },
) {
  setters.setRestFilters(rows);
  const nextColleges = dedupeBy(rows, ["fk_college_id", "collegeId"]);
  const nextCollegeId = nextColleges[0]
    ? numFrom(nextColleges[0], ["fk_college_id", "collegeId"])
    : null;
  const nextGroups = dedupeBy(
    rows.filter(
      (x) =>
        numFrom(x, ["fk_college_id", "collegeId"]) === Number(nextCollegeId),
    ),
    ["fk_course_group_id", "courseGroupId"],
  );
  const nextGroupId = nextGroups[0]
    ? numFrom(nextGroups[0], ["fk_course_group_id", "courseGroupId"])
    : null;
  const nextYears = dedupeBy(
    rows.filter(
      (x) =>
        numFrom(x, ["fk_college_id", "collegeId"]) === Number(nextCollegeId) &&
        numFrom(x, ["fk_course_group_id", "courseGroupId"]) ===
          Number(nextGroupId),
    ),
    ["fk_course_year_id", "courseYearId"],
  );
  setters.setCollegeId(nextCollegeId);
  setters.setCourseGroupId(nextGroupId);
  setters.setCourseYearId(
    nextYears[0]
      ? numFrom(nextYears[0], ["fk_course_year_id", "courseYearId"])
      : null,
  );
}

export default function GradeMemoIssuePage() {
  const { user } = useSessionContext();
  const [employeeId, setEmployeeId] = useState(0);
  const [organizationId, setOrganizationId] = useState(0);

  const [mode, setMode] = useState<"section" | "student">("section");
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<AnyRow[]>([]);
  const [restFilters, setRestFilters] = useState<AnyRow[]>([]);
  const [resultRows, setResultRows] = useState<AnyRow[]>([]);
  const [gradesRows, setGradesRows] = useState<AnyRow[]>([]);
  const [searchedStudents, setSearchedStudents] = useState<AnyRow[]>([]);

  const [courseId, setCourseId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [examId, setExamId] = useState<number | null>(null);
  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null);
  const [courseYearId, setCourseYearId] = useState<number | null>(null);
  const [studentId, setStudentId] = useState<number>(0);
  const [selectedStudentRow, setSelectedStudentRow] = useState<AnyRow | null>(
    null,
  );
  const [studentSearchLoading, setStudentSearchLoading] = useState(false);
  const [studentDetailsLoaded, setStudentDetailsLoaded] = useState(false);
  const [memoDate, setMemoDate] = useState<string>(
    new Date().toISOString().slice(0, 10),
  );

  /** Skip duplicate rest-filter fetches for the same course/exam/year (Angular: one selectedExam call). */
  const restKeyRef = useRef("");
  const restReqRef = useRef(0);
  const filtersRef = useRef<AnyRow[]>([]);
  filtersRef.current = filters;
  const employeeIdRef = useRef(0);
  employeeIdRef.current = employeeId;

  const loadRestFilters = useCallback(
    async (
      nextCourseId: number,
      nextExamId: number,
      nextAcademicYearId: number,
    ) => {
      const empId = employeeIdRef.current;
      const key = `${nextCourseId}|${nextExamId}|${nextAcademicYearId}|${empId}`;
      if (restKeyRef.current === key) return;
      restKeyRef.current = key;
      const req = ++restReqRef.current;

      setRestFilters([]);
      setCollegeId(null);
      setCourseGroupId(null);
      setCourseYearId(null);
      setResultRows([]);
      setGradesRows([]);

      const rows = await getGradeMemoIssueRestFilters({
        courseId: nextCourseId,
        examId: nextExamId,
        academicYearId: nextAcademicYearId,
        employeeId: empId,
      }).catch(() => []);

      if (req !== restReqRef.current) return;
      applyRestRows(rows, {
        setRestFilters,
        setCollegeId,
        setCourseGroupId,
        setCourseYearId,
      });
    },
    [],
  );

  /** Angular selectedCourse → auto year[0] → auto exam[0] → selectedExam (one rest call). */
  const selectCourse = useCallback(
    (nextCourseId: number | null) => {
      restKeyRef.current = "";
      setCourseId(nextCourseId);
      setResultRows([]);
      setGradesRows([]);
      setStudentDetailsLoaded(false);
      if (!nextCourseId) {
        setAcademicYearId(null);
        setExamId(null);
        setRestFilters([]);
        setCollegeId(null);
        setCourseGroupId(null);
        setCourseYearId(null);
        return;
      }
      const yearRows = dedupeBy(
        filtersRef.current.filter(
          (x) => numFrom(x, ["fk_course_id", "courseId"]) === nextCourseId,
        ),
        ["fk_academic_year_id", "academicYearId"],
      );
      const nextYearId = yearRows[0]
        ? numFrom(yearRows[0], ["fk_academic_year_id", "academicYearId"])
        : null;
      setAcademicYearId(nextYearId);
      if (!nextYearId) {
        setExamId(null);
        setRestFilters([]);
        setCollegeId(null);
        setCourseGroupId(null);
        setCourseYearId(null);
        return;
      }
      const examRows = dedupeBy(
        filtersRef.current.filter(
          (x) =>
            numFrom(x, ["fk_course_id", "courseId"]) === nextCourseId &&
            numFrom(x, ["fk_academic_year_id", "academicYearId"]) ===
              nextYearId,
        ),
        ["fk_exam_id", "examId"],
      );
      const nextExamId = examRows[0]
        ? numFrom(examRows[0], ["fk_exam_id", "examId"])
        : null;
      setExamId(nextExamId);
      if (!nextExamId) {
        setRestFilters([]);
        setCollegeId(null);
        setCourseGroupId(null);
        setCourseYearId(null);
        return;
      }
      void loadRestFilters(nextCourseId, nextExamId, nextYearId);
    },
    [loadRestFilters],
  );

  /** Angular selectedAcademicYear → auto exam[0] → selectedExam (one rest call). */
  const selectAcademicYear = useCallback(
    (nextYearId: number | null) => {
      restKeyRef.current = "";
      setAcademicYearId(nextYearId);
      setResultRows([]);
      setGradesRows([]);
      setStudentDetailsLoaded(false);
      if (!courseId || !nextYearId) {
        setExamId(null);
        setRestFilters([]);
        setCollegeId(null);
        setCourseGroupId(null);
        setCourseYearId(null);
        return;
      }
      const examRows = dedupeBy(
        filtersRef.current.filter(
          (x) =>
            numFrom(x, ["fk_course_id", "courseId"]) === Number(courseId) &&
            numFrom(x, ["fk_academic_year_id", "academicYearId"]) ===
              nextYearId,
        ),
        ["fk_exam_id", "examId"],
      );
      const nextExamId = examRows[0]
        ? numFrom(examRows[0], ["fk_exam_id", "examId"])
        : null;
      setExamId(nextExamId);
      if (!nextExamId) {
        setRestFilters([]);
        setCollegeId(null);
        setCourseGroupId(null);
        setCourseYearId(null);
        return;
      }
      void loadRestFilters(courseId, nextExamId, nextYearId);
    },
    [courseId, loadRestFilters],
  );

  /** Angular selectedExam → one rest call. */
  const selectExam = useCallback(
    (nextExamId: number | null) => {
      restKeyRef.current = "";
      setExamId(nextExamId);
      setResultRows([]);
      setGradesRows([]);
      setStudentDetailsLoaded(false);
      if (!courseId || !academicYearId || !nextExamId) {
        setRestFilters([]);
        setCollegeId(null);
        setCourseGroupId(null);
        setCourseYearId(null);
        return;
      }
      void loadRestFilters(courseId, nextExamId, academicYearId);
    },
    [courseId, academicYearId, loadRestFilters],
  );

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      try {
        let empId = Number(
          globalThis?.localStorage?.getItem("employeeId") ?? 0,
        );
        let orgId = Number(
          globalThis?.localStorage?.getItem("organizationId") ?? 0,
        );
        if (!empId || !orgId) {
          const sessionUser = await getSessionUser().catch(() => null);
          if (!empId)
            empId = Number(sessionUser?.employeeId ?? sessionUser?.userId ?? 0);
          if (!orgId) orgId = Number(sessionUser?.organizationId ?? 0);
        }
        if (cancelled) return;
        setEmployeeId(empId);
        setOrganizationId(orgId);
        employeeIdRef.current = empId;
        const rows = await getGradeMemoIssueFilters(empId).catch(() => []);
        if (cancelled) return;
        setFilters(rows);
        filtersRef.current = rows;
        // Angular getFiltersList → selectedCourse(courses[0]) — triggers one rest load at end.
        const firstCourse = dedupeBy(rows, ["fk_course_id", "courseId"])[0];
        const firstCourseId = firstCourse
          ? numFrom(firstCourse, ["fk_course_id", "courseId"])
          : null;
        if (firstCourseId) selectCourse(firstCourseId);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
    // intentionally once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const courses = useMemo(
    () => dedupeBy(filters, ["fk_course_id", "courseId"]),
    [filters],
  );
  const years = useMemo(
    () =>
      dedupeBy(
        filters.filter(
          (x) => numFrom(x, ["fk_course_id", "courseId"]) === Number(courseId),
        ),
        ["fk_academic_year_id", "academicYearId"],
      ),
    [filters, courseId],
  );
  const exams = useMemo(
    () =>
      dedupeBy(
        filters.filter(
          (x) =>
            numFrom(x, ["fk_course_id", "courseId"]) === Number(courseId) &&
            numFrom(x, ["fk_academic_year_id", "academicYearId"]) ===
              Number(academicYearId),
        ),
        ["fk_exam_id", "examId"],
      ),
    [filters, courseId, academicYearId],
  );
  const colleges = useMemo(
    () => dedupeBy(restFilters, ["fk_college_id", "collegeId"]),
    [restFilters],
  );
  const groups = useMemo(
    () =>
      dedupeBy(
        restFilters.filter(
          (x) =>
            numFrom(x, ["fk_college_id", "collegeId"]) === Number(collegeId),
        ),
        ["fk_course_group_id", "courseGroupId"],
      ),
    [restFilters, collegeId],
  );
  const courseYears = useMemo(
    () =>
      dedupeBy(
        restFilters.filter(
          (x) =>
            numFrom(x, ["fk_college_id", "collegeId"]) === Number(collegeId) &&
            numFrom(x, ["fk_course_group_id", "courseGroupId"]) ===
              Number(courseGroupId),
        ),
        ["fk_course_year_id", "courseYearId"],
      ),
    [restFilters, collegeId, courseGroupId],
  );

  const selectedCourseRow = useMemo(
    () =>
      courses.find(
        (x) => numFrom(x, ["fk_course_id", "courseId"]) === Number(courseId),
      ) ?? {},
    [courses, courseId],
  );
  const selectedExamRow = useMemo(
    () =>
      exams.find(
        (x) => numFrom(x, ["fk_exam_id", "examId"]) === Number(examId),
      ) ?? {},
    [exams, examId],
  );
  // Angular: this.orgCode = selectedCourse.university_code (selectedCourse()).
  // Scan all filter rows for the course — deduped first row can miss university_code.
  const orgCodeFromCourse =
    filters
      .filter(
        (x) => numFrom(x, ["fk_course_id", "courseId"]) === Number(courseId),
      )
      .map(pickUniversityCode)
      .find((v) => Boolean(v)) || pickUniversityCode(selectedCourseRow);
  // Angular login also sets localStorage.orgCode = organizationCode (used elsewhere).
  const orgCode =
    orgCodeFromCourse ||
    pickUniversityCode(resultRows[0] ?? {}) ||
    String(user?.universityCode ?? "").trim() ||
    String(user?.organizationCode ?? "").trim() ||
    String(globalThis?.localStorage?.getItem("universityCode") ?? "").trim() ||
    String(globalThis?.localStorage?.getItem("orgCode") ?? "").trim();
  const courseCode = strFrom(selectedCourseRow, ["course_code", "courseCode"]);
  const dataFlag = courseCode.toUpperCase() !== "DPHARM";
  const isRegular = asBool(
    selectedExamRow.is_regular_exam ?? selectedExamRow.isRegularExam,
  );
  const isSupply = asBool(
    selectedExamRow.is_supply_exam ?? selectedExamRow.isSupplyExam,
  );

  const courseOptions = useMemo(
    () =>
      courses
        .map((x) => ({
          value: String(numFrom(x, ["fk_course_id", "courseId"])),
          label: strFrom(x, ["course_code", "courseCode"]),
        }))
        .filter((o) => o.value !== "0"),
    [courses],
  );
  const yearOptions = useMemo(
    () =>
      years
        .map((x) => ({
          value: String(numFrom(x, ["fk_academic_year_id", "academicYearId"])),
          label: strFrom(x, ["academic_year", "academicYear"]),
        }))
        .filter((o) => o.value !== "0"),
    [years],
  );
  const examOptions = useMemo(
    () =>
      exams
        .map((x) => ({
          value: String(numFrom(x, ["fk_exam_id", "examId"])),
          label: formatExamOptionLabel(x),
          labelNode: examOptionLabelNode(x),
          title: formatExamOptionLabel(x),
        }))
        .filter((o) => o.value !== "0"),
    [exams],
  );
  const collegeOptions = useMemo(
    () =>
      colleges
        .map((x) => ({
          value: String(numFrom(x, ["fk_college_id", "collegeId"])),
          label: strFrom(x, ["college_code", "collegeCode"]),
        }))
        .filter((o) => o.value !== "0"),
    [colleges],
  );
  const groupOptions = useMemo(
    () =>
      groups
        .map((x) => ({
          value: String(numFrom(x, ["fk_course_group_id", "courseGroupId"])),
          label: strFrom(x, ["group_code", "groupCode"]),
        }))
        .filter((o) => o.value !== "0"),
    [groups],
  );
  const courseYearOptions = useMemo(
    () =>
      courseYears
        .map((x) => ({
          value: String(numFrom(x, ["fk_course_year_id", "courseYearId"])),
          label: strFrom(x, ["course_year_code", "courseYearName"]),
        }))
        .filter((o) => o.value !== "0"),
    [courseYears],
  );
  const studentOptions = useMemo(() => {
    const map = new Map<number, AnyRow>();
    for (const row of searchedStudents) {
      const sid = numFrom(row, [
        "student_id",
        "studentId",
        "fk_student_id",
        "studentid",
      ]);
      if (!sid || map.has(sid)) continue;
      map.set(sid, row);
    }
    if (selectedStudentRow) {
      const sid = numFrom(selectedStudentRow, [
        "student_id",
        "studentId",
        "fk_student_id",
        "studentid",
      ]);
      if (sid > 0) map.set(sid, selectedStudentRow);
    }
    return [...map.values()];
  }, [searchedStudents, selectedStudentRow]);

  const selectedStudent = selectedStudentRow;

  function onCollegeChange(v: string | null) {
    const next = v ? Number(v) : null;
    setCollegeId(next);
    setResultRows([]);
    setGradesRows([]);
    setStudentDetailsLoaded(false);
    const nextGroups = dedupeBy(
      restFilters.filter(
        (x) => numFrom(x, ["fk_college_id", "collegeId"]) === Number(next),
      ),
      ["fk_course_group_id", "courseGroupId"],
    );
    const nextGroupId = nextGroups[0]
      ? numFrom(nextGroups[0], ["fk_course_group_id", "courseGroupId"])
      : null;
    setCourseGroupId(nextGroupId);
    const nextYears = dedupeBy(
      restFilters.filter(
        (x) =>
          numFrom(x, ["fk_college_id", "collegeId"]) === Number(next) &&
          numFrom(x, ["fk_course_group_id", "courseGroupId"]) ===
            Number(nextGroupId),
      ),
      ["fk_course_year_id", "courseYearId"],
    );
    setCourseYearId(
      nextYears[0]
        ? numFrom(nextYears[0], ["fk_course_year_id", "courseYearId"])
        : null,
    );
  }

  function onCourseGroupChange(v: string | null) {
    const next = v ? Number(v) : null;
    setCourseGroupId(next);
    setResultRows([]);
    setGradesRows([]);
    setStudentDetailsLoaded(false);
    const nextYears = dedupeBy(
      restFilters.filter(
        (x) =>
          numFrom(x, ["fk_college_id", "collegeId"]) === Number(collegeId) &&
          numFrom(x, ["fk_course_group_id", "courseGroupId"]) === Number(next),
      ),
      ["fk_course_year_id", "courseYearId"],
    );
    setCourseYearId(
      nextYears[0]
        ? numFrom(nextYears[0], ["fk_course_year_id", "courseYearId"])
        : null,
    );
  }

  async function getDetails(selectedStudentId?: number) {
    if (!courseId || !examId || !collegeId || !courseGroupId || !courseYearId) {
      toastInfo(
        "Select Course, Exam, College, Course Group and Course Year first",
      );
      return;
    }
    if (mode === "student" && !(selectedStudentId ?? studentId)) {
      toastInfo("Select a student first");
      return;
    }
    if (!organizationId) {
      toastInfo("Organization not loaded yet — try again");
      return;
    }
    setLoading(true);
    try {
      const data = await getGradeMemoIssueResult({
        organizationId,
        examId,
        collegeId,
        courseId,
        courseGroupId,
        courseYearId,
        studentId: selectedStudentId ?? (mode === "student" ? studentId : 0),
      });
      const groupCode = strFrom(
        groups.find(
          (g) =>
            numFrom(g, ["fk_course_group_id", "courseGroupId"]) ===
            Number(courseGroupId),
        ) ?? {},
        ["group_code", "groupCode"],
      );
      const raw = data.resultRows ?? [];
      const filtered = raw
        .filter((x) =>
          groupCode ? strFrom(x, ["group_code"]) === groupCode : true,
        )
        .sort((a, b) => Number(a.order_no ?? 0) - Number(b.order_no ?? 0));
      setResultRows(filtered);
      setGradesRows(
        [...(data.gradesRows ?? [])].sort(
          (a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0),
        ),
      );
      if (mode === "student") setStudentDetailsLoaded(true);
      if (filtered.length === 0) {
        toastInfo("No grade card details found for the selected filters");
      }
    } catch (e) {
      toastError(e, "Failed to fetch result details");
    } finally {
      setLoading(false);
    }
  }

  async function onStudentSearch(term: string) {
    const q = term.trim();
    if (q.length === 0) {
      setSearchedStudents([]);
      return;
    }
    if (q.length < 5) return;
    setStudentSearchLoading(true);
    try {
      const rows = await searchStudentsByKeyword(q);
      setSearchedStudents(Array.isArray(rows) ? rows : []);
    } catch (e) {
      toastError(e, "Student search failed");
    } finally {
      setStudentSearchLoading(false);
    }
  }

  function onStudentSelect(nextId: number | null, match: AnyRow | null) {
    setStudentId(Number(nextId || 0));
    setSelectedStudentRow(match);
    setResultRows([]);
    setGradesRows([]);
    setStudentDetailsLoaded(false);
  }

  const groupedByStudent = useMemo(() => {
    const map = new Map<string, AnyRow[]>();
    for (const row of resultRows) {
      const key =
        strFrom(row, [
          "hallticket_number",
          "hallticketNumber",
          "roll_number",
          "rollNumber",
        ]) ||
        String(
          numFrom(row, ["student_id", "studentId", "fk_student_id"]) || "",
        );
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      const bucket = map.get(key);
      if (bucket) bucket.push(row);
    }
    const groupsList = [...map.values()].map((rows) =>
      [...rows].sort(
        (a, b) => Number(a.order_no ?? 0) - Number(b.order_no ?? 0),
      ),
    );
    groupsList.sort((a, b) =>
      strFrom(a[0] ?? {}, ["hallticket_number"]).localeCompare(
        strFrom(b[0] ?? {}, ["hallticket_number"]),
        undefined,
        { numeric: true },
      ),
    );
    return groupsList;
  }, [resultRows]);

  const studentPrintGroups = useMemo(() => {
    if (mode !== "student" || studentId <= 0)
      return groupedByStudent.slice(0, 1);
    const sid = Number(studentId);
    const matched = groupedByStudent.filter((rows) =>
      rows.some(
        (r) => numFrom(r, ["student_id", "studentId", "fk_student_id"]) === sid,
      ),
    );
    return matched.length > 0 ? matched : groupedByStudent.slice(0, 1);
  }, [mode, studentId, groupedByStudent]);

  const { printMode, triggerPrint, printView } = useGradeMemoPrint({
    studentGroups: mode === "section" ? groupedByStudent : studentPrintGroups,
    gradesRows,
    memoDate,
    orgCode,
    isRegular,
    isSupply,
    dataFlag,
  });

  function handlePrint(next: GradeMemoPrintMode) {
    // Angular: Sample / Bulk Sample → modal preview (Back + Print).
    // Other print buttons → window.print() after layout swap.
    if (groupedByStudent.length === 0) {
      toastInfo("Get details before printing");
      return;
    }
    triggerPrint(next);
  }

  if (printMode) return <>{printView}</>;

  const showStudentTable =
    mode === "student" && studentDetailsLoaded && studentId > 0;
  const showStudentCard =
    mode === "student" &&
    studentDetailsLoaded &&
    studentId > 0 &&
    !!selectedStudent;

  const studentPrintActions = showStudentTable ? (
    <div className="flex flex-wrap bg-[#fff] items-end justify-end gap-2 px-1 py-3">
      <div className="w-44">
        <label
          htmlFor="grade-memo-student-date"
          className="mb-1 block text-[10px] font-semibold tracking-[0.08em] text-muted-foreground"
        >
          Choose Memo date
        </label>
        <Input
          id="grade-memo-student-date"
          type="date"
          className="h-8 text-[12px]"
          value={memoDate}
          onChange={(e) => setMemoDate(e.target.value)}
        />
      </div>
      <Button
        className="h-8 text-[12px] text-white"
        onClick={() => handlePrint("sample")}
      >
        Sample Grade Card
      </Button>
      <Button
        className="h-8 text-[12px] text-white"
        onClick={() => handlePrint("gradeCard")}
      >
        Print Grade Card
      </Button>
      <Button
        className="h-8 text-[12px] text-white"
        onClick={() => handlePrint("markSheet")}
      >
        Print Mark Sheet
      </Button>
    </div>
  ) : null;

  return (
    <FilteredListPage<AnyRow>
      title={
        mode === "student" ? "Student Exam Certificates" : "Grade Memo Issue"
      }
      tableHeader={
        showStudentTable ? (
          <TableContextHeader title="Student Exam Subjects" />
        ) : (
          <></>
        )
      }
      filters={
        <div className="space-y-3">
          <RadioGroup
            value={mode}
            onValueChange={(value) => {
              const next = value as "section" | "student";
              setMode(next);
              setResultRows([]);
              setGradesRows([]);
              setStudentDetailsLoaded(false);
              if (next === "section") {
                setStudentId(0);
                setSelectedStudentRow(null);
                setSearchedStudents([]);
              }
            }}
            className="flex flex-wrap items-center gap-6"
          >
            <label className="flex items-center gap-2 text-[12px]">
              <RadioGroupItem value="section" id="gmi-mode-section" />
              Certificates By Section
            </label>
            <label className="flex items-center gap-2 text-[12px]">
              <RadioGroupItem value="student" id="gmi-mode-student" />
              Certificates By Student
            </label>
          </RadioGroup>

          <GlobalFilterBarRow>
            <GlobalFilterField label="Course" className="md:!flex-[0_1_12rem]">
              <CommonSelect
                value={courseId ? String(courseId) : null}
                onChange={(v) => selectCourse(v ? Number(v) : null)}
                options={courseOptions}
                placeholder="Course"
                searchable
              />
            </GlobalFilterField>
            <GlobalFilterField
              label="Exam Year"
              className="md:!flex-[0_1_12rem]"
            >
              <CommonSelect
                value={academicYearId ? String(academicYearId) : null}
                onChange={(v) => selectAcademicYear(v ? Number(v) : null)}
                options={yearOptions}
                placeholder="Exam Year"
                searchable
              />
            </GlobalFilterField>
            <GlobalFilterField
              label="Exam Master"
              className="md:!flex-[1_1_28rem]"
            >
              <CommonSelect
                value={examId ? String(examId) : null}
                onChange={(v) => selectExam(v ? Number(v) : null)}
                options={examOptions}
                placeholder="Exam Master"
                searchable
              />
            </GlobalFilterField>
          </GlobalFilterBarRow>

          <GlobalFilterBarRow>
            <GlobalFilterField label="College" className="md:!flex-[0_1_12rem]">
              <CommonSelect
                value={collegeId ? String(collegeId) : null}
                onChange={onCollegeChange}
                options={collegeOptions}
                placeholder="College"
                searchable
              />
            </GlobalFilterField>
            <GlobalFilterField
              label="Course Group"
              className="md:!flex-[0_1_12rem]"
            >
              <CommonSelect
                value={courseGroupId ? String(courseGroupId) : null}
                onChange={onCourseGroupChange}
                options={groupOptions}
                placeholder="Course Group"
                searchable
              />
            </GlobalFilterField>
            <GlobalFilterField
              label="Course Year"
              className="md:!flex-[0_1_12rem]"
            >
              <CommonSelect
                value={courseYearId ? String(courseYearId) : null}
                onChange={(v) => {
                  setCourseYearId(v ? Number(v) : null);
                  setResultRows([]);
                  setGradesRows([]);
                  setStudentDetailsLoaded(false);
                }}
                options={courseYearOptions}
                placeholder="Course Year"
                searchable
              />
            </GlobalFilterField>
            {mode === "student" ? (
              <div className="min-w-0 md:flex-[1_1_22rem]">
                <StudentSearchSelect
                  label="Student"
                  placeholder="Search by student name or roll no."
                  value={studentId > 0 ? studentId : null}
                  students={studentOptions}
                  selectedStudent={selectedStudentRow}
                  isLoading={studentSearchLoading}
                  fullWidth
                  onSearch={(t) => void onStudentSearch(t)}
                  onChange={onStudentSelect}
                />
              </div>
            ) : null}
            <GlobalFilterField
              label=" "
              className="global-filter-field--shrink global-filter-field--action"
            >
              <Button
                className="h-8 text-[12px]"
                onClick={() => void getDetails()}
                disabled={loading}
              >
                {loading ? "Loading..." : "Get Details"}
              </Button>
            </GlobalFilterField>
          </GlobalFilterBarRow>

          {showStudentCard ? (
            <GradeMemoStudentCard student={selectedStudent} />
          ) : null}
        </div>
      }
      rowData={showStudentTable ? resultRows : undefined}
      columnDefs={showStudentTable ? SUBJECT_COLS : undefined}
      loading={loading}
      hideEmptyGrid={!showStudentTable}
      pagination
      exportCsv
      filtersFooter={undefined}
      toolbar={
        showStudentTable
          ? {
              search: true,
              searchPlaceholder: "Search…",
              exportPdf: false,
              exportExcel: false,
            }
          : false
      }
      body={
        showStudentTable ? (
          studentPrintActions
        ) : mode === "section" && groupedByStudent.length > 0 ? (
          <div className="flex flex-wrap bg-[#fff] items-end justify-end gap-2 px-5 py-3">
            <div className="w-40">
              <label
                htmlFor="grade-memo-bulk-date"
                className="mb-1 block text-[10px] font-semibold tracking-[0.08em] text-muted-foreground"
              >
                Choose Memo Date
              </label>
              <Input
                id="grade-memo-bulk-date"
                type="date"
                className="h-8 text-[12px]"
                value={memoDate}
                onChange={(e) => setMemoDate(e.target.value)}
              />
            </div>
            <Button
              className="h-8 text-[12px] text-white"
              onClick={() => handlePrint("bulkSample")}
            >
              Print Bulk Sample Grade Card
            </Button>
            <Button
              className="h-8 text-[12px] text-white"
              onClick={() => handlePrint("bulkGradeCard")}
            >
              Print Bulk Grade Card
            </Button>
            <Button
              className="h-8 text-[12px] text-white"
              onClick={() => handlePrint("bulkMarkSheet")}
            >
              Print Bulk Mark Sheet
            </Button>
          </div>
        ) : null
      }
      bodyClassName="border-t-0 bg-[#fff]"
    />
  );
}
