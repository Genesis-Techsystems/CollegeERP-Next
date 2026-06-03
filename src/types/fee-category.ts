export interface FeeCategory {
  feeCategoryId: number
  collegeId: number
  categoryName: string
  feeCategoryCode: string
  description?: string | null
  isMaster?: boolean
  isHostel?: boolean
  isTransport?: boolean
  includeInLedger?: boolean
  isActive: boolean
  reason?: string
  collegeCode?: string
  collegeName?: string
}

export type FeeCategoryPayload = Omit<FeeCategory, 'feeCategoryId' | 'collegeCode' | 'collegeName'>
