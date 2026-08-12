"use client";

import { ExamBundleScanningChildReportPage } from "../_components/ExamBundleScanningChildReportPage";

/** Angular: admin-exam-reports/scan-logs-report — in_flag=scan_papers_summary */
export default function ScanLogsReportPage() {
  return (
    <ExamBundleScanningChildReportPage
      title="Scan Logs Report"
      inFlag="scan_papers_summary"
      excelFileName="Scan_Logs_Report.xlsx"
    />
  );
}
