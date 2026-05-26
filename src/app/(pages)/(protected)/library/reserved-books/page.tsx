'use client'

import { LibraryGridPage } from '../_components/LibraryGridPage'
import { LIB_COL } from '../_lib/library-columns'
import { QK } from '@/lib/query-keys'
import { listReservedBooks } from '@/services'

export default function ReservedBooksPage() {
  return (
    <LibraryGridPage
      title="Reserved Books"
      queryKey={QK.library.reservedBooks()}
      queryFn={listReservedBooks}
      columns={[
        LIB_COL.accessionno,
        LIB_COL.bookTitle,
        LIB_COL.bookAuthor,
        LIB_COL.bookregTypeCode,
        LIB_COL.availabilityStatus,
      ]}
      searchPlaceholder="Search reserved books…"
    />
  )
}
