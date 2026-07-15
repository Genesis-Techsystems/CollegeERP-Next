/**
 * Group & Year Wise Result Report
 * (Angular: exam-reports/group-yearwise-result-report).
 */

import { crud } from "@/services/crud";
import { EXAM_EVAL_API } from "@/config/constants/api";
import { txt } from "@/common/utils/data-helpers";

type AnyRow = Record<string, unknown>;
type ProcRows = AnyRow[];
export type { AnyRow };

function firstGroupByFlag(groups: ProcRows[], flags: string[]): ProcRows {
  for (const flag of flags) {
    const found = groups.find((g) => txt(g?.[0]?.flag) === flag);
    if (found?.length) return found;
  }
  return [];
}

/** Angular: evaluatedReport = result.data.result[0] */
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

/**
 * Angular builds displayedColumns from Object.keys(firstRow), then:
 *   splice(0, 5); splice(1, 2);
 */
export function buildDisplayColumnKeys(firstRow: AnyRow | undefined): string[] {
  if (!firstRow) return [];
  const keys = Object.keys(firstRow);
  keys.splice(0, 5);
  keys.splice(1, 2);
  return keys;
}

/** Angular getFiltersList: univ_exam_filters + REGSUP */
export async function getGroupYearwiseBaseFilters(
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
 * → flag univ_exam_rest_filters (colleges + course groups).
 */
export async function getGroupYearwiseRestFilters(params: {
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
 * Angular getGradeList → ExamPreModerationUrl
 * flag: exam_pre_mod_ext_int_group
 * Note: Angular sends in_course_id: 0 (selected course is filter-only).
 */
export async function getGroupYearwiseResultReport(params: {
  examId: number;
  collegeId: number;
  courseGroupId: number;
  academicYearId: number;
}): Promise<ProcRows> {
  const data = await crud.getAllRecords<unknown>(
    EXAM_EVAL_API.PREMODERATION_REPORTS_BYCODES,
    {
      in_flag: "exam_pre_mod_ext_int_group",
      in_exam_id: params.examId,
      in_college_id: params.collegeId,
      in_course_id: 0,
      in_course_group_id: params.courseGroupId,
      in_course_year_id: 0,
      in_academic_year_id: params.academicYearId,
      in_regulation_id: 0,
      in_subject_id: 0,
    },
  );
  return extractResult0(data);
}
