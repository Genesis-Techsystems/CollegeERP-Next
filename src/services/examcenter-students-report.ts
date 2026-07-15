/**
 * Exam Center Students Report
 * (Angular: exam-reports/examcenter-students-report).
 */

import { crud, buildQuery, domainList } from "@/services/crud";
import { EXAM_EVAL_API, UNIV_EXAM_CENTER_API } from "@/config/constants/api";
import { listAllActiveUnivExamCenters } from "@/services/exam-papers-delivery";
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

/**
 * Angular getFiltersList → getExamEvaluationCodesUrl
 * flag: list_exam_subjects
 * Rows use fk_course_ids / pk_academic_year_id / pk_exam_id.
 */
export async function getExamCenterStudentsReportFilters(params: {
  organizationId: number;
  employeeId: number;
}): Promise<ProcRows> {
  const data = await crud
    .getAllRecords<{ result: ProcRows[] }>(EXAM_EVAL_API.EVALUATION_BYCODES, {
      in_flag: "list_exam_subjects",
      in_orgid: params.organizationId || 0,
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
      in_exam_id: 0,
      in_course_year_id: 0,
      in_subject_id: 0,
      in_regulation_id: 0,
      in_course_id: 0,
      in_academic_year_id: 0,
      in_loginuser_empid: params.employeeId || 0,
    })
    .catch(() => ({ result: [] as ProcRows[] }));

  return firstGroupByFlag(data?.result ?? [], ["list_exam_subjects"]);
}

/** Angular selectedSubject → UnivExamCenters isActive */
export async function getExamCenterStudentsReportCenters(): Promise<ProcRows> {
  return listAllActiveUnivExamCenters();
}

/**
 * Angular getCenterStudents → listDetailsByFourIds(UnivEcStudents):
 *
 *   query=
 *     univExamCenters.univExamcenterId=={centerId}
 *     .and.examMaster.examId=={examId}
 *     .and.subject.subjectId=={subjectId}
 *     .and.isActive==true
 */
export async function getExamCenterStudentsReportList(params: {
  univExamcenterId: number;
  examId: number;
  subjectId: number;
}): Promise<ProcRows> {
  if (!params.univExamcenterId || !params.examId || !params.subjectId) {
    return [];
  }

  const query = buildQuery({
    "univExamCenters.univExamcenterId": params.univExamcenterId,
    "examMaster.examId": params.examId,
    "subject.subjectId": params.subjectId,
    isActive: true,
  });

  try {
    return await domainList<AnyRow>(UNIV_EXAM_CENTER_API.EC_STUDENTS, query);
  } catch {
    return [];
  }
}
