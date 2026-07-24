'use client'

import { Suspense } from 'react'
import { StudentTimetablePage } from '../_components/StudentTimetablePage'

/**
 * Angular `student-academics/student-timetable`.
 * Suspense boundary required for useSearchParams (query-param admin view path).
 */
export default function Page() {
  return (
    <Suspense
      fallback={
        <p className="py-12 text-center text-sm text-muted-foreground">
          Loading timetable…
        </p>
      }
    >
      <StudentTimetablePage />
    </Suspense>
  )
}
