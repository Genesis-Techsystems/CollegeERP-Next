'use client'

import { Suspense } from 'react'
import { FeeReceiptListPanel } from '../_components/FeeReceiptListPanel'

export default function FeeReceiptsPage() {
  return (
    <Suspense fallback={null}>
      <FeeReceiptListPanel title="Fee Receipts" mode="view" />
    </Suspense>
  )
}
