'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { MathContent } from '@/common/components/rich-text-editor'
import type { OfficeLetterFormatRow } from '@/types/e-office'

export function ViewLetterContentDialog({
  open,
  onClose,
  row,
}: {
  open: boolean
  onClose: () => void
  row: OfficeLetterFormatRow | null
}) {
  const html =
    row?.htmlContent || row?.messageContent || row?.emailContent || '<p class="text-muted-foreground">No content</p>'

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {row?.formatCode ?? 'Letter format'} — {row?.formatDescription ?? ''}
          </DialogTitle>
        </DialogHeader>
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <MathContent html={html} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
