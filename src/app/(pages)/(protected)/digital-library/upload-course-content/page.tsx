'use client'

import { Suspense } from 'react'
import { UploadCourseContentPage } from './_components/UploadCourseContentPage'

export default function Page() {
  return (
    <Suspense fallback={null}>
      <UploadCourseContentPage />
    </Suspense>
  )
}
