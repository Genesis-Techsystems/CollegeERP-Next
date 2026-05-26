'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FormModal } from '@/common/components/feedback'
import { Select } from '@/common/components/select'
import { ActiveStatusField } from '@/common/components/forms'
import { DatePicker } from '@/common/components/date-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GM_CODES } from '@/config/constants/ui'
import { listGeneralDetailsByMaster } from '@/services'
import type { UnivCollegeWisePaymentRow } from '@/types/affiliated-colleges'

type ExamPaymentModalProps = {
  open: boolean
  onClose: () => void
  editing: UnivCollegeWisePaymentRow | null
  onSave: (payload: Record<string, unknown>) => void
  isSubmitting?: boolean
}

export function ExamPaymentModal({
  open,
  onClose,
  editing,
  onSave,
  isSubmitting,
}: ExamPaymentModalProps) {
  const [totalStudents, setTotalStudents] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState<Date | null>(new Date())
  const [paymentForCatDetId, setPaymentForCatDetId] = useState<string | null>(null)
  const [paymodeCatDetId, setPaymodeCatDetId] = useState<string | null>(null)
  const [paymentDescription, setPaymentDescription] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [reason, setReason] = useState('active')

  const { data: paymentModes = [] } = useQuery({
    queryKey: ['AffiliatedColleges', 'paymentModes'],
    queryFn: () => listGeneralDetailsByMaster(GM_CODES.PAYMENT_MODE),
    enabled: open,
  })

  const { data: paymentTypes = [] } = useQuery({
    queryKey: ['AffiliatedColleges', 'paymentTypes'],
    queryFn: () => listGeneralDetailsByMaster(GM_CODES.EXAM_FEE_TYPE),
    enabled: open,
  })

  useEffect(() => {
    if (!open) return
    if (editing) {
      setTotalStudents(String(editing.totalStudents ?? ''))
      setTotalAmount(String(editing.totalAmount ?? ''))
      setPaymentDate(editing.paymentDate ? new Date(editing.paymentDate) : new Date())
      setPaymentForCatDetId(
        editing.paymentForCatDetId != null ? String(editing.paymentForCatDetId) : null,
      )
      setPaymodeCatDetId(
        editing.paymodeCatDetId != null ? String(editing.paymodeCatDetId) : null,
      )
      setPaymentDescription(String(editing.paymentDescription ?? editing.paymentDes ?? ''))
      setIsActive(editing.isActive !== false)
      setReason(String(editing.reason ?? 'active'))
    } else {
      setTotalStudents('')
      setTotalAmount('')
      setPaymentDate(new Date())
      setPaymentForCatDetId(null)
      setPaymodeCatDetId(null)
      setPaymentDescription('')
      setIsActive(true)
      setReason('active')
    }
  }, [open, editing])

  function handleSubmit(e: { preventDefault: () => void }) {
    e.preventDefault()
    onSave({
      totalStudents: Number(totalStudents),
      totalAmount: Number(totalAmount),
      paymentDate: paymentDate?.toISOString().slice(0, 10) ?? '',
      paymentForCatDetId: Number(paymentForCatDetId),
      paymodeCatDetId: Number(paymodeCatDetId),
      paymentDescription,
      isActive,
      reason: isActive ? 'active' : reason,
    })
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit Exam Payment Details' : 'Add Exam Payment'}
      titleClassName="text-[15px] font-semibold leading-none text-[#5da394]"
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      submitLabel={editing ? 'Update' : 'Save'}
      cancelLabel="Cancel"
      size="lg"
      showHeaderDivider
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-[12px]">Total Students *</Label>
          <Input
            type="number"
            className="h-9 text-[12px]"
            value={totalStudents}
            onChange={(e) => setTotalStudents(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[12px]">Total Amount *</Label>
          <Input
            type="number"
            className="h-9 text-[12px]"
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
            required
          />
        </div>
        <DatePicker
          label="Payment Date"
          required
          value={paymentDate}
          onChange={setPaymentDate}
        />
        <Select
          label="Payment For"
          required
          value={paymentForCatDetId}
          onChange={setPaymentForCatDetId}
          options={paymentTypes.map((t) => ({
            value: String(t.generalDetailId),
            label: t.generalDetailDisplayName ?? t.generalDetailCode ?? String(t.generalDetailId),
          }))}
          placeholder="Select payment for"
          searchable
        />
        <div className="sm:col-span-2">
          <Select
            label="Payment Mode"
            required
            value={paymodeCatDetId}
            onChange={setPaymodeCatDetId}
            options={paymentModes.map((m) => ({
              value: String(m.generalDetailId),
              label: m.generalDetailDisplayName ?? m.generalDetailCode ?? String(m.generalDetailId),
            }))}
            placeholder="Select payment mode"
            searchable
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-[12px]">Payment Description *</Label>
          <Input
            className="h-9 text-[12px]"
            value={paymentDescription}
            onChange={(e) => setPaymentDescription(e.target.value)}
            required
          />
        </div>
        <div className="sm:col-span-2">
          <ActiveStatusField
            isActive={isActive}
            onActiveChange={(v) => setIsActive(v === true)}
            reason={reason}
            onReasonChange={setReason}
          />
        </div>
      </div>
    </FormModal>
  )
}
