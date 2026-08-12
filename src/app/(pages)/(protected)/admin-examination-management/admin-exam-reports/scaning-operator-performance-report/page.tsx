"use client";

import { ExamBundleScanningChildReportPage } from "../_components/ExamBundleScanningChildReportPage";

/** Angular: admin-exam-reports/scaning-operator-performance-report — in_flag=scan_papers_summary */
export default function ScaningOperatorPerformanceReportPage() {
  return (
    <ExamBundleScanningChildReportPage
      title="Scanning Operator Performance Report"
      inFlag="scan_papers_summary"
      excelFileName="Scanning Operator Performance Report.xlsx"
    />
  );
}
