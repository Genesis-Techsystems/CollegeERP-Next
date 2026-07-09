'use client'

import type { ReactNode } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

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
  description?: string
  /** Optional rich body content; when set, renders instead of `description` */
  children?: ReactNode
  /** Optional icon shown beside the title (Angular mod-head parity) */
  headerIcon?: ReactNode
  /** Label for the confirm button */
  confirmLabel?: string
  /** Label for the cancel button */
  cancelLabel?: string
  /** Visual variant for the confirm button */
  confirmVariant?: 'destructive' | 'default'
  /** When true, confirm button appears before cancel (Angular Ok / Cancel order) */
  confirmFirst?: boolean
  /** Extra classes on DialogContent (e.g. width) */
  contentClassName?: string
  /** Show the top-right close icon. Default true. */
  showCloseButton?: boolean
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
  children,
  headerIcon,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'destructive',
  confirmFirst = false,
  contentClassName,
  showCloseButton = true,
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmDialogProps) {
  const confirmButton = (
    <Button key="confirm" variant={confirmVariant} onClick={onConfirm} disabled={isLoading}>
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {confirmLabel}
    </Button>
  )
  const cancelButton = (
    <Button key="cancel" variant="outline" onClick={onCancel} disabled={isLoading}>
      {cancelLabel}
    </Button>
  )
  const footerButtons = confirmFirst ? [confirmButton, cancelButton] : [cancelButton, confirmButton]

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
      <DialogContent
        className={cn('sm:max-w-lg', contentClassName)}
        hideClose={!showCloseButton}
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            {headerIcon}
            <DialogTitle>{title}</DialogTitle>
          </div>
        </DialogHeader>

        {children ? (
          <div className="space-y-3 text-sm text-foreground">{children}</div>
        ) : description ? (
          <DialogDescription className="text-sm text-muted-foreground">{description}</DialogDescription>
        ) : null}

        {children && !description ? (
          <DialogDescription className="sr-only">{title}</DialogDescription>
        ) : null}

        <DialogFooter className="gap-2 sm:justify-end">
          {footerButtons}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
