export interface FinancialYear {
  financialYearId: number
  organizationId: number
  universityId: number
  financialYear: string
  fromDate: string
  toDate: string
  orgCode?: string
  universityCode?: string
  isDefault?: boolean
  isActive: boolean
  reason?: string
}
