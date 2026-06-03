'use client'

import { useSearchParams } from 'next/navigation'
import { EnquiryForm } from '../_components/EnquiryForm'

export default function EditEnquiryFormPage() {
  const searchParams = useSearchParams()
  const enquiryId = Number(searchParams.get('enquiryId')) || undefined

  if (!enquiryId) {
    return (
      <div className="app-card p-6 text-center text-sm text-muted-foreground">
        Missing enquiry id. Open this page from the enquiry list.
      </div>
    )
  }

  return <EnquiryForm mode="edit" enquiryId={enquiryId} />
}
