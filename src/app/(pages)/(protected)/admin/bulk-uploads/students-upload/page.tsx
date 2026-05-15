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
  clearStudentBulkStagingRows,
  getStudentBulkStagingRows,
  importStudentBulkFile,
  processStudentBulkStagingRows,
  type StudentBulkStagingRow,
} from '@/services'

function decodeBase64Safe(value?: string): string {
  if (!value) return ''
  try {
    return atob(value)
  } catch {
    return value
  }
}

const STAGING_COLS: ColDef<StudentBulkStagingRow>[] = [
  { headerName: 'SI.No', valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, width: 70, flex: 0 },
  { headerName: 'Problem', minWidth: 180, flex: 1.2, valueGetter: (p) => decodeBase64Safe(p.data?.Problems) },
  { field: 'first_name', headerName: 'Student', minWidth: 140, flex: 1 },
  {
    headerName: 'Course',
    minWidth: 260,
    flex: 1.8,
    valueGetter: (p) =>
      [p.data?.college, p.data?.academic_year, p.data?.course, p.data?.group, p.data?.course_year, p.data?.s_section]
        .filter(Boolean)
        .join(' / '),
  },
  { field: 'batch', headerName: 'Batch', minWidth: 90, flex: 0.8 },
  { field: 'date_of_birth', headerName: 'D.O.B', minWidth: 110, flex: 0.9 },
  { field: 'student_emailid', headerName: 'Student Email', minWidth: 170, flex: 1.2 },
  { field: 'mobile', headerName: 'Mobile', minWidth: 110, flex: 0.9 },
  { field: 'father_name', headerName: 'Father Name', minWidth: 150, flex: 1.1 },
  { field: 'father_mobile', headerName: 'Father Mobile', minWidth: 130, flex: 1 },
]

export default function StudentsUploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [rows, setRows] = useState<StudentBulkStagingRow[]>([])
  const [showTable, setShowTable] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [clearing, setClearing] = useState(false)
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

  async function refreshStaging() {
    const list = await getStudentBulkStagingRows()
    setRows(Array.isArray(list) ? list : [])
  }

  async function onUpload() {
    const file = selectedFile
    if (!file) {
      toastError(new Error('Please choose a file.'), 'Student Bulk Upload')
      return
    }
    setUploading(true)
    setShowTable(true)
    try {
      await importStudentBulkFile(file)
      await refreshStaging()
      toastSuccess('Student file uploaded successfully')
    } catch (err) {
      toastError(err, 'Student upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function onClearStaging() {
    setClearing(true)
    try {
      await clearStudentBulkStagingRows()
      setRows([])
      clearSelectedFile()
      toastSuccess('Staging rows cleared')
    } catch (err) {
      toastError(err, 'Clear staging failed')
    } finally {
      setClearing(false)
    }
  }

  async function onSaveStaging() {
    setSaving(true)
    try {
      const msg = await processStudentBulkStagingRows()
      toastSuccess(msg || 'Saved successfully')
      setRows([])
    } catch (err) {
      toastError(err, 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const hasRows = useMemo(() => rows.length > 0, [rows.length])

  return (
    <PageContainer className="space-y-5">
      <PageHeader title="Student Bulk Upload" subtitle="Admin / Bulk Uploads" />

      <div className="app-card overflow-hidden">
        <div className="px-4 py-2 border-b border-slate-200 bg-slate-50/60">
          <h2 className="text-[16px] font-semibold text-[hsl(var(--card-title))]">Student Bulk Upload</h2>
        </div>

        <div className="px-4 py-3">
          <div className="border border-slate-200 rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-700">Upload Students :</p>
              <a
                href="/assets/docs/Student__Bulk_Details.xlsx"
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
              <div className="mt-2 inline-flex max-w-full items-center rounded-md border border-dashed border-slate-300 bg-slate-50 px-2.5 py-1.5">
                <div className="min-w-0 inline-flex items-center gap-1.5">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />
                  <p className="text-xs text-slate-700 truncate">{selectedFileName}</p>
                  <button
                    type="button"
                    onClick={clearSelectedFile}
                    className="inline-flex h-5 w-5 items-center justify-center rounded text-slate-500 hover:bg-slate-200 hover:text-slate-700 shrink-0"
                    aria-label="Delete selected file"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ) : null}

            {xlsxCount > 0 ? (
              <p className="text-xs text-red-600">Total number of students listed in xlsx sheet are {xlsxCount}.</p>
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
            columnDefs={STAGING_COLS}
            pagination
            toolbar={{ search: true, searchPlaceholder: 'Search students…', columnPicker: false, exportPdf: false }}
          />
          {hasRows && (
            <div className="pt-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => void onClearStaging()} disabled={clearing || saving}>
                {clearing ? 'Clearing...' : 'Clear'}
              </Button>
              <Button type="button" onClick={() => void onSaveStaging()} disabled={saving || clearing}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          )}
        </div>
      )}
    </PageContainer>
  )
}
