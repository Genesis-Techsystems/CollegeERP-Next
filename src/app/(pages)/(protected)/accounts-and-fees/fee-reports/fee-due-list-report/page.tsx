"use client";

import { QK } from "@/lib/query-keys";
import { fetchFeeDueListReport } from "@/services";
import { DynamicCollegeCourseFeeReportPage } from "../_components/DynamicCollegeCourseFeeReportPage";

/** Angular `fee-reports/fee-due-list-report` → Fee Due List Report. */
export default function FeeDueListReportPage() {
  return (
    <DynamicCollegeCourseFeeReportPage
      title="Fee Due List Report"
      filterQueryKey="FeeDueListReport"
      queryKey={QK.feeDueListReport}
      fetchRows={fetchFeeDueListReport}
    />
  );
}
