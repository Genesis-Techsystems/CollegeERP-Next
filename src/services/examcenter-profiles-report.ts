/**
 * Exam Center Profiles Report
 * (Angular: exam-reports/examcenter-profiles-report).
 */

import {
  listAllActiveUnivExamCenters,
  listUnivEcProfilesByCenterAndRole,
} from "@/services/exam-papers-delivery";

type AnyRow = Record<string, unknown>;
type ProcRows = AnyRow[];

/** Angular getData → listDetailsById(UnivExamCenters, isActive) */
export async function getExamCenterProfilesReportCenters(): Promise<ProcRows> {
  return listAllActiveUnivExamCenters();
}

/**
 * Angular getEvaluationList → listDetailsByThreeIds(UnivEcProfiles):
 *
 *   univExamCenters.univExamcenterId=={centerId}
 *   .and.profileRole.roleId=={roleId}
 *   .and.isActive==true
 */
export async function getExamCenterProfilesReportList(params: {
  univExamcenterId: number;
  profileRoleId: number;
}): Promise<ProcRows> {
  return listUnivEcProfilesByCenterAndRole(
    params.univExamcenterId,
    params.profileRoleId,
  );
}
