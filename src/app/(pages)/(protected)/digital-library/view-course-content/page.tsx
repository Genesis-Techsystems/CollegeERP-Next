'use client'

import { Suspense } from 'react'
import { ViewCourseContentPage } from './_components/ViewCourseContentPage'

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ViewCourseContentPage />
    </Suspense>
  )
}
