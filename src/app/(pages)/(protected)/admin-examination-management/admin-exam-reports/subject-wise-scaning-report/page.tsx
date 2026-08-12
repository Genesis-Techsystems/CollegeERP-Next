"use client";

import { ExamBundleScanningChildReportPage } from "../_components/ExamBundleScanningChildReportPage";

/** Angular: admin-exam-reports/subject-wise-scaning-report — in_flag=scan_papers_summary */
export default function SubjectWiseScaningReportPage() {
  return (
    <ExamBundleScanningChildReportPage
      title="Subject Wise Scanning Report"
      inFlag="scan_papers_summary"
      excelFileName="Subject_Wise_Scanning_Report.xlsx"
    />
  );
}
