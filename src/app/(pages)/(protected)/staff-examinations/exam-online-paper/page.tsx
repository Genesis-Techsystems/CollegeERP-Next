'use client'

import { Suspense } from 'react'
import { ExamOnlinePapersPage } from '../_components/ExamOnlinePapersPage'

export default function ExamOnlinePaperRoutePage() {
  return (
    <Suspense fallback={null}>
      <ExamOnlinePapersPage />
    </Suspense>
  )
}
