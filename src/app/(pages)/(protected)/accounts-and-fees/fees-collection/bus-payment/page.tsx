'use client'

import { Suspense } from 'react'
import { StudentCategoryFeeList } from '../_components/StudentCategoryFeeList'

export default function BusPaymentPage() {
  return (
    <Suspense fallback={null}>
      <StudentCategoryFeeList title="Bus Fee Payment" payPage="bus-fee" />
    </Suspense>
  )
}