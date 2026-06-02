'use client'

import { useSearchParams } from 'next/navigation'
import { EnquiryForm } from '../_components/EnquiryForm'

export default function AddEnquiryFormPage() {
  const searchParams = useSearchParams()
  const organizationId = Number(searchParams.get('organizationId')) || undefined
  const collegeId = Number(searchParams.get('collegeId')) || undefined
  const courseId = Number(searchParams.get('courseId')) || undefined

  return (
    <EnquiryForm
      mode="add"
      initialOrgId={organizationId}
      initialCollegeId={collegeId}
      initialCourseId={courseId}
    />
  )
}
