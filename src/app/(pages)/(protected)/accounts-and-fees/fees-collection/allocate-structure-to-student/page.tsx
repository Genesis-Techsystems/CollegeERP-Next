'use client'

import { Suspense } from 'react'
import { AllocateStructureToStudentPanel } from '../_components/AllocateStructureToStudentPanel'

export default function AllocateStructureToStudentPage() {
  return (
    <Suspense fallback={null}>
      <AllocateStructureToStudentPanel />
    </Suspense>
  )
}
