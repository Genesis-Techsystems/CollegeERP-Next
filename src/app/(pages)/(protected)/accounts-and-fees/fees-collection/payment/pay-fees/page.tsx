'use client'

import { Suspense } from 'react'
import { PayFeesForm } from './PayFeesForm'

export default function PayFeesPage() {
  return (
    <Suspense fallback={null}>
      <PayFeesForm />
    </Suspense>
  )
}
