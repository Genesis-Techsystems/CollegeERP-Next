export interface Course {
  courseId: number
  universityId: number
  courseTypeId: number
  universityCode?: string
  courseTypeName?: string
  courseCode: string
  courseName: string
  courseShortName?: string
  duration?: number
  inTake?: number
  prefix?: string
  startingNo?: number
  isActive: boolean
  reason?: string
}
