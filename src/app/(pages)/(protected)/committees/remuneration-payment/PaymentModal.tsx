'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FormModal } from '@/common/components/feedback'
import { Select } from '@/common/components/select'
import { DatePicker } from '@/common/components/date-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GM_CODES } from '@/config/constants/ui'
import { listGeneralDetailsByMaster } from '@/services'
import type { RemunerationPaymentSummary } from '@/types/committees'

type PaymentModalProps = {
  open: boolean
  onClose: () => void
  row: RemunerationPaymentSummary | null
  onSave: (payload: Record<string, unknown>) => void
  isSubmitting?: boolean
}

export function PaymentModal({
  open,
  onClose,
  row,
  onSave,
  isSubmitting,
}: Readonly<PaymentModalProps>) {
  const [receiptDate, setReceiptDate] = useState<Date | null>(new Date())
  const [transactionNo, setTransactionNo] = useState('')
  const [paymentModeId, setPaymentModeId] = useState<string | null>(null)
  const [remarks, setRemarks] = useState('')

  const { data: paymentModes = [] } = useQuery({
    queryKey: ['Committees', 'paymentModes'],
    queryFn: () => listGeneralDetailsByMaster(GM_CODES.PAYMENT_MODE),
    enabled: open,
    staleTime: Number.POSITIVE_INFINITY,
  })

  useEffect(() => {
    if (!open) return
    setReceiptDate(new Date())
    setTransactionNo('')
    setPaymentModeId(null)
    setRemarks('')
  }, [open, row])

  function handleSubmit(e: { preventDefault: () => void }) {
    e.preventDefault()
    if (!row || !paymentModeId || !receiptDate) return
    onSave({
      receiptDate: receiptDate.toISOString().slice(0, 10),
      transactionNo: transactionNo.trim(),
      paymodeCatDetId: Number(paymentModeId),
      paymentModeCatDetId: Number(paymentModeId),
      amount: row.total_amount ?? 0,
      totalAmount: row.total_amount ?? 0,
      remarks: remarks.trim(),
      bankName: row.bank_name ?? '',
      accountNumber: row.account_number ?? '',
      ifscCode: row.ifsc_code ?? '',
      upiId: row.upi_id ?? '',
    })
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Submit Remuneration Payment"
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      submitLabel="Submit Payment"
      size="lg"
      showHeaderDivider
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-[12px]">Profile</Label>
          <Input className="h-9 text-[12px]" value={row?.remuneration_to ?? ''} readOnly />
        </div>
        <div className="space-y-1">
          <Label className="text-[12px]">Role</Label>
          <Input className="h-9 text-[12px]" value={row?.role_name ?? ''} readOnly />
        </div>
        <div className="space-y-1">
          <Label className="text-[12px]">Total Amount</Label>
          <Input className="h-9 text-[12px]" value={String(row?.total_amount ?? '')} readOnly />
        </div>
        <div className="space-y-1">
          <Label className="text-[12px]">Bank Name</Label>
          <Input className="h-9 text-[12px]" value={row?.bank_name ?? ''} readOnly />
        </div>
        <div className="space-y-1">
          <Label className="text-[12px]">Account Number</Label>
          <Input className="h-9 text-[12px]" value={row?.account_number ?? ''} readOnly />
        </div>
        <div className="space-y-1">
          <Label className="text-[12px]">IFSC Code</Label>
          <Input className="h-9 text-[12px]" value={row?.ifsc_code ?? ''} readOnly />
        </div>
        <div className="space-y-1">
          <Label className="text-[12px]">UPI ID</Label>
          <Input className="h-9 text-[12px]" value={row?.upi_id ?? ''} readOnly />
        </div>
        <DatePicker label="Receipt Date" required value={receiptDate} onChange={setReceiptDate} />
        <div className="space-y-1">
          <Label className="text-[12px]">Transaction No *</Label>
          <Input
            className="h-9 text-[12px]"
            value={transactionNo}
            onChange={(e) => setTransactionNo(e.target.value)}
            required
          />
        </div>
        <div className="sm:col-span-2">
          <Select
            label="Payment Mode"
            required
            value={paymentModeId}
            onChange={setPaymentModeId}
            options={paymentModes.map((m) => ({
              value: String(m.generalDetailId),
              label: String(m.generalDetailDisplayName ?? m.generalDetailCode ?? m.generalDetailId),
            }))}
            placeholder="Select payment mode"
            searchable
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-[12px]">Remarks</Label>
          <Input
            className="h-9 text-[12px]"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />
        </div>
      </div>
    </FormModal>
  )
}
