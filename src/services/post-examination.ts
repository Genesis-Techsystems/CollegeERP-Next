import {
  buildQuery,
  clearProcGetCache,
  domainList,
  fetchDetails,
  getAllRecords,
  getAllRecordsEnvelope,
  postDetails,
  postDetailsEnvelope,
  putDetails,
  uploadFile,
} from "@/services/crud";
import { EXAM_API, EXAM_EVAL_API, NEXT_API } from "@/config/constants/api";
import { GM_CODES } from "@/config/constants/ui";
import { getUnivExamFiltersByType } from "@/services/pre-examination";

type AnyRow = Record<string, any>;

function firstNonEmptyGroup(groups: AnyRow[][]): AnyRow[] {
  return groups.find((g) => Array.isArray(g) && g.length > 0) ?? [];
}

function firstGroupByFlag(groups: AnyRow[][], flags: string[]): AnyRow[] {
  const normalized = new Set(flags.map((f) => f.toLowerCase()));
  return (
    groups.find((g) => {
      const flag = String(g?.[0]?.flag ?? "").toLowerCase();
      return normalized.has(flag);
    }) ?? []
  );
}

/** Angular momentFormatYMD1 — proc param `in_exam_date`. */
function formatExamDateYmd(date: string): string {
  if (!date) return "";
  const raw = String(date).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, "0");
  const d = String(parsed.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dedupeStudentsByHallticket(rows: AnyRow[]): AnyRow[] {
  const byHt = new Map<string, AnyRow>();
  for (const row of rows) {
    const key = String(row.hallticketNumber ?? row.hallticket_number ?? "");
    if (!key) continue;
    byHt.set(key, row);
  }
  return Array.from(byHt.values());
}

export interface AttendanceFilterParams {
  courseId: number;
  examId: number;
  academicYearId: number;
  collegeId: number;
  courseGroupId: number;
  courseYearId: number;
  regulationId: number;
  subjectId: number;
  sectionId?: number;
  labBatchId?: number;
}

export async function getInternalAttendanceFilters(
  employeeId: number,
): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] }>(
    "s_get_exam_filters_bycode",
    {
      in_flag: "univ_exam_filters",
      in_flag_type: "INT",
      in_university_id: 0,
      in_univ_examcenter_id: 0,
      in_college_id: 0,
      in_course_id: 0,
      in_course_group_id: 0,
      in_course_year_id: 0,
      in_exam_id: 0,
      in_academic_year_id: 0,
      in_regulation_id: 0,
      in_subject_id: 0,
      in_sub_flag_type: "",
      in_param1: 0,
      in_param2: 0,
      in_loginuser_roleid: 0,
      in_loginuser_empid: employeeId || 0,
    },
  );
  const groups = data?.result ?? [];
  const picked = firstGroupByFlag(groups, ["univ_exam_filters"]);
  return picked.length > 0 ? picked : groups.flatMap((g) => g ?? []);
}

export async function listInternalExamAverageColleges(): Promise<AnyRow[]> {
  return domainList<AnyRow>("College", buildQuery({ isActive: true }));
}

export async function listInternalExamAverageAcademicYears(
  universityId: number,
): Promise<AnyRow[]> {
  const queries = [
    buildQuery(
      { "Universities.universityId": universityId, isActive: true },
      { field: "fromDate", direction: "DESC" },
    ),
    buildQuery(
      { "University.universityId": universityId, isActive: true },
      { field: "fromDate", direction: "DESC" },
    ),
  ];
  for (const query of queries) {
    try {
      const rows = await domainList<AnyRow>("AcademicYear", query);
      if (Array.isArray(rows) && rows.length > 0) return rows;
    } catch {
      // try next query shape
    }
  }
  return [];
}

export async function listInternalExamAverageCourses(
  universityId: number,
): Promise<AnyRow[]> {
  const queries = [
    buildQuery({ "Universities.universityId": universityId, isActive: true }),
    buildQuery({ "University.universityId": universityId, isActive: true }),
  ];
  for (const query of queries) {
    try {
      const rows = await domainList<AnyRow>("Course", query);
      if (Array.isArray(rows) && rows.length > 0) return rows;
    } catch {
      // try next query shape
    }
  }
  return [];
}

export async function listInternalExamAverageCourseGroups(
  courseId: number,
): Promise<AnyRow[]> {
  return domainList<AnyRow>(
    "CourseGroup",
    buildQuery({ "Course.courseId": courseId, isActive: true }),
  );
}

export async function listInternalExamAverageCourseYears(
  courseId: number,
): Promise<AnyRow[]> {
  return domainList<AnyRow>(
    "CourseYear",
    buildQuery(
      { "Course.courseId": courseId, isActive: true },
      { field: "sortOrder", direction: "ASC" },
    ),
  );
}

export async function listInternalExamAverageExamTypes(): Promise<AnyRow[]> {
  const codes = [GM_CODES.INTERNAL_EXAM_MARKS_TYPE, GM_CODES.SUBJECT_TYPE];
  for (const code of codes) {
    try {
      const rows = await domainList<AnyRow>(
        "GeneralDetail",
        buildQuery({ "GeneralMaster.generalMasterCode": code, isActive: true }),
      );
      if (Array.isArray(rows) && rows.length > 0) return rows;
    } catch {
      // try next code
    }
  }
  return [];
}

export async function listInternalExamAverageExams(params: {
  collegeId: number;
  courseId: number;
  academicYearId: number;
  courseGroupId: number;
  courseYearId: number;
}): Promise<AnyRow[]> {
  const queries = [
    buildQuery(
      {
        "college.collegeId": params.collegeId,
        "examMaster.course.courseId": params.courseId,
        "examMaster.academicYear.academicYearId": params.academicYearId,
        "studentDetail.courseGroup.courseGroupId": params.courseGroupId,
        "courseYear.courseYearId": params.courseYearId,
        "examtypeCat.generalDetailCode": "Internal",
        isActive: true,
      },
      { field: "createdDt", direction: "DESC" },
    ),
    buildQuery(
      {
        "College.collegeId": params.collegeId,
        "ExamMaster.course.courseId": params.courseId,
        "ExamMaster.academicYear.academicYearId": params.academicYearId,
        "studentDetail.courseGroup.courseGroupId": params.courseGroupId,
        "courseYear.courseYearId": params.courseYearId,
        "examtypeCat.generalDetailCode": "Internal",
        isActive: true,
      },
      { field: "createdDt", direction: "DESC" },
    ),
  ];
  for (const query of queries) {
    try {
      const rows = await domainList<AnyRow>("ExamStudent", query);
      if (Array.isArray(rows) && rows.length > 0) return rows;
    } catch {
      // try next query shape
    }
  }

  // Fallback to procedure-driven filters when ExamStudent query returns empty in some deployments.
  const attempts = [
    { in_flag: "univ_exam_inep_filters", in_flag_type: "OFF_INT_EVAL" },
    { in_flag: "univ_exam_inep_filters", in_flag_type: "QUESTION_SETTER" },
    { in_flag: "univ_exam_inep_filters", in_flag_type: "REGSUP" },
    { in_flag: "univ_exam_filters", in_flag_type: "OFF_INT_EVAL" },
    { in_flag: "univ_exam_filters", in_flag_type: "REGSUP" },
  ];
  for (const attempt of attempts) {
    try {
      const data = await getAllRecords<{ result: AnyRow[][] }>(
        "s_get_exam_filters_bycode",
        {
          in_flag: attempt.in_flag,
          in_flag_type: attempt.in_flag_type,
          in_university_id: 0,
          in_univ_examcenter_id: 0,
          in_college_id: params.collegeId,
          in_course_id: params.courseId,
          in_course_group_id: params.courseGroupId,
          in_course_year_id: params.courseYearId,
          in_exam_id: 0,
          in_academic_year_id: params.academicYearId,
          in_regulation_id: 0,
          in_subject_id: 0,
          in_sub_flag_type: "",
          in_param1: 0,
          in_param2: "REGSUP",
          in_loginuser_roleid: 0,
          in_loginuser_empid: 0,
        },
      );
      const groups = data?.result ?? [];
      const rows = groups.flatMap((g) => g ?? []);
      const filtered = rows.filter((r) => {
        const isInternal =
          Boolean(r?.is_internal_exam) ||
          String(r?.exam_type ?? "").toLowerCase() === "internal";
        return isInternal;
      });
      if (filtered.length > 0) return filtered;
    } catch {
      // continue next attempt
    }
  }
  return [];
}

