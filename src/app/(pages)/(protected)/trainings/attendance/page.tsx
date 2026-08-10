'use client'

import { Suspense } from 'react'
import { TrainingAttendanceSession } from '../_components/TrainingAttendanceSession'

/** Alias of Angular `/trainings/mark-attendance` (registry also lists `attendance`). */
export default function TrainingAttendanceAliasPage() {
  return (
    <Suspense>
      <TrainingAttendanceSession mode="mark" />
    </Suspense>
  )
}
