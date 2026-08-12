"use client";

import { ExamBundleScanningChildReportPage } from "../_components/ExamBundleScanningChildReportPage";

/** Angular: admin-exam-reports/bundle-tracking-status-report — in_flag=scan_papers_summary */
export default function BundleTrackingStatusReportPage() {
  return (
    <ExamBundleScanningChildReportPage
      title="Bundle Tracking Status Report"
      inFlag="scan_papers_summary"
      excelFileName="Bundle_Tracking_Status_report.xlsx"
    />
  );
}
