'use client'

import { useMemo, useState } from 'react'
import type { ColDef } from 'ag-grid-community'
import { FileSpreadsheet, Upload, X } from 'lucide-react'
import { DataTable } from '@/common/components/table'
import { FileDropzone } from '@/common/components/forms'
import { PageContainer, PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  importEmployeeBulkFile,
  processEmployeeBulkStagingRows,
  type EmployeeBulkRow,
} from '@/services'

const EMP_COLS: ColDef<EmployeeBulkRow>[] = [
  { headerName: 'SI.No', valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, width: 70, flex: 0 },
  { field: 'firstName', headerName: 'Employee', minWidth: 150, flex: 1.1 },
  {
    headerName: 'Department',
    minWidth: 220,
    flex: 1.3,
    valueGetter: (p) => [p.data?.college, p.data?.department].filter(Boolean).join(' / '),
  },
  { field: 'designation', headerName: 'Designation', minWidth: 140, flex: 1 },
  { field: 'dateOfBirth', headerName: 'D.O.B', minWidth: 120, flex: 0.9 },
  { field: 'dateOfJoin', headerName: 'D.O.J', minWidth: 120, flex: 0.9 },
  { field: 'email', headerName: 'Email', minWidth: 180, flex: 1.3 },
  { field: 'mobileNumber', headerName: 'Mobile', minWidth: 120, flex: 0.9 },
  { field: 'qualification', headerName: 'Qualification', minWidth: 130, flex: 1 },
]

export default function EmployeeUploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [rows, setRows] = useState<EmployeeBulkRow[]>([])
  const [notSavedRows, setNotSavedRows] = useState<EmployeeBulkRow[]>([])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [xlsxCount, setXlsxCount] = useState(0)
  const [showTable, setShowTable] = useState(false)

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
      toastError(new Error('Please choose a file.'), 'Employee Bulk Upload')
      return
    }
    setUploading(true)
    setShowTable(true)
    try {
      const list = await importEmployeeBulkFile(file)
      setRows(Array.isArray(list) ? list : [])
      setNotSavedRows([])
      toastSuccess('Employee file uploaded successfully')
    } catch (err) {
      toastError(err, 'Employee upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function onSave() {
    setSaving(true)
    try {
      const res = await processEmployeeBulkStagingRows()
      setNotSavedRows(Array.isArray(res.notSavedRecords) ? res.notSavedRecords : [])
      setRows([])
      clearSelectedFile()
      toastSuccess(res.message || 'Saved successfully')
    } catch (err) {
      toastError(err, 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const hasRows = useMemo(() => rows.length > 0, [rows.length])
  const hasNotSaved = useMemo(() => notSavedRows.length > 0, [notSavedRows.length])

  return (
    <PageContainer className="space-y-4">
      <PageHeader title="Employee Bulk Upload" subtitle="Admin / Bulk Uploads" />

      <div className="app-card overflow-hidden">
        <div className="px-4 py-2 border-b border-border bg-muted/40">
          <h2 className="app-card-title">Employee Bulk Upload</h2>
        </div>

        <div className="px-4 py-3">
          <div className="border border-border rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-700">Upload Employees :</p>
              <a
                href="/assets/docs/University_Level_Employee_Bulk_Upload.xlsx"
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
              <p className="text-xs text-red-600">Total number of employees listed in xlsx sheet are {xlsxCount}.</p>
            ) : null}

            <div className="pt-2 flex justify-end">
              <Button type="button" className="w-full md:w-40" onClick={() => void onUpload()} disabled={uploading}>
                <Upload className="h-4 w-4 mr-1.5" />
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {showTable && (
        <div className="app-card p-3">
          <DataTable
            rowData={rows}
            columnDefs={EMP_COLS}
            pagination
            toolbar={{ search: true, searchPlaceholder: 'Search employees…', columnPicker: false, exportPdf: false }}
          />
          {hasRows && (
            <div className="pt-2 flex justify-end gap-2">
              <Button type="button" onClick={() => void onSave()} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          )}
        </div>
      )}

      {hasNotSaved && (
        <div className="app-card p-3">
          <div className="mb-2 border-b border-border pb-1.5 text-sm font-semibold text-[hsl(var(--primary))]">
            UnSaved List
          </div>
          <DataTable
            rowData={notSavedRows}
            columnDefs={EMP_COLS}
            pagination
            toolbar={{ search: true, searchPlaceholder: 'Search unsaved…', columnPicker: false, exportPdf: false }}
          />
        </div>
      )}
    </PageContainer>
  )
}
