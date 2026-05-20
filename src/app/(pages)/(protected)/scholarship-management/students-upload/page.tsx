'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { uploadStdPreceedings } from '@/services'
import { toastError, toastSuccess } from '@/lib/toast'

export default function StudentsUploadPage() {
  const searchParams = useSearchParams()
  const schPreceedingId = searchParams.get('schPreceedingId')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  async function handleUpload() {
    if (!file || !schPreceedingId) {
      toastError('Select a proceeding and Excel file')
      return
    }
    const formData = new FormData()
    formData.append('file', file)
    formData.append('schPreceedingId', schPreceedingId)
    setUploading(true)
    try {
      await uploadStdPreceedings(formData)
      toastSuccess('Students uploaded successfully')
      setFile(null)
    } catch (err) {
      toastError(err, 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <PageContainer className="space-y-5">
      <div className="app-card overflow-hidden px-4 py-3 flex items-center justify-between">
        <h1 className="text-[15px] font-semibold leading-tight text-[hsl(var(--card-title))]">
          Upload Student Proceedings
          {schPreceedingId ? ` — Proceeding #${schPreceedingId}` : ''}
        </h1>
        <Button variant="outline" size="sm" asChild>
          <Link href="/scholarship-management/preceeding-details">Back</Link>
        </Button>
      </div>
      <div className="app-card p-6 space-y-4 max-w-lg">
        <p className="text-sm text-muted-foreground">
          Upload an Excel file with student proceeding rows for the selected government proceeding.
        </p>
        <input
          type="file"
          accept=".xlsx,.xls"
          className="block w-full text-sm"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <Button disabled={!file || uploading} onClick={() => void handleUpload()}>
          {uploading ? 'Uploading…' : 'Upload Excel'}
        </Button>
      </div>
    </PageContainer>
  )
}
