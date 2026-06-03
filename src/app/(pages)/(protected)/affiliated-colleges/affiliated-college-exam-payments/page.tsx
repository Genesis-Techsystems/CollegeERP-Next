'use client'

import { useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { PencilIcon, PlusIcon } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DataTable, TableCard } from '@/common/components/table'
import { StatusBadge } from '@/common/components/data-display'
import { PageContainer, PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { toastError, toastSuccess } from '@/lib/toast'
import { getErrorMessage } from '@/lib/errors'
import {
  createUnivCollegeWisePayment,
  listUnivCollegeWisePayments,
  resolveAffiliatedEmployeeId,
  resolveAffiliatedUniversityId,
  updateUnivCollegeWisePayment,
} from '@/services'
import type { UnivCollegeWisePaymentRow } from '@/types/affiliated-colleges'
import { useAffiliatedCascade } from '../_lib/use-affiliated-cascade'
import { AffiliatedCollegeFilters } from '../_components/AffiliatedCollegeFilters'
import { ExamPaymentModal } from './_components/ExamPaymentModal'

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<UnivCollegeWisePaymentRow>,
  college: { field: 'collegeCode', headerName: 'College Code', minWidth: 110 } as ColDef<UnivCollegeWisePaymentRow>,
  ay: { field: 'academicYear', headerName: 'Academic Year', minWidth: 110 } as ColDef<UnivCollegeWisePaymentRow>,
  fy: { field: 'financialYear', headerName: 'Financial Year', minWidth: 110 } as ColDef<UnivCollegeWisePaymentRow>,
  students: { field: 'totalStudents', headerName: 'Total Students', minWidth: 110 } as ColDef<UnivCollegeWisePaymentRow>,
  amount: { field: 'totalAmount', headerName: 'Total Amount', minWidth: 100 } as ColDef<UnivCollegeWisePaymentRow>,
  date: { field: 'paymentDate', headerName: 'Payment Date', minWidth: 110 } as ColDef<UnivCollegeWisePaymentRow>,
  paymentFor: { field: 'paymentFor', headerName: 'Payment For', minWidth: 120 } as ColDef<UnivCollegeWisePaymentRow>,
  mode: { field: 'paymentMode', headerName: 'Payment Mode', minWidth: 110 } as ColDef<UnivCollegeWisePaymentRow>,
  desc: { field: 'paymentDes', headerName: 'Description', minWidth: 140, flex: 1 } as ColDef<UnivCollegeWisePaymentRow>,
  status: { field: 'isActive', headerName: 'Status', minWidth: 100, flex: 0 } as ColDef<UnivCollegeWisePaymentRow>,
  actions: { headerName: 'Actions', minWidth: 86, flex: 0, width: 86 } as ColDef<UnivCollegeWisePaymentRow>,
}

function statusRenderer(p: ICellRendererParams<UnivCollegeWisePaymentRow>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

export default function AffiliatedCollegeExamPaymentsPage() {
  const qc = useQueryClient()
  const cascade = useAffiliatedCascade({ examFilters: true, allowAllGroupYear: true, autoSelectFirst: true })
  const [listEnabled, setListEnabled] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<UnivCollegeWisePaymentRow | null>(null)

  const collegeId = cascade.collegeId ?? 0
  const examId = cascade.examId ?? 0

  const { data: rows = [], isFetching, refetch } = useQuery({
    queryKey: QK.affiliatedColleges.examPayments(collegeId, examId),
    queryFn: () => listUnivCollegeWisePayments(collegeId, examId),
    enabled: listEnabled && collegeId > 0,
  })

  const saveMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const base = {
        ...payload,
        collegeId: cascade.collegeId ?? 0,
        academicYearId: cascade.academicYearId ?? 0,
        examMasterId: cascade.examId ?? 0,
        universityId: resolveAffiliatedUniversityId(),
        paymentMadeByEmpId: resolveAffiliatedEmployeeId(),
      }
      if (editing?.univCollegeWisePaymentId) {
        return updateUnivCollegeWisePayment(editing.univCollegeWisePaymentId, base)
      }
      return createUnivCollegeWisePayment(base as Parameters<typeof createUnivCollegeWisePayment>[0])
    },
    onSuccess: async () => {
      toastSuccess(editing ? 'Payment updated.' : 'Payment added.')
      setModalOpen(false)
      setEditing(null)
      await qc.invalidateQueries({ queryKey: QK.affiliatedColleges.all })
      await refetch()
    },
    onError: (e) => toastError(getErrorMessage(e)),
  })

  const columnDefs = useMemo<ColDef<UnivCollegeWisePaymentRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.college,
      COL_DEFS.ay,
      COL_DEFS.fy,
      COL_DEFS.students,
      COL_DEFS.amount,
      COL_DEFS.date,
      COL_DEFS.paymentFor,
      COL_DEFS.mode,
      COL_DEFS.desc,
      { ...COL_DEFS.status, cellRenderer: statusRenderer },
      {
        ...COL_DEFS.actions,
        cellRenderer: (p: ICellRendererParams<UnivCollegeWisePaymentRow>) => (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setEditing(p.data ?? null)
              setModalOpen(true)
            }}
          >
            <PencilIcon className="h-3.5 w-3.5 mr-1" /> Edit
          </Button>
        ),
      },
    ],
    [],
  )

  return (
    <PageContainer>
      <PageHeader title="Affiliated College Exam Payments" />
      <AffiliatedCollegeFilters
        title="Affiliated College Exam Payments"
        cascade={cascade}
        onGetDetails={() => setListEnabled(true)}
        loadingDetails={isFetching}
        allowAllGroupYear
        showExam
      />
      {listEnabled ? (
        <TableCard
          headerRight={
            <Button
              size="sm"
              onClick={() => {
                setEditing(null)
                setModalOpen(true)
              }}
              disabled={!cascade.collegeId}
            >
              <PlusIcon className="h-3.5 w-3.5 mr-1" />
              Exam Payments
            </Button>
          }
        >
          <DataTable rowData={rows} columnDefs={columnDefs} />
        </TableCard>
      ) : null}
      <ExamPaymentModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditing(null)
        }}
        editing={editing}
        onSave={(payload) => saveMutation.mutate(payload)}
        isSubmitting={saveMutation.isPending}
      />
    </PageContainer>
  )
}
