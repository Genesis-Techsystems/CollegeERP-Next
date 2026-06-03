'use client'

import { ConfirmDialog } from '@/common/components/feedback'

type BulkUpdateModalProps = {
  open: boolean
  onClose: () => void
  count: number
  onConfirm: () => void
  isSubmitting?: boolean
}

export function BulkUpdateModal({
  open,
  onClose,
  count,
  onConfirm,
  isSubmitting,
}: BulkUpdateModalProps) {
  return (
    <ConfirmDialog
      open={open}
      title="Bulk Approve Remuneration?"
      description={`Approve ${count} selected pending remuneration record${count === 1 ? '' : 's'}?`}
      confirmLabel="Approve"
      confirmVariant="default"
      onConfirm={onConfirm}
      onCancel={onClose}
      isLoading={isSubmitting}
    />
  )
}
