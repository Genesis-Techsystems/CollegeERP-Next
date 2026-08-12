/**
 * Exam Bundle Scanning child reports.
 * Angular: examination/exam-reports/{bundle-scanning-report|…}
 * Data: CONSTANTS.getBundleWiseScanning → s_get_bundle_wise_scanning_report_summary
 * Filters: CONSTANTS.getCollegeExamCenters → s_get_exam_center_bycode (via getExamCenterFilterGroups)
 */

import { getAllRecords } from "@/services/crud";
import { UNIV_EXAM_CENTER_API } from "@/config/constants/api";

type AnyRow = Record<string, unknown>;

export type BundleScanningReportFlag =
  | "scan_papers_summary"
  | "answerscript_details"
  | "scan_bundle_papers_summary";

function isNoRecordsProcError(error: unknown): boolean {
  const msg = String(error instanceof Error ? error.message : (error ?? ""));
  return msg.toLowerCase().includes("no record");
}

/**
 * Angular getScanBundles → getBundleWiseScanning
 * GET getAllRecords/s_get_bundle_wise_scanning_report_summary?...
 * Rows = result[0]
 */
export async function getBundleWiseScanningReport(params: {
  inFlag: BundleScanningReportFlag;
  examGroupId: number;
  examCenterId: number;
  examDate: string;
  questionPaperCode: string;
}): Promise<AnyRow[]> {
  const examDate =
    !params.examDate || params.examDate === "0"
      ? "1900-01-01"
      : params.examDate;
  const questionPaperCode =
    !params.questionPaperCode || params.questionPaperCode === "0"
      ? ""
      : params.questionPaperCode;

  try {
    const data = await getAllRecords<{ result?: unknown }>(
      UNIV_EXAM_CENTER_API.BUNDLE_WISE_SCANNING_REPORT,
      {
        in_flag: params.inFlag,
        in_univ_exam_group_id: params.examGroupId || 0,
        in_univ_ec_id: params.examCenterId || 0,
        in_course_year_id: 0,
        in_regulation_id: 0,
        in_subject_id: 0,
        in_exam_date: examDate,
        in_questionpaper_code: questionPaperCode,
        in_scan_bundle_id: 0,
        in_omr_serial_no: 0,
      },
    );
    const raw = data?.result;
    if (!Array.isArray(raw)) return [];
    const first = raw[0];
    if (Array.isArray(first)) {
      return first.filter((r): r is AnyRow => !!r && typeof r === "object");
    }
    if (first && typeof first === "object") return [first as AnyRow];
    return [];
  } catch (error: unknown) {
    if (isNoRecordsProcError(error)) return [];
    throw error;
  }
}