export async function getRegulationById(
  regulationId: number,
): Promise<AnyRow | null> {
  const rows = await domainList<AnyRow>(
    "Regulation",
    buildQuery({ regulationId }),
  );
  return rows?.[0] ?? null;
}

export async function getInternalExamAverageMarks(params: {
  examIds: number[];
  collegeId: number;
  courseGroupId: number;
  courseYearId: number;
  finalTypeId: number;
}): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] }>(
    "s_get_exam_internal_final_marks",
    {
      in_exam_ids: params.examIds.join(","),
      in_college_id: params.collegeId,
      in_course_group_id: params.courseGroupId,
      in_course_year_id: params.courseYearId,
      in_subject_id: 0,
      in_std_id: 0,
      in_final_type: params.finalTypeId,
    },
  );
  const groups = data?.result ?? [];
  return groups[0] ?? [];
}

export async function saveInternalExamAverageMarks(
  rows: AnyRow[],
): Promise<any> {
  return postDetails<any>("finalinternalmarks", rows);
}

export async function getGradeMemoIssueFilters(
  employeeId: number,
): Promise<AnyRow[]> {
  // Angular getFiltersList(): single call with REGSUP.
  try {
    const data = await getAllRecords<{ result: AnyRow[][] }>(
      "s_get_exam_filters_bycode",
      {
        in_flag: "univ_exam_filters",
        in_flag_type: "REGSUP",
        in_university_id: 0,
        in_college_id: 0,
        in_course_id: 0,
        in_course_group_id: 0,
        in_course_year_id: 0,
        in_exam_id: 0,
        in_academic_year_id: 0,
        in_regulation_id: 0,
        in_subject_id: 0,
        in_loginuser_empid: employeeId || 0,
        in_loginuser_roleid: 0,
        in_sub_flag_type: "ALL",
        in_param1: 0,
        in_param2: 0,
      },
    );
    const groups = data?.result ?? [];
    const picked = firstGroupByFlag(groups, ["univ_exam_filters"]);
    if (picked.length > 0) return picked;
    return firstNonEmptyGroup(groups);
  } catch {
    return [];
  }
}

export async function getGradeMemoIssueRestFilters(params: {
  courseId: number;
  examId: number;
  academicYearId: number;
  employeeId: number;
}): Promise<AnyRow[]> {
  // Angular selectedExam(): single call with in_flag_type ALL.
  try {
    const data = await getAllRecords<{ result: AnyRow[][] }>(
      "s_get_exam_filters_bycode",
      {
        in_flag: "univ_exam_rest_in_regexamstd",
        in_flag_type: "ALL",
        in_university_id: 0,
        in_college_id: 0,
        in_course_id: params.courseId,
        in_course_group_id: 0,
        in_course_year_id: 0,
        in_exam_id: params.examId,
        in_academic_year_id: params.academicYearId,
        in_regulation_id: 0,
        in_subject_id: 0,
        in_loginuser_empid: params.employeeId || 0,
        in_loginuser_roleid: 0,
        in_sub_flag_type: "ALL",
        in_param1: 0,
        in_param2: 0,
      },
    );
    const groups = data?.result ?? [];
    const picked = firstGroupByFlag(groups, ["univ_exam_rest_filters"]);
    if (picked.length > 0) return picked;
    return firstNonEmptyGroup(groups);
  } catch {
    return [];
  }
}

export async function getGradeMemoIssueResult(params: {
  organizationId: number;
  examId: number;
  collegeId: number;
  courseId: number;
  courseGroupId: number;
  courseYearId: number;
  studentId: number;
}): Promise<{ resultRows: AnyRow[]; gradesRows: AnyRow[] }> {
  const data = await getAllRecords<{ result: AnyRow[][] }>(
    "s_get_exam_result_memos",
    {
      in_flag: "list_exam_student_gradecard",
      in_orgid: params.organizationId,
      in_fdate: "1990-01-01",
      in_tdate: "1990-01-01",
      in_exam_id: params.examId,
      in_clg_id: params.collegeId,
      in_course_id: params.courseId,
      in_course_group_id: params.courseGroupId,
      in_course_year_id: params.courseYearId,
      in_subject_id: 0,
      in_evalutor_profileid: 0,
      in_exam_date: "1990-01-01",
      in_regulation_id: 0,
      in_emp_id: 0,
      in_questionpaper_id: 0,
      in_student_id: params.studentId || 0,
    },
  );
  const groups = data?.result ?? [];
  const resultRows = firstGroupByFlag(groups, ["list_exam_student_gradecard"]);
  const gradesRows = firstGroupByFlag(groups, ["grades_course"]);
  return { resultRows, gradesRows };
}

/** Angular complete-exam-process `getFiltersList()` — REGSUP + empty in_sub_flag_type. */
export async function getCompleteExamProcessFilters(
  employeeId: number,
): Promise<AnyRow[]> {
  try {
    const data = await getAllRecords<{ result: AnyRow[][] }>(
      "s_get_exam_filters_bycode",
      {
        in_flag: "univ_exam_filters",
        in_flag_type: "REGSUP",
        in_university_id: 0,
        in_college_id: 0,
        in_course_id: 0,
        in_course_group_id: 0,
        in_course_year_id: 0,
        in_exam_id: 0,
        in_academic_year_id: 0,
        in_regulation_id: 0,
        in_subject_id: 0,
        in_loginuser_empid: employeeId || 0,
        in_loginuser_roleid: 0,
        in_sub_flag_type: "",
        in_param1: 0,
        in_param2: 0,
      },
    );
    const groups = data?.result ?? [];
    const picked = firstGroupByFlag(groups, ["univ_exam_filters"]);
    if (picked.length > 0) return picked;
    return firstNonEmptyGroup(groups);
  } catch {
    return [];
  }
}

/**
 * After Angular-parity write pops, drop cached evaluation reads so Multi
 * Evaluator / Verify Exam Marks Get List hits the network (not a stale
 * getAllRecords snapshot from before Setup Assignments).
 */
function clearCompleteExamProcessCaches(...procNames: string[]): void {
  for (const name of procNames) clearProcGetCache(name);
}

/**
 * These pop procs report their real outcome via the envelope `message`, not the
 * `success` flag — same HTTP-200/`message` contract as the result-processing
 * procs below. Using {@link getAllRecordsEnvelope} (which does not throw on
 * `success: false`) and returning `message` lets the page surface the true
 * outcome instead of a false success.
 */
export async function runCompleteExamSetupAssignments(
  examId: number,
): Promise<string> {
  // Angular AssignmentRun → getevaluatorassignmentUrl /
  // s_pop_exam_evaluatorassignment?in_flag=popstudentassignment&…
  clearCompleteExamProcessCaches(
    "s_pop_exam_evaluatorassignment",
    "s_get_examevaluation_bycodes",
  );
  const body = await getAllRecordsEnvelope("s_pop_exam_evaluatorassignment", {
    in_flag: "popstudentassignment",
    in_profileids: "",
    in_exam_evaluationassignment_ids: "",
    in_omr_serial_nos: "",
    in_timetable_det_ids: "",
    in_exam_id: examId,
    in_subject_id: 0,
    in_course_year_id: 0,
  });
  clearCompleteExamProcessCaches(
    "s_pop_exam_evaluatorassignment",
    "s_get_examevaluation_bycodes",
  );
  return body.message ?? "";
}

