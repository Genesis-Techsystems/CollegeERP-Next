'use client'

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/common/components/data-display'
import { formatDate } from '@/common/generic-functions'
import type { PlacementStudentRegistration } from '@/types/placements'

interface Props {
  open: boolean
  onClose: () => void
  data: PlacementStudentRegistration | null
  placementTitle?: string | null
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="col-span-2 text-xs">{value?.trim() ? value : '—'}</span>
    </div>
  )
}

function RoundStatus({ label, value }: { label: string; value?: boolean | null }) {
  const statusLabel = value === true ? 'Completed' : value === false ? 'Rejected' : 'Not Done'
  const status = value === true ? 'active' : value === false ? 'inactive' : 'pending'
  return (
    <div className="rounded border border-border px-2 py-1.5 text-xs">
      <span className="text-muted-foreground">{label}: </span>
      <StatusBadge status={status} label={statusLabel} />
    </div>
  )
}

function BoolStatus({ label, value }: { label: string; value?: boolean | null }) {
  return (
    <div className="rounded border border-border px-2 py-1.5 text-xs">
      <span className="text-muted-foreground">{label}: </span>
      <StatusBadge status={value ?? false} label={value ? 'Yes' : 'No'} />
    </div>
  )
}

export default function InterviewDetailsModal({ open, onClose, data, placementTitle }: Props) {
  if (!data) return null

  const studentName = data.firstName
    ? `${data.firstName}${data.rollNumber ? ` (${data.rollNumber})` : ''}`
    : '—'

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-[hsl(var(--primary))]">Interview Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="rounded-lg border border-border p-3 space-y-1">
            <DetailRow label="Student Name" value={studentName} />
            <DetailRow label="Company" value={data.companyname} />
            <DetailRow label="Placement" value={placementTitle} />
            <DetailRow label="Register Date" value={formatDate(data.registeredDate)} />
          </div>

          <div className="rounded-lg border border-border p-3 space-y-2">
            <p className="text-xs font-semibold">Interview Rounds</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <RoundStatus label="CV Short listed" value={data.isCVShortlisted} />
              <RoundStatus label="Written" value={data.isClearedWritten} />
              <RoundStatus label="Group Discussion" value={data.isClearedGD} />
              <RoundStatus label="Pre HR" value={data.isClearedPreHR} />
              <RoundStatus label="First Technical" value={data.isClearedFirstTech} />
              <RoundStatus label="Second Technical" value={data.isClearedSecondTech} />
              <RoundStatus label="Third Technical" value={data.isClearedThirdTech} />
              <RoundStatus label="HR" value={data.isClearedHR} />
              <RoundStatus label="Manager" value={data.isClearedManagerRound} />
              <BoolStatus label="Placed" value={data.isPlaced} />
            </div>
          </div>

          {data.isPlaced && (
            <div className="rounded-lg border border-border p-3 space-y-2">
              <p className="text-xs font-semibold">Offer Release Details</p>
              <div className="grid grid-cols-2 gap-2">
                <BoolStatus label="Offer Roll Out" value={data.isOfferRollOut} />
                {data.isOfferRollOut && (
                  <DetailRow label="Offer Date" value={formatDate(data.offerDate)} />
                )}
              </div>
            </div>
          )}

          {data.isOfferRollOut && (
            <div className="rounded-lg border border-border p-3 space-y-2">
              <p className="text-xs font-semibold">Join Details</p>
              <div className="grid grid-cols-2 gap-2">
                <DetailRow label="Joining Date" value={formatDate(data.joiningDate)} />
                <BoolStatus label="Joined" value={data.isJoined} />
                {data.isJoined && (
                  <DetailRow label="Joined On" value={formatDate(data.joinedOn)} />
                )}
              </div>
            </div>
          )}

          <DetailRow label="Comments" value={data.interviewerComments} />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
