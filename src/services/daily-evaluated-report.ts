/**
 * Daily Evaluated Report (Angular: exam-reports/daily-evaluated-report).
 */

import { crud } from "@/services/crud";
import { EXAM_EVAL_API } from "@/config/constants/api";
import { txt } from "@/common/utils/data-helpers";
import {
  getEvalReportBaseFilters,
  getEvalReportSubjectRows,
} from "@/services/exam-evaluation-report";
import { getBankCopyEvaluators } from "@/services/evaluators-bank-copy-report";

export { getEvalReportBaseFilters as getDailyEvalBaseFilters };
export { getEvalReportSubjectRows as getDailyEvalSubjectRows };
export { getBankCopyEvaluators as getDailyEvalEvaluators };

type AnyRow = Record<string, unknown>;
type ProcRows = AnyRow[];

/**
 * Angular getList / getStudentsList:
 *   evaluatedReport = result.data.result[0]
 *   studentsList = result.data.result[0]
 *
 * Spring/MySQL multi-result payloads usually look like `{ result: [[rows]] }`.
 * Some proxies flatten one level or nest an extra wrapper — unwrap until we
 * find an array of row objects (prefer rows with evaluator_name).
 */
function coerceRowGroup(node: unknown): ProcRows {
  if (!Array.isArray(node) || node.length === 0) return [];

  // Flat array of row objects
  if (
    node[0] != null &&
    typeof node[0] === "object" &&
    !Array.isArray(node[0])
  ) {
    return node.filter(
      (r): r is AnyRow => r != null && typeof r === "object" && !Array.isArray(r),
    );
  }

  // Nested groups — Angular takes [0]; also scan later groups if [0] is empty
  if (Array.isArray(node[0])) {
    for (const group of node) {
      const rows = coerceRowGroup(group);
      if (!rows.length) continue;
      // Prefer report-shaped rows when several groups exist
      if (
        rows.some(
          (r) =>
            "evaluator_name" in r ||
            "no_of_students_assigned" in r ||
            "omr_serial_no" in r,
        )
      ) {
        return rows;
      }
    }
    // Fallback: first non-empty object group
    for (const group of node) {
      const rows = coerceRowGroup(group);
      if (rows.length) return rows;
    }
  }

  return [];
}

/** Angular: `result.data.result[0]` — `getAllRecords` already returns `body.data`. */
function extractAngularResult0(data: unknown): ProcRows {
  if (data == null) return [];

  if (Array.isArray(data)) {
    return coerceRowGroup(data);
  }

  if (typeof data === "object") {
    const obj = data as { result?: unknown; resultList?: unknown };
    if (obj.result != null) {
      const fromResult = coerceRowGroup(
        Array.isArray(obj.result) ? obj.result : [obj.result],
      );
      if (fromResult.length) return fromResult;
    }
    if (Array.isArray(obj.resultList)) {
      return coerceRowGroup(obj.resultList);
    }
  }

  return [];
}

/**
 * Angular getList → s_get_evaluators_bank_copy_report
 * flags: day_wise_report | day_wise_report_re_evaluation
 * Table rows = result.data.result[0] (evaluator_name, subject_code, email,
 * no_of_students_assigned, no_of_evaluations_completed, …)
 */
export async function getDailyEvaluatedReport(params: {
  examId: number;
  subjectId: number;
  evaluatorProfileId: number;
  fromDate: string;
  toDate: string;
  isReevaluation: boolean;
}): Promise<ProcRows> {
  const flag = params.isReevaluation
    ? "day_wise_report_re_evaluation"
    : "day_wise_report";
  const data = await crud.getAllRecords<unknown>(
    EXAM_EVAL_API.EVALUATORS_BANK_COPY_REPORT,
    {
      in_flag: flag,
      in_exam_id: params.examId,
      in_fdate: params.fromDate,
      in_tdate: params.toDate,
      in_exam_month_yr: "",
      in_subject_id: params.subjectId,
      in_evalutor_profileid: params.evaluatorProfileId,
      in_exam_date: "1990-01-01",
      in_emp_id: 0,
      in_questionpaper_id: 0,
      in_evaluator_role_id: 0,
      in_academic_year: "",
      in_exam_short_name: "",
      in_affiliatedto_catdet_id: 1,
    },
  );
  return extractAngularResult0(data);
}

/**
 * Angular getStudentsList → same proc, student_list | student_list_re_evaluation
 * Used for Assigned / Evaluated drill-down + Print Answer Sheets.
 */
export async function getDailyEvaluatedStudentList(params: {
  examId: number;
  subjectId: number;
  evaluatorProfileId: number;
  fromDate: string;
  toDate: string;
  isReevaluation: boolean;
}): Promise<ProcRows> {
  const flag = params.isReevaluation
    ? "student_list_re_evaluation"
    : "student_list";
  const data = await crud.getAllRecords<unknown>(
    EXAM_EVAL_API.EVALUATORS_BANK_COPY_REPORT,
    {
      in_flag: flag,
      in_fdate: params.fromDate,
      in_tdate: params.toDate,
      in_exam_month_yr: "",
      in_exam_id: params.examId,
      in_subject_id: params.subjectId,
      in_evalutor_profileid: params.evaluatorProfileId,
      in_exam_date: "1990-01-01",
      in_emp_id: 0,
      in_questionpaper_id: 0,
      in_evaluator_role_id: 0,
      in_academic_year: "",
      in_exam_short_name: "",
      in_affiliatedto_catdet_id: 1,
    },
  );
  return extractAngularResult0(data);
}

export function filterStudentsForEvaluator(
  students: ProcRows,
  evaluatorProfileId: number,
  mode: "assigned" | "completed",
): ProcRows {
  return students.filter((x) => {
    // Angular: x.fk_exam_evaluator_profile_id === row.fk_exam_evaluator_profile_id
    if (Number(x.fk_exam_evaluator_profile_id) !== evaluatorProfileId) {
      return false;
    }
    if (mode === "completed") {
      // Angular CompletedList: evaluated_totalmarks != null
      return x.evaluated_totalmarks != null;
    }
    return true;
  });
}