export async function runCompleteExamReEvaluationAssignments(
  examId: number,
): Promise<string> {
  // Angular ReEvaluationAssignmentRun — same pop proc, re_evaluation_assignment_pop.
  clearCompleteExamProcessCaches(
    "s_pop_exam_evaluatorassignment",
    "s_get_examevaluation_bycodes",
  );
  const body = await getAllRecordsEnvelope("s_pop_exam_evaluatorassignment", {
    in_flag: "re_evaluation_assignment_pop",
    in_profileids: "",
    in_exam_evaluationassignment_ids: "",
    in_omr_serial_nos: "",
    in_timetable_det_ids: "",
    in_exam_id: examId,
    in_subject_id: 0,
    in_course_year_id: 0,
  });
  clearCompleteExamProcessCaches(
    "s_pop_exam_evaluatorassignment",
    "s_get_examevaluation_bycodes",
  );
  return body.message ?? "";
}

export async function runCompleteExamFinalizeAction(
  flag: string,
  examId: number,
): Promise<string> {
  // Angular FinaliseEvaluationStatus / FinalisedEvaluationMarks /
  // finalizeReevaluationStatus / FinalisedReEvaluationMarks.
  clearCompleteExamProcessCaches("s_pop_exam_evaluationmarksfinalise");
  const body = await getAllRecordsEnvelope(
    "s_pop_exam_evaluationmarksfinalise",
    {
      in_flag: flag,
      in_examid: examId,
    },
  );
  clearCompleteExamProcessCaches(
    "s_pop_exam_evaluationmarksfinalise",
    "s_get_examevaluation_bycodes",
  );
  return body.message ?? "";
}

export async function runCompleteExamFinalizeProfiles(): Promise<string> {
  // Angular setupCommittes().
  clearCompleteExamProcessCaches("s_pop_exam_committees");
  const body = await getAllRecordsEnvelope("s_pop_exam_committees", {
    in_flag: "exam_committees",
  });
  clearCompleteExamProcessCaches("s_pop_exam_committees");
  return body.message ?? "";
}

/**
 * Angular complete-exam-process `resultPro()`: any HTTP-200 body is
 * treated as completed and `result.message` is surfaced to the user — these
 * pop procs report their outcome via `message`, not the `success` flag.
 * Returns the backend message for the page to toast.
 */
export async function runCompleteExamResultProcessing(
  examId: number,
): Promise<string> {
  clearCompleteExamProcessCaches("s_pop_exam_resultprocessing_v4");
  const body = await getAllRecordsEnvelope("s_pop_exam_resultprocessing_v4", {
    in_exam_id: examId,
  });
  clearCompleteExamProcessCaches("s_pop_exam_resultprocessing_v4");
  return body.message ?? "";
}

/** Angular `resultProPublish()` — same HTTP-200/`message` contract as {@link runCompleteExamResultProcessing}. */
export async function runCompleteExamResultProcessingPublish(
  examId: number,
): Promise<string> {
  clearCompleteExamProcessCaches("s_pop_exam_resultprocessing_publish_v4");
  const body = await getAllRecordsEnvelope(
    "s_pop_exam_resultprocessing_publish_v4",
    { in_exam_id: examId },
  );
  clearCompleteExamProcessCaches("s_pop_exam_resultprocessing_publish_v4");
  return body.message ?? "";
}

export type VerifyExamMarksMode =
  | "internal"
  | "external"
  | "evaluation"
  | "all";

function pickVerifyExamMarksFilterGroup(
  groups: AnyRow[][],
  flag: string,
): AnyRow[] {
  const picked = firstGroupByFlag(groups, [flag]);
  if (picked.length > 0) return picked;
  for (const list of groups) {
    if (list?.length > 0 && list[0].flag === flag) return list;
  }
  return firstNonEmptyGroup(groups);
}

function parseVerifyExamMarksReportRows(data: unknown): AnyRow[] {
  if (data == null) return [];
  if (Array.isArray(data)) {
    if (data.length > 0 && Array.isArray(data[0]))
      return (data[0] as AnyRow[]) ?? [];
    if (data.length > 0 && typeof data[0] === "object") return data as AnyRow[];
    return [];
  }
  if (typeof data === "object") {
    const obj = data as { result?: unknown; resultList?: unknown };
    const result = obj.result;
    if (Array.isArray(result)) {
      if (result.length > 0 && Array.isArray(result[0]))
        return (result[0] as AnyRow[]) ?? [];
      if (result.length > 0 && typeof result[0] === "object")
        return result as AnyRow[];
    }
    if (Array.isArray(obj.resultList)) return obj.resultList as AnyRow[];
  }
  return [];
}

/**
 * Angular result-processing Verify Exam Marks `getFiltersList` →
 * `s_get_collegewisedetails_bycode` / `clg_exam_timetable_filters`.
 * Cascade College → Exam → Course Group → Subject from this row set.
 */
export async function getVerifyExamMarksFilters(params: {
  organizationId: number;
  employeeId: number;
}): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] }>(
    "s_get_collegewisedetails_bycode",
    {
      in_flag: "clg_exam_timetable_filters",
      in_org_id: params.organizationId || 0,
      in_college_id: 0,
      in_course_id: 0,
      in_course_group_id: 0,
      in_course_year_id: 0,
      in_group_section_id: 0,
      in_academic_year_id: 0,
      in_dept_id: 0,
      in_isadmin: 0,
      in_loginuser_empid: params.employeeId || 0,
      in_loginuser_roleid: 0,
      in_employee: "",
      in_subject: "",
      in_gm_codes: "",
    },
  );
  return pickVerifyExamMarksFilterGroup(
    data?.result ?? [],
    "clg_exam_timetable_filters",
  );
}

/** @deprecated Prefer cascading from getVerifyExamMarksFilters. */
export async function getVerifyExamMarksColleges(): Promise<AnyRow[]> {
  return domainList<AnyRow>("College", buildQuery({ isActive: true }));
}

/**
 * Angular `getGradeInternalList` / `getGradeList`:
 * - internal → `int_exam_marks_entered_count`
 * - external / evaluation / all → `ext_int_exam_marks_entered_count`
 */
export async function getVerifyExamMarksReport(params: {
  mode: VerifyExamMarksMode;
  examId: number;
  collegeId: number;
  courseGroupId?: number;
  subjectId?: number;
}): Promise<AnyRow[]> {
  const payload = {
    in_flag:
      params.mode === "internal"
        ? "int_exam_marks_entered_count"
        : "ext_int_exam_marks_entered_count",
    in_exam_id: params.examId,
    in_college_id: params.collegeId,
    in_course_id: 0,
    in_course_group_id: params.courseGroupId || 0,
    in_course_year_id: 0,
    in_academic_year_id: 0,
    in_regulation_id: 0,
    in_subject_id: params.subjectId || 0,
  };

  const data = await getAllRecords<unknown>(
    EXAM_EVAL_API.PREMODERATION_REPORTS_BYCODES,
    payload,
  );
  return parseVerifyExamMarksReportRows(data);
}

