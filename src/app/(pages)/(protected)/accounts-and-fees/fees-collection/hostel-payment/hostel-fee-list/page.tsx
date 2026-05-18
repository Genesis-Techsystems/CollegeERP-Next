'use client'

import { Suspense } from 'react'
import { StudentCategoryFeeList } from '../../_components/StudentCategoryFeeList'

export default function HostelFeeListPage() {
  return (
    <Suspense fallback={null}>
      <StudentCategoryFeeList title="Hostel Fee Payment" payPage="hostel-fee" />
    </Suspense>
  )
}