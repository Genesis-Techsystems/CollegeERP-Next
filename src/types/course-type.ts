export interface CourseType {
  courseTypeId: number
  universityId: number
  universityName?: string
  universityCode?: string
  courseTypeName: string
  courseTypeCode: string
  isActive: boolean
  reason?: string
}
