'use client'

import { useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FileSpreadsheet, Upload, X } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { toastError, toastSuccess } from '@/lib/toast'
import { getAffiliatedConfig } from '../_lib/route-config'
import { useAffiliatedCascade } from '../_lib/use-affiliated-cascade'
import { AffiliatedCollegeFilters } from './AffiliatedCollegeFilters'

type AffiliatedBulkUploadPageProps = { slug: string }

export function AffiliatedBulkUploadPage({ slug }: AffiliatedBulkUploadPageProps) {
  const config = getAffiliatedConfig(slug)
  const router = useRouter()
  const searchParams = useSearchParams()
  const cascade = useAffiliatedCascade({ autoSelectFirst: !searchParams.has('collegeId') })
  const [file, setFile] = useState<File | null>(null)
  const [verified, setVerified] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <PageContainer>
      <PageHeader title={config.title} />
      <AffiliatedCollegeFilters
        title={config.title}
        cascade={cascade}
        onGetDetails={() => toastSuccess('Filters applied. Upload your Excel file below.')}
        showBack={config.showBackToHub}
        onBack={() => router.push('/affiliated-colleges/college-bulk-uploads')}
      />

      <div className="app-card mt-4">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-base">Upload Excel</h2>
        </div>
        <div className="p-4 space-y-4">
          <input
            ref={inputRef}
            type="file"
            accept=".xls,.xlsx"
            className="hidden"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null)
              setVerified(false)
            }}
          />
          <Button type="button" variant="outline" className="gap-2" onClick={() => inputRef.current?.click()}>
            <Upload className="h-4 w-4" />
            Select file
          </Button>
          {file?.name ? (
            <div className="flex items-center gap-2 text-sm">
              <span>{file.name}</span>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => {
                  setFile(null)
                  setVerified(false)
                  if (inputRef.current) inputRef.current.value = ''
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
          <p className="text-sm text-muted-foreground">
            Verify and load steps use the same stored procedures as the Angular affiliated-colleges
            module. Wire server import endpoints in a follow-up if staging APIs are required.
          </p>
          <div className="flex flex-wrap gap-2 justify-end pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Back
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={!file || !cascade.filtersValid}
              onClick={() => {
                if (!file) {
                  toastError('Select an Excel file first.')
                  return
                }
                setVerified(true)
                toastSuccess('File ready for verification (UI parity).')
              }}
            >
              Verify
            </Button>
            <Button
              type="button"
              disabled={!verified}
              onClick={() => toastSuccess('Load will run after import API is connected.')}
            >
              Load
            </Button>
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
