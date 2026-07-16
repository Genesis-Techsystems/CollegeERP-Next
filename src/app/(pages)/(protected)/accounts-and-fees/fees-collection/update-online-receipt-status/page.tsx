'use client'

import { useState } from 'react'
import { FilteredPage } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  syncAdmissionInitiatedPayments,
  syncInitiatedFeePayments,
} from '@/services'

type SyncAction = 'tuition' | 'admission' | null

export default function UpdateOnlineReceiptStatusPage() {
  const [busy, setBusy] = useState<SyncAction>(null)

  async function updateTuitionPayments() {
    setBusy('tuition')
    try {
      const message = await syncInitiatedFeePayments()
      toastSuccess(message)
    } catch (err) {
      toastError(err, 'Failed to update tuition fee payments')
    } finally {
      setBusy(null)
    }
  }

  async function updateAdmissionPayments() {
    setBusy('admission')
    try {
      const message = await syncAdmissionInitiatedPayments()
      toastSuccess(message)
    } catch (err) {
      toastError(err, 'Failed to update admission fee payments')
    } finally {
      setBusy(null)
    }
  }

  return (
    <FilteredPage
      title="Update Online Receipt Status"
      filtersCollapsible={false}
      filters={(
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            disabled={busy !== null}
            onClick={() => void updateTuitionPayments()}
          >
            {busy === 'tuition' ? 'Updating…' : 'Update Tution Fee Payments'}
          </Button>
          <Button
            type="button"
            disabled={busy !== null}
            onClick={() => void updateAdmissionPayments()}
          >
            {busy === 'admission' ? 'Updating…' : 'Update Admission Fee Payments'}
          </Button>
        </div>
      )}
    />
  )
}
