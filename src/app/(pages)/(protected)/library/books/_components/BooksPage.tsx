'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { PlusIcon, PencilIcon } from 'lucide-react'
import { DataTable, TableCard } from '@/common/components/table'
import { FilterCard, FILTER_CARD_SELECT_CLASS } from '@/common/components/feedback'
import { Select, type SelectOption } from '@/common/components/select'
import { StatusBadge } from '@/common/components/data-display'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useSessionContext } from '@/context/SessionContext'
import { getErrorMessage } from '@/lib/errors'
import { QK } from '@/lib/query-keys'
import { toastError, toastSuccess } from '@/lib/toast'
import { rowIndexGetter } from '@/lib/utils'
import {
  generateBooksBarcode,
  getLibraryBookById,
  listBookCategoriesByLibrary,
  listBooksByLibraryAndCategory,
  listCollegesForLibrary,
  listLibrariesByCollege,
  searchBooksInLibraryCategory,
} from '@/services'
import type { LibraryRow } from '@/services'
import { LibraryScreenShell } from '../../_components/LibraryScreenShell'
import { EditBookModal } from './EditBookModal'

type SearchMode = 'book' | 'all'

function bookOptionLabel(b: LibraryRow): string {
  const title = String(b.bookTitle ?? b.title ?? 'Book').trim()
  const lib = String(b.libraryCode ?? '').trim()
  return lib ? `${title} (${lib})` : title
}

function statusRenderer(p: ICellRendererParams<LibraryRow>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  collegeId: string | null,
  libraryId: string | null,
  bookcatId: string | null,
  searchMode: SearchMode,
  onEdit: (row: LibraryRow) => void,
) {
  return (p: ICellRendererParams<LibraryRow>) => {
    const row = p.data
    if (!row?.bookId) return null
    const qs = new URLSearchParams({
      bookId: String(row.bookId),
      bookTitle: String(row.bookTitle ?? row.title ?? ''),
      noofcopies: String(row.noofcopies ?? ''),
      availableCopies: String(row.availableCopies ?? ''),
      issuedCopies: String(row.issuedCopies ?? ''),
    })
    if (collegeId) qs.set('collegeId', collegeId)
    if (libraryId) qs.set('libraryId', libraryId)
    if (bookcatId) qs.set('bookcatId', bookcatId)
    if (searchMode === 'book') qs.set('check', '1')
    if (searchMode === 'all') qs.set('check', '2')
    return (
      <div className="flex min-h-[3rem] flex-wrap items-center gap-x-2 gap-y-1 py-2 text-[12px] leading-snug">
        <Link
          href={`/library/add-more-books?${qs}`}
          className="shrink-0 whitespace-nowrap text-primary hover:underline"
        >
          Add More Books
        </Link>
        <span className="shrink-0 text-muted-foreground" aria-hidden>
          |
        </span>
        <Link
          href={`/library/book-details?${qs}`}
          className="shrink-0 whitespace-nowrap text-primary hover:underline"
        >
          Book Details
        </Link>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 shrink-0 p-0"
          aria-label="Edit book"
          type="button"
          onClick={() => onEdit(row)}
        >
          <PencilIcon className="h-3.5 w-3.5" />
        </Button>
      </div>
    )
  }
}

