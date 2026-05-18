'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'

export default function EditFeeStructurePage() {
  const params = useParams()
  const feeStructureId = params?.feeStructureId
  const backHref = '/accounts-and-fees/fee-masters/fee-structure'

  return (
    <PageContainer className="space-y-5">
      <div className="app-card overflow-hidden px-4 py-3">
        <h1 className="text-[15px] font-semibold leading-tight text-[hsl(var(--card-title))]">
          Edit Fee Structure
        </h1>
        <p className="mt-2 text-[13px] text-slate-600">
          Edit wizard for fee structure ID {String(feeStructureId)} is not migrated yet. Use the Angular
          app for full edit until this screen is ported.
        </p>
      </div>
      <Button type="button" variant="outline" asChild>
        <Link href={backHref}>Back to Fee Structure</Link>
      </Button>
    </PageContainer>
  )
}
