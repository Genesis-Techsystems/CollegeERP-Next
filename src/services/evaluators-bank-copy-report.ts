/**
 * Evaluators Bank Copy Report (Angular: exam-reports/evaluators-bank-copy-report).
 */

import { crud } from "@/services/crud";
import { EXAM_API, EXAM_EVAL_API } from "@/config/constants/api";
import { txt } from "@/common/utils/data-helpers";

/** Local only — do not export (conflicts with `pre-examination` AnyRow in barrel). */
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
export async function getBankCopyBaseFilters(
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

/** Angular selectedExam: univ_exam_rest_no_tt + ALL → rest filters + regulations */
export async function getBankCopyRestAndRegulations(params: {
  courseId: number;
  academicYearId: number;
  examId: number;
  employeeId: number;
}): Promise<{ colleges: ProcRows; regulations: ProcRows }> {
  const data = await crud
    .getAllRecords<{ result: ProcRows[] }>("s_get_exam_filters_bycode", {
      in_flag: "univ_exam_rest_no_tt",
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
  const groups = data?.result ?? [];
  return {
    colleges: firstGroupByFlag(groups, ["univ_exam_rest_filters"]),
    regulations: firstGroupByFlag(groups, ["regulations"]),
  };
}

/** Angular selectedRegulation: univ_exam_subject_uc → univ_exam_sub_uc */
export async function getBankCopySubjects(params: {
  collegeId: number;
  courseId: number;
  courseGroupId: number;
  courseYearId: number;
  examId: number;
  academicYearId: number;
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

/** Angular selectedsubject: filter_univexam_evaluator_moderator → evaluator_list */
export async function getBankCopyEvaluators(params: {
  organizationId: number;
  examId: number;
  courseYearId: number;
  subjectId: number;
  regulationId: number;
  courseId: number;
  academicYearId: number;
  employeeId: number;
}): Promise<ProcRows> {
  const data = await crud
    .getAllRecords<{ result: ProcRows[] }>("s_get_examevaluation_bycodes", {
      in_flag: "filter_univexam_evaluator_moderator",
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
      in_regulation_id: params.regulationId,
      in_course_id: params.courseId,
      in_academic_year_id: params.academicYearId,
      in_loginuser_empid: params.employeeId || 0,
    })
    .catch(() => ({ result: [] }));
  return firstGroupByFlag(data?.result ?? [], ["evaluator_list"]);
}

/** Angular getList → s_get_evaluators_bank_copy_report */
export async function getEvaluatorsBankCopyReport(params: {
  examId: number;
  subjectId: number;
  evaluatorProfileId: number;
  isReevaluation: boolean;
}): Promise<ProcRows> {
  const flag = params.isReevaluation
    ? "re_evaluator_remuneration"
    : "evaluator_remuneration";
  const data = await crud
    .getAllRecords<{ result: ProcRows[] }>(
      EXAM_EVAL_API.EVALUATORS_BANK_COPY_REPORT,
      {
        in_flag: flag,
        in_fdate: "1990-01-01",
        in_tdate: "1990-01-01",
        in_exam_month_yr: "1990-01-01",
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
    )
    .catch(() => ({ result: [] }));
  return Array.isArray(data?.result?.[0]) ? data.result[0] : [];
}

export type BankCopySubjectLine = {
  subject_code: string;
  subject_name: string;
  no_of_evaluations_completed: number;
  amount: number;
  final_amount: number;
};

export type BankCopyProfileReport = AnyRow & {
  subjects: BankCopySubjectLine[];
  assigned_scripts: number;
  total_scripts: number;
  total_amount: number;
  total_final_amount: number;
};

/** Angular getList grouping by fk_exam_evaluator_profile_id */
export function groupBankCopyByEvaluatorProfile(
  rows: ProcRows,
): BankCopyProfileReport[] {
  const map: Record<string, BankCopyProfileReport> = {};
  for (const item of rows) {
    const key = String(item.fk_exam_evaluator_profile_id ?? "");
    if (!key) continue;
    if (!map[key]) {
      map[key] = {
        ...item,
        // Keep first-row rate for Angular print note `report.amount`
        amount: Number(item.amount) || 0,
        subjects: [],
        assigned_scripts: 0,
        total_scripts: 0,
        total_amount: 0,
        final_amount: 0,
        total_final_amount: 0,
      };
    }
    map[key].subjects.push({
      subject_code: txt(item.subject_code),
      subject_name: txt(item.subject_name),
      no_of_evaluations_completed:
        Number(item.no_of_evaluations_completed) || 0,
      amount: Number(item.amount) || 0,
      final_amount: Number(item.final_amount) || 0,
    });
    map[key].assigned_scripts += Number(item.no_of_students_assigned) || 0;
    map[key].total_scripts += Number(item.no_of_evaluations_completed) || 0;
    map[key].total_amount += Number(item.amount) || 0;
    map[key].total_final_amount += Number(item.final_amount) || 0;
  }
  return Object.values(map);
}
