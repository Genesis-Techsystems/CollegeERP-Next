'use client'

import { Suspense } from 'react'
import { StudentApplicationsForm } from './StudentApplicationsForm'

export default function StudentApplicationsFormPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
      <StudentApplicationsForm />
    </Suspense>
  )
}
