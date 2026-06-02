'use client'

import { ConfirmDialog } from '@/common/components/feedback'

type RunConfirmModalProps = {
  open: boolean
  onClose: () => void
  examName?: string
  examMonthYear?: string
  onConfirm: () => void
  isSubmitting?: boolean
}

export function RunConfirmModal({
  open,
  onClose,
  examName,
  examMonthYear,
  onConfirm,
  isSubmitting,
}: RunConfirmModalProps) {
  const label = [examMonthYear, examName].filter(Boolean).join(' — ')

  return (
    <ConfirmDialog
      open={open}
      title="Run Remuneration Calculation?"
      description={
        label
          ? `This will calculate remuneration for ${label}. Existing pending records may be updated. Continue?`
          : 'This will calculate remuneration for the selected exam. Continue?'
      }
      confirmLabel="Run"
      confirmVariant="default"
      onConfirm={onConfirm}
      onCancel={onClose}
      isLoading={isSubmitting}
    />
  )
}
