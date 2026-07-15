/**
 * Exam Student Registration Report + Exam Registered Students Count
 * (Angular: exam-reports/exam-registration-student-report,
 *           exam-reports/exam-registered-students-count).
 */

import { crud } from "@/services/crud";
import { EXAM_API } from "@/config/constants/api";
import { listExamFeeTypeGeneralDetails } from "@/services/examination";
import { listExamTimetablesByExam } from "@/services/pre-examination";
import { txt } from "@/common/utils/data-helpers";

type AnyRow = Record<string, unknown>;
type ProcRows = AnyRow[];

function firstGroupByFlag(groups: ProcRows[], flags: string[]): ProcRows {
  for (const flag of flags) {
    const found = groups.find((g) => txt(g?.[0]?.flag) === flag);
    if (found?.length) return found;
  }
  return [];
}

const EXAM_FILTER_BASE = {
  in_university_id: 0,
  in_univ_examcenter_id: 0,
  in_college_id: 0,
  in_sub_flag_type: "",
  in_param1: 0,
  in_param2: 0,
  in_loginuser_roleid: 0,
} as const;

/** Angular getExamFiltersList: univ_exam_filters + REGSUP */
export async function getExamRegistrationReportBaseFilters(
  employeeId: number,
): Promise<ProcRows> {
  const data = await crud
    .getAllRecords<{ result: ProcRows[] }>("s_get_exam_filters_bycode", {
      ...EXAM_FILTER_BASE,
      in_flag: "univ_exam_filters",
      in_flag_type: "REGSUP",
      in_course_id: 0,
      in_course_group_id: 0,
      in_course_year_id: 0,
      in_exam_id: 0,
      in_academic_year_id: 0,
      in_regulation_id: 0,
      in_subject_id: 0,
      in_loginuser_empid: employeeId || 0,
    })
    .catch(() => ({ result: [] as ProcRows[] }));
  return firstGroupByFlag(data?.result ?? [], ["univ_exam_filters"]);
}

/**
 * Angular selectedExamTimetable / selectedExam (count):
 * univ_exam_rest_in_regexamstd → group univ_exam_rest_filters
 */
export async function getExamRegistrationReportRestFilters(params: {
  courseId: number;
  academicYearId: number;
  examId: number;
  employeeId: number;
}): Promise<ProcRows> {
  if (!params.courseId || !params.academicYearId || !params.examId) return [];
  const data = await crud
    .getAllRecords<{ result: ProcRows[] }>("s_get_exam_filters_bycode", {
      ...EXAM_FILTER_BASE,
      in_flag: "univ_exam_rest_in_regexamstd",
      in_flag_type: "REGSUP",
      in_course_id: params.courseId,
      in_course_group_id: 0,
      in_course_year_id: 0,
      in_exam_id: params.examId,
      in_academic_year_id: params.academicYearId,
      in_regulation_id: 0,
      in_subject_id: 0,
      in_loginuser_empid: params.employeeId || 0,
    })
    .catch(() => ({ result: [] as ProcRows[] }));
  return firstGroupByFlag(data?.result ?? [], ["univ_exam_rest_filters"]);
}

/**
 * Angular selectedRegulation: univ_exam_subject_regexamstd + NoLAB
 * → group univ_exam_sub_regexamstd
 */
export async function getExamRegistrationReportSubjects(params: {
  courseId: number;
  academicYearId: number;
  examId: number;
  courseGroupId: number;
  courseYearId: number;
  regulationId: number;
  employeeId: number;
}): Promise<ProcRows> {
  if (!params.courseId || !params.academicYearId || !params.examId) return [];
  const data = await crud
    .getAllRecords<{ result: ProcRows[] }>("s_get_exam_filters_bycode", {
      in_flag: "univ_exam_subject_regexamstd",
      in_flag_type: "REGSUP",
      in_university_id: 0,
      in_univ_examcenter_id: 0,
      in_college_id: 0,
      in_course_id: params.courseId,
      in_course_group_id: params.courseGroupId || 0,
      in_course_year_id: params.courseYearId || 0,
      in_exam_id: params.examId,
      in_academic_year_id: params.academicYearId,
      in_regulation_id: params.regulationId || 0,
      in_sub_flag_type: "NoLAB",
      in_subject_id: 0,
      in_param1: 0,
      in_param2: 0,
      in_loginuser_roleid: 0,
      in_loginuser_empid: params.employeeId || 0,
    })
    .catch(() => ({ result: [] as ProcRows[] }));
  return firstGroupByFlag(data?.result ?? [], ["univ_exam_sub_regexamstd"]);
}

/** Angular selectedExam → GeneralDetail EXMFEETYP (filtered client-side by exam flags) */
export async function getExamRegistrationReportFeeTypes(): Promise<ProcRows> {
  try {
    return (await listExamFeeTypeGeneralDetails()) as ProcRows;
  } catch {
    return [];
  }
}

