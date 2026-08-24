"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { format, isValid, parseISO } from "date-fns";
import { GraduationCap } from "lucide-react";
import { DatePicker } from "@/common/components/date-picker";
import { Select as CommonSelect } from "@/common/components/select";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  getExternalAttendanceFilters,
  getExternalAttendanceRestFilters,
  getExternalAttendanceSubjects,
  listActiveRooms,
  listExternalAttendanceStudents,
  saveInternalAttendance,
  uploadInvigilatorAttendanceSheet,
} from "@/services/post-examination";
import { toastError, toastSuccess } from "@/lib/toast";

type AnyRow = Record<string, any>;

function ymdToDate(ymd: string): Date | null {
  if (!ymd) return null;
  try {
    const d = parseISO(String(ymd).slice(0, 10));
    return isValid(d) ? d : null;
  } catch {
    return null;
  }
}

/** Angular `date:'MMM d, y'` */
function formatExamDateLabel(raw: unknown): string {
  if (!raw) return "";
  try {
    const d = parseISO(String(raw).slice(0, 10));
    return isValid(d) ? format(d, "MMM d, yyyy") : String(raw).slice(0, 10);
  } catch {
    return String(raw).slice(0, 10);
  }
}

/** Angular exam mat-option: name (from - to) + (Regular)/(Supple) badges */
function formatExamLabel(row: AnyRow): string {
  const name = String(row.exam_name ?? row.examName ?? "Exam");
  const from = formatExamDateLabel(row.from_date ?? row.fromDate);
  const to = formatExamDateLabel(row.to_date ?? row.toDate);
  const range = from && to ? ` (${from} - ${to})` : "";
  const badges: string[] = [];
  if (row.is_internal_exam) badges.push("Internal");
  if (row.is_regular_exam) badges.push("Regular");
  if (row.is_supply_exam) badges.push("Supple");
  const badgeText = badges.length ? ` (${badges.join(", ")})` : "";
  return `${name}${range}${badgeText}`;
}

/** Angular subject mat-option label */
function formatSubjectLabel(row: AnyRow): string {
  const name = String(row.subject_name ?? row.subjectName ?? "");
  const code = String(row.subject_code ?? row.subjectCode ?? "");
  const reg = String(row.regulation_code ?? row.regulationCode ?? "");
  const examType = String(
    row.ttd_exam_type ?? row.ttdExamType ?? row.exam_type ?? "",
  );
  let label = name;
  if (code) label += ` - ${code}`;
  if (reg) label += ` (${reg})`;
  if (examType) label += ` (${examType})`;
  return label || code || "Subject";
}

type AttendanceRow = {
  examStdDetId: number;
  examTimetableId: number;
  examId: number;
  studentId: number;
  hallticketNumber: string;
  groupCode: string;
  firstName: string;
  subjectCode: string;
  subjectName: string;
  attendanceTakenEmpId: number;
  attendanceTakenDate: string;
  isPresent: boolean;
  isufm: boolean;
};

type MarkRendererParams = ICellRendererParams<AttendanceRow> & {
  onTogglePresent: (examStdDetId: number, value: boolean) => void;
};

type UfmRendererParams = ICellRendererParams<AttendanceRow> & {
  onToggleUfm: (examStdDetId: number, value: boolean) => void;
};

function MarkRenderer(params: MarkRendererParams) {
  return (
    <label className="inline-flex items-center gap-2 text-[12px]">
      <Checkbox
        className="h-4 w-4 shrink-0"
        checked={Boolean(params.data?.isPresent)}
        onCheckedChange={(v) =>
          params.data &&
          params.onTogglePresent(params.data.examStdDetId, Boolean(v))
        }
      />
      <span>{params.data?.isPresent ? "Present" : "Absent"}</span>
    </label>
  );
}

function UfmRenderer(params: UfmRendererParams) {
  return (
    <Checkbox
      className="h-4 w-4 shrink-0"
      checked={Boolean(params.data?.isufm)}
      onCheckedChange={(v) =>
        params.data && params.onToggleUfm(params.data.examStdDetId, Boolean(v))
      }
    />
  );
}

