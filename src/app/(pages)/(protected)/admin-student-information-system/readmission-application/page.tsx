import { Suspense } from 'react'
import { ReadmissionApplicationForm } from './ReadmissionApplicationForm'

export const dynamic = 'force-dynamic'

export default function ReadmissionApplicationPage() {
  return (
    <Suspense fallback={<div className="px-6 py-8 text-sm text-slate-600">Loading…</div>}>
      <ReadmissionApplicationForm />
    </Suspense>
  )
}
