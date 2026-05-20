export interface ConfigAutoNumber {
  configAutoNumberId?: number
  organizationId: number
  collegeId: number
  courseId?: number
  collegeCode?: string
  courseCode?: string
  configAttributeName: string
  configAtttributeCode: string
  prefix?: string
  suffix?: string
  currentNumber?: number
  formula?: string
  isAutoIncRequired?: boolean
  isActive?: boolean
  reason?: string
}

