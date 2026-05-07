'use client'

import { useMemo, useState } from 'react'
import type { ColDef } from 'ag-grid-community'
import { Upload, type UploadFile, type UploadProps } from 'antd'
import { FileImage, ImageIcon, UploadIcon, X } from 'lucide-react'
import { DataTable } from '@/common/components/table'
import { Select } from '@/common/components/select'
import { PageContainer, PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { MINIO_URL } from '@/config/constants/api'
import { toastError, toastSuccess } from '@/lib/toast'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import {
  listActiveUniversities,
  uploadPhotosBulk,
  verifyPhotosUpload,
  type PhotoPreviewRow,
  type VerifyPhotoRow,
} from '@/services'

type PersonType = 'student' | 'employee'
type UploadRow = PhotoPreviewRow & { previewUrl?: string; fileBase?: string }

function fileToDataUrl(file: File): Promise<string> {
  return new Promise<string>((resolve) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      resolve(typeof result === 'string' ? result : '')
    }
    reader.onerror = () => resolve('')
    reader.readAsDataURL(file)
  })
}

const UPLOADED_COLS: ColDef<UploadRow>[] = [
  { headerName: 'SI.No', valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, width: 70, flex: 0 },
  { field: 'fileName', headerName: 'File Name', minWidth: 180, flex: 1.2 },
  {
    headerName: 'Status',
    minWidth: 110,
    flex: 0.8,
    valueGetter: (p) => (p.data?.status ? String(p.data.status) : 'Pending'),
  },
  {
    headerName: 'View',
    minWidth: 120,
    flex: 0.8,
    cellRenderer: (p: { data?: UploadRow }) => {
      const row = p.data
      if (!row) return null
      const path = row.studentSignaturePath ?? ''
      const src = row.previewUrl || (path ? `${MINIO_URL}${path}` : '')
      if (!src) return <span className="text-xs text-slate-500">—</span>
      return <img src={src} alt={row.fileName} className="h-10 w-10 rounded object-cover border border-slate-200" />
    },
  },
]

const VERIFIED_COLS: ColDef<VerifyPhotoRow>[] = [
  { headerName: 'SI.No', valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, width: 70, flex: 0 },
  { field: 'fileName', headerName: 'File Name', minWidth: 180, flex: 1.1 },
  { field: 'status', headerName: 'Status', minWidth: 140, flex: 0.9 },
  { field: 'message', headerName: 'Message', minWidth: 220, flex: 1.4 },
]

