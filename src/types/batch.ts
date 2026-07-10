export interface Batch {
  batchId: number
  universityId?: number
  universityCode?: string
  collegeId?: number
  collegeCode?: string
  courseId?: number
  courseCode?: string
  courseName?: string
  regulationId?: number
  regulationName?: string
  regulationCode?: string
  fromDate?: string
  toDate?: string
  batchFrom?: string
  batchTo?: string
  batchCode: string
  batchName: string
  isActive: boolean
  reason?: string
}
