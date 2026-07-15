/**
 * Exam Evaluation Report (Angular: exam-reports/exam-evaluation-report).
 */

import { crud } from "@/services/crud";
import { EXAM_API, EXAM_EVAL_API } from "@/config/constants/api";
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

/** Angular getFiltersList: univ_exam_filters + REGSUP */
export async function getEvalReportBaseFilters(
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
 * Angular selectedExam: univ_exam_subject_regexamstd + REGSUP / NoLAB
 * → rows flagged univ_exam_sub_regexamstd (regulations + subjects).
 */
export async function getEvalReportSubjectRows(params: {
  courseId: number;
  academicYearId: number;
  examId: number;
  employeeId: number;
}): Promise<ProcRows> {
  const data = await crud
    .getAllRecords<{ result: ProcRows[] }>("s_get_exam_filters_bycode", {
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
      in_sub_flag_type: "NoLAB",
      in_subject_id: 0,
      in_param1: 0,
      in_param2: 0,
      in_loginuser_roleid: 0,
      in_loginuser_empid: params.employeeId || 0,
    })
    .catch(() => ({ result: [] }));
  return firstGroupByFlag(data?.result ?? [], ["univ_exam_sub_regexamstd"]);
}

/**
 * Angular selectedsubject: univ_exam_subject_inep + ONL_EVAL
 * → evaluator list flagged univ_exam_subject_inep.
 */
export async function getEvalReportEvaluators(params: {
  courseId: number;
  academicYearId: number;
  examId: number;
  regulationId: number;
  subjectId: number;
  employeeId: number;
}): Promise<ProcRows> {
  const data = await crud
    .getAllRecords<{ result: ProcRows[] }>("s_get_exam_filters_bycode", {
      in_flag: "univ_exam_subject_inep",
      in_flag_type: "ONL_EVAL",
      in_university_id: 0,
      in_college_id: 0,
      in_course_id: params.courseId,
      in_course_group_id: 0,
      in_course_year_id: 0,
      in_exam_id: params.examId,
      in_academic_year_id: params.academicYearId,
      in_regulation_id: params.regulationId,
      in_subject_id: params.subjectId,
      in_loginuser_empid: params.employeeId || 0,
      in_loginuser_roleid: 0,
      in_sub_flag_type: "ALL",
      in_param1: 0,
      in_param2: 0,
    })
    .catch(() => ({ result: [] }));
  return firstGroupByFlag(data?.result ?? [], ["univ_exam_subject_inep"]);
}

/** Angular getList → s_get_evaluation_detail_report */
export async function getExamEvaluationDetailReport(params: {
  courseId: number;
  examId: number;
  regulationId: number;
  subjectId: number;
  evaluatorProfileId: number;
  isReevaluation: boolean;
}): Promise<ProcRows> {
  const flag = params.isReevaluation
    ? "re_evaluation_report"
    : "evaluation_report";

  // Angular getDetailsByRequest params (same names + values):
  // in_flag, in_fdate, in_tdate, in_course_id, in_exam_id,
  // in_regulation_id, in_subject_id, in_evalutor_profileid
  const data = await crud.getAllRecords<unknown>(
    EXAM_EVAL_API.EVALUATION_DETAIL_REPORT,
    {
      in_flag: flag,
      in_fdate: "1900-01-01",
      in_tdate: "1900-01-01",
      in_course_id: params.courseId,
      in_exam_id: params.examId,
      in_regulation_id: params.regulationId,
      in_subject_id: params.subjectId,
      in_evalutor_profileid: params.evaluatorProfileId,
    },
  );

  const rows = extractProcRows(data);
  // Angular: evaluatedReport.filter(x => x.no_of_students_assigned !== 0)
  return rows.filter((r) => r.no_of_students_assigned !== 0);
}

/**
 * Normalize stored-proc payloads used by Angular `result.data.result[0]`.
 * Handles: `{ result: [[rows]] }`, `{ result: [rows] }`, raw `[[rows]]`, `{ resultList }`.
 */
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
