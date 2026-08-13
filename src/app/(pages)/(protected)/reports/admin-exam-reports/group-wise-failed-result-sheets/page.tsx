"use client";

import { GroupWiseResultSheetsPage } from "@/app/(pages)/(protected)/admin-examination-management/admin-exam-reports/_components/GroupWiseResultSheetsPage";

/** Angular `reports/admin-exam-reports/group-wise-failed-result-sheets` */
export default function GroupWiseFailedResultSheetsPage() {
  return (
    <GroupWiseResultSheetsPage
      // Angular branch-wise-failed-result-sheets filters ResultStatus == 'Promoted'
      resultStatus="Promoted"
      title="Group Wise Failed Result Sheets"
    />
  );
}
