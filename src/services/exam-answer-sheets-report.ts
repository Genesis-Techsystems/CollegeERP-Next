/**
 * Exam Answer Sheets Upload Report
 * (Angular: exam-reports/exam-answer-sheets-report).
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

/** Angular getFiltersList: univ_exam_filters + REGSUP */
export async function getAnswerSheetsBaseFilters(
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
 * Angular getList → getAnswerPaperUploadUrl
 * flag: exam_timetable_answerpaper_details
 * Table rows = result.data.result[2]
 */
export async function getExamAnswerSheetsReport(params: {
  organizationId: number;
  examId: number;
  examTimetableId: number;
  examDate: string;
}): Promise<ProcRows> {
  const data = await crud.getAllRecords<{ result?: ProcRows[] }>(
    EXAM_EVAL_API.ANSWER_PAPER_UPLOAD_DETAILS,
    {
      in_flag: "exam_timetable_answerpaper_details",
      in_org_id: params.organizationId || 1,
      in_college_id: 0,
      in_academic_year_id: 0,
      in_isadmin: 0,
      in_exam_id: params.examId,
      in_timetable_id: params.examTimetableId,
      in_exam_date: params.examDate || "1991-01-01",
      in_subject_id: 0,
      in_loginuser_empid: 0,
      in_loginuser_roleid: 0,
    },
  );

  const groups = data?.result;
  if (!Array.isArray(groups)) return [];
  const third = groups[2];
  return Array.isArray(third) ? third : [];
}
