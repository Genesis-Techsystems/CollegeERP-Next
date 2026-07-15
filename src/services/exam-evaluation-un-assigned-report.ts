/**
 * Exam Evaluation UnAssigned Report
 * (Angular: exam-reports/exam-evaluation-un-assigned-report).
 */

import { crud } from "@/services/crud";
import { EXAM_EVAL_API } from "@/config/constants/api";
import { getEvalReportBaseFilters } from "@/services/exam-evaluation-report";

export { getEvalReportBaseFilters as getEvalUnassignedBaseFilters };

type AnyRow = Record<string, unknown>;
type ProcRows = AnyRow[];

function extractProcRows(data: unknown): ProcRows {
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
    if (Array.isArray(obj.resultList)) {
      return obj.resultList as ProcRows;
    }
  }

  return [];
}

/**
 * Angular getList → s_get_exam_eval_unassigned
 *   in_flag: REG_SUP | REG_SUP_REVAL
 *   in_course_year_id: '' (unused on form)
 *   in_course_id, in_exam_id
 */
export async function getExamEvalUnassignedList(params: {
  courseId: number;
  examId: number;
  isReevaluation: boolean;
  courseYearId?: number | string;
}): Promise<ProcRows> {
  if (!params.courseId || !params.examId) return [];

  const data = await crud
    .getAllRecords<unknown>(EXAM_EVAL_API.EVAL_UNASSIGNED, {
      in_flag: params.isReevaluation ? "REG_SUP_REVAL" : "REG_SUP",
      in_course_year_id:
        params.courseYearId === undefined || params.courseYearId === null
          ? ""
          : params.courseYearId,
      in_course_id: params.courseId,
      in_exam_id: params.examId,
    })
    .catch(() => null);

  return extractProcRows(data);
}