export function BooksPage() {
  const { user } = useSessionContext()
  const queryClient = useQueryClient()
  const defaultCollegeId = user?.collegeId ?? 0

  const [searchMode, setSearchMode] = useState<SearchMode>('book')
  const [editBookRow, setEditBookRow] = useState<LibraryRow | null>(null)
  const [editBookOpen, setEditBookOpen] = useState(false)
  const [collegeId, setCollegeId] = useState<string | null>(
    defaultCollegeId ? String(defaultCollegeId) : null,
  )
  const [libraryId, setLibraryId] = useState<string | null>(null)
  const [bookcatId, setBookcatId] = useState<string | null>(null)
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null)
  const [bookSuggestions, setBookSuggestions] = useState<LibraryRow[]>([])
  const [bookSearchLoading, setBookSearchLoading] = useState(false)
  const [generatingBarcode, setGeneratingBarcode] = useState(false)

  const collegeNum = collegeId ? Number(collegeId) : 0
  const libraryNum = libraryId ? Number(libraryId) : 0
  const bookcatNum = bookcatId ? Number(bookcatId) : 0
  const filtersReady = collegeNum > 0 && libraryNum > 0 && bookcatNum > 0

  const { data: colleges = [] } = useQuery({
    queryKey: QK.library.collegesForLibrary(),
    queryFn: listCollegesForLibrary,
  })

  const { data: libraries = [], isLoading: loadingLibraries } = useQuery({
    queryKey: QK.library.librariesByCollege(collegeNum),
    queryFn: () => listLibrariesByCollege(collegeNum),
    enabled: collegeNum > 0,
  })

  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: QK.library.bookCategoriesByLibrary(libraryNum),
    queryFn: () => listBookCategoriesByLibrary(libraryNum),
    enabled: libraryNum > 0,
  })

  const {
    data: categoryBooks = [],
    isLoading: loadingCategoryBooks,
    isError,
    error,
  } = useQuery({
    queryKey: QK.library.booksByCategory(libraryNum, bookcatNum),
    queryFn: () => listBooksByLibraryAndCategory(libraryNum, bookcatNum),
    enabled: searchMode === 'all' && filtersReady,
  })

  const collegeOptions = useMemo<SelectOption[]>(
    () =>
      colleges.map((c) => ({
        value: String(c.collegeId ?? c.fk_college_id ?? ''),
        label: String(c.collegeCode ?? c.college_code ?? c.collegeName ?? c.collegeId ?? ''),
      })),
    [colleges],
  )

  const libraryOptions = useMemo<SelectOption[]>(
    () =>
      libraries.map((lib) => ({
        value: String(lib.libraryId),
        label: lib.libraryCode ?? lib.libraryName ?? String(lib.libraryId),
      })),
    [libraries],
  )

  const categoryOptions = useMemo<SelectOption[]>(
    () =>
      categories.map((cat) => ({
        value: String(cat.bookcatId),
        label: cat.bookCategoryCode ?? cat.bookCategoryName ?? String(cat.bookcatId),
      })),
    [categories],
  )

  const bookOptions = useMemo<SelectOption[]>(() => {
    const base = bookSuggestions.map((b) => ({
      value: String(b.bookId ?? ''),
      label: bookOptionLabel(b),
    }))
    if (selectedBookId && !base.some((o) => o.value === selectedBookId)) {
      const picked = bookSuggestions.find((b) => String(b.bookId) === selectedBookId)
      if (picked) return [{ value: selectedBookId, label: bookOptionLabel(picked) }, ...base]
    }
    return base
  }, [bookSuggestions, selectedBookId])

  const selectedBook = useMemo(
    () => bookSuggestions.find((b) => String(b.bookId) === selectedBookId) ?? null,
    [bookSuggestions, selectedBookId],
  )

  const tableRows = useMemo(() => {
    if (searchMode === 'book') {
      return selectedBook ? [selectedBook] : []
    }
    return categoryBooks
  }, [searchMode, selectedBook, categoryBooks])

  const onBookSearch = useCallback(
    async (term: string) => {
      if (!filtersReady || term.trim().length < 4) {
        setBookSuggestions([])
        return
      }
      setBookSearchLoading(true)
      try {
        const found = await searchBooksInLibraryCategory(libraryNum, bookcatNum, term)
        setBookSuggestions(found)
      } catch (e) {
        toastError(e, 'Book search failed')
        setBookSuggestions([])
      } finally {
        setBookSearchLoading(false)
      }
    },
    [filtersReady, libraryNum, bookcatNum],
  )

  useEffect(() => {
    if (collegeNum > 0 && !collegeId && collegeOptions.length > 0) {
      setCollegeId(collegeOptions[0]!.value)
    }
  }, [collegeNum, collegeId, collegeOptions])

  useEffect(() => {
    if (libraryOptions.length === 1 && !libraryId) {
      setLibraryId(libraryOptions[0]!.value)
    }
  }, [libraryOptions, libraryId])

  useEffect(() => {
    if (categoryOptions.length === 1 && !bookcatId) {
      setBookcatId(categoryOptions[0]!.value)
    }
  }, [categoryOptions, bookcatId])

  function resetCascade(from: 'college' | 'library' | 'category') {
    if (from === 'college') {
      setLibraryId(null)
      setBookcatId(null)
    } else if (from === 'library') {
      setBookcatId(null)
    }
    setSelectedBookId(null)
    setBookSuggestions([])
  }

  function handleCollegeChange(value: string | null) {
    setCollegeId(value)
    resetCascade('college')
  }

  function handleLibraryChange(value: string | null) {
    setLibraryId(value)
    resetCascade('library')
  }

  function handleCategoryChange(value: string | null) {
    setBookcatId(value)
    setSelectedBookId(null)
    setBookSuggestions([])
  }

  function handleBookChange(value: string | null) {
    setSelectedBookId(value)
    if (!value) return
    const picked = bookSuggestions.find((b) => String(b.bookId) === value)
  }

  const handleEditBook = useCallback((row: LibraryRow) => {
    setEditBookRow(row)
    setEditBookOpen(true)
  }, [])

  function handleBookSaved() {
    void queryClient.invalidateQueries({
      queryKey: QK.library.booksByCategory(libraryNum, bookcatNum),
    })
    const savedId = editBookRow?.bookId
    if (!savedId) return
    void getLibraryBookById(Number(savedId)).then((updated) => {
      if (!updated) return
      const id = String(updated.bookId)
      setBookSuggestions((prev) => {
        const mapped = prev.map((b) => (String(b.bookId) === id ? updated : b))
        return mapped.some((b) => String(b.bookId) === id) ? mapped : prev
      })
    })
  }

  async function handleGenerateBarcode() {
    setGeneratingBarcode(true)
    try {
      await generateBooksBarcode()
      toastSuccess('Book barcodes generated')
    } catch (e) {
      toastError(e, 'Could not generate book barcodes')
    } finally {
      setGeneratingBarcode(false)
    }
  }

  const columnDefs = useMemo<ColDef<LibraryRow>[]>(
    () => [
      { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 },
      {
        field: 'title',
        headerName: 'Title',
        minWidth: 220,
        flex: 1,
        wrapText: true,
        autoHeight: true,
        valueGetter: (p) => p.data?.title ?? p.data?.bookTitle,
      },
      { field: 'libraryCode', headerName: 'Library', minWidth: 120 },
      { field: 'noofcopies', headerName: 'No of copies', minWidth: 110 },
      { field: 'availableCopies', headerName: 'Available Copies', minWidth: 120 },
      { field: 'issuedCopies', headerName: 'Issued Copies', minWidth: 110 },
      { field: 'isActive', headerName: 'Status', minWidth: 100, flex: 0, cellRenderer: statusRenderer },
      {
        headerName: 'Actions',
        minWidth: 220,
        width: 220,
        flex: 0,
        autoHeight: true,
        wrapText: true,
        sortable: false,
        cellRenderer: makeActionsRenderer(
          collegeId,
          libraryId,
          bookcatId,
          searchMode,
          handleEditBook,
        ),
      },
    ],
    [collegeId, libraryId, bookcatId, searchMode, handleEditBook],
  )

  const showTable = searchMode === 'all' ? filtersReady && categoryBooks.length >= 0 : !!selectedBook
  const tableLoading = searchMode === 'all' ? loadingCategoryBooks : false

  return (
    <LibraryScreenShell
      title="Books"
      action={
        <Button asChild size="sm" className="h-8 px-3 text-[12px]">
          <Link href="/library/add-books">
            <PlusIcon className="mr-1.5 h-3.5 w-3.5" />
            Add Books
          </Link>
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="app-card px-4 py-3">
          <RadioGroup
            value={searchMode}
            onValueChange={(v) => {
              setSearchMode(v as SearchMode)
              setSelectedBookId(null)
              setBookSuggestions([])
            }}
            className="flex flex-wrap gap-x-6 gap-y-2"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="book" id="lib-books-mode-book" />
              <Label htmlFor="lib-books-mode-book" className="text-[13px] font-normal">
                Search By Book
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="all" id="lib-books-mode-all" />
              <Label htmlFor="lib-books-mode-all" className="text-[13px] font-normal">
                All
              </Label>
            </div>
          </RadioGroup>
        </div>

        <FilterCard title={searchMode === 'book' ? 'Book Search' : 'Book Details'}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Select
              className={FILTER_CARD_SELECT_CLASS}
              label="College"
              required
              value={collegeId}
              onChange={handleCollegeChange}
              options={collegeOptions}
              placeholder="College"
              searchable
            />
            <Select
              className={FILTER_CARD_SELECT_CLASS}
              label="Library"
              required
              value={libraryId}
              onChange={handleLibraryChange}
              options={libraryOptions}
              placeholder="Library"
              searchable
              isLoading={loadingLibraries}
              disabled={!collegeId}
            />
            <Select
              className={FILTER_CARD_SELECT_CLASS}
              label="Book category"
              required
              value={bookcatId}
              onChange={handleCategoryChange}
              options={categoryOptions}
              placeholder="Book category"
              searchable
              isLoading={loadingCategories}
              disabled={!libraryId}
            />
            {searchMode === 'book' ? (
              <Select
                className={FILTER_CARD_SELECT_CLASS}
                label="Search Book"
                value={selectedBookId}
                onChange={handleBookChange}
                options={bookOptions}
                placeholder="Search Book…"
                searchable
                onSearch={(t) => void onBookSearch(t)}
                isLoading={bookSearchLoading}
                clearable
                disabled={!filtersReady}
              />
            ) : null}
          </div>
        </FilterCard>

        {showTable ? (
          <TableCard withHeaderBorder={false}>
            {isError && searchMode === 'all' ? (
              <p className="px-4 py-6 text-center text-sm text-destructive">{getErrorMessage(error)}</p>
            ) : (
              <DataTable
                rowData={tableRows}
                columnDefs={columnDefs}
                loading={tableLoading}
                pagination
                height="auto"
                toolbar={{
                  search: true,
                  searchPlaceholder: 'Search',
                  pdfDocumentTitle: 'Books',
                }}
                toolbarTrailing={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-[30px] px-3 text-[12px]"
                    disabled={generatingBarcode || tableRows.length === 0}
                    onClick={() => void handleGenerateBarcode()}
                  >
                    Generate Book BarCode
                  </Button>
                }
              />
            )}
            {!tableLoading && tableRows.length === 0 ? (
              <p className="border-t px-4 py-6 text-center text-sm text-muted-foreground">
                {searchMode === 'book'
                  ? filtersReady
                    ? 'Search and select a book (type at least 4 characters).'
                    : 'Select college, library, and book category first.'
                  : 'No books in this category.'}
              </p>
            ) : null}
          </TableCard>
        ) : searchMode === 'book' && filtersReady && !selectedBook ? (
          <p className="text-sm text-muted-foreground px-1">
            Type at least 4 characters in Search Book, then pick a title from the list.
          </p>
        ) : null}
      </div>

      <EditBookModal
        open={editBookOpen}
        onClose={() => {
          setEditBookOpen(false)
          setEditBookRow(null)
        }}
        row={editBookRow}
        onSaved={handleBookSaved}
      />
    </LibraryScreenShell>
  )
}
