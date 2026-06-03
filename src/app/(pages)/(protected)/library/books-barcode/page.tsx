'use client'

import { useState } from 'react'
import { LibraryGridPage } from '../_components/LibraryGridPage'
import { LIB_COL } from '../_lib/library-columns'
import { QK } from '@/lib/query-keys'
import { generateBooksBarcode, listLibraryBookDetails } from '@/services'
import { toastError, toastSuccess } from '@/lib/toast'
import { Button } from '@/components/ui/button'

export default function BooksBarcodePage() {
  const [generating, setGenerating] = useState(false)

  async function handleGenerateBarcode() {
    setGenerating(true)
    try {
      await generateBooksBarcode()
      toastSuccess('Book barcodes generated')
    } catch (e) {
      toastError(e, 'Could not generate book barcodes')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <LibraryGridPage
      title="Books Barcode"
      queryKey={QK.library.bookDetails()}
      queryFn={listLibraryBookDetails}
      columns={[
        LIB_COL.accessionno,
        LIB_COL.bookTitle,
        LIB_COL.bookAuthor,
        LIB_COL.shelveName,
        LIB_COL.bookPosition,
        LIB_COL.barcode,
        LIB_COL.availabilityStatus,
      ]}
      searchPlaceholder="Search by barcode or title…"
      headerAction={
        <Button type="button" size="sm" className="h-8 px-3 text-[12px]" disabled={generating} onClick={() => void handleGenerateBarcode()}>
          Generate Barcode
        </Button>
      }
    />
  )
}
