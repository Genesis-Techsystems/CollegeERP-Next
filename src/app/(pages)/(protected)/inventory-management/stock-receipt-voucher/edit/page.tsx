'use client'

import { useSearchParams } from 'next/navigation'
import { StockReceiptVoucherForm } from '../_components/StockReceiptVoucherForm'

export default function EditStockReceiptVoucherPage() {
  const searchParams = useSearchParams()
  const srvId = Number(searchParams.get('id') ?? searchParams.get('srvId') ?? 0)
  return <StockReceiptVoucherForm srvId={srvId > 0 ? srvId : undefined} />
}
