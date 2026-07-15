'use client'

import { GroupWiseResultSheetsPage } from '../_components/GroupWiseResultSheetsPage'

export default function GroupWiseFailedResultSheetsPage() {
  return (
    <GroupWiseResultSheetsPage
      // Angular branch-wise-failed-result-sheets filters ResultStatus == 'Promoted'
      resultStatus="Promoted"
      title="Group Wise Failed Result Sheets"
    />
  )
}
