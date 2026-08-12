"use client";

import { ExamBundleScanningChildReportPage } from "../_components/ExamBundleScanningChildReportPage";

/** Angular: admin-exam-reports/scan-bundle-papers-summary-report — in_flag=scan_bundle_papers_summary */
export default function ScanBundlePapersSummaryReportPage() {
  return (
    <ExamBundleScanningChildReportPage
      title="Scan Bundle Papers Summary Report"
      inFlag="scan_bundle_papers_summary"
      excelFileName="Scan_Bundle_Papers_Summary_Report.xlsx"
    />
  );
}
