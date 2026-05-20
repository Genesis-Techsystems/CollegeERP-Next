export interface SubCaste {
  subCasteId: number
  casteId: number
  caste?: string
  subCaste: string
  sortOrder: number
  isEligibleForReservation: boolean
  isActive: boolean
  reason?: string
}
