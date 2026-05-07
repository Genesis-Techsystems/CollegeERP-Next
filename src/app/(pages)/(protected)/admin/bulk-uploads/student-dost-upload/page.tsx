'use client'

import { useMemo, useState } from 'react'
import type { ColDef } from 'ag-grid-community'
import { Upload, X } from 'lucide-react'
import { Upload as AntUpload, type UploadFile, type UploadProps } from 'antd'
import { DataTable } from '@/common/components/table'
import { PageContainer, PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { toastError, toastSuccess } from '@/lib/toast'
import { importDostStudents, type DostUploadRow } from '@/services'

const DOST_COLS: ColDef<DostUploadRow>[] = [
  { headerName: 'SI.No', valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, width: 70, flex: 0 },
  { field: 'nominalRollNumber', headerName: 'Roll Number', minWidth: 130, flex: 0.9 },
  { field: 'applicantName', headerName: 'Applicant Name', minWidth: 170, flex: 1.1 },
  { field: 'collegeName', headerName: 'College Name', minWidth: 180, flex: 1.1 },
  { field: 'courseCategory', headerName: 'Course Category', minWidth: 140, flex: 1 },
  { field: 'mobileNumber', headerName: 'Mobile', minWidth: 120, flex: 0.9 },
  { field: 'dateOfJoining', headerName: 'Date Of Joining', minWidth: 130, flex: 0.9 },
]

export default function StudentDostUploadPage() {
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [rows, setRows] = useState<DostUploadRow[]>([])
  const [uploading, setUploading] = useState(false)

  const selectedFileName = fileList[0]?.name ?? ''

  function clearSelectedFile() {
    setFileList([])
  }

  const uploadProps: UploadProps = {
    accept: '.xls,.xlsx',
    multiple: false,
    fileList,
    showUploadList: false,
    beforeUpload: () => false,
    onChange: ({ fileList: next }) => setFileList(next.slice(-1)),
    onRemove: () => clearSelectedFile(),
  }

  async function onUpload() {
    const file = fileList[0]?.originFileObj
    if (!file) {
      toastError(new Error('Please choose a file.'), 'Dost Upload')
      return
    }
    setUploading(true)
    try {
      const list = await importDostStudents(file)
      setRows(Array.isArray(list) ? list : [])
      toastSuccess('Dost file uploaded successfully')
      clearSelectedFile()
    } catch (err) {
      toastError(err, 'Dost upload failed')
    } finally {
      setUploading(false)
    }
  }

  const hasRows = useMemo(() => rows.length > 0, [rows.length])

  return (
    <PageContainer className="space-y-5">
      <PageHeader title="Dost Upload" subtitle="Admin / Bulk Uploads" />

      <div className="app-card overflow-hidden">
        <div className="px-4 py-2 border-b border-slate-200 bg-slate-50/60">
          <h2 className="text-[16px] font-semibold text-[hsl(var(--card-title))]">Dost Upload</h2>
        </div>

        <div className="px-4 py-3">
          <div className="border border-slate-200 rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-700">Upload Dost</p>
              <a
                href="/assets/docs/DostUpload_bulk_upload.xlsx"
                download
                className="text-xs text-[hsl(var(--primary))] hover:underline whitespace-nowrap"
              >
                Download Sample XLSX
              </a>
            </div>

            <AntUpload.Dragger
              {...uploadProps}
              className="max-w-[760px] !p-0 !mb-0 [&_.ant-upload]:!p-3 [&_.ant-upload]:!min-h-[44px] [&_.ant-upload]:!rounded-md [&_.ant-upload-text]:!m-0"
            >
              <p className="text-xs text-slate-700">Drag and drop XLS/XLSX file here, or click to select</p>
            </AntUpload.Dragger>

            {selectedFileName ? (
              <div className="mt-2 inline-flex max-w-full items-center rounded-md border border-dashed border-slate-300 bg-slate-50 px-2.5 py-1.5">
                <div className="min-w-0 inline-flex items-center gap-1.5">
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

            <div className="pt-2 flex justify-end">
              <Button type="button" className="w-full md:w-40" onClick={() => void onUpload()} disabled={uploading}>
                <Upload className="h-4 w-4 mr-1.5" />
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {hasRows && (
        <div className="app-card p-3">
          <div className="mb-2 border-b border-slate-200 pb-1.5 text-sm font-semibold text-[hsl(var(--primary))]">
            Students Dost Upload List
          </div>
          <DataTable
            rowData={rows}
            columnDefs={DOST_COLS}
            pagination
            toolbar={{ search: true, searchPlaceholder: 'Search dost rows…', columnPicker: false, exportPdf: false }}
          />
        </div>
      )}
    </PageContainer>
  )
}
