'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { ColDef, ICellRendererParams, ValueGetterParams } from 'ag-grid-community'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DataTable, TableCard } from '@/common/components/table'
import { formatDate } from '@/common/generic-functions'
import { ConfirmDialog } from '@/common/components/feedback'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  deleteFeeReceipt,
  listFeeReceiptsForStudent,
  listStudentFeeReceiptDetails,
} from '@/services'
import type { FeeReceiptRow } from '@/types/fees-collection'
import { CollegeAcademicStudentFilters } from './CollegeAcademicStudentFilters'

type Mode = 'view' | 'delete' | 'refund'

function rowField(row: FeeReceiptRow | undefined, ...keys: string[]): string {
  if (!row) return '—'
  const r = row as Record<string, unknown>
  for (const key of keys) {
    const v = r[key]
    if (v != null && v !== '') return String(v)
  }
  return '—'
}

function receiptId(row: FeeReceiptRow | undefined): number {
  if (!row) return 0
  const r = row as Record<string, unknown>
  return Number(
    row.feeReceiptsId ?? r.fee_receipts_id ?? r.pk_fee_receipts_id ?? r.payment_receipts_no ?? 0,
  )
}

function formatPaymentDate(row: FeeReceiptRow | undefined): string {
  const raw = rowField(row, 'receipt_date', 'receiptDate', 'createdDt', 'created_dt')
  if (raw === '—') return '—'
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return raw
  const time = [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map((n) => String(n).padStart(2, '0'))
    .join(':')
  return `${formatDate(raw)}, ${time}`
}

export function FeeReceiptListPanel({
  title,
  mode,
}: {
  readonly title: string
  readonly mode: Mode
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()

  const [collegeId, setCollegeId] = useState<string | null>(searchParams.get('collegeId'))
  const [academicYearId, setAcademicYearId] = useState<string | null>(
    searchParams.get('academicYearId'),
  )
  const [studentId, setStudentId] = useState<string | null>(searchParams.get('studentId'))
  const [deleteTarget, setDeleteTarget] = useState<FeeReceiptRow | null>(null)

  const filters = {
    collegeId: Number(collegeId ?? 0),
    academicYearId: Number(academicYearId ?? 0),
    studentId: Number(studentId ?? 0),
  }

  const enabled = filters.collegeId > 0 && filters.academicYearId > 0 && filters.studentId > 0

  const useProc = mode === 'view'

  const { data: rows = [], isLoading } = useQuery({
    queryKey: useProc
      ? QK.feesCollection.feeReceiptDetails(filters)
      : QK.feesCollection.feeReceipts(filters),
    queryFn: () =>
      useProc
        ? listStudentFeeReceiptDetails(filters)
        : listFeeReceiptsForStudent(filters),
    enabled,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteFeeReceipt(id),
    onSuccess: () => {
      toastSuccess('Receipt deleted')
      setDeleteTarget(null)
      queryClient.invalidateQueries({ queryKey: QK.feesCollection.feeReceipts(filters) })
      queryClient.invalidateQueries({ queryKey: QK.feesCollection.feeReceiptDetails(filters) })
    },
    onError: (e) => toastError(e),
  })

  const columnDefs = useMemo<ColDef<FeeReceiptRow>[]>(() => {
    const cols: ColDef<FeeReceiptRow>[] = [
      { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 },
      {
        headerName: 'Student',
        minWidth: 140,
        valueGetter: (p: ValueGetterParams<FeeReceiptRow>) =>
          rowField(p.data, 'student_name', 'studentName', 'firstName'),
      },
      {
        headerName: 'Academic Year',
        minWidth: 120,
        valueGetter: (p) => rowField(p.data, 'academic_year', 'academicYear'),
      },
      {
        headerName: 'Fee Receipt',
        minWidth: 110,
        valueGetter: (p) =>
          rowField(
            p.data,
            'payment_receipts_no',
            'paymentReceiptsNo',
            'feeReceiptsId',
            'fee_receipts_id',
          ),
      },
      {
        headerName: 'Payment Date',
        minWidth: 160,
        valueGetter: (p) => formatPaymentDate(p.data),
      },
      {
        headerName: 'Merchant Reference No.',
        minWidth: 140,
        valueGetter: (p) =>
          rowField(p.data, 'transaction_no', 'transactionNo', 'referenceNumber'),
      },
      {
        headerName: 'Amount',
        minWidth: 100,
        valueGetter: (p) => rowField(p.data, 'receipt_amount', 'receiptAmount'),
      },
    ]

    if (mode === 'view') {
      cols.push({
        headerName: 'Print',
        minWidth: 90,
        flex: 0,
        width: 90,
        cellRenderer: () => (
          <Button type="button" size="sm" variant="outline" disabled title="Print view coming soon">
            Print
          </Button>
        ),
      })
    }

    if (mode === 'delete') {
      cols.push({
        headerName: 'Actions',
        minWidth: 100,
        flex: 0,
        width: 100,
        cellRenderer: (p: ICellRendererParams<FeeReceiptRow>) => (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={() => p.data && setDeleteTarget(p.data)}
          >
            Delete
          </Button>
        ),
      })
    }

    if (mode === 'refund') {
      cols.push({
        headerName: 'Actions',
        minWidth: 100,
        flex: 0,
        width: 100,
        cellRenderer: (p: ICellRendererParams<FeeReceiptRow>) => (
          <Button
            type="button"
            size="sm"
            variant="default"
            onClick={() => {
              if (!p.data) return
              const params = new URLSearchParams({
                collegeId: String(filters.collegeId),
                academicYearId: String(filters.academicYearId),
                studentId: String(filters.studentId),
                feeReceiptsId: String(receiptId(p.data)),
                receiptAmount: String(
                  rowField(p.data, 'receipt_amount', 'receiptAmount') !== '—'
                    ? rowField(p.data, 'receipt_amount', 'receiptAmount')
                    : '',
                ),
              })
              router.push(
                `/accounts-and-fees/fees-collection/fee-refunds/fee-refund-payment?${params}`,
              )
            }}
          >
            Refund
          </Button>
        ),
      })
    }

    return cols
  }, [mode, router, filters])

  return (
    <PageContainer className="space-y-5">
      <CollegeAcademicStudentFilters
        title={title}
        collegeId={collegeId}
        academicYearId={academicYearId}
        studentId={studentId}
        initialRollNumber={searchParams.get('rollNumber')}
        onCollegeChange={setCollegeId}
        onAcademicYearChange={setAcademicYearId}
        onStudentChange={(id) => setStudentId(id)}
      />

      {enabled ? (
        <TableCard>
          <DataTable columnDefs={columnDefs} rowData={rows} loading={isLoading} height="auto" />
        </TableCard>
      ) : null}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete fee receipt?"
        description="This will permanently remove the selected receipt."
        confirmLabel="Delete"
        confirmVariant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => {
          const id = receiptId(deleteTarget ?? undefined)
          if (id) deleteMutation.mutate(id)
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </PageContainer>
  )
}
