export interface Qualification {
  qualificationId: number
  organizationId: number
  orgCode?: string
  orgName?: string
  qualificationCode: string
  qualificationName: string
  sortOrder?: number
  isActive: boolean
  reason?: string
}
