"use client";

import { ExamBundleScanningChildReportPage } from "../_components/ExamBundleScanningChildReportPage";

/** Angular: admin-exam-reports/scan-file-track-report — in_flag=answerscript_details */
export default function ScanFileTrackReportPage() {
  return (
    <ExamBundleScanningChildReportPage
      title="Scan File Track Report"
      inFlag="answerscript_details"
      excelFileName="Scan_File_Track_Report.xlsx"
    />
  );
}
