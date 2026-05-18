'use client'

import { Suspense } from 'react'
import { StudentCategoryFeeList } from '../../_components/StudentCategoryFeeList'

export default function LibraryPayListPage() {
  return (
    <Suspense fallback={null}>
      <StudentCategoryFeeList title="Library Fee Payment" payPage="library-fee" />
    </Suspense>
  )
}