'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FormModal } from '@/common/components/feedback'
import { Select } from '@/common/components/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLoginEmployeeId } from '@/hooks/useLoginEmployeeId'
import { useSessionContext } from '@/context/SessionContext'
import { QK } from '@/lib/query-keys'
import { resolveLoginEmployeeId } from '@/lib/user-context'
import { toastError, toastSuccess } from '@/lib/toast'
import { getFeeStudentData, saveFeeStudentWiseDiscount } from '@/services'
import type {
  FeeStudentParticularRow,
  FeeStudentWiseDiscountPayload,
  StudentFeeSearchRow,
  StudentFeeStructureRow,
} from '@/types/fees-collection'

type InstitutionalScholarshipModalProps = {
  readonly open: boolean
  readonly onClose: () => void
  readonly student: StudentFeeSearchRow
  readonly structureRow: StudentFeeStructureRow
  readonly onSaved?: () => void
}

function uniqueCategories(particulars: FeeStudentParticularRow[]): FeeStudentParticularRow[] {
  const seen = new Set<number>()
  const out: FeeStudentParticularRow[] = []
  for (const row of particulars) {
    const id = Number(row.feeCategoryId ?? 0)
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push(row)
  }
  return out
}

export function InstitutionalScholarshipModal({
  open,
  onClose,
  student,
  structureRow,
  onSaved,
}: InstitutionalScholarshipModalProps) {
  const queryClient = useQueryClient()
  const { user, isLoading: sessionLoading } = useSessionContext()
  const { employeeId } = useLoginEmployeeId(user, sessionLoading)

  const collegeId = Number(student.collegeId ?? 0)
  const academicYearId = Number(structureRow.academicYearId ?? 0)
  const studentId = Number(student.studentId ?? 0)
  const feeStructureId = Number(structureRow.feeStructureId ?? 0)

  const [feeCategoryId, setFeeCategoryId] = useState<string | null>(null)
  const [feeParticularsId, setFeeParticularsId] = useState<string | null>(null)
  const [discountAmount, setDiscountAmount] = useState('0')
  const [reason, setReason] = useState('')

  const { data: feeData, isLoading: feeLoading } = useQuery({
    queryKey: ['feeConcession', 'feeStudentData', collegeId, academicYearId, studentId, feeStructureId],
    queryFn: () =>
      getFeeStudentData({ collegeId, academicYearId, studentId, feeStructureId }),
    enabled: open && collegeId > 0 && academicYearId > 0 && studentId > 0 && feeStructureId > 0,
  })

  const particulars = feeData?.feeStudentDataParticulars ?? []
  const categories = useMemo(() => uniqueCategories(particulars), [particulars])

  const categoryOptions = useMemo(
    () =>
      categories.map((c) => ({
        value: String(c.feeCategoryId ?? ''),
        label: String(c.categoryName ?? c.feeCategoryId ?? ''),
      })),
    [categories],
  )

  const filteredParticulars = useMemo(() => {
    const catId = Number(feeCategoryId ?? 0)
    if (!catId) return []
    return particulars.filter((p) => Number(p.feeCategoryId ?? 0) === catId)
  }, [particulars, feeCategoryId])

  const particularOptions = useMemo(
    () =>
      filteredParticulars.map((p) => ({
        value: String(p.feeParticularsId ?? ''),
        label: String(p.particularsName ?? p.feeParticularsId ?? ''),
      })),
    [filteredParticulars],
  )

  const balanceAmount = useMemo(() => {
    if (feeParticularsId) {
      const row = filteredParticulars.find((p) => String(p.feeParticularsId) === feeParticularsId)
      return Number(row?.balanceAmount ?? 0)
    }
    return Number(filteredParticulars[0]?.balanceAmount ?? 0)
  }, [filteredParticulars, feeParticularsId])

  useEffect(() => {
    if (!open) {
      setFeeCategoryId(null)
      setFeeParticularsId(null)
      setDiscountAmount('0')
      setReason('')
    }
  }, [open])

  useEffect(() => {
    setFeeParticularsId(null)
    if (filteredParticulars.length === 1) {
      setFeeParticularsId(String(filteredParticulars[0]?.feeParticularsId ?? ''))
    }
  }, [feeCategoryId, filteredParticulars])

  const saveMutation = useMutation({
    mutationFn: (payload: FeeStudentWiseDiscountPayload[]) => saveFeeStudentWiseDiscount(payload),
    onSuccess: () => {
      toastSuccess('Institutional scholarship saved.')
      void queryClient.invalidateQueries({
        queryKey: QK.feesCollection.studentStructures(studentId),
      })
      onSaved?.()
      onClose()
    },
    onError: (e: Error) => toastError(e, 'Failed to save institutional scholarship'),
  })

  function handleDiscountAmountChange(value: string) {
    const n = Number(value)
    if (Number.isFinite(n) && n > balanceAmount && balanceAmount > 0) {
      toastError('Discount amount is greater than balance amount.')
      setDiscountAmount('0')
      return
    }
    setDiscountAmount(value)
  }

  function handleSubmit(e: { preventDefault: () => void }) {
    e.preventDefault()

    const catId = Number(feeCategoryId ?? 0)
    const amount = Number(discountAmount)
    const comments = reason.trim()

    if (!catId) {
      toastError('Fee category is required.')
      return
    }
    if (!comments) {
      toastError('Reason is required.')
      return
    }
    if (!amount || amount <= 0) {
      toastError('Discount should be greater than 0.')
      return
    }
    if (!feeData?.feeStdDataId) {
      toastError('Fee student data is not loaded.')
      return
    }

    const empId =
      employeeId ||
      resolveLoginEmployeeId(user) ||
      Number(globalThis.localStorage?.getItem('employeeId') ?? 0) ||
      0

    const payload: FeeStudentWiseDiscountPayload = {
      feeCategoryId: catId,
      feeParticularsId: feeParticularsId ? Number(feeParticularsId) : undefined,
      value: amount,
      isActive: true,
      authComments: comments,
      requestedEmployeeId: empId,
      authorizedEmployeeId: empId,
      collegeId,
      studentId,
      feeStructureId: Number(feeData.feeStructureId ?? feeStructureId),
      feeStdDataId: Number(feeData.feeStdDataId),
    }

    saveMutation.mutate([payload])
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Institutional Scholarship"
      titleClassName="inline-flex items-center gap-2 text-[#1e3a5f]"
      onSubmit={handleSubmit}
      isSubmitting={saveMutation.isPending}
      submitLabel="Save"
      cancelLabel="Close"
      size="sm"
      showHeaderDivider
      formClassName="space-y-4"
    >
      {feeLoading ? (
        <p className="text-sm text-slate-500">Loading fee particulars…</p>
      ) : (
        <>
          <Select
            label="Fee Category"
            required
            value={feeCategoryId}
            onChange={setFeeCategoryId}
            options={categoryOptions}
            placeholder="Select fee category"
            searchable
          />
          <Select
            label="Fee Particular"
            value={feeParticularsId}
            onChange={setFeeParticularsId}
            options={particularOptions}
            placeholder="Select fee particular"
            disabled={!feeCategoryId || particularOptions.length === 0}
            searchable
          />
          <FormField
            label="Discount Amount"
            required
            id="discount-amount"
            value={discountAmount}
            onChange={handleDiscountAmountChange}
            type="number"
            min={0}
          />
          <FormField
            label="Reason"
            required
            id="discount-reason"
            value={reason}
            onChange={setReason}
          />
          {feeCategoryId ? (
            <p className="text-sm font-medium text-blue-600">
              Balance Amount is {balanceAmount}
            </p>
          ) : null}
        </>
      )}
    </FormModal>
  )
}

function FormField({
  label,
  required,
  id,
  value,
  onChange,
  type = 'text',
  min,
}: {
  label: string
  required?: boolean
  id: string
  value: string
  onChange: (v: string) => void
  type?: string
  min?: number
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </Label>
      <Input
        id={id}
        type={type}
        min={min}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9"
        required={required}
      />
    </div>
  )
}
