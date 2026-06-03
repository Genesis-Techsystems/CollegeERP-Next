'use client'

import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

// ─── Size map ─────────────────────────────────────────────────────────────────

const sizeClass: Record<NonNullable<FormModalProps['size']>, string> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface FormModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  /** Called when the <form> fires its submit event. */
  onSubmit: (e: { preventDefault: () => void }) => void
  isSubmitting?: boolean
  submitLabel?: string
  cancelLabel?: string
  children: React.ReactNode
  /** Controls DialogContent max-width. Defaults to 'md'. */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Extra class applied to the inner form element. */
  formClassName?: string
  /** Extra class applied to DialogContent wrapper. */
  contentClassName?: string
  /** Extra class applied to title. */
  titleClassName?: string
  /** Hide top-right close icon when false. */
  showCloseButton?: boolean
  /** Render a full-width divider under modal header. */
  showHeaderDivider?: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────
// Shared dialog shell for all add/edit modals.
// Eliminates the repeated Dialog + DialogHeader + form + DialogFooter pattern
// found in ExamFeeSetupModal, ExamSessionModal, GradeSetupModal, CampusModal, etc.

export function FormModal({
  open,
  onClose,
  title,
  description,
  onSubmit,
  isSubmitting = false,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  children,
  size = 'md',
  formClassName,
  contentClassName,
  titleClassName,
  showCloseButton = true,
  showHeaderDivider = false,
}: Readonly<FormModalProps>) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent
        className={cn(
          'flex max-h-[90vh] flex-col overflow-hidden sm:max-h-[92vh]',
          !showCloseButton && '[&>button]:hidden',
          sizeClass[size],
          contentClassName,
        )}
      >
        <DialogHeader
          className={cn('shrink-0', showHeaderDivider && 'border-b border-border pb-3')}
        >
          <DialogTitle className={titleClassName}>{title}</DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div
            className={cn(
              'min-h-0 flex-1 space-y-4 overflow-y-auto py-2 scrollbar-hidden',
              formClassName,
            )}
          >
            {children}
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t border-border/60 bg-background pt-3 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 min-w-[5.5rem]"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {cancelLabel}
            </Button>
            <Button type="submit" size="sm" className="h-9 min-w-[5.5rem]" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
