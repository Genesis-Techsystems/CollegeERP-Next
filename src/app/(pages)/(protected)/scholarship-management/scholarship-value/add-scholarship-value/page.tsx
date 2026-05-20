'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ScholarshipStructureForm } from '../_components/ScholarshipStructureForm'

function parseId(value: string | null): number | undefined {
  if (!value) return undefined
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

export default function AddScholarshipValuePage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const universityId = parseId(searchParams.get('universityId'))
  const collegeId = parseId(searchParams.get('collegeId'))
  const courseId = parseId(searchParams.get('courseId'))
  const batchId = parseId(searchParams.get('batchId'))
  const academicYearId = parseId(searchParams.get('academicYearId'))

  const contextReady =
    universityId != null &&
    collegeId != null &&
    courseId != null &&
    (batchId != null || academicYearId != null)

  useEffect(() => {
    if (!contextReady) {
      router.replace('/scholarship-management/scholarship-value')
    }
  }, [contextReady, router])

  if (!contextReady) {
    return null
  }

  return (
    <ScholarshipStructureForm
      mode="add"
      universityId={universityId}
      collegeId={collegeId}
      courseId={courseId}
      batchId={batchId}
      academicYearId={academicYearId}
    />
  )
}
