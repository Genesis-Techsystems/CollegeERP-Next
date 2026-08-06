"use client";

import { QK } from "@/lib/query-keys";
import { fetchFeeCollectionReport } from "@/services";
import { DynamicCollegeCourseFeeReportPage } from "../_components/DynamicCollegeCourseFeeReportPage";

/** Angular `fee-reports/collections-report` → Collections Report. */
export default function CollectionsReportPage() {
  return (
    <DynamicCollegeCourseFeeReportPage
      title="Collections Report"
      filterQueryKey="CollectionsReport"
      queryKey={QK.feeCollectionReport}
      fetchRows={fetchFeeCollectionReport}
    />
  );
}
