'use client'

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { Campus } from '@/types/campus'
import type { Company, Placement, PlacementCompany } from '@/types/placements'

interface Props {
  open: boolean
  onClose: () => void
  data: PlacementCompany | null
  campus: Campus | null
  placement: Placement | null
  company: Company | null
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="col-span-2 text-xs">{value?.trim() ? value : '—'}</span>
    </div>
  )
}

function MetricCell({ label, value, suffix }: { label: string; value?: string | number | null; suffix?: string }) {
  const display = value != null && value !== '' ? `${value}${suffix ?? ''}` : '—'
  return (
    <div className="rounded border border-border px-2 py-1.5 text-xs">
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-medium">{display}</span>
    </div>
  )
}

export default function CompanyPlacementsRequirementsModal({
  open, onClose, data, campus, placement, company,
}: Props) {
  if (!data) return null

  const placementTitle = data.plaecmentTitle ?? placement?.plaecmentTitle ?? ''
  const companyName = data.companyname ?? company?.companyname ?? ''

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-[hsl(var(--primary))]">View Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="rounded-lg border border-border p-3 space-y-1">
            {campus && (
              <DetailRow label="Campus" value={`${campus.campusName} - ${campus.orgCode}`} />
            )}
            <DetailRow label="Placement" value={placementTitle} />
            <DetailRow label="Company" value={companyName} />
            {data.contactDetails && (
              <DetailRow label="Contact Person" value={data.contactDetails} />
            )}
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <div className="bg-[hsl(var(--primary))] px-3 py-2">
              <p className="text-xs font-semibold text-primary-foreground">Company Placement Requirement</p>
            </div>
            <div className="p-3 space-y-3">
              <DetailRow label="Placement" value={placementTitle} />

              <div className="space-y-2">
                <p className="text-xs font-semibold">Education</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <MetricCell label="SSC Grade" value={data.sscGrade} />
                  <MetricCell label="SSC %" value={data.sscPercentage} suffix=" %" />
                  <MetricCell label="Inter Grade" value={data.interGrade} />
                  <MetricCell label="Inter %" value={data.interPercentage} suffix=" %" />
                  <MetricCell label="Diploma Grade" value={data.diplomaGrade} />
                  <MetricCell label="Diploma %" value={data.diplomaPercentage} suffix=" %" />
                  <MetricCell label="UG Grade" value={data.ugGrade} />
                  <MetricCell label="UG %" value={data.ugPercentage} suffix=" %" />
                  <MetricCell label="PG Grade" value={data.pgGrade} />
                  <MetricCell label="PG %" value={data.pgPercentage} suffix=" %" />
                </div>
              </div>

              <DetailRow label="Skills" value={data.skillSetIds} />
              <DetailRow label="Requirement" value={data.comapanyRequirements} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
