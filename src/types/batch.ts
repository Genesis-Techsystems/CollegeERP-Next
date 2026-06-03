export interface Batch {
  batchId: number
  collegeId?: number
  collegeCode?: string
  batchCode: string
  batchName: string
  isActive: boolean
  reason?: string
}
