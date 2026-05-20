'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'

/** Scholarship fee payment — delegates to fees collection payment flow with proceeding context. */
export default function ScholarshipPaymentPage() {
  const searchParams = useSearchParams()
  const schStdPreceedingId = searchParams.get('schStdPreceedingId')
  const schPreceedingId = searchParams.get('schPreceedingId')

  return (
    <PageContainer className="space-y-5">
      <div className="app-card px-6 py-8 text-center space-y-4">
        <h1 className="text-[15px] font-semibold text-[hsl(var(--card-title))]">Scholarship Payment</h1>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto">
          Record fee payment against student proceeding
          {schStdPreceedingId ? ` #${schStdPreceedingId}` : ''}. Use the fee payment screen to complete
          settlement (Angular parity: scholarship-payment component).
        </p>
        <div className="flex justify-center gap-3 flex-wrap">
          <Button asChild>
            <Link href="/accounts-and-fees/fees-collection/payment/pay-fees">Open Fee Payment</Link>
          </Button>
          {schPreceedingId && (
            <Button variant="outline" asChild>
              <Link href={`/scholarship-management/view-std-preceedings?schPreceedingId=${schPreceedingId}`}>
                Back to Students
              </Link>
            </Button>
          )}
        </div>
      </div>
    </PageContainer>
  )
}
