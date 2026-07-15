/**
 * Exam Center Colleges Report
 * (Angular: exam-reports/examcenter-colleges-report).
 */

import {
  getExamTimetableFilterRows,
  listAllActiveUnivExamCenters,
  listUnivEcCollegesByCenterAndExam,
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

/** Angular selectedExam → listDetailsById(UnivExamCenters, isActive) */
export async function getExamCenterCollegesReportCenters(): Promise<ProcRows> {
  return listAllActiveUnivExamCenters();
}

/**
 * Angular getexamCenterColleges → listDetailsByThreeIds(UnivEcColleges,
 * univExamcenterId, examId, isActive).
 */
export async function getExamCenterCollegesReportList(params: {
  univExamcenterId: number;
  examId: number;
}): Promise<ProcRows> {
  return listUnivEcCollegesByCenterAndExam(
    params.univExamcenterId,
    params.examId,
  );
}
