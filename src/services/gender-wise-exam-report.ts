/**
 * Gender Wise Exam Result
 * (Angular: exam-reports/gender-wise-exam-report).
 */

import { crud } from "@/services/crud";
import { EXAM_EVAL_API } from "@/config/constants/api";
import { txt } from "@/common/utils/data-helpers";
import { listExamFeeTypeGeneralDetails } from "@/services/examination";

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

/** Angular getFiltersList: univ_exam_filters + REGSUP + ALL */
export async function getGenderWiseExamBaseFilters(
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
    .catch(() => ({ result: [] as ProcRows[] }));
  return firstGroupByFlag(data?.result ?? [], ["univ_exam_filters"]);
}

/**
 * Angular selectedExam: univ_exam_rest_in_regexamstd + ALL
 * → flag univ_exam_rest_filters (colleges / groups / years).
 */
export async function getGenderWiseExamRestFilters(params: {
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
    .catch(() => ({ result: [] as ProcRows[] }));
  return firstGroupByFlag(data?.result ?? [], ["univ_exam_rest_filters"]);
}

/** Angular getExamTypes → GeneralDetail EXMFEETYP */
export async function getGenderWiseExamFeeTypes(): Promise<ProcRows> {
  try {
    return (await listExamFeeTypeGeneralDetails()) as ProcRows;
  } catch {
    return [];
  }
}

/**
 * Angular getDetails → s_get_exam_final_analysis_bycodes
 *   in_flag: final_group_subject_wise_results
 */
export async function getGenderWiseExamReport(params: {
  examId: number;
  collegeId: number;
  courseId: number;
  courseGroupId: number;
  courseYearId: number;
  examTypeCatdetId: number;
}): Promise<ProcRows> {
  if (!params.examId || !params.courseId || !params.collegeId) return [];
  const data = await crud
    .getAllRecords<unknown>(EXAM_EVAL_API.EXAM_FINAL_ANALYSIS_BYCODES, {
      in_flag: "final_group_subject_wise_results",
      in_exam_id: params.examId,
      in_college_id: params.collegeId,
      in_course_id: params.courseId,
      in_course_group_id: params.courseGroupId || 0,
      in_course_year_id: params.courseYearId || 0,
      in_examtypecate_det_id: params.examTypeCatdetId || 0,
    })
    .catch(() => null);
  return extractResult0(data);
}
