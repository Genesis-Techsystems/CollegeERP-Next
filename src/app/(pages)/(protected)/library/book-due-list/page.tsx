'use client'

import { LibraryGridPage } from '../_components/LibraryGridPage'
import { LIB_COL } from '../_lib/library-columns'
import { QK } from '@/lib/query-keys'
import { listBooksDue } from '@/services'

export default function BookDueListPage() {
  return (
    <LibraryGridPage
      title="Books Due List"
      queryKey={QK.library.bookDueList(0)}
      queryFn={() => listBooksDue(0, 50)}
      columns={[
        LIB_COL.memberCode,
        LIB_COL.libMember,
        LIB_COL.libraryCode,
        LIB_COL.bookTitle,
        LIB_COL.accessionno,
        LIB_COL.issueTodate,
        LIB_COL.delyDays,
      ]}
      searchPlaceholder="Search due list…"
      emptyMessage="No overdue books found."
    />
  )
}
