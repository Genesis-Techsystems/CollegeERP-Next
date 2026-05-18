'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { PayFeesForm } from '../../payment/pay-fees/PayFeesForm'
import { PageContainer } from '@/components/layout'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

function FeeRefundPaymentContent() {
  const searchParams = useSearchParams()
  const hasRequired =
    searchParams.get('collegeId') &&
    searchParams.get('studentId') &&
    searchParams.get('academicYearId')

  if (!hasRequired) {
    return (
      <PageContainer className="space-y-4">
        <p className="text-sm text-slate-600">
          Select a receipt from Fee Refunds to process a refund payment.
        </p>
        <Button type="button" variant="outline" asChild>
          <Link href="/accounts-and-fees/fees-collection/fee-refunds">Back to Fee Refunds</Link>
        </Button>
      </PageContainer>
    )
  }

  return <PayFeesForm />
}

export default function FeeRefundPaymentPage() {
  return (
    <Suspense fallback={null}>
      <FeeRefundPaymentContent />
    </Suspense>
  )
}
