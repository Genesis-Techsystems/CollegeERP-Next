'use client'

import { Suspense } from 'react'
import { TrainingAttendanceSession } from '../_components/TrainingAttendanceSession'

export default function MarkTrainingAttendancePage() {
  return (
    <Suspense>
      <TrainingAttendanceSession mode="mark" />
    </Suspense>
  )
}
