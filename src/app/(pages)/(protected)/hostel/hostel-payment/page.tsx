'use client'

import Link from 'next/link'
import { PageContainer } from '@/components/layout'
import { HostelPageTitle } from '../_components/HostelPageTitle'

export default function HostelPaymentPage() {
  return (
    <PageContainer className="space-y-5">
      <HostelPageTitle title="Hostel Payment" />
      <div className="app-card space-y-3 p-6 text-sm text-muted-foreground">
        <p>
          Hostel fee collection in Angular uses allocated rooms and fee structures. Use Accounts
          &amp; Fees → Pay Fees for student payments, or complete room allocation first.
        </p>
        <Link
          href="/accounts-and-fees/fees-collection/payment/pay-fees"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Go to Pay Fees
        </Link>
      </div>
    </PageContainer>
  )
}
