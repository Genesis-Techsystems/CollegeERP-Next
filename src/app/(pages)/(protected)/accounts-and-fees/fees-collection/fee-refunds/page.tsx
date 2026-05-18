'use client'

import { Suspense } from 'react'
import { FeeReceiptListPanel } from '../_components/FeeReceiptListPanel'

export default function FeeRefundsPage() {
  return (
    <Suspense fallback={null}>
      <FeeReceiptListPanel title="Fee Refunds" mode="refund" />
    </Suspense>
  )
}
