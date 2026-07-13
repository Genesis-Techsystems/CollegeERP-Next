'use client'

import { useCallback, useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { RotateCcw, XIcon } from 'lucide-react'
import { StatusBadge } from '@/common/components/data-display'
import { Select, type SelectOption } from '@/common/components/select'
import { FilteredListPage } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { toastError, toastSuccess } from '@/lib/toast'
import { rowIndexGetter } from '@/lib/utils'
import {
  getLibraryBookDetailById,
  listBookDetailsByAccession,
  listBookDetailsByBookId,
  searchLibraryBookDetails,
  searchLibraryBooks,
} from '@/services'
import type { LibraryRow } from '@/services'
import { LIB_COL } from '../_lib/library-columns'

type SearchMode = 'title' | 'accession'

function formatBookAuthors(book: LibraryRow): string {
  const authors = book.authors
  if (Array.isArray(authors)) {
    return authors
      .map((a) => {
        if (typeof a === 'string') return a
        const row = a as Record<string, unknown>
        return String(row.firstName ?? row.authorName ?? row.name ?? '').trim()
      })
      .filter(Boolean)
      .join(', ')
  }
  return String(book.bookAuthor ?? book.authorFirstName ?? '').trim()
}

function titleBookLabel(b: LibraryRow): string {
  const title = String(b.bookTitle ?? b.title ?? '').trim()
  const copies = b.noofcopies
  if (title && copies != null && copies !== '') return `${title} - ${copies}`
  return title || 'Book'
}

function accessionBookLabel(b: LibraryRow): string {
  const title = String(b.bookTitle ?? b.title ?? '').trim()
  const acc = String(b.accessionno ?? b.accessionNo ?? '').trim()
  if (title && acc) return `${title} (${acc})`
  return title || acc || 'Book'
}

function titleBookValue(b: LibraryRow): string {
  return String(b.bookId ?? '')
}

function accessionBookValue(b: LibraryRow): string {
  return String(b.bookDetailsId ?? b.bookDetailId ?? b.bookId ?? '')
}

function barcodeRenderer(p: ICellRendererParams<LibraryRow>) {
  const raw = p.data?.bookBarcode ?? p.data?.barcode
  if (raw == null || raw === '') return <span className="text-muted-foreground">—</span>
  const str = String(raw)
  const src = str.startsWith('data:') ? str : `data:image/jpeg;base64,${str}`
  return (
    // eslint-disable-next-line @next/next/no-img-element -- base64 barcode from API
    <img src={src} alt="Book barcode" className="h-[30px] max-w-[192px] object-contain" />
  )
}

function availabilityRenderer(p: ICellRendererParams<LibraryRow>) {
  const v = p.data?.availabilityStatus
  if (v === undefined || v === null) return <span className="text-muted-foreground">—</span>
  const active = v === true || v === 1 || v === '1' || v === 'true'
  return <StatusBadge status={active} label={active ? 'Available' : 'Not Available'} />
}

function makeRemoveRenderer(onRemove: (row: LibraryRow) => void) {
  return (p: ICellRendererParams<LibraryRow>) => {
    const row = p.data
    if (!row) return null
    return (
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0"
        aria-label="Remove from queue"
        onClick={() => onRemove(row)}
      >
        <XIcon className="h-3.5 w-3.5" />
      </Button>
    )
  }
}

export default function PrintBooksBarcodesPage() {
  const [searchMode, setSearchMode] = useState<SearchMode>('title')
  const [bookRows, setBookRows] = useState<LibraryRow[]>([])
  const [bookOptions, setBookOptions] = useState<SelectOption[]>([])
  const [selectedBookKey, setSelectedBookKey] = useState<string | null>(null)
  const [selectedBook, setSelectedBook] = useState<LibraryRow | null>(null)
  const [bookSearchLoading, setBookSearchLoading] = useState(false)
  const [adding, setAdding] = useState(false)
  const [printQueue, setPrintQueue] = useState<LibraryRow[]>([])

  const minSearchLen = searchMode === 'title' ? 3 : 2

  const onBookSearch = useCallback(
    async (term: string) => {
      const q = term.trim()
      if (q.length < minSearchLen) {
        setBookRows([])
        setBookOptions([])
        return
      }
      setBookSearchLoading(true)
      try {
        if (searchMode === 'title') {
          const rows = await searchLibraryBooks(q)
          setBookRows(rows)
          setBookOptions(
            rows.map((b) => ({
              value: titleBookValue(b),
              label: titleBookLabel(b),
            })),
          )
        } else {
          const rows = await searchLibraryBookDetails(q)
          const exact = rows.filter(
            (r) => String(r.accessionno ?? r.accessionNo ?? '').toLowerCase() === q.toLowerCase(),
          )
          const list = exact.length > 0 ? exact : rows
          setBookRows(list)
          setBookOptions(
            list.map((b) => ({
              value: accessionBookValue(b),
              label: accessionBookLabel(b),
            })),
          )
        }
      } catch (e) {
        toastError(e, 'Book search failed')
        setBookRows([])
        setBookOptions([])
      } finally {
        setBookSearchLoading(false)
      }
    },
    [searchMode, minSearchLen],
  )

  function handleModeChange(mode: SearchMode) {
    setSearchMode(mode)
    setSelectedBookKey(null)
    setSelectedBook(null)
    setBookRows([])
    setBookOptions([])
  }

  function handleBookChange(value: string | null) {
    setSelectedBookKey(value)
    if (!value) {
      setSelectedBook(null)
      return
    }
    const picked = bookRows.find((b) =>
      searchMode === 'title' ? titleBookValue(b) === value : accessionBookValue(b) === value,
    )
    if (picked) setSelectedBook(picked)
  }

  function handleReset() {
    setSelectedBookKey(null)
    setSelectedBook(null)
    setBookRows([])
    setBookOptions([])
    setPrintQueue([])
  }

  const removeFromQueue = useCallback((row: LibraryRow) => {
    const id = row.bookDetailsId
    setPrintQueue((prev) => prev.filter((r) => r.bookDetailsId !== id))
  }, [])

  async function handleAdd() {
    if (!selectedBook) {
      toastError('Select a book first.')
      return
    }
    setAdding(true)
    try {
      let details: LibraryRow[] = []
      if (searchMode === 'title') {
        const bookId = Number(selectedBook.bookId ?? 0)
        if (!bookId) {
          toastError('Invalid book selection.')
          return
        }
        details = await listBookDetailsByBookId(bookId)
      } else {
        const acc = String(selectedBook.accessionno ?? selectedBook.accessionNo ?? '').trim()
        if (acc) {
          details = await listBookDetailsByAccession(acc)
        }
        if (!details.length) {
          const detailsId = Number(selectedBook.bookDetailsId ?? selectedBook.bookDetailId ?? 0)
          if (detailsId > 0) {
            const one = await getLibraryBookDetailById(detailsId)
            if (one) details = [one]
          }
        }
      }

      if (!details.length) {
        toastError('No book copies found to add.')
        return
      }

      const author = formatBookAuthors(selectedBook)
      let added = 0
      setPrintQueue((prev) => {
        const next = [...prev]
        for (const d of details) {
          const id = d.bookDetailsId
          if (id != null && next.some((x) => x.bookDetailsId === id)) continue
          next.push({
            ...d,
            bookAuthor: formatBookAuthors(d) || author,
            authors: d.authors ?? selectedBook.authors,
          })
          added += 1
        }
        return next
      })

      if (added > 0) {
        toastSuccess(`Added ${added} copy${added === 1 ? '' : 'ies'} to print queue`)
        setSelectedBookKey(null)
        setSelectedBook(null)
      } else {
        toastError('Already added with same book title.')
      }
    } catch (e) {
      toastError(e, 'Failed to add books')
    } finally {
      setAdding(false)
    }
  }

  function handlePrint(spine: boolean) {
    if (printQueue.length === 0) return
    toastSuccess(spine ? 'Preparing spine stickers for print…' : 'Preparing stickers for print…')
    globalThis.print()
  }

  const columnDefs = useMemo<ColDef<LibraryRow>[]>(
    () => [
      { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 },
      LIB_COL.accessionno,
      LIB_COL.bookTitle,
      LIB_COL.bookAuthor,
      LIB_COL.libraryCode,
      LIB_COL.shelveName,
      LIB_COL.bookPosition,
      {
        field: 'availabilityStatus',
        headerName: 'Availability Status',
        minWidth: 130,
        cellRenderer: availabilityRenderer,
      },
      { headerName: 'Book BarCode', minWidth: 210, flex: 0, cellRenderer: barcodeRenderer },
      {
        headerName: 'Actions',
        minWidth: 80,
        flex: 0,
        sortable: false,
        cellRenderer: makeRemoveRenderer(removeFromQueue),
      },
    ],
    [removeFromQueue],
  )

  const filters = (
    <div className="space-y-4">
      <RadioGroup
        value={searchMode}
        onValueChange={(v) => handleModeChange(v as SearchMode)}
        className="flex flex-wrap gap-x-6 gap-y-2"
      >
        <div className="flex items-center gap-2">
          <RadioGroupItem value="title" id="print-barcode-title" />
          <Label htmlFor="print-barcode-title" className="text-[13px] font-normal">
            Search By Book Title
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="accession" id="print-barcode-acc" />
          <Label htmlFor="print-barcode-acc" className="text-[13px] font-normal">
            Search By Accession Number
          </Label>
        </div>
      </RadioGroup>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-2">
          <Label className="text-[13px]">
            {searchMode === 'title' ? 'Search Book' : 'Search Accession Number'}
          </Label>
          <Select
            value={selectedBookKey}
            onChange={handleBookChange}
            options={bookOptions}
            placeholder={
              searchMode === 'title' ? 'Search book title…' : 'Search accession no.…'
            }
            searchable
            onSearch={(t) => void onBookSearch(t)}
            isLoading={bookSearchLoading}
            clearable
            className="w-full"
          />
        </div>
        <Button
          type="button"
          size="sm"
          disabled={adding || !selectedBook}
          onClick={() => void handleAdd()}
        >
          Add
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 w-9 shrink-0 p-0"
          aria-label="Reset"
          onClick={handleReset}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )

  return (
    <FilteredListPage
      title="Print Books Barcodes"
      filters={filters}
      rowData={printQueue}
      columnDefs={columnDefs}
      pagination
      paginationPageSize={10}
      height="auto"
      toolbar={{
        search: true,
        searchPlaceholder: 'Filter queue…',
        pdfDocumentTitle: 'Print Books Barcodes',
      }}
      toolbarTrailing={
        printQueue.length > 0 ? (
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => handlePrint(false)}
            >
              Print Stickers
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => handlePrint(true)}
            >
              Print Spine Stickers
            </Button>
          </>
        ) : undefined
      }
    />
  )
}
