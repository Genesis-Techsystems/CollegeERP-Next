import { Suspense } from 'react'
import { TimetableRoutePage } from '../_components/TimetableRoutePage'

export default function Page() {
  return (
    <Suspense fallback={<div className="px-6 py-8 text-sm text-slate-600">Loading…</div>}>
      <TimetableRoutePage slug="timetable-allocation" />
    </Suspense>
  )
}
