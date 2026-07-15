/**
 * Answer Paper Bags Report
 * (Angular: exam-reports/examcenter-answerpaper-bags-report).
 */

import { buildQuery, domainList } from "@/services/crud";
import { UNIV_EXAM_CENTER_API } from "@/config/constants/api";
import { listAllActiveUnivExamBags } from "@/services/exam-papers-delivery";

type AnyRow = Record<string, unknown>;
type ProcRows = AnyRow[];

/** Angular getExamBags → listDetailsById(UnivExamBags, isActive) */
export async function getAnswerPaperBagsReportExamBags(): Promise<ProcRows> {
  return listAllActiveUnivExamBags();
}

/**
 * Angular getList → listDetailsByTwoIds(UnivExamAnswerPaperBags):
 *
 *   univExamBags.univExamBagId=={univExamBagId}
 *   .and.isActive==true
 */
export async function getAnswerPaperBagsReportList(params: {
  univExamBagId: number;
}): Promise<ProcRows> {
  if (!params.univExamBagId) return [];

  const query = buildQuery({
    "univExamBags.univExamBagId": params.univExamBagId,
    isActive: true,
  });

  try {
    return await domainList<AnyRow>(
      UNIV_EXAM_CENTER_API.ANSWER_PAPER_BAGS,
      query,
    );
  } catch {
    return [];
  }
}
