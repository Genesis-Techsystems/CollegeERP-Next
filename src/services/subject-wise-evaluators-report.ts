/**
 * Subject Wise Evaluators List Report
 * (Angular: exam-reports/subject-wise-evaluators-report).
 */

import { crud } from "@/services/crud";
import { EXAM_EVAL_API } from "@/config/constants/api";
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

function extractResult0(data: unknown): ProcRows {
  if (data == null) return [];
  if (Array.isArray(data)) {
    if (data.length > 0 && Array.isArray(data[0])) {
      return (data[0] as ProcRows) ?? [];
    }
    if (data.length > 0 && typeof data[0] === "object") {
      return data as ProcRows;
    }
    return [];
  }
  if (typeof data === "object") {
    const obj = data as { result?: unknown; resultList?: unknown };
    const result = obj.result;
    if (Array.isArray(result)) {
      if (result.length > 0 && Array.isArray(result[0])) {
        return (result[0] as ProcRows) ?? [];
      }
      if (result.length > 0 && typeof result[0] === "object") {
        return result as ProcRows;
      }
    }
    if (Array.isArray(obj.resultList)) return obj.resultList as ProcRows;
  }
  return [];
}

/** Angular getFiltersList: univ_exam_filters + REGSUP */
export async function getSubjectWiseEvalBaseFilters(
  employeeId: number,
): Promise<ProcRows> {
  const data = await crud
    .getAllRecords<{ result: ProcRows[] }>("s_get_exam_filters_bycode", {
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
    })
    .catch(() => ({ result: [] }));
  return firstGroupByFlag(data?.result ?? [], ["univ_exam_filters"]);
}

/**
 * Angular selectedExam: univ_exam_rest_in_regexamstd + ALL
 * → flag univ_exam_rest_filters (colleges / groups / years / regulations).
 */
export async function getSubjectWiseEvalRestFilters(params: {
  courseId: number;
  academicYearId: number;
  examId: number;
  employeeId: number;
}): Promise<ProcRows> {
  const data = await crud
    .getAllRecords<{ result: ProcRows[] }>("s_get_exam_filters_bycode", {
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
    })
    .catch(() => ({ result: [] }));
  return firstGroupByFlag(data?.result ?? [], ["univ_exam_rest_filters"]);
}

/**
 * Angular selectedRegulation: univ_exam_subject_uc + ALL
 * → flag univ_exam_sub_uc
 */
export async function getSubjectWiseEvalSubjects(params: {
  courseId: number;
  academicYearId: number;
  examId: number;
  collegeId: number;
  courseGroupId: number;
  courseYearId: number;
  regulationId: number;
  employeeId: number;
}): Promise<ProcRows> {
  const data = await crud
    .getAllRecords<{ result: ProcRows[] }>("s_get_exam_filters_bycode", {
      in_flag: "univ_exam_subject_uc",
      in_flag_type: "ALL",
      in_university_id: 0,
      in_college_id: params.collegeId,
      in_course_id: params.courseId,
      in_course_group_id: params.courseGroupId,
      in_course_year_id: params.courseYearId,
      in_exam_id: params.examId,
      in_academic_year_id: params.academicYearId,
      in_regulation_id: params.regulationId,
      in_subject_id: 0,
      in_loginuser_empid: params.employeeId || 0,
      in_loginuser_roleid: 0,
      in_sub_flag_type: "ALL",
      in_param1: 0,
      in_param2: 0,
    })
    .catch(() => ({ result: [] }));
  return firstGroupByFlag(data?.result ?? [], ["univ_exam_sub_uc"]);
}

/**
 * Angular getEvaluationList → getExamEvaluationCodesUrl
 * flag: list_evaluatorassignment_list
 * Note: Angular always sends in_regulation_id: 0 on this call.
 */
export async function getSubjectWiseEvaluatorsReport(params: {
  organizationId: number;
  examId: number;
  courseId: number;
  courseYearId: number;
  subjectId: number;
  academicYearId: number;
  employeeId: number;
}): Promise<ProcRows> {
  const data = await crud.getAllRecords<unknown>(EXAM_EVAL_API.EVALUATION_BYCODES, {
    in_flag: "list_evaluatorassignment_list",
    in_orgid: params.organizationId || 1,
    in_fdate: "1990-01-01",
    in_tdate: "1990-01-01",
    in_evalutor_profileid: 0,
    in_exam_date: "1990-01-01",
    in_emp_id: 0,
    in_questionpaper_id: 0,
    in_evaluator_role_id: 0,
    in_academic_year: "",
    in_exam_short_name: "",
    in_affiliatedto_catdet_id: 0,
    in_exam_id: params.examId,
    in_course_year_id: params.courseYearId,
    in_subject_id: params.subjectId,
    in_regulation_id: 0,
    in_course_id: params.courseId,
    in_academic_year_id: params.academicYearId,
    in_loginuser_empid: params.employeeId || 0,
  });
  return extractResult0(data);
}
