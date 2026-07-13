'use client'

import { useMemo, useState } from 'react'
import type { ColDef } from 'ag-grid-community'
import { FileSpreadsheet, Upload, X } from 'lucide-react'
import { FileDropzone } from '@/common/components/forms'
import { FilteredListPage } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  importBookBulkFile,
  processBookBulkStagingRows,
  type BookBulkRow,
} from '@/services'

const BOOK_COLS: ColDef<BookBulkRow>[] = [
  { headerName: 'SI.No', valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, width: 70, flex: 0 },
  { field: 'libraryCode', headerName: 'Library', minWidth: 110, flex: 0.9 },
  { field: 'title', headerName: 'Title', minWidth: 200, flex: 1.4 },
  { field: 'accNo', headerName: 'Acession No', minWidth: 120, flex: 0.9 },
  { field: 'author', headerName: 'Author', minWidth: 140, flex: 1 },
  { field: 'publisher', headerName: 'Publisher', minWidth: 140, flex: 1 },
  { field: 'edition', headerName: 'Edition', minWidth: 100, flex: 0.8 },
  { field: 'volume', headerName: 'Volume', minWidth: 90, flex: 0.8 },
  { field: 'year', headerName: 'Year', minWidth: 90, flex: 0.8 },
  { field: 'cost', headerName: 'Cost', minWidth: 90, flex: 0.8 },
  { field: 'invoiceNo', headerName: 'Invoice No', minWidth: 110, flex: 0.9 },
  { field: 'supplier', headerName: 'Supplier', minWidth: 140, flex: 1 },
]

export default function BooksBulkUploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [rows, setRows] = useState<BookBulkRow[]>([])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showTable, setShowTable] = useState(false)
  const [xlsxCount, setXlsxCount] = useState(0)

  const selectedFileName = selectedFile?.name ?? ''

  function clearSelectedFile() {
    setSelectedFile(null)
    setXlsxCount(0)
  }

  async function handleFilesChange(files: File[]) {
    const file = files[0] ?? null
    setSelectedFile(file)
    if (!file) {
      setXlsxCount(0)
      return
    }
    const text = await file.text().catch(() => '')
    setXlsxCount(Math.max(0, text.split('\n').length - 1))
  }

  async function onUpload() {
    const file = selectedFile
    if (!file) {
      toastError(new Error('Please choose a file.'), 'Books Bulk Upload')
      return
    }
    setUploading(true)
    setShowTable(true)
    try {
      const list = await importBookBulkFile(file)
      setRows(Array.isArray(list) ? list : [])
      toastSuccess('Book file uploaded successfully')
    } catch (err) {
      toastError(err, 'Book upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function onSave() {
    setSaving(true)
    try {
      const summary = await processBookBulkStagingRows()
      setRows([])
      clearSelectedFile()
      const totalBooks = Number(summary.totalBooksUploaded ?? 0)
      const totalCopies = Number(summary.totalBooksCopiesUploaded ?? 0)
      toastSuccess(`Total Books - ${totalBooks} and Total Books Copies - ${totalCopies}`)
    } catch (err) {
      toastError(err, 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const hasRows = useMemo(() => rows.length > 0, [rows.length])

  return (
    <FilteredListPage
      title="Books Bulk Upload"
      filters={(
        <div className="border border-border rounded-lg p-3 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-slate-700">Upload Books :</p>
            <a
              href="/assets/docs/BookDetails.xlsx"
              download
              className="text-xs text-[hsl(var(--primary))] hover:underline whitespace-nowrap"
            >
              Download Sample XLSX
            </a>
          </div>

          <FileDropzone accept=".xls,.xlsx" onFilesChange={(files) => void handleFilesChange(files)}>
            <p className="text-xs text-slate-700">Drag and drop XLS/XLSX file here, or click to select</p>
          </FileDropzone>

          {selectedFileName ? (
            <div className="mt-2 inline-flex max-w-full items-center rounded-md border border-dashed border-input bg-muted/40 px-2.5 py-1.5">
              <div className="min-w-0 inline-flex items-center gap-1.5">
                <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />
                <p className="text-xs text-slate-700 truncate">{selectedFileName}</p>
                <button
                  type="button"
                  onClick={clearSelectedFile}
                  className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-slate-200 hover:text-slate-700 shrink-0"
                  aria-label="Delete selected file"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : null}

          {xlsxCount > 0 ? (
            <p className="text-xs text-red-600">Total number of Books listed in xsl sheet are {xlsxCount}.</p>
          ) : null}

          <div className="pt-2 flex justify-end">
            <Button type="button" className="w-full md:w-40" onClick={() => void onUpload()} disabled={uploading}>
              <Upload className="h-4 w-4 mr-1.5" />
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        </div>
      )}
      rowData={showTable ? rows : []}
      columnDefs={BOOK_COLS}
      loading={uploading}
      pagination
      toolbar={{ search: true, searchPlaceholder: 'Search books…', columnPicker: false, exportPdf: false }}
    >
      {hasRows && (
        <div className="pt-2 flex justify-end gap-2">
          <Button type="button" onClick={() => void onSave()} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      )}
    </FilteredListPage>
  )
}
