'use client'

import { useMemo, useState } from 'react'
import type { ColDef } from 'ag-grid-community'
import { FileImage, ImageIcon, UploadIcon, X } from 'lucide-react'
import { DataTable } from '@/common/components/table'
import { FileDropzone } from '@/common/components/forms'
import { Select } from '@/common/components/select'
import { FilteredListPage } from '@/components/layout'
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
      if (!src) return <span className="text-xs text-muted-foreground">—</span>
      return <img src={src} alt={row.fileName} className="h-10 w-10 rounded object-cover border border-border" />
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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
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

  async function handleFilesChange(files: File[]) {
    setVerifiedRows([])
    setSelectedFiles(files)

    const rows = await Promise.all(
      files.map(async (file) => {
        const previewUrl = await fileToDataUrl(file)
        const fileName = file.name
        const fileBase = fileName.includes('.') ? fileName.slice(0, fileName.lastIndexOf('.')) : fileName
        return { fileName, fileBase, status: 'Pending', previewUrl }
      }),
    )
    setUploadedRows(rows)
  }

  function removeSelectedFile(fileName: string) {
    const next = selectedFiles.filter((f) => f.name !== fileName)
    setSelectedFiles(next)
    setUploadedRows((prev) => prev.filter((r) => r.fileName !== fileName))
    setVerifiedRows([])
  }

  function buildFormData(): FormData | null {
    if (!universityCode) {
      toastError(new Error('Please select university.'), 'Photos Bulk Upload')
      return null
    }
    if (selectedFiles.length === 0) {
      toastError(new Error('Please choose photos.'), 'Photos Bulk Upload')
      return null
    }
    const formData = new FormData()
    for (const file of selectedFiles) {
      formData.append('file', file, file.name)
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
      setSelectedFiles([])
    } catch (err) {
      toastError(err, 'Upload photos failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <FilteredListPage
      title="Photos Bulk Upload"
      filters={(
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
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

          <div className="space-y-3 rounded-lg border border-border p-3">
            <h3 className="text-sm font-semibold text-slate-700">Upload Students Photos</h3>
            <FileDropzone
              accept="image/*"
              multiple
              onFilesChange={(files) => void handleFilesChange(files)}
            >
              <p className="text-xs text-slate-700">Drag and drop photos here, or click to select</p>
            </FileDropzone>
            {selectedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {selectedFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-dashed border-input bg-muted/40 px-2.5 py-1.5"
                  >
                    <FileImage className="h-4 w-4 shrink-0 text-sky-600" />
                    <span className="max-w-[220px] truncate text-xs text-slate-700">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeSelectedFile(file.name)}
                      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-slate-200 hover:text-slate-700"
                      aria-label={`Remove ${file.name}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <Button type="button" onClick={() => void onUpload()} disabled={selectedFiles.length === 0 || uploading}>
                <UploadIcon className="mr-1.5 h-4 w-4" />
                {uploading ? 'Uploading...' : 'Upload File'}
              </Button>
            </div>
          </div>
        </div>
      )}
      rowData={uploadedRows}
      columnDefs={UPLOADED_COLS}
      pagination
      toolbar={false}
    >
      {uploadedRows.length > 0 && (
        <div className="pt-2 flex justify-end">
          <Button type="button" onClick={() => void onVerify()} disabled={uploadedRows.length === 0 || verifying || uploading}>
            <ImageIcon className="h-4 w-4 mr-1.5" />
            {verifying ? 'Verifying...' : 'Verify File'}
          </Button>
        </div>
      )}
      {verifiedRows.length > 0 && (
        <DataTable
          title="Verified Files"
          subtitle=""
          bordered
          rowData={verifiedRows}
          columnDefs={VERIFIED_COLS}
          pagination
          toolbar={false}
        />
      )}
    </FilteredListPage>
  )
}
