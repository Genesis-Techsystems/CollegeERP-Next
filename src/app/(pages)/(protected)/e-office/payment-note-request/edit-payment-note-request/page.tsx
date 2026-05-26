'use client'

import { useSearchParams } from 'next/navigation'
import { PaymentNoteRequestForm } from '../_components/PaymentNoteRequestForm'

export default function EditPaymentNoteRequestPage() {
  const searchParams = useSearchParams()
  const poId = Number(searchParams.get('poId') ?? 0)
  return <PaymentNoteRequestForm poId={poId > 0 ? poId : undefined} />
}
