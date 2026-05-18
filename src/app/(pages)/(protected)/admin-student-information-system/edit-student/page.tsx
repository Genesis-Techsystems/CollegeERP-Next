import { Suspense } from 'react'
import { EditStudentForm } from './EditStudentForm'

export const dynamic = 'force-dynamic'

export default function EditStudentPage() {
  return (
    <Suspense fallback={<div className="px-6 py-8 text-sm text-slate-600">Loading…</div>}>
      <EditStudentForm />
    </Suspense>
  )
}