/** Angular `getStudentsList` → `s_get_exam_allotment_details_invigilator` / `invigilator_room_details`. */
export async function getInternalAttendanceStudents(params: {
  collegeId: number;
  examId: number;
  courseId: number;
  courseGroupId: number;
  courseYearId: number;
  roomId: number;
  employeeId: number;
  examDate: string;
  subjectId: number;
  labBatchId: number;
}): Promise<AnyRow[]> {
  const examDateYmd = formatExamDateYmd(params.examDate);
  const data = await getAllRecords<{ result: AnyRow[][] }>(
    "s_get_exam_allotment_details_invigilator",
    {
      in_flag: "invigilator_room_details",
      in_clg_id: params.collegeId,
      in_exam_id: params.examId,
      in_course_id: params.courseId,
      in_course_group_id: params.courseGroupId,
      in_course_year_id: params.courseYearId,
      in_room_id: params.roomId,
      in_std_id: 0,
      in_invgilator_emp_id: params.employeeId || 0,
      in_regulation_id: 0,
      from_exam_date: examDateYmd,
      to_exam_date: examDateYmd,
      in_subject_id: params.subjectId,
      in_session_id: 0,
      in_exam_labbatch_id: params.labBatchId || 0,
    },
  );
  const groups = data?.result ?? [];
  const first = groups[0] ?? [];
  return Array.isArray(first) ? first : [];
}

/** Angular STAFF/MSTAFF: `listByIds(getExamAllotInvigilatorUrl, employeeId, 'invigilatorEmpId')`. */
export async function listStaffExamAllotInvigilators(
  invigilatorEmpId: number,
): Promise<AnyRow[]> {
  const data = await fetchDetails<AnyRow[]>(
    EXAM_API.GET_EXAM_ALLOT_INVIGILATOR,
    { invigilatorEmpId },
  );
  const rows = Array.isArray(data) ? data : [];
  const seen = new Set<number>();
  return rows.filter((row) => {
    const sessionId = Number(row.fk_exam_session_id ?? 0);
    if (seen.has(sessionId)) return false;
    seen.add(sessionId);
    return true;
  });
}

/** Angular non-staff: `listByTwoIds(getExamAllotmentInvigilatorsUrl, collegeId, examId, …)`. */
export async function listExamAllotmentInvigilators(params: {
  collegeId: number;
  examId: number;
}): Promise<AnyRow[]> {
  const data = await fetchDetails<AnyRow[]>(
    EXAM_API.GET_EXAM_ALLOTMENT_INVIGILATORS,
    { collegeId: params.collegeId, examId: params.examId },
  );
  return Array.isArray(data) ? data : [];
}

export async function saveInternalAttendance(rows: AnyRow[]): Promise<void> {
  await putDetails("examstudentdetails", rows);
}

export async function uploadInvigilatorAttendanceSheet(params: {
  examInvEmployeeId: number;
  examTimetableId: number;
  studentAttendance: File;
}): Promise<void> {
  const uploadPaths = [
    "uploadInvigilatorAttendanceSheet",
    "uploadinvigilatorattendancesheet",
  ];
  let lastError: unknown = null;

  for (const path of uploadPaths) {
    try {
      const formData = new FormData();
      formData.append("examInvEmployeeId", String(params.examInvEmployeeId));
      formData.append("examTimetableId", String(params.examTimetableId));
      formData.append(
        "studentAttendance",
        params.studentAttendance,
        params.studentAttendance.name,
      );
      await uploadFile(path, formData);
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("Failed to upload attendance sheet");
}

export async function getExternalAttendanceFilters(
  employeeId: number,
): Promise<AnyRow[]> {
  // Angular getExamFiltersList — univ_exam_filters / REGSUP + pick flag group only
  const data = await getAllRecords<{ result: AnyRow[][] }>(
    "s_get_exam_filters_bycode",
    {
      in_flag: "univ_exam_filters",
      in_flag_type: "REGSUP",
      in_university_id: 0,
      in_univ_examcenter_id: 0,
      in_college_id: 0,
      in_course_id: 0,
      in_course_group_id: 0,
      in_course_year_id: 0,
      in_exam_id: 0,
      in_academic_year_id: 0,
      in_regulation_id: 0,
      in_subject_id: 0,
      in_sub_flag_type: "",
      in_param1: 0,
      in_param2: 0,
      in_loginuser_roleid: 0,
      in_loginuser_empid: employeeId || 0,
    },
  );
  const groups = data?.result ?? [];
  const picked = firstGroupByFlag(groups, ["univ_exam_filters"]);
  return picked.length > 0 ? picked : firstNonEmptyGroup(groups);
}

export async function getExternalAttendanceSubjects(params: {
  courseId: number;
  examId: number;
  academicYearId: number;
  employeeId: number;
}): Promise<AnyRow[]> {
  // Angular selectedExam — univ_exam_subject_regexamstd / REGSUP, pick sub flag group
  const data = await getAllRecords<{ result: AnyRow[][] }>(
    "s_get_exam_filters_bycode",
    {
      in_flag: "univ_exam_subject_regexamstd",
      in_flag_type: "REGSUP",
      in_university_id: 0,
      in_univ_examcenter_id: 0,
      in_college_id: 0,
      in_course_id: params.courseId,
      in_course_group_id: 0,
      in_course_year_id: 0,
      in_exam_id: params.examId,
      in_academic_year_id: params.academicYearId,
      in_regulation_id: 0,
      in_sub_flag_type: "ALL",
      in_subject_id: 0,
      in_param1: 0,
      in_param2: 0,
      in_loginuser_roleid: 0,
      in_loginuser_empid: params.employeeId || 0,
    },
  );
  const groups = data?.result ?? [];
  const picked = firstGroupByFlag(groups, [
    "univ_exam_sub_regexamstd",
    "univ_exam_subject_regexamstd",
  ]);
  return picked.length > 0 ? picked : firstNonEmptyGroup(groups);
}

export async function getExternalAttendanceRestFilters(params: {
  courseId: number;
  examId: number;
  academicYearId: number;
  regulationId: number;
  subjectId: number;
  employeeId: number;
}): Promise<AnyRow[]> {
  // Angular selectedSubject — univ_exam_rest_in_regexamstd / ALL, pick rest_filters
  const data = await getAllRecords<{ result: AnyRow[][] }>(
    "s_get_exam_filters_bycode",
    {
      in_flag: "univ_exam_rest_in_regexamstd",
      in_flag_type: "ALL",
      in_university_id: 0,
      in_univ_examcenter_id: 0,
      in_college_id: 0,
      in_course_id: params.courseId,
      in_course_group_id: 0,
      in_course_year_id: 0,
      in_exam_id: params.examId,
      in_academic_year_id: params.academicYearId,
      in_regulation_id: params.regulationId,
      in_subject_id: params.subjectId,
      in_sub_flag_type: "",
      in_param1: 0,
      in_param2: 0,
      in_loginuser_roleid: 0,
      in_loginuser_empid: params.employeeId || 0,
    },
  );
  const groups = data?.result ?? [];
  const picked = firstGroupByFlag(groups, ["univ_exam_rest_filters"]);
  return picked.length > 0 ? picked : firstNonEmptyGroup(groups);
}

export async function listExternalAttendanceStudents(params: {
  examId: number;
  courseId: number;
  courseGroupId: number;
  courseYearId: number;
  roomId: number;
  regulationId: number;
  examDate: string;
  subjectId: number;
}): Promise<AnyRow[]> {
  // Angular getStudentsList — in_invgilator_emp_id always 0
  const data = await getAllRecords<{ result: AnyRow[][] }>(
    "s_get_exam_allotment_details_invigilator",
    {
      in_flag: "invigilator_room_details",
      in_clg_id: 0,
      in_exam_id: params.examId,
      in_course_id: params.courseId,
      in_course_group_id: params.courseGroupId,
      in_course_year_id: params.courseYearId,
      in_room_id: params.roomId,
      in_std_id: 0,
      in_invgilator_emp_id: 0,
      in_regulation_id: params.regulationId,
      from_exam_date: params.examDate,
      to_exam_date: params.examDate,
      in_subject_id: params.subjectId,
      in_session_id: 0,
      in_exam_labbatch_id: 0,
    },
  );
  const groups = data?.result ?? [];
  const first = groups[0] ?? [];
  return Array.isArray(first) ? first : [];
}

export async function listActiveRooms(): Promise<AnyRow[]> {
  return domainList<AnyRow>("Room", buildQuery({ isActive: true }));
}

export async function getInternalMarksEntryFilters(
  employeeId: number,
): Promise<AnyRow[]> {
  return getUnivExamFiltersByType(employeeId, "INT");
}

export async function getInternalMarksEntryRestFilters(params: {
  courseId: number;
  examId: number;
  academicYearId: number;
  employeeId: number;
}): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] }>(
    "s_get_exam_filters_bycode",
    {
      in_flag: "univ_exam_rest_in_regexamstd",
      in_flag_type: "INT",
      in_university_id: 0,
      in_univ_examcenter_id: 0,
      in_college_id: 0,
      in_course_id: params.courseId,
      in_course_group_id: 0,
      in_course_year_id: 0,
      in_exam_id: params.examId,
      in_academic_year_id: params.academicYearId,
      in_regulation_id: 0,
      in_subject_id: 0,
      in_sub_flag_type: "",
      in_param1: 0,
      in_param2: 0,
      in_loginuser_roleid: 0,
      in_loginuser_empid: params.employeeId || 0,
    },
  );
  const groups = data?.result ?? [];
  const picked = firstGroupByFlag(groups, ["univ_exam_rest_filters"]);
  return picked.length > 0 ? picked : groups.flatMap((g) => g ?? []);
}

