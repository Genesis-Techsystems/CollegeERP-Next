'use client'

import { PaymentNoteRequestForm } from '@/app/(pages)/(protected)/e-office/payment-note-request/_components/PaymentNoteRequestForm'

const PURCHASE_ORDERS_LIST = '/inventory-management/purchase-orders'

export default function AddPurchaseOrderPage() {
  return <PaymentNoteRequestForm listPath={PURCHASE_ORDERS_LIST} />
}
