'use client'

import { useCallback, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ColDef } from 'ag-grid-community'
import { DataTable, TableCard } from '@/common/components/table'
import { Select, type SelectOption } from '@/common/components/select'
import { EmptyState } from '@/common/components/feedback'
import { Label } from '@/components/ui/label'
import { useSessionContext } from '@/context/SessionContext'
import { getErrorMessage } from '@/lib/errors'
import { toastError } from '@/lib/toast'
import {
  getLibraryBookDetailById,
  listBookDetailsByBookId,
  searchLibraryBookDetails,
} from '@/services'
import type { LibraryRow } from '@/services'
import { LibraryScreenShell } from '../_components/LibraryScreenShell'
import { LIB_COL } from '../_lib/library-columns'

function bookOptionLabel(b: LibraryRow): string {
  const acc = String(b.accessionno ?? b.accessionNo ?? '').trim()
  const title = String(b.bookTitle ?? b.title ?? '').trim()
  if (acc && title) return `(${acc}) ${title}`
  if (acc) return `(${acc})`
  return title || 'Book'
}

function bookOptionValue(b: LibraryRow): string {
  return String(b.bookDetailsId ?? b.bookDetailId ?? b.bookId ?? '')
}

async function loadBookSearchResults(book: LibraryRow): Promise<LibraryRow[]> {
  const bookId = Number(book.bookId ?? 0)
  const detailsId = Number(book.bookDetailsId ?? book.bookDetailId ?? 0)

  if (bookId > 0) {
    const copies = await listBookDetailsByBookId(bookId)
    if (copies.length > 0) return copies
  }

  if (detailsId > 0) {
    const one = await getLibraryBookDetailById(detailsId)
    return one ? [one] : []
  }

  return [book]
}

export default function BooksSearchPage() {
  const { user } = useSessionContext()

  const [bookRows, setBookRows] = useState<LibraryRow[]>([])
  const [bookOptions, setBookOptions] = useState<SelectOption[]>([])
  const [selectedBookKey, setSelectedBookKey] = useState<string | null>(null)
  const [selectedBook, setSelectedBook] = useState<LibraryRow | null>(null)
  const [bookSearchLoading, setBookSearchLoading] = useState(false)

  const {
    data: tableRows = [],
    isLoading: loadingDetails,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['Library', 'booksSearch', selectedBookKey, selectedBook?.bookId, selectedBook?.bookDetailsId],
    queryFn: () => (selectedBook ? loadBookSearchResults(selectedBook) : Promise.resolve([])),
    enabled: selectedBook != null,
  })

  const columnDefs = useMemo<ColDef<LibraryRow>[]>(
    () => [
      LIB_COL.accessionno,
      LIB_COL.bookTitle,
      LIB_COL.bookAuthor,
      LIB_COL.libraryCode,
      LIB_COL.shelveName,
      LIB_COL.bookPosition,
      LIB_COL.barcode,
      LIB_COL.availabilityStatus,
    ],
    [],
  )

  const onBookSearch = useCallback(
    async (term: string) => {
      const q = term.trim()
      if (q.length < 2) {
        setBookRows([])
        setBookOptions([])
        return
      }
      setBookSearchLoading(true)
      try {
        const libraryId = Number(user?.libraryId ?? 0)
        const rows = await searchLibraryBookDetails(q, libraryId > 0 ? libraryId : undefined)
        setBookRows(rows)
        setBookOptions(
          rows.map((b) => ({
            value: bookOptionValue(b),
            label: bookOptionLabel(b),
          })),
        )
      } catch (e) {
        toastError(e, 'Book search failed')
        setBookRows([])
        setBookOptions([])
      } finally {
        setBookSearchLoading(false)
      }
    },
    [user?.libraryId],
  )

  function handleBookChange(value: string | null) {
    setSelectedBookKey(value)
    if (!value) {
      setSelectedBook(null)
      return
    }
    const picked = bookRows.find((b) => bookOptionValue(b) === value)
    if (picked) setSelectedBook(picked)
  }

  return (
    <LibraryScreenShell title="Books Search">
      <div className="app-card space-y-4 p-4">
        <div className="max-w-xl space-y-2">
          <Label className="text-[13px]">Book Search</Label>
          <Select
            value={selectedBookKey}
            onChange={handleBookChange}
            options={bookOptions}
            placeholder="Book title or accession no."
            searchable
            onSearch={(t) => void onBookSearch(t)}
            isLoading={bookSearchLoading}
            clearable
            className="w-full"
          />
        </div>

        {selectedBook && isError ? (
          <EmptyState
            title="Could not load book details"
            description={getErrorMessage(error)}
            action={{ label: 'Retry', onClick: () => void refetch() }}
          />
        ) : selectedBook ? (
          <TableCard withHeaderBorder={false}>
            <DataTable
              rowData={tableRows}
              columnDefs={columnDefs}
              loading={loadingDetails}
              pagination
              toolbar={{
                search: true,
                searchPlaceholder: 'Filter results…',
                pdfDocumentTitle: 'Books Search',
              }}
            />
            {!loadingDetails && tableRows.length === 0 ? (
              <p className="border-t px-4 py-6 text-center text-sm text-muted-foreground">
                No book details found.
              </p>
            ) : null}
          </TableCard>
        ) : null}
      </div>
    </LibraryScreenShell>
  )
}
