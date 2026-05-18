'use client'

import { Suspense } from 'react'
import { AddFeeStructureForm } from './AddFeeStructureForm'

export default function AddFeeStructurePage() {
  return (
    <Suspense fallback={null}>
      <AddFeeStructureForm />
    </Suspense>
  )
}
