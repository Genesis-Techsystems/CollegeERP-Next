export interface CourseGroup {
  courseGroupId: number
  universityId: number
  courseId: number
  universityCode?: string
  courseCode?: string
  groupCode: string
  groupName: string
  isActive: boolean
  reason?: string
}
