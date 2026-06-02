'use client'

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { formatDateHeader } from '../_lib/timetable-filters'

export type AllocateSectionItem = {
  groupSectionId: number
  name: string
}

type AllocateTimetableDialogProps = {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  isSubmitting?: boolean
  timetableName: string
  startDate: string
  endDate: string
  sections: AllocateSectionItem[]
}

export function AllocateTimetableDialog({
  open,
  onClose,
  onConfirm,
  isSubmitting = false,
  timetableName,
  startDate,
  endDate,
  sections,
}: AllocateTimetableDialogProps) {
  const from = formatDateHeader(startDate)
  const to = formatDateHeader(endDate)
  const dateLabel = from && to ? `${from} - ${to}` : from || to || ''

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[15px] font-bold text-[#002b5c]">Allocate timetable</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 rounded-sm border border-[#9ec5e8] px-4 py-3 text-[12px]">
          <p>
            <span className="font-semibold text-[#b45309]">Timetable :</span>{' '}
            <span className="font-medium text-[#002b5c]">
              {timetableName}
              {dateLabel ? ` - (${dateLabel})` : ''}
            </span>
          </p>
          <div>
            <p className="font-semibold text-[#b45309]">Sections :</p>
            <ul className="mt-1 space-y-0.5">
              {sections.map((s) => (
                <li key={s.groupSectionId} className="font-medium text-[#002b5c]">
                  {s.name}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Close
          </Button>
          <Button type="button" size="sm" onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