/** Angular selectedExamType → ExamTimetable by examMaster.examId */
export async function getExamRegistrationReportTimetables(
  examId: number,
): Promise<ProcRows> {
  if (!examId) return [];
  try {
    return await listExamTimetablesByExam(examId);
  } catch {
    return [];
  }
}

/**
 * Angular getStudentsList (registration report):
 * s_get_exam_std_reg_tt_details
 * flag exam_std_reg_details | re_exam_std_reg_details
 */
export async function getExamStudentRegistrationReportList(params: {
  examId: number;
  courseId: number;
  courseGroupId: number;
  courseYearId: number;
  regulationId: number;
  subjectId: number;
  examtypeCatdetId: number;
  examTimetableId: number;
  isReevaluation: boolean;
}): Promise<ProcRows> {
  if (!params.examId || !params.courseId) return [];
  const data = await crud
    .getAllRecords<{ result: ProcRows[] }>(EXAM_API.EXAM_STD_REG_TT_DETAILS, {
      in_flag: params.isReevaluation
        ? "re_exam_std_reg_details"
        : "exam_std_reg_details",
      in_exam_id: params.examId,
      in_clg_id: 0,
      in_course_id: params.courseId,
      in_course_group_id: params.courseGroupId || 0,
      in_course_year_id: params.courseYearId || 0,
      in_regulation_id: params.regulationId || 0,
      in_subject_id: params.subjectId || 0,
      in_examtype_catdet_id: params.examtypeCatdetId || 0,
      in_std_id: 0,
      in_exam_timetable_id: params.examTimetableId || 0,
      in_room_id: 0,
      in_exam_labbatch_id: 0,
    })
    .catch(() => ({ result: [] as ProcRows[] }));
  const group = data?.result?.[0];
  return Array.isArray(group) ? group : [];
}

/**
 * Angular Exam Registered Students Count
 * (`exam-student-registration-tt-report` getStudentsList):
 *
 * GET s_get_exam_std_reg_tt_details
 *   in_flag: exam_std_subject_registered_count | re_exam_std_subject_registered_count
 *   in_exam_id, in_clg_id, in_course_id, in_course_group_id, in_course_year_id,
 *   in_regulation_id, in_subject_id, in_examtype_catdet_id, in_std_id,
 *   in_exam_timetable_id, in_room_id, in_exam_labbatch_id
 */
export async function getExamRegisteredStudentsCountList(params: {
  examId: number;
  courseId: number;
  courseGroupId: number;
  courseYearId: number;
  regulationId: number;
  subjectId: number;
  examtypeCatdetId: number;
  examTimetableId: number;
  isReevaluation: boolean;
}): Promise<ProcRows> {
  if (!params.examId || !params.courseId) return [];
  const data = await crud
    .getAllRecords<{ result: ProcRows[] }>(EXAM_API.EXAM_STD_REG_TT_DETAILS, {
      in_flag: params.isReevaluation
        ? "re_exam_std_subject_registered_count"
        : "exam_std_subject_registered_count",
      in_exam_id: params.examId,
      in_clg_id: 0,
      in_course_id: params.courseId,
      in_course_group_id: params.courseGroupId || 0,
      in_course_year_id: params.courseYearId || 0,
      in_regulation_id: params.regulationId || 0,
      in_subject_id: params.subjectId || 0,
      in_examtype_catdet_id: params.examtypeCatdetId || 0,
      in_std_id: 0,
      in_exam_timetable_id: params.examTimetableId || 0,
      in_room_id: 0,
      in_exam_labbatch_id: 0,
    })
    .catch(() => ({ result: [] as ProcRows[] }));
  const group = data?.result?.[0];
  return Array.isArray(group) ? group : [];
}

/**
 * Angular Exam Students Not Registered Count
 * (`exam-student-not-registered-count` getStudentsList):
 *
 * GET s_get_exam_std_reg_tt_details
 *   in_flag: exam_std_subject_not_registered
 */
export async function getExamStudentsNotRegisteredCountList(params: {
  examId: number;
  courseId: number;
  courseGroupId: number;
  courseYearId: number;
  regulationId: number;
  subjectId: number;
  examtypeCatdetId: number;
  examTimetableId: number;
}): Promise<ProcRows> {
  if (!params.examId || !params.courseId) return [];
  const data = await crud
    .getAllRecords<{ result: ProcRows[] }>(EXAM_API.EXAM_STD_REG_TT_DETAILS, {
      in_flag: "exam_std_subject_not_registered",
      in_exam_id: params.examId,
      in_clg_id: 0,
      in_course_id: params.courseId,
      in_course_group_id: params.courseGroupId || 0,
      in_course_year_id: params.courseYearId || 0,
      in_regulation_id: params.regulationId || 0,
      in_subject_id: params.subjectId || 0,
      in_examtype_catdet_id: params.examtypeCatdetId || 0,
      in_std_id: 0,
      in_exam_timetable_id: params.examTimetableId || 0,
      in_room_id: 0,
      in_exam_labbatch_id: 0,
    })
    .catch(() => ({ result: [] as ProcRows[] }));
  const group = data?.result?.[0];
  return Array.isArray(group) ? group : [];
}
