"use client";

import { GroupWiseResultSheetsPage } from "@/app/(pages)/(protected)/admin-examination-management/admin-exam-reports/_components/GroupWiseResultSheetsPage";

/** Angular `reports/admin-exam-reports/group-wise-passed-result-sheets` */
export default function GroupWisePassedResultSheetsPage() {
  return (
    <GroupWiseResultSheetsPage
      resultStatus="Passed"
      title="Group Wise Passed Result Sheets"
    />
  );
}
