'use client'

import Link from 'next/link'
import { FilterCard } from '@/common/components/feedback'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'

export function FeesCollectionPlaceholder({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <PageContainer className="space-y-5">
      <FilterCard title={title}>
        <p className="text-[13px] text-slate-600">
          {description ?? 'This screen is queued for migration from Angular. Core payment flows are available under Payment.'}
        </p>
      </FilterCard>
      <Button type="button" variant="outline" asChild>
        <Link href="/accounts-and-fees/fees-collection/payment/student-fee-collection">
          Student Fee Collection
        </Link>
      </Button>
    </PageContainer>
  )
}
