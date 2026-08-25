/**
 * Exam Center Colleges Report
 * (Angular: exam-reports/examcenter-colleges-report).
 */

import { UNIV_EXAM_CENTER_API } from "@/config/constants/api";
import { buildQuery, domainList } from "@/services/crud";
import {
  getExamTimetableFilterRows,
  listAllActiveUnivExamCenters,
} from "@/services/exam-papers-delivery";

type AnyRow = Record<string, unknown>;
type ProcRows = AnyRow[];

/** Angular getFiltersList → s_get_collegewisedetails_bycode + clg_exam_timetable_filters */
export async function getExamCenterCollegesReportFilters(params: {
  organizationId: number;
  employeeId: number;
}): Promise<ProcRows> {
  return getExamTimetableFilterRows(params);
}

/** Angular selectedExam → listDetailsById(UnivExamCenters, isActive==true) */
export async function getExamCenterCollegesReportCenters(): Promise<ProcRows> {
  return listAllActiveUnivExamCenters();
}

/**
 * Angular getexamCenterColleges → listDetailsByThreeIds(UnivEcColleges,
 * univExamcenterId, examId, true,
 * 'univExamCenters.univExamcenterId', 'examMaster.examId', 'isActive')
 *
 * Exact Angular query (no sort) — do not swallow errors.
 */
export async function getExamCenterCollegesReportList(params: {
  univExamcenterId: number;
  examId: number;
}): Promise<ProcRows> {
  if (!params.univExamcenterId || !params.examId) return [];
  return domainList<AnyRow>(
    UNIV_EXAM_CENTER_API.EC_COLLEGES,
    buildQuery({
      "univExamCenters.univExamcenterId": params.univExamcenterId,
      "examMaster.examId": params.examId,
      isActive: true,
    }),
  );
}