export async function getInternalMarksEntrySubjects(params: {
  collegeId: number;
  courseId: number;
  courseGroupId: number;
  courseYearId: number;
  examId: number;
  academicYearId: number;
  regulationId: number;
  employeeId: number;
}): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] }>(
    "s_get_exam_filters_bycode",
    {
      in_flag: "univ_exam_subject_regexamstd",
      in_flag_type: "INT",
      in_university_id: 0,
      in_univ_examcenter_id: 0,
      in_college_id: params.collegeId,
      in_course_id: params.courseId,
      in_course_group_id: params.courseGroupId,
      in_course_year_id: params.courseYearId,
      in_exam_id: params.examId,
      in_academic_year_id: params.academicYearId,
      in_regulation_id: params.regulationId,
      in_sub_flag_type: "ALL",
      in_subject_id: 0,
      in_param1: 0,
      in_param2: 0,
      in_loginuser_roleid: 0,
      in_loginuser_empid: params.employeeId || 0,
    },
  );
  const groups = data?.result ?? [];
  const picked = firstGroupByFlag(groups, ["univ_exam_sub_regexamstd"]);
  return picked.length > 0 ? picked : groups.flatMap((g) => g ?? []);
}

export async function getInternalMarksEntryStudents(params: {
  collegeId: number;
  courseId: number;
  examId: number;
  courseGroupId: number;
  courseYearId: number;
  regulationId: number;
  subjectId: number;
  labBatchId: number;
  examDate: string;
}): Promise<AnyRow[]> {
  const payload = {
    in_flag: "marks_entry",
    in_college_id: params.collegeId,
    in_course_id: params.courseId,
    in_exam_id: params.examId,
    in_course_group_id: params.courseGroupId,
    in_course_year_id: params.courseYearId,
    in_regulation_id: params.regulationId,
    in_subject_id: params.subjectId,
    in_eaxm_labbatch_id: params.labBatchId || 0,
    is_extenalperson_approve: 0,
    in_exam_date: formatExamDateYmd(params.examDate),
  };

  // Angular getExamMarkDetailsUrl → getAllRecords/s_get_exam_markdetails only.
  const procs = ["s_get_exam_markdetails"];
  for (const proc of procs) {
    try {
      const data = await getAllRecords<{ result: AnyRow[][] }>(proc, payload);
      const groups = data?.result ?? [];
      const firstNonEmpty = dedupeStudentsByHallticket(
        groups.find((g) => Array.isArray(g) && g.length > 0) ?? [],
      );
      if (firstNonEmpty.length > 0) return firstNonEmpty;
    } catch {
      // try next proc variant
    }
  }
  return [];
}

/**
 * Same `marks_entry` proc as {@link getInternalMarksEntryStudents}, but returns
 * all three result sets Angular uses: students (result[0], deduped by hallticket
 * like Angular), external evaluator names (result[1]), internal evaluator names
 * (result[2]). Used to populate the printable marks sheet.
 */
export async function getMarksEntryStudentsBundle(params: {
  collegeId: number;
  courseId: number;
  examId: number;
  courseGroupId: number;
  courseYearId: number;
  regulationId: number;
  subjectId: number;
  labBatchId: number;
  examDate: string;
}): Promise<{
  students: AnyRow[];
  externalEvaluators: AnyRow[];
  internalEvaluators: AnyRow[];
}> {
  const payload = {
    in_flag: "marks_entry",
    in_college_id: params.collegeId,
    in_course_id: params.courseId,
    in_exam_id: params.examId,
    in_course_group_id: params.courseGroupId,
    in_course_year_id: params.courseYearId,
    in_regulation_id: params.regulationId,
    in_subject_id: params.subjectId,
    in_eaxm_labbatch_id: params.labBatchId || 0,
    is_extenalperson_approve: 0,
    in_exam_date: formatExamDateYmd(params.examDate),
  };
  const procs = ["s_get_exam_markdetails", "s_get_exam_mark_details"];
  for (const proc of procs) {
    try {
      const data = await getAllRecords<{ result: AnyRow[][] }>(proc, payload);
      const groups = data?.result ?? [];
      const rawStudents = Array.isArray(groups[0]) ? groups[0] : [];
      const students = dedupeStudentsByHallticket(rawStudents);
      if (students.length > 0) {
        return {
          students,
          externalEvaluators: Array.isArray(groups[1]) ? groups[1] : [],
          internalEvaluators: Array.isArray(groups[2]) ? groups[2] : [],
        };
      }
    } catch {
      // try next proc variant
    }
  }
  return { students: [], externalEvaluators: [], internalEvaluators: [] };
}

export async function saveInternalMarksEntry(
  rows: AnyRow[],
): Promise<{ success: boolean; message?: string; validationRows: AnyRow[] }> {
  const envelope = await postDetailsEnvelope<AnyRow[]>(
    "examstudentinternalmarks",
    rows,
  );
  const validationRows = Array.isArray(envelope.data) ? envelope.data : [];
  return {
    success: envelope.success,
    message: envelope.message,
    validationRows,
  };
}

export async function getSecureMarksFilters(
  employeeId: number,
): Promise<AnyRow[]> {
  const common = {
    in_university_id: 0,
    in_univ_examcenter_id: 0,
    in_college_id: 0,
    in_course_id: 0,
    in_course_group_id: 0,
    in_course_year_id: 0,
    in_exam_id: 0,
    in_academic_year_id: 0,
    in_regulation_id: 0,
    in_subject_id: 0,
    in_sub_flag_type: "",
    in_param1: 0,
    in_param2: "REGSUP",
    in_loginuser_roleid: 0,
    in_loginuser_empid: employeeId || 0,
  };

  const attempts: Array<{
    in_flag: string;
    in_flag_type: string;
    pickFlag?: string;
  }> = [
    {
      in_flag: "univ_exam_inep_filters",
      in_flag_type: "OFF_EXT_EVAL",
      pickFlag: "univ_exam_inep_filters",
    },
    {
      in_flag: "univ_exam_inep_filters",
      in_flag_type: "QUESTION_SETTER",
      pickFlag: "univ_exam_inep_filters",
    },
    {
      in_flag: "univ_exam_filters",
      in_flag_type: "REGSUP",
      pickFlag: "univ_exam_filters",
    },
  ];

  for (const attempt of attempts) {
    try {
      const data = await getAllRecords<{ result: AnyRow[][] }>(
        "s_get_exam_filters_bycode",
        {
          ...common,
          in_flag: attempt.in_flag,
          in_flag_type: attempt.in_flag_type,
        },
      );
      const groups = data?.result ?? [];
      const picked =
        groups.find((g) => (g?.[0]?.flag ?? "") === (attempt.pickFlag ?? "")) ??
        groups.find((g) => Array.isArray(g) && g.length > 0) ??
        [];
      if (picked.length > 0) return picked;
    } catch {
      // try next attempt
    }
  }

  return [];
}

