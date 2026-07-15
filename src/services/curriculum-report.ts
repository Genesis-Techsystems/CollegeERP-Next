/**
 * University Curriculum Report
 * (Angular: exam-reports/curriculum-report).
 */

import { crud } from "@/services/crud";
import { EXAM_API } from "@/config/constants/api";
import { getMarksSetupFilters } from "@/services/examination";

type AnyRow = Record<string, unknown>;
type ProcRows = AnyRow[];

/**
 * Angular getFiltersList → s_get_collegewisedetails_bycode (clg_filters)
 * returns college/course/group/year cascade + regulations.
 */
export async function getCurriculumReportFilters(params: {
  organizationId: number;
  employeeId: number;
}): Promise<{
  filtersData: ProcRows;
  regulationData: ProcRows;
}> {
  const result = await getMarksSetupFilters(
    params.organizationId || 0,
    params.employeeId || 0,
  );
  return {
    filtersData: (result.filtersData ?? []) as ProcRows,
    regulationData: (result.regulationData ?? []) as ProcRows,
  };
}

/**
 * Angular getDetails → getAllRecords/curriculum_report
 * flag: reg_univ_curriculum
 */
export async function getCurriculumReportList(params: {
  collegeId: number;
  courseId: number;
  courseGroupId: number;
  courseYearId: number;
  regulationId: number;
}): Promise<ProcRows> {
  if (!params.collegeId || !params.courseId) return [];

  const data = await crud
    .getAllRecords<{ result: ProcRows[] }>(EXAM_API.CURRICULUM_REPORT, {
      in_flag: "reg_univ_curriculum",
      in_university_id: 0,
      in_college_id: params.collegeId,
      in_course_id: params.courseId,
      in_course_group_id: params.courseGroupId || 0,
      in_course_year_id: params.courseYearId || 0,
      in_regulation_id: params.regulationId || 0,
      in_academic_year_id: 0,
      in_batch_id: 0,
    })
    .catch(() => ({ result: [] as ProcRows[] }));

  const group = data?.result?.[0];
  return Array.isArray(group) ? group : [];
}

/** Angular builds columns from Object.keys(firstRow). */
export function buildCurriculumDisplayColumnKeys(rows: ProcRows): string[] {
  if (!rows.length) return [];
  return Object.keys(rows[0]).filter((k) => k !== "__rid");
}
