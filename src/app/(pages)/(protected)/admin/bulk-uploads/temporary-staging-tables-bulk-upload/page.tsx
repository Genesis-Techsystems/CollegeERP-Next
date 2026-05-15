'use client'

import { useState } from 'react'
import { FileSpreadsheet, Upload, X } from 'lucide-react'
import { FileDropzone } from '@/common/components/forms'
import { PageContainer, PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toastError, toastSuccess } from '@/lib/toast'
import { uploadTemporaryStagingTable } from '@/services'

export default function TemporaryStagingTablesBulkUploadPage() {
  const [tableName, setTableName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const fileName = selectedFile?.name ?? ''

  function clearSelectedFile() {
    setSelectedFile(null)
  }

  async function onUpload() {
    const file = selectedFile
    if (!tableName.trim()) {
      toastError(new Error('Please enter table name.'), 'Temporary Staging Tables')
      return
    }
    if (!file) {
      toastError(new Error('Please choose a file.'), 'Temporary Staging Tables')
      return
    }

    setUploading(true)
    try {
      const msg = await uploadTemporaryStagingTable(tableName.trim(), file)
      toastSuccess(msg || 'Upload successful')
      setTableName('')
      clearSelectedFile()
    } catch (err) {
      toastError(err, 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <PageContainer className="space-y-5">
      <PageHeader title="Temporary Staging Tables Bulk Upload" subtitle="Admin / Bulk Uploads" />

      <div className="app-card overflow-hidden">
        <div className="px-4 py-2 border-b border-slate-200 bg-slate-50/60">
          <h2 className="text-[16px] font-semibold text-[hsl(var(--card-title))]">
            Temporary Staging Tables Bulk Upload
          </h2>
        </div>

        <div className="px-4 py-3">
          <div className="border border-slate-200 rounded-lg p-3 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-4">
                <label htmlFor="temp-table-name" className="mb-1 block text-xs font-medium text-slate-700">Table Name</label>
                <Input
                  id="temp-table-name"
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  placeholder="Table Name"
                  className="h-9 text-[12px]"
                />
              </div>
              <div className="md:col-span-8 flex justify-end">
                <a
                  href="/assets/docs/UnitTopic_bulk_upload.xlsx"
                  download
                  className="text-xs text-[hsl(var(--primary))] hover:underline whitespace-nowrap"
                >
                  Download Sample XLSX
                </a>
              </div>
            </div>

            <p className="text-xs font-medium text-slate-700">Upload Tables :</p>
            <div className="space-y-3">
              <FileDropzone
                accept=".xls,.xlsx"
                onFilesChange={(files) => setSelectedFile(files[0] ?? null)}
              >
                <p className="text-xs text-slate-700">Drag and drop XLS/XLSX file here, or click to select</p>
              </FileDropzone>

              {fileName ? (
                <div className="mt-2 inline-flex max-w-full items-center rounded-md border border-dashed border-slate-300 bg-slate-50 px-2.5 py-1.5">
                  <div className="min-w-0 inline-flex items-center gap-1.5">
                    <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />
                    <p className="text-xs text-slate-700 truncate">{fileName}</p>
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

              <div className="pt-2 flex justify-end">
                <Button type="button" className="w-full md:w-40" onClick={() => void onUpload()} disabled={uploading}>
                  <Upload className="h-4 w-4 mr-1.5" />
                  {uploading ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