export async function getSecureMarksRestFilters(params: {
  courseId: number;
  examId: number;
  academicYearId: number;
  employeeId: number;
}): Promise<{ restFilters: AnyRow[]; regulations: AnyRow[] }> {
  const common = {
    in_university_id: 0,
    in_univ_examcenter_id: 0,
    in_college_id: 0,
    in_course_id: params.courseId,
    in_course_group_id: 0,
    in_course_year_id: 0,
    in_exam_id: params.examId,
    in_academic_year_id: params.academicYearId,
    in_regulation_id: 0,
    in_subject_id: 0,
    in_sub_flag_type: "",
    in_param1: 0,
    in_param2: "REGSUP",
    in_loginuser_roleid: 0,
    in_loginuser_empid: params.employeeId || 0,
  };

  const attempts: Array<{ in_flag: string; in_flag_type: string }> = [
    { in_flag: "univ_exam_rest_inep_uc", in_flag_type: "OFF_EXT_EVAL" },
    { in_flag: "univ_exam_rest_in_regexamstd", in_flag_type: "REGSUP" },
    { in_flag: "univ_exam_rest_in_regexamstd", in_flag_type: "ALL" },
  ];

  for (const attempt of attempts) {
    try {
      const data = await getAllRecords<{ result: AnyRow[][] }>(
        "s_get_exam_filters_bycode",
        {
          ...common,
          in_flag: attempt.in_flag,
          in_flag_type: attempt.in_flag_type,
        },
      );
      const groups = data?.result ?? [];
      const restFilters =
        groups.find((g) => (g?.[0]?.flag ?? "") === "univ_exam_rest_filters") ??
        [];
      const regulations =
        groups.find((g) => (g?.[0]?.flag ?? "") === "regulations") ?? [];
      if (restFilters.length > 0 || regulations.length > 0)
        return { restFilters, regulations };
    } catch {
      // try next attempt
    }
  }

  return { restFilters: [], regulations: [] };
}

export async function getSecureMarksSubjects(params: {
  collegeId: number;
  courseId: number;
  courseGroupId: number;
  courseYearId: number;
  examId: number;
  academicYearId: number;
  regulationId: number;
  employeeId: number;
}): Promise<AnyRow[]> {
  const common = {
    in_university_id: 0,
    in_univ_examcenter_id: 0,
    in_college_id: params.collegeId,
    in_course_id: params.courseId,
    in_course_group_id: params.courseGroupId,
    in_course_year_id: params.courseYearId,
    in_exam_id: params.examId,
    in_academic_year_id: params.academicYearId,
    in_regulation_id: params.regulationId,
    in_sub_flag_type: "ALL",
    in_subject_id: 0,
    in_param1: 0,
    in_param2: 0,
    in_loginuser_roleid: 0,
    in_loginuser_empid: params.employeeId || 0,
  };

  const attempts = ["REGSUP", "ALL"];
  for (const flagType of attempts) {
    try {
      const data = await getAllRecords<{ result: AnyRow[][] }>(
        "s_get_exam_filters_bycode",
        {
          ...common,
          in_flag: "univ_exam_subject_regexamstd",
          in_flag_type: flagType,
        },
      );
      const groups = data?.result ?? [];
      const picked =
        groups.find(
          (g) => (g?.[0]?.flag ?? "") === "univ_exam_sub_regexamstd",
        ) ??
        groups.find((g) => Array.isArray(g) && g.length > 0) ??
        [];
      if (picked.length > 0) return picked;
    } catch {
      // try next flag type
    }
  }
  return [];
}

