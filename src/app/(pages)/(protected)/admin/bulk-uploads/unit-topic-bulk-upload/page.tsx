'use client'

import { useState } from 'react'
import { FileSpreadsheet, UploadIcon, X } from 'lucide-react'
import { Upload, type UploadFile, type UploadProps } from 'antd'
import { PageContainer, PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { toastError, toastSuccess } from '@/lib/toast'
import { uploadUnitTopicsFile } from '@/services'

export default function UnitTopicBulkUploadPage() {
  const [uploading, setUploading] = useState(false)
  const [selectedFileName, setSelectedFileName] = useState('')
  const [fileList, setFileList] = useState<UploadFile[]>([])

  function clearSelectedFile() {
    setSelectedFileName('')
    setFileList([])
  }

  async function onUpload() {
    const file = fileList[0]?.originFileObj
    if (!file) {
      toastError(new Error('Please choose a file.'), 'Unit Topic Bulk Upload')
      return
    }

    setUploading(true)
    try {
      const summary = await uploadUnitTopicsFile(file)
      const totalUnits = Number(summary.totalUnitsUploaded ?? 0)
      const totalUnitTopics = Number(summary.totalUnitTopicsUploaded ?? 0)
      toastSuccess(`Total Units - ${totalUnits} and Total UnitTopics - ${totalUnitTopics}`)
      clearSelectedFile()
    } catch (err) {
      toastError(err, 'Unit Topic Bulk Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const uploadProps: UploadProps = {
    accept: '.xls,.xlsx',
    multiple: false,
    fileList,
    showUploadList: false,
    beforeUpload: () => false,
    onChange: ({ fileList: nextFileList }) => {
      const single = nextFileList.slice(-1)
      setFileList(single)
      setSelectedFileName(single[0]?.name ?? '')
    },
    onRemove: () => {
      clearSelectedFile()
    },
  }

  return (
    <PageContainer className="space-y-5">
      <PageHeader title="Unit Topic Bulk Upload" subtitle="Admin / Bulk Uploads" />

      <div className="app-card overflow-hidden">
        <div className="px-4 py-2 border-b border-slate-200 bg-slate-50/60">
          <h2 className="text-[16px] font-semibold text-[hsl(var(--card-title))]">Unit Topic Bulk Upload</h2>
        </div>

        <div className="px-4 py-3">
          <div className="border border-slate-200 rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-700">Upload Unit Topics :</p>
              <a
                href="/assets/docs/Subject_UnitTopic_bulk_upload.xlsx"
                download
                className="text-xs text-[hsl(var(--primary))] hover:underline whitespace-nowrap"
              >
                Download Sample XLSX
              </a>
            </div>
            <div className="space-y-3">
              <Upload.Dragger
                {...uploadProps}
                className="max-w-[760px] !p-0 !mb-0 [&_.ant-upload]:!p-3 [&_.ant-upload]:!min-h-[44px] [&_.ant-upload]:!rounded-md [&_.ant-upload-drag-container]:!p-0 [&_.ant-upload-text]:!m-0 [&_.ant-upload-hint]:!m-0"
              >
                <p className="text-xs text-slate-700">Drag and drop XLS/XLSX file here, or click to select</p>
              </Upload.Dragger>
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
              <div className="pt-3 flex justify-end">
                <Button type="button" className="w-full md:w-40" onClick={() => void onUpload()} disabled={uploading}>
                  <UploadIcon className="h-4 w-4 mr-1.5" />
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