export default function PhotosBulkUploadPage() {
  const [universityCode, setUniversityCode] = useState<string | null>(null)
  const [photoPerson, setPhotoPerson] = useState<PersonType>('student')
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [uploadedRows, setUploadedRows] = useState<UploadRow[]>([])
  const [verifiedRows, setVerifiedRows] = useState<VerifyPhotoRow[]>([])
  const [verifying, setVerifying] = useState(false)
  const [uploading, setUploading] = useState(false)

  const { data: universities, isLoading: loadingUniversities } = useCrudList({
    queryKey: QK.universities.list(),
    queryFn: listActiveUniversities,
  })

  const universityOptions = useMemo(
    () =>
      universities.map((u) => ({
        value: u.universityCode,
        label: u.universityCode,
      })),
    [universities],
  )

  const photoPersonOptions = useMemo(
    () => [
      { value: 'student', label: 'Student' },
      { value: 'employee', label: 'Employee' },
    ],
    [],
  )

  const uploadProps: UploadProps = {
    multiple: true,
    accept: 'image/*',
    beforeUpload: () => false,
    fileList,
    showUploadList: false,
    onChange: async ({ fileList: nextFileList }) => {
      setVerifiedRows([])
      setFileList(nextFileList)

      const rows = await Promise.all(
        nextFileList.map(async (f) => {
          let previewUrl = ''
          if (f.originFileObj) {
            previewUrl = await fileToDataUrl(f.originFileObj as File)
          }
          const fileName = f.name
          const fileBase = fileName.includes('.') ? fileName.slice(0, fileName.lastIndexOf('.')) : fileName
          return { fileName, fileBase, status: 'Pending', previewUrl }
        }),
      )
      setUploadedRows(rows)
    },
  }

  function removeSelectedFile(fileName: string) {
    const next = fileList.filter((f) => f.name !== fileName)
    setFileList(next)
    setUploadedRows((prev) => prev.filter((r) => r.fileName !== fileName))
    setVerifiedRows([])
  }

  function buildFormData(): FormData | null {
    if (!universityCode) {
      toastError(new Error('Please select university.'), 'Photos Bulk Upload')
      return null
    }
    if (fileList.length === 0) {
      toastError(new Error('Please choose photos.'), 'Photos Bulk Upload')
      return null
    }
    const formData = new FormData()
    for (const f of fileList) {
      if (f.originFileObj) formData.append('file', f.originFileObj, f.name)
    }
    formData.append('photoPerson', photoPerson)
    formData.append('universityCode', universityCode)
    return formData
  }

  async function onVerify() {
    const formData = buildFormData()
    if (!formData) return
    setVerifying(true)
    try {
      const rows = await verifyPhotosUpload(formData)
      setVerifiedRows(rows)
      toastSuccess('Verification completed')
    } catch (err) {
      toastError(err, 'Verify photos failed')
    } finally {
      setVerifying(false)
    }
  }

  async function onUpload() {
    const formData = buildFormData()
    if (!formData) return
    setUploading(true)
    try {
      const res = await uploadPhotosBulk(formData)
      toastSuccess(res.message || 'Photos uploaded successfully')
      const withMinio = res.files.map((r) => ({ ...r, previewUrl: '', fileBase: r.fileName }))
      setUploadedRows(withMinio)
      setVerifiedRows([])
      setFileList([])
    } catch (err) {
      toastError(err, 'Upload photos failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <PageContainer className="space-y-5">
      <PageHeader title="Photos Bulk Upload" subtitle="Admin / Bulk Uploads" />

      <div className="app-card overflow-hidden">
        <div className="px-4 py-2 border-b border-slate-200 bg-slate-50/60">
          <h2 className="text-[16px] font-semibold text-[hsl(var(--card-title))]">Photos Bulk Upload</h2>
        </div>

        <div className="px-4 py-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-4">
              <Select
                label="University"
                placeholder="University"
                value={universityCode}
                onChange={setUniversityCode}
                options={universityOptions}
                isLoading={loadingUniversities}
              />
            </div>
            <div className="md:col-span-3">
              <Select
                label="Photo Person"
                placeholder="Photo Person"
                value={photoPerson}
                onChange={(v) => setPhotoPerson((v as PersonType) ?? 'student')}
                options={photoPersonOptions}
              />
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg p-3 space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">Upload Students Photos</h3>
            <Upload.Dragger
              {...uploadProps}
              className="!p-0 [&_.ant-upload]:!p-3 [&_.ant-upload]:!min-h-[44px] [&_.ant-upload-text]:!m-0"
            >
              <p className="text-xs text-slate-700">Drag and drop photos here, or click to select</p>
            </Upload.Dragger>
            {fileList.length > 0 && (
              <div className="pt-2 flex flex-wrap gap-2">
                {fileList.map((f) => (
                  <div
                    key={f.uid}
                    className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-dashed border-slate-300 bg-slate-50 px-2.5 py-1.5"
                  >
                    <FileImage className="h-4 w-4 text-sky-600 shrink-0" />
                    <span className="text-xs text-slate-700 max-w-[220px] truncate">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => removeSelectedFile(f.name)}
                      className="inline-flex h-5 w-5 items-center justify-center rounded text-slate-500 hover:bg-slate-200 hover:text-slate-700 shrink-0"
                      aria-label={`Remove ${f.name}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="pt-2 flex flex-wrap gap-2 justify-end">
              <Button type="button" onClick={() => void onUpload()} disabled={fileList.length === 0 || uploading}>
                <UploadIcon className="h-4 w-4 mr-1.5" />
                {uploading ? 'Uploading...' : 'Upload File'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {uploadedRows.length > 0 && (
        <div className="app-card p-3">
          <div className="mb-2 border-b border-slate-200 pb-1.5 text-sm font-semibold text-[hsl(var(--primary))]">
            Uploaded Files
          </div>
          <DataTable rowData={uploadedRows} columnDefs={UPLOADED_COLS} pagination toolbar={false} />
          <div className="pt-2 flex justify-end">
            <Button type="button" onClick={() => void onVerify()} disabled={uploadedRows.length === 0 || verifying || uploading}>
              <ImageIcon className="h-4 w-4 mr-1.5" />
              {verifying ? 'Verifying...' : 'Verify File'}
            </Button>
          </div>
        </div>
      )}

      {verifiedRows.length > 0 && (
        <div className="app-card p-3">
          <div className="mb-2 text-sm font-semibold text-slate-700">Verified Files</div>
          <DataTable rowData={verifiedRows} columnDefs={VERIFIED_COLS} pagination toolbar={false} />
        </div>
      )}
    </PageContainer>
  )
}