function dedupeBy<T extends AnyRow>(arr: T[], key: string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of arr) {
    const value = String(row?.[key] ?? "");
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(row);
  }
  return out;
}

function normalizeRows(rows: AnyRow[]): AttendanceRow[] {
  return rows.map((r, i) => ({
    examStdDetId: Number(r.pk_exam_std_det_id ?? i + 1),
    examTimetableId: Number(
      r.examTimeTableId ?? r.exam_timetable_id ?? r.fk_exam_timetable_id ?? 0,
    ),
    examId: Number(r.fk_exam_id ?? 0),
    studentId: Number(r.fk_student_id ?? 0),
    hallticketNumber: String(r.hallticket_number ?? r.roll_number ?? "-"),
    groupCode: String(r.group_code ?? "-"),
    firstName: String(r.student_name ?? r.firstName ?? "-"),
    subjectCode: String(r.subject_code ?? "-"),
    subjectName: String(r.subject_name ?? "-"),
    attendanceTakenEmpId: Number(r.fk_attendance_taken_emp_id ?? 0),
    attendanceTakenDate: String(r.attendance_taken_date ?? ""),
    isPresent: r.is_present == null ? true : Boolean(r.is_present),
    isufm: Boolean(r.isufm),
  }));
}

export default function ExternalExamAttendanceMarkingPage() {
  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );
  // Angular: localStorage roleName — ADMIN sees published exams; others hide them.
  const roleName = String(globalThis?.localStorage?.getItem("roleName") ?? "");
  const isAdmin = roleName.toUpperCase() === "ADMIN";

  const [loadingFilters, setLoadingFilters] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAttendance, setUploadingAttendance] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const [allFilters, setAllFilters] = useState<AnyRow[]>([]);
  const [subjectRows, setSubjectRows] = useState<AnyRow[]>([]);
  const [restRows, setRestRows] = useState<AnyRow[]>([]);
  const [roomRows, setRoomRows] = useState<AnyRow[]>([]);
  const [rows, setRows] = useState<AttendanceRow[]>([]);

  const [courseId, setCourseId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [examId, setExamId] = useState<number | null>(null);
  const [regulationId, setRegulationId] = useState<number | null>(null);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [courseGroupId, setCourseGroupId] = useState<number | null>(0);
  const [courseYearId, setCourseYearId] = useState<number | null>(0);
  const [roomId, setRoomId] = useState<number | null>(0);
  const [examDate, setExamDate] = useState("");
  const [selectedAttendanceFileName, setSelectedAttendanceFileName] =
    useState("");
  const attendanceFileInputRef = useRef<HTMLInputElement | null>(null);

  const courses = useMemo(
    () => dedupeBy(allFilters, "fk_course_id"),
    [allFilters],
  );
  const academicYears = useMemo(() => {
    const list = dedupeBy(
      allFilters.filter((x) => Number(x.fk_course_id) === Number(courseId)),
      "fk_academic_year_id",
    );
    // Angular selectedCourse: sort academic years DESC
    return [...list].sort(
      (a, b) =>
        parseInt(String(b.academic_year ?? 0), 10) -
        parseInt(String(a.academic_year ?? 0), 10),
    );
  }, [allFilters, courseId]);
  const exams = useMemo(() => {
    let list = dedupeBy(
      allFilters.filter(
        (x) =>
          Number(x.fk_course_id) === Number(courseId) &&
          Number(x.fk_academic_year_id) === Number(academicYearId),
      ),
      "fk_exam_id",
    );
    // Angular selectedAcademicYear:
    //   if (roleName == 'ADMIN') keep all; else filter is_published == false
    // Offline Internal Evaluator is non-ADMIN → only unpublished exams.
    if (!isAdmin) {
      list = list.filter(
        (x) => x.is_published == false || x.isPublished == false,
      );
    }
    return list;
  }, [allFilters, courseId, academicYearId, isAdmin]);
  const regulations = useMemo(
    () => dedupeBy(subjectRows, "fk_regulation_id"),
    [subjectRows],
  );
  const subjects = useMemo(
    () =>
      dedupeBy(
        subjectRows.filter(
          (x) => Number(x.fk_regulation_id) === Number(regulationId),
        ),
        "fk_subject_id",
      ),
    [subjectRows, regulationId],
  );
  const courseGroups = useMemo(
    () => [
      0,
      ...dedupeBy(restRows, "fk_course_group_id").map((x) =>
        Number(x.fk_course_group_id),
      ),
    ],
    [restRows],
  );
  const courseYears = useMemo(() => {
    const source =
      Number(courseGroupId) > 0
        ? restRows.filter(
            (x) => Number(x.fk_course_group_id) === Number(courseGroupId),
          )
        : restRows;
    return [
      0,
      ...dedupeBy(source, "fk_course_year_id").map((x) =>
        Number(x.fk_course_year_id),
      ),
    ];
  }, [restRows, courseGroupId]);
  const rooms = useMemo(
    () => [
      0,
      ...dedupeBy(roomRows, "roomId")
        .map((x) => Number(x.roomId))
        .filter((x) => Number.isFinite(x) && x >= 0),
    ],
    [roomRows],
  );

  function clearResults() {
    setRows([]);
    setHasFetched(false);
  }

  /** Angular selectedCourse — clear everything below Course */
  function onCourseChange(next: number | null) {
    setCourseId(next);
    setAcademicYearId(null);
    setExamId(null);
    setRegulationId(null);
    setSubjectId(null);
    setSubjectRows([]);
    setRestRows([]);
    setExamDate("");
    setCourseGroupId(0);
    setCourseYearId(0);
    setRoomId(0);
    clearResults();
  }

  /** Angular selectedAcademicYear — clear Exam and below */
  function onAcademicYearChange(next: number | null) {
    setAcademicYearId(next);
    setExamId(null);
    setRegulationId(null);
    setSubjectId(null);
    setSubjectRows([]);
    setRestRows([]);
    setExamDate("");
    setCourseGroupId(0);
    setCourseYearId(0);
    setRoomId(0);
    clearResults();
  }

  /** Angular selectedExam — clear Regulation and below; subjects reload via effect */
  function onExamChange(next: number | null) {
    setExamId(next);
    setRegulationId(null);
    setSubjectId(null);
    setSubjectRows([]);
    setRestRows([]);
    setExamDate("");
    setCourseGroupId(0);
    setCourseYearId(0);
    setRoomId(0);
    clearResults();
  }

  /** Angular selectedRegulation — clear Subject and below */
  function onRegulationChange(next: number | null) {
    setRegulationId(next);
    setSubjectId(null);
    setRestRows([]);
    setExamDate("");
    setCourseGroupId(0);
    setCourseYearId(0);
    setRoomId(0);
    clearResults();
  }

  /** Angular selectedSubject — clear Group/Year/Room; rest filters reload via effect */
  function onSubjectChange(next: number | null) {
    setSubjectId(next);
    setRestRows([]);
    setCourseGroupId(0);
    setCourseYearId(0);
    setRoomId(0);
    clearResults();
  }

  /** Angular selectedCourseGroup — reset Course Year to All */
  function onCourseGroupChange(next: number) {
    setCourseGroupId(next);
    setCourseYearId(0);
    clearResults();
  }

  /** Angular selectedYear */
  function onCourseYearChange(next: number) {
    setCourseYearId(next);
    clearResults();
  }

  /** Angular selectedroom */
  function onRoomChange(next: number) {
    setRoomId(next);
    clearResults();
  }

  useEffect(() => {
    async function loadInitial() {
      setLoadingFilters(true);
      try {
        // Angular: filters by emp id + Room?isActive==true for all roles
        const [filters, roomsData] = await Promise.all([
          getExternalAttendanceFilters(employeeId).catch(() => []),
          listActiveRooms().catch(() => []),
        ]);
        setAllFilters(Array.isArray(filters) ? filters : []);
        setRoomRows(Array.isArray(roomsData) ? roomsData : []);
      } finally {
        setLoadingFilters(false);
      }
    }
    void loadInitial();
  }, [employeeId]);

  useEffect(() => {
    let cancelled = false;
    async function loadSubjects() {
      setSubjectRows([]);
      setRestRows([]);
      if (!courseId || !academicYearId || !examId) return;
      const data = await getExternalAttendanceSubjects({
        courseId,
        academicYearId,
        examId,
        employeeId,
      }).catch(() => []);
      if (cancelled) return;
      setSubjectRows(Array.isArray(data) ? data : []);
    }
    void loadSubjects();
    return () => {
      cancelled = true;
    };
  }, [courseId, academicYearId, examId, employeeId]);

  useEffect(() => {
    let cancelled = false;
    async function loadRest() {
      setRestRows([]);
      if (
        !courseId ||
        !academicYearId ||
        !examId ||
        !regulationId ||
        !subjectId
      )
        return;
      const data = await getExternalAttendanceRestFilters({
        courseId,
        academicYearId,
        examId,
        regulationId,
        subjectId,
        employeeId,
      }).catch(() => []);
      if (cancelled) return;
      setRestRows(Array.isArray(data) ? data : []);
      // Angular selectedSubject → courseGroupId=0 → selectedCourseGroup → courseYearId=0
      setCourseGroupId(0);
      setCourseYearId(0);
    }
    void loadRest();
    return () => {
      cancelled = true;
    };
  }, [courseId, academicYearId, examId, regulationId, subjectId, employeeId]);

  // Initial / invalid → first course (Angular getExamFiltersList)
  useEffect(() => {
    if (courses.length === 0) return;
    setCourseId((prev) =>
      prev != null &&
      courses.some((x) => Number(x.fk_course_id) === Number(prev))
        ? Number(prev)
        : Number(courses[0].fk_course_id),
    );
  }, [courses]);

  // Prefer current AY, else newest year (Angular selectedCourse)
  useEffect(() => {
    if (academicYears.length === 0) {
      setAcademicYearId(null);
      return;
    }
    const preferred =
      academicYears.find((x) => Number(x.is_curr_ay) === 1) ?? academicYears[0];
    const preferredId = Number(preferred?.fk_academic_year_id ?? 0);
    if (!preferredId) {
      setAcademicYearId(null);
      return;
    }
    setAcademicYearId((prev) =>
      prev != null &&
      academicYears.some((x) => Number(x.fk_academic_year_id) === Number(prev))
        ? Number(prev)
        : preferredId,
    );
  }, [academicYears]);

  // Auto-select first exam when cleared/invalid (Angular selectedAcademicYear)
  useEffect(() => {
    if (exams.length === 0) {
      setExamId(null);
      setRegulationId(null);
      setSubjectId(null);
      setSubjectRows([]);
      setRestRows([]);
      setExamDate("");
      setCourseGroupId(0);
      setCourseYearId(0);
      setRoomId(0);
      setRows([]);
      setHasFetched(false);
      return;
    }
    setExamId((prev) =>
      prev != null && exams.some((x) => Number(x.fk_exam_id) === Number(prev))
        ? Number(prev)
        : Number(exams[0].fk_exam_id),
    );
  }, [exams]);

  useEffect(() => {
    if (regulations.length === 0) {
      setRegulationId(null);
      return;
    }
    setRegulationId((prev) =>
      prev != null &&
      regulations.some((x) => Number(x.fk_regulation_id) === Number(prev))
        ? Number(prev)
        : Number(regulations[0].fk_regulation_id),
    );
  }, [regulations]);

  useEffect(() => {
    if (subjects.length === 0) {
      setSubjectId(null);
      setExamDate("");
      return;
    }
    setSubjectId((prev) =>
      prev != null &&
      subjects.some((x) => Number(x.fk_subject_id) === Number(prev))
        ? Number(prev)
        : Number(subjects[0].fk_subject_id),
    );
  }, [subjects]);

  const selectedSubject = useMemo(
    () =>
      subjects.find((x) => Number(x.fk_subject_id) === Number(subjectId)) ??
      null,
    [subjects, subjectId],
  );

  useEffect(() => {
    const nextDate = String(
      selectedSubject?.exam_date ?? selectedSubject?.examDate ?? "",
    ).slice(0, 10);
    setExamDate(nextDate || "");
  }, [selectedSubject]);

  const courseOptions = useMemo(
    () =>
      courses.map((x) => ({
        value: String(x.fk_course_id),
        label: String(x.course_code ?? "-"),
      })),
    [courses],
  );
  const academicYearOptions = useMemo(
    () =>
      academicYears.map((x) => ({
        value: String(x.fk_academic_year_id),
        label: String(x.academic_year ?? "-"),
      })),
    [academicYears],
  );
  const examOptions = useMemo(
    () =>
      exams.map((x) => ({
        value: String(x.fk_exam_id),
        label: formatExamLabel(x),
      })),
    [exams],
  );
  const regulationOptions = useMemo(
    () =>
      regulations.map((x) => ({
        value: String(x.fk_regulation_id),
        label: String(x.regulation_code ?? "-"),
      })),
    [regulations],
  );
  const subjectOptions = useMemo(
    () =>
      subjects.map((x) => ({
        value: String(x.fk_subject_id),
        label: formatSubjectLabel(x),
      })),
    [subjects],
  );
  const courseGroupOptions = useMemo(
    () =>
      courseGroups.map((x) => ({
        value: String(x),
        label:
          x === 0
            ? "All"
            : String(
                restRows.find((r) => Number(r.fk_course_group_id) === x)
                  ?.group_code ?? `Group ${x}`,
              ),
      })),
    [courseGroups, restRows],
  );
  const courseYearOptions = useMemo(
    () =>
      courseYears.map((x) => ({
        value: String(x),
        label:
          x === 0
            ? "All"
            : String(
                restRows.find((r) => Number(r.fk_course_year_id) === x)
                  ?.course_year_code ?? `Year ${x}`,
              ),
      })),
    [courseYears, restRows],
  );
  const roomOptions = useMemo(
    () =>
      rooms.map((x) => ({
        value: String(x),
        label:
          x === 0
            ? "All"
            : String(
                roomRows.find((r) => Number(r.roomId) === x)?.roomCode ??
                  `Room ${x}`,
              ),
      })),
    [rooms, roomRows],
  );

  const absentees = useMemo(() => rows.filter((r) => !r.isPresent), [rows]);
  const allPresent = useMemo(
    () => rows.length > 0 && rows.every((r) => r.isPresent),
    [rows],
  );
  const selectedExam = useMemo(
    () => exams.find((x) => Number(x.fk_exam_id) === Number(examId)),
    [exams, examId],
  );
  const examMinDate = useMemo(
    () =>
      ymdToDate(
        String(selectedExam?.from_date ?? selectedExam?.fromDate ?? ""),
      ),
    [selectedExam],
  );
  const examMaxDate = useMemo(
    () =>
      ymdToDate(String(selectedExam?.to_date ?? selectedExam?.toDate ?? "")),
    [selectedExam],
  );
  const selectedCourse = useMemo(
    () => courses.find((x) => Number(x.fk_course_id) === Number(courseId)),
    [courses, courseId],
  );
  const selectedRoom = useMemo(
    () => roomRows.find((x) => Number(x.roomId) === Number(roomId)),
    [roomRows, roomId],
  );
  const examTypeText = useMemo(() => {
    const isInternal = Boolean(selectedExam?.is_internal_exam);
    const isRegular = Boolean(selectedExam?.is_regular_exam);
    const isSupply = Boolean(selectedExam?.is_supply_exam);
    if (isInternal && !isRegular && !isSupply) return "Internal";
    if (!isInternal && isRegular && !isSupply) return "Regular";
    if (!isInternal && !isRegular && isSupply) return "Supple";
    if (!isInternal && isRegular && isSupply) return "Regular / Supple";
    return "";
  }, [selectedExam]);
  const onTogglePresent = (examStdDetId: number, value: boolean) => {
    setRows((prev) =>
      prev.map((r) =>
        r.examStdDetId === examStdDetId ? { ...r, isPresent: value } : r,
      ),
    );
  };
  const onToggleUfm = (examStdDetId: number, value: boolean) => {
    setRows((prev) =>
      prev.map((r) =>
        r.examStdDetId === examStdDetId ? { ...r, isufm: value } : r,
      ),
    );
  };
  async function onGetList() {
    if (
      !courseId ||
      !academicYearId ||
      !examId ||
      !regulationId ||
      !subjectId ||
      !examDate
    )
      return;
    setLoadingList(true);
    setHasFetched(true);
    try {
      const data = await listExternalAttendanceStudents({
        examId,
        courseId,
        courseGroupId: courseGroupId ?? 0,
        courseYearId: courseYearId ?? 0,
        roomId: roomId ?? 0,
        regulationId,
        examDate,
        subjectId,
      }).catch(() => []);
      setRows(normalizeRows(Array.isArray(data) ? data : []));
    } finally {
      setLoadingList(false);
    }
  }

  async function onSave() {
    if (rows.length === 0) return;
    setSaving(true);
    try {
      await saveInternalAttendance(
        rows.map((r) => ({
          examStdDetId: r.examStdDetId,
          examId: r.examId,
          studentId: r.studentId,
          hallticketNo: r.hallticketNumber,
          attendanceTakenEmpId: r.attendanceTakenEmpId,
          attendanceTakenDate: r.attendanceTakenDate,
          subjectName: r.subjectName,
          isPresent: r.isPresent,
          isufm: r.isufm,
          isActive: true,
        })),
      );
      toastSuccess("Attendance saved successfully");
      await onGetList();
    } catch (error) {
      toastError(error, "Failed to save attendance");
    } finally {
      setSaving(false);
    }
  }

  function onUploadAttendanceClick() {
    attendanceFileInputRef.current?.click();
  }

  async function onAttendanceFileChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedAttendanceFileName(file.name);

    const examTimetableId =
      rows.find((r) => Number(r.examTimetableId) > 0)?.examTimetableId ?? 0;
    if (!examTimetableId) {
      toastError(
        "Exam timetable not found for selected attendance rows",
        "Upload failed",
      );
      event.target.value = "";
      return;
    }

    setUploadingAttendance(true);
    try {
      await uploadInvigilatorAttendanceSheet({
        examInvEmployeeId: employeeId,
        examTimetableId,
        studentAttendance: file,
      });
      toastSuccess("Attendance file uploaded successfully");
      await onGetList();
    } catch (error) {
      toastError(error, "Failed to upload attendance file");
    } finally {
      setUploadingAttendance(false);
      event.target.value = "";
    }
  }

  const columnDefs = useMemo<ColDef<AttendanceRow>[]>(
    () => [
      {
        headerName: "SI.No",
        width: 55,
        minWidth: 55,
        maxWidth: 55,
        flex: 0,
        valueGetter: (p: any) => (p.node?.rowIndex ?? 0) + 1,
      },
      {
        field: "hallticketNumber",
        headerName: "Hall Ticket No",
        width: 150,
        minWidth: 140,
        maxWidth: 160,
        flex: 0,
      },
      { field: "groupCode", headerName: "Group", minWidth: 90, flex: 0 },
      {
        field: "firstName",
        headerName: "Student Name",
        minWidth: 180,
        flex: 1,
      },
      {
        headerName: "Subject",
        minWidth: 140,
        valueGetter: (p: any) => {
          const code = p.data?.subjectCode ?? "-";
          const name = p.data?.subjectName ?? "-";
          return `${code} - ${name}`;
        },
      },
      {
        headerName: "Status",
        minWidth: 110,
        flex: 0,
        valueGetter: (p: any) => (p.data?.isPresent ? "Present" : "Absent"),
      },
      {
        headerName: "Mark",
        minWidth: 130,
        flex: 0,
        cellRenderer: MarkRenderer,
        cellRendererParams: { onTogglePresent },
      },
      {
        headerName: "MalPractice",
        width: 95,
        minWidth: 95,
        maxWidth: 95,
        flex: 0,
        cellRenderer: UfmRenderer,
        cellRendererParams: { onToggleUfm },
      },
    ],
    [onTogglePresent, onToggleUfm],
  );

  return (
    <FilteredListPage
      title="External Exam Attendance Marking"
      tableTitle="Mark Exam Attendance"
      filters={
        <div className="grid grid-cols-1 gap-2 md:grid-cols-12 md:items-end">
          <div className="space-y-1 md:col-span-2">
            <CommonSelect
              label="Course"
              value={courseId ? String(courseId) : null}
              onChange={(v) => onCourseChange(v ? Number(v) : null)}
              options={courseOptions}
              placeholder={loadingFilters ? "Loading…" : "Course"}
              disabled={loadingFilters}
              searchable
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <CommonSelect
              label="Exam Year"
              value={academicYearId ? String(academicYearId) : null}
              onChange={(v) => onAcademicYearChange(v ? Number(v) : null)}
              options={academicYearOptions}
              placeholder="Exam Year"
              searchable
            />
          </div>
          <div className="space-y-1 md:col-span-6">
            <CommonSelect
              label="Exam"
              value={examId ? String(examId) : null}
              onChange={(v) => onExamChange(v ? Number(v) : null)}
              options={examOptions}
              placeholder="Exam"
              searchable
              wrapOptionLabels
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <CommonSelect
              label="Regulation"
              value={regulationId ? String(regulationId) : null}
              onChange={(v) => onRegulationChange(v ? Number(v) : null)}
              options={regulationOptions}
              placeholder="Regulation"
              searchable
            />
          </div>
          <div className="space-y-1 md:col-span-5">
            <CommonSelect
              label="Subject"
              value={subjectId ? String(subjectId) : null}
              onChange={(v) => onSubjectChange(v ? Number(v) : null)}
              options={subjectOptions}
              placeholder="Subject"
              searchable
              wrapOptionLabels
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <CommonSelect
              label="Course Group"
              value={courseGroupId === null ? "0" : String(courseGroupId)}
              onChange={(v) => onCourseGroupChange(Number(v ?? 0))}
              options={courseGroupOptions}
              placeholder="Course Group"
              searchable
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <CommonSelect
              label="Course Year"
              value={courseYearId === null ? "0" : String(courseYearId)}
              onChange={(v) => onCourseYearChange(Number(v ?? 0))}
              options={courseYearOptions}
              placeholder="Course Year"
              searchable
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <DatePicker
              label="Exam Date"
              placeholder="dd/MM/yyyy"
              displayFormat="dd/MM/yyyy"
              value={ymdToDate(examDate)}
              onChange={() => {}}
              minDate={examMinDate ?? undefined}
              maxDate={examMaxDate ?? undefined}
              clearable={false}
              disabled
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <CommonSelect
              label="Room"
              value={roomId === null ? "0" : String(roomId)}
              onChange={(v) => onRoomChange(Number(v ?? 0))}
              options={roomOptions}
              placeholder="Room"
              searchable
            />
          </div>
          <div className="md:col-span-1">
            <Button
              className="h-8 text-[12px] w-full"
              onClick={onGetList}
              disabled={loadingList}
            >
              {loadingList ? "Loading..." : "Get List"}
            </Button>
          </div>
        </div>
      }
      tableHeader={
        hasFetched && rows.length > 0 ? (
          <div className="space-y-3">
            <div className="table-context-header">
              <span
                className="material-icons table-context-header__icon"
                aria-hidden
              >
                book
              </span>
              <strong className="table-context-header__title">
                Mark Exam Attendance
              </strong>
            </div>
            <div className="overflow-hidden rounded border-2 border-[#c3d9ff] bg-card p-2">
              <div className="flex items-start gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center bg-[#c3d9ff] text-slate-700">
                  <GraduationCap className="h-10 w-10" />
                </div>
                <div className="space-y-1 text-[13px] text-slate-600">
                  <p>
                    {selectedExam?.exam_name ?? "-"}{" "}
                    {examTypeText ? (
                      <span className="text-blue-700">({examTypeText})</span>
                    ) : null}
                  </p>
                  <p>
                    {selectedCourse?.course_code ?? "-"}{" "}
                    {examDate ? (
                      <span className="text-blue-700">({examDate})</span>
                    ) : null}
                  </p>
                  <p>
                    Room :{" "}
                    <span className="text-slate-800">
                      {selectedRoom?.roomCode ?? "-"}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null
      }
      rowData={hasFetched ? rows : []}
      columnDefs={columnDefs}
      loading={loadingList}
      resultsVisible={hasFetched && rows.length > 0}
      hideEmptyGrid
      fitColumnsToWidth={false}
      // autoHeight
      pagination
      toolbar={
        hasFetched && rows.length > 0
          ? {
              search: true,
              searchPlaceholder: "Search…",
              exportExcel: false,
              exportPdf: false,
              pdfDocumentTitle: "External Exam Attendance",
            }
          : false
      }
      toolbarTrailing={
        hasFetched && rows.length > 0 ? (
          <label className="inline-flex shrink-0 items-center gap-2 text-[12px]">
            <Checkbox
              className="h-4 w-4 shrink-0"
              checked={allPresent}
              onCheckedChange={(v) =>
                setRows((prev) =>
                  prev.map((r) => ({ ...r, isPresent: Boolean(v) })),
                )
              }
            />
            <span>{allPresent ? "UnMark All" : "Mark All"}</span>
          </label>
        ) : undefined
      }
      rightRail={
        hasFetched && rows.length > 0 ? (
          <div className="space-y-3">
            <div className="overflow-hidden rounded border border-[#c3d9ff] bg-card">
              <h3 className="bg-[#c3d9ff] px-3 py-2 text-center text-[14px] font-semibold uppercase text-slate-700">
                Absentees :{" "}
                <span className="rounded-full bg-cyan-300 px-2 py-0.5">
                  {absentees.length}
                </span>
              </h3>
              <div className="max-h-[420px] overflow-auto p-3 text-[12px]">
                {absentees.length === 0 ? (
                  <p className="text-muted-foreground">No absents found.</p>
                ) : (
                  absentees.map((a) => (
                    <p key={a.examStdDetId} className="mb-1">
                      {a.firstName} (
                      <span className="text-blue-700">
                        {a.hallticketNumber}
                      </span>
                      )
                    </p>
                  ))
                )}
              </div>
            </div>
            {/* Same placement as Internal Exam Attendance Marking right rail */}
            <div className="flex flex-col items-center gap-2">
              <Button
                className="h-8 px-5 text-[12px]"
                onClick={onUploadAttendanceClick}
                disabled={uploadingAttendance || rows.length === 0}
              >
                {uploadingAttendance ? "Uploading..." : "Upload Attendance"}
              </Button>
              <input
                ref={attendanceFileInputRef}
                type="file"
                className="hidden"
                accept=".png,.jpg,.jpeg,.pdf,.doc,.docx,.xls,.xlsx"
                onChange={onAttendanceFileChange}
              />
              <Button
                className="h-8 px-5 text-[12px]"
                onClick={onSave}
                disabled={saving || rows.length === 0}
              >
                {saving ? "Saving..." : "Save Attendance"}
              </Button>
              {selectedAttendanceFileName ? (
                <p className="text-center text-[11px] text-muted-foreground">
                  Selected file: {selectedAttendanceFileName}
                </p>
              ) : null}
            </div>
          </div>
        ) : null
      }
    />
  );
}
