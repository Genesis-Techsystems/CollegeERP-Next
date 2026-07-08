export interface CourseGroup {
  courseGroupId: number
  universityId: number
  courseId: number
  universityCode?: string
  courseCode?: string
  groupCode: string
  groupName: string
  shortName?: string
  enrollPrefix?: string
  startingNo?: string
  isActive: boolean
  reason?: string
}
