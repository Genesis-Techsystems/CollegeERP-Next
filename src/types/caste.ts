export interface Caste {
  casteId: number
  organizationId: number
  orgCode?: string
  caste: string
  sortOrder: number
  isEligibleForReservation: boolean
  isActive: boolean
  reason?: string
}
