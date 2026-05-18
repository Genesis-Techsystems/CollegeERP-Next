'use client'

import { useMutation } from '@tanstack/react-query'
import { FilterCard } from '@/common/components/feedback'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { toastError, toastSuccess } from '@/lib/toast'
import { syncAdmissionInitiatedPayments, syncInitiatedFeePayments } from '@/services'

export default function UpdateOnlineReceiptStatusPage() {
  const syncFees = useMutation({
    mutationFn: syncInitiatedFeePayments,
    onSuccess: (msg) => toastSuccess(msg),
    onError: (e) => toastError(e),
  })

  const syncAdmission = useMutation({
    mutationFn: syncAdmissionInitiatedPayments,
    onSuccess: (msg) => toastSuccess(msg),
    onError: (e) => toastError(e),
  })

  return (
    <PageContainer className="space-y-5">
      <FilterCard title="Update Online Receipt Status">
        <p className="text-[13px] text-slate-600 mb-4">
          Sync initiated online payments with the payment gateway. Run when receipts stay in initiated
          status after successful payment.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            onClick={() => syncFees.mutate()}
            disabled={syncFees.isPending}
          >
            {syncFees.isPending ? 'Syncing…' : 'Update Fee Payments'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => syncAdmission.mutate()}
            disabled={syncAdmission.isPending}
          >
            {syncAdmission.isPending ? 'Syncing…' : 'Update Admission Payments'}
          </Button>
        </div>
      </FilterCard>
    </PageContainer>
  )
}
