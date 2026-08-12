"use client";

import { ExamBundleScanningChildReportPage } from "../_components/ExamBundleScanningChildReportPage";

/** Angular: admin-exam-reports/exam-wise-scaning-summary-report — in_flag=scan_papers_summary */
export default function ExamWiseScaningSummaryReportPage() {
  return (
    <ExamBundleScanningChildReportPage
      title="Exam Wise Scanning Summary Report"
      inFlag="scan_papers_summary"
      excelFileName="Exam_Wise_Scanning_Summary_Report.xlsx"
    />
  );
}
