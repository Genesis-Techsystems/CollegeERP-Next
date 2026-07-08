/** Angular `Studentbatch` master (admin Academic Settings → Student Batches). */
export interface StudentBatch {
  studentbatchId?: number
  collegeId: number
  courseId: number
  /** Subject type general-detail id (`subtypeId` / `subtype`). */
  subtypeId: number
  batchName: string
  capacity?: number | null
  sortOrder?: number | null
  isActive: boolean
  reason?: string
  universityId?: number
  collegeName?: string
  collegeCode?: string
  courseName?: string
  courseCode?: string
  subjecttypeName?: string
  subtype?: number
}
