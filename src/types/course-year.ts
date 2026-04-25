export interface CourseYear {
  courseYearId: number
  universityId: number
  courseId: number
  universityCode?: string
  courseCode?: string
  yearNo?: number
  courseYearCode: string
  courseYearName?: string
  isActive: boolean
  reason?: string
}
