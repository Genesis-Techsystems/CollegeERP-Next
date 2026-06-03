'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { generateLibraryMemberBarcode } from '@/services'
import { toastError, toastSuccess } from '@/lib/toast'
import { LibraryScreenShell } from '../_components/LibraryScreenShell'

/** Membership barcode — Angular “Generate Member BarCode” on membership list. */
export default function MembershipBarcodePage() {
  const [generating, setGenerating] = useState(false)

  async function handleGenerate() {
    setGenerating(true)
    try {
      await generateLibraryMemberBarcode()
      toastSuccess('Member barcodes generated')
    } catch (e) {
      toastError(e, 'Could not generate member barcodes')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <LibraryScreenShell
      title="Membership Barcode"
      action={
        <Button
          type="button"
          size="sm"
          className="h-8 px-3 text-[12px]"
          disabled={generating}
          onClick={() => void handleGenerate()}
        >
          Generate Member Barcode
        </Button>
      }
    >
      <div className="app-card p-6">
        <p className="text-sm text-muted-foreground">
          Generates library membership barcodes for members (same action as the Angular membership screen).
          Use the Membership page to search members; use this screen to run bulk barcode generation.
        </p>
      </div>
    </LibraryScreenShell>
  )
}
