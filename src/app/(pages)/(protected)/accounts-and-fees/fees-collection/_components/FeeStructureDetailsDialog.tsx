'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Printer } from 'lucide-react'
import { Table, type TableColumn } from '@/common/components/table'
import { formatDate } from '@/common/generic-functions'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { getFeeStudentData, listStudentFeeReceiptDetails } from '@/services'
import type {
  FeeReceiptRow,
  FeeStudentParticularRow,
  StudentFeeSearchRow,
  StudentFeeStructureRow,
} from '@/types/fees-collection'
import { FeeDetailsStudentCard } from './FeeDetailsStudentCard'

type FeeStructureDetailsDialogProps = {
  readonly open: boolean
  readonly onClose: () => void
  readonly student: StudentFeeSearchRow
  readonly row: StudentFeeStructureRow
}

function strField(row: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const v = row[key]
    if (v != null && v !== '') return String(v)
  }
  return '—'
}

function formatReceiptDateTime(dateStr?: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  const time = [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map((n) => String(n).padStart(2, '0'))
    .join(':')
  return `${formatDate(dateStr)}, ${time}`
}

function amt(value: unknown): string {
  if (value == null || value === '') return '—'
  return String(value)
}

export function FeeStructureDetailsDialog({
  open,
  onClose,
  student,
  row,
}: FeeStructureDetailsDialogProps) {
  const collegeId = Number(student.collegeId ?? 0)
  const academicYearId = Number(row.academicYearId ?? 0)
  const studentId = Number(row.studentId ?? student.studentId ?? 0)
  const feeStructureId = Number(row.feeStructureId ?? 0)
  const courseYearId = Number(row.courseYearId ?? 0)

  const { data: feeData, isLoading: particularsLoading } = useQuery({
    queryKey: ['feeStructureDetails', collegeId, academicYearId, studentId, feeStructureId],
    queryFn: () =>
      getFeeStudentData({ collegeId, academicYearId, studentId, feeStructureId }),
    enabled: open && collegeId > 0 && academicYearId > 0 && studentId > 0 && feeStructureId > 0,
  })

  const { data: receipts = [], isLoading: receiptsLoading } = useQuery({
    queryKey: ['feeStructureReceipts', collegeId, academicYearId, studentId, courseYearId],
    queryFn: () =>
      listStudentFeeReceiptDetails({ collegeId, academicYearId, studentId, courseYearId }),
    enabled: open && collegeId > 0 && academicYearId > 0 && studentId > 0,
  })

  const particulars = feeData?.feeStudentDataParticulars ?? []

  const particularColumns = useMemo<TableColumn<FeeStudentParticularRow>[]>(
    () => [
      { id: 'si', label: 'SI.No', width: 6, render: (_, index) => index + 1 },
      {
        id: 'particular',
        label: 'Particular',
        width: 22,
        render: (p) => `${p.categoryName ?? ''} - ${p.particularsName ?? ''}`,
      },
      { id: 'grossAmount', label: 'Gross Amt', width: 8, render: (p) => amt(p.grossAmount) },
      { id: 'discountAmount', label: 'Dis Amt', width: 8, render: (p) => amt(p.discountAmount) },
      { id: 'fineAmount', label: 'LateFee', width: 8, render: (p) => amt(p.fineAmount) },
      {
        id: 'scholarshipHoldAmount',
        label: 'RTF Hold Amt',
        width: 9,
        render: (p) => amt(p.scholarshipHoldAmount),
      },
      {
        id: 'scholarshipAmount',
        label: 'RTF Amt',
        width: 8,
        render: (p) => amt(p.scholarshipAmount),
      },
      { id: 'netAmount', label: 'Net Amt', width: 8, render: (p) => amt(p.netAmount) },
      { id: 'paidAmount', label: 'Paid Amt', width: 8, render: (p) => amt(p.paidAmount) },
      { id: 'balanceAmount', label: 'Bal Amt', width: 8, render: (p) => amt(p.balanceAmount) },
    ],
    [],
  )

  const receiptColumns = useMemo<TableColumn<FeeReceiptRow>[]>(
    () => [
      { id: 'si', label: 'SI.No', width: 6, render: (_, index) => index + 1 },
      {
        id: 'receiptNo',
        label: 'Receipt No.',
        width: 12,
        render: (r) =>
          strField(
            r as Record<string, unknown>,
            'payment_receipts_no',
            'paymentReceiptsNo',
            'feeReceiptsId',
          ),
      },
      {
        id: 'receiptDate',
        label: 'Payment Date',
        width: 16,
        render: (r) => {
          const raw = strField(
            r as Record<string, unknown>,
            'receipt_date',
            'receiptDate',
            'createdDt',
          )
          return raw === '—' ? '—' : formatReceiptDateTime(raw)
        },
      },
      {
        id: 'paymentMode',
        label: 'Payment Mode',
        width: 12,
        render: (r) =>
          strField(r as Record<string, unknown>, 'payment_mode', 'paymentMode'),
      },
      {
        id: 'paymentType',
        label: 'Payment Type',
        width: 12,
        render: (r) =>
          strField(r as Record<string, unknown>, 'payment_type', 'paymentType'),
      },
      {
        id: 'transactionNo',
        label: 'Merchant Ref No.',
        width: 14,
        render: (r) =>
          strField(
            r as Record<string, unknown>,
            'transaction_no',
            'transactionNo',
            'referenceNumber',
          ),
      },
      {
        id: 'receiptAmount',
        label: 'Amount (₹)',
        width: 10,
        render: (r) =>
          strField(
            r as Record<string, unknown>,
            'receipt_amount',
            'receiptAmount',
          ),
      },
      {
        id: 'print',
        label: 'Print',
        width: 8,
        type: 'action',
        render: () => (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            disabled
            title="Print receipt (coming soon)"
          >
            <Printer className="h-3.5 w-3.5" aria-hidden />
          </Button>
        ),
      },
    ],
    [],
  )

  const loading = particularsLoading || receiptsLoading

  const tableWrapClass =
    'overflow-hidden text-[11px] [&>div]:overflow-visible [&_table]:table-fixed [&_table]:w-full [&_td]:break-words [&_th]:whitespace-normal [&_th]:text-[10px]'

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-6xl w-[calc(100vw-2rem)] overflow-hidden sm:max-w-6xl">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-base font-semibold leading-none text-[hsl(var(--primary))]">
            Fee Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 overflow-hidden">
          <FeeDetailsStudentCard student={student} row={row} />

          {loading && particulars.length === 0 ? (
            <p className="text-[11px] text-slate-500 py-2">Loading fee particulars…</p>
          ) : (
            <div className={tableWrapClass}>
              <Table
                columns={particularColumns}
                rows={particulars}
                emptyText="No particulars found."
                embedded
                density="compact"
                pageSize={0}
              />
            </div>
          )}

          {receipts.length > 0 ? (
            <div className="space-y-2 overflow-hidden">
              <h3 className="text-xs font-semibold text-slate-800">Fee Receipts</h3>
              <div className={tableWrapClass}>
                <Table
                  columns={receiptColumns}
                  rows={receipts}
                  emptyText="No receipts found."
                  embedded
                  density="compact"
                  pageSize={0}
                />
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
