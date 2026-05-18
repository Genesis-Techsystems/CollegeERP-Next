'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { FilterCard, FILTER_CARD_SELECT_CLASS, ConfirmDialog } from '@/common/components/feedback'
import { Select } from '@/common/components/select'
import { DatePicker } from '@/common/components/date-picker'
import { Table, type TableColumn } from '@/common/components/table'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { QK } from '@/lib/query-keys'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  getFeePaymentLookups,
  getFeeStudentData,
  getFinancialYearForReceiptDate,
  listFeeStructureParticularsForPayment,
  submitFeeReceipt,
} from '@/services'
import type { FeeStudentParticularRow } from '@/types/fees-collection'

type ParticularPayRow = FeeStudentParticularRow & { payAmount: number }

function statusClass(code?: string) {
  const c = String(code ?? '').toUpperCase()
  if (c === 'DTND') return 'text-red-600'
  if (c === 'INCOLLEGE') return 'text-green-700'
  if (c === 'PASSEDOUT') return 'text-blue-600'
  return 'text-slate-700'
}

export function PayFeesForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const collegeId = Number(searchParams.get('collegeId') ?? 0)
  const academicYearId = Number(searchParams.get('academicYearId') ?? 0)
  const studentId = Number(searchParams.get('studentId') ?? 0)
  const feeStructureId = Number(searchParams.get('feeStructureId') ?? 0)
  const backPage = searchParams.get('page') ?? 'fee-payment'

  const params = useMemo(
    () => ({
      collegeCode: searchParams.get('collegeCode') ?? '',
      academicYear: searchParams.get('academicYear') ?? '',
      courseCode: searchParams.get('courseCode') ?? '',
      groupCode: searchParams.get('groupCode') ?? '',
      courseYearName: searchParams.get('courseYearName') ?? '',
      section: searchParams.get('section') ?? '',
      quotaDisplayName: searchParams.get('quotaDisplayName') ?? '',
      studentStatusCode: searchParams.get('studentStatusCode') ?? '',
      studentStatusDisplayName: searchParams.get('studentStatusDisplayName') ?? '',
      isLateral: searchParams.get('isLateral') === 'true',
      firstName: searchParams.get('firstName') ?? '',
      hallTicketNo: searchParams.get('hallTicketNo') ?? searchParams.get('rollNumber') ?? '',
    }),
    [searchParams],
  )

  const [paymentAmount, setPaymentAmount] = useState('')
  const [payRows, setPayRows] = useState<ParticularPayRow[]>([])
  const [paymentModeId, setPaymentModeId] = useState<string | null>('131')
  const [paymentTypeId, setPaymentTypeId] = useState<string | null>(null)
  const [receiptDate, setReceiptDate] = useState<Date | null>(new Date())
  const [paymentFor, setPaymentFor] = useState('')
  const [fineReason, setFineReason] = useState('')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [transactionNo, setTransactionNo] = useState('')
  const [chequeNo, setChequeNo] = useState('')
  const [ddno, setDdno] = useState('')
  const [otherPaymentNumber, setOtherPaymentNumber] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)

  const listReady = collegeId > 0 && academicYearId > 0 && studentId > 0 && feeStructureId > 0

  const { data: lookups } = useQuery({
    queryKey: ['feesCollection', 'paymentLookups'],
    queryFn: getFeePaymentLookups,
  })

  const { data: feeStudentData, isLoading, refetch } = useQuery({
    queryKey: QK.feesCollection.studentStructures(studentId),
    queryFn: () =>
      getFeeStudentData({ collegeId, academicYearId, studentId, feeStructureId }),
    enabled: listReady,
  })

  const { data: structureParticulars = [] } = useQuery({
    queryKey: ['feesCollection', 'structureParticulars', feeStructureId],
    queryFn: () => listFeeStructureParticularsForPayment(feeStructureId),
    enabled: feeStructureId > 0,
  })

  const { data: financialYears = [] } = useQuery({
    queryKey: ['feesCollection', 'financialYear', collegeId, receiptDate?.toISOString()],
    queryFn: () => getFinancialYearForReceiptDate(collegeId, receiptDate ?? new Date()),
    enabled: collegeId > 0 && !!receiptDate,
  })

  useEffect(() => {
    const rows = feeStudentData?.feeStudentDataParticulars ?? []
    setPayRows(
      rows.map((r) => ({
        ...r,
        payAmount: 0,
      })),
    )
  }, [feeStudentData])

  const paymentModeOptions = useMemo(
    () =>
      (lookups?.paymentModes ?? []).map((m) => ({
        value: String(m.generalDetailId),
        label: String(m.generalDetailDisplayName ?? m.generalDetailName ?? ''),
      })),
    [lookups],
  )

  const paymentTypeOptions = useMemo(
    () =>
      (lookups?.paymentTypes ?? []).map((t) => ({
        value: String(t.generalDetailId),
        label: String(t.generalDetailDisplayName ?? t.generalDetailName ?? ''),
      })),
    [lookups],
  )

  const selectedMode = lookups?.paymentModes.find(
    (m) => String(m.generalDetailId) === paymentModeId,
  )
  const modeCode = String(selectedMode?.generalDetailCode ?? '').toUpperCase()

  const balanceAmount = Number(feeStudentData?.balanceAmount ?? 0)
  const payAmountNum = Number(paymentAmount) || 0
  const allocatedSum = payRows.reduce((s, r) => s + (Number(r.payAmount) || 0), 0)
  const equalAmount = Math.round((payAmountNum - allocatedSum) * 100) / 100
  const canPay =
    financialYears.length > 0 &&
    payAmountNum > 0 &&
    payAmountNum <= balanceAmount &&
    equalAmount === 0 &&
    !!paymentTypeId &&
    !!paymentModeId

  const distributeToParticulars = useCallback(
    (total: number) => {
      let remaining = total
      setPayRows((prev) =>
        prev.map((row) => {
          const bal = Number(row.balanceAmount ?? 0)
          if (bal <= 0 || remaining <= 0) return { ...row, payAmount: 0 }
          const pay = Math.min(bal, remaining)
          remaining -= pay
          return { ...row, payAmount: pay }
        }),
      )
    },
    [],
  )

  function handlePaymentAmountChange(value: string) {
    setPaymentAmount(value)
    const num = Number(value)
    if (Number.isFinite(num) && num > 0 && num <= balanceAmount) {
      distributeToParticulars(num)
    } else if (!value) {
      setPayRows((prev) => prev.map((r) => ({ ...r, payAmount: 0 })))
    }
  }

  function updateParticularPay(index: number, value: string) {
    const num = Number(value) || 0
    const row = payRows[index]
    if (!row) return
    if (num > Number(row.balanceAmount ?? 0)) {
      toastError('Pay amount should be less than balance amount.')
      return
    }
    setPayRows((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], payAmount: num }
      return next
    })
    const names = payRows
      .map((r, i) => (i === index ? num : r.payAmount) > 0 ? r.particularsName : null)
      .filter(Boolean)
    setPaymentFor(names.join(', '))
  }

  const payMutation = useMutation({
    mutationFn: submitFeeReceipt,
    onSuccess: () => {
      toastSuccess('Fee payment saved successfully.')
      setConfirmOpen(false)
      goBack()
    },
    onError: (e: Error) => toastError(e.message ?? 'Payment failed.'),
  })

  function goBack() {
    if (backPage === 'student-fee-collection') {
      const q = new URLSearchParams({
        collegeId: String(collegeId),
        academicYearId: String(academicYearId),
      })
      const courseId = searchParams.get('courseId')
      const courseGroupId = searchParams.get('courseGroupId')
      const courseYearId = searchParams.get('courseYearId')
      const quotaId = searchParams.get('quotaId')
      if (courseId) q.set('courseId', courseId)
      if (courseGroupId) q.set('courseGroupId', courseGroupId)
      if (courseYearId) q.set('courseYearId', courseYearId)
      if (quotaId) q.set('quotaId', quotaId)
      router.push(`/accounts-and-fees/fees-collection/payment/student-fee-collection?${q}`)
      return
    }
    router.push(
      `/accounts-and-fees/fees-collection/payment/fee-payment?studentId=${studentId}&collegeId=${collegeId}`,
    )
  }

  function buildReceiptPayload() {
    const fy = financialYears[0]
    const payerStd = lookups?.payerTypes.find((p) => p.generalDetailCode === 'STD')
    const paymentType = lookups?.paymentTypes.find(
      (t) => String(t.generalDetailId) === paymentTypeId,
    )
    const isScholarship = paymentType?.generalDetailCode === 'SCHOLARSHIP'

    const feeParticularwisePayments: FeeStudentParticularRow[] = []
    for (const row of payRows) {
      const pay = Number(row.payAmount) || 0
      const bal = Number(row.balanceAmount ?? 0)
      if (bal <= 0 || pay <= 0) continue
      const match = structureParticulars.find(
        (sp) =>
          Number(sp.feeStructureId ?? feeStructureId) === feeStructureId &&
          Number(sp.feeCategoryId) === Number(row.feeCategoryId) &&
          Number(sp.feeParticularsId) === Number(row.feeParticularsId),
      )
      const line: FeeStudentParticularRow = {
        ...row,
        amount: pay,
        payerName: feeStudentData?.firstName,
        financialYearId: fy?.financialYearId,
        feeStructureParticularId: match?.feeStructureParticularId as number | undefined,
        paidAmount: isScholarship && row.categoryName === 'TUTION FEE' ? pay : pay,
        scholarshipAmount:
          isScholarship && row.categoryName === 'TUTION FEE' ? pay : row.scholarshipAmount,
      }
      feeParticularwisePayments.push(line)
    }

    let notes = paymentFor
    if (fineReason.trim()) notes = `${notes}${notes ? ' - ' : ''}${fineReason}`

    const empId =
      Number(globalThis.localStorage?.getItem('employeeId') ?? 0) ||
      Number(globalThis.sessionStorage?.getItem('employeeId') ?? 0) ||
      0

    return {
      paymentFor: notes,
      fineReason,
      receiptDt: receiptDate ?? new Date(),
      amount: payAmountNum,
      paymentTypeId: Number(paymentTypeId),
      paymentModeId: Number(paymentModeId),
      transactionNo: transactionNo || undefined,
      otherPaymentNumber: otherPaymentNumber || undefined,
      referenceNumber: referenceNumber || undefined,
      ddno: ddno || undefined,
      chequeNo: chequeNo || undefined,
      collegeId,
      academicYearId,
      studentId,
      financialYearId: Number(fy?.financialYearId ?? 0),
      isFeeRefund: false,
      receiptAmount: payAmountNum,
      feeStdDataId: Number(feeStudentData?.feeStdDataId ?? 0),
      revertbByEmployeeId: empId || undefined,
      feeParticularwisePayments,
      payerTypeId: payerStd?.generalDetailId,
    }
  }

  function handleConfirmPay() {
    if (!canPay) {
      toastError('Complete payment details and match particular amounts to the payment total.')
      return
    }
    payMutation.mutate(buildReceiptPayload())
  }

  const tableColumns: TableColumn<ParticularPayRow>[] = [
    { id: 'si', label: 'SI.No', width: 6, render: (_, i) => i + 1 },
    {
      id: 'name',
      label: 'Particulars',
      width: 28,
      render: (r) => `${r.categoryName ?? ''} - ${r.particularsName ?? ''}`,
    },
    { id: 'grossAmount', label: 'Gross', width: 10 },
    { id: 'discountAmount', label: 'Dis', width: 8 },
    { id: 'scholarshipAmount', label: 'RTF', width: 8 },
    { id: 'fineAmount', label: 'LateFee', width: 8 },
    { id: 'paidAmount', label: 'Paid', width: 8 },
    { id: 'balanceAmount', label: 'Bal', width: 8 },
    {
      id: 'payAmount',
      label: 'Pay Amt',
      width: 12,
      render: (row, index) =>
        Number(row.balanceAmount ?? 0) > 0 ? (
          <Input
            type="number"
            className="h-8 w-24 text-right text-[13px]"
            min={0}
            value={row.payAmount || ''}
            onChange={(e) => updateParticularPay(index, e.target.value)}
            disabled={!payAmountNum}
          />
        ) : (
          <span className="text-xs text-green-700">Paid</span>
        ),
    },
  ]

  if (!listReady) {
    return (
      <PageContainer className="space-y-5">
        <FilterCard title="Pay Fees">
          <p className="text-[13px] text-red-600">
            Missing payment context. Open this page from Student Fee Collection or Fee Payment.
          </p>
          <Button type="button" variant="outline" asChild className="mt-3">
            <Link href="/accounts-and-fees/fees-collection/payment/fee-payment">Fee Payment</Link>
          </Button>
        </FilterCard>
      </PageContainer>
    )
  }

  return (
    <PageContainer className="space-y-5">
      <FilterCard title="Pay Fees">
        {feeStudentData ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[120px_1fr]">
              {feeStudentData.studentPhotoPath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={String(feeStudentData.studentPhotoPath)}
                  alt=""
                  className="h-28 w-28 rounded-md border object-cover"
                  onError={(e) => {
                    e.currentTarget.src = '/assets/images/no-img-logo.png'
                  }}
                />
              ) : (
                <div className="h-28 w-28 rounded-md border bg-slate-100" />
              )}
              <div className="space-y-1 text-[13px] text-slate-600">
                <p className="text-base font-semibold text-slate-900">
                  {feeStudentData.firstName ?? params.firstName}{' '}
                  <span className="text-blue-600">
                    ({params.isLateral ? 'LATERAL' : 'REGULAR'})
                  </span>
                </p>
                <p>{params.hallTicketNo}</p>
                <p>
                  {params.collegeCode} / {feeStudentData.studentAcademicYear ?? params.academicYear} /{' '}
                  {params.courseCode} / {feeStudentData.studentGroupCode ?? params.groupCode} /{' '}
                  {feeStudentData.studentCourseYearName ?? params.courseYearName} / Section{' '}
                  {feeStudentData.studentSection ?? params.section}
                </p>
                <p>{feeStudentData.mobile}</p>
                <p>
                  Quota: <span className="text-blue-600">{params.quotaDisplayName || '—'}</span>
                </p>
                <p>
                  Student Status:{' '}
                  <span className={statusClass(params.studentStatusCode)}>
                    {params.studentStatusDisplayName || '—'}
                  </span>
                </p>
              </div>
            </div>

            <div className="rounded-md bg-[#c3d9ff] px-3 py-2 text-[13px]">
              Payment for{' '}
              <span className="font-medium text-blue-700">
                {params.collegeCode} / {params.academicYear} / {params.courseCode} /{' '}
                {params.groupCode} / {params.courseYearName}
              </span>
            </div>
          </div>
        ) : null}
      </FilterCard>

      {feeStudentData && balanceAmount > 0 ? (
        <>
          <FilterCard title="Payment">
            {financialYears.length === 0 ? (
              <p className="mb-3 text-[13px] text-red-600">
                No financial year found for the selected payment date. Contact system admin.
              </p>
            ) : null}
            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Summary label="Total Amount to Pay (₹)" value={feeStudentData.netAmount} />
              <Summary label="Total Est. RTF (₹)" value={feeStudentData.scholarshipHoldAmount} />
              <Summary label="Total Received RTF (₹)" value={feeStudentData.scholarshipAmount} />
              <Summary label="Total Amount Paid (₹)" value={feeStudentData.paidAmount} />
              <Summary label="Total Due (₹)" value={feeStudentData.balanceAmount} highlight />
              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium text-[#334155]">Payment Amount (₹) *</Label>
                <Input
                  type="number"
                  className="h-10 text-lg font-semibold"
                  min={0}
                  value={paymentAmount}
                  onChange={(e) => handlePaymentAmountChange(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Select
                className={FILTER_CARD_SELECT_CLASS}
                label="Pay Mode"
                required
                value={paymentModeId}
                onChange={setPaymentModeId}
                options={paymentModeOptions}
              />
              <Select
                className={FILTER_CARD_SELECT_CLASS}
                label="Payment Type"
                required
                value={paymentTypeId}
                onChange={setPaymentTypeId}
                options={paymentTypeOptions}
                searchable
              />
              {modeCode.includes('CHQ') || paymentModeId === '133' ? (
                <Field label="Cheque Number" value={chequeNo} onChange={setChequeNo} />
              ) : null}
              {modeCode.includes('DD') || paymentModeId === '134' ? (
                <Field label="DD Number" value={ddno} onChange={setDdno} />
              ) : null}
              {modeCode.includes('CASH') || paymentModeId === '131' ? (
                <Field label="Reference Number" value={referenceNumber} onChange={setReferenceNumber} />
              ) : null}
              {paymentModeId === '135' ? (
                <Field label="Other Payment Number" value={otherPaymentNumber} onChange={setOtherPaymentNumber} />
              ) : null}
              {modeCode.includes('NEFT') || modeCode.includes('TRANS') || paymentModeId === '132' ? (
                <Field label="Transaction Number" value={transactionNo} onChange={setTransactionNo} />
              ) : null}
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-12">
              <div className="lg:col-span-2">
                <DatePicker
                  label="Payment Date"
                  required
                  value={receiptDate}
                  onChange={setReceiptDate}
                />
              </div>
              <div className="lg:col-span-5">
                <Field label="Payment Notes" value={paymentFor} onChange={setPaymentFor} />
              </div>
              <div className="lg:col-span-3">
                <Field label="LateFee Reason" value={fineReason} onChange={setFineReason} />
              </div>
              <div className="flex items-end gap-2 lg:col-span-2">
                <Button type="button" disabled={!canPay} onClick={() => setConfirmOpen(true)}>
                  Pay fees
                </Button>
              </div>
            </div>

            {equalAmount !== 0 && payAmountNum > 0 ? (
              <p className="mt-2 text-[12px] text-red-600">
                Allocate ₹{equalAmount} more across particulars (remaining must be zero).
              </p>
            ) : null}
          </FilterCard>

          <TableCardShell>
            <Table
              embedded
              title="Fee particulars"
              rows={payRows}
              columns={tableColumns}
              pageSize={0}
              emptyText="No particulars found."
            />
          </TableCardShell>
        </>
      ) : (
        !isLoading && (
          <p className="text-[13px] text-slate-600">No balance due for this fee structure.</p>
        )
      )}

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={goBack}>
          Back
        </Button>
        <Button type="button" variant="ghost" onClick={() => void refetch()}>
          Refresh
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Confirm fee payment?"
        description={`Record payment of ₹${payAmountNum} for ${feeStudentData?.firstName ?? 'student'}?`}
        confirmLabel="Pay"
        confirmVariant="default"
        isLoading={payMutation.isPending}
        onConfirm={handleConfirmPay}
        onCancel={() => setConfirmOpen(false)}
      />
    </PageContainer>
  )
}

function Summary({
  label,
  value,
  highlight,
}: {
  label: string
  value?: number
  highlight?: boolean
}) {
  return (
    <div className="text-[13px] text-slate-600">
      {label}:{' '}
      <span className={`font-bold ${highlight ? 'text-[#ff7d0d]' : 'text-slate-900'}`}>
        {value ?? 0}
      </span>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[13px] font-medium text-[#334155]">{label}</Label>
      <Input className="h-9 text-[13px]" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

function TableCardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[10px] border border-slate-200/90 bg-white shadow-sm">
      {children}
    </div>
  )
}
