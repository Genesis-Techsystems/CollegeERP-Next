"use client";

import { ExamBundleScanningChildReportPage } from "../_components/ExamBundleScanningChildReportPage";

/** Angular: admin-exam-reports/bundle-scanning-report — in_flag=scan_papers_summary */
export default function BundleScanningReportPage() {
  return (
    <ExamBundleScanningChildReportPage
      title="Bundle Scanning Report"
      inFlag="scan_papers_summary"
      excelFileName="Bundle_Scan_Report.xlsx"
    />
  );
}
