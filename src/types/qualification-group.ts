export interface QualificationGroup {
  qualificationGroupId: number
  qualificationId: number
  qualificationName?: string
  qualificationCode?: string
  qualificationGroupCode: string
  qualificationGroupName: string
  sortOrder?: number
  isActive: boolean
  reason?: string
}
