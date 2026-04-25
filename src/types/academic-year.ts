export interface AcademicYear {
  academicYearId: number
  organizationId: number
  universityId: number
  academicYear: string
  fromDate: string
  toDate: string
  orgCode?: string
  universityCode?: string
  isDefault?: boolean
  isActive: boolean
  reason?: string
}
