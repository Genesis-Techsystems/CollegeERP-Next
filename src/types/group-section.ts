export interface GroupSection {
  groupSectionId: number
  collegeId: number
  courseGroupId: number
  courseYearId: number
  collegeCode?: string
  groupCode?: string
  courseYearCode?: string
  groupSectionCode: string
  groupSectionName: string
  isActive: boolean
  reason?: string
}
