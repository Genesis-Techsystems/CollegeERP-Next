"use client";

import { QK } from "@/lib/query-keys";
import { fetchFeeParticularWiseReport } from "@/services";
import { DynamicCollegeCourseFeeReportPage } from "../_components/DynamicCollegeCourseFeeReportPage";

/** Angular `fee-reports/fee-particular-wise-report` → Fee Particular Wise Report. */
export default function FeeParticularWiseReportPage() {
  return (
    <DynamicCollegeCourseFeeReportPage
      title="Fee Particular Wise Report"
      filterQueryKey="FeeParticularWiseReport"
      queryKey={QK.feeParticularWiseReport}
      fetchRows={fetchFeeParticularWiseReport}
    />
  );
}
