'use client'

import { LibraryGridPage } from '../_components/LibraryGridPage'
import { LIB_COL } from '../_lib/library-columns'
import { QK } from '@/lib/query-keys'
import { listLibraryPeriodicals } from '@/services'

export default function PeriodicalsPage() {
  return (
    <LibraryGridPage
      title="Periodicals"
      queryKey={QK.library.periodicals()}
      queryFn={listLibraryPeriodicals}
      columns={[LIB_COL.periodicalName, LIB_COL.periodicalCode, LIB_COL.libraryCode, LIB_COL.isActive]}
      searchPlaceholder="Search periodicals…"
    />
  )
}
