'use client'

import { ConfirmDialog } from '@/common/components/feedback'

interface ConfirmTcDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  onConfirm: () => void
  loading?: boolean
}

export function ConfirmTcDialog({
  open,
  onOpenChange,
  title = 'Confirm',
  description = 'Are you sure you want to proceed?',
  onConfirm,
  loading,
}: Readonly<ConfirmTcDialogProps>) {
  return (
    <ConfirmDialog
      open={open}
      title={title}
      description={description}
      confirmLabel="Yes"
      confirmVariant="default"
      onConfirm={onConfirm}
      onCancel={() => onOpenChange(false)}
      isLoading={loading}
    />
  )
}
