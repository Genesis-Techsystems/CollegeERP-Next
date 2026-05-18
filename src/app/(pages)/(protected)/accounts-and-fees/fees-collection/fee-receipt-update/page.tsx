'use client'

import { Suspense } from 'react'
import { FeeReceiptListPanel } from '../_components/FeeReceiptListPanel'

export default function FeeReceiptUpdatePage() {
  return (
    <Suspense fallback={null}>
      <FeeReceiptListPanel title="Fee Receipt Update" mode="delete" />
    </Suspense>
  )
}
