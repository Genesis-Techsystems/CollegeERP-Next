"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Eye, GraduationCap } from "lucide-react";
import { FilteredListPage } from "@/components/layout";
import { Select } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { MINIO_URL } from "@/config/constants/api";
import {
  getInternalAttendanceFilters,
  getInternalAttendanceRestFilters,
  getInternalAttendanceStudents,
  getInternalAttendanceSubjects,
  listActiveRooms,
  listExamAllotmentInvigilators,
  listStaffExamAllotInvigilators,
  saveInternalAttendance,
  uploadInvigilatorAttendanceSheet,
} from "@/services";
import { toastError, toastSuccess } from "@/lib/toast";

type AnyRow = Record<string, any>;

type AttendanceRow = {
  examStdDetId: number;
  examId: number;
  studentId: number;
  hallticketNumber: string;
  groupCode: string;
  firstName: string;
  subjectCode: string;
  subjectName: string;
  examName: string;
  courseYearCode: string;
  examTypeCode: string;
  rollNumber: string;
  isPresent: boolean;
  isufm: boolean;
  attendanceTakenEmpId: number;
  attendanceTakenDate: string;
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

function regulationIdOf(row: AnyRow): number {
  return Number(row?.fk_regulation_id ?? row?.regulation_id ?? row?.regulationId ?? 0);
}

/** Angular selectedCollege → selectedCourseGroup → selectedYear (client-side only). */
function cascadeFromRest(
  rows: AnyRow[],
  collegeId: number,
  preferredGroupId?: number | null,
  preferredYearId?: number | null,
): { courseGroupId: number; courseYearId: number; regulationId: number | null } {
  const groupRows = dedupeBy(
    rows.filter((x) => Number(x.fk_college_id) === Number(collegeId)),
    "fk_course_group_id",
  );
  let nextGroupId: number;
  if (preferredGroupId === 0) {
    nextGroupId = 0;
  } else if (
    preferredGroupId != null &&
    groupRows.some(
      (x) => Number(x.fk_course_group_id) === Number(preferredGroupId),
    )
  ) {
    nextGroupId = Number(preferredGroupId);
  } else {
    nextGroupId = groupRows[0] ? Number(groupRows[0].fk_course_group_id) : 0;
  }

  const yearRows = dedupeBy(
    rows.filter(
      (x) =>
        Number(x.fk_college_id) === Number(collegeId) &&
        (nextGroupId === 0 ||
          Number(x.fk_course_group_id) === Number(nextGroupId)),
    ),
    "fk_course_year_id",
  );
  let nextYearId: number;
  if (preferredYearId === 0) {
    nextYearId = 0;
  } else if (
    preferredYearId != null &&
    yearRows.some((x) => Number(x.fk_course_year_id) === Number(preferredYearId))
  ) {
    nextYearId = Number(preferredYearId);
  } else {
    nextYearId = yearRows[0] ? Number(yearRows[0].fk_course_year_id) : 0;
  }

  const regRows = dedupeBy(
    rows
      .filter(
        (x) =>
          Number(x.fk_college_id) === Number(collegeId) &&
          (nextGroupId === 0 ||
            Number(x.fk_course_group_id) === Number(nextGroupId)) &&
          (nextYearId === 0 ||
            Number(x.fk_course_year_id) === Number(nextYearId)) &&
          regulationIdOf(x) > 0,
      )
      .map((x) => ({ ...x, fk_regulation_id: regulationIdOf(x) })),
    "fk_regulation_id",
  );

  return {
    courseGroupId: nextGroupId,
    courseYearId: nextYearId,
    regulationId:
      nextGroupId === 0 || nextYearId === 0
        ? null
        : regRows[0]
          ? Number(regRows[0].fk_regulation_id)
          : null,
  };
}

function normalizeAttendanceRows(rows: AnyRow[]): AttendanceRow[] {
  return rows.map((r, i) => {
    const isPresent = r.is_present == null ? true : Boolean(r.is_present);
    const isufm = r.isufm == null ? false : Boolean(r.isufm);
    const rollNumber = String(r.roll_number ?? r.rollNumber ?? "-");
    return {
      examStdDetId: Number(r.pk_exam_std_det_id ?? r.examStdDetId ?? i + 1),
      examId: Number(r.fk_exam_id ?? r.examId ?? 0),
      studentId: Number(r.fk_student_id ?? r.studentId ?? 0),
      hallticketNumber: String(
        r.hallticket_number ?? r.hallticketNumber ?? rollNumber,
      ),
      groupCode: String(r.group_code ?? r.groupCode ?? "-"),
      firstName: String(r.student_name ?? r.firstName ?? "-"),
      subjectCode: String(r.subject_code ?? r.subjectCode ?? "-"),
      subjectName: String(r.subject_name ?? r.subjectName ?? "-"),
      examName: String(r.exam_name ?? r.examName ?? ""),
      courseYearCode: String(r.course_year_code ?? r.courseYearCode ?? ""),
      examTypeCode: String(r.exam_type ?? r.examTypeCode ?? ""),
      rollNumber,
      isPresent,
      isufm,
      attendanceTakenEmpId: Number(
        r.fk_attendance_taken_emp_id ?? r.attendanceTakenEmpId ?? 0,
      ),
      attendanceTakenDate: String(
        r.attendance_taken_date ?? r.attendanceTakenDate ?? "",
      ),
    };
  });
}

export default function InternalExamAttendanceMarkingPage() {
  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );
  const roleName = String(globalThis?.localStorage?.getItem("roleName") ?? "");
  const isAdmin = roleName === "ADMIN";
  const isStaff = roleName === "STAFF" || roleName === "MSTAFF";

  const [loadingFilters, setLoadingFilters] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAttendance, setUploadingAttendance] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const [examListDetails, setExamListDetails] = useState<AnyRow[]>([]);
  const [collegesListDetails, setCollegesListDetails] = useState<AnyRow[]>([]);
  const [subjectTypeList, setSubjectTypeList] = useState<AnyRow[]>([]);
  const [roomRows, setRoomRows] = useState<AnyRow[]>([]);
  const [invigilatorRows, setInvigilatorRows] = useState<AnyRow[]>([]);
  const [rows, setRows] = useState<AttendanceRow[]>([]);

  const [courseId, setCourseId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [examId, setExamId] = useState<number | null>(null);
  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [courseGroupId, setCourseGroupId] = useState<number | null>(0);
  const [courseYearId, setCourseYearId] = useState<number | null>(0);
  const [regulationId, setRegulationId] = useState<number | null>(null);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [labBatchId, setLabBatchId] = useState<number>(0);
  const [examDate, setExamDate] = useState("");
  const [invigilatorEmpId, setInvigilatorEmpId] = useState<number>(0);
  const [roomId, setRoomId] = useState<number>(0);
  const [selectedAttendanceFileName, setSelectedAttendanceFileName] =
    useState("");
  const attendanceFileInputRef = useRef<HTMLInputElement | null>(null);

  const courses = useMemo(
    () => dedupeBy(examListDetails, "fk_course_id"),
    [examListDetails],
  );
  const academicYears = useMemo(
    () =>
      dedupeBy(
        examListDetails.filter(
          (x) => Number(x.fk_course_id) === Number(courseId),
        ),
        "fk_academic_year_id",
      ).sort(
        (a, b) => Number(b.academic_year ?? 0) - Number(a.academic_year ?? 0),
      ),
    [examListDetails, courseId],
  );
  const exams = useMemo(() => {
    const list = dedupeBy(
      examListDetails.filter(
        (x) =>
          Number(x.fk_course_id) === Number(courseId) &&
          Number(x.fk_academic_year_id) === Number(academicYearId),
      ),
      "fk_exam_id",
    );
    if (isAdmin) return list;
    return list.filter((x) => x.is_published === false);
  }, [examListDetails, courseId, academicYearId, isAdmin]);

  const colleges = useMemo(
    () =>
      dedupeBy(collegesListDetails, "fk_college_id").sort(
        (a, b) => Number(a.clg_sort_order ?? 0) - Number(b.clg_sort_order ?? 0),
      ),
    [collegesListDetails],
  );
  const courseGroupRows = useMemo(() => {
    const filtered = collegesListDetails.filter(
      (x) => Number(x.fk_college_id) === Number(collegeId),
    );
    return dedupeBy(filtered, "fk_course_group_id");
  }, [collegesListDetails, collegeId]);
  const courseGroups = useMemo(
    () => [0, ...courseGroupRows.map((x) => Number(x.fk_course_group_id))],
    [courseGroupRows],
  );
  const courseYears = useMemo(() => {
    const filtered = collegesListDetails.filter(
      (x) =>
        Number(x.fk_college_id) === Number(collegeId) &&
        (Number(courseGroupId) === 0 ||
          Number(x.fk_course_group_id) === Number(courseGroupId)),
    );
    return [
      0,
      ...dedupeBy(filtered, "fk_course_year_id").map((x) =>
        Number(x.fk_course_year_id),
      ),
    ];
  }, [collegesListDetails, collegeId, courseGroupId]);
  // Angular selectedYear: regulations from CollegesListDetails (rest filters)
  const regulations = useMemo(() => {
    if (!collegeId || !courseGroupId || !courseYearId) return [];
    const filtered = collegesListDetails
      .filter(
        (x) =>
          Number(x.fk_college_id) === Number(collegeId) &&
          Number(x.fk_course_group_id) === Number(courseGroupId) &&
          Number(x.fk_course_year_id) === Number(courseYearId) &&
          regulationIdOf(x) > 0,
      )
      .map((x) => ({
        ...x,
        fk_regulation_id: regulationIdOf(x),
        regulation_code:
          x.regulation_code ?? x.regulationCode ?? x.regulation_name,
      }));
    return dedupeBy(filtered, "fk_regulation_id");
  }, [collegesListDetails, collegeId, courseGroupId, courseYearId]);
  const subjects = useMemo(
    () => dedupeBy(subjectTypeList, "fk_subject_id"),
    [subjectTypeList],
  );
  const selectedSubjectMeta = useMemo(
    () =>
      subjectTypeList.find(
        (x) => Number(x.fk_subject_id) === Number(subjectId),
      ),
    [subjectTypeList, subjectId],
  );
  const showLabBatch = selectedSubjectMeta?.subject_type === "LAB";
  const labBatches = useMemo(() => {
    if (!showLabBatch || !subjectId) return [];
    const source =
      Number(courseGroupId) === 0
        ? collegesListDetails.filter(
            (x) =>
              Number(x.fk_college_id) === Number(collegeId) &&
              Number(x.fk_course_id) === Number(courseId) &&
              Number(x.fk_academic_year_id) === Number(academicYearId) &&
              Number(x.fk_exam_id) === Number(examId) &&
              Number(x.fk_subject_id) === Number(subjectId),
          )
        : subjectTypeList.filter(
            (x) => Number(x.fk_subject_id) === Number(subjectId),
          );
    return dedupeBy(
      source.filter((x) => Number(x.fk_exam_labbatch_id ?? 0) > 0),
      "fk_exam_labbatch_id",
    );
  }, [
    showLabBatch,
    subjectId,
    courseGroupId,
    collegesListDetails,
    collegeId,
    courseId,
    academicYearId,
    examId,
    subjectTypeList,
  ]);
  const invigilatorAllotForEmp = useMemo(
    () =>
      invigilatorRows.filter(
        (x) => Number(x.invigilatorEmpId) === Number(invigilatorEmpId),
      ),
    [invigilatorRows, invigilatorEmpId],
  );
  const attendanceSheetPath =
    invigilatorAllotForEmp[0]?.attendanceSheetFilePath;
  const examTimetableIdForUpload = Number(
    invigilatorAllotForEmp[0]?.examTimeTableId ?? 0,
  );

  const selectedExam = useMemo(
    () => exams.find((x) => Number(x.fk_exam_id) === Number(examId)),
    [exams, examId],
  );
  const selectedCollege = useMemo(
    () => colleges.find((x) => Number(x.fk_college_id) === Number(collegeId)),
    [colleges, collegeId],
  );
  const selectedCourse = useMemo(
    () => courses.find((x) => Number(x.fk_course_id) === Number(courseId)),
    [courses, courseId],
  );
  const selectedRoom = useMemo(
    () => roomRows.find((x) => Number(x.roomId) === Number(roomId)),
    [roomRows, roomId],
  );
  const selectedInvigilator = useMemo(
    () =>
      invigilatorRows.find(
        (x) => Number(x.invigilatorEmpId) === Number(invigilatorEmpId),
      ),
    [invigilatorRows, invigilatorEmpId],
  );

  useEffect(() => {
    async function loadInitial() {
      setLoadingFilters(true);
      try {
        const [filters, roomsData] = await Promise.all([
          getInternalAttendanceFilters(employeeId).catch(() => []),
          listActiveRooms().catch(() => []),
        ]);
        setExamListDetails(Array.isArray(filters) ? filters : []);
        setRoomRows(Array.isArray(roomsData) ? roomsData : []);
      } finally {
        setLoadingFilters(false);
      }
    }
    void loadInitial();
  }, [employeeId]);

  // Angular selectedExam → ONE univ_exam_rest_in_regexamstd call, then client cascade.
  useEffect(() => {
    let cancelled = false;
    async function loadRest() {
      setRows([]);
      setHasFetched(false);
      setCollegesListDetails([]);
      setCollegeId(null);
      setCourseGroupId(0);
      setCourseYearId(0);
      setRegulationId(null);
      setSubjectId(null);
      setSubjectTypeList([]);
      setInvigilatorRows([]);
      if (!courseId || !examId || !academicYearId) return;

      const data = await getInternalAttendanceRestFilters({
        courseId,
        examId,
        academicYearId,
        employeeId,
      }).catch(() => []);
      if (cancelled) return;

      const restRows = Array.isArray(data) ? data : [];
      setCollegesListDetails(restRows);

      const collegeList = dedupeBy(restRows, "fk_college_id").sort(
        (a, b) => Number(a.clg_sort_order ?? 0) - Number(b.clg_sort_order ?? 0),
      );
      if (collegeList.length === 0) return;

      const nextCollegeId = Number(collegeList[0].fk_college_id);
      const cascaded = cascadeFromRest(restRows, nextCollegeId);
      setCollegeId(nextCollegeId);
      setCourseGroupId(cascaded.courseGroupId);
      setCourseYearId(cascaded.courseYearId);
      setRegulationId(cascaded.regulationId);
    }
    void loadRest();
    return () => {
      cancelled = true;
    };
  }, [courseId, examId, academicYearId, employeeId]);

  // Angular selectedRegulation → ONE univ_exam_subject_regexamstd call (not during cascade).
  useEffect(() => {
    let cancelled = false;
    async function loadSubjects() {
      if (
        !collegeId ||
        !courseId ||
        courseGroupId == null ||
        courseYearId == null ||
        courseGroupId === 0 ||
        courseYearId === 0 ||
        !examId ||
        !academicYearId ||
        !regulationId
      ) {
        setSubjectTypeList([]);
        return;
      }
      const data = await getInternalAttendanceSubjects({
        collegeId,
        courseId,
        courseGroupId,
        courseYearId,
        examId,
        academicYearId,
        regulationId,
        employeeId,
      }).catch(() => []);
      if (cancelled) return;
      setSubjectTypeList(Array.isArray(data) ? data : []);
    }
    void loadSubjects();
    return () => {
      cancelled = true;
    };
  }, [
    collegeId,
    courseId,
    courseGroupId,
    courseYearId,
    examId,
    academicYearId,
    regulationId,
    employeeId,
  ]);

  // Drop stale subject if list refreshes; do NOT auto-pick (Angular requires user select).
  useEffect(() => {
    if (subjectId == null) return;
    if (
      !subjects.some((s) => Number(s.fk_subject_id) === Number(subjectId))
    ) {
      setSubjectId(null);
    }
  }, [subjects, subjectId]);

  // Angular selectedSubject → invigilators (only after user picks subject).
  useEffect(() => {
    let cancelled = false;
    async function loadInvigilators() {
      if (!collegeId || !examId || !subjectId) {
        setInvigilatorRows([]);
        return;
      }
      const data = isStaff
        ? await listStaffExamAllotInvigilators(employeeId).catch(() => [])
        : await listExamAllotmentInvigilators({ collegeId, examId }).catch(
            () => [],
          );
      if (cancelled) return;
      setInvigilatorRows(Array.isArray(data) ? data : []);
    }
    void loadInvigilators();
    return () => {
      cancelled = true;
    };
  }, [collegeId, examId, subjectId, isStaff, employeeId]);

  // Initial course only — keep selection if still valid (Angular selectedCourse once).
  useEffect(() => {
    if (courses.length === 0) return;
    setCourseId((prev) =>
      prev != null && courses.some((x) => Number(x.fk_course_id) === Number(prev))
        ? Number(prev)
        : Number(courses[0].fk_course_id),
    );
  }, [courses]);

  useEffect(() => {
    if (academicYears.length === 0) return;
    const current =
      academicYears.find((x) => Number(x.is_curr_ay) === 1) ?? academicYears[0];
    const currentId = Number(current?.fk_academic_year_id ?? 0);
    if (!currentId) return;
    setAcademicYearId((prev) =>
      prev != null &&
      academicYears.some((x) => Number(x.fk_academic_year_id) === Number(prev))
        ? Number(prev)
        : currentId,
    );
  }, [academicYears]);

  useEffect(() => {
    if (exams.length === 0) {
      setExamId(null);
      return;
    }
    setExamId((prev) =>
      prev != null && exams.some((x) => Number(x.fk_exam_id) === Number(prev))
        ? Number(prev)
        : Number(exams[0].fk_exam_id),
    );
  }, [exams]);

  // Angular selectedExam sets exam date from exam from_date.
  useEffect(() => {
    if (!selectedExam) {
      setExamDate("");
      return;
    }
    const raw = String(selectedExam.from_date ?? selectedExam.fromDate ?? "").trim();
    setExamDate(raw ? raw.slice(0, 10) : "");
  }, [selectedExam]);

  useEffect(() => {
    setInvigilatorEmpId(0);
    setRoomId(0);
    setRows([]);
    setHasFetched(false);
    if (!subjectId) {
      setLabBatchId(0);
      return;
    }
    const subjectRow = subjectTypeList.find(
      (x) => Number(x.fk_subject_id) === Number(subjectId),
    );
    const dateRaw = String(subjectRow?.exam_date ?? "").trim();
    if (dateRaw) setExamDate(dateRaw.slice(0, 10));
    setLabBatchId(0);
  }, [subjectId, subjectTypeList]);

  useEffect(() => {
    if (!showLabBatch) {
      setLabBatchId(0);
      return;
    }
    if (labBatches.length > 0) {
      setLabBatchId(Number(labBatches[0].fk_exam_labbatch_id));
    }
  }, [showLabBatch, labBatches]);

  useEffect(() => {
    if (!showLabBatch || !subjectId) return;
    if (labBatchId === 0) {
      const subjectRow = subjectTypeList.find(
        (x) => Number(x.fk_subject_id) === Number(subjectId),
      );
      const dateRaw = String(subjectRow?.exam_date ?? "").trim();
      if (dateRaw) setExamDate(dateRaw.slice(0, 10));
      return;
    }
    const batchRow = labBatches.find(
      (x) => Number(x.fk_exam_labbatch_id) === Number(labBatchId),
    );
    const dateRaw = String(batchRow?.exam_date ?? "").trim();
    if (dateRaw) setExamDate(dateRaw.slice(0, 10));
  }, [labBatchId, labBatches, showLabBatch, subjectId, subjectTypeList]);

  useEffect(() => {
    if (invigilatorEmpId <= 0) {
      setRoomId(0);
      return;
    }
    const roomFromAllot = Number(invigilatorAllotForEmp[0]?.roomId ?? 0);
    setRoomId(roomFromAllot > 0 ? roomFromAllot : 0);
  }, [invigilatorEmpId, invigilatorAllotForEmp]);

  function applyCollegeCascade(nextCollegeId: number | null) {
    setCollegeId(nextCollegeId);
    setSubjectId(null);
    setSubjectTypeList([]);
    setInvigilatorRows([]);
    setRows([]);
    setHasFetched(false);
    if (!nextCollegeId) {
      setCourseGroupId(0);
      setCourseYearId(0);
      setRegulationId(null);
      return;
    }
    const cascaded = cascadeFromRest(collegesListDetails, nextCollegeId);
    setCourseGroupId(cascaded.courseGroupId);
    setCourseYearId(cascaded.courseYearId);
    setRegulationId(cascaded.regulationId);
  }

  function applyCourseGroupCascade(nextGroupId: number) {
    setCourseGroupId(nextGroupId);
    setSubjectId(null);
    setSubjectTypeList([]);
    setInvigilatorRows([]);
    setRows([]);
    setHasFetched(false);
    if (!collegeId) {
      setCourseYearId(0);
      setRegulationId(null);
      return;
    }
    const cascaded = cascadeFromRest(
      collegesListDetails,
      collegeId,
      nextGroupId,
    );
    setCourseYearId(cascaded.courseYearId);
    setRegulationId(cascaded.regulationId);
  }

  function applyCourseYearCascade(nextYearId: number) {
    setCourseYearId(nextYearId);
    setSubjectId(null);
    setSubjectTypeList([]);
    setInvigilatorRows([]);
    setRows([]);
    setHasFetched(false);
    if (!collegeId) {
      setRegulationId(null);
      return;
    }
    const cascaded = cascadeFromRest(
      collegesListDetails,
      collegeId,
      courseGroupId ?? 0,
      nextYearId,
    );
    setRegulationId(cascaded.regulationId);
  }

  function applyRegulationChange(nextRegulationId: number | null) {
    setRegulationId(nextRegulationId);
    setSubjectId(null);
    setSubjectTypeList([]);
    setInvigilatorRows([]);
    setRows([]);
    setHasFetched(false);
  }
  const onTogglePresent = useCallback(
    (examStdDetId: number, value: boolean) => {
      setRows((prev) =>
        prev.map((r) =>
          r.examStdDetId === examStdDetId ? { ...r, isPresent: value } : r,
        ),
      );
    },
    [],
  );

  const onToggleUfm = useCallback((examStdDetId: number, value: boolean) => {
    setRows((prev) =>
      prev.map((r) =>
        r.examStdDetId === examStdDetId ? { ...r, isufm: value } : r,
      ),
    );
  }, []);

  async function onGetList() {
    if (
      !courseId ||
      !academicYearId ||
      !examId ||
      !collegeId ||
      courseGroupId == null ||
      courseYearId == null ||
      !regulationId ||
      !subjectId ||
      !examDate
    ) {
      return;
    }
    setLoadingList(true);
    setHasFetched(true);
    try {
      const data = await getInternalAttendanceStudents({
        collegeId,
        examId,
        courseId,
        courseGroupId,
        courseYearId,
        roomId,
        employeeId: invigilatorEmpId,
        examDate,
        subjectId,
        labBatchId,
      }).catch(() => []);
      setRows(normalizeAttendanceRows(Array.isArray(data) ? data : []));
    } finally {
      setLoadingList(false);
    }
  }

  async function onSaveAttendance() {
    if (rows.length === 0) return;
    setSaving(true);
    try {
      await saveInternalAttendance(
        rows.map((r) => ({
          examStdDetId: r.examStdDetId,
          examId: r.examId,
          studentId: r.studentId,
          examName: r.examName,
          courseYearName: r.courseYearCode,
          examTypeCode: r.examTypeCode,
          rollNumber: r.rollNumber,
          hallticketNo: r.rollNumber,
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
    } catch (err) {
      toastError(err, "Failed to save attendance");
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

    if (!examTimetableIdForUpload) {
      toastError(
        "Exam timetable not found for selected invigilator",
        "Upload failed",
      );
      event.target.value = "";
      return;
    }

    setUploadingAttendance(true);
    try {
      await uploadInvigilatorAttendanceSheet({
        examInvEmployeeId: invigilatorEmpId,
        examTimetableId: examTimetableIdForUpload,
        studentAttendance: file,
      });
      toastSuccess("Attendance file uploaded successfully");
      const data = isStaff
        ? await listStaffExamAllotInvigilators(employeeId).catch(() => [])
        : await listExamAllotmentInvigilators({
            collegeId: collegeId ?? 0,
            examId: examId ?? 0,
          }).catch(() => []);
      setInvigilatorRows(Array.isArray(data) ? data : []);
      await onGetList();
    } catch (error) {
      toastError(error, "Failed to upload attendance file");
    } finally {
      setUploadingAttendance(false);
      event.target.value = "";
    }
  }

  function openAttendanceSheet(path: string) {
    if (!path) return;
    window.open(`${MINIO_URL}${path}`, "_blank", "width=700,height=600");
  }

  const absentees = useMemo(() => rows.filter((r) => !r.isPresent), [rows]);
  const allPresent = useMemo(
    () => rows.length > 0 && rows.every((r) => r.isPresent),
    [rows],
  );

  const courseOptions = useMemo(
    () =>
      courses.map((x) => ({
        value: String(x.fk_course_id),
        label: String(x.course_code ?? x.fk_course_id),
      })),
    [courses],
  );
  const academicYearOptions = useMemo(
    () =>
      academicYears.map((x) => ({
        value: String(x.fk_academic_year_id),
        label: String(x.academic_year ?? x.fk_academic_year_id),
      })),
    [academicYears],
  );
  const examOptions = useMemo(
    () =>
      exams.map((x) => ({
        value: String(x.fk_exam_id),
        label: String(x.exam_name ?? x.fk_exam_id),
      })),
    [exams],
  );
  const collegeOptions = useMemo(
    () =>
      colleges.map((x) => ({
        value: String(x.fk_college_id),
        label: String(x.college_code ?? x.fk_college_id),
      })),
    [colleges],
  );
  const courseGroupOptions = useMemo(() => {
    // Angular shows group_code from rest-filter rows (no CourseGroup domain call).
    return [
      { value: "0", label: "All" },
      ...courseGroupRows.map((row) => {
        const id = Number(row.fk_course_group_id);
        const code = String(
          row.group_code ?? row.groupCode ?? "",
        ).trim();
        const name = String(
          row.group_name ?? row.groupName ?? "",
        ).trim();
        const label =
          name && code ? `${name}(${code})` : code || name || `Group ${id}`;
        return { value: String(id), label };
      }),
    ];
  }, [courseGroupRows]);
  const courseYearOptions = useMemo(
    () =>
      courseYears.map((id) => ({
        value: String(id),
        label:
          id === 0
            ? "All"
            : String(
                collegesListDetails.find(
                  (r) => Number(r.fk_course_year_id) === id,
                )?.course_year_code ?? `Year ${id}`,
              ),
      })),
    [courseYears, collegesListDetails],
  );
  const regulationOptions = useMemo(
    () =>
      regulations.map((x) => ({
        value: String(x.fk_regulation_id),
        label: String(x.regulation_code ?? x.fk_regulation_id),
      })),
    [regulations],
  );
  const subjectOptions = useMemo(
    () =>
      subjects.map((x) => ({
        value: String(x.fk_subject_id),
        label: `${x.subject_name ?? "-"} (${x.subject_code ?? "-"})`,
      })),
    [subjects],
  );
  const labBatchOptions = useMemo(
    () => [
      { value: "0", label: "All" },
      ...labBatches.map((x) => ({
        value: String(x.fk_exam_labbatch_id),
        label: String(x.labbatch_name ?? x.lab_batch_name ?? "Batch"),
      })),
    ],
    [labBatches],
  );
  const invigilatorOptions = useMemo(
    () => [
      { value: "0", label: "All" },
      ...invigilatorRows.map((x) => ({
        value: String(x.invigilatorEmpId),
        label: `${x.invigilatorEmpNumber ?? ""}${
          x.invigilatorEmpName ? ` ( ${x.invigilatorEmpName} )` : ""
        }`.trim(),
      })),
    ],
    [invigilatorRows],
  );
  const roomOptions = useMemo(
    () => [
      { value: "0", label: "All" },
      ...roomRows.map((x) => ({
        value: String(x.roomId),
        label: String(x.roomCode ?? x.roomName ?? x.roomId),
      })),
    ],
    [roomRows],
  );

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
      title="Internal Exam Attendance Marking"
      filters={
        <div className="grid grid-cols-1 gap-2 md:grid-cols-12 md:items-end">
          <div className="space-y-1 md:col-span-2">
            <Label>Course</Label>
            <Select
              value={courseId ? String(courseId) : null}
              onChange={(v) => setCourseId(v ? Number(v) : null)}
              options={courseOptions}
              placeholder="Course"
              disabled={loadingFilters}
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Exam Year</Label>
            <Select
              value={academicYearId ? String(academicYearId) : null}
              onChange={(v) => setAcademicYearId(v ? Number(v) : null)}
              options={academicYearOptions}
              placeholder="Exam Year"
            />
          </div>
          <div className="space-y-1 md:col-span-4">
            <Label>Exam</Label>
            <Select
              value={examId ? String(examId) : null}
              onChange={(v) => setExamId(v ? Number(v) : null)}
              options={examOptions}
              placeholder="Exam"
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>College</Label>
            <Select
              value={collegeId ? String(collegeId) : null}
              onChange={(v) => applyCollegeCascade(v ? Number(v) : null)}
              options={collegeOptions}
              placeholder="College"
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Course Group</Label>
            <Select
              value={courseGroupId == null ? "0" : String(courseGroupId)}
              onChange={(v) => applyCourseGroupCascade(v ? Number(v) : 0)}
              options={courseGroupOptions}
              placeholder="Course Group"
              wrapOptionLabels
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Course Year</Label>
            <Select
              value={courseYearId == null ? "0" : String(courseYearId)}
              onChange={(v) => applyCourseYearCascade(v ? Number(v) : 0)}
              options={courseYearOptions}
              placeholder="Course Year"
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Regulation</Label>
            <Select
              value={regulationId ? String(regulationId) : null}
              onChange={(v) => applyRegulationChange(v ? Number(v) : null)}
              options={regulationOptions}
              placeholder="Regulation"
            />
          </div>
          <div className="space-y-1 md:col-span-6">
            <Label>Subject</Label>
            <Select
              value={subjectId ? String(subjectId) : null}
              onChange={(v) => setSubjectId(v ? Number(v) : null)}
              options={subjectOptions}
              placeholder="Subject"
            />
          </div>
          {showLabBatch ? (
            <div className="space-y-1 md:col-span-2">
              <Label>Lab Batch</Label>
              <Select
                value={String(labBatchId)}
                onChange={(v) => setLabBatchId(v ? Number(v) : 0)}
                options={labBatchOptions}
                placeholder="Lab Batch"
              />
            </div>
          ) : null}
          <div className="space-y-1 md:col-span-2">
            <Label>Exam Date</Label>
            <Input
              className="h-8 text-[12px]"
              type="date"
              value={examDate}
              disabled
              readOnly
            />
          </div>
          <div className="space-y-1 md:col-span-4">
            <Label>Invigilator Employee</Label>
            <Select
              value={String(invigilatorEmpId)}
              onChange={(v) => setInvigilatorEmpId(v ? Number(v) : 0)}
              options={invigilatorOptions}
              placeholder="All"
              searchable
            />
          </div>
          <div className="space-y-1 md:col-span-3">
            <Label>Room</Label>
            <Select
              value={String(roomId)}
              onChange={(v) => setRoomId(v ? Number(v) : 0)}
              options={roomOptions}
              placeholder="All"
              searchable
            />
          </div>
          <div className="md:col-span-1">
            <Button
              className="h-8 w-full text-[12px]"
              onClick={onGetList}
              disabled={loadingList}
            >
              {loadingList ? "Loading..." : "Get List"}
            </Button>
          </div>
          {hasFetched ? (
            <div className="app-card overflow-hidden border-2 border-[#c3d9ff] bg-card p-2 md:col-span-12">
              <div className="flex items-start gap-4">
                <div className="flex h-20 w-20 items-center justify-center bg-[#c3d9ff] text-slate-700">
                  <GraduationCap className="h-10 w-10" />
                </div>
                <div className="space-y-1 text-[13px] text-slate-600">
                  <p>{selectedExam?.exam_name ?? "-"}</p>
                  <p>
                    {selectedCollege?.college_code ?? "-"} /{" "}
                    {selectedCourse?.course_code ?? "-"}{" "}
                    {examDate ? (
                      <span className="text-blue-700">({examDate})</span>
                    ) : null}
                  </p>
                  <p>
                    Invigilator:{" "}
                    <span className="text-slate-800">
                      {selectedInvigilator?.invigilatorEmpName ?? "All"}
                    </span>
                  </p>
                  <p>
                    Room :{" "}
                    <span className="text-slate-800">
                      {selectedRoom?.roomCode ?? "All"}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      }
      rowData={hasFetched ? rows : []}
      columnDefs={columnDefs}
      loading={loadingList}
      hideEmptyGrid
      fitColumnsToWidth={false}
      pagination
      toolbar={
        hasFetched && rows.length > 0
          ? {
              search: true,
              searchPlaceholder: "Search…",
              pdfDocumentTitle: "Internal Exam Attendance",
            }
          : false
      }
      toolbarTrailing={
        hasFetched && rows.length > 0 ? (
          <label className="inline-flex shrink-0 items-center gap-2 text-[12px]">
            <Checkbox
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
        hasFetched ? (
          <div className="space-y-3">
            <div className="overflow-hidden rounded border border-[#c3d9ff] bg-card">
              <h3 className="bg-[#ecf3ff] px-3 py-2 text-center text-[14px] font-semibold uppercase text-slate-700">
                Absentees :{" "}
                <span className="rounded-full bg-cyan-300 px-2 py-0.5">
                  {absentees.length}
                </span>
              </h3>
              <div className="max-h-[420px] overflow-auto p-3 text-[12px]">
                {absentees.length === 0 ? (
                  <p className="text-muted-foreground">No absents found.</p>
                ) : (
                  absentees.map((r) => (
                    <p key={`abs-${r.examStdDetId}`} className="mb-1">
                      {r.firstName} (
                      <span className="text-blue-700">
                        {r.hallticketNumber}
                      </span>
                      )
                    </p>
                  ))
                )}
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              {attendanceSheetPath ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-[12px] text-blue-700 hover:underline"
                  onClick={() =>
                    openAttendanceSheet(String(attendanceSheetPath))
                  }
                >
                  <Eye className="h-4 w-4" />
                  View uploaded sheet
                </button>
              ) : null}
              <Button
                className="h-8 px-5 text-[12px] bg-blue-600 text-white hover:bg-blue-700"
                onClick={onUploadAttendanceClick}
                disabled={uploadingAttendance || rows.length === 0}
              >
                {uploadingAttendance ? "Uploading..." : "Upload Attendance"}
              </Button>
              <input
                ref={attendanceFileInputRef}
                type="file"
                className="hidden"
                onChange={onAttendanceFileChange}
              />
              <Button
                className="h-8 px-5 text-[12px]"
                onClick={onSaveAttendance}
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