export async function generateMarksEntrySecretCode(
  userId: number,
): Promise<string> {
  // Angular: this.http.post(MAINAPI + 'api/generateSecretCodeForMarksEntry' + '/' + userId, ' ')
  // → POST cms/api/generateSecretCodeForMarksEntry/{userId} (NOT GET, and the
  // `api/` segment is required — without it Spring 404s).
  const res = await fetch(
    `/api/proxy/${EXAM_EVAL_API.GENERATE_SECRET_CODE_MARKS}/${userId}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: '" "',
    },
  );
  const body = await res.json().catch(() => null);
  if (
    !res.ok ||
    body?.success === false ||
    (body?.statusCode != null && Number(body.statusCode) !== 200)
  ) {
    throw new Error(
      body?.message ?? `Failed to generate secret code (${res.status})`,
    );
  }
  if (!body?.data) {
    throw new Error(body?.message ?? "Failed to generate secret code");
  }
  return body?.message ?? "Secret code generated successfully";
}

export async function validateMarksEntrySecretCode(
  userId: number,
  secretCode: string,
): Promise<boolean> {
  // Angular getDetailsByRequestApi(validateSecretCodeForMarksEntryUrl, …) →
  // GET cms/api/validateSecretCodeForMarksEntry?userId=…&secretCode=…
  const search = new URLSearchParams({ userId: String(userId), secretCode });
  const res = await fetch(
    `/api/proxy/${EXAM_EVAL_API.VALIDATE_SECRET_CODE_MARKS}?${search.toString()}`,
  );
  const body = await res.json().catch(() => null);
  return body?.data === true || body?.data === "true";
}

/** Angular `exammarksdownloadUrl` — downloadable secure-marks import template. */
export async function downloadSecureMarksTemplate(params: {
  collegeId: number;
  subjectId: number;
  examId: number;
  courseGroupId: number;
  courseYearId: number;
  examdate: string;
}): Promise<Blob> {
  const search = new URLSearchParams(
    Object.fromEntries(
      Object.entries(params).map(([key, value]) => [key, String(value)]),
    ),
  );
  const res = await fetch(
    `${NEXT_API.PROXY(EXAM_API.EXAMMARKSDOWNLOAD)}?${search.toString()}`,
  );
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(
      body?.message ?? `Failed to download marks sheet (${res.status})`,
    );
  }
  return res.blob();
}

/** Angular `uploadexammarksUrl` — validate and merge marks from an XLSX file. */
export async function uploadSecureExamMarks(params: {
  file: File;
  collegeId: number;
  courseId: number;
  courseYearId: number;
  subjectId: number;
  examId: number;
  regulationId: number;
  subjectCategoryId: number;
  subjectTypeId: number;
}): Promise<{ rows: AnyRow[]; message: string }> {
  const formData = new FormData();
  formData.append("file", params.file, params.file.name);
  formData.append("collegeId", String(params.collegeId));
  formData.append("courseId", String(params.courseId));
  formData.append("courseYearId", String(params.courseYearId));
  formData.append("subjectId", String(params.subjectId));
  formData.append("examId", String(params.examId));
  formData.append("regulationId", String(params.regulationId));
  formData.append("subjectCategoryId", String(params.subjectCategoryId));
  formData.append("subjectTypeId", String(params.subjectTypeId));

  const response = (await uploadFile(EXAM_API.UPLOADEXAMMARKS, formData)) as {
    data?: AnyRow[];
    message?: string;
  } | null;

  return {
    rows: Array.isArray(response?.data) ? response.data : [],
    message: response?.message ?? "Marks uploaded successfully",
  };
}

export async function getExamMarksEntryFilters(
  employeeId: number,
): Promise<AnyRow[]> {
  // Angular exam-marks-entry getExamFiltersList — exact flags only
  const data = await getAllRecords<{ result: AnyRow[][] }>(
    "s_get_exam_filters_bycode",
    {
      in_flag: "univ_exam_inep_filters",
      in_flag_type: "OFF_INT_EVAL",
      in_university_id: 0,
      in_univ_examcenter_id: 0,
      in_college_id: 0,
      in_course_id: 0,
      in_course_group_id: 0,
      in_course_year_id: 0,
      in_exam_id: 0,
      in_academic_year_id: 0,
      in_regulation_id: 0,
      in_subject_id: 0,
      in_sub_flag_type: "",
      in_param1: 0,
      in_param2: "REGSUP",
      in_loginuser_roleid: 0,
      in_loginuser_empid: employeeId || 0,
    },
  );
  const groups = data?.result ?? [];
  const picked = firstGroupByFlag(groups, ["univ_exam_inep_filters"]);
  return picked.length > 0 ? picked : firstNonEmptyGroup(groups);
}

export async function getExamMarksEntryRestFilters(params: {
  courseId: number;
  examId: number;
  academicYearId: number;
  employeeId: number;
}): Promise<{ restFilters: AnyRow[]; regulations: AnyRow[] }> {
  // Angular selectedExam — univ_exam_rest_inep_uc / OFF_INT_EVAL
  const data = await getAllRecords<{ result: AnyRow[][] }>(
    "s_get_exam_filters_bycode",
    {
      in_flag: "univ_exam_rest_inep_uc",
      in_flag_type: "OFF_INT_EVAL",
      in_university_id: 0,
      in_univ_examcenter_id: 0,
      in_college_id: 0,
      in_course_id: params.courseId,
      in_course_group_id: 0,
      in_course_year_id: 0,
      in_exam_id: params.examId,
      in_academic_year_id: params.academicYearId,
      in_regulation_id: 0,
      in_subject_id: 0,
      in_sub_flag_type: "",
      in_param1: 0,
      in_param2: "REGSUP",
      in_loginuser_roleid: 0,
      in_loginuser_empid: params.employeeId || 0,
    },
  );
  const groups = data?.result ?? [];
  return {
    restFilters: firstGroupByFlag(groups, ["univ_exam_rest_filters"]),
    regulations: firstGroupByFlag(groups, ["regulations"]),
  };
}

export async function getExamMarksEntrySubjects(params: {
  collegeId: number;
  courseId: number;
  courseGroupId: number;
  courseYearId: number;
  examId: number;
  academicYearId: number;
  regulationId: number;
  employeeId: number;
}): Promise<AnyRow[]> {
  // Angular selectedRegulation — univ_exam_subject_inep / OFF_INT_EVAL
  const data = await getAllRecords<{ result: AnyRow[][] }>(
    "s_get_exam_filters_bycode",
    {
      in_flag: "univ_exam_subject_inep",
      in_flag_type: "OFF_INT_EVAL",
      in_university_id: 0,
      in_univ_examcenter_id: 0,
      in_college_id: params.collegeId,
      in_course_id: params.courseId,
      in_course_group_id: params.courseGroupId,
      in_course_year_id: params.courseYearId,
      in_exam_id: params.examId,
      in_academic_year_id: params.academicYearId,
      in_regulation_id: params.regulationId,
      in_sub_flag_type: "ALL",
      in_subject_id: 0,
      in_param1: 0,
      in_param2: 0,
      in_loginuser_roleid: 0,
      in_loginuser_empid: params.employeeId || 0,
    },
  );
  const groups = data?.result ?? [];
  const picked = firstGroupByFlag(groups, ["univ_exam_sub_inep"]);
  return picked.length > 0 ? picked : groups.flatMap((g) => g ?? []);
}

/**
 * Angular getMarksSetup → getGroupSubjectsByRegulation
 * GET groupyrregulationdetails/?collegeId=&coursegroupId=&courseyearId=&regulationId=
 */
export async function getExamMarksEntrySubjectMarks(params: {
  collegeId: number;
  courseGroupId: number;
  courseYearId: number;
  regulationId: number;
}): Promise<AnyRow[]> {
  if (
    !params.collegeId ||
    !params.courseGroupId ||
    !params.courseYearId ||
    !params.regulationId
  )
    return [];
  try {
    const raw = await fetchDetails<unknown>("groupyrregulationdetails", {
      collegeId: params.collegeId,
      coursegroupId: params.courseGroupId,
      courseyearId: params.courseYearId,
      regulationId: params.regulationId,
    });
    if (Array.isArray(raw)) return raw as AnyRow[];
    if (raw && typeof raw === "object") {
      const obj = raw as Record<string, unknown>;
      if (Array.isArray(obj.data)) return obj.data as AnyRow[];
      if (Array.isArray(obj.resultList)) return obj.resultList as AnyRow[];
      if (Array.isArray(obj.result)) return obj.result as AnyRow[];
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Angular getMarksSetup → domain/list/ExamMarkssetup
 * Course.courseId==…and.Regulation.regulationId==…and.isActive==true
 */
export async function listExamMarksSetupForEntry(
  courseId: number,
  regulationId: number,
): Promise<AnyRow[]> {
  if (!courseId || !regulationId) return [];
  try {
    return await domainList<AnyRow>(
      "ExamMarkssetup",
      buildQuery({
        "Course.courseId": courseId,
        "Regulation.regulationId": regulationId,
        isActive: true,
      }),
    );
  } catch {
    return [];
  }
}

/**
 * Angular internal-marks-entry getMarksSetup → listDetailsByFourIds(ExamMarkssetup)
 * filtered by course, regulation, and subject type.
 */
export async function listInternalExamMarksSetup(params: {
  courseId: number;
  regulationId: number;
  subjectTypeId: number;
}): Promise<AnyRow[]> {
  if (!params.courseId || !params.regulationId || !params.subjectTypeId)
    return [];
  try {
    return await domainList<AnyRow>(
      "ExamMarkssetup",
      buildQuery({
        "Course.courseId": params.courseId,
        "Regulation.regulationId": params.regulationId,
        "subjectCategoryCatDet.generalDetailId": params.subjectTypeId,
        isActive: true,
      }),
    );
  } catch {
    return [];
  }
}

/**
 * Angular getGroupSubjectsBySubject →
 * GET groupyrregulationdetails/?courseId=&coursegroupId=&regulationId=&subjectId=
 */
export async function getInternalMarksEntrySubjectMarks(params: {
  courseId: number;
  courseGroupId: number;
  regulationId: number;
  subjectId: number;
}): Promise<AnyRow[]> {
  if (
    !params.courseId ||
    !params.courseGroupId ||
    !params.regulationId ||
    !params.subjectId
  )
    return [];
  try {
    const raw = await fetchDetails<unknown>("groupyrregulationdetails", {
      courseId: params.courseId,
      coursegroupId: params.courseGroupId,
      regulationId: params.regulationId,
      subjectId: params.subjectId,
    });
    if (Array.isArray(raw)) return raw as AnyRow[];
    if (raw && typeof raw === "object") {
      const obj = raw as Record<string, unknown>;
      if (Array.isArray(obj.data)) return obj.data as AnyRow[];
      if (Array.isArray(obj.resultList)) return obj.resultList as AnyRow[];
      if (Array.isArray(obj.result)) return obj.result as AnyRow[];
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Angular getStudentsList (internal exam) merges existing marks from
 * ExamStudentInternalMark by college + exam + subject.
 */
export async function listExamStudentInternalMarksForEntry(params: {
  collegeId: number;
  examId: number;
  subjectId: number;
}): Promise<AnyRow[]> {
  if (!params.collegeId || !params.examId || !params.subjectId) return [];
  try {
    return await domainList<AnyRow>(
      "ExamStudentInternalMark",
      buildQuery({
        "college.collegeId": params.collegeId,
        "examMaster.examId": params.examId,
        "subject.subjectId": params.subjectId,
      }),
    );
  } catch {
    return [];
  }
}

export async function getExamTypeMarkDetails(params: {
  collegeId: number;
  courseId: number;
  examId: number;
  courseGroupId: number;
  courseYearId: number;
  regulationId: number;
  subjectId: number;
  labBatchId: number;
  examDate: string;
  examTypeId: number;
}): Promise<AnyRow[]> {
  const bundle = await getExamTypeMarkDetailsBundle(params);
  return bundle.students;
}

/**
 * Angular exam-marks-entry Get List —
 * getAllRecords/s_get_exam_lab_markdetails with flag `marks_entry`.
 */
export async function getExamTypeMarkDetailsBundle(params: {
  collegeId: number;
  courseId: number;
  examId: number;
  courseGroupId: number;
  courseYearId: number;
  regulationId: number;
  subjectId: number;
  labBatchId: number;
  examDate: string;
  examTypeId: number;
}): Promise<{
  students: AnyRow[];
  externalEvaluators: AnyRow[];
  internalEvaluators: AnyRow[];
}> {
  const payload = {
    in_flag: "marks_entry",
    in_college_id: params.collegeId,
    in_course_id: params.courseId,
    in_exam_id: params.examId,
    in_course_group_id: params.courseGroupId,
    in_course_year_id: params.courseYearId,
    in_regulation_id: params.regulationId,
    in_subject_id: params.subjectId,
    in_eaxm_labbatch_id: params.labBatchId || 0,
    is_extenalperson_approve: 0,
    in_exam_date: params.examDate,
    in_exam_type: params.examTypeId || 0,
  };
  try {
    const data = await getAllRecords<{ result: AnyRow[][] }>(
      "s_get_exam_lab_markdetails",
      payload,
    );
    const groups = data?.result ?? [];
    const rawStudents = Array.isArray(groups[0]) ? groups[0] : [];
    const studentsByHallTicket = new Map<string, AnyRow>();
    for (const student of rawStudents) {
      studentsByHallTicket.set(
        String(
          student.hallticketNumber ??
            student.hallticket_number ??
            student.studentId,
        ),
        student,
      );
    }
    return {
      students: Array.from(studentsByHallTicket.values()),
      externalEvaluators: Array.isArray(groups[1]) ? groups[1] : [],
      internalEvaluators: Array.isArray(groups[2]) ? groups[2] : [],
    };
  } catch {
    return { students: [], externalEvaluators: [], internalEvaluators: [] };
  }
}

export async function getInternalAttendanceRestFilters(params: {
  courseId: number;
  examId: number;
  academicYearId: number;
  employeeId: number;
}): Promise<AnyRow[]> {
  // Angular selectedExam — same payload (no univ_exam_rest_no_tt fallback)
  const data = await getAllRecords<{ result: AnyRow[][] }>(
    "s_get_exam_filters_bycode",
    {
      in_flag: "univ_exam_rest_in_regexamstd",
      in_flag_type: "ALL",
      in_university_id: 0,
      in_univ_examcenter_id: 0,
      in_college_id: 0,
      in_course_id: params.courseId,
      in_course_group_id: 0,
      in_course_year_id: 0,
      in_exam_id: params.examId,
      in_academic_year_id: params.academicYearId,
      in_regulation_id: 0,
      in_subject_id: 0,
      in_sub_flag_type: "",
      in_param1: 0,
      in_param2: 0,
      in_loginuser_roleid: 0,
      in_loginuser_empid: params.employeeId || 0,
    },
  );
  const groups = data?.result ?? [];
  return firstGroupByFlag(groups, ["univ_exam_rest_filters"]);
}

export async function getInternalAttendanceSubjects(params: {
  collegeId: number;
  courseId: number;
  courseGroupId: number;
  courseYearId: number;
  examId: number;
  academicYearId: number;
  regulationId: number;
  employeeId: number;
}): Promise<AnyRow[]> {
  // Angular selectedRegulation → univ_exam_subject_regexamstd / ALL → univ_exam_sub_regexamstd
  const data = await getAllRecords<{ result: AnyRow[][] }>(
    "s_get_exam_filters_bycode",
    {
      in_flag: "univ_exam_subject_regexamstd",
      in_flag_type: "ALL",
      in_university_id: 0,
      in_univ_examcenter_id: 0,
      in_college_id: params.collegeId,
      in_course_id: params.courseId,
      in_course_group_id: params.courseGroupId,
      in_course_year_id: params.courseYearId,
      in_exam_id: params.examId,
      in_academic_year_id: params.academicYearId,
      in_regulation_id: params.regulationId,
      in_sub_flag_type: "ALL",
      in_subject_id: 0,
      in_param1: 0,
      in_param2: 0,
      in_loginuser_roleid: 0,
      in_loginuser_empid: params.employeeId || 0,
    },
  );
  const groups = data?.result ?? [];
  const picked = firstGroupByFlag(groups, ["univ_exam_sub_regexamstd"]);
  return picked.length > 0 ? picked : [];
}

// ---------------------------------------------------------------------------
// Marks Memo Generation & Issue Services (Angular parity)
// ---------------------------------------------------------------------------

export async function generateMarksMemoData(params: {
  examId: number;
  courseYearId: number;
  courseGroupId: number;
  studentId?: number;
}): Promise<AnyRow> {
  const data = await getAllRecords<{ result?: AnyRow[] }>(
    "s_exam_memodata_pop",
    {
      in_exam_id: params.examId,
      in_course_year_id: params.courseYearId || 0,
      in_course_group_id: params.courseGroupId || 0,
      in_student_id: params.studentId || 0,
    },
  );
  return data ?? {};
}

export async function getMarksMemoMaster(params: {
  studentId: number;
  examId: number;
  courseYearId: number;
}): Promise<AnyRow[]> {
  try {
    const list = await domainList<AnyRow>(
      "ExamMemoMaster",
      buildQuery({
        "studentDetail.studentId": params.studentId,
        "examMaster.examId": params.examId,
        "courseYear.courseYearId": params.courseYearId,
      }),
    );
    if (Array.isArray(list) && list.length > 0) return list;
  } catch {
    // fallback
  }
  return [];
}

export async function getCollegeCertificatesForMemo(
  collegeId: number,
): Promise<AnyRow[]> {
  try {
    const list = await domainList<AnyRow>(
      "CollegeCertificate",
      buildQuery({
        certifcateCode: "MARKSMEMO",
        isActive: true,
        "College.collegeId": collegeId,
      }),
    );
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function getFeeCertificateIssues(params: {
  studentId: number;
  collegeCertificateId: number;
  certificateNumber: string;
}): Promise<AnyRow[]> {
  try {
    const list = await domainList<AnyRow>(
      "FeeCertificateIssue",
      buildQuery({
        "studentDetail.studentId": params.studentId,
        "CollegeCertificate.collegeCertificateId": params.collegeCertificateId,
        certificateNumber: params.certificateNumber,
      }),
    );
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function saveExamMemoMaster(data: AnyRow): Promise<AnyRow> {
  if (data?.examMemoMasterId || data?.pk_exam_memo_master_id) {
    return putDetails("ExamMemoMaster", data);
  }
  return postDetails("ExamMemoMaster", data);
}

export async function issueMarksMemoCertificate(data: AnyRow): Promise<AnyRow> {
  return postDetails("FeeCertificateIssue", data);
}

export async function uploadBulkExamMarks(formData: FormData): Promise<AnyRow> {
  return (await uploadFile("uploadbulkexammarks", formData)) as AnyRow;
}

export async function postBulkExamMarks(uniquecode: string): Promise<AnyRow> {
  return fetchDetails(`exambulkmarkspop?in_uniquecode=${uniquecode}`);
}
