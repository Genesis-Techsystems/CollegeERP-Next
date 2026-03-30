'use client'

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

/**
 * Confirmation dialog for destructive or important actions.
 * Uses Radix Dialog primitive via Shadcn Dialog.
 */
interface ConfirmDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Dialog title (e.g. "Delete Exam Master?") */
  title: string
  /** Descriptive message explaining the consequence of the action */
  description: string
  /** Label for the confirm button */
  confirmLabel?: string
  /** Visual variant for the confirm button */
  confirmVariant?: 'destructive' | 'default'
  /** Called when user clicks the confirm button */
  onConfirm: () => void
  /** Called when user cancels or closes the dialog */
  onCancel: () => void
  /** Whether the confirm action is in progress — shows spinner, disables buttons */
  isLoading?: boolean
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  confirmVariant = 'destructive',
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
