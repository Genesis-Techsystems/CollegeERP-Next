'use client'

import { useSearchParams } from 'next/navigation'
import { PaymentNoteRequestForm } from '@/app/(pages)/(protected)/e-office/payment-note-request/_components/PaymentNoteRequestForm'

const PURCHASE_ORDERS_LIST = '/inventory-management/purchase-orders'

export default function EditPurchaseOrderPage() {
  const searchParams = useSearchParams()
  const poId = Number(searchParams.get('id') ?? searchParams.get('poId') ?? 0)
  return (
    <PaymentNoteRequestForm
      poId={poId > 0 ? poId : undefined}
      listPath={PURCHASE_ORDERS_LIST}
    />
  )
}
