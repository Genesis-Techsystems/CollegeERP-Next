'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { PencilIcon } from 'lucide-react'
import { StatusBadge } from '@/common/components/data-display'
import { FilteredListPage } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { rowIndexGetter } from '@/lib/utils'
import { getLibraryBookById, listBookDetailsByBookId } from '@/services'
import type { LibraryRow } from '@/services'

function statusRenderer(p: ICellRendererParams<LibraryRow>) {
  return <StatusBadge status={Boolean(p.data?.isActive)} />
}

function positionRenderer(p: ICellRendererParams<LibraryRow>) {
  const shelve = String(p.data?.shelveCode ?? '').trim()
  const pos = String(p.data?.bookPosition ?? '').trim()
  if (!shelve && !pos) return <span>/</span>
  return <span>{[shelve, pos].filter(Boolean).join(' / ') || '/'}</span>
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

function actionsRenderer(p: ICellRendererParams<LibraryRow>) {
  return (
    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" aria-label="Edit copy" type="button">
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

export default function BookDetailsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const bookId = Number(searchParams.get('bookId') ?? 0)
  const bookTitle = searchParams.get('bookTitle') ?? ''
  const noofcopies = searchParams.get('noofcopies') ?? ''
  const availableCopies = searchParams.get('availableCopies') ?? ''
  const issuedCopies = searchParams.get('issuedCopies') ?? ''
  const collegeId = searchParams.get('collegeId') ?? ''
  const libraryId = searchParams.get('libraryId') ?? ''
  const bookcatId = searchParams.get('bookcatId') ?? ''
  const check = searchParams.get('check') ?? ''

  const { data: book } = useQuery({
    queryKey: ['Library', 'book', bookId],
    queryFn: () => getLibraryBookById(bookId),
    enabled: bookId > 0,
  })

  const { data: copies = [], isLoading } = useQuery({
    queryKey: ['Library', 'bookDetails', bookId],
    queryFn: () => listBookDetailsByBookId(bookId),
    enabled: bookId > 0,
  })

  const activeCount = useMemo(
    () => copies.filter((c) => c.isActive !== false).length,
    [copies],
  )

  const displayTitle = bookTitle || String(book?.title ?? book?.bookTitle ?? '—')
  const displayTotal = noofcopies || String(book?.noofcopies ?? copies.length)
  const displayAvailable =
    availableCopies || String(book?.availableCopies ?? activeCount)
  const displayIssued = issuedCopies || String(book?.issuedCopies ?? '')

  const columnDefs = useMemo<ColDef<LibraryRow>[]>(
    () => [
      { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 },
      { field: 'accessionno', headerName: 'Accession No.', minWidth: 120 },
      {
        field: 'bookTitle',
        headerName: 'Book Title',
        minWidth: 220,
        flex: 1,
        wrapText: true,
        autoHeight: true,
      },
      { field: 'bookregTypeCode', headerName: 'Book Type', minWidth: 100 },
      { headerName: 'Position', minWidth: 100, cellRenderer: positionRenderer },
      { headerName: 'Book BarCode', minWidth: 210, flex: 0, cellRenderer: barcodeRenderer },
      { field: 'isActive', headerName: 'Status', minWidth: 100, flex: 0, cellRenderer: statusRenderer },
      { headerName: 'Actions', minWidth: 80, flex: 0, sortable: false, cellRenderer: actionsRenderer },
    ],
    [],
  )

  function goBack() {
    const qs = new URLSearchParams()
    if (bookId) qs.set('bookId', String(bookId))
    if (collegeId) qs.set('collegeId', collegeId)
    if (libraryId) qs.set('libraryId', libraryId)
    if (bookcatId) qs.set('bookcatId', bookcatId)
    if (displayTitle && displayTitle !== '—') qs.set('bookTitle', displayTitle)
    if (check) qs.set('check', check)
    const q = qs.toString()
    router.push(q ? `/library/books?${q}` : '/library/books')
  }

  const filters = (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-md border bg-muted/20 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <p className="text-[13px] sm:col-span-2 lg:col-span-4">
          <span className="font-medium text-foreground">Book :</span>{' '}
          <span className="text-muted-foreground">{displayTitle}</span>
        </p>
        <p className="text-[13px]">
          <span className="font-medium text-foreground">Total Copies :</span>{' '}
          <span className="text-muted-foreground">{displayTotal}</span>
        </p>
        <p className="text-[13px]">
          <span className="font-medium text-foreground">Available Copies :</span>{' '}
          <span className="text-muted-foreground">{displayAvailable}</span>
        </p>
        <p className="text-[13px]">
          <span className="font-medium text-foreground">Issued Copies :</span>{' '}
          <span className="text-muted-foreground">{displayIssued || '—'}</span>
        </p>
      </div>
      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" className="h-9 px-4" onClick={goBack}>
          Back
        </Button>
      </div>
    </div>
  )

  return (
    <FilteredListPage
      title="Book Details"
      filters={filters}
      rowData={copies}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      paginationPageSize={10}
      toolbar={{
        search: true,
        searchPlaceholder: 'Search',
        pdfDocumentTitle: 'Book Details',
      }}
    />
  )
}
