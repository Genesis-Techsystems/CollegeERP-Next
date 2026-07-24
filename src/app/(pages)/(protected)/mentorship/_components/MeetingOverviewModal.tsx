'use client'

import { format } from 'date-fns'
import { FormModal } from '@/common/components/feedback'
import type { MentorshipRow } from '@/services'

export type MeetingOverviewModalProps = {
  open: boolean
  onClose: () => void
  row: MentorshipRow | null
}

function display(value: unknown): string {
  if (value == null || String(value).trim() === '') return '—'
  return String(value)
}

function displayDate(value: unknown): string {
  if (value == null || String(value).trim() === '') return '—'
  const d = new Date(String(value))
  if (Number.isNaN(d.getTime())) return String(value)
  return format(d, 'MMM d, yyyy')
}

function OverviewRow({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 text-sm">
      <span className="font-medium text-muted-foreground">{label}</span>
      <span className="font-medium text-[hsl(var(--card-title))]">: {value}</span>
    </div>
  )
}

/** Angular MeetingOverviewModal — read-only meeting details. */
export function MeetingOverviewModal({
  open,
  onClose,
  row,
}: Readonly<MeetingOverviewModalProps>) {
  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Meeting Overview"
      titleClassName="text-[15px] font-semibold leading-none text-[#5da394]"
      onSubmit={(e) => {
        e.preventDefault()
        onClose()
      }}
      submitLabel="Close"
      showCancelButton={false}
      size="lg"
    >
      <div className="space-y-3">
        <OverviewRow label="College" value={display(row?.collegeName)} />
        <OverviewRow label="Activity Date" value={displayDate(row?.activityDate)} />
        <OverviewRow label="Activity Type" value={display(row?.activityTypeName ?? row?.activityTypeCode)} />
        <OverviewRow label="Attendee" value={display(row?.attendeesName)} />
        <OverviewRow label="Relation" value={display(row?.relationship)} />
        <OverviewRow label="Discussion Points" value={display(row?.discussionPoints)} />
        <OverviewRow label="Summary" value={display(row?.summary)} />
        <OverviewRow label="Meeting Status" value={display(row?.activityStatusCode)} />
      </div>
    </FormModal>
  )
}
