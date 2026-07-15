/**
 * Subject Wise Result Pass Percent Report
 * (Angular: exam-reports/subject-wise-result-pass-percent-report).
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
export async function getSubjectWisePassPercentBaseFilters(
  employeeId: number,
): Promise<ProcRows> {
  const data = await crud
    .getAllRecords<{ result: ProcRows[] }>("s_get_exam_filters_bycode", {
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
    })
    .catch(() => ({ result: [] as ProcRows[] }));
  return firstGroupByFlag(data?.result ?? [], ["univ_exam_filters"]);
}

/**
 * Angular selectedExam: univ_exam_rest_in_regexamstd + REGSUP
 * → flag univ_exam_rest_filters (course years).
 */
export async function getSubjectWisePassPercentRestFilters(params: {
  courseId: number;
  academicYearId: number;
  examId: number;
  employeeId: number;
}): Promise<ProcRows> {
  const data = await crud
    .getAllRecords<{ result: ProcRows[] }>("s_get_exam_filters_bycode", {
      in_flag: "univ_exam_rest_in_regexamstd",
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
      in_subject_id: 0,
      in_sub_flag_type: "",
      in_param1: 0,
      in_param2: 0,
      in_loginuser_roleid: 0,
      in_loginuser_empid: params.employeeId || 0,
    })
    .catch(() => ({ result: [] as ProcRows[] }));
  return firstGroupByFlag(data?.result ?? [], ["univ_exam_rest_filters"]);
}

/**
 * Angular getDetails → s_get_exam_moderation_reports
 *   in_flag: exam_analysis_by_subject | re_val_exam_analysis_by_subject
 */
export async function getSubjectWisePassPercentReport(params: {
  examId: number;
  courseId: number;
  courseYearId: number;
  isReevaluation: boolean;
}): Promise<ProcRows> {
  if (!params.examId || !params.courseId) return [];
  const data = await crud
    .getAllRecords<unknown>(EXAM_EVAL_API.EXAM_MODERATION_REPORTS, {
      in_flag: params.isReevaluation
        ? "re_val_exam_analysis_by_subject"
        : "exam_analysis_by_subject",
      in_exam_id: params.examId,
      in_college_id: 0,
      in_course_id: params.courseId,
      in_course_group_id: 0,
      in_course_year_id: params.courseYearId || 0,
      in_examtype: 0,
    })
    .catch(() => null);
  return extractResult0(data);
}
