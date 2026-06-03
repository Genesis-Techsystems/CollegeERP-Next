'use client'

import { useSearchParams } from 'next/navigation'
import { InternalItemReturnForm } from '../_components/InternalItemReturnForm'

export default function EditInternalItemReturnPage() {
  const searchParams = useSearchParams()
  const interReturnId = Number(searchParams.get('id') ?? searchParams.get('interReturnId') ?? 0)
  return (
    <InternalItemReturnForm
      interReturnId={interReturnId > 0 ? interReturnId : undefined}
    />
  )
}
